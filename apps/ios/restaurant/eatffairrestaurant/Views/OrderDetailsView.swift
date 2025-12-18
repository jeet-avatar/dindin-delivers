import SwiftUI

/// Order Details Model matching Android
struct OrderDetailsModel: Identifiable {
    let id: String
    let customerName: String
    let customerPhone: String
    let deliveryAddress: String
    let items: [OrderDetailItem]
    let subtotal: Double
    let deliveryFee: Double
    let serviceFee: Double
    let tax: Double
    let total: Double
    var status: String

    static let sample = OrderDetailsModel(
        id: "EF-20241215-123456",
        customerName: "John Doe",
        customerPhone: "+1 (555) 123-4567",
        deliveryAddress: "123 Main Street, Apt 4B, San Francisco, CA 94102",
        items: [
            OrderDetailItem(name: "Margherita Pizza", quantity: 2, price: 15.99),
            OrderDetailItem(name: "Caesar Salad", quantity: 1, price: 8.99),
            OrderDetailItem(name: "Garlic Bread", quantity: 1, price: 4.99)
        ],
        subtotal: 45.96,
        deliveryFee: 4.99,
        serviceFee: 1.00,
        tax: 4.15,
        total: 56.10,
        status: "placed"
    )
}

struct OrderDetailItem: Identifiable {
    let id = UUID()
    let name: String
    let quantity: Int
    let price: Double
}

/// OrderDetailsView - Matches Android Partner OrderDetailsScreen
/// Platform Parity: Added to iOS to match Android-only feature
struct OrderDetailsView: View {
    @Environment(\.dismiss) private var dismiss
    @State private var order: OrderDetailsModel?
    @State private var isLoading = false
    @State private var errorMessage: String?

    let orderId: String

    init(orderId: String) {
        self.orderId = orderId
    }

    var body: some View {
        NavigationStack {
            ZStack {
                Color(UIColor.systemGroupedBackground)
                    .ignoresSafeArea()

                if isLoading {
                    ProgressView()
                        .scaleEffect(1.5)
                } else if let error = errorMessage {
                    errorView(message: error)
                } else if let order = order {
                    orderContent(order)
                }
            }
            .navigationTitle("Order #\(orderId.suffix(6))")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button(action: { dismiss() }) {
                        Image(systemName: "chevron.left")
                            .foregroundColor(.white)
                    }
                }
            }
            .toolbarBackground(RestaurantTheme.brandOrange, for: .navigationBar)
            .toolbarBackground(.visible, for: .navigationBar)
            .toolbarColorScheme(.dark, for: .navigationBar)
        }
        .onAppear {
            loadOrder()
        }
    }

    // MARK: - Error View
    private func errorView(message: String) -> some View {
        VStack(spacing: 16) {
            Text(message)
                .foregroundColor(.red)
                .multilineTextAlignment(.center)

            Button("Retry") {
                loadOrder()
            }
            .buttonStyle(.borderedProminent)
        }
        .padding()
    }

    // MARK: - Order Content
    private func orderContent(_ order: OrderDetailsModel) -> some View {
        ScrollView {
            VStack(spacing: 16) {
                // Order Status Card
                OrderStatusCard(
                    status: order.status,
                    onStatusUpdate: updateOrderStatus
                )

                // Customer Info Card
                customerInfoCard(order)

                // Order Items Card
                orderItemsCard(order)

                // Order Summary Card
                orderSummaryCard(order)
            }
            .padding(16)
        }
    }

    // MARK: - Customer Info Card
    private func customerInfoCard(_ order: OrderDetailsModel) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Customer")
                .font(.system(size: 16, weight: .bold))

            HStack(spacing: 12) {
                Image(systemName: "person.fill")
                    .foregroundColor(RestaurantTheme.brandOrange)
                Text(order.customerName)
            }

            if !order.customerPhone.isEmpty {
                HStack(spacing: 12) {
                    Image(systemName: "phone.fill")
                        .foregroundColor(RestaurantTheme.brandOrange)
                    Text(order.customerPhone)
                }
            }

            if !order.deliveryAddress.isEmpty {
                HStack(alignment: .top, spacing: 12) {
                    Image(systemName: "mappin.circle.fill")
                        .foregroundColor(RestaurantTheme.brandOrange)
                    Text(order.deliveryAddress)
                        .font(.system(size: 14))
                }
            }
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.white)
        .cornerRadius(12)
    }

    // MARK: - Order Items Card
    private func orderItemsCard(_ order: OrderDetailsModel) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Order Items")
                .font(.system(size: 16, weight: .bold))

            ForEach(order.items) { item in
                HStack {
                    Text("\(item.quantity)x \(item.name)")
                    Spacer()
                    Text(String(format: "$%.2f", item.price * Double(item.quantity)))
                }
            }
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.white)
        .cornerRadius(12)
    }

    // MARK: - Order Summary Card
    private func orderSummaryCard(_ order: OrderDetailsModel) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Order Summary")
                .font(.system(size: 16, weight: .bold))

            priceRow(label: "Subtotal", amount: order.subtotal)
            priceRow(label: "Delivery Fee", amount: order.deliveryFee)
            priceRow(label: "Service Fee", amount: order.serviceFee)
            priceRow(label: "Tax", amount: order.tax)

            Divider()
                .padding(.vertical, 4)

            HStack {
                Text("Total")
                    .fontWeight(.bold)
                Spacer()
                Text(String(format: "$%.2f", order.total))
                    .fontWeight(.bold)
                    .foregroundColor(RestaurantTheme.brandOrange)
            }
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.white)
        .cornerRadius(12)
    }

    // MARK: - Price Row
    private func priceRow(label: String, amount: Double) -> some View {
        HStack {
            Text(label)
                .foregroundColor(.gray)
            Spacer()
            Text(String(format: "$%.2f", amount))
        }
        .padding(.vertical, 2)
    }

    // MARK: - Load Order
    private func loadOrder() {
        isLoading = true
        errorMessage = nil

        // Simulate API call - in production, fetch from API/Firestore
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) {
            self.order = OrderDetailsModel.sample
            self.isLoading = false
        }
    }

    // MARK: - Update Order Status
    private func updateOrderStatus(_ newStatus: String) {
        order?.status = newStatus
        // In production, call API to update status
    }
}

/// Order Status Card Component - Matches Android OrderStatusCard
struct OrderStatusCard: View {
    let status: String
    let onStatusUpdate: (String) -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Status")
                        .font(.system(size: 14))
                        .foregroundColor(.gray)

                    Text(formatStatus(status))
                        .font(.system(size: 18, weight: .bold))
                        .foregroundColor(statusColor(status))
                }

                Spacer()

                Image(systemName: "checkmark.circle.fill")
                    .font(.system(size: 40))
                    .foregroundColor(statusColor(status))
            }

            // Status action buttons
            statusActionButtons
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(statusColor(status).opacity(0.1))
        .cornerRadius(12)
    }

    @ViewBuilder
    private var statusActionButtons: some View {
        switch status.lowercased() {
        case "placed":
            Button(action: { onStatusUpdate("accepted") }) {
                Text("Accept Order")
                    .fontWeight(.semibold)
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
                    .background(Color(red: 76/255, green: 175/255, blue: 80/255)) // #4CAF50
                    .cornerRadius(8)
            }

        case "accepted":
            Button(action: { onStatusUpdate("preparing") }) {
                Text("Start Preparing")
                    .fontWeight(.semibold)
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
                    .background(RestaurantTheme.brandOrange)
                    .cornerRadius(8)
            }

        case "preparing":
            Button(action: { onStatusUpdate("ready") }) {
                Text("Mark as Ready")
                    .fontWeight(.semibold)
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
                    .background(Color(red: 255/255, green: 152/255, blue: 0/255)) // #FF9800
                    .cornerRadius(8)
            }

        case "ready":
            Text("Waiting for driver pickup")
                .font(.system(size: 14))
                .foregroundColor(.gray)

        default:
            EmptyView()
        }
    }

    private func statusColor(_ status: String) -> Color {
        switch status.lowercased() {
        case "placed": return Color(red: 33/255, green: 150/255, blue: 243/255)    // #2196F3 Blue
        case "accepted": return Color(red: 76/255, green: 175/255, blue: 80/255)   // #4CAF50 Green
        case "preparing": return Color(red: 255/255, green: 152/255, blue: 0/255)  // #FF9800 Orange
        case "ready": return Color(red: 156/255, green: 39/255, blue: 176/255)     // #9C27B0 Purple
        case "picked_up", "out_for_delivery": return Color(red: 0/255, green: 188/255, blue: 212/255) // #00BCD4 Cyan
        case "delivered": return Color(red: 76/255, green: 175/255, blue: 80/255)  // #4CAF50 Green
        case "cancelled": return Color(red: 244/255, green: 67/255, blue: 54/255)  // #F44336 Red
        default: return .gray
        }
    }

    private func formatStatus(_ status: String) -> String {
        switch status.lowercased() {
        case "placed": return "Order Placed"
        case "accepted": return "Accepted"
        case "preparing": return "Preparing"
        case "ready": return "Ready for Pickup"
        case "picked_up": return "Picked Up"
        case "out_for_delivery": return "Out for Delivery"
        case "delivered": return "Delivered"
        case "cancelled": return "Cancelled"
        default: return status.capitalized
        }
    }
}

#Preview {
    OrderDetailsView(orderId: "EF-20241215-123456")
}
