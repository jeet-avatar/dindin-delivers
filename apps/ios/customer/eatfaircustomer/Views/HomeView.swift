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

    let categories = [
        ("🍕", "Pizza"),
        ("🍔", "Burgers"),
        ("🍜", "Asian"),
        ("🌮", "Mexican"),
        ("🥗", "Healthy"),
        ("🍣", "Sushi"),
        ("🍝", "Pasta"),
        ("☕", "Cafe")
    ]

    var body: some View {
        ZStack(alignment: .bottom) {
            Theme.brandGrey.edgesIgnoringSafeArea(.all)

            ScrollView(showsIndicators: false) {
                VStack(spacing: 0) {
                    // MARK: - Header
                    headerSection

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
            }

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
                Button(action: {}) {
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
            Text("Categories")
                .font(.headline)
                .padding(.horizontal)
                .padding(.top)

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 16) {
                    ForEach(categories, id: \.1) { emoji, name in
                        CategoryButton(
                            emoji: emoji,
                            name: name,
                            isSelected: selectedCategory == name,
                            action: {
                                withAnimation(.spring(response: 0.3)) {
                                    selectedCategory = selectedCategory == name ? nil : name
                                }
                            }
                        )
                    }
                }
                .padding(.horizontal)
            }
        }
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

            Text("Order from up to 3 restaurants in one delivery! Just $1 per restaurant.")
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
                Button("See All") {}
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
                    Button("Recommended") {}
                    Button("Top Rated") {}
                    Button("Fastest Delivery") {}
                    Button("Nearest") {}
                } label: {
                    HStack(spacing: 4) {
                        Text("Sort")
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
            } else if viewModel.restaurants.isEmpty {
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
        if let category = selectedCategory {
            return viewModel.restaurants.filter {
                $0.cuisine.localizedCaseInsensitiveContains(category)
            }
        }
        return viewModel.restaurants
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
            // Image
            ZStack(alignment: .topTrailing) {
                Rectangle()
                    .fill(
                        LinearGradient(
                            colors: [Color.gray.opacity(0.3), Color.gray.opacity(0.2)],
                            startPoint: .top,
                            endPoint: .bottom
                        )
                    )
                    .frame(width: 200, height: 120)
                    .overlay(
                        Image(systemName: "fork.knife")
                            .font(.title)
                            .foregroundColor(.gray)
                    )

                // Promo Badge
                if restaurant.rating >= 4.5 {
                    Text("⭐ TOP PICK")
                        .font(.caption2)
                        .fontWeight(.bold)
                        .foregroundColor(.white)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(Color.orange)
                        .cornerRadius(4)
                        .padding(8)
                }
            }

            VStack(alignment: .leading, spacing: 4) {
                Text(restaurant.name)
                    .font(.subheadline)
                    .fontWeight(.semibold)
                    .foregroundColor(.primary)
                    .lineLimit(1)

                HStack(spacing: 4) {
                    Image(systemName: "star.fill")
                        .font(.caption2)
                        .foregroundColor(.orange)
                    Text(String(format: "%.1f", restaurant.rating))
                        .font(.caption)
                        .foregroundColor(.secondary)
                    Text("•")
                        .foregroundColor(.gray)
                    Text("\(restaurant.deliveryTime) min")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }

                Text("$1 delivery")
                    .font(.caption2)
                    .foregroundColor(Theme.brandGreen)
            }
            .padding(12)
        }
        .frame(width: 200)
        .background(Color.white)
        .cornerRadius(12)
        .shadow(color: .black.opacity(0.08), radius: 8, x: 0, y: 2)
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
        HStack(spacing: 12) {
            // Image
            ZStack {
                RoundedRectangle(cornerRadius: 12)
                    .fill(Color.gray.opacity(0.2))
                    .frame(width: 100, height: 100)

                Image(systemName: "fork.knife")
                    .font(.title)
                    .foregroundColor(.gray)

                // Items in cart badge
                if hasItemsFromRestaurant {
                    VStack {
                        HStack {
                            Spacer()
                            Image(systemName: "cart.fill")
                                .font(.caption)
                                .foregroundColor(.white)
                                .padding(6)
                                .background(Theme.brandGreen)
                                .clipShape(Circle())
                        }
                        Spacer()
                    }
                    .padding(4)
                }
            }

            VStack(alignment: .leading, spacing: 6) {
                Text(restaurant.name)
                    .font(.headline)
                    .foregroundColor(.primary)

                Text(restaurant.cuisine)
                    .font(.subheadline)
                    .foregroundColor(.secondary)

                HStack(spacing: 12) {
                    HStack(spacing: 4) {
                        Image(systemName: "star.fill")
                            .foregroundColor(.orange)
                        Text(String(format: "%.1f", restaurant.rating))
                            .fontWeight(.medium)
                    }

                    HStack(spacing: 4) {
                        Image(systemName: "clock")
                        Text("\(restaurant.deliveryTime) min")
                    }

                    Text("$1 fee")
                        .foregroundColor(Theme.brandGreen)
                        .fontWeight(.medium)
                }
                .font(.caption)
                .foregroundColor(.gray)

                // Multi-restaurant indicator
                if hasItemsFromRestaurant {
                    Text("Items in cart")
                        .font(.caption2)
                        .fontWeight(.medium)
                        .foregroundColor(Theme.brandGreen)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(Theme.brandGreen.opacity(0.1))
                        .cornerRadius(4)
                }
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
