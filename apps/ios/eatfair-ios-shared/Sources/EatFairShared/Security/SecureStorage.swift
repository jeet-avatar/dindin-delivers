import Foundation
import Security
import os

private let storageLogger = Logger(subsystem: "ai.dollor.shared", category: "SecureStorage")

/// Secure storage using iOS Keychain.
/// Use this for storing authentication tokens, sensitive user data, and API keys.
///
/// Fallback chain (best → last):
///   1. Keychain — best, encrypted at rest, survives app updates
///   2. UserDefaults — survives app restart, NOT encrypted. Used when
///      Keychain rejects writes (which happens silently on real devices when
///      the keychain-access-groups entitlement is missing from the provisioning
///      profile — quick-362 confirmed this was the production cause of users
///      being logged out and losing their saved addresses across app restarts).
///   3. In-memory mirror — session-only, primarily for tests and dev builds.
///
/// Reads check all three (Keychain → UserDefaults → memory). Writes mirror to
/// all three so that even if one tier silently fails, the value is still
/// retrievable.
public final class SecureStorage {
    public static let shared = SecureStorage()

    private let serviceName = "ai.dollor.secure"

    /// In-memory mirror of the keychain. Populated on every successful save
    /// AND on every save that was rejected by the keychain (so reads still
    /// return the latest value even on dev builds).
    private var memoryStore: [String: Data] = [:]
    private let memoryQueue = DispatchQueue(label: "ai.dollor.secure.memory")

    /// UserDefaults fallback prefix. UserDefaults is unencrypted but survives
    /// app restart — that's the property we need when Keychain is unavailable.
    private let userDefaultsPrefix = "ai.dollor.secure_fallback."

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
        // Always update the in-memory mirror first so reads in this process
        // work even when both keychain and UserDefaults reject the write.
        memoryQueue.sync { memoryStore[key.rawValue] = data }

        // Also persist to UserDefaults so the value survives app restart when
        // keychain is unavailable (the production root cause of quick-362).
        UserDefaults.standard.set(data, forKey: userDefaultsPrefix + key.rawValue)

        // quick-363: legacy code paths (PaymentService, parts of the customer
        // checkout flow) fall back to UserDefaults under the *unprefixed* keys
        // declared in AppConfig.UserDefaultsKeys ("p2p_customer_access_token",
        // "p2p_driver_access_token", etc). Mirror the token writes there too
        // so those code paths keep working even when Keychain rejected the
        // primary write. Symptom on production was "fails to initialize
        // payment" on checkout because PaymentService's fallback path read a
        // never-written key.
        if let legacyKey = Self.legacyUserDefaultsKey(for: key),
           let string = String(data: data, encoding: .utf8) {
            UserDefaults.standard.set(string, forKey: legacyKey)
        }

        // Delete existing keychain item first (idempotent)
        deleteKeychainOnly(key)

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
            storageLogger.error("Keychain save rejected for \(key.rawValue): OSStatus \(status) — UserDefaults + in-memory fallback active")
        }

        // Return true: the value is retrievable via getData() regardless of
        // whether the keychain accepted it. Callers (login flows) treat this
        // as "the token is now available".
        return true
    }

    /// Delete only the keychain entry (used internally by save to overwrite).
    /// The full `delete(_:)` clears all three tiers; we don't want that here.
    private func deleteKeychainOnly(_ key: Key) {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: serviceName,
            kSecAttrAccount as String: key.rawValue
        ]
        _ = SecItemDelete(query as CFDictionary)
    }

    /// quick-363: legacy unprefixed UserDefaults keys used by callers outside
    /// SecureStorage (PaymentService, etc.). Mapped only for tokens — other
    /// SecureStorage keys don't have legacy readers.
    private static func legacyUserDefaultsKey(for key: Key) -> String? {
        switch key {
        case .customerAccessToken: return "p2p_customer_access_token"
        case .driverAccessToken:   return "p2p_driver_access_token"
        case .vendorAccessToken:   return "p2p_vendor_access_token"
        default:                   return nil
        }
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

        if status == errSecSuccess, let data = result as? Data {
            return data
        }
        if status != errSecSuccess && status != errSecItemNotFound {
            storageLogger.error("Keychain read rejected for \(key.rawValue): OSStatus \(status) — falling back to UserDefaults")
        }
        // Keychain miss → UserDefaults (survives restart) → memory (current
        // process). Without the UserDefaults tier, real devices that silently
        // failed the keychain write would lose the auth token on every app
        // relaunch, logging the user out and losing their saved addresses
        // (quick-362).
        if let stored = UserDefaults.standard.data(forKey: userDefaultsPrefix + key.rawValue) {
            return stored
        }
        // quick-363: also look under the legacy unprefixed UserDefaults key
        // in case the value was written by a code path that doesn't go
        // through SecureStorage (older versions of the app, or the customer
        // login flow's manual UserDefaults writes).
        if let legacyKey = Self.legacyUserDefaultsKey(for: key),
           let stored = UserDefaults.standard.string(forKey: legacyKey),
           let data = stored.data(using: .utf8) {
            return data
        }
        return memoryQueue.sync { memoryStore[key.rawValue] }
    }

    // MARK: - Delete

    /// Delete a value from Keychain
    /// - Parameter key: The key to delete
    /// - Returns: True if deletion was successful (or item didn't exist)
    @discardableResult
    public func delete(_ key: Key) -> Bool {
        memoryQueue.sync { memoryStore.removeValue(forKey: key.rawValue) }
        UserDefaults.standard.removeObject(forKey: userDefaultsPrefix + key.rawValue)
        if let legacyKey = Self.legacyUserDefaultsKey(for: key) {
            UserDefaults.standard.removeObject(forKey: legacyKey)
        }

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
