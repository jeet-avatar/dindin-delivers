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
                            DealsView()
                        }
                        .tabItem {
                            Label("Deals", systemImage: "tag.fill")
                        }
                        .tag(2)

                        NavigationStack {
                            OrderHistoryView()
                        }
                        .tabItem {
                            Label("Orders", systemImage: "clock.fill")
                        }
                        .tag(3)

                        NavigationStack {
                            ProfileView()
                        }
                        .tabItem {
                            Label("Profile", systemImage: "person.fill")
                        }
                        .tag(4)
                    }
                    .accentColor(Theme.brandGreen)

                    // Floating Cart Button (always visible when cart has items)
                    if !multiCartViewModel.items.isEmpty && selectedTab != 1 {
                        floatingCartButton
                            .transition(.move(edge: .bottom).combined(with: .opacity))
                    }
                }
                .sheet(isPresented: $showCartSheet) {
                    NavigationStack {
                        MultiRestaurantCartView(cartVM: multiCartViewModel)
                            .environmentObject(addressViewModel)
                    }
                }
                .fullScreenCover(isPresented: $multiCartViewModel.orderPlaced) {
                    NavigationStack {
                        OrderSuccessView()
                            .environmentObject(multiCartViewModel)
                    }
                }
                .onChange(of: multiCartViewModel.orderPlaced) { _, newValue in
                    if newValue {
                        // Dismiss cart sheet when order is placed
                        showCartSheet = false
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
                    // Navigate to deals tab
                    selectedTab = 2
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
    @EnvironmentObject var cartViewModel: CartViewModel
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

                // AI Recommendations Button
                Button(action: { viewModel.showAIRecommendations = true }) {
                    HStack(spacing: 4) {
                        Image(systemName: "sparkles")
                        Text("AI Pick")
                    }
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 6)
                    .background(Color.purple.opacity(0.1))
                    .foregroundColor(.purple)
                    .cornerRadius(8)
                }
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
        .sheet(isPresented: $viewModel.showAIRecommendations) {
            AIRecommendationsSheet(viewModel: viewModel)
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
    @Published var showAIRecommendations = false
    @Published var aiRecommendation: String = ""

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
                    print("SearchViewModel: Failed to fetch restaurants: \(error)")
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

// MARK: - AI Recommendations Sheet
struct AIRecommendationsSheet: View {
    @ObservedObject var viewModel: SearchViewModel
    @Environment(\.dismiss) var dismiss
    @State private var preferences = ""
    @State private var isGenerating = false
    @State private var recommendations: [AIRecommendation] = []

    struct AIRecommendation: Identifiable {
        let id = UUID()
        let restaurant: Restaurant
        let restaurantName: String
        let reason: String
        let matchScore: Int
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 20) {
                // Header
                VStack(spacing: 8) {
                    Image(systemName: "sparkles")
                        .font(.system(size: 40))
                        .foregroundColor(.purple)

                    Text("AI Food Assistant")
                        .font(.title2)
                        .fontWeight(.bold)

                    Text("Tell me what you're craving and I'll find the perfect meal")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                        .multilineTextAlignment(.center)
                }
                .padding()

                // Input
                VStack(alignment: .leading, spacing: 8) {
                    Text("What are you in the mood for?")
                        .font(.headline)

                    TextEditor(text: $preferences)
                        .frame(height: 100)
                        .padding(8)
                        .background(Color(.systemGray6))
                        .cornerRadius(12)
                        .overlay(
                            Group {
                                if preferences.isEmpty {
                                    Text("e.g., \"Something spicy and filling\" or \"Healthy lunch under $15\"")
                                        .foregroundColor(.gray.opacity(0.5))
                                        .padding(12)
                                }
                            },
                            alignment: .topLeading
                        )
                }
                .padding(.horizontal)

                // Quick Suggestions
                VStack(alignment: .leading, spacing: 8) {
                    Text("Quick picks:")
                        .font(.subheadline)
                        .foregroundColor(.secondary)

                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 8) {
                            QuickSuggestionChip(text: "🍕 Comfort food", action: { preferences = "Comfort food, something warm and filling" })
                            QuickSuggestionChip(text: "🥗 Healthy option", action: { preferences = "Healthy and light, lots of vegetables" })
                            QuickSuggestionChip(text: "🌶️ Spicy adventure", action: { preferences = "Spicy food, authentic flavors" })
                            QuickSuggestionChip(text: "💰 Budget friendly", action: { preferences = "Good value, under $12 per person" })
                        }
                    }
                }
                .padding(.horizontal)

                // Generate Button
                Button(action: generateRecommendations) {
                    HStack {
                        if isGenerating {
                            ProgressView()
                                .progressViewStyle(CircularProgressViewStyle(tint: .white))
                        } else {
                            Image(systemName: "sparkles")
                        }
                        Text(isGenerating ? "Finding perfect matches..." : "Get AI Recommendations")
                    }
                    .fontWeight(.semibold)
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(preferences.isEmpty ? Color.gray : Color.purple)
                    .foregroundColor(.white)
                    .cornerRadius(12)
                }
                .disabled(preferences.isEmpty || isGenerating)
                .padding(.horizontal)

                // Results
                if !recommendations.isEmpty {
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Recommended for you")
                            .font(.headline)
                            .padding(.horizontal)

                        ForEach(recommendations) { rec in
                            NavigationLink(destination: RestaurantDetailView(restaurant: rec.restaurant)) {
                                AIRecommendationCard(recommendation: rec)
                            }
                            .buttonStyle(.plain)
                        }
                    }
                }

                Spacer()
            }
            .navigationTitle("AI Recommendations")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") { dismiss() }
                }
            }
        }
    }

    func generateRecommendations() {
        isGenerating = true

        // Generate recommendations based on actual restaurants from the viewModel
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) {
            // Use real restaurants from the search results
            let availableRestaurants = viewModel.restaurants

            if availableRestaurants.isEmpty {
                // No restaurants available
                recommendations = []
            } else {
                // Create recommendations from real restaurants
                recommendations = availableRestaurants.prefix(3).enumerated().map { index, restaurant in
                    let reasons = [
                        "Highly rated with excellent reviews matching your preferences",
                        "Popular choice with fast delivery and great value",
                        "Great selection of dishes that match what you're looking for"
                    ]
                    return AIRecommendation(
                        restaurant: restaurant,
                        restaurantName: restaurant.name,
                        reason: reasons[index % reasons.count],
                        matchScore: max(75, 95 - (index * 8))
                    )
                }
            }
            isGenerating = false
        }
    }
}

struct QuickSuggestionChip: View {
    let text: String
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(text)
                .font(.caption)
                .padding(.horizontal, 12)
                .padding(.vertical, 8)
                .background(Color.purple.opacity(0.1))
                .foregroundColor(.purple)
                .cornerRadius(16)
        }
    }
}

struct AIRecommendationCard: View {
    let recommendation: AIRecommendationsSheet.AIRecommendation

    var body: some View {
        HStack(spacing: 12) {
            // Match Score Circle
            ZStack {
                Circle()
                    .stroke(Color.purple.opacity(0.3), lineWidth: 3)
                    .frame(width: 50, height: 50)

                Circle()
                    .trim(from: 0, to: CGFloat(recommendation.matchScore) / 100)
                    .stroke(Color.purple, lineWidth: 3)
                    .frame(width: 50, height: 50)
                    .rotationEffect(.degrees(-90))

                Text("\(recommendation.matchScore)%")
                    .font(.caption)
                    .fontWeight(.bold)
            }

            VStack(alignment: .leading, spacing: 4) {
                Text(recommendation.restaurantName)
                    .font(.headline)

                Text(recommendation.reason)
                    .font(.caption)
                    .foregroundColor(.secondary)
                    .lineLimit(2)
            }

            Spacer()

            Image(systemName: "chevron.right")
                .foregroundColor(.gray)
                .font(.caption)
        }
        .padding()
        .background(Color.white)
        .cornerRadius(12)
        .shadow(color: .black.opacity(0.05), radius: 4, x: 0, y: 2)
        .padding(.horizontal)
    }
}
