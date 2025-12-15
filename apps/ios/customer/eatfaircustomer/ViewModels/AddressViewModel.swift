import SwiftUI
import Combine
import CoreLocation
import EatFairShared

/// AddressViewModel - Uses P2P backend API for address management
/// Addresses are stored in the Dollor.ai backend database
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

    private let apiService = P2PAPIService.shared

    /// Get the current customer ID from UserDefaults
    private var currentUserId: Int? {
        let id = UserDefaults.standard.integer(forKey: "p2p_customer_id")
        return id > 0 ? id : nil
    }

    init() {
        self.selectedAddressId = UserDefaults.standard.string(forKey: "selectedAddressId")
        fetchAddresses()
    }

    deinit {
        // Clean up any resources if needed
    }

    // MARK: - Fetch Addresses from P2P Backend
    func fetchAddresses() {
        guard let userId = currentUserId else {
            addresses = []
            return
        }

        isLoading = true
        errorMessage = nil

        apiService.fetchAddresses(userId: userId) { [weak self] result in
            guard let self = self else { return }

            self.isLoading = false

            switch result {
            case .success(let p2pAddresses):
                self.addresses = p2pAddresses.map { $0.toAddress() }

                // Auto-select logic
                if self.selectedAddressId == nil || !self.addresses.contains(where: { $0.id == self.selectedAddressId }) {
                    if let defaultAddr = self.addresses.first(where: { $0.isDefault }) {
                        self.selectedAddressId = defaultAddr.id
                    } else {
                        self.selectedAddressId = self.addresses.first?.id
                    }
                }

            case .failure:
                self.errorMessage = "Failed to load addresses"
                self.addresses = []
            }
        }
    }

    // MARK: - Add Address
    func addAddress(address: Address, completion: @escaping (Bool) -> Void) {
        #if DEBUG
        print("[AddressViewModel] addAddress called")
        print("[AddressViewModel] currentUserId: \(String(describing: currentUserId))")
        #endif

        guard let userId = currentUserId else {
            #if DEBUG
            print("[AddressViewModel] ERROR: No user ID - user not logged in")
            #endif
            errorMessage = "Please log in to save addresses"
            completion(false)
            return
        }

        #if DEBUG
        print("[AddressViewModel] User ID found: \(userId)")
        #endif

        isLoading = true
        errorMessage = nil

        var newAddress = address

        // Set user ID from session
        newAddress.userId = "\(userId)"

        // Geocode the address for lat/long
        let geocoder = CLGeocoder()
        let addressString = "\(address.street), \(address.city), \(address.state) \(address.zipCode)"

        #if DEBUG
        print("[AddressViewModel] Geocoding: \(addressString)")
        #endif

        geocoder.geocodeAddressString(addressString) { [weak self] placemarks, error in
            guard let self = self else { return }

            if let error = error {
                #if DEBUG
                print("[AddressViewModel] Geocoding error: \(error.localizedDescription)")
                #endif
            }

            if let location = placemarks?.first?.location {
                newAddress.latitude = location.coordinate.latitude
                newAddress.longitude = location.coordinate.longitude
                #if DEBUG
                print("[AddressViewModel] Geocoded: lat=\(newAddress.latitude), lng=\(newAddress.longitude)")
                #endif
            }
            // If geocoding fails, lat/long will be 0.0

            // If this is the first address, make it default
            if self.addresses.isEmpty {
                newAddress.isDefault = true
            }

            #if DEBUG
            print("[AddressViewModel] Calling P2P API createAddress...")
            #endif

            // Create address via P2P API
            self.apiService.createAddress(userId: userId, address: newAddress) { [weak self] result in
                guard let self = self else { return }

                self.isLoading = false

                switch result {
                case .success(let p2pAddress):
                    #if DEBUG
                    print("[AddressViewModel] Address saved successfully: id=\(p2pAddress.id)")
                    #endif
                    let savedAddress = p2pAddress.toAddress()
                    self.addresses.append(savedAddress)

                    // Auto-select new address
                    self.selectedAddressId = savedAddress.id

                    completion(true)

                case .failure(let error):
                    #if DEBUG
                    print("[AddressViewModel] Failed to save address: \(error)")
                    #endif
                    self.errorMessage = "Failed to save address"
                    completion(false)
                }
            }
        }
    }

    // MARK: - Update Address
    func updateAddress(_ address: Address, completion: @escaping (Bool) -> Void) {
        guard let userId = currentUserId,
              let addressIdStr = address.id,
              let addressId = Int(addressIdStr) else {
            errorMessage = "Invalid address"
            completion(false)
            return
        }

        isLoading = true
        errorMessage = nil

        apiService.updateAddress(userId: userId, addressId: addressId, address: address) { [weak self] result in
            guard let self = self else { return }

            self.isLoading = false

            switch result {
            case .success(let p2pAddress):
                let updatedAddress = p2pAddress.toAddress()

                // Update local list
                if let index = self.addresses.firstIndex(where: { $0.id == address.id }) {
                    self.addresses[index] = updatedAddress
                }

                // If marked as default, unmark others
                if updatedAddress.isDefault {
                    for i in 0..<self.addresses.count {
                        if self.addresses[i].id != updatedAddress.id {
                            self.addresses[i].isDefault = false
                        }
                    }
                }

                completion(true)

            case .failure:
                self.errorMessage = "Failed to update address"
                completion(false)
            }
        }
    }

    // MARK: - Delete Address
    func deleteAddress(address: Address) {
        guard let userId = currentUserId,
              let addressIdStr = address.id,
              let addressId = Int(addressIdStr) else {
            return
        }

        isLoading = true
        errorMessage = nil

        apiService.deleteAddress(userId: userId, addressId: addressId) { [weak self] result in
            guard let self = self else { return }

            self.isLoading = false

            switch result {
            case .success:
                self.addresses.removeAll { $0.id == address.id }

                // If deleted address was selected, select another
                if self.selectedAddressId == address.id {
                    self.selectedAddressId = self.addresses.first?.id
                }

            case .failure:
                self.errorMessage = "Failed to delete address"
            }
        }
    }

    // MARK: - Set Default Address
    func setDefaultAddress(_ address: Address) {
        guard let userId = currentUserId,
              let addressIdStr = address.id,
              let addressId = Int(addressIdStr) else {
            return
        }

        isLoading = true
        errorMessage = nil

        apiService.setDefaultAddress(userId: userId, addressId: addressId) { [weak self] result in
            guard let self = self else { return }

            self.isLoading = false

            switch result {
            case .success:
                // Update local list
                for i in 0..<self.addresses.count {
                    self.addresses[i].isDefault = self.addresses[i].id == address.id
                }

                self.selectedAddressId = address.id

            case .failure:
                self.errorMessage = "Failed to set default address"
            }
        }
    }

    // MARK: - Clear All Addresses (for logout)
    func clearAllAddresses() {
        addresses = []
        selectedAddressId = nil
        UserDefaults.standard.removeObject(forKey: "selectedAddressId")
    }
}
