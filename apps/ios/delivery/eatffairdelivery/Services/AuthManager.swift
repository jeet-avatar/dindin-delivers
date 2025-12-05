import Foundation
import Combine
import EatFairShared

/// AuthManager for P2P-based driver authentication
/// Manages driver login state using P2P API tokens stored in UserDefaults
class AuthManager: ObservableObject {
    @Published var isLoggedIn: Bool = false
    @Published var driverName: String = ""
    @Published var driverEmail: String = ""

    private let p2pService = P2PAPIService.shared

    init() {
        // Check if driver is already logged in
        checkLoginState()
    }

    private func checkLoginState() {
        if let _ = UserDefaults.standard.string(forKey: UserDefaultsKeys.driverAccessToken),
           let _ = UserDefaults.standard.object(forKey: UserDefaultsKeys.driverId) {
            isLoggedIn = true
            // Load cached driver info
            driverName = UserDefaults.standard.string(forKey: UserDefaultsKeys.driverName) ?? ""
            driverEmail = UserDefaults.standard.string(forKey: UserDefaultsKeys.driverEmail) ?? ""
        } else {
            isLoggedIn = false
        }
    }

    func logout() {
        // Clear all stored driver data
        UserDefaults.standard.removeObject(forKey: UserDefaultsKeys.driverAccessToken)
        UserDefaults.standard.removeObject(forKey: UserDefaultsKeys.driverId)
        UserDefaults.standard.removeObject(forKey: UserDefaultsKeys.driverCode)
        UserDefaults.standard.removeObject(forKey: UserDefaultsKeys.driverName)
        UserDefaults.standard.removeObject(forKey: UserDefaultsKeys.driverEmail)

        DispatchQueue.main.async {
            self.isLoggedIn = false
            self.driverName = ""
            self.driverEmail = ""
        }
    }

    func refreshLoginState() {
        checkLoginState()
    }
}
