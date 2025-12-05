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

    private var db = Firestore.firestore()
    private let p2pAPI = P2PAPIService.shared

    // Configurable vendor ID for P2P backend (set this when restaurant logs in)
    var p2pVendorId: Int = 1 // Default to 1, should be set based on logged-in restaurant

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
            switch result {
            case .success(let menuItems):
                DispatchQueue.main.async {
                    self?.p2pMenuItems = menuItems
                    print("Loaded \(menuItems.count) menu items from P2P backend")
                }
            case .failure(let error):
                print("P2P API error: \(error.localizedDescription)")
            }

            // Also fetch from Firebase as backup
            self?.fetchFirebaseMenu()

            // Fetch verification status
            self?.fetchVerificationStatus()
        }
    }

    private func fetchFirebaseMenu() {
        db.collection("restaurants").document(restaurantId).collection("menu")
            .addSnapshotListener { [weak self] snapshot, error in
                DispatchQueue.main.async {
                    self?.isLoading = false
                }

                if let error = error {
                    print("Firebase error fetching menu: \(error)")
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
            case .failure(let error):
                print("Failed to get verification status: \(error)")
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
            case .failure(let error):
                print("Failed to approve prices: \(error)")
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
            case .failure(let error):
                print("Failed to assign stock images: \(error)")
                completion(0)
            }
        }
    }
    
    func addItem(name: String, description: String, price: Double, image: UIImage?) {
        if let image = image {
            uploadImage(image) { url in
                self.saveItemToFirestore(name: name, description: description, price: price, imageUrl: url)
            }
        } else {
            saveItemToFirestore(name: name, description: description, price: price, imageUrl: nil)
        }
    }
    
    private func saveItemToFirestore(name: String, description: String, price: Double, imageUrl: String?) {
        let newItem = EatFairShared.MenuItem(name: name, description: description, price: price, imageUrl: imageUrl ?? "", isAvailable: true)

        do {
            try db.collection("restaurants").document(restaurantId).collection("menu").addDocument(from: newItem)
        } catch {
            print("Error adding item: \(error)")
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
            if let error = error {
                print("Error uploading image: \(error)")
                completion(nil)
                return
            }
            
            imageRef.downloadURL { url, error in
                if let error = error {
                    print("Error getting download URL: \(error)")
                    completion(nil)
                    return
                }
                completion(url?.absoluteString)
            }
        }
    }
    
    func deleteItem(at offsets: IndexSet) {
        offsets.map { items[$0] }.forEach { (item: EatFairShared.MenuItem) in
            guard let id = item.id else { return }
            db.collection("restaurants").document(restaurantId).collection("menu").document(id).delete()
        }
    }
    
    func toggleAvailability(item: EatFairShared.MenuItem) {
        guard let id = item.id else { return }
        db.collection("restaurants").document(restaurantId).collection("menu").document(id).updateData([
            "isAvailable": !item.isAvailable
        ])
    }
}
