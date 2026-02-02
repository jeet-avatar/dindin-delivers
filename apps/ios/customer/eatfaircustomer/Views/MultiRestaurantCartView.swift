import SwiftUI
import EatFairShared

// MARK: - Multi-Restaurant Cart View
struct MultiRestaurantCartView: View {
    @ObservedObject var cartVM: MultiRestaurantCartViewModel
    @State private var selectedTipPercentage: Double = 20
    @State private var customTip: String = ""
    @State private var useCustomTip = false
    @State private var showCheckout = false
    @State private var showScheduleDelivery = false
    @State private var scheduledDate: Date?
    @State private var isScheduledDelivery = false

    private var currentTip: Double {
        if useCustomTip, let tip = Double(customTip) {
            return tip
        }
        return cartVM.subtotal * (selectedTipPercentage / 100)
    }

    /// Dynamic ETA calculation based on number of restaurants
    private var estimatedDeliveryTime: String {
        // Base time: 15-25 min for single restaurant
        // Add 10-15 min per additional restaurant for pickup
        let baseMin = 15
        let baseMax = 25
        let additionalPerRestaurant = 12

        let restaurantCount = cartVM.restaurantCount
        let minTime = baseMin + (max(0, restaurantCount - 1) * additionalPerRestaurant)
        let maxTime = baseMax + (max(0, restaurantCount - 1) * additionalPerRestaurant)

        return "\(minTime)-\(maxTime) min"
    }

    var body: some View {
        Group {
            // Don't show empty cart if order was just placed (cart sheet is dismissing)
            if cartVM.items.isEmpty && !cartVM.orderPlaced {
                emptyCartView
            } else if !cartVM.items.isEmpty {
                cartContentView
            } else {
                // Order just placed, show processing message briefly
                VStack {
                    ProgressView()
                    Text("Processing order...")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                        .padding(.top, 8)
                }
            }
        }
        .navigationTitle("Your Cart")
        .navigationBarTitleDisplayMode(.large)
    }

    // MARK: - Empty Cart
    private var emptyCartView: some View {
        VStack(spacing: 24) {
            Spacer()

            Image(systemName: "cart")
                .font(.system(size: 80))
                .foregroundColor(.gray.opacity(0.5))

            VStack(spacing: 8) {
                Text("Your cart is empty")
                    .font(.title2)
                    .fontWeight(.bold)

                Text("Add items from up to 3 restaurants\nto create your perfect order!")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                    .multilineTextAlignment(.center)
            }

            Spacer()
        }
        .padding()
    }

    // MARK: - Cart Content
    private var cartContentView: some View {
        VStack(spacing: 0) {
            ScrollView {
                VStack(spacing: 16) {
                    // Multi-Restaurant Badge
                    if cartVM.restaurantCount > 1 {
                        multiRestaurantBadge
                    }

                    // Restaurant slots indicator
                    restaurantSlotsIndicator

                    // Items grouped by restaurant
                    ForEach(cartVM.orderedRestaurants, id: \.id) { restaurant in
                        RestaurantCartSection(
                            restaurant: restaurant,
                            items: cartVM.itemsByRestaurant[restaurant.id ?? ""] ?? [],
                            subtotal: cartVM.subtotal(for: restaurant.id ?? ""),
                            onRemoveItem: { itemId in
                                cartVM.removeItem(withId: itemId)
                            },
                            onUpdateQuantity: { itemId, quantity in
                                cartVM.updateQuantity(for: itemId, quantity: quantity)
                            },
                            onRemoveRestaurant: {
                                cartVM.removeRestaurant(restaurant.id ?? "")
                            }
                        )
                    }

                    // Schedule Delivery Section
                    deliveryTimeSection

                    // Tip Selection
                    tipSelectionSection

                    // Order Summary
                    orderSummarySection
                }
                .padding()
            }

            // Checkout Button
            checkoutButton
        }
        .alert("Error", isPresented: $cartVM.showError) {
            Button("OK", role: .cancel) { }
        } message: {
            Text(cartVM.errorMessage ?? "An error occurred")
        }
        .sheet(isPresented: $showCheckout, onDismiss: {
            #if DEBUG
            print("[OrderFlow] Checkout sheet dismissed, orderPlaced = \(cartVM.orderPlaced)")
            #endif
        }) {
            MultiRestaurantCheckoutView(cartVM: cartVM, scheduledDate: scheduledDate)
        }
        .onChange(of: cartVM.orderPlaced) { _, newValue in
            if newValue {
                #if DEBUG
                print("[OrderFlow] CartView detected orderPlaced = true, dismissing checkout")
                #endif
                // Dismiss checkout sheet when order is placed
                showCheckout = false
            }
        }
        .sheet(isPresented: $showScheduleDelivery) {
            ScheduleDeliveryView(
                selectedDate: $scheduledDate,
                isScheduled: $isScheduledDelivery
            )
        }
    }

    // MARK: - Multi-Restaurant Badge
    private var multiRestaurantBadge: some View {
        HStack(spacing: 12) {
            Image(systemName: "star.fill")
                .foregroundColor(.yellow)

            VStack(alignment: .leading, spacing: 2) {
                Text("Multi-Restaurant Order")
                    .font(.headline)
                    .foregroundColor(.white)

                Text("Higher tip suggested - driver picks up from \(cartVM.restaurantCount) locations")
                    .font(.caption)
                    .foregroundColor(.white.opacity(0.9))
            }

            Spacer()

            Text("+$\(String(format: "%.0f", cartVM.driverBonus))")
                .font(.title3)
                .fontWeight(.bold)
                .foregroundColor(.white)
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
    }

    // MARK: - Restaurant Slots Indicator
    private var restaurantSlotsIndicator: some View {
        VStack(spacing: 8) {
            HStack(spacing: 4) {
                ForEach(0..<cartVM.maxRestaurants, id: \.self) { index in
                    RoundedRectangle(cornerRadius: 4)
                        .fill(index < cartVM.restaurantCount ? Color.green : Color.gray.opacity(0.3))
                        .frame(height: 6)
                }
            }

            HStack {
                Text("\(cartVM.restaurantCount)/\(cartVM.maxRestaurants) restaurants")
                    .font(.caption)
                    .foregroundColor(.secondary)

                Spacer()

                if cartVM.canAddMoreRestaurants {
                    Text("Add \(cartVM.maxRestaurants - cartVM.restaurantCount) more")
                        .font(.caption)
                        .foregroundColor(.green)
                } else {
                    Text("Maximum reached")
                        .font(.caption)
                        .foregroundColor(.orange)
                }
            }
        }
        .padding(.horizontal)
    }

    // MARK: - Delivery Time Section
    private var deliveryTimeSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: "clock.fill")
                    .foregroundColor(.blue)
                Text("Delivery Time")
                    .font(.headline)
                Spacer()
            }

            HStack(spacing: 12) {
                // ASAP Option
                Button(action: {
                    isScheduledDelivery = false
                    scheduledDate = nil
                }) {
                    HStack {
                        Image(systemName: isScheduledDelivery ? "circle" : "checkmark.circle.fill")
                            .foregroundColor(isScheduledDelivery ? .gray : Theme.brandGreen)

                        VStack(alignment: .leading, spacing: 2) {
                            Text("ASAP")
                                .font(.subheadline)
                                .fontWeight(.medium)
                            Text(estimatedDeliveryTime)
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                    }
                    .padding()
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(isScheduledDelivery ? Color.gray.opacity(0.1) : Theme.brandGreen.opacity(0.1))
                    .cornerRadius(12)
                    .overlay(
                        RoundedRectangle(cornerRadius: 12)
                            .stroke(isScheduledDelivery ? Color.clear : Theme.brandGreen, lineWidth: 2)
                    )
                }
                .foregroundColor(.primary)

                // Schedule Option
                Button(action: {
                    showScheduleDelivery = true
                }) {
                    HStack {
                        Image(systemName: isScheduledDelivery ? "checkmark.circle.fill" : "circle")
                            .foregroundColor(isScheduledDelivery ? Theme.brandGreen : .gray)

                        VStack(alignment: .leading, spacing: 2) {
                            Text("Schedule")
                                .font(.subheadline)
                                .fontWeight(.medium)
                            if let date = scheduledDate {
                                Text(date, style: .time)
                                    .font(.caption)
                                    .foregroundColor(Theme.brandGreen)
                            } else {
                                Text("Pick a time")
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }
                        }
                    }
                    .padding()
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(isScheduledDelivery ? Theme.brandGreen.opacity(0.1) : Color.gray.opacity(0.1))
                    .cornerRadius(12)
                    .overlay(
                        RoundedRectangle(cornerRadius: 12)
                            .stroke(isScheduledDelivery ? Theme.brandGreen : Color.clear, lineWidth: 2)
                    )
                }
                .foregroundColor(.primary)
            }

            // Show scheduled badge if scheduled
            if isScheduledDelivery, let date = scheduledDate {
                ScheduleBadge(date: date)
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(16)
        .shadow(color: .black.opacity(0.05), radius: 8, x: 0, y: 2)
    }

    // MARK: - Tip Selection
    private var tipSelectionSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: "heart.fill")
                    .foregroundColor(.red)
                Text("Tip Your Driver")
                    .font(.headline)

                Spacer()

                if cartVM.restaurantCount > 1 {
                    Text("Multi-stop bonus!")
                        .font(.caption)
                        .foregroundColor(.orange)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(Color.orange.opacity(0.1))
                        .cornerRadius(8)
                }
            }

            Text("Driver receives 100% of your tip")
                .font(.caption)
                .foregroundColor(.secondary)

            // Tip percentage buttons
            HStack(spacing: 8) {
                ForEach(cartVM.tipPercentages, id: \.self) { percentage in
                    CartTipButton(
                        percentage: percentage,
                        amount: cartVM.subtotal * (percentage / 100),
                        isSelected: !useCustomTip && selectedTipPercentage == percentage,
                        onTap: {
                            useCustomTip = false
                            selectedTipPercentage = percentage
                        }
                    )
                }

                // Custom tip button
                Button(action: { useCustomTip.toggle() }) {
                    VStack(spacing: 4) {
                        Text("Custom")
                            .font(.caption)
                            .fontWeight(.medium)

                        if useCustomTip {
                            TextField("$0", text: $customTip)
                                .keyboardType(.decimalPad)
                                .multilineTextAlignment(.center)
                                .font(.subheadline)
                                .fontWeight(.bold)
                                .frame(width: 50)
                        } else {
                            Text("$...")
                                .font(.subheadline)
                                .fontWeight(.bold)
                        }
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
                    .background(useCustomTip ? Color.green.opacity(0.2) : Color.gray.opacity(0.1))
                    .cornerRadius(12)
                    .overlay(
                        RoundedRectangle(cornerRadius: 12)
                            .stroke(useCustomTip ? Color.green : Color.clear, lineWidth: 2)
                    )
                }
                .foregroundColor(useCustomTip ? .green : .primary)
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(16)
        .shadow(color: .black.opacity(0.05), radius: 8, x: 0, y: 2)
    }

    // MARK: - Order Summary
    private var orderSummarySection: some View {
        VStack(spacing: 12) {
            HStack {
                Image(systemName: "receipt")
                    .foregroundColor(.blue)
                Text("Order Summary")
                    .font(.headline)
                Spacer()
            }

            VStack(spacing: 8) {
                CartSummaryRow(label: "Subtotal", value: cartVM.subtotal)

                CartSummaryRow(
                    label: "Platform Fee (\(cartVM.restaurantCount) restaurant\(cartVM.restaurantCount > 1 ? "s" : ""))",
                    value: cartVM.platformFee,
                    info: "$\(String(format: "%.2f", AppConfig.shared.platformFeePerRestaurant)) per restaurant"
                )

                CartSummaryRow(
                    label: "Delivery Fee",
                    value: cartVM.deliveryFee,
                    info: cartVM.restaurantCount > 1 ? "Includes multi-stop" : nil
                )

                CartSummaryRow(label: "Tax (\(String(format: "%.1f", AppConfig.shared.taxRate * 100))%)", value: cartVM.tax)

                CartSummaryRow(label: "Tip", value: currentTip)

                Divider()

                HStack {
                    Text("Total")
                        .font(.title3)
                        .fontWeight(.bold)

                    Spacer()

                    Text("$\(String(format: "%.2f", cartVM.total(withTip: currentTip)))")
                        .font(.title2)
                        .fontWeight(.bold)
                        .foregroundColor(.green)
                }
            }

            // Driver earnings breakdown
            if cartVM.restaurantCount > 1 {
                VStack(spacing: 4) {
                    Divider()
                    HStack {
                        Image(systemName: "car.fill")
                            .foregroundColor(.blue)
                        Text("Driver earns:")
                            .font(.caption)
                            .foregroundColor(.secondary)
                        Spacer()
                        Text("$\(String(format: "%.2f", cartVM.deliveryFee + currentTip))")
                            .font(.subheadline)
                            .fontWeight(.semibold)
                            .foregroundColor(.blue)
                    }
                    Text("100% of delivery fee + 100% of tip")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                        .frame(maxWidth: .infinity, alignment: .trailing)
                }
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(16)
        .shadow(color: .black.opacity(0.05), radius: 8, x: 0, y: 2)
    }

    // MARK: - Checkout Button
    private var checkoutButton: some View {
        VStack(spacing: 0) {
            Divider()

            Button(action: { showCheckout = true }) {
                HStack {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("\(cartVM.totalItemCount) items from \(cartVM.restaurantCount) restaurant\(cartVM.restaurantCount > 1 ? "s" : "")")
                            .font(.caption)
                            .foregroundColor(.white.opacity(0.9))

                        Text("Proceed to Checkout")
                            .font(.headline)
                            .foregroundColor(.white)
                    }

                    Spacer()

                    Text("$\(String(format: "%.2f", cartVM.total(withTip: currentTip)))")
                        .font(.title3)
                        .fontWeight(.bold)
                        .foregroundColor(.white)

                    Image(systemName: "chevron.right")
                        .foregroundColor(.white)
                }
                .padding()
                .background(Color.green)
                .cornerRadius(16)
            }
            .padding()
        }
        .background(Color(.systemBackground))
    }
}

// MARK: - Restaurant Cart Section
struct RestaurantCartSection: View {
    let restaurant: Restaurant
    let items: [CartItem]
    let subtotal: Double
    let onRemoveItem: (String) -> Void
    let onUpdateQuantity: (String, Int) -> Void
    let onRemoveRestaurant: () -> Void

    @State private var isExpanded = true

    var body: some View {
        VStack(spacing: 0) {
            // Restaurant Header
            Button(action: { withAnimation { isExpanded.toggle() } }) {
                HStack(spacing: 12) {
                    // Restaurant icon
                    ZStack {
                        Circle()
                            .fill(Color.orange.opacity(0.2))
                            .frame(width: 44, height: 44)

                        Image(systemName: "fork.knife")
                            .foregroundColor(.orange)
                    }

                    VStack(alignment: .leading, spacing: 2) {
                        Text(restaurant.name)
                            .font(.headline)
                            .foregroundColor(.primary)

                        Text("\(items.count) item\(items.count > 1 ? "s" : "") • $\(String(format: "%.2f", subtotal))")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }

                    Spacer()

                    // Remove restaurant button
                    Button(action: onRemoveRestaurant) {
                        Image(systemName: "trash")
                            .foregroundColor(.red)
                            .padding(8)
                    }

                    Image(systemName: isExpanded ? "chevron.up" : "chevron.down")
                        .foregroundColor(.secondary)
                        .font(.caption)
                }
                .padding()
            }
            .buttonStyle(.plain)

            // Items
            if isExpanded {
                VStack(spacing: 0) {
                    Divider().padding(.horizontal)

                    ForEach(items) { item in
                        CartItemRow(
                            item: item,
                            onRemove: { onRemoveItem(item.id) },
                            onUpdateQuantity: { quantity in
                                onUpdateQuantity(item.id, quantity)
                            }
                        )

                        if item.id != items.last?.id {
                            Divider().padding(.horizontal)
                        }
                    }
                }
            }
        }
        .background(Color(.systemBackground))
        .cornerRadius(16)
        .shadow(color: .black.opacity(0.05), radius: 8, x: 0, y: 2)
    }
}

// MARK: - Cart Item Row
struct CartItemRow: View {
    let item: CartItem
    let onRemove: () -> Void
    let onUpdateQuantity: (Int) -> Void

    var body: some View {
        HStack(spacing: 12) {
            // Item image placeholder
            RoundedRectangle(cornerRadius: 8)
                .fill(Color.gray.opacity(0.2))
                .frame(width: 60, height: 60)
                .overlay(
                    Image(systemName: "photo")
                        .foregroundColor(.gray)
                )

            VStack(alignment: .leading, spacing: 4) {
                Text(item.name)
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .lineLimit(2)

                // Display customizations if any
                if let customizationSummary = item.customizationSummary {
                    Text(customizationSummary)
                        .font(.caption)
                        .foregroundColor(.secondary)
                        .lineLimit(2)
                }

                // Display spice level if set
                if let spiceLevel = item.spiceLevel {
                    HStack(spacing: 4) {
                        Image(systemName: "flame.fill")
                            .font(.caption2)
                            .foregroundColor(.orange)
                        Text(spiceLevel)
                            .font(.caption)
                            .foregroundColor(.orange)
                    }
                }

                // Show total price including customizations
                Text("$\(String(format: "%.2f", item.totalPrice))")
                    .font(.subheadline)
                    .foregroundColor(Theme.brandGreen)
                    .fontWeight(.semibold)
            }

            Spacer()

            // Quantity stepper
            HStack(spacing: 0) {
                Button(action: {
                    if item.quantity > 1 {
                        onUpdateQuantity(item.quantity - 1)
                    } else {
                        onRemove()
                    }
                }) {
                    Image(systemName: item.quantity == 1 ? "trash" : "minus")
                        .font(.caption)
                        .foregroundColor(item.quantity == 1 ? .red : .primary)
                        .frame(width: 32, height: 32)
                        .background(Color.gray.opacity(0.1))
                }

                Text("\(item.quantity)")
                    .font(.subheadline)
                    .fontWeight(.semibold)
                    .frame(width: 32)

                Button(action: { onUpdateQuantity(item.quantity + 1) }) {
                    Image(systemName: "plus")
                        .font(.caption)
                        .foregroundColor(.green)
                        .frame(width: 32, height: 32)
                        .background(Color.green.opacity(0.1))
                }
            }
            .cornerRadius(8)
        }
        .padding()
    }
}

// MARK: - Cart Tip Button
struct CartTipButton: View {
    let percentage: Double
    let amount: Double
    let isSelected: Bool
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            VStack(spacing: 4) {
                Text("\(Int(percentage))%")
                    .font(.caption)
                    .fontWeight(.medium)

                Text("$\(String(format: "%.2f", amount))")
                    .font(.subheadline)
                    .fontWeight(.bold)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 12)
            .background(isSelected ? Color.green.opacity(0.2) : Color.gray.opacity(0.1))
            .cornerRadius(12)
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(isSelected ? Color.green : Color.clear, lineWidth: 2)
            )
        }
        .foregroundColor(isSelected ? .green : .primary)
    }
}

// MARK: - Cart Summary Row
struct CartSummaryRow: View {
    let label: String
    let value: Double
    var info: String? = nil

    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 2) {
                Text(label)
                    .font(.subheadline)
                    .foregroundColor(.secondary)

                if let info = info {
                    Text(info)
                        .font(.caption2)
                        .foregroundColor(.blue)
                }
            }

            Spacer()

            Text("$\(String(format: "%.2f", value))")
                .font(.subheadline)
                .fontWeight(.medium)
        }
    }
}

// MARK: - Preview
#if DEBUG
#Preview {
    MultiRestaurantCartView(cartVM: .preview)
}
#endif
