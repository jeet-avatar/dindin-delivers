import Foundation
import Combine
import EatFairShared

/// AuthManager for P2P-based driver authentication
/// Manages driver login state using P2P API tokens stored in SecureStorage (Keychain)
/// Note: Tokens are stored in SecureStorage, other info (driverId, name, email) in UserDefaults
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
        // Check for token in SecureStorage (Keychain) - this is where P2PAPIService stores it
        let hasToken = SecureStorage.shared.driverAccessToken != nil
        let hasDriverId = UserDefaults.standard.object(forKey: UserDefaultsKeys.driverId) != nil

        if hasToken && hasDriverId {
            isLoggedIn = true
            // Load cached driver info from UserDefaults
            driverName = UserDefaults.standard.string(forKey: UserDefaultsKeys.driverName) ?? ""
            driverEmail = UserDefaults.standard.string(forKey: UserDefaultsKeys.driverEmail) ?? ""

            #if DEBUG
            logger.info("[AuthManager] Driver logged in - ID: \(UserDefaults.standard.object(forKey: UserDefaultsKeys.driverId) ?? "nil")")
            #endif
        } else {
            isLoggedIn = false
            #if DEBUG
            logger.info("[AuthManager] Not logged in - hasToken: \(hasToken), hasDriverId: \(hasDriverId)")
            #endif
        }
    }

    func logout() {
        // Clear token from SecureStorage (Keychain)
        SecureStorage.shared.clearAuthTokens(type: .driver)

        // Clear all stored driver data from UserDefaults
        UserDefaults.standard.removeObject(forKey: UserDefaultsKeys.driverId)
        UserDefaults.standard.removeObject(forKey: UserDefaultsKeys.driverCode)
        UserDefaults.standard.removeObject(forKey: UserDefaultsKeys.driverName)
        UserDefaults.standard.removeObject(forKey: UserDefaultsKeys.driverEmail)

        DispatchQueue.main.async {
            self.isLoggedIn = false
            self.driverName = ""
            self.driverEmail = ""
        }

        #if DEBUG
        logger.info("[AuthManager] Logged out - cleared all driver data")
        #endif
    }

    func refreshLoginState() {
        checkLoginState()
    }
}
