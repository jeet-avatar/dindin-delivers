import SwiftUI
import EatFairShared

struct OrderSuccessView: View {
    @Environment(\.dismiss) var dismiss
    @EnvironmentObject var multiCartViewModel: MultiRestaurantCartViewModel

    @State private var showConfetti = true

    var body: some View {
        ZStack {
            // Background
            Theme.brandGrey.edgesIgnoringSafeArea(.all)

            ScrollView {
                VStack(spacing: 24) {
                    // Success Animation
                    successHeader

                    // Order Details Card - use cart ViewModel data (P2P backend is source of truth)
                    if !multiCartViewModel.lastOrderNumbers.isEmpty {
                        // Multi-restaurant orders - show each order
                        multiOrderDetailsCard
                    } else if let orderNumber = multiCartViewModel.lastOrderNumber {
                        // Single order fallback
                        lastOrderDetailsCard(
                            orderNumber: orderNumber,
                            restaurantName: multiCartViewModel.lastOrderRestaurantName ?? "Restaurant",
                            itemCount: multiCartViewModel.lastOrderItemCount ?? 1,
                            total: multiCartViewModel.lastOrderTotal ?? 0,
                            deliveryAddress: multiCartViewModel.lastOrderDeliveryAddress ?? ""
                        )
                    } else {
                        // Show placeholder if order info not available
                        dummyOrderCard
                    }

                    // Estimated Delivery
                    estimatedDeliveryCard

                    // Action Buttons
                    actionButtons

                    // Continue Shopping
                    Button(action: {
                        // Clear last order info and reset state
                        multiCartViewModel.clearLastOrder()
                        multiCartViewModel.orderPlaced = false
                        dismiss()
                    }) {
                        Text("Continue Shopping")
                            .fontWeight(.semibold)
                            .foregroundColor(Theme.brandGreen)
                    }
                    .padding(.top)
                }
                .padding()
            }

            // Confetti overlay
            if showConfetti {
                ConfettiView()
                    .allowsHitTesting(false)
            }
        }
        .navigationBarHidden(true)
        .onAppear {
            // Cart is already cleared in placeOrder success handler
            // Just hide confetti after animation
            DispatchQueue.main.asyncAfter(deadline: .now() + 3) {
                withAnimation {
                    showConfetti = false
                }
            }
        }
    }

    // MARK: - Success Header
    private var successHeader: some View {
        VStack(spacing: 16) {
            ZStack {
                Circle()
                    .fill(Theme.brandGreen.opacity(0.2))
                    .frame(width: 120, height: 120)

                Circle()
                    .fill(Theme.brandGreen)
                    .frame(width: 90, height: 90)

                Image(systemName: "checkmark")
                    .font(.system(size: 40, weight: .bold))
                    .foregroundColor(.white)
            }

            Text("Order Placed!")
                .font(.title)
                .fontWeight(.bold)

            Text("Your order has been confirmed and is being prepared")
                .font(.subheadline)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
        }
        .padding(.top, 20)
    }

    // MARK: - Multi-Order Details Card (for multi-restaurant orders)
    private var multiOrderDetailsCard: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack {
                Image(systemName: "receipt")
                    .foregroundColor(Theme.brandGreen)
                Text("Order Details")
                    .font(.headline)
                Spacer()
                Text("\(multiCartViewModel.lastOrderNumbers.count) orders")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }

            Divider()

            // Promo badge (if applicable)
            if let promoName = multiCartViewModel.lastOrderPromoName {
                HStack(spacing: 8) {
                    Image(systemName: "tag.fill")
                        .foregroundColor(.orange)
                        .font(.caption)
                    Text(promoName)
                        .font(.caption)
                        .fontWeight(.semibold)
                        .foregroundColor(.orange)
                }
                .padding(.horizontal, 10)
                .padding(.vertical, 6)
                .background(Color.orange.opacity(0.1))
                .cornerRadius(8)
            }

            // Show each restaurant order
            ForEach(Array(zip(multiCartViewModel.lastOrderNumbers, multiCartViewModel.lastOrderRestaurantNames).enumerated()), id: \.offset) { index, orderInfo in
                let (orderNumber, restaurantName) = orderInfo
                let restaurantItems = multiCartViewModel.lastOrderItems.filter { $0.restaurantName == restaurantName }

                VStack(alignment: .leading, spacing: 8) {
                    HStack(spacing: 12) {
                        ZStack {
                            RoundedRectangle(cornerRadius: 8)
                                .fill(Theme.brandGreen.opacity(0.2))
                                .frame(width: 40, height: 40)
                            Text("\(index + 1)")
                                .font(.headline)
                                .foregroundColor(Theme.brandGreen)
                        }

                        VStack(alignment: .leading, spacing: 2) {
                            Text(restaurantName)
                                .font(.subheadline)
                                .fontWeight(.semibold)
                            Text("#\(orderNumber)")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }

                        Spacer()

                        Text("\(restaurantItems.count) item\(restaurantItems.count > 1 ? "s" : "")")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }

                    // Show items for this restaurant
                    ForEach(restaurantItems, id: \.id) { item in
                        HStack {
                            Text("\(item.quantity)x")
                                .font(.caption2)
                                .foregroundColor(.secondary)
                                .frame(width: 20, alignment: .leading)
                            Text(item.name)
                                .font(.caption)
                            Spacer()
                            Text("$\(String(format: "%.2f", item.totalPrice * Double(item.quantity)))")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                        .padding(.leading, 52)
                    }
                }
                .padding(.vertical, 8)

                if index < multiCartViewModel.lastOrderNumbers.count - 1 {
                    Divider()
                }
            }

            // Total
            HStack {
                Text("Total")
                    .font(.headline)
                Spacer()
                Text("$\(String(format: "%.2f", multiCartViewModel.lastOrderTotal ?? 0))")
                    .font(.headline)
                    .foregroundColor(Theme.brandGreen)
            }
            .padding(.top, 8)

            // Delivery address
            if let deliveryAddress = multiCartViewModel.lastOrderDeliveryAddress, !deliveryAddress.isEmpty {
                HStack(spacing: 12) {
                    Image(systemName: "location.fill")
                        .foregroundColor(.orange)
                        .frame(width: 20)

                    VStack(alignment: .leading, spacing: 2) {
                        Text("Delivering to")
                            .font(.caption)
                            .foregroundColor(.secondary)
                        Text(deliveryAddress)
                            .font(.subheadline)
                            .lineLimit(2)
                    }
                }
            }
        }
        .padding()
        .background(Color.white)
        .cornerRadius(16)
        .shadow(color: .black.opacity(0.05), radius: 8, x: 0, y: 2)
    }

    // MARK: - Placeholder Order Card (when order details not yet loaded)
    private var dummyOrderCard: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack {
                Image(systemName: "receipt")
                    .foregroundColor(Theme.brandGreen)
                Text("Order Details")
                    .font(.headline)
                Spacer()
                ProgressView()
                    .scaleEffect(0.8)
            }

            Divider()

            // Restaurant info
            HStack(spacing: 12) {
                ZStack {
                    RoundedRectangle(cornerRadius: 8)
                        .fill(Color.gray.opacity(0.2))
                        .frame(width: 50, height: 50)
                    Image(systemName: "fork.knife")
                        .foregroundColor(.gray)
                }

                VStack(alignment: .leading, spacing: 2) {
                    Text("Your Order")
                        .font(.subheadline)
                        .fontWeight(.semibold)
                    Text("Loading order details...")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }

                Spacer()
            }

            // Info note
            HStack(spacing: 12) {
                Image(systemName: "info.circle.fill")
                    .foregroundColor(.blue)
                    .frame(width: 20)

                Text("Your order has been placed. Details will appear shortly.")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
        }
        .padding()
        .background(Color.white)
        .cornerRadius(16)
        .shadow(color: .black.opacity(0.05), radius: 8, x: 0, y: 2)
    }

    // MARK: - Order Details Card (from cart ViewModel - P2P backend is source of truth)
    private func lastOrderDetailsCard(orderNumber: String, restaurantName: String, itemCount: Int, total: Double, deliveryAddress: String) -> some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack {
                Image(systemName: "receipt")
                    .foregroundColor(Theme.brandGreen)
                Text("Order Details")
                    .font(.headline)
                Spacer()
                Text("#\(orderNumber)")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }

            Divider()

            // Promo badge (if applicable)
            if let promoName = multiCartViewModel.lastOrderPromoName {
                HStack(spacing: 8) {
                    Image(systemName: "tag.fill")
                        .foregroundColor(.orange)
                        .font(.caption)
                    Text(promoName)
                        .font(.caption)
                        .fontWeight(.semibold)
                        .foregroundColor(.orange)
                }
                .padding(.horizontal, 10)
                .padding(.vertical, 6)
                .background(Color.orange.opacity(0.1))
                .cornerRadius(8)
            }

            // Restaurant info
            HStack(spacing: 12) {
                ZStack {
                    RoundedRectangle(cornerRadius: 8)
                        .fill(Theme.brandGreen.opacity(0.2))
                        .frame(width: 50, height: 50)
                    Image(systemName: "fork.knife")
                        .foregroundColor(Theme.brandGreen)
                }

                VStack(alignment: .leading, spacing: 2) {
                    Text(restaurantName)
                        .font(.subheadline)
                        .fontWeight(.semibold)
                    Text("\(itemCount) item\(itemCount > 1 ? "s" : "")")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }

                Spacer()

                Text("$\(String(format: "%.2f", total))")
                    .font(.headline)
                    .foregroundColor(Theme.brandGreen)
            }

            // Ordered Items
            if !multiCartViewModel.lastOrderItems.isEmpty {
                VStack(alignment: .leading, spacing: 8) {
                    Text("Items Ordered")
                        .font(.caption)
                        .foregroundColor(.secondary)
                        .padding(.top, 4)

                    ForEach(multiCartViewModel.lastOrderItems, id: \.id) { item in
                        HStack {
                            Text("\(item.quantity)x")
                                .font(.caption)
                                .foregroundColor(.secondary)
                                .frame(width: 24, alignment: .leading)
                            Text(item.name)
                                .font(.subheadline)
                            Spacer()
                            Text("$\(String(format: "%.2f", item.totalPrice * Double(item.quantity)))")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                    }
                }
            }

            // Delivery address
            if !deliveryAddress.isEmpty {
                HStack(spacing: 12) {
                    Image(systemName: "location.fill")
                        .foregroundColor(.orange)
                        .frame(width: 20)

                    VStack(alignment: .leading, spacing: 2) {
                        Text("Delivering to")
                            .font(.caption)
                            .foregroundColor(.secondary)
                        Text(deliveryAddress)
                            .font(.subheadline)
                            .lineLimit(2)
                    }
                }
            }
        }
        .padding()
        .background(Color.white)
        .cornerRadius(16)
        .shadow(color: .black.opacity(0.05), radius: 8, x: 0, y: 2)
    }

    // MARK: - Estimated Delivery Card
    private var estimatedDeliveryCard: some View {
        VStack(spacing: 16) {
            HStack {
                Image(systemName: "clock.fill")
                    .foregroundColor(.blue)
                Text("Estimated Delivery")
                    .font(.headline)
                Spacer()
            }

            // Timeline
            HStack(spacing: 0) {
                TimelineStep(icon: "checkmark.circle.fill", title: "Confirmed", isComplete: true, isActive: false)
                TimelineConnector(isComplete: true)
                TimelineStep(icon: "flame.fill", title: "Preparing", isComplete: false, isActive: true)
                TimelineConnector(isComplete: false)
                TimelineStep(icon: "bicycle", title: "On the way", isComplete: false, isActive: false)
                TimelineConnector(isComplete: false)
                TimelineStep(icon: "house.fill", title: "Delivered", isComplete: false, isActive: false)
            }

            HStack {
                VStack(alignment: .leading) {
                    Text("Arriving in")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    Text("25-35 min")
                        .font(.title2)
                        .fontWeight(.bold)
                        .foregroundColor(Theme.brandGreen)
                }

                Spacer()

                NavigationLink(destination: TrackOrderMapView()) {
                    HStack {
                        Image(systemName: "map.fill")
                        Text("Track Order")
                    }
                    .font(.subheadline)
                    .fontWeight(.semibold)
                    .foregroundColor(.white)
                    .padding(.horizontal, 16)
                    .padding(.vertical, 10)
                    .background(Theme.brandGreen)
                    .cornerRadius(20)
                }
            }
        }
        .padding()
        .background(Color.white)
        .cornerRadius(16)
        .shadow(color: .black.opacity(0.05), radius: 8, x: 0, y: 2)
    }

    // MARK: - Action Buttons
    private var actionButtons: some View {
        VStack(spacing: 12) {
            // Contact support
            NavigationLink(destination: HelpSupportView()) {
                HStack {
                    Image(systemName: "questionmark.circle")
                    Text("Need Help?")
                }
                .font(.subheadline)
                .foregroundColor(.secondary)
            }
        }
    }
}

// MARK: - Timeline Components
struct TimelineStep: View {
    let icon: String
    let title: String
    let isComplete: Bool
    let isActive: Bool

    var body: some View {
        VStack(spacing: 4) {
            ZStack {
                Circle()
                    .fill(isComplete ? Theme.brandGreen : (isActive ? Theme.brandGreen.opacity(0.3) : Color.gray.opacity(0.2)))
                    .frame(width: 30, height: 30)

                Image(systemName: icon)
                    .font(.caption)
                    .foregroundColor(isComplete ? .white : (isActive ? Theme.brandGreen : .gray))
            }

            Text(title)
                .font(.caption2)
                .foregroundColor(isComplete || isActive ? .primary : .secondary)
        }
        .frame(maxWidth: .infinity)
    }
}

struct TimelineConnector: View {
    let isComplete: Bool

    var body: some View {
        Rectangle()
            .fill(isComplete ? Theme.brandGreen : Color.gray.opacity(0.3))
            .frame(height: 2)
            .frame(maxWidth: 30)
            .offset(y: -10)
    }
}

// MARK: - Confetti View
struct ConfettiView: View {
    @State private var animate = false

    var body: some View {
        GeometryReader { geometry in
            ZStack {
                ForEach(0..<50, id: \.self) { index in
                    ConfettiPiece(
                        color: [Color.red, Color.blue, Color.green, Color.yellow, Color.purple, Color.orange].randomElement() ?? .blue,
                        size: CGFloat.random(in: 5...12)
                    )
                    .position(
                        x: CGFloat.random(in: 0...geometry.size.width),
                        y: animate ? geometry.size.height + 50 : -50
                    )
                    .animation(
                        Animation.linear(duration: Double.random(in: 2...4))
                            .delay(Double.random(in: 0...1))
                            .repeatCount(1),
                        value: animate
                    )
                }
            }
        }
        .onAppear {
            animate = true
        }
    }
}

struct ConfettiPiece: View {
    let color: Color
    let size: CGFloat

    var body: some View {
        Rectangle()
            .fill(color)
            .frame(width: size, height: size * 1.5)
            .rotationEffect(.degrees(Double.random(in: 0...360)))
    }
}
