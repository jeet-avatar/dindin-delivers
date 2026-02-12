import SwiftUI
import Combine
import FirebaseFirestore
import EatFairShared
import os.log

private let menuLogger = Logger(subsystem: "com.dollorai.customer", category: "MenuViewModel")

class MenuViewModel: ObservableObject {
    @Published var menuItems: [MenuItem] = []
    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var hasError = false

    private var db = Firestore.firestore()
    private var listener: ListenerRegistration?
    private let p2pAPI = P2PAPIService.shared

    deinit {
        listener?.remove()
    }

    func fetchMenu(for restaurantId: String) {
        isLoading = true
        errorMessage = nil
        hasError = false

        // Remove any existing listener
        listener?.remove()

        // Try to parse as P2P vendor ID (integer) first
        if let vendorId = Int(restaurantId) {
            fetchMenuFromP2P(vendorId: vendorId)
            return
        }

        // Check if it's a P2P vendor string ID like "VEN-202411-0006"
        if restaurantId.hasPrefix("VEN-") {
            // Extract vendor number from ID and fetch from P2P
            fetchMenuFromP2PByVendorString(vendorId: restaurantId)
            return
        }

        // Fall back to Firebase for non-P2P restaurants
        fetchMenuFromFirebase(restaurantId: restaurantId)
    }

    private func fetchMenuFromP2P(vendorId: Int) {
        p2pAPI.fetchRestaurantDetail(vendorId: vendorId) { [weak self] result in
            self?.handleP2PMenuResult(result, vendorId: vendorId)
        }
    }

    private func handleP2PMenuResult(_ result: Result<P2PRestaurantDetail, Error>, vendorId: Int) {
        DispatchQueue.main.async {
            self.processP2PResult(result, vendorId: vendorId)
        }
    }

    private func processP2PResult(_ result: Result<P2PRestaurantDetail, Error>, vendorId: Int) {
        self.isLoading = false

        switch result {
        case .success(let detail):
            // Convert P2P menu items to local MenuItem format
            var items: [MenuItem] = []
            for (category, categoryItems) in detail.menu {
                for p2pItem in categoryItems {
                    var menuItem = MenuItem(
                        id: String(p2pItem.id),
                        name: p2pItem.name,
                        description: p2pItem.description ?? "",
                        price: p2pItem.price,
                        imageUrl: p2pItem.imageUrl
                    )
                    menuItem.isAvailable = p2pItem.inStock
                    menuItem.category = category
                    menuItem.preparationTime = p2pItem.prepTime
                    menuItem.customizations = convertCustomizations(from: p2pItem)
                    items.append(menuItem)
                }
            }
            self.menuItems = items

            // Sort by category then by name
            self.menuItems.sort { item1, item2 in
                if item1.category == item2.category {
                    return item1.name < item2.name
                }
                return (item1.category ?? "") < (item2.category ?? "")
            }

            if self.menuItems.isEmpty {
                self.errorMessage = "No menu items available for this restaurant."
                self.hasError = true
            }

            menuLogger.info("Loaded \(self.menuItems.count) menu items from P2P for vendor \(vendorId)")

        case .failure(let error):
            menuLogger.error("P2P menu fetch failed: \(error.localizedDescription)")
            self.errorMessage = "Unable to load menu. Please try again."
            self.hasError = true
        }
    }

    private func fetchMenuFromP2PByVendorString(vendorId: String) {
        // Fetch all restaurants to find the numeric ID
        p2pAPI.fetchRestaurants { [weak self] result in
            switch result {
            case .success(let restaurants):
                if let restaurant = restaurants.first(where: { $0.vendorId == vendorId }) {
                    self?.fetchMenuFromP2P(vendorId: restaurant.id)
                } else {
                    DispatchQueue.main.async {
                        self?.isLoading = false
                        self?.errorMessage = "Restaurant not found."
                        self?.hasError = true
                    }
                }
            case .failure(let error):
                DispatchQueue.main.async {
                    self?.isLoading = false
                    let errMsg = error.localizedDescription.lowercased()
                    if errMsg.contains("network") || errMsg.contains("connection") {
                        self?.errorMessage = "Unable to connect. Please check your internet connection."
                    } else {
                        self?.errorMessage = "Unable to load menu. Please try again."
                    }
                    self?.hasError = true
                }
            }
        }
    }

    private func buildDietaryTags(from item: P2PMenuItem) -> [String] {
        var tags: [String] = []
        if item.isVegetarian { tags.append("vegetarian") }
        if item.isVegan { tags.append("vegan") }
        if item.isGlutenFree { tags.append("gluten-free") }
        if item.isSpicy { tags.append("spicy") }
        return tags
    }

    private func buildDietaryTagsFromDetail(from item: P2PDetailMenuItem) -> [String] {
        var tags: [String] = []
        if item.isVegetarian { tags.append("vegetarian") }
        if item.isVegan { tags.append("vegan") }
        if item.isGlutenFree { tags.append("gluten-free") }
        if item.isSpicy { tags.append("spicy") }
        return tags
    }

    private func convertCustomizations(from p2pItem: P2PDetailMenuItem) -> [MenuItemCustomization]? {
        guard let p2pCustomizations = p2pItem.customizations, !p2pCustomizations.isEmpty else {
            return nil
        }

        return p2pCustomizations.map { p2pCust in
            let options = p2pCust.options.map { opt in
                CustomizationOption(
                    name: opt.name,
                    price: opt.price,
                    isDefault: opt.isDefault,
                    isAvailable: opt.isAvailable
                )
            }

            return MenuItemCustomization(
                name: p2pCust.name,
                type: p2pCust.type == "multiple" ? .multiple : .single,
                required: p2pCust.required,
                minSelections: p2pCust.minSelections,
                maxSelections: p2pCust.maxSelections,
                options: options
            )
        }
    }

    private func fetchMenuFromFirebase(restaurantId: String) {
        // Fetch from Firestore (collection: menu_items under restaurant document)
        let collectionRef = db.collection(FirebaseCollections.restaurants)
            .document(restaurantId)
            .collection(FirebaseCollections.menu)

        listener = collectionRef
            .order(by: "category", descending: false)
            .addSnapshotListener { [weak self] snapshot, error in
                guard let self = self else { return }

                DispatchQueue.main.async {
                    self.isLoading = false

                    if let error = error {
                        self.handleError(error)
                        return
                    }

                    guard let documents = snapshot?.documents, !documents.isEmpty else {
                        self.menuItems = []
                        self.errorMessage = "No menu items available for this restaurant."
                        self.hasError = true
                        return
                    }

                    // Track decode failures to help diagnose empty menu issues
                    var decodeFailures = 0
                    self.menuItems = documents.compactMap { doc in
                        do {
                            return try doc.data(as: MenuItem.self)
                        } catch {
                            decodeFailures += 1
                            menuLogger.error("MenuViewModel: Failed to decode menu item \(doc.documentID): \(error.localizedDescription)")
                            return nil
                        }
                    }

                    // Warn user if many items failed to decode
                    if decodeFailures > 0 && self.menuItems.isEmpty {
                        self.errorMessage = "Unable to load menu. Please try again."
                        self.hasError = true
                    } else if decodeFailures > documents.count / 2 {
                        menuLogger.warning("MenuViewModel: \(decodeFailures)/\(documents.count) items failed to decode")
                    }

                    // Sort by category then by name
                    self.menuItems.sort { item1, item2 in
                        if item1.category == item2.category {
                            return item1.name < item2.name
                        }
                        return (item1.category ?? "") < (item2.category ?? "")
                    }
                }
            }
    }

    /// Fetch menu once without real-time updates (for checkout preview)
    func fetchMenuOnce(for restaurantId: String, completion: @escaping ([MenuItem]) -> Void) {
        let collectionRef = db.collection(FirebaseCollections.restaurants)
            .document(restaurantId)
            .collection(FirebaseCollections.menu)

        collectionRef.getDocuments { snapshot, error in
            if let error = error {
                menuLogger.error("MenuViewModel: Error fetching menu - \(error.localizedDescription)")
                DispatchQueue.main.async {
                    completion([])
                }
                return
            }

            // Capture documents data before moving to main thread
            let documents = snapshot?.documents ?? []

            DispatchQueue.main.async {
                // Decode on main thread to satisfy MainActor isolation
                var decodeFailures = 0
                let items = documents.compactMap { doc -> MenuItem? in
                    do {
                        return try doc.data(as: MenuItem.self)
                    } catch {
                        decodeFailures += 1
                        menuLogger.error("MenuViewModel: Failed to decode menu item \(doc.documentID): \(error.localizedDescription)")
                        return nil
                    }
                }
                if decodeFailures > 0 {
                    menuLogger.warning("MenuViewModel: \(decodeFailures)/\(documents.count) items failed to decode in fetchMenuOnce")
                }
                completion(items)
            }
        }
    }

    /// Search menu items by name or description
    func searchMenu(query: String) -> [MenuItem] {
        guard !query.isEmpty else { return menuItems }

        let lowercasedQuery = query.lowercased()
        return menuItems.filter { item in
            item.name.lowercased().contains(lowercasedQuery) ||
            item.description.lowercased().contains(lowercasedQuery) ||
            (item.category?.lowercased().contains(lowercasedQuery) ?? false)
        }
    }

    /// Get menu items grouped by category
    var menuByCategory: [String: [MenuItem]] {
        Dictionary(grouping: menuItems) { $0.category ?? "Other" }
    }

    /// Get unique categories
    var categories: [String] {
        Array(Set(menuItems.compactMap { $0.category })).sorted()
    }

    /// Stop listening for updates
    func stopListening() {
        listener?.remove()
        listener = nil
    }

    private func handleError(_ error: Error) {
        errorMessage = "Unable to load menu. Please try again."
        hasError = true
        menuItems = []
        menuLogger.error("MenuViewModel: Error - \(error.localizedDescription)")
    }

    /// Retry fetching menu
    func retry(for restaurantId: String) {
        fetchMenu(for: restaurantId)
    }
}
