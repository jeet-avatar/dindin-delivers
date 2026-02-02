import Foundation

/// Google Maps Configuration
/// IMPORTANT: Enable these APIs in Google Cloud Console for project 'eatfair-app':
/// 1. Maps SDK for iOS
/// 2. Places API
/// 3. Directions API
/// 4. Distance Matrix API
/// 5. Geocoding API
///
/// ACTUAL BUNDLE IDs (add these to API Key restrictions in Google Cloud Console):
/// - Customer App: com.dollorai.customer
/// - Restaurant App: com.dollorai.restaurant
/// - Delivery App: com.dollorai.driver
///
/// APP STORE FIX: API key must be loaded from Info.plist or GoogleService-Info.plist
/// Never hardcode API keys in source code for production builds.
public struct GoogleMapsConfig {
    /// Google Maps API Key
    /// This key is loaded from the app's Info.plist or GoogleService-Info.plist for security.
    /// Add `GOOGLE_MAPS_API_KEY` to your Info.plist or use xcconfig files.
    ///
    /// Make sure to restrict this key in Google Cloud Console:
    /// - Application restrictions: iOS apps
    /// - Bundle IDs: com.dollorai.customer, com.dollorai.restaurant, com.dollorai.driver
    /// - API restrictions: Maps SDK for iOS, Places API, Directions API, Geocoding API
    public static var apiKey: String {
        // Try to load from Info.plist first (recommended for production)
        if let key = Bundle.main.object(forInfoDictionaryKey: "GOOGLE_MAPS_API_KEY") as? String,
           !key.isEmpty,
           !key.starts(with: "$("),
           !key.contains("REPLACE"),
           key.starts(with: "AIza") {
            return key
        }

        // Try GoogleService-Info.plist (Firebase config file)
        if let path = Bundle.main.path(forResource: "GoogleService-Info", ofType: "plist"),
           let plist = NSDictionary(contentsOfFile: path),
           let key = plist["API_KEY"] as? String,
           !key.isEmpty,
           key.starts(with: "AIza") {
            return key
        }

        // Try environment variable (for CI/CD)
        if let key = ProcessInfo.processInfo.environment["GOOGLE_MAPS_API_KEY"],
           !key.isEmpty {
            return key
        }

        // Return empty string instead of crashing - maps will be disabled but app will work
        return ""
    }

    /// Current API key to use (convenience accessor)
    public static var currentKey: String {
        return apiKey
    }

    /// Validate that the API key is properly configured
    public static func validateConfiguration() -> Bool {
        let key = apiKey
        return !key.isEmpty && key.starts(with: "AIza")
    }
}
