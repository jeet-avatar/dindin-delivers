import os

private let logger = Logger(subsystem: "com.dollorai.customer", category: "MainAppView")

import SwiftUI
import Combine
import EatFairShared

struct MainAppView: View {
    @StateObject private var authViewModel = AuthViewModel()
    @EnvironmentObject var multiCartViewModel: MultiRestaurantCartViewModel
    @EnvironmentObject var addressViewModel: AddressViewModel

    @State private var selectedTab = 0
    @State private var showCartSheet = false

    // Notification handling states
    @State private var showCancellationAlert = false
    @State private var cancellationAlertTitle = ""
    @State private var cancellationAlertMessage = ""
    @State private var navigateToOrderId: String?

    // Order success screen state (separate from orderPlaced to avoid sheet/fullScreenCover race)
    @State private var showOrderSuccess = false

    var body: some View {
        Group {
            if authViewModel.isAuthenticated {
                // Main App Flow with Enhanced Navigation
                ZStack(alignment: .bottom) {
                    TabView(selection: $selectedTab) {
                        NavigationStack {
                            HomeView()
                        }
                        .tabItem {
                            Label("Home", systemImage: "house.fill")
                        }
                        .tag(0)

                        NavigationStack {
                            SearchRestaurantsView()
                        }
                        .tabItem {
                            Label("Search", systemImage: "magnifyingglass")
                        }
                        .tag(1)

                        NavigationStack {
                            OrderHistoryView()
                        }
                        .tabItem {
                            Label("Orders", systemImage: "clock.fill")
                        }
                        .tag(2)

                        NavigationStack {
                            ProfileView()
                        }
                        .tabItem {
                            Label("Profile", systemImage: "person.fill")
                        }
                        .tag(3)
                    }
                    .accentColor(Theme.brandGreen)

                    // Floating Cart Button (always visible when cart has items)
                    if !multiCartViewModel.items.isEmpty && selectedTab != 1 {
                        floatingCartButton
                            .transition(.move(edge: .bottom).combined(with: .opacity))
                    }
                }
                .sheet(isPresented: $showCartSheet, onDismiss: {
                    // Cart sheet fully dismissed - check if we need to show success screen
                    #if DEBUG
                    logger.info("[OrderFlow] Cart sheet onDismiss called")
                    logger.info("[OrderFlow] orderPlaced = \(multiCartViewModel.orderPlaced)")
                    #endif
                    if multiCartViewModel.orderPlaced {
                        #if DEBUG
                        logger.info("[OrderFlow] Showing success screen after 0.3s delay")
                        #endif
                        // Use slight delay to ensure SwiftUI is ready for fullScreenCover
                        DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
                            showOrderSuccess = true
                            multiCartViewModel.orderPlaced = false
                            #if DEBUG
                            logger.info("[OrderFlow] ✅ showOrderSuccess = true")
                            #endif
                        }
                    }
                }) {
                    NavigationStack {
                        MultiRestaurantCartView(cartVM: multiCartViewModel)
                            .environmentObject(addressViewModel)
                    }
                }
                .fullScreenCover(isPresented: $showOrderSuccess) {
                    NavigationStack {
                        OrderSuccessView()
                            .environmentObject(multiCartViewModel)
                    }
                }
                .onChange(of: multiCartViewModel.orderPlaced) { _, newValue in
                    #if DEBUG
                    logger.info("[OrderFlow] onChange(orderPlaced) fired: \(newValue)")
                    #endif
                    if newValue {
                        #if DEBUG
                        logger.info("[OrderFlow] Will dismiss cart sheet after 0.5s (let checkout dismiss first)")
                        #endif
                        // Wait for checkout sheet to dismiss first, then dismiss cart
                        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
                            #if DEBUG
                            logger.info("[OrderFlow] Now setting showCartSheet = false")
                            #endif
                            showCartSheet = false
                        }
                    }
                }
                .onReceive(NotificationCenter.default.publisher(for: NSNotification.Name("NavigateToOrder"))) { notification in
                    // Handle navigation to order details
                    if let orderId = notification.userInfo?["orderId"] as? String {
                        navigateToOrderId = orderId
                        selectedTab = 3 // Switch to Orders tab
                    }
                }
                .onReceive(NotificationCenter.default.publisher(for: NSNotification.Name("OrderCancelled"))) { notification in
                    // Handle order cancellation alert
                    if let title = notification.userInfo?["title"] as? String,
                       let body = notification.userInfo?["body"] as? String {
                        cancellationAlertTitle = title.isEmpty ? "Order Cancelled" : title
                        cancellationAlertMessage = body.isEmpty ? "Your order has been cancelled by the restaurant. A refund will be processed if applicable." : body
                        showCancellationAlert = true
                        selectedTab = 3 // Switch to Orders tab
                    }
                }
                .onReceive(NotificationCenter.default.publisher(for: NSNotification.Name("NavigateToPromotions"))) { _ in
                    // Navigate to home tab (Hot Deals section is now on Home)
                    selectedTab = 0
                }
                .alert("Order Cancelled", isPresented: $showCancellationAlert) {
                    Button("View Orders") {
                        selectedTab = 3
                    }
                    Button("OK", role: .cancel) { }
                } message: {
                    Text(cancellationAlertMessage)
                }
                .environmentObject(authViewModel)
            } else {
                // Enhanced Auth Flow
                LoginView(authViewModel: authViewModel)
            }
        }
        .animation(.spring(response: 0.3), value: multiCartViewModel.items.count)
    }

    // MARK: - Floating Cart Button
    private var floatingCartButton: some View {
        Button(action: { showCartSheet = true }) {
            HStack(spacing: 12) {
                // Cart icon with badge
                ZStack(alignment: .topTrailing) {
                    Image(systemName: "cart.fill")
                        .font(.title3)

                    // Item count badge
                    Text("\(multiCartViewModel.totalItemCount)")
                        .font(.caption2)
                        .fontWeight(.bold)
                        .foregroundColor(.white)
                        .padding(4)
                        .background(Color.red)
                        .clipShape(Circle())
                        .offset(x: 8, y: -8)
                }

                VStack(alignment: .leading, spacing: 2) {
                    if multiCartViewModel.restaurantCount > 1 {
                        Text("\(multiCartViewModel.restaurantCount) Restaurants")
                            .font(.caption2)
                            .opacity(0.9)
                    }
                    Text("View Cart")
                        .font(.subheadline)
                        .fontWeight(.semibold)
                }

                Spacer()

                Text("$\(String(format: "%.2f", multiCartViewModel.subtotal))")
                    .font(.headline)
                    .fontWeight(.bold)

                Image(systemName: "chevron.right")
                    .font(.caption)
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
            .background(
                RoundedRectangle(cornerRadius: 16)
                    .fill(
                        LinearGradient(
                            colors: multiCartViewModel.restaurantCount > 1
                                ? [Color.orange, Color.red]
                                : [Theme.brandGreen, Theme.brandGreen.opacity(0.8)],
                            startPoint: .leading,
                            endPoint: .trailing
                        )
                    )
                    .shadow(color: .black.opacity(0.2), radius: 8, x: 0, y: 4)
            )
            .foregroundColor(.white)
        }
        .padding(.horizontal)
        .padding(.bottom, 90) // Above tab bar
    }
}

// MARK: - Search Restaurants View (New)
struct SearchRestaurantsView: View {
    @EnvironmentObject var multiCartViewModel: MultiRestaurantCartViewModel
    @State private var searchText = ""
    @State private var selectedCuisine: String?
    @State private var sortOption: SortOption = .recommended
    @StateObject private var viewModel = SearchViewModel()

    enum SortOption: String, CaseIterable {
        case recommended = "Recommended"
        case rating = "Top Rated"
        case deliveryTime = "Fastest"
        case distance = "Nearest"
    }

    let cuisineFilters = ["All", "Italian", "Indian", "Chinese", "Mexican", "Japanese", "Thai", "American", "Mediterranean"]

    var body: some View {
        VStack(spacing: 0) {
            // Search Bar
            HStack(spacing: 12) {
                Image(systemName: "magnifyingglass")
                    .foregroundColor(.gray)

                TextField("Search restaurants or dishes...", text: $searchText)
                    .textFieldStyle(.plain)
                    .autocorrectionDisabled()

                if !searchText.isEmpty {
                    Button(action: { searchText = "" }) {
                        Image(systemName: "xmark.circle.fill")
                            .foregroundColor(.gray)
                    }
                }
            }
            .padding()
            .background(Color(.systemGray6))
            .cornerRadius(12)
            .padding()

            // Cuisine Filter Chips
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    ForEach(cuisineFilters, id: \.self) { cuisine in
                        FilterChip(
                            title: cuisine,
                            isSelected: selectedCuisine == cuisine || (cuisine == "All" && selectedCuisine == nil),
                            action: {
                                selectedCuisine = cuisine == "All" ? nil : cuisine
                            }
                        )
                    }
                }
                .padding(.horizontal)
            }

            // Sort Options
            HStack {
                Text("Sort by:")
                    .font(.subheadline)
                    .foregroundColor(.secondary)

                Menu {
                    ForEach(SortOption.allCases, id: \.self) { option in
                        Button(action: { sortOption = option }) {
                            HStack {
                                Text(option.rawValue)
                                if sortOption == option {
                                    Image(systemName: "checkmark")
                                }
                            }
                        }
                    }
                } label: {
                    HStack(spacing: 4) {
                        Text(sortOption.rawValue)
                            .font(.subheadline)
                            .fontWeight(.medium)
                        Image(systemName: "chevron.down")
                            .font(.caption)
                    }
                    .foregroundColor(Theme.brandGreen)
                }

                Spacer()

            }
            .padding(.horizontal)
            .padding(.vertical, 8)

            Divider()

            // Results
            if viewModel.isLoading {
                Spacer()
                ProgressView("Searching...")
                Spacer()
            } else if viewModel.restaurants.isEmpty && !searchText.isEmpty {
                Spacer()
                VStack(spacing: 12) {
                    Image(systemName: "magnifyingglass")
                        .font(.system(size: 50))
                        .foregroundColor(.gray.opacity(0.5))
                    Text("No restaurants found")
                        .font(.headline)
                    Text("Try a different search term or filter")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
                Spacer()
            } else {
                ScrollView {
                    LazyVStack(spacing: 16) {
                        ForEach(viewModel.filteredRestaurants(searchText: searchText, cuisine: selectedCuisine, sortBy: sortOption)) { restaurant in
                            NavigationLink(destination: RestaurantDetailView(restaurant: restaurant)) {
                                RestaurantSearchCard(restaurant: restaurant)
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    .padding()
                }
            }
        }
        .navigationTitle("Search")
        .navigationBarTitleDisplayMode(.inline)
        .onAppear {
            viewModel.fetchRestaurants()
        }
    }
}

// MARK: - Filter Chip
struct FilterChip: View {
    let title: String
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(title)
                .font(.subheadline)
                .fontWeight(isSelected ? .semibold : .regular)
                .padding(.horizontal, 16)
                .padding(.vertical, 8)
                .background(isSelected ? Theme.brandGreen : Color(.systemGray6))
                .foregroundColor(isSelected ? .white : .primary)
                .cornerRadius(20)
        }
    }
}

// MARK: - Restaurant Search Card
struct RestaurantSearchCard: View {
    let restaurant: Restaurant

    var body: some View {
        HStack(spacing: 12) {
            // Restaurant Image
            RoundedRectangle(cornerRadius: 12)
                .fill(Color.gray.opacity(0.2))
                .frame(width: 80, height: 80)
                .overlay(
                    Image(systemName: "fork.knife")
                        .font(.title2)
                        .foregroundColor(.gray)
                )

            VStack(alignment: .leading, spacing: 4) {
                Text(restaurant.name)
                    .font(.headline)
                    .foregroundColor(.primary)

                Text(restaurant.cuisine)
                    .font(.subheadline)
                    .foregroundColor(.secondary)

                HStack(spacing: 8) {
                    HStack(spacing: 2) {
                        Image(systemName: "star.fill")
                            .foregroundColor(.orange)
                        Text(String(format: "%.1f", restaurant.rating))
                    }

                    Text("•")
                        .foregroundColor(.gray)

                    HStack(spacing: 2) {
                        Image(systemName: "clock")
                        Text("\(restaurant.deliveryTime) min")
                    }

                    Text("•")
                        .foregroundColor(.gray)

                    Text("$\(String(format: "%.0f", AppConfig.shared.platformFeePerRestaurant)) fee")
                        .foregroundColor(Theme.brandGreen)
                }
                .font(.caption)
                .foregroundColor(.gray)
            }

            Spacer()

            Image(systemName: "chevron.right")
                .foregroundColor(.gray)
                .font(.caption)
        }
        .padding()
        .background(Color.white)
        .cornerRadius(16)
        .shadow(color: .black.opacity(0.05), radius: 8, x: 0, y: 2)
    }
}

// MARK: - Search ViewModel
class SearchViewModel: ObservableObject {
    @Published var p2pRestaurants: [P2PRestaurant] = []
    @Published var isLoading = false

    private let p2pService = P2PAPIService.shared

    deinit {
        // Clean up any resources if needed
    }

    // Convert P2P restaurants to standard Restaurant type
    var restaurants: [Restaurant] {
        p2pRestaurants.map { $0.toRestaurant() }
    }

    func fetchRestaurants() {
        isLoading = true

        // Fetch from P2P backend (same as HomeView)
        p2pService.fetchRestaurants { [weak self] result in
            DispatchQueue.main.async {
                self?.isLoading = false
                switch result {
                case .success(let restaurants):
                    self?.p2pRestaurants = restaurants
                case .failure(let error):
                    logger.debug("SearchViewModel: Failed to fetch restaurants: \(error)")
                    self?.p2pRestaurants = []
                }
            }
        }
    }

    func filteredRestaurants(searchText: String, cuisine: String?, sortBy: SearchRestaurantsView.SortOption) -> [Restaurant] {
        var filtered = restaurants

        // Filter by search text
        if !searchText.isEmpty {
            filtered = filtered.filter {
                $0.name.localizedCaseInsensitiveContains(searchText) ||
                $0.cuisine.localizedCaseInsensitiveContains(searchText)
            }
        }

        // Filter by cuisine
        if let cuisine = cuisine {
            filtered = filtered.filter { $0.cuisine.localizedCaseInsensitiveContains(cuisine) }
        }

        // Sort
        switch sortBy {
        case .recommended:
            // Keep original order or use AI ranking
            break
        case .rating:
            filtered.sort { $0.rating > $1.rating }
        case .deliveryTime:
            filtered.sort {
                (Int($0.deliveryTime.components(separatedBy: "-").first ?? "99") ?? 99) <
                (Int($1.deliveryTime.components(separatedBy: "-").first ?? "99") ?? 99)
            }
        case .distance:
            // Would need location data
            break
        }

        return filtered
    }
}

