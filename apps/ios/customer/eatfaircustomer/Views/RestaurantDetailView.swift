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
    
    /*
    // Mock Menu Items for now
    let menuItems = [
        MenuItem(name: "Garlic Naan", description: "Leavened white bread topped with garlic & cilantro", price: 5.0, imageUrl: "naan"),
        MenuItem(name: "Chicken Tikka Masala", description: "Roasted breast of chicken in creamy sauce", price: 24.0, imageUrl: "tikka"),
        MenuItem(name: "Saffron Rice", description: "Basmati rice cooked with saffron", price: 5.0, imageUrl: "rice"),
        MenuItem(name: "Mixed Green Salad", description: "Fresh garden vegetables", price: 8.0, imageUrl: "salad")
    ]
    */
    
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
                                .foregroundColor(.white)
                                .padding()
                                .background(Circle().fill(Theme.brandBlack.opacity(0.5)))
                        }
                        Spacer()
                        Button(action: {}) {
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
                        Rectangle()
                            .fill(Color.gray)
                            .overlay(
                                Image(systemName: "photo")
                                    .resizable()
                                    .aspectRatio(contentMode: .fit)
                                    .frame(width: 60)
                                    .foregroundColor(.white)
                            )
                    )
                    
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
                }
            }
            
            // Floating Cart Button - Multi-restaurant cart takes priority
            if !multiCartViewModel.items.isEmpty {
                VStack(spacing: 0) {
                    // Multi-restaurant badge if ordering from multiple places
                    if multiCartViewModel.restaurantCount > 1 {
                        HStack(spacing: 4) {
                            Image(systemName: "star.fill")
                                .font(.caption2)
                            Text("Multi-Restaurant Order")
                                .font(.caption2)
                                .fontWeight(.medium)
                        }
                        .padding(.horizontal, 12)
                        .padding(.vertical, 4)
                        .background(Color.orange)
                        .foregroundColor(.white)
                        .cornerRadius(8, corners: [.topLeft, .topRight])
                    }

                    HStack {
                        VStack(alignment: .leading, spacing: 2) {
                            Text("\(multiCartViewModel.totalItemCount) Items")
                                .fontWeight(.bold)
                            if multiCartViewModel.restaurantCount > 1 {
                                Text("\(multiCartViewModel.restaurantCount) restaurants")
                                    .font(.caption2)
                                    .opacity(0.9)
                            }
                        }
                        Spacer()
                        Text("View Cart")
                            .fontWeight(.bold)
                        Spacer()
                        Text("$\(String(format: "%.2f", multiCartViewModel.subtotal))")
                            .fontWeight(.bold)
                    }
                    .padding()
                    .background(Theme.brandGreen)
                    .foregroundColor(.white)
                }
                .cornerRadius(12)
                .padding()
                .shadow(radius: 5)
                .onTapGesture {
                    presentationMode.wrappedValue.dismiss()
                }
            }
        }
        .navigationBarHidden(true)
        .edgesIgnoringSafeArea(.top)
        .alert("Cart Full", isPresented: $showCartFull) {
            Button("OK", role: .cancel) { }
        } message: {
            Text("You can order from up to 3 restaurants at a time. Remove items from another restaurant to add from here.")
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
