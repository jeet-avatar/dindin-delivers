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
    /// Make sure to restrict this key in Google Cloud Console:
    /// - Application restrictions: iOS apps
    /// - Bundle IDs: com.eatfair.customer.Customer, com.eatfair.restaurant.eatffairrestaurant, com.eatfair.delivery
    /// - API restrictions: Maps SDK for iOS, Places API, Directions API, Geocoding API
    public static let apiKey = "AIzaSyDuoM1JHPbHWCg-p8mLHjT3K2-TAR66boM"

    /// Production API Key (use a different key with appropriate restrictions)
    #if DEBUG
    public static let currentKey = apiKey
    #else
    public static let currentKey = apiKey // Replace with production key
    #endif
}
