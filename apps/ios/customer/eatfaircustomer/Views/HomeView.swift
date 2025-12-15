import SwiftUI
import EatFairShared

struct HomeView: View {
    @StateObject var viewModel = HomeViewModel()
    @StateObject var voiceSearch = VoiceSearchService()
    @EnvironmentObject var addressViewModel: AddressViewModel
    @EnvironmentObject var multiCartViewModel: MultiRestaurantCartViewModel
    @State private var showLocationPicker = false
    @State private var searchText = ""
    @State private var showActiveOrder = true
    @State private var selectedCategory: String?
    @State private var showNotifications = false
    @State private var sortOption: SortOption = .recommended
    @State private var showVoiceSearch = false

    // Featured Deals State
    @State private var featuredDeals: [P2PFeaturedDeal] = []
    @State private var isLoadingDeals = false

    enum SortOption: String, CaseIterable {
        case recommended = "Recommended"
        case topRated = "Top Rated"
        case fastest = "Fastest Delivery"
        case nearest = "Nearest"
    }

    var body: some View {
        ZStack(alignment: .bottom) {
            Theme.brandGrey.edgesIgnoringSafeArea(.all)

            ScrollView(.vertical, showsIndicators: false) {
                VStack(spacing: 0) {
                    // MARK: - Header
                    headerSection

                    // MARK: - Service Selection (Food vs Ride)
                    serviceSelectionBanner

                    // MARK: - Categories
                    categoriesSection

                    // MARK: - AI Recommendation Banner
                    aiRecommendationBanner

                    // MARK: - Featured Deals Section
                    if !featuredDeals.isEmpty {
                        featuredDealsSection
                    }

                    // MARK: - Multi-Restaurant Promo
                    if multiCartViewModel.items.isEmpty {
                        multiRestaurantPromoBanner
                    }

                    // MARK: - Featured Restaurants
                    featuredRestaurantsSection

                    // MARK: - All Restaurants
                    allRestaurantsSection

                    // Bottom padding for floating elements
                    Spacer(minLength: 120)
                }
                .contentShape(Rectangle())
            }
            .scrollDismissesKeyboard(.interactively)

            // MARK: - Active Order Tracker
            if showActiveOrder && viewModel.hasActiveOrder {
                activeOrderTracker
                    .transition(.move(edge: .bottom).combined(with: .opacity))
            }
        }
        .navigationBarHidden(true)
        .onAppear {
            viewModel.fetchRestaurants()
            viewModel.checkActiveOrders()
            fetchFeaturedDeals()
        }
        .sheet(isPresented: $showLocationPicker) {
            LocationPickerView(viewModel: addressViewModel, isPresented: $showLocationPicker)
        }
        .sheet(isPresented: $showNotifications) {
            NotificationsView()
        }
        .sheet(isPresented: $showVoiceSearch) {
            VoiceSearchSheet(voiceSearch: voiceSearch)
        }
    }

    // MARK: - Header Section
    private var headerSection: some View {
        VStack(spacing: 0) {
            // Address & Profile Row
            HStack {
                Button(action: { showLocationPicker = true }) {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Deliver to")
                            .font(.caption)
                            .foregroundColor(Theme.textGrey)
                        HStack(spacing: 4) {
                            Text(addressViewModel.selectedAddress?.locationName ?? "Select Address")
                                .font(.headline)
                                .fontWeight(.bold)
                                .foregroundColor(Theme.brandBlack)
                            Image(systemName: "chevron.down")
                                .font(.caption)
                                .foregroundColor(Theme.brandBlack)
                        }
                        if let address = addressViewModel.selectedAddress {
                            Text("\(address.street), \(address.city)")
                                .font(.caption)
                                .foregroundColor(Theme.textGrey)
                                .lineLimit(1)
                        }
                    }
                }

                Spacer()

                // Notification Bell
                Button(action: { showNotifications = true }) {
                    ZStack(alignment: .topTrailing) {
                        Image(systemName: "bell")
                            .font(.title2)
                            .foregroundColor(Theme.brandBlack)

                        Circle()
                            .fill(Color.red)
                            .frame(width: 8, height: 8)
                            .offset(x: 2, y: -2)
                    }
                }
                .padding(.trailing, 8)

                // Profile
                NavigationLink(destination: ProfileView()) {
                    Image(systemName: "person.circle.fill")
                        .font(.title)
                        .foregroundColor(Theme.brandGreen)
                }
            }
            .padding()

            // Search Bar
            HStack(spacing: 0) {
                NavigationLink(destination: SearchRestaurantsView()) {
                    HStack(spacing: 12) {
                        Image(systemName: "magnifyingglass")
                            .foregroundColor(.gray)
                        Text("Search restaurants or dishes...")
                            .foregroundColor(.gray)
                        Spacer()
                    }
                }
                .buttonStyle(.plain)

                // Voice Search Button
                Button(action: { showVoiceSearch = true }) {
                    Image(systemName: voiceSearch.isListening ? "mic.fill" : "mic.fill")
                        .foregroundColor(voiceSearch.isListening ? .red : Theme.brandGreen)
                        .padding(.trailing, 4)
                }
            }
            .padding()
            .background(Color(.systemGray6))
            .cornerRadius(12)
            .padding(.horizontal)
            .padding(.bottom)
        }
        .background(Color.white)
        .shadow(color: Color.black.opacity(0.05), radius: 2, x: 0, y: 2)
    }

    // MARK: - Categories Section
    private var categoriesSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            if !viewModel.availableCuisines.isEmpty {
                Text("Categories")
                    .font(.headline)
                    .padding(.horizontal)
                    .padding(.top)

                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 16) {
                        ForEach(viewModel.availableCuisines, id: \.name) { cuisine in
                            CategoryButton(
                                emoji: cuisine.emoji,
                                name: cuisine.name,
                                isSelected: selectedCategory == cuisine.name,
                                action: {
                                    withAnimation(.spring(response: 0.3)) {
                                        selectedCategory = selectedCategory == cuisine.name ? nil : cuisine.name
                                    }
                                }
                            )
                        }
                    }
                    .padding(.horizontal)
                }
            }
        }
    }

    // MARK: - Service Selection (Food vs Ride)
    private var serviceSelectionBanner: some View {
        HStack(spacing: 12) {
            // Food Delivery
            NavigationLink(destination: SearchRestaurantsView()) {
                ServiceOptionCard(
                    icon: "bag.fill",
                    title: "Food",
                    subtitle: "Order delivery",
                    color: Theme.brandGreen
                )
            }
            .buttonStyle(.plain)

            // Ride Share
            NavigationLink(destination: RideRequestView()) {
                ServiceOptionCard(
                    icon: "car.fill",
                    title: "Ride",
                    subtitle: "Get picked up",
                    color: Color.blue
                )
            }
            .buttonStyle(.plain)
        }
        .padding(.horizontal)
        .padding(.top, 8)
    }

    // MARK: - AI Recommendation Banner
    private var aiRecommendationBanner: some View {
        NavigationLink(destination: SearchRestaurantsView()) {
            HStack(spacing: 12) {
                ZStack {
                    Circle()
                        .fill(
                            LinearGradient(
                                colors: [.purple, .pink],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        )
                        .frame(width: 50, height: 50)

                    Image(systemName: "sparkles")
                        .font(.title2)
                        .foregroundColor(.white)
                }

                VStack(alignment: .leading, spacing: 2) {
                    Text("AI Food Assistant")
                        .font(.headline)
                        .foregroundColor(.primary)
                    Text("Tell me what you're craving!")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }

                Spacer()

                Text("Try Now")
                    .font(.subheadline)
                    .fontWeight(.semibold)
                    .foregroundColor(.purple)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 6)
                    .background(Color.purple.opacity(0.1))
                    .cornerRadius(8)
            }
            .padding()
            .background(Color.white)
            .cornerRadius(16)
            .shadow(color: .black.opacity(0.05), radius: 8, x: 0, y: 2)
            .padding()
        }
        .buttonStyle(.plain)
    }

    // MARK: - Featured Deals Section
    private var featuredDealsSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: "flame.fill")
                    .foregroundColor(.orange)
                Text("Hot Deals")
                    .font(.headline)
                    .fontWeight(.bold)
                Spacer()
            }
            .padding(.horizontal)
            .padding(.top)

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 12) {
                    ForEach(featuredDeals) { deal in
                        HomeFeaturedDealCard(deal: deal)
                    }
                }
                .padding(.horizontal)
            }
        }
        .padding(.bottom, 8)
    }

    // MARK: - Fetch Featured Deals
    private func fetchFeaturedDeals() {
        isLoadingDeals = true

        P2PAPIService.shared.getFeaturedDeals { result in
            isLoadingDeals = false

            switch result {
            case .success(let response):
                featuredDeals = response.featured
            case .failure(let error):
                #if DEBUG
                print("[HomeView] Failed to fetch featured deals: \(error)")
                #endif
                featuredDeals = []
            }
        }
    }

    // MARK: - Multi-Restaurant Promo Banner
    @State private var showMultiRestaurantInfo = false

    private var multiRestaurantPromoBanner: some View {
        Button(action: { showMultiRestaurantInfo = true }) {
            VStack(alignment: .leading, spacing: 8) {
                HStack(spacing: 8) {
                    Image(systemName: "star.fill")
                        .foregroundColor(.yellow)
                    Text("NEW: Multi-Restaurant Orders")
                        .font(.headline)
                        .foregroundColor(.white)
                }

                Text("Order from up to 3 restaurants in one delivery! Just $\(String(format: "%.2f", AppConfig.shared.platformFeePerRestaurant)) per restaurant.")
                    .font(.caption)
                    .foregroundColor(.white.opacity(0.9))
                    .multilineTextAlignment(.leading)

                HStack {
                    Spacer()
                    Text("Learn More →")
                        .font(.caption)
                        .fontWeight(.semibold)
                        .foregroundColor(.white)
                }
            }
            .padding()
            .background(
                LinearGradient(
                    colors: [Color.orange, Color.red],
                    startPoint: .leading,
                    endPoint: .trailing
                )
            )
            .cornerRadius(16)
            .padding(.horizontal)
        }
        .buttonStyle(.plain)
        .sheet(isPresented: $showMultiRestaurantInfo) {
            MultiRestaurantInfoSheet()
        }
    }

    // MARK: - Featured Restaurants Section
    private var featuredRestaurantsSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("Featured Near You")
                    .font(.headline)
                Spacer()
                NavigationLink("See All") {
                    AllRestaurantsListView(restaurants: viewModel.restaurants)
                }
                .font(.subheadline)
                .foregroundColor(Theme.brandGreen)
            }
            .padding(.horizontal)
            .padding(.top)

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 16) {
                    ForEach(viewModel.featuredRestaurants) { restaurant in
                        NavigationLink(destination: RestaurantDetailView(restaurant: restaurant)) {
                            FeaturedRestaurantCard(restaurant: restaurant)
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding(.horizontal)
            }
        }
    }

    // MARK: - All Restaurants Section
    private var allRestaurantsSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("All Restaurants")
                    .font(.headline)

                Spacer()

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
                        Image(systemName: "arrow.up.arrow.down")
                            .font(.caption)
                    }
                    .foregroundColor(Theme.brandGreen)
                }
            }
            .padding(.horizontal)
            .padding(.top)

            if viewModel.isLoading {
                VStack(spacing: 16) {
                    ProgressView()
                    Text("Loading restaurants...")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 50)
            } else if let error = viewModel.errorMessage {
                VStack(spacing: 16) {
                    Image(systemName: "wifi.exclamationmark")
                        .font(.system(size: 50))
                        .foregroundColor(.orange)
                    Text("Connection Issue")
                        .font(.headline)
                    Text(error)
                        .font(.caption)
                        .foregroundColor(.secondary)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 40)
                    Button("Retry") {
                        viewModel.fetchRestaurants()
                    }
                    .buttonStyle(.borderedProminent)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 50)
            } else if viewModel.allRestaurants.isEmpty {
                EmptyStateView(
                    icon: "fork.knife",
                    title: "No Restaurants Found",
                    message: "We couldn't find any restaurants in your area. Try changing your delivery address."
                )
                .padding(.vertical, 50)
            } else {
                LazyVStack(spacing: 16) {
                    ForEach(filteredRestaurants) { restaurant in
                        NavigationLink(destination: RestaurantDetailView(restaurant: restaurant)) {
                            RestaurantCard(restaurant: restaurant)
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding(.horizontal)
            }
        }
    }

    // MARK: - Active Order Tracker
    private var activeOrderTracker: some View {
        NavigationLink(destination: TrackOrderMapView()) {
            HStack(spacing: 12) {
                // Animated delivery icon
                ZStack {
                    Circle()
                        .fill(Theme.brandGreen.opacity(0.2))
                        .frame(width: 44, height: 44)

                    Image(systemName: "bicycle")
                        .font(.title2)
                        .foregroundColor(Theme.brandGreen)
                }

                VStack(alignment: .leading, spacing: 2) {
                    Text("Your order is on its way!")
                        .font(.subheadline)
                        .fontWeight(.semibold)
                        .foregroundColor(Theme.brandBlack)
                    Text("Est. arrival: \(formatActiveOrderETA()) mins")
                        .font(.caption)
                        .foregroundColor(Theme.textGrey)
                }

                Spacer()

                Text("TRACK")
                    .font(.caption)
                    .fontWeight(.bold)
                    .foregroundColor(.white)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 6)
                    .background(Theme.brandGreen)
                    .cornerRadius(8)
            }
            .padding()
            .background(Color.white)
            .cornerRadius(16)
            .shadow(color: Color.black.opacity(0.15), radius: 10, x: 0, y: 5)
            .padding(.horizontal)
            .padding(.bottom, 100)
        }
        .buttonStyle(.plain)
    }

    // MARK: - Filtered Restaurants
    private var filteredRestaurants: [Restaurant] {
        var restaurants = viewModel.allRestaurants

        // Apply category filter
        if let category = selectedCategory {
            restaurants = restaurants.filter {
                $0.cuisine.localizedCaseInsensitiveContains(category)
            }
        }

        // Apply sort
        switch sortOption {
        case .recommended:
            // Default order (by rating as proxy for recommendation)
            restaurants.sort { $0.rating > $1.rating }
        case .topRated:
            restaurants.sort { $0.rating > $1.rating }
        case .fastest:
            restaurants.sort {
                let time1 = Int($0.deliveryTime.components(separatedBy: "-").first ?? "99") ?? 99
                let time2 = Int($1.deliveryTime.components(separatedBy: "-").first ?? "99") ?? 99
                return time1 < time2
            }
        case .nearest:
            // Sort by distance if location available, otherwise by name
            if let userLat = addressViewModel.selectedAddress?.latitude,
               let userLon = addressViewModel.selectedAddress?.longitude {
                restaurants.sort {
                    let dist1 = sqrt(pow($0.latitude - userLat, 2) + pow($0.longitude - userLon, 2))
                    let dist2 = sqrt(pow($1.latitude - userLat, 2) + pow($1.longitude - userLon, 2))
                    return dist1 < dist2
                }
            }
        }

        return restaurants
    }

    // MARK: - Format Active Order ETA
    private func formatActiveOrderETA() -> String {
        guard let order = viewModel.activeOrder,
              let timestamp = order.estimatedDeliveryTime else {
            return "20-30"
        }

        let deliveryDate = Date(timeIntervalSince1970: TimeInterval(timestamp))
        let minutesRemaining = Int(deliveryDate.timeIntervalSinceNow / 60)

        if minutesRemaining <= 0 {
            return "5-10"
        } else if minutesRemaining < 5 {
            return "< 5"
        } else {
            let minTime = max(5, minutesRemaining - 5)
            let maxTime = minutesRemaining + 10
            return "\(minTime)-\(maxTime)"
        }
    }
}

// MARK: - Service Option Card (Food vs Ride)
struct ServiceOptionCard: View {
    let icon: String
    let title: String
    let subtitle: String
    let color: Color

    var body: some View {
        VStack(spacing: 12) {
            ZStack {
                Circle()
                    .fill(color.opacity(0.15))
                    .frame(width: 56, height: 56)

                Image(systemName: icon)
                    .font(.title2)
                    .foregroundColor(color)
            }

            VStack(spacing: 2) {
                Text(title)
                    .font(.headline)
                    .foregroundColor(.primary)

                Text(subtitle)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 16)
        .background(Color.white)
        .cornerRadius(16)
        .shadow(color: .black.opacity(0.05), radius: 8, x: 0, y: 2)
    }
}

// MARK: - Category Button
struct CategoryButton: View {
    let emoji: String
    let name: String
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(spacing: 8) {
                ZStack {
                    Circle()
                        .fill(isSelected ? Theme.brandGreen : Color(.systemGray6))
                        .frame(width: 60, height: 60)

                    Text(emoji)
                        .font(.title)
                }

                Text(name)
                    .font(.caption)
                    .fontWeight(isSelected ? .semibold : .regular)
                    .foregroundColor(isSelected ? Theme.brandGreen : .primary)
            }
        }
    }
}

// MARK: - Featured Restaurant Card
struct FeaturedRestaurantCard: View {
    let restaurant: Restaurant

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Image with proper clipping
            ZStack(alignment: .topTrailing) {
                if let url = URL(string: restaurant.imageUrl), !restaurant.imageUrl.isEmpty {
                    AsyncImage(url: url) { phase in
                        switch phase {
                        case .success(let image):
                            image
                                .resizable()
                                .aspectRatio(contentMode: .fill)
                                .frame(width: 180, height: 110)
                                .clipped()
                        case .failure(_):
                            Rectangle()
                                .fill(Color(.systemGray5))
                                .overlay(
                                    Image(systemName: "photo")
                                        .font(.largeTitle)
                                        .foregroundColor(.gray)
                                )
                        case .empty:
                            Rectangle()
                                .fill(Color(.systemGray6))
                                .overlay(ProgressView())
                        @unknown default:
                            Rectangle().fill(Color(.systemGray5))
                        }
                    }
                } else {
                    Rectangle()
                        .fill(Color(.systemGray5))
                        .overlay(
                            Image(systemName: "fork.knife")
                                .font(.largeTitle)
                                .foregroundColor(.gray)
                        )
                }

                // Promo Badge
                if restaurant.rating >= 4.5 {
                    Text("TOP PICK")
                        .font(.system(size: 9, weight: .bold))
                        .foregroundColor(.white)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 3)
                        .background(Color.orange)
                        .cornerRadius(4)
                        .padding(6)
                }
            }
            .frame(width: 180, height: 110)
            .clipped()

            // Restaurant Info
            VStack(alignment: .leading, spacing: 3) {
                Text(restaurant.name)
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundColor(.primary)
                    .lineLimit(1)

                HStack(spacing: 4) {
                    Image(systemName: "star.fill")
                        .font(.system(size: 10))
                        .foregroundColor(.orange)
                    Text(String(format: "%.1f", restaurant.rating))
                        .font(.system(size: 12))
                        .foregroundColor(.secondary)
                    Text("•")
                        .font(.system(size: 10))
                        .foregroundColor(.gray)
                    Text(restaurant.deliveryTime)
                        .font(.system(size: 12))
                        .foregroundColor(.secondary)
                }

                Text("$\(String(format: "%.0f", AppConfig.shared.platformFeePerRestaurant)) delivery")
                    .font(.system(size: 11, weight: .medium))
                    .foregroundColor(Theme.brandGreen)
            }
            .padding(.horizontal, 10)
            .padding(.vertical, 8)
        }
        .frame(width: 180)
        .background(Color.white)
        .cornerRadius(12)
        .shadow(color: .black.opacity(0.08), radius: 6, x: 0, y: 2)
    }
}

// MARK: - Restaurant Card
struct RestaurantCard: View {
    let restaurant: Restaurant
    @EnvironmentObject var multiCartViewModel: MultiRestaurantCartViewModel

    private var hasItemsFromRestaurant: Bool {
        multiCartViewModel.hasRestaurant(restaurant.id ?? "")
    }

    var body: some View {
        HStack(alignment: .center, spacing: 14) {
            // Image with proper clipping
            ZStack(alignment: .topTrailing) {
                if let url = URL(string: restaurant.imageUrl), !restaurant.imageUrl.isEmpty {
                    AsyncImage(url: url) { phase in
                        switch phase {
                        case .success(let image):
                            image
                                .resizable()
                                .aspectRatio(contentMode: .fill)
                                .frame(width: 90, height: 90)
                                .clipped()
                        case .failure(_):
                            Rectangle()
                                .fill(Color(.systemGray5))
                                .overlay(
                                    Image(systemName: "photo")
                                        .font(.title2)
                                        .foregroundColor(.gray)
                                )
                        case .empty:
                            Rectangle()
                                .fill(Color(.systemGray6))
                                .overlay(ProgressView())
                        @unknown default:
                            Rectangle().fill(Color(.systemGray5))
                        }
                    }
                } else {
                    Rectangle()
                        .fill(Color(.systemGray5))
                        .overlay(
                            Image(systemName: "fork.knife")
                                .font(.title2)
                                .foregroundColor(.gray)
                        )
                }

                // Items in cart badge
                if hasItemsFromRestaurant {
                    Image(systemName: "cart.fill")
                        .font(.caption2)
                        .foregroundColor(.white)
                        .padding(5)
                        .background(Theme.brandGreen)
                        .clipShape(Circle())
                        .offset(x: 4, y: -4)
                }
            }
            .frame(width: 90, height: 90)
            .cornerRadius(12)
            .clipped()

            // Restaurant Info
            VStack(alignment: .leading, spacing: 4) {
                Text(restaurant.name)
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundColor(.primary)
                    .lineLimit(1)

                Text(restaurant.cuisine)
                    .font(.system(size: 14))
                    .foregroundColor(.secondary)
                    .lineLimit(1)

                Spacer().frame(height: 4)

                HStack(spacing: 10) {
                    HStack(spacing: 3) {
                        Image(systemName: "star.fill")
                            .foregroundColor(.orange)
                            .font(.system(size: 11))
                        Text(String(format: "%.1f", restaurant.rating))
                            .fontWeight(.medium)
                    }

                    HStack(spacing: 3) {
                        Image(systemName: "clock")
                            .font(.system(size: 11))
                        Text(restaurant.deliveryTime)
                    }

                    Text("$\(String(format: "%.0f", AppConfig.shared.platformFeePerRestaurant)) fee")
                        .foregroundColor(Theme.brandGreen)
                        .fontWeight(.medium)
                }
                .font(.system(size: 12))
                .foregroundColor(.gray)

                // Multi-restaurant indicator
                if hasItemsFromRestaurant {
                    Text("Items in cart")
                        .font(.system(size: 10, weight: .medium))
                        .foregroundColor(Theme.brandGreen)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 3)
                        .background(Theme.brandGreen.opacity(0.1))
                        .cornerRadius(4)
                }
            }

            Spacer()

            Image(systemName: "chevron.right")
                .foregroundColor(Color(.systemGray3))
                .font(.system(size: 14, weight: .medium))
        }
        .padding(12)
        .background(Color.white)
        .cornerRadius(14)
        .shadow(color: .black.opacity(0.06), radius: 6, x: 0, y: 2)
    }
}

// MARK: - Empty State View
struct EmptyStateView: View {
    let icon: String
    let title: String
    let message: String

    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: icon)
                .font(.system(size: 60))
                .foregroundColor(.gray.opacity(0.5))

            Text(title)
                .font(.headline)

            Text(message)
                .font(.subheadline)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 40)
        }
    }
}

// MARK: - All Restaurants List View
struct AllRestaurantsListView: View {
    let restaurants: [Restaurant]
    @State private var searchText = ""

    private var filteredRestaurants: [Restaurant] {
        if searchText.isEmpty {
            return restaurants
        }
        return restaurants.filter {
            $0.name.localizedCaseInsensitiveContains(searchText) ||
            $0.cuisine.localizedCaseInsensitiveContains(searchText)
        }
    }

    var body: some View {
        List {
            ForEach(filteredRestaurants) { restaurant in
                NavigationLink(destination: RestaurantDetailView(restaurant: restaurant)) {
                    RestaurantRowView(restaurant: restaurant)
                }
            }
        }
        .listStyle(.plain)
        .searchable(text: $searchText, prompt: "Search restaurants...")
        .navigationTitle("All Restaurants")
        .navigationBarTitleDisplayMode(.large)
    }
}

// MARK: - Restaurant Row View
struct RestaurantRowView: View {
    let restaurant: Restaurant

    var body: some View {
        HStack(spacing: 12) {
            // Restaurant Image
            AsyncImage(url: URL(string: restaurant.imageUrl)) { image in
                image.resizable().scaledToFill()
            } placeholder: {
                ZStack {
                    Color.gray.opacity(0.1)
                    Image(systemName: "fork.knife")
                        .font(.title2)
                        .foregroundColor(.gray)
                }
            }
            .frame(width: 70, height: 70)
            .cornerRadius(10)

            VStack(alignment: .leading, spacing: 4) {
                Text(restaurant.name)
                    .font(.headline)
                    .lineLimit(1)

                Text(restaurant.cuisine)
                    .font(.subheadline)
                    .foregroundColor(.secondary)

                HStack(spacing: 8) {
                    HStack(spacing: 2) {
                        Image(systemName: "star.fill")
                            .foregroundColor(.yellow)
                        Text(String(format: "%.1f", restaurant.rating))
                    }

                    Text("\(restaurant.deliveryTime) min")
                        .foregroundColor(.secondary)

                    Text("$\(String(format: "%.0f", AppConfig.shared.platformFeePerRestaurant)) fee")
                        .foregroundColor(Theme.brandGreen)
                }
                .font(.caption)
            }

            Spacer()
        }
        .padding(.vertical, 4)
    }
}

// MARK: - Multi-Restaurant Info Sheet
struct MultiRestaurantInfoSheet: View {
    @Environment(\.dismiss) var dismiss

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    // Header
                    VStack(spacing: 12) {
                        Image(systemName: "cart.badge.plus")
                            .font(.system(size: 60))
                            .foregroundColor(Theme.brandGreen)

                        Text("Multi-Restaurant Orders")
                            .font(.title)
                            .fontWeight(.bold)

                        Text("Order from multiple restaurants in a single delivery")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                            .multilineTextAlignment(.center)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.top)

                    // How it works
                    VStack(alignment: .leading, spacing: 16) {
                        Text("How It Works")
                            .font(.headline)

                        FeatureRow(
                            icon: "1.circle.fill",
                            title: "Browse & Add",
                            description: "Add items from up to 3 different restaurants to your cart"
                        )

                        FeatureRow(
                            icon: "2.circle.fill",
                            title: "Single Checkout",
                            description: "Pay once for all your items with combined delivery"
                        )

                        FeatureRow(
                            icon: "3.circle.fill",
                            title: "One Driver",
                            description: "A single driver picks up from all restaurants and delivers to you"
                        )
                    }
                    .padding()
                    .background(Color(.systemGray6))
                    .cornerRadius(16)

                    // Pricing
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Pricing")
                            .font(.headline)

                        HStack {
                            Image(systemName: "dollarsign.circle.fill")
                                .foregroundColor(Theme.brandGreen)
                            Text("$\(String(format: "%.2f", AppConfig.shared.platformFeePerRestaurant)) per restaurant")
                                .font(.subheadline)
                        }

                        Text("You pay a small fee per restaurant to cover the additional pickup stops. Still cheaper than multiple separate deliveries!")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    .padding()
                    .background(Color(.systemGray6))
                    .cornerRadius(16)

                    // Benefits
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Benefits")
                            .font(.headline)

                        BenefitRow(icon: "clock.fill", text: "Save time with one delivery")
                        BenefitRow(icon: "leaf.fill", text: "Better for the environment")
                        BenefitRow(icon: "heart.fill", text: "Everyone gets what they want")
                        BenefitRow(icon: "dollarsign.circle.fill", text: "Lower total delivery fees")
                    }
                    .padding()
                    .background(Color(.systemGray6))
                    .cornerRadius(16)
                }
                .padding()
            }
            .navigationTitle("Learn More")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") { dismiss() }
                }
            }
        }
    }
}

struct FeatureRow: View {
    let icon: String
    let title: String
    let description: String

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            Image(systemName: icon)
                .font(.title2)
                .foregroundColor(Theme.brandGreen)
                .frame(width: 30)

            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.subheadline)
                    .fontWeight(.semibold)
                Text(description)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
        }
    }
}

struct BenefitRow: View {
    let icon: String
    let text: String

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .foregroundColor(Theme.brandGreen)
                .frame(width: 24)
            Text(text)
                .font(.subheadline)
        }
    }
}

// MARK: - Voice Search Sheet
struct VoiceSearchSheet: View {
    @ObservedObject var voiceSearch: VoiceSearchService
    @Environment(\.dismiss) var dismiss
    @State private var navigateToSearch = false

    var body: some View {
        NavigationStack {
            VStack(spacing: 24) {
                Spacer()

                // Microphone Animation
                ZStack {
                    // Outer pulse circles when listening
                    if voiceSearch.isListening {
                        Circle()
                            .stroke(Theme.brandGreen.opacity(0.3), lineWidth: 2)
                            .frame(width: 150, height: 150)
                            .scaleEffect(voiceSearch.isListening ? 1.3 : 1.0)
                            .opacity(voiceSearch.isListening ? 0 : 1)
                            .animation(.easeOut(duration: 1.0).repeatForever(autoreverses: false), value: voiceSearch.isListening)

                        Circle()
                            .stroke(Theme.brandGreen.opacity(0.5), lineWidth: 2)
                            .frame(width: 130, height: 130)
                            .scaleEffect(voiceSearch.isListening ? 1.2 : 1.0)
                            .opacity(voiceSearch.isListening ? 0 : 1)
                            .animation(.easeOut(duration: 1.0).repeatForever(autoreverses: false).delay(0.3), value: voiceSearch.isListening)
                    }

                    // Main button
                    Button(action: {
                        voiceSearch.toggleListening()
                    }) {
                        ZStack {
                            Circle()
                                .fill(voiceSearch.isListening ? Color.red : Theme.brandGreen)
                                .frame(width: 100, height: 100)
                                .shadow(color: (voiceSearch.isListening ? Color.red : Theme.brandGreen).opacity(0.4), radius: 10, x: 0, y: 5)

                            Image(systemName: voiceSearch.isListening ? "stop.fill" : "mic.fill")
                                .font(.system(size: 40))
                                .foregroundColor(.white)
                        }
                    }
                }

                // Status Text
                VStack(spacing: 8) {
                    if voiceSearch.isListening {
                        Text("Listening...")
                            .font(.title2)
                            .fontWeight(.semibold)
                            .foregroundColor(Theme.brandBlack)

                        Text("Speak now to search")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                    } else if !voiceSearch.transcribedText.isEmpty {
                        Text("You said:")
                            .font(.subheadline)
                            .foregroundColor(.secondary)

                        Text("\"\(voiceSearch.transcribedText)\"")
                            .font(.title3)
                            .fontWeight(.medium)
                            .foregroundColor(Theme.brandBlack)
                            .multilineTextAlignment(.center)
                            .padding(.horizontal)
                    } else {
                        Text("Tap to speak")
                            .font(.title2)
                            .fontWeight(.semibold)
                            .foregroundColor(Theme.brandBlack)

                        Text("Search for restaurants or dishes")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                    }
                }

                // Error message
                if let error = voiceSearch.errorMessage {
                    Text(error)
                        .font(.caption)
                        .foregroundColor(.red)
                        .padding(.horizontal)
                }

                Spacer()

                // Search Button (when we have transcribed text)
                if !voiceSearch.transcribedText.isEmpty && !voiceSearch.isListening {
                    Button(action: {
                        navigateToSearch = true
                    }) {
                        HStack {
                            Image(systemName: "magnifyingglass")
                            Text("Search for \"\(voiceSearch.transcribedText)\"")
                        }
                        .fontWeight(.semibold)
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Theme.brandGreen)
                        .foregroundColor(.white)
                        .cornerRadius(12)
                    }
                    .padding(.horizontal)

                    Button(action: {
                        voiceSearch.transcribedText = ""
                        voiceSearch.startListening()
                    }) {
                        Text("Try again")
                            .font(.subheadline)
                            .foregroundColor(Theme.brandGreen)
                    }
                }

                Spacer().frame(height: 20)
            }
            .navigationTitle("Voice Search")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") {
                        voiceSearch.stopListening()
                        dismiss()
                    }
                }
            }
            .navigationDestination(isPresented: $navigateToSearch) {
                SearchRestaurantsView()
            }
            .onDisappear {
                voiceSearch.stopListening()
            }
        }
    }
}

// MARK: - Home Featured Deal Card (Compact)
struct HomeFeaturedDealCard: View {
    let deal: P2PFeaturedDeal

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            // Headline Badge
            Text(deal.headline)
                .font(.title2)
                .fontWeight(.bold)
                .foregroundColor(.white)

            Text(deal.vendorName)
                .font(.subheadline)
                .fontWeight(.medium)
                .foregroundColor(.white.opacity(0.9))

            if let desc = deal.description, !desc.isEmpty {
                Text(desc)
                    .font(.caption)
                    .foregroundColor(.white.opacity(0.8))
                    .lineLimit(2)
            }

            Spacer()

            HStack {
                // Promo code
                HStack(spacing: 4) {
                    Image(systemName: "ticket.fill")
                        .font(.caption2)
                    Text(deal.promotionCode)
                        .font(.caption)
                        .fontWeight(.bold)
                }
                .padding(.horizontal, 8)
                .padding(.vertical, 4)
                .background(Color.white.opacity(0.3))
                .cornerRadius(6)
                .foregroundColor(.white)

                Spacer()

                // Min order if applicable
                if let minOrder = deal.minOrderAmount, minOrder > 0 {
                    Text("Min $\(String(format: "%.0f", minOrder))")
                        .font(.caption2)
                        .foregroundColor(.white.opacity(0.8))
                }
            }
        }
        .padding()
        .frame(width: 200, height: 140)
        .background(
            LinearGradient(
                colors: gradientColors,
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        )
        .cornerRadius(16)
        .shadow(color: gradientColors[0].opacity(0.4), radius: 8, x: 0, y: 4)
    }

    private var gradientColors: [Color] {
        switch deal.type {
        case "percentage":
            return [Color.orange, Color.red]
        case "flat_amount":
            return [Color.purple, Color.pink]
        case "free_delivery":
            return [Color.green, Color.teal]
        case "bogo":
            return [Color.blue, Color.purple]
        default:
            return [Color.orange, Color.red]
        }
    }
}
