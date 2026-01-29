import SwiftUI
import EatFairShared

struct RestaurantDetailView: View {
    let restaurant: Restaurant
    @Environment(\.presentationMode) var presentationMode
    @EnvironmentObject var cartViewModel: CartViewModel // Legacy single-restaurant cart
    @EnvironmentObject var multiCartViewModel: MultiRestaurantCartViewModel // Multi-restaurant cart

    @StateObject var menuViewModel = MenuViewModel()
    @State private var selectedItem: MenuItem? = nil
    @State private var showMultiRestaurantAlert = false
    @State private var showCartFull = false
    @State private var showMenuSearch = false
    @State private var menuSearchText = ""

    // Promotions state
    @State private var activePromotions: [P2PCustomerPromotion] = []
    @State private var isLoadingPromotions = false

    // Placeholder for restaurant header image
    private var restaurantPlaceholder: some View {
        Rectangle()
            .fill(Color.gray.opacity(0.3))
            .overlay(
                Image(systemName: "fork.knife")
                    .resizable()
                    .aspectRatio(contentMode: .fit)
                    .frame(width: 60)
                    .foregroundColor(.white.opacity(0.5))
            )
    }

    var body: some View {
        ZStack(alignment: .bottom) { // Align content to bottom for the floating cart
            Color.white.edgesIgnoringSafeArea(.all)
            
            ScrollView {
                VStack(spacing: 0) {
                    // Header
                    HStack {
                        Button(action: { presentationMode.wrappedValue.dismiss() }) {
                            Image(systemName: "arrow.left")
                                .font(.title2)
                                .fontWeight(.bold)
                                .foregroundColor(.white)
                                .padding(12)
                                .background(Circle().fill(Theme.brandBlack.opacity(0.7)))
                                .overlay(Circle().stroke(Color.white.opacity(0.3), lineWidth: 1))
                        }
                        Spacer()
                        Button(action: { showMenuSearch = true }) {
                            Image(systemName: "magnifyingglass")
                                .font(.title2)
                                .foregroundColor(.white)
                                .padding()
                                .background(Circle().fill(Theme.brandBlack.opacity(0.5)))
                        }
                    }
                    .padding(.top, 40)
                    .padding(.horizontal)
                    .frame(height: 250)
                    .background(
                        Group {
                            if !restaurant.imageUrl.isEmpty,
                               let url = URL(string: restaurant.imageUrl) {
                                AsyncImage(url: url) { phase in
                                    switch phase {
                                    case .success(let image):
                                        image
                                            .resizable()
                                            .aspectRatio(contentMode: .fill)
                                    case .failure(_):
                                        restaurantPlaceholder
                                    case .empty:
                                        ProgressView()
                                            .frame(maxWidth: .infinity, maxHeight: .infinity)
                                            .background(Color.gray.opacity(0.3))
                                    @unknown default:
                                        restaurantPlaceholder
                                    }
                                }
                            } else {
                                restaurantPlaceholder
                            }
                        }
                    )
                    .clipped()
                    
                    // Restaurant Info
                    VStack(alignment: .leading, spacing: 8) {
                        Text(restaurant.name)
                            .font(.title)
                            .fontWeight(.bold)

                        Text(restaurant.cuisine)
                            .font(.subheadline)
                            .foregroundColor(Theme.brandGreen)

                        HStack {
                            Label(String(format: "%.1f", restaurant.rating), systemImage: "star.fill")
                                .foregroundColor(Theme.brandGreen)
                            Text("•")
                            Label("\(restaurant.deliveryTime)", systemImage: "clock")
                            Text("•")
                            Text("Free Delivery")
                        }
                        .font(.caption)
                        .foregroundColor(.gray)

                        Divider()
                            .padding(.vertical, 4)

                        // Address
                        if !restaurant.address.isEmpty {
                            HStack(alignment: .top, spacing: 8) {
                                Image(systemName: "location.fill")
                                    .foregroundColor(Theme.brandGreen)
                                    .frame(width: 20)
                                Text(restaurant.address)
                                    .font(.subheadline)
                                    .foregroundColor(.secondary)
                            }
                        }

                        // Phone
                        if !restaurant.phone.isEmpty {
                            HStack(spacing: 8) {
                                Image(systemName: "phone.fill")
                                    .foregroundColor(Theme.brandGreen)
                                    .frame(width: 20)
                                Text(restaurant.phone)
                                    .font(.subheadline)
                                    .foregroundColor(.secondary)
                            }
                        }
                    }
                    .padding()
                    .background(Color.white)
                    .frame(maxWidth: .infinity, alignment: .leading)

                    // Active Promotions Section
                    if !activePromotions.isEmpty {
                        VStack(alignment: .leading, spacing: 12) {
                            HStack {
                                Image(systemName: "tag.fill")
                                    .foregroundColor(.orange)
                                Text("Available Deals")
                                    .font(.headline)
                                    .fontWeight(.bold)
                                Spacer()
                            }
                            .padding(.horizontal)
                            .padding(.top)

                            ScrollView(.horizontal, showsIndicators: false) {
                                HStack(spacing: 12) {
                                    ForEach(activePromotions) { promo in
                                        RestaurantPromotionCard(promotion: promo)
                                    }
                                }
                                .padding(.horizontal)
                            }
                        }
                        .padding(.bottom)
                        .background(Color.white)
                    }

                    // Menu List
                    VStack(alignment: .leading, spacing: 20) {
                        Text("Featured Items")
                            .font(.title2)
                            .fontWeight(.bold)
                            .padding(.horizontal)
                        
                        if menuViewModel.isLoading {
                            ProgressView()
                                .frame(maxWidth: .infinity)
                                .padding()
                        } else if menuViewModel.menuItems.isEmpty {
                            Text("No menu items available.")
                                .foregroundColor(.gray)
                                .padding()
                        } else {
                            ForEach(menuViewModel.menuItems) { item in
                                MenuItemCard(item: item) {
                                    selectedItem = item
                                }
                            }
                        }
                    }
                    .padding(.vertical)
                    .padding(.bottom, multiCartViewModel.items.isEmpty ? 0 : 100) // Add padding for floating cart
                }
            }
            .sheet(item: $selectedItem) { item in
                // Use enhanced customization view with modifiers, quantity, special instructions
                MenuItemCustomizationView(
                    item: item,
                    restaurant: restaurant,
                    multiCartViewModel: multiCartViewModel,
                    isPresented: Binding(
                        get: { selectedItem != nil },
                        set: { if !$0 { selectedItem = nil } }
                    )
                )
            }
            .onAppear {
                if let id = restaurant.id {
                    menuViewModel.fetchMenu(for: id)
                    fetchPromotions(for: id)
                }
            }
            
            // Floating Cart Button removed - MainAppView's floating cart handles this
            // to avoid duplicate overlapping cart buttons
        }
        .navigationBarHidden(true)
        .edgesIgnoringSafeArea(.top)
        .alert("Cart Full", isPresented: $showCartFull) {
            Button("OK", role: .cancel) { }
        } message: {
            Text("You can order from up to 3 restaurants at a time. Remove items from another restaurant to add from here.")
        }
        .sheet(isPresented: $showMenuSearch) {
            MenuSearchSheet(
                menuItems: menuViewModel.menuItems,
                searchText: $menuSearchText,
                onSelectItem: { item in
                    showMenuSearch = false
                    selectedItem = item
                }
            )
        }
    }

    // MARK: - Fetch Promotions
    private func fetchPromotions(for restaurantId: String) {
        isLoadingPromotions = true

        // Fetch active promotions and filter by this restaurant
        P2PAPIService.shared.getActivePromotions { result in
            isLoadingPromotions = false

            switch result {
            case .success(let response):
                // Filter promotions for this restaurant (using numeric vendor_id from backend)
                // The restaurant.id from Firebase might be a string, need to match with vendorId
                if let vendorIdInt = Int(restaurantId) {
                    activePromotions = response.promotions.filter { $0.vendorId == vendorIdInt }
                } else {
                    // Fallback: match by vendor name if available
                    activePromotions = response.promotions.filter {
                        $0.vendorName.lowercased() == restaurant.name.lowercased()
                    }
                }
            case .failure(let error):
                #if DEBUG
                print("[RestaurantDetail] Failed to fetch promotions: \(error)")
                #endif
                activePromotions = []
            }
        }
    }
}

// MARK: - Restaurant Promotion Card
struct RestaurantPromotionCard: View {
    let promotion: P2PCustomerPromotion

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            // Promo type badge
            HStack {
                Text(promoHeadline)
                    .font(.headline)
                    .fontWeight(.bold)
                    .foregroundColor(.white)
                Spacer()
            }

            Text(promotion.name)
                .font(.subheadline)
                .foregroundColor(.white.opacity(0.9))

            if let desc = promotion.description, !desc.isEmpty {
                Text(desc)
                    .font(.caption)
                    .foregroundColor(.white.opacity(0.8))
                    .lineLimit(2)
            }

            HStack {
                // Code badge
                HStack(spacing: 4) {
                    Image(systemName: "ticket.fill")
                        .font(.caption2)
                    Text(promotion.promotionCode)
                        .font(.caption)
                        .fontWeight(.semibold)
                }
                .padding(.horizontal, 8)
                .padding(.vertical, 4)
                .background(Color.white.opacity(0.3))
                .cornerRadius(6)

                Spacer()

                // Min order if applicable
                if let minOrder = promotion.minOrderAmount, minOrder > 0 {
                    Text("Min $\(String(format: "%.0f", minOrder))")
                        .font(.caption2)
                        .foregroundColor(.white.opacity(0.8))
                }
            }
        }
        .padding()
        .frame(width: 220)
        .background(
            LinearGradient(
                colors: gradientColors,
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        )
        .cornerRadius(16)
        .shadow(color: gradientColors[0].opacity(0.3), radius: 8, x: 0, y: 4)
    }

    private var promoHeadline: String {
        switch promotion.type {
        case "percentage":
            return "\(Int(promotion.value))% OFF"
        case "flat_amount":
            return "$\(String(format: "%.0f", promotion.value)) OFF"
        case "free_delivery":
            return "FREE DELIVERY"
        case "bogo":
            return "BUY 1 GET 1"
        default:
            return promotion.name.uppercased()
        }
    }

    private var gradientColors: [Color] {
        switch promotion.type {
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

// MARK: - Menu Search Sheet
struct MenuSearchSheet: View {
    let menuItems: [MenuItem]
    @Binding var searchText: String
    let onSelectItem: (MenuItem) -> Void
    @Environment(\.dismiss) var dismiss

    var filteredItems: [MenuItem] {
        if searchText.isEmpty {
            return menuItems
        }
        return menuItems.filter {
            $0.name.localizedCaseInsensitiveContains(searchText) ||
            $0.description.localizedCaseInsensitiveContains(searchText)
        }
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Search Bar
                HStack(spacing: 12) {
                    Image(systemName: "magnifyingglass")
                        .foregroundColor(.gray)

                    TextField("Search menu items...", text: $searchText)
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

                if filteredItems.isEmpty {
                    Spacer()
                    VStack(spacing: 12) {
                        Image(systemName: "magnifyingglass")
                            .font(.system(size: 50))
                            .foregroundColor(.gray.opacity(0.5))
                        Text("No items found")
                            .font(.headline)
                        Text("Try a different search term")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                    }
                    Spacer()
                } else {
                    List(filteredItems) { item in
                        Button(action: { onSelectItem(item) }) {
                            HStack {
                                VStack(alignment: .leading, spacing: 4) {
                                    Text(item.name)
                                        .font(.headline)
                                        .foregroundColor(.primary)
                                    Text(item.description)
                                        .font(.caption)
                                        .foregroundColor(.secondary)
                                        .lineLimit(2)
                                }
                                Spacer()
                                Text("$\(String(format: "%.2f", item.price))")
                                    .font(.subheadline)
                                    .fontWeight(.semibold)
                                    .foregroundColor(Theme.brandGreen)
                            }
                            .padding(.vertical, 4)
                        }
                    }
                    .listStyle(.plain)
                }
            }
            .navigationTitle("Search Menu")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") { dismiss() }
                }
            }
        }
    }
}

// Helper extension for corner-specific rounding
extension View {
    func cornerRadius(_ radius: CGFloat, corners: UIRectCorner) -> some View {
        clipShape(RoundedCorner(radius: radius, corners: corners))
    }
}

struct RoundedCorner: Shape {
    var radius: CGFloat = .infinity
    var corners: UIRectCorner = .allCorners

    func path(in rect: CGRect) -> Path {
        let path = UIBezierPath(
            roundedRect: rect,
            byRoundingCorners: corners,
            cornerRadii: CGSize(width: radius, height: radius)
        )
        return Path(path.cgPath)
    }
}

struct MenuItemCard: View {
    let item: MenuItem
    var onAdd: () -> Void
    @State private var showDetail = false

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            VStack(alignment: .leading, spacing: 5) {
                Text(item.name.uppercased())
                    .font(.headline)
                    .fontWeight(.bold)
                    .foregroundColor(Theme.brandBlack)

                Text(item.description)
                    .font(.caption)
                    .foregroundColor(Theme.textGrey)
                    .lineLimit(2)

                Text("$\(String(format: "%.2f", item.price))")
                    .font(.subheadline)
                    .fontWeight(.bold)
                    .foregroundColor(Theme.brandBlack)
                    .padding(.top, 5)

                // Add Button
                Button(action: onAdd) {
                    Text("ADD")
                        .font(.caption)
                        .fontWeight(.bold)
                        .padding(.horizontal, 20)
                        .padding(.vertical, 8)
                        .background(Theme.brandWhite)
                        .foregroundColor(Theme.brandGreen)
                        .overlay(
                            RoundedRectangle(cornerRadius: 4)
                                .stroke(Theme.brandGreen, lineWidth: 1)
                        )
                        .cornerRadius(4)
                        .shadow(radius: 1)
                }
                .padding(.top, 4)
            }

            Spacer()

            // Menu Item Image
            if let imageUrlString = item.imageUrl, !imageUrlString.isEmpty,
               let url = URL(string: imageUrlString) {
                AsyncImage(url: url) { phase in
                    switch phase {
                    case .empty:
                        ProgressView()
                            .frame(width: 100, height: 100)
                    case .success(let image):
                        image
                            .resizable()
                            .aspectRatio(contentMode: .fill)
                            .frame(width: 100, height: 100)
                            .clipShape(RoundedRectangle(cornerRadius: 8))
                    case .failure:
                        Image(systemName: "fork.knife")
                            .font(.system(size: 30))
                            .foregroundColor(.gray)
                            .frame(width: 100, height: 100)
                            .background(Color.gray.opacity(0.1))
                            .clipShape(RoundedRectangle(cornerRadius: 8))
                    @unknown default:
                        EmptyView()
                    }
                }
            } else {
                // Placeholder when no image URL
                Image(systemName: "fork.knife")
                    .font(.system(size: 30))
                    .foregroundColor(.gray)
                    .frame(width: 100, height: 100)
                    .background(Color.gray.opacity(0.1))
                    .clipShape(RoundedRectangle(cornerRadius: 8))
            }
        }
        .padding()
        .background(Color.white)
        .cornerRadius(12)
        .shadow(color: Color.black.opacity(0.05), radius: 5, x: 0, y: 2)
        .padding(.horizontal)
    }
}

struct MenuItemDetailSheet: View {
    let item: MenuItem
    let restaurant: Restaurant
    @ObservedObject var multiCartViewModel: MultiRestaurantCartViewModel
    @Binding var isPresented: Bool

    @State private var spiceLevel = "Medium"
    @State private var showCartFullError = false
    let spiceLevels = ["Mild", "Medium", "Spicy", "Extra Spicy"]

    var body: some View {
        VStack(spacing: 20) {
            Capsule()
                .fill(Color.gray.opacity(0.5))
                .frame(width: 40, height: 5)
                .padding(.top)

            Text(item.name)
                .font(.title)
                .fontWeight(.bold)
                .multilineTextAlignment(.center)

            Text(item.description)
                .foregroundColor(.gray)
                .multilineTextAlignment(.center)
                .padding(.horizontal)

            // Multi-restaurant info badge - only show if cart has items from OTHER restaurants
            let currentRestaurantId = restaurant.id ?? UUID().uuidString
            if multiCartViewModel.restaurantCount > 0 && !multiCartViewModel.hasRestaurant(currentRestaurantId) {
                HStack(spacing: 8) {
                    Image(systemName: "info.circle.fill")
                        .foregroundColor(.orange)
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Adding from a new restaurant")
                            .font(.caption)
                            .fontWeight(.medium)
                        Text("\(multiCartViewModel.restaurantCount)/3 restaurants in cart")
                            .font(.caption2)
                            .foregroundColor(.secondary)
                    }
                    Spacer()
                }
                .padding()
                .background(Color.orange.opacity(0.1))
                .cornerRadius(8)
                .padding(.horizontal)
            }

            Divider()

            Text("Choose Spice Level")
                .font(.headline)

            Picker("Spice Level", selection: $spiceLevel) {
                ForEach(spiceLevels, id: \.self) { level in
                    Text(level)
                }
            }
            .pickerStyle(SegmentedPickerStyle())
            .padding()

            Spacer()

            Button(action: {
                var newItem = item
                newItem.selectedSpiceLevel = spiceLevel
                let success = multiCartViewModel.addToCart(item: newItem, from: restaurant)
                if success {
                    isPresented = false
                } else {
                    showCartFullError = true
                }
            }) {
                HStack {
                    Text("Add to Cart - $\(String(format: "%.2f", item.price))")
                        .fontWeight(.bold)
                    if multiCartViewModel.restaurantCount > 0 {
                        Text("•")
                        Text("\(multiCartViewModel.totalItemCount + 1) items")
                            .font(.caption)
                    }
                }
                .foregroundColor(.white)
                .frame(maxWidth: .infinity)
                .padding()
                .background(Theme.brandGreen)
                .cornerRadius(10)
            }
            .padding()
            .padding(.bottom, 20)
        }
        .background(Color.white)
        .cornerRadius(20)
        .alert("Cart Full", isPresented: $showCartFullError) {
            Button("OK", role: .cancel) { }
        } message: {
            Text("You can order from up to 3 restaurants. Remove items from another restaurant first.")
        }
    }
}
