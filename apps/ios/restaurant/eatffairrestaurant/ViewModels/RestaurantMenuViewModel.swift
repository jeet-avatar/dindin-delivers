import SwiftUI
import Combine
import FirebaseAuth
import EatFairShared

class RestaurantMenuViewModel: ObservableObject {
    @Published var p2pMenuItems: [P2PMenuItem] = [] // P2P backend menu items
    @Published var isLoading = false
    @Published var verificationStatus: P2PVerificationStatus?
    @Published var errorMessage: String?
    @Published var showError = false
    @Published var categories: [String] = [] // Menu categories from P2P API
    @Published var isAddingItem = false
    @Published var isDeletingItem = false

    private let p2pAPI = P2PAPIService.shared

    // Configurable vendor ID for P2P backend (set this when restaurant logs in)
    var p2pVendorId: Int {
        // Get from P2P API service (single source of truth)
        p2pAPI.currentVendorId ?? 1
    }

    // Menu items from P2P backend only
    var allItems: [EatFairShared.MenuItem] {
        p2pMenuItems.map { $0.toMenuItem() }
    }

    func fetchMenu() {
        isLoading = true
        errorMessage = nil

        // Fetch from P2P backend only
        p2pAPI.fetchMenuItems(vendorId: p2pVendorId) { [weak self] result in
            guard let self = self else { return }

            DispatchQueue.main.async {
                self.isLoading = false

                switch result {
                case .success(let menuItems):
                    self.p2pMenuItems = menuItems
                case .failure(let error):
                    self.errorMessage = "Failed to load menu: \(error.localizedDescription)"
                    self.showError = true
                }
            }

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
    
    /// Add a new menu item via P2P API
    func addItem(name: String, description: String, price: Double, image: UIImage?, category: String? = nil, completion: ((Bool) -> Void)? = nil) {
        isAddingItem = true

        // Create item first, then upload image if provided
        createMenuItemViaP2P(
            name: name,
            description: description,
            price: price,
            image: image,
            category: category,
            completion: completion
        )
    }

    /// Create menu item via P2P API
    private func createMenuItemViaP2P(name: String, description: String, price: Double, image: UIImage?, category: String?, completion: ((Bool) -> Void)?) {
        let menuItem = P2PMenuItemCreate(
            itemName: name,
            description: description,
            category: category ?? "Main",
            price: price,
            imageUrl: nil  // Will be set after upload
        )

        p2pAPI.createMenuItem(vendorId: p2pVendorId, menuItem: menuItem) { [weak self] result in
            guard let self = self else { return }

            switch result {
            case .success(let createdItem):
                // Add to local list immediately
                DispatchQueue.main.async {
                    self.p2pMenuItems.append(createdItem)
                    #if DEBUG
                    print("[Menu] Created menu item via P2P API: \(createdItem.name)")
                    #endif
                }

                // If image provided, upload it now
                if let image = image {
                    self.uploadImageToP2P(image, menuItemId: createdItem.id) { [weak self] success in
                        DispatchQueue.main.async {
                            self?.isAddingItem = false
                            if success {
                                // Refresh menu to get updated image URL
                                self?.fetchMenu()
                            }
                            completion?(success)
                        }
                    }
                } else {
                    DispatchQueue.main.async {
                        self.isAddingItem = false
                        completion?(true)
                    }
                }

            case .failure(let error):
                DispatchQueue.main.async {
                    self.isAddingItem = false
                    self.errorMessage = "Failed to add menu item: \(error.localizedDescription)"
                    self.showError = true
                    #if DEBUG
                    print("[Menu] P2P create failed: \(error.localizedDescription)")
                    #endif
                    completion?(false)
                }
            }
        }
    }
    
    /// Upload image to P2P backend vibing endpoint
    private func uploadImageToP2P(_ image: UIImage, menuItemId: Int, completion: @escaping (Bool) -> Void) {
        guard let imageData = image.jpegData(compressionQuality: 0.7) else {
            #if DEBUG
            print("[Menu] Failed to convert image to JPEG data")
            #endif
            completion(false)
            return
        }

        let boundary = UUID().uuidString
        let baseURL = AppConfig.shared.p2pAPIBaseURL
        guard let url = URL(string: "\(baseURL)/api/vibing/upload-image/\(menuItemId)") else {
            #if DEBUG
            print("[Menu] Invalid upload URL")
            #endif
            completion(false)
            return
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")

        // Build multipart form data
        var body = Data()

        // Add file part
        body.append("--\(boundary)\r\n".data(using: .utf8)!)
        body.append("Content-Disposition: form-data; name=\"file\"; filename=\"image.jpg\"\r\n".data(using: .utf8)!)
        body.append("Content-Type: image/jpeg\r\n\r\n".data(using: .utf8)!)
        body.append(imageData)
        body.append("\r\n".data(using: .utf8)!)
        body.append("--\(boundary)--\r\n".data(using: .utf8)!)

        request.httpBody = body

        #if DEBUG
        print("[Menu] Uploading image to P2P backend: /api/vibing/upload-image/\(menuItemId)")
        #endif

        URLSession.shared.dataTask(with: request) { data, response, error in
            if let error = error {
                #if DEBUG
                print("[Menu] Image upload failed: \(error.localizedDescription)")
                #endif
                completion(false)
                return
            }

            guard let httpResponse = response as? HTTPURLResponse else {
                #if DEBUG
                print("[Menu] Invalid response")
                #endif
                completion(false)
                return
            }

            if httpResponse.statusCode == 200 {
                #if DEBUG
                print("[Menu] Image uploaded successfully to P2P backend")
                #endif
                completion(true)
            } else {
                #if DEBUG
                if let data = data, let responseBody = String(data: data, encoding: .utf8) {
                    print("[Menu] Upload failed with status \(httpResponse.statusCode): \(responseBody)")
                }
                #endif
                completion(false)
            }
        }.resume()
    }
    
    /// Delete menu item via P2P API
    func deleteItem(at offsets: IndexSet) {
        isDeletingItem = true

        offsets.forEach { index in
            if index < p2pMenuItems.count {
                let p2pItem = p2pMenuItems[index]
                deleteP2PMenuItem(p2pItem)
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
}
