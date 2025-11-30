import SwiftUI
import Combine
import FirebaseFirestore
import EatFairShared

class MenuViewModel: ObservableObject {
    @Published var menuItems: [MenuItem] = []
    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var hasError = false

    private var db = Firestore.firestore()
    private var listener: ListenerRegistration?

    deinit {
        listener?.remove()
    }

    func fetchMenu(for restaurantId: String) {
        isLoading = true
        errorMessage = nil
        hasError = false

        // Remove any existing listener
        listener?.remove()

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

                    self.menuItems = documents.compactMap { doc in
                        try? doc.data(as: MenuItem.self)
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
                print("MenuViewModel: Error fetching menu - \(error.localizedDescription)")
                DispatchQueue.main.async {
                    completion([])
                }
                return
            }

            let items = snapshot?.documents.compactMap { doc in
                try? doc.data(as: MenuItem.self)
            } ?? []

            DispatchQueue.main.async {
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
        print("MenuViewModel: Error - \(error.localizedDescription)")
    }

    /// Retry fetching menu
    func retry(for restaurantId: String) {
        fetchMenu(for: restaurantId)
    }
}
