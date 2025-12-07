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
/// - Customer App: com.eatfair.customer.Customer
/// - Restaurant App: com.eatfair.restaurant.eatffairrestaurant
/// - Delivery App: com.eatfair.delivery
///
public struct GoogleMapsConfig {
    /// Google Maps API Key
    /// This key is loaded from the app's Info.plist for security.
    /// Add `GOOGLE_MAPS_API_KEY` to your Info.plist or use xcconfig files.
    ///
    /// Make sure to restrict this key in Google Cloud Console:
    /// - Application restrictions: iOS apps
    /// - Bundle IDs: com.eatfair.customer.Customer, com.eatfair.restaurant.eatffairrestaurant, com.eatfair.delivery
    /// - API restrictions: Maps SDK for iOS, Places API, Directions API, Geocoding API
    public static var apiKey: String {
        // Try to load from Info.plist first (recommended for production)
        if let key = Bundle.main.object(forInfoDictionaryKey: "GOOGLE_MAPS_API_KEY") as? String,
           !key.isEmpty, !key.starts(with: "$(") {
            return key
        }

        // Try environment variable (for CI/CD)
        if let key = ProcessInfo.processInfo.environment["GOOGLE_MAPS_API_KEY"],
           !key.isEmpty {
            return key
        }

        // Fallback to bundled key (restricted to app bundle IDs only)
        // This key should be restricted in Google Cloud Console to only work with the app's bundle IDs
        #if DEBUG
        // For development, use the debug key
        return debugAPIKey
        #else
        // For production, this will crash if no key is configured - intentional for security
        fatalError("GOOGLE_MAPS_API_KEY must be set in Info.plist for production builds")
        #endif
    }

    /// Debug API key - only used during development
    /// This is restricted to specific bundle IDs in Google Cloud Console
    private static let debugAPIKey = "AIzaSyDuoM1JHPbHWCg-p8mLHjT3K2-TAR66boM"

    /// Current API key to use (convenience accessor)
    public static var currentKey: String {
        return apiKey
    }

    /// Validate that the API key is properly configured
    public static func validateConfiguration() -> Bool {
        let key = apiKey
        // Check for placeholder or empty values
        if key.isEmpty || key.starts(with: "$(") || key == "YOUR_API_KEY_HERE" {
            #if DEBUG
            print("[GoogleMapsConfig] WARNING: API key not properly configured")
            #endif
            return false
        }
        return true
    }
}
