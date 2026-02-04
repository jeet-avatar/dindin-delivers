import Foundation
import Security
import os

private let storageLogger = Logger(subsystem: "ai.dollor.shared", category: "SecureStorage")

/// Secure storage using iOS Keychain
/// Use this for storing authentication tokens, sensitive user data, and API keys
public final class SecureStorage {
    public static let shared = SecureStorage()

    private let serviceName = "ai.dollor.secure"

    private init() {}

    // MARK: - Keychain Keys
    public enum Key: String {
        case customerAccessToken = "customer_access_token"
        case customerRefreshToken = "customer_refresh_token"
        case driverAccessToken = "driver_access_token"
        case driverRefreshToken = "driver_refresh_token"
        case vendorAccessToken = "vendor_access_token"
        case vendorRefreshToken = "vendor_refresh_token"
        case apnsToken = "apns_token"
        case fcmToken = "fcm_token"
        case userId = "user_id"
        case userEmail = "user_email"
    }

    // MARK: - Save

    /// Save a string value to Keychain
    /// - Parameters:
    ///   - value: The string value to store
    ///   - key: The key to store under
    /// - Returns: True if save was successful
    @discardableResult
    public func save(_ value: String, for key: Key) -> Bool {
        guard let data = value.data(using: .utf8) else {
            return false
        }
        return save(data, for: key)
    }

    /// Save data to Keychain
    /// - Parameters:
    ///   - data: The data to store
    ///   - key: The key to store under
    /// - Returns: True if save was successful
    @discardableResult
    public func save(_ data: Data, for key: Key) -> Bool {
        // Delete existing item first
        delete(key)

        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: serviceName,
            kSecAttrAccount as String: key.rawValue,
            kSecValueData as String: data,
            // Only accessible when device is unlocked, not backed up
            kSecAttrAccessible as String: kSecAttrAccessibleWhenUnlockedThisDeviceOnly
        ]

        let status = SecItemAdd(query as CFDictionary, nil)

        if status != errSecSuccess {
            storageLogger.error("Failed to save \(key.rawValue): \(status)")
        }

        return status == errSecSuccess
    }

    // MARK: - Retrieve

    /// Retrieve a string value from Keychain
    /// - Parameter key: The key to retrieve
    /// - Returns: The stored string, or nil if not found
    public func getString(for key: Key) -> String? {
        guard let data = getData(for: key) else {
            return nil
        }
        return String(data: data, encoding: .utf8)
    }

    /// Retrieve data from Keychain
    /// - Parameter key: The key to retrieve
    /// - Returns: The stored data, or nil if not found
    public func getData(for key: Key) -> Data? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: serviceName,
            kSecAttrAccount as String: key.rawValue,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]

        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)

        guard status == errSecSuccess else {
            if status != errSecItemNotFound {
                storageLogger.error("Failed to retrieve \(key.rawValue): \(status)")
            }
            return nil
        }

        return result as? Data
    }

    // MARK: - Delete

    /// Delete a value from Keychain
    /// - Parameter key: The key to delete
    /// - Returns: True if deletion was successful (or item didn't exist)
    @discardableResult
    public func delete(_ key: Key) -> Bool {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: serviceName,
            kSecAttrAccount as String: key.rawValue
        ]

        let status = SecItemDelete(query as CFDictionary)
        return status == errSecSuccess || status == errSecItemNotFound
    }

    /// Delete all stored values
    public func deleteAll() {
        for key in [Key.customerAccessToken, .customerRefreshToken,
                    .driverAccessToken, .driverRefreshToken,
                    .vendorAccessToken, .vendorRefreshToken,
                    .apnsToken, .fcmToken, .userId, .userEmail] {
            delete(key)
        }

        storageLogger.info("All secure data deleted")
    }

    // MARK: - Migration from UserDefaults

    /// Migrate tokens from UserDefaults to Keychain (call once on app launch)
    public func migrateFromUserDefaults() {
        let migrations: [(String, Key)] = [
            ("p2p_customer_access_token", .customerAccessToken),
            ("p2p_access_token", .customerAccessToken),
            ("p2p_driver_access_token", .driverAccessToken),
            ("p2p_vendor_access_token", .vendorAccessToken),
        ]

        for (userDefaultsKey, keychainKey) in migrations {
            if let token = UserDefaults.standard.string(forKey: userDefaultsKey),
               !token.isEmpty {
                // Save to Keychain
                if save(token, for: keychainKey) {
                    // Remove from UserDefaults
                    UserDefaults.standard.removeObject(forKey: userDefaultsKey)
                    storageLogger.info("Migrated \(userDefaultsKey) to Keychain")
                }
            }
        }

        UserDefaults.standard.synchronize()
    }

    // MARK: - Convenience Properties

    /// Current customer access token
    public var customerAccessToken: String? {
        get { getString(for: .customerAccessToken) }
        set {
            if let token = newValue {
                save(token, for: .customerAccessToken)
            } else {
                delete(.customerAccessToken)
            }
        }
    }

    /// Current driver access token
    public var driverAccessToken: String? {
        get { getString(for: .driverAccessToken) }
        set {
            if let token = newValue {
                save(token, for: .driverAccessToken)
            } else {
                delete(.driverAccessToken)
            }
        }
    }

    /// Current vendor access token
    public var vendorAccessToken: String? {
        get { getString(for: .vendorAccessToken) }
        set {
            if let token = newValue {
                save(token, for: .vendorAccessToken)
            } else {
                delete(.vendorAccessToken)
            }
        }
    }

    /// Check if user is authenticated (has valid token)
    public var isAuthenticated: Bool {
        return customerAccessToken != nil || driverAccessToken != nil || vendorAccessToken != nil
    }
}

// MARK: - Token Management Extension

public extension SecureStorage {

    /// Save authentication response tokens
    func saveAuthTokens(accessToken: String, refreshToken: String? = nil, type: TokenType) {
        switch type {
        case .customer:
            save(accessToken, for: .customerAccessToken)
            if let refresh = refreshToken {
                save(refresh, for: .customerRefreshToken)
            }
        case .driver:
            save(accessToken, for: .driverAccessToken)
            if let refresh = refreshToken {
                save(refresh, for: .driverRefreshToken)
            }
        case .vendor:
            save(accessToken, for: .vendorAccessToken)
            if let refresh = refreshToken {
                save(refresh, for: .vendorRefreshToken)
            }
        }
    }

    /// Clear all tokens for logout
    func clearAuthTokens(type: TokenType? = nil) {
        if let type = type {
            switch type {
            case .customer:
                delete(.customerAccessToken)
                delete(.customerRefreshToken)
            case .driver:
                delete(.driverAccessToken)
                delete(.driverRefreshToken)
            case .vendor:
                delete(.vendorAccessToken)
                delete(.vendorRefreshToken)
            }
        } else {
            // Clear all
            deleteAll()
        }
    }

    enum TokenType {
        case customer
        case driver
        case vendor
    }
}
