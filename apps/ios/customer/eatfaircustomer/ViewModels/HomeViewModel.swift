import SwiftUI
import Combine
import FirebaseFirestore
import FirebaseAuth
import EatFairShared
import CoreLocation
import os.log

private let logger = Logger(subsystem: "com.dollor.customer", category: "HomeViewModel")

class HomeViewModel: ObservableObject {
    @Published var restaurants: [Restaurant] = []
    @Published var p2pRestaurants: [P2PRestaurant] = [] // New P2P backend restaurants
    @Published var isLoading: Bool = false
    @Published var hasActiveOrder: Bool = false
    @Published var activeOrder: Order?
    @Published var errorMessage: String?

    private var db = Firestore.firestore()
    private var orderListener: ListenerRegistration?
    private let p2pAPI = P2PAPIService.shared

    // Featured restaurants (top rated) - combines both sources
    var featuredRestaurants: [Restaurant] {
        let allRestaurants = restaurants + p2pRestaurants.map { $0.toRestaurant() }
        return allRestaurants
            .sorted { $0.rating > $1.rating }
            .prefix(5)
            .map { $0 }
    }

    // All restaurants combined from Firebase + P2P backend
    var allRestaurants: [Restaurant] {
        restaurants + p2pRestaurants.map { $0.toRestaurant() }
    }

    // Dynamic cuisine categories from restaurant data
    var availableCuisines: [(emoji: String, name: String)] {
        // Map cuisine names to emojis
        let emojiMap: [String: String] = [
            "Indian": "🍛",
            "Italian": "🍕",
            "Chinese": "🥡",
            "Japanese": "🍣",
            "Mexican": "🌮",
            "Thai": "🍜",
            "American": "🍔",
            "Mediterranean": "🥗",
            "Korean": "🍲",
            "Vietnamese": "🍜",
            "French": "🥐",
            "Greek": "🥙",
            "Spanish": "🥘",
            "Middle Eastern": "🧆",
            "Caribbean": "🥥",
            "Ethiopian": "🍲",
            "Pizza": "🍕",
            "Burgers": "🍔",
            "Sushi": "🍣",
            "Healthy": "🥗",
            "Cafe": "☕",
            "Dessert": "🍰",
            "Bakery": "🥖",
            "Fast Food": "🍟",
            "Seafood": "🦐",
            "BBQ": "🍖",
            "Vegan": "🥬",
            "Vegetarian": "🥕"
        ]

        // Get unique cuisines from P2P restaurants
        var cuisineSet = Set<String>()
        for restaurant in p2pRestaurants {
            if let cuisine = restaurant.cuisineType, !cuisine.isEmpty {
                cuisineSet.insert(cuisine)
            }
        }
        // Also add from Firebase restaurants
        for restaurant in restaurants {
            if !restaurant.cuisine.isEmpty {
                cuisineSet.insert(restaurant.cuisine)
            }
        }

        // Convert to array with emojis
        return cuisineSet.sorted().map { cuisine in
            let emoji = emojiMap[cuisine] ?? "🍽️"
            return (emoji: emoji, name: cuisine)
        }
    }

    // MARK: - Fetch Restaurants (P2P Backend - Primary)
    func fetchRestaurants() {
        isLoading = true
        errorMessage = nil
        logger.info("🔄 fetchRestaurants() called - starting P2P fetch")

        // Fetch from P2P backend first (primary source)
        p2pAPI.fetchRestaurants { [weak self] result in
            DispatchQueue.main.async {
                switch result {
                case .success(let p2pRestaurants):
                    self?.p2pRestaurants = p2pRestaurants
                    self?.isLoading = false  // Stop loading once P2P succeeds
                    logger.info("✅ Loaded \(p2pRestaurants.count) restaurants from P2P backend")

                    // Debug: Print image URLs for each restaurant
                    for restaurant in p2pRestaurants {
                        let converted = restaurant.toRestaurant()
                        logger.info("🖼️ \(restaurant.name): imageUrl=\(converted.imageUrl)")
                    }
                case .failure(let error):
                    logger.error("❌ P2P API error: \(error.localizedDescription)")
                    self?.errorMessage = "Network error: \(error.localizedDescription)"
                    self?.isLoading = false
                }
            }
        }
    }

    // MARK: - Check Active Orders
    func checkActiveOrders() {
        guard let userId = Auth.auth().currentUser?.uid else {
            hasActiveOrder = false
            return
        }

        // Listen for active orders
        orderListener = db.collection("orders")
            .whereField("customerId", isEqualTo: userId)
            .whereField("status", in: ["Placed", "Accepted", "Preparing", "Ready", "PickedUp", "OnTheWay"])
            .order(by: "placedAt", descending: true)
            .limit(to: 1)
            .addSnapshotListener { [weak self] snapshot, error in
                DispatchQueue.main.async {
                    if let _ = error {
                        self?.hasActiveOrder = false
                        return
                    }

                    if let document = snapshot?.documents.first,
                       let order = try? document.data(as: Order.self) {
                        self?.activeOrder = order
                        self?.hasActiveOrder = true
                    } else {
                        self?.activeOrder = nil
                        self?.hasActiveOrder = false
                    }
                }
            }
    }

    // MARK: - Search Restaurants
    func searchRestaurants(query: String) -> [Restaurant] {
        guard !query.isEmpty else { return allRestaurants }

        return allRestaurants.filter {
            $0.name.localizedCaseInsensitiveContains(query) ||
            $0.cuisine.localizedCaseInsensitiveContains(query)
        }
    }

    // MARK: - Filter by Cuisine
    func filterByCuisine(_ cuisine: String?) -> [Restaurant] {
        guard let cuisine = cuisine else { return allRestaurants }

        return allRestaurants.filter {
            $0.cuisine.localizedCaseInsensitiveContains(cuisine)
        }
    }

    // MARK: - Sort Restaurants
    enum SortOption {
        case recommended
        case rating
        case deliveryTime
        case distance
    }

    func sortedRestaurants(by option: SortOption, userLocation: CLLocation? = nil) -> [Restaurant] {
        switch option {
        case .recommended:
            // AI-based recommendation would go here
            // For now, mix of rating and other factors
            return allRestaurants.sorted { $0.rating > $1.rating }

        case .rating:
            return allRestaurants.sorted { $0.rating > $1.rating }

        case .deliveryTime:
            return allRestaurants.sorted {
                let time1 = Int($0.deliveryTime.components(separatedBy: "-").first ?? "99") ?? 99
                let time2 = Int($1.deliveryTime.components(separatedBy: "-").first ?? "99") ?? 99
                return time1 < time2
            }

        case .distance:
            guard let userLocation = userLocation else { return allRestaurants }
            return allRestaurants.sorted {
                let loc1 = CLLocation(latitude: $0.latitude, longitude: $0.longitude)
                let loc2 = CLLocation(latitude: $1.latitude, longitude: $1.longitude)
                return userLocation.distance(from: loc1) < userLocation.distance(from: loc2)
            }
        }
    }

    // MARK: - Cleanup
    deinit {
        orderListener?.remove()
    }
}
