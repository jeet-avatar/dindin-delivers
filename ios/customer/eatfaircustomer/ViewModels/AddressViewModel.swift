import SwiftUI
import FirebaseFirestore
import FirebaseAuth
import Combine
import CoreLocation
import EatFairShared

class AddressViewModel: ObservableObject {
    @Published var addresses: [Address] = []
    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var selectedAddressId: String? {
        didSet {
            if let id = selectedAddressId {
                UserDefaults.standard.set(id, forKey: "selectedAddressId")
            }
        }
    }
    
    var selectedAddress: Address? {
        addresses.first { $0.id == selectedAddressId }
    }
    
    private var db = Firestore.firestore()
    private var listenerRegistration: ListenerRegistration?
    
    init() {
        self.selectedAddressId = UserDefaults.standard.string(forKey: "selectedAddressId")
        fetchAddresses()
    }
    
    func fetchAddresses() {
        guard let userId = Auth.auth().currentUser?.uid else { return }
        
        isLoading = true
        listenerRegistration = db.collection("users").document(userId).collection("addresses")
            .addSnapshotListener { [weak self] snapshot, error in
                guard let self = self else { return }
                self.isLoading = false
                
                if let error = error {
                    self.errorMessage = error.localizedDescription
                    return
                }
                
                guard let documents = snapshot?.documents else { return }
                
                self.addresses = documents.compactMap { try? $0.data(as: Address.self) }
                
                // Auto-select logic
                if self.selectedAddressId == nil || !self.addresses.contains(where: { $0.id == self.selectedAddressId }) {
                    if let defaultAddr = self.addresses.first(where: { $0.isDefault }) {
                        self.selectedAddressId = defaultAddr.id
                    } else {
                        self.selectedAddressId = self.addresses.first?.id
                    }
                }
            }
    }
    
    func addAddress(address: Address, completion: @escaping (Bool) -> Void) {
        guard let userId = Auth.auth().currentUser?.uid else { return }
        
        var newAddress = address
        newAddress.userId = userId
        
        // Geocode the address
        let geocoder = CLGeocoder()
        let addressString = "\(address.street), \(address.city), \(address.state) \(address.zipCode)"
        
        geocoder.geocodeAddressString(addressString) { placemarks, error in
            if let location = placemarks?.first?.location {
                newAddress.latitude = location.coordinate.latitude
                newAddress.longitude = location.coordinate.longitude
            } else {
                print("Geocoding failed: \(error?.localizedDescription ?? "Unknown error")")
                // Still save, but lat/long will be 0.0
            }
            
            do {
                try self.db.collection("users").document(userId).collection("addresses").addDocument(from: newAddress) { error in
                    if let error = error {
                        self.errorMessage = error.localizedDescription
                        completion(false)
                    } else {
                        completion(true)
                    }
                }
            } catch {
                self.errorMessage = error.localizedDescription
                completion(false)
            }
        }
    }
    
    func deleteAddress(address: Address) {
        guard let userId = Auth.auth().currentUser?.uid, let addressId = address.id else { return }
        
        db.collection("users").document(userId).collection("addresses").document(addressId).delete()
    }
    
    deinit {
        listenerRegistration?.remove()
    }
}
