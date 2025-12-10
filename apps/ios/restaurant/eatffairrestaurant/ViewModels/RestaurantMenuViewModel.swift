import SwiftUI
import FirebaseFirestore
import Combine
import FirebaseAuth
import FirebaseStorage
import EatFairShared

class RestaurantMenuViewModel: ObservableObject {
    @Published var items: [EatFairShared.MenuItem] = []
    @Published var p2pMenuItems: [P2PMenuItem] = [] // P2P backend menu items
    @Published var isLoading = false
    @Published var verificationStatus: P2PVerificationStatus?
    @Published var errorMessage: String?
    @Published var showError = false
    @Published var categories: [String] = [] // Menu categories from P2P API
    @Published var isAddingItem = false
    @Published var isDeletingItem = false

    private var db = Firestore.firestore()
    private let p2pAPI = P2PAPIService.shared

    // Configurable vendor ID for P2P backend (set this when restaurant logs in)
    var p2pVendorId: Int {
        // Get from P2P API service (single source of truth)
        p2pAPI.currentVendorId ?? 1
    }

    private var restaurantId: String {
        Auth.auth().currentUser?.uid ?? "12"
    }

    // Combined menu items from both sources
    var allItems: [EatFairShared.MenuItem] {
        items + p2pMenuItems.map { $0.toMenuItem() }
    }

    func fetchMenu() {
        isLoading = true
        errorMessage = nil

        // Fetch from P2P backend first (primary source for scraped menus)
        p2pAPI.fetchMenuItems(vendorId: p2pVendorId) { [weak self] result in
            guard let self = self else { return }

            switch result {
            case .success(let menuItems):
                DispatchQueue.main.async {
                    self.p2pMenuItems = menuItems
                }
            case .failure(let error):
                DispatchQueue.main.async {
                    self.errorMessage = "Failed to load menu: \(error.localizedDescription)"
                }
            }

            // Also fetch from Firebase as backup
            self.fetchFirebaseMenu()

            // Fetch verification status
            self.fetchVerificationStatus()

            // Fetch categories
            self.fetchCategories()
        }
    }

    /// Fetch menu categories from P2P API
    func fetchCategories() {
        p2pAPI.getMenuCategories(vendorId: p2pVendorId) { [weak self] result in
            guard let self = self else { return }

            DispatchQueue.main.async {
                switch result {
                case .success(let fetchedCategories):
                    self.categories = fetchedCategories
                case .failure(let error):
                    #if DEBUG
                    print("Failed to fetch categories: \(error.localizedDescription)")
                    #endif
                }
            }
        }
    }

    private func fetchFirebaseMenu() {
        db.collection("restaurants").document(restaurantId).collection("menu")
            .addSnapshotListener { [weak self] snapshot, error in
                DispatchQueue.main.async {
                    self?.isLoading = false
                }

                if let error = error {
                    DispatchQueue.main.async {
                        self?.errorMessage = "Error fetching menu: \(error.localizedDescription)"
                    }
                    return
                }

                guard let documents = snapshot?.documents else { return }
                DispatchQueue.main.async {
                    self?.items = documents.compactMap { (doc: QueryDocumentSnapshot) -> EatFairShared.MenuItem? in
                        try? doc.data(as: EatFairShared.MenuItem.self)
                    }
                }
            }
    }

    // MARK: - P2P Menu Verification (Aria AI)

    func fetchVerificationStatus() {
        p2pAPI.getVerificationStatus(vendorId: p2pVendorId) { [weak self] result in
            switch result {
            case .success(let status):
                DispatchQueue.main.async {
                    self?.verificationStatus = status
                }
            case .failure:
                break
            }
        }
    }

    func approveAllPrices(completion: @escaping (Bool) -> Void) {
        p2pAPI.approveAllPrices(vendorId: p2pVendorId) { [weak self] result in
            switch result {
            case .success(let success):
                if success {
                    self?.fetchVerificationStatus()
                }
                completion(success)
            case .failure:
                completion(false)
            }
        }
    }

    func assignStockImages(completion: @escaping (Int) -> Void) {
        p2pAPI.assignStockImages(vendorId: p2pVendorId) { [weak self] result in
            switch result {
            case .success(let count):
                self?.fetchMenu() // Refresh menu to show new images
                completion(count)
            case .failure:
                completion(0)
            }
        }
    }
    
    /// Add a new menu item via P2P API (primary) with Firebase fallback
    func addItem(name: String, description: String, price: Double, image: UIImage?, category: String? = nil, completion: ((Bool) -> Void)? = nil) {
        isAddingItem = true

        // If image provided, upload first then create item
        if let image = image {
            uploadImage(image) { [weak self] url in
                self?.createMenuItemViaP2P(
                    name: name,
                    description: description,
                    price: price,
                    imageUrl: url,
                    category: category,
                    completion: completion
                )
            }
        } else {
            createMenuItemViaP2P(
                name: name,
                description: description,
                price: price,
                imageUrl: nil,
                category: category,
                completion: completion
            )
        }
    }

    /// Create menu item via P2P API
    private func createMenuItemViaP2P(name: String, description: String, price: Double, imageUrl: String?, category: String?, completion: ((Bool) -> Void)?) {
        let menuItem = P2PMenuItemCreate(
            itemName: name,
            description: description,
            category: category ?? "Main",
            price: price,
            imageUrl: imageUrl
        )

        p2pAPI.createMenuItem(vendorId: p2pVendorId, menuItem: menuItem) { [weak self] result in
            guard let self = self else { return }

            DispatchQueue.main.async {
                self.isAddingItem = false

                switch result {
                case .success(let createdItem):
                    // Add to local list immediately
                    self.p2pMenuItems.append(createdItem)
                    #if DEBUG
                    print("[Menu] Created menu item via P2P API: \(createdItem.name)")
                    #endif
                    completion?(true)

                case .failure(let error):
                    self.errorMessage = "Failed to add menu item: \(error.localizedDescription)"
                    self.showError = true
                    #if DEBUG
                    print("[Menu] P2P create failed: \(error.localizedDescription)")
                    #endif

                    // Fallback to Firebase
                    self.saveItemToFirestore(name: name, description: description, price: price, imageUrl: imageUrl)
                    completion?(false)
                }
            }
        }
    }

    /// Fallback to Firebase for saving menu items
    private func saveItemToFirestore(name: String, description: String, price: Double, imageUrl: String?) {
        let newItem = EatFairShared.MenuItem(name: name, description: description, price: price, imageUrl: imageUrl ?? "", isAvailable: true)

        do {
            try db.collection("restaurants").document(restaurantId).collection("menu").addDocument(from: newItem)
        } catch {
            DispatchQueue.main.async {
                self.errorMessage = "Error adding item: \(error.localizedDescription)"
                self.showError = true
            }
        }
    }
    
    private func uploadImage(_ image: UIImage, completion: @escaping (String?) -> Void) {
        guard let imageData = image.jpegData(compressionQuality: 0.5) else {
            completion(nil)
            return
        }
        
        let storageRef = Storage.storage().reference()
        let imageId = UUID().uuidString
        let imageRef = storageRef.child("menu_items/\(imageId).jpg")
        
        let metadata = StorageMetadata()
        metadata.contentType = "image/jpeg"
        
        imageRef.putData(imageData, metadata: metadata) { metadata, error in
            if error != nil {
                completion(nil)
                return
            }

            imageRef.downloadURL { url, error in
                if error != nil {
                    completion(nil)
                    return
                }
                completion(url?.absoluteString)
            }
        }
    }
    
    /// Delete menu item via P2P API (primary) with Firebase fallback
    func deleteItem(at offsets: IndexSet) {
        isDeletingItem = true

        // Determine which list we're deleting from
        // For now, assume we're deleting from allItems which combines both lists
        offsets.forEach { index in
            // Check if it's a P2P item
            if index < p2pMenuItems.count {
                let p2pItem = p2pMenuItems[index]
                deleteP2PMenuItem(p2pItem)
            } else {
                // Firebase item
                let adjustedIndex = index - p2pMenuItems.count
                if adjustedIndex < items.count {
                    let firebaseItem = items[adjustedIndex]
                    deleteFirebaseMenuItem(firebaseItem)
                }
            }
        }
    }

    /// Delete a specific menu item (for P2P items by ID)
    func deleteMenuItem(_ item: P2PMenuItem) {
        deleteP2PMenuItem(item)
    }

    /// Delete P2P menu item via API
    private func deleteP2PMenuItem(_ item: P2PMenuItem) {
        isDeletingItem = true

        p2pAPI.deleteMenuItem(vendorId: p2pVendorId, itemId: item.id) { [weak self] result in
            guard let self = self else { return }

            DispatchQueue.main.async {
                self.isDeletingItem = false

                switch result {
                case .success(let deleted):
                    if deleted {
                        // Remove from local list
                        self.p2pMenuItems.removeAll { $0.id == item.id }
                        #if DEBUG
                        print("[Menu] Deleted menu item via P2P API: \(item.name)")
                        #endif
                    } else {
                        self.errorMessage = "Failed to delete menu item"
                        self.showError = true
                    }

                case .failure(let error):
                    self.errorMessage = "Failed to delete: \(error.localizedDescription)"
                    self.showError = true
                    #if DEBUG
                    print("[Menu] P2P delete failed: \(error.localizedDescription)")
                    #endif
                }
            }
        }
    }

    /// Delete Firebase menu item (fallback)
    private func deleteFirebaseMenuItem(_ item: EatFairShared.MenuItem) {
        guard let id = item.id else {
            isDeletingItem = false
            return
        }

        db.collection("restaurants").document(restaurantId).collection("menu").document(id).delete { [weak self] error in
            DispatchQueue.main.async {
                self?.isDeletingItem = false
                if let error = error {
                    self?.errorMessage = "Failed to delete: \(error.localizedDescription)"
                    self?.showError = true
                }
            }
        }
    }
    
    func toggleAvailability(item: EatFairShared.MenuItem) {
        guard let id = item.id else { return }
        db.collection("restaurants").document(restaurantId).collection("menu").document(id).updateData([
            "isAvailable": !item.isAvailable
        ])
    }
}
