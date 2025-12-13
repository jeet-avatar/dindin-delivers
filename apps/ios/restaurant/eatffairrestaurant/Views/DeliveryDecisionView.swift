import SwiftUI
import EatFairShared

/// View shown to restaurant when a new order comes in for delivery decision
/// Restaurant has 60 seconds to decide: "I'll deliver" or "Pass to driver"
struct DeliveryDecisionView: View {
    let order: Order
    let onDecision: (Bool, String?) -> Void  // (willDeliver, delivererName)
    let onDismiss: () -> Void

    @State private var remainingSeconds: Int = 60
    @State private var delivererName: String = ""
    @State private var isSubmitting = false
    @State private var showDelivererNameField = false
    @State private var timer: Timer?

    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                // Urgent Header with Countdown
                urgentHeader

                ScrollView {
                    VStack(spacing: 20) {
                        // Order Summary
                        orderSummaryCard

                        // Delivery Address
                        deliveryAddressCard

                        // Decision Buttons
                        decisionButtons

                        // Deliverer Name Input (if restaurant delivers)
                        if showDelivererNameField {
                            delivererNameInput
                        }

                        // Info Text
                        infoText
                    }
                    .padding()
                }
            }
            .navigationTitle("Delivery Decision")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Skip") {
                        // Skip = Pass to driver
                        submitDecision(willDeliver: false)
                    }
                    .foregroundColor(.orange)
                }
            }
            .onAppear {
                startTimer()
            }
            .onDisappear {
                timer?.invalidate()
            }
        }
    }

    // MARK: - Urgent Header with Countdown

    private var urgentHeader: some View {
        VStack(spacing: 8) {
            HStack {
                Image(systemName: "clock.badge.exclamationmark.fill")
                    .font(.title2)
                Text("Quick Decision Needed!")
                    .font(.headline)
            }
            .foregroundColor(.white)

            // Countdown Timer
            HStack(spacing: 4) {
                Text("\(remainingSeconds)")
                    .font(.system(size: 48, weight: .bold, design: .rounded))
                Text("seconds")
                    .font(.subheadline)
            }
            .foregroundColor(.white)

            // Progress Bar
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    Rectangle()
                        .fill(Color.white.opacity(0.3))
                        .frame(height: 6)
                        .cornerRadius(3)

                    Rectangle()
                        .fill(Color.white)
                        .frame(width: geo.size.width * CGFloat(remainingSeconds) / 60.0, height: 6)
                        .cornerRadius(3)
                        .animation(.linear(duration: 1), value: remainingSeconds)
                }
            }
            .frame(height: 6)
            .padding(.horizontal)

            Text("After timeout, order goes to Dollor drivers")
                .font(.caption)
                .foregroundColor(.white.opacity(0.8))
        }
        .padding()
        .background(
            LinearGradient(
                colors: remainingSeconds > 30 ? [.orange, .red] : [.red, .pink],
                startPoint: .leading,
                endPoint: .trailing
            )
        )
    }

    // MARK: - Order Summary Card

    private var orderSummaryCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("Order #\(order.orderId)")
                    .font(.headline)
                Spacer()
                Text("$\(String(format: "%.2f", order.total))")
                    .font(.title3)
                    .fontWeight(.bold)
                    .foregroundColor(.green)
            }

            Divider()

            // Customer Name
            HStack {
                Image(systemName: "person.fill")
                    .foregroundColor(.gray)
                Text(order.customerName ?? "Customer")
                    .font(.subheadline)
            }

            // Items Count
            HStack {
                Image(systemName: "bag.fill")
                    .foregroundColor(.gray)
                Text("\(order.itemsCount) items")
                    .font(.subheadline)
            }

            // Platform Fee Info (Tiered)
            let platformFee = AppConfig.shared.getRestaurantPlatformFee(orderSubtotal: order.subtotal)
            HStack {
                Image(systemName: "dollarsign.circle")
                    .foregroundColor(.orange)
                Text("Platform fee: $\(String(format: "%.2f", platformFee))")
                    .font(.caption)
                    .foregroundColor(.orange)
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(radius: 2)
    }

    // MARK: - Delivery Address Card

    private var deliveryAddressCard: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Image(systemName: "location.fill")
                    .foregroundColor(.blue)
                Text("Delivery To")
                    .font(.subheadline)
                    .fontWeight(.semibold)
            }

            Text(order.deliveryAddress.fullAddress)
                .font(.body)
                .foregroundColor(.primary)

            if !order.deliveryInstructions.isEmpty {
                Text("Note: \(order.deliveryInstructions)")
                    .font(.caption)
                    .foregroundColor(.secondary)
                    .italic()
            }
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.blue.opacity(0.1))
        .cornerRadius(12)
    }

    // MARK: - Decision Buttons

    private var decisionButtons: some View {
        VStack(spacing: 12) {
            // Restaurant Delivers Button
            Button(action: {
                withAnimation {
                    showDelivererNameField = true
                }
            }) {
                HStack {
                    Image(systemName: "storefront.fill")
                        .font(.title2)
                    VStack(alignment: .leading) {
                        Text("I'll Deliver")
                            .font(.headline)
                        Text("Keep food fresh, earn delivery fee")
                            .font(.caption)
                            .foregroundColor(.white.opacity(0.8))
                    }
                    Spacer()
                    Image(systemName: "chevron.right")
                }
                .foregroundColor(.white)
                .padding()
                .background(Color.green)
                .cornerRadius(12)
            }

            // Pass to Driver Button
            Button(action: {
                submitDecision(willDeliver: false)
            }) {
                HStack {
                    Image(systemName: "car.fill")
                        .font(.title2)
                    VStack(alignment: .leading) {
                        Text("Pass to Dollor Driver")
                            .font(.headline)
                        Text("Focus on cooking, driver handles delivery")
                            .font(.caption)
                            .foregroundColor(.white.opacity(0.8))
                    }
                    Spacer()
                    if isSubmitting {
                        ProgressView()
                            .tint(.white)
                    } else {
                        Image(systemName: "chevron.right")
                    }
                }
                .foregroundColor(.white)
                .padding()
                .background(Color.blue)
                .cornerRadius(12)
            }
            .disabled(isSubmitting)
        }
    }

    // MARK: - Deliverer Name Input

    private var delivererNameInput: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Who will deliver?")
                .font(.subheadline)
                .fontWeight(.semibold)

            TextField("Staff name (optional)", text: $delivererName)
                .textFieldStyle(RoundedBorderTextFieldStyle())

            Button(action: {
                submitDecision(willDeliver: true)
            }) {
                HStack {
                    if isSubmitting {
                        ProgressView()
                            .tint(.white)
                    } else {
                        Image(systemName: "checkmark.circle.fill")
                    }
                    Text("Confirm - I'll Deliver")
                        .fontWeight(.semibold)
                }
                .foregroundColor(.white)
                .frame(maxWidth: .infinity)
                .padding()
                .background(Color.green)
                .cornerRadius(12)
            }
            .disabled(isSubmitting)
        }
        .padding()
        .background(Color.green.opacity(0.1))
        .cornerRadius(12)
    }

    // MARK: - Info Text

    private var infoText: some View {
        VStack(alignment: .leading, spacing: 8) {
            Label("Why deliver yourself?", systemImage: "lightbulb.fill")
                .font(.subheadline)
                .fontWeight(.semibold)
                .foregroundColor(.orange)

            VStack(alignment: .leading, spacing: 4) {
                InfoRow(icon: "fork.knife", text: "Keep food fresher - no driver wait time")
                InfoRow(icon: "dollarsign.circle", text: "Earn the delivery fee yourself")
                InfoRow(icon: "star.fill", text: "Better customer experience")
                InfoRow(icon: "clock", text: "Great during slow periods")
            }
        }
        .padding()
        .background(Color.orange.opacity(0.1))
        .cornerRadius(12)
    }

    // MARK: - Helper Functions

    private func startTimer() {
        timer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { _ in
            if remainingSeconds > 0 {
                remainingSeconds -= 1
            } else {
                // Auto-timeout - pass to driver
                timer?.invalidate()
                submitDecision(willDeliver: false)
            }
        }
    }

    private func submitDecision(willDeliver: Bool) {
        isSubmitting = true
        timer?.invalidate()

        let name = willDeliver ? (delivererName.isEmpty ? nil : delivererName) : nil
        onDecision(willDeliver, name)
    }
}

// MARK: - Helper Views

private struct InfoRow: View {
    let icon: String
    let text: String

    var body: some View {
        HStack(spacing: 8) {
            Image(systemName: icon)
                .foregroundColor(.orange)
                .frame(width: 20)
            Text(text)
                .font(.caption)
                .foregroundColor(.secondary)
        }
    }
}

// MARK: - Compact Delivery Decision Banner

/// Compact banner shown at top of order card when decision is pending
struct DeliveryDecisionBanner: View {
    let remainingSeconds: Int
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            HStack {
                Image(systemName: "clock.badge.exclamationmark.fill")
                    .foregroundColor(.white)

                VStack(alignment: .leading, spacing: 2) {
                    Text("Deliver this order?")
                        .font(.caption)
                        .fontWeight(.semibold)
                    Text("\(remainingSeconds)s remaining")
                        .font(.caption2)
                }
                .foregroundColor(.white)

                Spacer()

                Text("Decide")
                    .font(.caption)
                    .fontWeight(.bold)
                    .foregroundColor(.orange)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 6)
                    .background(Color.white)
                    .cornerRadius(12)
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
            .background(
                LinearGradient(
                    colors: remainingSeconds > 30 ? [.orange, .red] : [.red, .pink],
                    startPoint: .leading,
                    endPoint: .trailing
                )
            )
            .cornerRadius(8)
        }
    }
}

// MARK: - Preview

#if DEBUG
struct DeliveryDecisionView_Previews: PreviewProvider {
    static var previews: some View {
        DeliveryDecisionView(
            order: Order(
                id: "123",
                orderId: "EF-20251211-001",
                customerId: "cust1",
                customerName: "John Doe",
                customerEmail: "john@example.com",
                deliveryAddress: DeliveryAddress(
                    fullAddress: "123 Main St, San Francisco, CA 94102",
                    street: "123 Main St",
                    city: "San Francisco",
                    state: "CA",
                    zipCode: "94102",
                    latitude: 37.7749,
                    longitude: -122.4194,
                    landmark: "Blue door"
                ),
                deliveryInstructions: "Leave at door",
                restaurant: RestaurantInfo(id: "1", name: "Test Restaurant", address: "", latitude: 0, longitude: 0, imageUrl: ""),
                items: [],
                itemsCount: 3,
                subtotal: 45.00,
                deliveryFee: 2.00,
                serviceFee: 0.0,
                priorityFee: 0.0,
                smallOrderFee: 0.0,
                platformFee: 2.00,
                tax: 3.60,
                tip: 5.00,
                total: 55.60,
                status: "PENDING_RESTAURANT_DELIVERY",
                placedAt: Int64(Date().timeIntervalSince1970 * 1000)
            ),
            onDecision: { _, _ in },
            onDismiss: { }
        )
    }
}
#endif
