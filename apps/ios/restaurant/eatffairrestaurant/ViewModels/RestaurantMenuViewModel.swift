import SwiftUI
import FirebaseFirestore
import Combine
import FirebaseAuth
import FirebaseStorage
import EatFairShared

class RestaurantMenuViewModel: ObservableObject {
    @Published var items: [EatFairShared.MenuItem] = []
    @Published var isLoading = false
    
    private var db = Firestore.firestore()
    private var restaurantId: String {
        Auth.auth().currentUser?.uid ?? "12"
    }
    
    func fetchMenu() {
        isLoading = true
        db.collection("restaurants").document(restaurantId).collection("menu")
            .addSnapshotListener { snapshot, error in
                self.isLoading = false
                if let error = error {
                    print("Error fetching menu: \(error)")
                    return
                }
                
                guard let documents = snapshot?.documents else { return }
                self.items = documents.compactMap { (doc: QueryDocumentSnapshot) -> EatFairShared.MenuItem? in
                    try? doc.data(as: EatFairShared.MenuItem.self)
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
