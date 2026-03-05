import os

private let logger = Logger(subsystem: "com.dollorai.customer", category: "MultiRestaurantCartViewModel")

import SwiftUI
import FirebaseAuth
import Combine
import EatFairShared

/// Cart item with restaurant information for multi-restaurant orders
struct CartItem: Identifiable, Codable {
    var id: String
    var restaurantId: String
    var restaurantName: String
    var menuItemId: String
    var name: String
    var description: String
    var price: Double
    var quantity: Int
    var options: [String]?
    var imageUrl: String?
    var spiceLevel: String?
    var customizations: [SelectedCustomization]?
    var additionalPrice: Double

    init(id: String = UUID().uuidString, restaurantId: String, restaurantName: String, menuItemId: String, name: String, description: String = "", price: Double, quantity: Int = 1, options: [String]? = nil, imageUrl: String? = nil, spiceLevel: String? = nil, customizations: [SelectedCustomization]? = nil, additionalPrice: Double = 0) {
        self.id = id
        self.restaurantId = restaurantId
        self.restaurantName = restaurantName
        self.menuItemId = menuItemId
        self.name = name
        self.description = description
        self.price = price
        self.quantity = quantity
        self.options = options
        self.imageUrl = imageUrl
        self.spiceLevel = spiceLevel
        self.customizations = customizations
        self.additionalPrice = additionalPrice
    }

    /// Total price including customizations
    var totalPrice: Double {
        price + additionalPrice
    }

    /// Summary of selected customizations
    var customizationSummary: String? {
        guard let customizations = customizations, !customizations.isEmpty else { return nil }
        return customizations.flatMap { $0.selectedOptions }.joined(separator: ", ")
    }
}

/// Multi-Restaurant Cart ViewModel
/// Supports ordering from up to 3 restaurants in a single checkout
class MultiRestaurantCartViewModel: ObservableObject {
    // MARK: - Configuration (from AppConfig)
    private var config: AppConfig { AppConfig.shared }

    var maxRestaurants: Int { config.maxRestaurantsPerOrder }
    var platformFeePerRestaurant: Double { config.platformFeePerRestaurant }
    var baseDeliveryFee: Double { config.baseDeliveryFee }
    var extraStopFee: Double { config.extraStopFee }
    var taxRate: Double { config.taxRate }

    // MARK: - Published Properties
    @Published var items: [CartItem] = []
    @Published var restaurants: [String: Restaurant] = [:] // restaurantId -> Restaurant
    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var showError = false
    @Published var orderPlaced = false // Triggers success view at app level

    // MARK: - Last Order Info (for success screen and actions)
    @Published var lastOrderId: Int?              // Backend order ID (for API calls) - first order for single, primary for multi
    @Published var lastOrderNumber: String?       // Display order number (e.g., "EF-20260129-001") - first/combined
    @Published var lastOrderTotal: Double?
    @Published var lastOrderRestaurantName: String?
    @Published var lastOrderItemCount: Int?
    @Published var lastOrderDeliveryAddress: String?
    @Published var lastOrderItems: [CartItem] = []  // Ordered items (saved before cart clear)
    @Published var lastOrderPromoName: String?      // Promo name (e.g., "Buy One Get One Free")

    // Multi-restaurant order tracking
    @Published var lastOrderIds: [Int] = []           // All order IDs (one per restaurant)
    @Published var lastOrderNumbers: [String] = []    // All order numbers (one per restaurant)
    @Published var lastOrderRestaurantNames: [String] = []  // Restaurant names for each order

    /// Clear last order info (call when user dismisses success screen)
    func clearLastOrder() {
        lastOrderId = nil
        lastOrderNumber = nil
        lastOrderTotal = nil
        lastOrderRestaurantName = nil
        lastOrderItemCount = nil
        lastOrderDeliveryAddress = nil
        lastOrderItems = []
        lastOrderPromoName = nil
        lastOrderIds = []
        lastOrderNumbers = []
        lastOrderRestaurantNames = []
    }

    // MARK: - Computed Properties

    /// Number of unique restaurants in cart
    var restaurantCount: Int {
        restaurants.count
    }

    /// Whether more restaurants can be added (max 3)
    var canAddMoreRestaurants: Bool {
        restaurantCount < maxRestaurants
    }

    /// Check if a specific restaurant is in the cart
    func hasRestaurant(_ restaurantId: String) -> Bool {
        restaurants[restaurantId] != nil
    }

    /// Total item count across all restaurants
    var totalItemCount: Int {
        items.reduce(0) { $0 + $1.quantity }
    }

    /// Items grouped by restaurant
    var itemsByRestaurant: [String: [CartItem]] {
        Dictionary(grouping: items) { $0.restaurantId }
    }

    /// Ordered list of restaurants for display
    var orderedRestaurants: [Restaurant] {
        // Order by when they were added (using items order)
        var seen = Set<String>()
        var result: [Restaurant] = []
        for item in items {
            if !seen.contains(item.restaurantId), let restaurant = restaurants[item.restaurantId] {
                seen.insert(item.restaurantId)
                result.append(restaurant)
            }
        }
        return result
    }

    // MARK: - Pricing

    /// Subtotal (food + customizations)
    var subtotal: Double {
        items.reduce(0) { $0 + ($1.totalPrice * Double($1.quantity)) }
    }

    /// Platform fee: $1 per restaurant (max $3)
    var platformFee: Double {
        Double(restaurantCount) * platformFeePerRestaurant
    }

    /// Delivery fee: Base $5 + $2 per extra restaurant
    var deliveryFee: Double {
        baseDeliveryFee + Double(max(0, restaurantCount - 1)) * extraStopFee
    }

    /// Driver bonus for multi-stop (shown to customer as incentive info)
    var driverBonus: Double {
        restaurantCount > 1 ? Double(restaurantCount - 1) * extraStopFee : 0.0
    }

    /// Tax (10% of subtotal)
    var tax: Double {
        subtotal * taxRate
    }

    /// Suggested tip (20% for multi-restaurant, 15% for single)
    var suggestedTip: Double {
        subtotal * (restaurantCount > 1 ? 0.20 : 0.15)
    }

    /// Suggested tip percentages
    var tipPercentages: [Double] {
        restaurantCount > 1 ? [15, 20, 25, 30] : [10, 15, 20, 25]
    }

    /// Total before tip
    var totalBeforeTip: Double {
        subtotal + platformFee + deliveryFee + tax
    }

    /// Calculate total with given tip
    func total(withTip tip: Double) -> Double {
        totalBeforeTip + tip
    }

    /// Subtotal for a specific restaurant
    func subtotal(for restaurantId: String) -> Double {
        items.filter { $0.restaurantId == restaurantId }
            .reduce(0) { $0 + ($1.price * Double($1.quantity)) }
    }

    /// Item count for a specific restaurant
    func itemCount(for restaurantId: String) -> Int {
        items.filter { $0.restaurantId == restaurantId }
            .reduce(0) { $0 + $1.quantity }
    }

    // MARK: - Cart Operations

    /// Add item to cart from a restaurant
    /// Returns false if max restaurants reached and this is a new restaurant
    @discardableResult
    func addToCart(item: MenuItem, from restaurant: Restaurant) -> Bool {
        let restaurantId = restaurant.id ?? ""

        // Check if we can add from this restaurant
        if !hasRestaurant(restaurantId) && !canAddMoreRestaurants {
            errorMessage = "Maximum \(maxRestaurants) restaurants allowed. Remove items from another restaurant first."
            showError = true
            return false
        }

        // Add restaurant if not already in cart
        if !hasRestaurant(restaurantId) {
            restaurants[restaurantId] = restaurant
        }

        // Generate a unique ID for items with customizations (so same item with different customizations are separate)
        let customizationKey = item.selectedCustomizations?.map { $0.selectedOptions.joined() }.joined() ?? ""
        let spiceKey = item.selectedSpiceLevel ?? ""
        _ = "\(item.id ?? "")-\(customizationKey)-\(spiceKey)"

        // Check if item with same customizations already exists
        if let existingIndex = items.firstIndex(where: {
            $0.menuItemId == (item.id ?? "") &&
            $0.restaurantId == restaurantId &&
            $0.spiceLevel == item.selectedSpiceLevel &&
            $0.customizationSummary == item.customizationSummary
        }) {
            // Increment quantity
            items[existingIndex].quantity += 1
        } else {
            // Add new item with customization data
            let cartItem = CartItem(
                restaurantId: restaurantId,
                restaurantName: restaurant.name,
                menuItemId: item.id ?? UUID().uuidString,
                name: item.name,
                description: item.description,
                price: item.price,
                quantity: 1,
                imageUrl: item.imageUrl,
                spiceLevel: item.selectedSpiceLevel,
                customizations: item.selectedCustomizations,
                additionalPrice: item.totalCustomizationPrice
            )
            items.append(cartItem)
        }

        return true
    }

    /// Update quantity for an item
    func updateQuantity(for itemId: String, quantity: Int) {
        guard let index = items.firstIndex(where: { $0.id == itemId }) else { return }

        if quantity <= 0 {
            removeItem(at: index)
        } else {
            items[index].quantity = quantity
        }
    }

    /// Remove item at index
    func removeItem(at index: Int) {
        guard index >= 0 && index < items.count else { return }

        let restaurantId = items[index].restaurantId
        items.remove(at: index)

        // Remove restaurant if no more items from it
        if !items.contains(where: { $0.restaurantId == restaurantId }) {
            restaurants.removeValue(forKey: restaurantId)
        }
    }

    /// Remove item by ID
    func removeItem(withId itemId: String) {
        guard let index = items.firstIndex(where: { $0.id == itemId }) else { return }
        removeItem(at: index)
    }

    /// Remove all items from a specific restaurant
    func removeRestaurant(_ restaurantId: String) {
        items.removeAll { $0.restaurantId == restaurantId }
        restaurants.removeValue(forKey: restaurantId)
    }

    /// Clear entire cart
    func clearCart() {
        items.removeAll()
        restaurants.removeAll()
    }

    // MARK: - Order Placement

    /// Place order (supports both single and multi-restaurant)
    func placeOrder(
        deliveryAddress: DeliveryAddress,
        deliveryInstructions: String = "",
        tip: Double,
        tipPercentage: Double? = nil,
        preferredDriverId: String? = nil,
        scheduledFor: Date? = nil,
        promoCode: String? = nil,
        completion: @escaping (Result<String, Error>) -> Void
    ) {
        // Try P2P customer data first, then fall back to Firebase Auth
        let customerId: String
        let customerName: String
        let customerPhone: String?
        let customerEmail: String

        // Check P2P customer data first
        let p2pCustomerId = UserDefaults.standard.integer(forKey: "p2p_customer_id")
        let p2pCustomerName = UserDefaults.standard.string(forKey: "p2p_customer_name")
        let p2pCustomerEmail = UserDefaults.standard.string(forKey: "p2p_customer_email")

        if p2pCustomerId > 0 {
            // Use P2P customer data
            customerId = String(p2pCustomerId)
            customerName = p2pCustomerName ?? "Customer"
            customerPhone = nil
            customerEmail = p2pCustomerEmail ?? ""
        } else if let user = Auth.auth().currentUser {
            // Fallback to Firebase Auth
            customerId = user.uid
            customerName = user.displayName ?? "Customer"
            customerPhone = user.phoneNumber
            customerEmail = user.email ?? ""
        } else {
            completion(.failure(NSError(domain: "Cart", code: 401, userInfo: [NSLocalizedDescriptionKey: "User not logged in"])))
            return
        }

        guard !items.isEmpty else {
            completion(.failure(NSError(domain: "Cart", code: 400, userInfo: [NSLocalizedDescriptionKey: "Cart is empty"])))
            return
        }

        isLoading = true

        // Build restaurant info array - filter out restaurants with missing IDs to prevent silent failures
        let validRestaurants = orderedRestaurants.filter { $0.id != nil && !$0.id!.isEmpty }
        guard validRestaurants.count == orderedRestaurants.count else {
            isLoading = false
            completion(.failure(NSError(domain: "Cart", code: 400, userInfo: [NSLocalizedDescriptionKey: "Some restaurants have invalid IDs. Please remove and re-add them."])))
            return
        }

        let restaurantInfos = validRestaurants.map { restaurant in
            RestaurantInfo(
                id: restaurant.id!, // Safe - validated above
                name: restaurant.name,
                address: restaurant.address,
                latitude: restaurant.latitude,
                longitude: restaurant.longitude,
                imageUrl: restaurant.imageUrl
            )
        }

        // Build items by restaurant
        var orderItemsByRestaurant: [String: [OrderItem]] = [:]
        for (restaurantId, cartItems) in itemsByRestaurant {
            orderItemsByRestaurant[restaurantId] = cartItems.map { item in
                OrderItem(
                    menuItemId: item.menuItemId,
                    name: item.name,
                    price: item.price,
                    quantity: item.quantity,
                    options: item.options,
                    restaurantId: item.restaurantId,
                    restaurantName: item.restaurantName
                )
            }
        }

        // Create multi-restaurant order
        var order = MultiRestaurantOrder(
            customerId: customerId,
            customerName: customerName,
            customerPhone: customerPhone,
            customerEmail: customerEmail,
            deliveryAddress: deliveryAddress,
            deliveryInstructions: deliveryInstructions,
            restaurants: restaurantInfos,
            itemsByRestaurant: orderItemsByRestaurant,
            tip: tip,
            tipPercentage: tipPercentage,
            preferredDriverId: preferredDriverId
        )

        // Ensure pricing is calculated
        order.recalculatePricing()

        // STEP 1: Create orders in P2P backend - one per restaurant
        // This ensures each restaurant receives their specific order
        let p2pService = P2PAPIService.shared

        // Build delivery address for P2P (including coordinates for driver navigation)
        let addressDict: [String: Any] = [
            "street": deliveryAddress.street,
            "city": deliveryAddress.city,
            "state": deliveryAddress.state,
            "zip": deliveryAddress.zipCode,
            "latitude": deliveryAddress.latitude,
            "longitude": deliveryAddress.longitude
        ]

        // Calculate total subtotal for tip splitting
        let totalSubtotal = subtotal

        // Track results from all restaurant orders
        var completedOrders: [(orderId: Int, orderNumber: String, total: Double, restaurantName: String)] = []
        var failedOrders: [String] = []
        let orderGroup = DispatchGroup()

        #if DEBUG
        logger.info("[OrderFlow] Creating orders for \(self.orderedRestaurants.count) restaurant(s)...")
        #endif

        // Create a separate order for each restaurant
        for restaurant in orderedRestaurants {
            guard let vendorIdStr = restaurant.id,
                  let vendorId = Int(vendorIdStr) else {
                #if DEBUG
                logger.info("[OrderFlow] ⚠️ Skipping restaurant with invalid ID: \(restaurant.name)")
                #endif
                failedOrders.append(restaurant.name)
                continue
            }

            // Get items for this restaurant only
            let restaurantItems = items.filter { $0.restaurantId == vendorIdStr }
            guard !restaurantItems.isEmpty else {
                #if DEBUG
                logger.info("[OrderFlow] ⚠️ No items for restaurant: \(restaurant.name)")
                #endif
                continue
            }

            // Convert items to P2P format
            let p2pItems: [[String: Any]] = restaurantItems.map { item in
                [
                    "menu_item_id": Int(item.menuItemId) ?? 0,
                    "name": item.name,
                    "price": item.price,
                    "quantity": item.quantity
                ]
            }

            // Calculate proportional tip for this restaurant
            let restaurantSubtotal = restaurantItems.reduce(0) { $0 + ($1.totalPrice * Double($1.quantity)) }
            let tipProportion = totalSubtotal > 0 ? restaurantSubtotal / totalSubtotal : 1.0
            let restaurantTip = tip * tipProportion

            #if DEBUG
            logger.info("[OrderFlow] Creating order for \(restaurant.name) (vendor \(vendorId))")
            logger.info("[OrderFlow]   Items: \(restaurantItems.count), Subtotal: $\(restaurantSubtotal), Tip: $\(restaurantTip)")
            #endif

            orderGroup.enter()

            p2pService.createOrder(
                vendorId: vendorId,
                customerName: customerName,
                customerEmail: customerEmail,
                customerPhone: customerPhone ?? "",
                deliveryAddress: addressDict,
                deliveryInstructions: deliveryInstructions,
                items: p2pItems,
                tip: restaurantTip,
                scheduledFor: scheduledFor,
                promoCode: promoCode
            ) { [weak self] result in
                switch result {
                case .success(let p2pResponse):
                    #if DEBUG
                    logger.info("[OrderFlow] ✅ Order created for \(restaurant.name): \(p2pResponse.orderNumber)")
                    #endif

                    // Send order to restaurant (with retry logic)
                    self?.sendOrderToRestaurantWithRetry(
                        p2pService: p2pService,
                        orderId: p2pResponse.orderId,
                        maxRetries: 3,
                        currentAttempt: 1
                    )

                    DispatchQueue.main.async {
                        completedOrders.append((
                            orderId: p2pResponse.orderId,
                            orderNumber: p2pResponse.orderNumber,
                            total: p2pResponse.total,
                            restaurantName: restaurant.name
                        ))
                        orderGroup.leave()
                    }

                case .failure(let error):
                    #if DEBUG
                    logger.info("[OrderFlow] ❌ Order failed for \(restaurant.name): \(error.localizedDescription)")
                    #endif
                    DispatchQueue.main.async {
                        // Check for specific error types
                        if let apiError = error as? P2PAPIError {
                            switch apiError {
                            case .priceChanged(let message, let changes):
                                // Build detailed price change message
                                var detail = "\(restaurant.name): \(message)\n"
                                for change in changes {
                                    if let name = change["item"] as? String,
                                       let expected = change["expected_price"] as? Double,
                                       let current = change["current_price"] as? Double {
                                        detail += "  \(name): $\(String(format: "%.2f", expected)) -> $\(String(format: "%.2f", current))\n"
                                    }
                                }
                                failedOrders.append(detail)
                            case .vendorOffline:
                                failedOrders.append("\(restaurant.name): Restaurant is currently closed")
                            default:
                                failedOrders.append(restaurant.name)
                            }
                        } else {
                            failedOrders.append(restaurant.name)
                        }
                        orderGroup.leave()
                    }
                }
            }
        }

        // Wait for all orders to complete
        orderGroup.notify(queue: .main) { [weak self] in
            guard let self = self else { return }

            self.isLoading = false

            // Check if any orders succeeded
            if completedOrders.isEmpty {
                self.errorMessage = "Failed to place order. Please try again."
                self.showError = true
                completion(.failure(NSError(domain: "Cart", code: 500, userInfo: [NSLocalizedDescriptionKey: "All orders failed"])))
                return
            }

            // Save order info for success screen BEFORE clearing cart
            self.lastOrderIds = completedOrders.map { $0.orderId }
            self.lastOrderNumbers = completedOrders.map { $0.orderNumber }
            self.lastOrderRestaurantNames = completedOrders.map { $0.restaurantName }

            // Use first order as primary for backward compatibility
            self.lastOrderId = completedOrders.first?.orderId
            self.lastOrderNumber = completedOrders.count == 1
                ? completedOrders.first?.orderNumber
                : completedOrders.map { $0.orderNumber }.joined(separator: ", ")
            self.lastOrderTotal = completedOrders.reduce(0) { $0 + $1.total }
            self.lastOrderRestaurantName = completedOrders.count == 1
                ? completedOrders.first?.restaurantName
                : "\(completedOrders.count) restaurants"
            self.lastOrderItemCount = self.totalItemCount
            self.lastOrderDeliveryAddress = deliveryAddress.fullAddress
            self.lastOrderItems = self.items  // Save items before clearing

            #if DEBUG
            logger.info("[OrderFlow] ✅ All orders completed: \(completedOrders.count) succeeded, \(failedOrders.count) failed")
            logger.info("[OrderFlow] Order numbers: \(self.lastOrderNumbers)")
            logger.info("[OrderFlow] Total: $\(self.lastOrderTotal ?? 0)")
            #endif

            // Show warning if some orders failed
            if !failedOrders.isEmpty {
                self.errorMessage = "Order placed for some restaurants. Failed: \(failedOrders.joined(separator: ", "))"
                self.showError = true
            }

            self.clearCart()
            completion(.success(self.lastOrderNumber ?? ""))
        }
    }

    // MARK: - Restaurant Notification (with Retry)

    /// Send order to restaurant with automatic retry on failure
    /// - Parameters:
    ///   - p2pService: The P2P API service
    ///   - orderId: The order ID to confirm
    ///   - maxRetries: Maximum number of retry attempts (default: 3)
    ///   - currentAttempt: Current attempt number (starts at 1)
    private func sendOrderToRestaurantWithRetry(
        p2pService: P2PAPIService,
        orderId: Int,
        maxRetries: Int = 3,
        currentAttempt: Int = 1
    ) {
        p2pService.confirmOrderPayment(orderId: orderId) { [weak self] result in
            switch result {
            case .success:
                #if DEBUG
                logger.info("[OrderFlow] ✅ Order sent to restaurant successfully (attempt \(currentAttempt))")
                #endif

            case .failure(let error):
                #if DEBUG
                logger.info("[OrderFlow] ⚠️ Failed to send order to restaurant (attempt \(currentAttempt)/\(maxRetries)): \(error.localizedDescription)")
                #endif

                // Retry if we haven't exhausted all attempts
                if currentAttempt < maxRetries {
                    // Exponential backoff: 2s, 4s, 8s...
                    let delay = Double(pow(2.0, Double(currentAttempt)))
                    #if DEBUG
                    logger.info("[OrderFlow] Retrying in \(delay) seconds...")
                    #endif

                    DispatchQueue.main.asyncAfter(deadline: .now() + delay) { [weak self] in
                        self?.sendOrderToRestaurantWithRetry(
                            p2pService: p2pService,
                            orderId: orderId,
                            maxRetries: maxRetries,
                            currentAttempt: currentAttempt + 1
                        )
                    }
                } else {
                    #if DEBUG
                    logger.info("[OrderFlow] ❌ All retry attempts exhausted. Order \(orderId) may not have reached restaurant.")
                    logger.info("[OrderFlow] The backend should have a fallback mechanism to detect unconfirmed orders.")
                    #endif
                }
            }
        }
    }

    // MARK: - Cleanup

    deinit {
        // Clean up any resources if needed
    }

    // MARK: - Persistence (Optional)

    private let cartKey = "multiRestaurantCart"

    /// Save cart to UserDefaults
    func saveCart() {
        let encoder = JSONEncoder()
        if let itemsData = try? encoder.encode(items),
           let restaurantsData = try? encoder.encode(Array(restaurants.values)) {
            UserDefaults.standard.set(itemsData, forKey: "\(cartKey)_items")
            UserDefaults.standard.set(restaurantsData, forKey: "\(cartKey)_restaurants")
        }
    }

    /// Load cart from UserDefaults
    func loadCart() {
        let decoder = JSONDecoder()

        if let itemsData = UserDefaults.standard.data(forKey: "\(cartKey)_items"),
           let loadedItems = try? decoder.decode([CartItem].self, from: itemsData) {
            self.items = loadedItems
        }

        if let restaurantsData = UserDefaults.standard.data(forKey: "\(cartKey)_restaurants"),
           let loadedRestaurants = try? decoder.decode([Restaurant].self, from: restaurantsData) {
            self.restaurants = Dictionary(uniqueKeysWithValues: loadedRestaurants.compactMap { r in
                guard let id = r.id else { return nil }
                return (id, r)
            })
        }
    }
}

// MARK: - Preview Helpers
#if DEBUG
extension MultiRestaurantCartViewModel {
    static var preview: MultiRestaurantCartViewModel {
        let vm = MultiRestaurantCartViewModel()

        // Add sample restaurants and items
        let restaurant1 = Restaurant(
            id: "r1",
            name: "Pizza Palace",
            cuisine: "Italian",
            rating: 4.5,
            deliveryTime: "25-35",
            imageUrl: "",
            address: "123 Main St",
            latitude: 37.7749,
            longitude: -122.4194,
            phone: "555-1234"
        )

        let restaurant2 = Restaurant(
            id: "r2",
            name: "Sushi Express",
            cuisine: "Japanese",
            rating: 4.8,
            deliveryTime: "30-40",
            imageUrl: "",
            address: "456 Oak Ave",
            latitude: 37.7850,
            longitude: -122.4094,
            phone: "555-5678"
        )

        vm.restaurants["r1"] = restaurant1
        vm.restaurants["r2"] = restaurant2

        vm.items = [
            CartItem(restaurantId: "r1", restaurantName: "Pizza Palace", menuItemId: "p1", name: "Margherita Pizza", price: 18.99),
            CartItem(restaurantId: "r1", restaurantName: "Pizza Palace", menuItemId: "p2", name: "Garlic Bread", price: 6.99),
            CartItem(restaurantId: "r2", restaurantName: "Sushi Express", menuItemId: "s1", name: "Dragon Roll", price: 16.99),
        ]

        return vm
    }
}
#endif
