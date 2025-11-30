import SwiftUI
import Combine
import FirebaseFirestore
import EatFairShared

struct OrderHistoryView: View {
    @StateObject var viewModel = OrderHistoryViewModel()
    @EnvironmentObject var multiCartViewModel: MultiRestaurantCartViewModel
    @State private var selectedFilter: OrderFilter = .all
    @State private var showReorderConfirmation = false
    @State private var orderToReorder: Order?

    enum OrderFilter: String, CaseIterable {
        case all = "All"
        case active = "Active"
        case completed = "Completed"
    }

    var body: some View {
        ZStack {
            Theme.brandGrey.edgesIgnoringSafeArea(.all)

            VStack(spacing: 0) {
                // Filter Tabs
                filterTabs

                // Orders List
                if viewModel.isLoading {
                    Spacer()
                    ProgressView("Loading orders...")
                    Spacer()
                } else if filteredOrders.isEmpty {
                    emptyState
                } else {
                    ScrollView {
                        LazyVStack(spacing: 16) {
                            ForEach(filteredOrders) { order in
                                OrderCard(
                                    order: order,
                                    onReorder: {
                                        orderToReorder = order
                                        showReorderConfirmation = true
                                    },
                                    onTrack: {}
                                )
                            }
                        }
                        .padding()
                    }
                }
            }
        }
        .navigationTitle("Your Orders")
        .onAppear {
            viewModel.fetchOrders()
        }
        .alert("Reorder", isPresented: $showReorderConfirmation) {
            Button("Cancel", role: .cancel) {}
            Button("Add to Cart") {
                if let order = orderToReorder {
                    reorderItems(from: order)
                }
            }
        } message: {
            if let order = orderToReorder {
                Text("Add \(order.items.count) items from \(order.restaurant.name) to your cart?")
            }
        }
    }

    // MARK: - Filter Tabs
    private var filterTabs: some View {
        HStack(spacing: 0) {
            ForEach(OrderFilter.allCases, id: \.self) { filter in
                Button(action: {
                    withAnimation(.spring(response: 0.3)) {
                        selectedFilter = filter
                    }
                }) {
                    VStack(spacing: 8) {
                        Text(filter.rawValue)
                            .font(.subheadline)
                            .fontWeight(selectedFilter == filter ? .semibold : .regular)
                            .foregroundColor(selectedFilter == filter ? Theme.brandGreen : .secondary)

                        Rectangle()
                            .fill(selectedFilter == filter ? Theme.brandGreen : Color.clear)
                            .frame(height: 2)
                    }
                }
                .frame(maxWidth: .infinity)
            }
        }
        .padding(.horizontal)
        .background(Color.white)
    }

    // MARK: - Filtered Orders
    private var filteredOrders: [Order] {
        switch selectedFilter {
        case .all:
            return viewModel.orders
        case .active:
            return viewModel.orders.filter {
                ["Placed", "Accepted", "Preparing", "Ready", "PickedUp", "OnTheWay"].contains($0.status)
            }
        case .completed:
            return viewModel.orders.filter {
                ["Delivered", "Cancelled"].contains($0.status)
            }
        }
    }

    // MARK: - Empty State
    private var emptyState: some View {
        VStack(spacing: 20) {
            Spacer()

            Image(systemName: selectedFilter == .active ? "bicycle" : "clock")
                .font(.system(size: 60))
                .foregroundColor(Theme.textGrey.opacity(0.5))

            Text(selectedFilter == .active ? "No active orders" : "No orders yet")
                .font(.title2)
                .fontWeight(.semibold)
                .foregroundColor(Theme.brandBlack)

            Text(selectedFilter == .active
                 ? "Your active orders will appear here"
                 : "Start exploring restaurants and place your first order!")
                .font(.subheadline)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 40)

            Spacer()
        }
    }

    // MARK: - Reorder Function
    private func reorderItems(from order: Order) {
        // Create a temporary restaurant object from order's restaurant info
        let restaurant = Restaurant(
            id: order.restaurant.id,
            name: order.restaurant.name,
            cuisine: "",
            rating: 0,
            deliveryTime: "25-35",
            imageUrl: order.restaurant.imageUrl,
            address: order.restaurant.address,
            latitude: order.restaurant.latitude,
            longitude: order.restaurant.longitude,
            phone: ""
        )

        // Add items to multi-cart
        for item in order.items {
            var menuItem = MenuItem(
                name: item.name,
                description: "",
                price: item.price,
                imageUrl: nil
            )
            menuItem.id = item.menuItemId

            for _ in 0..<item.quantity {
                _ = multiCartViewModel.addToCart(item: menuItem, from: restaurant)
            }
        }
    }
}

// MARK: - Enhanced Order Card
struct OrderCard: View {
    let order: Order
    let onReorder: () -> Void
    let onTrack: () -> Void

    @State private var isExpanded = false

    var body: some View {
        VStack(spacing: 0) {
            // Header
            VStack(alignment: .leading, spacing: 12) {
                HStack {
                    // Restaurant icon
                    ZStack {
                        RoundedRectangle(cornerRadius: 8)
                            .fill(Color.gray.opacity(0.2))
                            .frame(width: 50, height: 50)
                        Image(systemName: "fork.knife")
                            .foregroundColor(.gray)
                    }

                    VStack(alignment: .leading, spacing: 2) {
                        Text(order.restaurant.name)
                            .font(.headline)
                            .fontWeight(.bold)

                        Text("\(order.itemsCount) items • $\(String(format: "%.2f", order.total))")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                    }

                    Spacer()

                    StatusBadge(status: order.status)
                }

                // Date
                HStack {
                    Image(systemName: "calendar")
                        .font(.caption)
                        .foregroundColor(.gray)
                    Text(Date(timeIntervalSince1970: TimeInterval(order.placedAt) / 1000), style: .date)
                        .font(.caption)
                        .foregroundColor(.gray)
                    Text("at")
                        .font(.caption)
                        .foregroundColor(.gray)
                    Text(Date(timeIntervalSince1970: TimeInterval(order.placedAt) / 1000), style: .time)
                        .font(.caption)
                        .foregroundColor(.gray)
                }
            }
            .padding()

            // Expandable Items Section
            if isExpanded {
                Divider()
                    .padding(.horizontal)

                VStack(alignment: .leading, spacing: 8) {
                    ForEach(order.items) { item in
                        HStack {
                            Text("\(item.quantity)x")
                                .font(.caption)
                                .foregroundColor(.secondary)
                                .frame(width: 30, alignment: .leading)

                            Text(item.name)
                                .font(.subheadline)

                            Spacer()

                            Text("$\(String(format: "%.2f", item.price * Double(item.quantity)))")
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                        }
                    }

                    Divider()

                    // Order breakdown
                    VStack(spacing: 4) {
                        OrderSummaryRow(label: "Subtotal", value: order.subtotal)
                        OrderSummaryRow(label: "Delivery", value: order.deliveryFee)
                        OrderSummaryRow(label: "Tax", value: order.tax)
                        if order.tip > 0 {
                            OrderSummaryRow(label: "Tip", value: order.tip)
                        }

                        HStack {
                            Text("Total")
                                .font(.subheadline)
                                .fontWeight(.semibold)
                            Spacer()
                            Text("$\(String(format: "%.2f", order.total))")
                                .font(.subheadline)
                                .fontWeight(.bold)
                                .foregroundColor(Theme.brandGreen)
                        }
                        .padding(.top, 4)
                    }
                }
                .padding()
            }

            Divider()
                .padding(.horizontal)

            // Action Buttons
            HStack(spacing: 12) {
                // Expand/Collapse
                Button(action: {
                    withAnimation(.spring(response: 0.3)) {
                        isExpanded.toggle()
                    }
                }) {
                    HStack(spacing: 4) {
                        Text(isExpanded ? "Less" : "Details")
                            .font(.caption)
                        Image(systemName: isExpanded ? "chevron.up" : "chevron.down")
                            .font(.caption)
                    }
                    .foregroundColor(.secondary)
                }

                Spacer()

                // Track Order (for active orders)
                if isActiveOrder {
                    NavigationLink(destination: TrackOrderMapView()) {
                        HStack(spacing: 4) {
                            Image(systemName: "location.fill")
                            Text("Track")
                        }
                        .font(.caption)
                        .fontWeight(.semibold)
                        .foregroundColor(.white)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 8)
                        .background(Theme.brandGreen)
                        .cornerRadius(8)
                    }
                }

                // Reorder Button (for completed orders)
                if order.status == "Delivered" {
                    Button(action: onReorder) {
                        HStack(spacing: 4) {
                            Image(systemName: "arrow.clockwise")
                            Text("Reorder")
                        }
                        .font(.caption)
                        .fontWeight(.semibold)
                        .foregroundColor(.white)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 8)
                        .background(Theme.brandOrange)
                        .cornerRadius(8)
                    }
                }
            }
            .padding()
        }
        .background(Color.white)
        .cornerRadius(16)
        .shadow(color: Color.black.opacity(0.05), radius: 8, x: 0, y: 2)
    }

    private var isActiveOrder: Bool {
        ["Placed", "Accepted", "Preparing", "Ready", "PickedUp", "OnTheWay"].contains(order.status)
    }
}

// MARK: - Status Badge
struct StatusBadge: View {
    let status: String

    var body: some View {
        HStack(spacing: 4) {
            Circle()
                .fill(statusColor)
                .frame(width: 6, height: 6)

            Text(displayStatus)
                .font(.caption)
                .fontWeight(.medium)
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 6)
        .background(statusColor.opacity(0.1))
        .foregroundColor(statusColor)
        .cornerRadius(12)
    }

    private var statusColor: Color {
        switch status {
        case "Placed": return .blue
        case "Accepted": return .purple
        case "Preparing": return .orange
        case "Ready": return .green
        case "PickedUp", "OnTheWay": return Theme.brandGreen
        case "Delivered": return .green
        case "Cancelled": return .red
        default: return .gray
        }
    }

    private var displayStatus: String {
        switch status {
        case "PickedUp": return "Picked Up"
        case "OnTheWay": return "On the Way"
        default: return status
        }
    }
}

// MARK: - Order Summary Row
struct OrderSummaryRow: View {
    let label: String
    let value: Double

    var body: some View {
        HStack {
            Text(label)
                .font(.caption)
                .foregroundColor(.secondary)
            Spacer()
            Text("$\(String(format: "%.2f", value))")
                .font(.caption)
                .foregroundColor(.secondary)
        }
    }
}
