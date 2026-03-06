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
    @State private var navigateToCart = false
    @State private var showCancelSuccess = false
    @State private var selectedSection: HistorySection = .orders

    enum HistorySection: String, CaseIterable {
        case orders = "Orders"
        case rides = "Rides"
    }

    enum OrderFilter: String, CaseIterable {
        case all = "All"
        case active = "Active"
        case completed = "Completed"
    }

    var body: some View {
        ZStack {
            Theme.brandGrey.edgesIgnoringSafeArea(.all)

            VStack(spacing: 0) {
                // Top-level section picker (Orders / Rides)
                Picker("Section", selection: $selectedSection) {
                    ForEach(HistorySection.allCases, id: \.self) { section in
                        Text(section.rawValue).tag(section)
                    }
                }
                .pickerStyle(.segmented)
                .padding(.horizontal, 16)
                .padding(.vertical, 8)

                if selectedSection == .orders {
                    ordersContent
                } else {
                    RideHistorySection()
                }
            }
        }
        .navigationTitle("Your Orders")
        .refreshable {
            viewModel.fetchOrders()
        }
        .onAppear {
            viewModel.fetchOrders()
        }
        .alert("Reorder", isPresented: $showReorderConfirmation) {
            Button("Cancel", role: .cancel) {}
            Button("Add to Cart") {
                if let order = orderToReorder {
                    reorderItems(from: order)
                    navigateToCart = true
                }
            }
        } message: {
            if let order = orderToReorder {
                Text("Add \(order.items.count) items from \(order.restaurant.name) to your cart?")
            }
        }
        .navigationDestination(isPresented: $navigateToCart) {
            MultiRestaurantCartView(cartVM: multiCartViewModel)
        }
        .alert("Order Cancelled", isPresented: $viewModel.cancelSuccess) {
            Button("OK") {
                viewModel.cancelSuccess = false
            }
        } message: {
            if let response = viewModel.cancelResponse {
                if let refundAmount = response.refundAmount, refundAmount > 0 {
                    Text("Your order has been cancelled. A refund of $\(String(format: "%.2f", refundAmount)) will be processed to your original payment method.")
                } else {
                    Text(response.message)
                }
            } else {
                Text("Your order has been cancelled successfully.")
            }
        }
        .alert("Error", isPresented: $viewModel.showError) {
            Button("OK") {
                viewModel.showError = false
            }
        } message: {
            Text(viewModel.errorMessage ?? "An error occurred")
        }
        .overlay {
            if viewModel.isCancelling {
                ZStack {
                    Color.black.opacity(0.3)
                        .ignoresSafeArea()
                    VStack(spacing: 12) {
                        ProgressView()
                            .scaleEffect(1.2)
                        Text("Cancelling order...")
                            .font(.subheadline)
                            .foregroundColor(.white)
                    }
                    .padding(24)
                    .background(Color.black.opacity(0.7))
                    .cornerRadius(12)
                }
            }
        }
    }

    // MARK: - Orders Content
    private var ordersContent: some View {
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
                                onTrack: {},
                                onCancel: {
                                    viewModel.cancelOrder(order)
                                },
                                canCancel: viewModel.canCancelOrder(order),
                                refundStatus: viewModel.getRefundStatus(for: order),
                                onFetchRefundStatus: {
                                    viewModel.fetchRefundStatus(for: order)
                                }
                            )
                        }
                    }
                    .padding()
                }
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
    // TODO: When app goes live, upgrade this to handle restaurant self-delivery vs driver delivery workflow
    // Current flow: Restaurant can deliver OR order auto-assigns to nearby driver after timeout
    // Orders stay active (Accepted status) for up to 30 minutes unless restaurant cancels
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
                ["Delivered", "Cancelled", "DeliveryFailed", "delivery_failed"].contains($0.status)
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

// MARK: - Ride History Section
struct RideHistorySection: View {
    @State private var rides: [RideHistoryItem] = []
    @State private var isLoading = false
    @State private var hasMore = false
    @State private var currentOffset = 0
    private let pageSize = 20

    var body: some View {
        Group {
            if isLoading && rides.isEmpty {
                VStack {
                    Spacer()
                    ProgressView("Loading rides...")
                    Spacer()
                }
            } else if rides.isEmpty {
                rideEmptyState
            } else {
                ScrollView {
                    LazyVStack(spacing: 12) {
                        ForEach(rides) { ride in
                            RideHistoryCard(ride: ride)
                        }

                        if hasMore {
                            Button(action: loadMoreRides) {
                                if isLoading {
                                    ProgressView()
                                        .frame(maxWidth: .infinity)
                                        .padding()
                                } else {
                                    Text("Load More")
                                        .font(.subheadline)
                                        .fontWeight(.medium)
                                        .foregroundColor(Theme.brandGreen)
                                        .frame(maxWidth: .infinity)
                                        .padding()
                                }
                            }
                        }
                    }
                    .padding()
                }
            }
        }
        .onAppear { loadRides() }
    }

    private var rideEmptyState: some View {
        VStack(spacing: 20) {
            Spacer()
            Image(systemName: "car.fill")
                .font(.system(size: 60))
                .foregroundColor(Color.gray.opacity(0.5))
            Text("No rides yet")
                .font(.title2)
                .fontWeight(.semibold)
                .foregroundColor(Theme.brandBlack)
            Text("Your ride history will appear here after your first trip.")
                .font(.subheadline)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 40)
            Spacer()
        }
    }

    private func loadRides() {
        isLoading = true
        currentOffset = 0
        P2PAPIService.shared.getCustomerRideHistory(limit: pageSize, offset: 0) { result in
            isLoading = false
            switch result {
            case .success(let response):
                rides = response.rides
                hasMore = response.has_more
                currentOffset = response.rides.count
            case .failure:
                rides = []
                hasMore = false
            }
        }
    }

    private func loadMoreRides() {
        isLoading = true
        P2PAPIService.shared.getCustomerRideHistory(limit: pageSize, offset: currentOffset) { result in
            isLoading = false
            switch result {
            case .success(let response):
                rides.append(contentsOf: response.rides)
                hasMore = response.has_more
                currentOffset += response.rides.count
            case .failure:
                break
            }
        }
    }
}

// MARK: - Ride History Card
struct RideHistoryCard: View {
    let ride: RideHistoryItem
    @State private var showReceipt = false

    private var statusColor: Color {
        switch ride.status {
        case "completed": return .green
        case "cancelled": return .red
        case "in_progress": return .purple
        case "matched": return .blue
        default: return .orange
        }
    }

    private var statusLabel: String {
        switch ride.status {
        case "completed": return "Completed"
        case "cancelled": return "Cancelled"
        case "in_progress": return "In Progress"
        case "matched": return "Matched"
        case "open": return "Open"
        case "bidding": return "Bidding"
        default: return ride.status?.capitalized ?? "Unknown"
        }
    }

    private var totalPaid: Double {
        (ride.fare ?? 0) + (ride.platform_fee ?? 0) + (ride.tip ?? 0)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Header: Date + Status
            HStack {
                if let date = ride.date {
                    Text(date)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                Spacer()
                Text(statusLabel)
                    .font(.caption)
                    .fontWeight(.semibold)
                    .foregroundColor(statusColor)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(statusColor.opacity(0.12))
                    .cornerRadius(6)
            }

            // Pickup → Dropoff
            VStack(alignment: .leading, spacing: 8) {
                HStack(spacing: 8) {
                    Circle()
                        .fill(Color.green)
                        .frame(width: 8, height: 8)
                    Text(ride.pickup ?? "Pickup")
                        .font(.subheadline)
                        .foregroundColor(Theme.brandBlack)
                        .lineLimit(1)
                }

                HStack(spacing: 8) {
                    Circle()
                        .fill(Color.red)
                        .frame(width: 8, height: 8)
                    Text(ride.dropoff ?? "Dropoff")
                        .font(.subheadline)
                        .foregroundColor(Theme.brandBlack)
                        .lineLimit(1)
                }
            }

            Divider()

            // Footer: Driver + Fare
            HStack {
                if let driverName = ride.driver_name {
                    HStack(spacing: 6) {
                        Image(systemName: "person.circle.fill")
                            .foregroundColor(.blue)
                        Text(driverName)
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
                Spacer()

                // Fare breakdown
                VStack(alignment: .trailing, spacing: 2) {
                    Text("$\(String(format: "%.2f", totalPaid))")
                        .font(.headline)
                        .fontWeight(.bold)
                        .foregroundColor(Theme.brandBlack)
                    if let tip = ride.tip, tip > 0 {
                        Text("incl. $\(String(format: "%.2f", tip)) tip")
                            .font(.caption2)
                            .foregroundColor(.secondary)
                    }
                }
            }

            // View Receipt button for completed rides
            if ride.status == "completed" {
                Button(action: { showReceipt = true }) {
                    HStack {
                        Image(systemName: "doc.text")
                        Text("View Receipt")
                    }
                    .font(.caption)
                    .fontWeight(.medium)
                    .foregroundColor(.green)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 8)
                    .background(Color.green.opacity(0.1))
                    .cornerRadius(8)
                }
            }
        }
        .padding(16)
        .background(Color.white)
        .cornerRadius(12)
        .shadow(color: .black.opacity(0.06), radius: 4, x: 0, y: 2)
        .sheet(isPresented: $showReceipt) {
            RideReceiptView(rideId: ride.id)
        }
    }
}

// MARK: - Enhanced Order Card
struct OrderCard: View {
    let order: Order
    let onReorder: () -> Void
    let onTrack: () -> Void
    let onCancel: (() -> Void)?
    let canCancel: Bool
    let refundStatus: P2PRefundStatusResponse?
    let onFetchRefundStatus: (() -> Void)?

    @State private var isExpanded = false
    @State private var showCancelConfirmation = false
    @State private var showRateRestaurant = false
    @State private var showRateDriver = false

    init(order: Order, onReorder: @escaping () -> Void, onTrack: @escaping () -> Void, onCancel: (() -> Void)? = nil, canCancel: Bool = false, refundStatus: P2PRefundStatusResponse? = nil, onFetchRefundStatus: (() -> Void)? = nil) {
        self.order = order
        self.onReorder = onReorder
        self.onTrack = onTrack
        self.onCancel = onCancel
        self.canCancel = canCancel
        self.refundStatus = refundStatus
        self.onFetchRefundStatus = onFetchRefundStatus
    }

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

                        // Order number for customer reference
                        Text("#\(order.orderId)")
                            .font(.caption)
                            .fontWeight(.medium)
                            .foregroundColor(Theme.brandGreen)

                        Text("\(order.itemsCount) items • $\(String(format: "%.2f", order.total))")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                    }

                    Spacer()

                    StatusBadge(status: order.status)
                }

                // Date - Using world-class time formatting
                HStack {
                    Image(systemName: "calendar")
                        .font(.caption)
                        .foregroundColor(.gray)
                    Text(orderDateFormatted)
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

            // Refund Status Section (for cancelled orders)
            if order.status == "Cancelled" {
                Divider()
                    .padding(.horizontal)

                VStack(alignment: .leading, spacing: 8) {
                    HStack {
                        Image(systemName: "dollarsign.arrow.circlepath")
                            .foregroundColor(.orange)
                        Text("Refund Status")
                            .font(.subheadline)
                            .fontWeight(.semibold)
                    }

                    if let status = refundStatus {
                        HStack {
                            VStack(alignment: .leading, spacing: 4) {
                                HStack {
                                    Circle()
                                        .fill(refundStatusColor(status.refundStatus))
                                        .frame(width: 8, height: 8)
                                    Text(status.refundStatus.capitalized)
                                        .font(.caption)
                                        .fontWeight(.medium)
                                        .foregroundColor(refundStatusColor(status.refundStatus))
                                }

                                if let amount = status.refundAmount, amount > 0 {
                                    Text("Amount: $\(String(format: "%.2f", amount))")
                                        .font(.caption)
                                        .foregroundColor(.secondary)
                                }

                                if let refundNumber = status.refundNumber {
                                    Text("Ref #: \(refundNumber)")
                                        .font(.caption)
                                        .foregroundColor(.secondary)
                                }

                                if let estimatedArrival = status.estimatedArrival {
                                    Text("Est. arrival: \(estimatedArrival)")
                                        .font(.caption)
                                        .foregroundColor(.secondary)
                                }

                                if let processedAt = status.processedAt {
                                    Text("Processed: \(processedAt)")
                                        .font(.caption)
                                        .foregroundColor(.secondary)
                                }
                            }
                            Spacer()
                        }
                    } else {
                        HStack {
                            Text("Tap to check refund status")
                                .font(.caption)
                                .foregroundColor(.secondary)
                            Spacer()
                            Button(action: {
                                onFetchRefundStatus?()
                            }) {
                                Text("Check")
                                    .font(.caption)
                                    .fontWeight(.medium)
                                    .foregroundColor(Theme.brandGreen)
                            }
                        }
                    }
                }
                .padding()
                .background(Color.orange.opacity(0.05))
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

                // Cancel Order Button (for cancellable orders)
                if canCancel {
                    Button(action: {
                        showCancelConfirmation = true
                    }) {
                        HStack(spacing: 4) {
                            Image(systemName: "xmark.circle.fill")
                            Text("Cancel")
                        }
                        .font(.caption)
                        .fontWeight(.semibold)
                        .foregroundColor(.white)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 8)
                        .background(Color.red)
                        .cornerRadius(8)
                    }
                }

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

                // Rate Buttons (for delivered orders)
                if order.status == "Delivered" {
                    // Rate Restaurant button (if not rated)
                    if !order.isRestaurantRated {
                        Button(action: { showRateRestaurant = true }) {
                            HStack(spacing: 4) {
                                Image(systemName: "star")
                                Text("Rate Food")
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

                    // Rate Driver button (if not rated and has driver)
                    if !order.isRated && order.driverId != nil {
                        Button(action: { showRateDriver = true }) {
                            HStack(spacing: 4) {
                                Image(systemName: "person.fill")
                                Text("Rate Driver")
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

                    // Reorder Button
                    Button(action: onReorder) {
                        HStack(spacing: 4) {
                            Image(systemName: "arrow.clockwise")
                            Text("Reorder")
                        }
                        .font(.caption)
                        .fontWeight(.semibold)
                        .foregroundColor(Theme.brandOrange)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 8)
                        .background(Theme.brandOrange.opacity(0.1))
                        .cornerRadius(8)
                    }
                }
            }
            .padding()
        }
        .background(Color.white)
        .cornerRadius(16)
        .shadow(color: Color.black.opacity(0.05), radius: 8, x: 0, y: 2)
        .sheet(isPresented: $showRateRestaurant) {
            RateRestaurantView(order: order)
        }
        .sheet(isPresented: $showRateDriver) {
            RateDriverView(order: order)
        }
        .alert("Cancel Order", isPresented: $showCancelConfirmation) {
            Button("Keep Order", role: .cancel) {}
            Button("Cancel Order", role: .destructive) {
                onCancel?()
            }
        } message: {
            Text("Are you sure you want to cancel this order? If payment was already processed, a refund will be initiated.")
        }
    }

    private var isActiveOrder: Bool {
        ["Placed", "Accepted", "Preparing", "Ready", "PickedUp", "OnTheWay"].contains(order.status)
    }

    /// Smart formatted date - shows relative time for recent, full date for older
    private var orderDateFormatted: String {
        let orderDate = Date(timeIntervalSince1970: TimeInterval(order.placedAt) / 1000)
        return DateTimeFormatter.shared.historyDetailTime(from: orderDate)
    }

    /// Get color for refund status
    private func refundStatusColor(_ status: String) -> Color {
        switch status.lowercased() {
        case "completed", "refunded":
            return .green
        case "processing", "pending":
            return .orange
        case "failed", "denied":
            return .red
        case "initiated":
            return .blue
        default:
            return .gray
        }
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
