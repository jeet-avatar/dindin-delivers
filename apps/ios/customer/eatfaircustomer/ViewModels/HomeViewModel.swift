import SwiftUI
import Combine
import FirebaseFirestore
import FirebaseAuth
import EatFairShared
import CoreLocation

class HomeViewModel: ObservableObject {
    @Published var restaurants: [Restaurant] = []
    @Published var isLoading: Bool = false
    @Published var hasActiveOrder: Bool = false
    @Published var activeOrder: Order?
    @Published var errorMessage: String?

    private var db = Firestore.firestore()
    private var orderListener: ListenerRegistration?

    // Featured restaurants (top rated)
    var featuredRestaurants: [Restaurant] {
        restaurants
            .sorted { $0.rating > $1.rating }
            .prefix(5)
            .map { $0 }
    }

    // MARK: - Fetch Restaurants
    func fetchRestaurants() {
        isLoading = true
        errorMessage = nil

        db.collection("restaurants")
            .order(by: "rating", descending: true)
            .addSnapshotListener { [weak self] snapshot, error in
                DispatchQueue.main.async {
                    self?.isLoading = false

                    if let error = error {
                        self?.errorMessage = "Failed to load restaurants: \(error.localizedDescription)"
                        print("Error fetching restaurants: \(error)")
                        return
                    }

                    guard let documents = snapshot?.documents else {
                        self?.restaurants = []
                        return
                    }

                    self?.restaurants = documents.compactMap { doc -> Restaurant? in
                        try? doc.data(as: Restaurant.self)
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
                    if let error = error {
                        print("Error checking active orders: \(error)")
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
        guard !query.isEmpty else { return restaurants }

        return restaurants.filter {
            $0.name.localizedCaseInsensitiveContains(query) ||
            $0.cuisine.localizedCaseInsensitiveContains(query)
        }
    }

    // MARK: - Filter by Cuisine
    func filterByCuisine(_ cuisine: String?) -> [Restaurant] {
        guard let cuisine = cuisine else { return restaurants }

        return restaurants.filter {
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
            return restaurants.sorted { $0.rating > $1.rating }

        case .rating:
            return restaurants.sorted { $0.rating > $1.rating }

        case .deliveryTime:
            return restaurants.sorted {
                let time1 = Int($0.deliveryTime.components(separatedBy: "-").first ?? "99") ?? 99
                let time2 = Int($1.deliveryTime.components(separatedBy: "-").first ?? "99") ?? 99
                return time1 < time2
            }

        case .distance:
            guard let userLocation = userLocation else { return restaurants }
            return restaurants.sorted {
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
