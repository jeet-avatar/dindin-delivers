import SwiftUI
import EatFairShared

struct HomeView: View {
    @StateObject var viewModel = HomeViewModel()
    @EnvironmentObject var addressViewModel: AddressViewModel
    @EnvironmentObject var multiCartViewModel: MultiRestaurantCartViewModel
    @State private var showLocationPicker = false
    @State private var searchText = ""
    @State private var showActiveOrder = true
    @State private var selectedCategory: String?
    @State private var showNotifications = false
    @State private var sortOption: SortOption = .recommended

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
        }
        .sheet(isPresented: $showLocationPicker) {
            LocationPickerView(viewModel: addressViewModel, isPresented: $showLocationPicker)
        }
        .sheet(isPresented: $showNotifications) {
            NotificationsView()
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
            NavigationLink(destination: SearchRestaurantsView()) {
                HStack(spacing: 12) {
                    Image(systemName: "magnifyingglass")
                        .foregroundColor(.gray)
                    Text("Search restaurants or dishes...")
                        .foregroundColor(.gray)
                    Spacer()
                    Image(systemName: "mic.fill")
                        .foregroundColor(Theme.brandGreen)
                }
                .padding()
                .background(Color(.systemGray6))
                .cornerRadius(12)
                .padding(.horizontal)
                .padding(.bottom)
            }
            .buttonStyle(.plain)
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

    // MARK: - Multi-Restaurant Promo Banner
    private var multiRestaurantPromoBanner: some View {
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
                    Text("Est. arrival: 20-25 mins")
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
