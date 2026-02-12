import SwiftUI
import MapKit
import EatFairShared

// MARK: - Available Orders View
/// Supports both Food Delivery and P2P Rideshare Matchmaking
/// Rideshare: Drivers are independent contractors who set their own prices
struct AvailableOrdersView: View {
    @ObservedObject var viewModel: DeliveryViewModel
    @Binding var selectedTab: Int  // Binding to switch tabs after accepting order
    @StateObject private var locationManager = LocationManager.shared
    @State private var selectedFilter: OrderFilter = .all
    @State private var viewMode: ViewMode = .list
    @State private var selectedOrder: Order?
    @State private var selectedRide: P2PRide?
    @State private var rideToNegotiate: P2PRide?
    @State private var showEarningsSheet = false
    @State private var showMessagesSheet = false

    enum OrderFilter: String, CaseIterable {
        case all = "All"
        case nearby = "Nearby"
        case highPay = "High Pay"
        case quick = "Quick"
    }

    enum ViewMode {
        case list
        case map
    }

    var body: some View {
        NavigationView {
            ZStack {
                Theme.backgroundGrey.ignoresSafeArea()

                VStack(spacing: 0) {
                    // Service Mode Toggle (Food Delivery / Rideshare)
                    serviceModeToggle

                    // Header Stats Bar
                    statsHeader

                    // Filter & View Toggle
                    filterBar

                    // Content
                    if viewModel.isLoading {
                        loadingView
                    } else if viewModel.driverMode == .foodDelivery {
                        // Food Delivery Mode
                        if filteredOrders.isEmpty {
                            emptyStateView
                        } else {
                            if viewMode == .list {
                                ordersList
                            } else {
                                ordersMapView
                            }
                        }
                    } else {
                        // Rideshare Mode
                        if viewModel.availableRides.isEmpty {
                            rideEmptyStateView
                        } else {
                            if viewMode == .list {
                                ridesList
                            } else {
                                ridesMapView
                            }
                        }
                    }
                }
            }
            .navigationTitle("Available Orders")
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(action: { viewModel.fetchAvailableOrders() }) {
                        Image(systemName: "arrow.clockwise")
                            .foregroundColor(Theme.brandRed)
                    }
                    .accessibilityLabel("Refresh available orders")
                }
            }
            .onAppear {
                viewModel.fetchAvailableOrders()
                locationManager.requestPermission()
                locationManager.getCurrentLocation()
            }
            .sheet(item: $selectedOrder) { order in
                OrderDetailSheet(order: order, viewModel: viewModel, locationManager: locationManager, onAccepted: {
                    selectedTab = 2  // Switch to Active tab
                })
            }
            .sheet(item: $selectedRide) { ride in
                RideDetailSheet(ride: ride, viewModel: viewModel, locationManager: locationManager)
            }
            .sheet(item: $rideToNegotiate) { ride in
                FareNegotiationSheet(ride: ride, viewModel: viewModel)
            }
            .sheet(isPresented: $showEarningsSheet) {
                EarningsSummarySheet(viewModel: viewModel)
            }
            .sheet(isPresented: $showMessagesSheet) {
                MessagesListSheet()
            }
            .alert("Error", isPresented: $viewModel.showError) {
                Button("OK", role: .cancel) { }
                    .accessibilityLabel("Dismiss error")
            } message: {
                Text(viewModel.errorMessage ?? "")
            }
            .onReceive(NotificationCenter.default.publisher(for: .voiceCommandRecognized)) { notification in
                guard let command = notification.userInfo?["command"] as? VoiceAssistantManager.VoiceCommand else { return }
                handleVoiceCommand(command)
            }
        }
    }

    // MARK: - Voice Command Handler
    private func handleVoiceCommand(_ command: VoiceAssistantManager.VoiceCommand) {
        switch command {
        case .checkEarnings:
            showEarningsSheet = true
        case .readMessages:
            showMessagesSheet = true
        case .goOnline:
            viewModel.setOnlineStatus(true)
        case .goOffline:
            viewModel.setOnlineStatus(false)
        case .acceptOrder:
            // Accept first available order if any
            if let order = filteredOrders.first {
                viewModel.acceptOrder(order)
            } else if let ride = viewModel.availableRides.first {
                viewModel.acceptRide(ride)
            }
        case .declineOrder:
            // Just dismiss any open sheet
            selectedOrder = nil
            selectedRide = nil
            rideToNegotiate = nil
        default:
            break
        }
    }

    // MARK: - Service Mode Toggle (Food Delivery / Rideshare)
    private var serviceModeToggle: some View {
        HStack(spacing: 0) {
            ForEach(DriverMode.allCases, id: \.self) { mode in
                Button(action: {
                    withAnimation(.spring(response: 0.3)) {
                        viewModel.setDriverMode(mode)
                    }
                }) {
                    HStack(spacing: 8) {
                        Image(systemName: mode.icon)
                            .font(.subheadline)
                        Text(mode.displayName)
                            .font(.subheadline)
                            .fontWeight(.semibold)
                    }
                    .foregroundColor(viewModel.driverMode == mode ? .white : Theme.textSecondary)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
                    .background(
                        viewModel.driverMode == mode
                            ? (mode == .foodDelivery ? Theme.brandOrange : Color.blue)
                            : Color.clear
                    )
                }
                .accessibilityLabel("Switch to \(mode.displayName) mode")
                .accessibilityHint(viewModel.driverMode == mode ? "Currently selected" : "Tap to switch modes")
            }
        }
        .background(Theme.lightGrey)
        .cornerRadius(12)
        .padding(.horizontal)
        .padding(.top, 8)
    }

    // MARK: - Stats Header
    private var statsHeader: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 12) {
                QuickStatPill(
                    icon: "shippingbox.fill",
                    value: "\(viewModel.availableOrders.count)",
                    label: "Available",
                    color: Theme.brandRed
                )

                if let avgEarnings = averageEarnings {
                    QuickStatPill(
                        icon: "dollarsign.circle.fill",
                        value: "$\(String(format: "%.0f", avgEarnings))",
                        label: "Avg Pay",
                        color: Theme.statusActive
                    )
                }

                if let nearbyCount = nearbyOrdersCount {
                    QuickStatPill(
                        icon: "location.fill",
                        value: "\(nearbyCount)",
                        label: "< 2 mi",
                        color: Theme.statusInfo
                    )
                }
            }
            .padding(.horizontal)
            .padding(.vertical, 12)
        }
        .background(Theme.cardBackground)
    }

    // MARK: - Filter Bar
    private var filterBar: some View {
        HStack {
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    ForEach(OrderFilter.allCases, id: \.self) { filter in
                        FilterChip(
                            title: filter.rawValue,
                            isSelected: selectedFilter == filter,
                            action: { selectedFilter = filter }
                        )
                    }
                }
                .padding(.horizontal)
            }

            Spacer()

            // View Toggle
            HStack(spacing: 4) {
                Button(action: { viewMode = .list }) {
                    Image(systemName: "list.bullet")
                        .font(.subheadline)
                        .foregroundColor(viewMode == .list ? .white : Theme.textGrey)
                        .frame(width: 36, height: 36)
                        .background(viewMode == .list ? Theme.brandRed : Color.clear)
                        .cornerRadius(8)
                }
                .accessibilityLabel("List view")
                .accessibilityHint(viewMode == .list ? "Currently selected" : "Show orders as a list")

                Button(action: { viewMode = .map }) {
                    Image(systemName: "map")
                        .font(.subheadline)
                        .foregroundColor(viewMode == .map ? .white : Theme.textGrey)
                        .frame(width: 36, height: 36)
                        .background(viewMode == .map ? Theme.brandRed : Color.clear)
                        .cornerRadius(8)
                }
                .accessibilityLabel("Map view")
                .accessibilityHint(viewMode == .map ? "Currently selected" : "Show orders on a map")
            }
            .padding(4)
            .background(Theme.lightGrey)
            .cornerRadius(10)
            .padding(.trailing)
        }
        .padding(.vertical, 12)
        .background(Theme.cardBackground)
    }

    // MARK: - Orders List
    private var ordersList: some View {
        ScrollView {
            LazyVStack(spacing: 16) {
                ForEach(filteredOrders) { order in
                    OrderCard(
                        order: order,
                        locationManager: locationManager,
                        onTap: {
                            selectedOrder = order
                        },
                        onAccept: {
                            viewModel.acceptOrder(order)
                            // Switch to Active tab to show pickup/dropoff
                            DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
                                selectedTab = 2
                            }
                        }
                    )
                }
            }
            .padding()
        }
        .refreshable {
            viewModel.fetchAvailableOrders()
        }
    }

    // MARK: - Map View
    private var ordersMapView: some View {
        OrdersMapView(
            orders: filteredOrders,
            locationManager: locationManager,
            onOrderSelected: { order in
                selectedOrder = order
            }
        )
    }

    // MARK: - Loading View
    private var loadingView: some View {
        VStack(spacing: 20) {
            Spacer()
            ProgressView()
                .scaleEffect(1.5)
                .tint(Theme.brandRed)

            Text("Finding orders near you...")
                .font(.headline)
                .foregroundColor(Theme.textSecondary)
            Spacer()
        }
    }

    // MARK: - Empty State
    private var emptyStateView: some View {
        VStack(spacing: 24) {
            Spacer()

            ZStack {
                Circle()
                    .fill(Theme.brandRed.opacity(0.1))
                    .frame(width: 140, height: 140)

                Circle()
                    .fill(Theme.brandRed.opacity(0.15))
                    .frame(width: 100, height: 100)

                Image(systemName: "shippingbox")
                    .font(.system(size: 44))
                    .foregroundColor(Theme.brandRed)
            }

            VStack(spacing: 8) {
                Text("No Orders Available")
                    .font(.title2)
                    .fontWeight(.bold)
                    .foregroundColor(Theme.textPrimary)

                Text("New delivery requests will appear here.\nStay online to receive orders!")
                    .font(.subheadline)
                    .foregroundColor(Theme.textSecondary)
                    .multilineTextAlignment(.center)
            }

            Button(action: { viewModel.fetchAvailableOrders() }) {
                HStack {
                    Image(systemName: "arrow.clockwise")
                    Text("Refresh")
                }
                .font(.headline)
                .foregroundColor(.white)
                .padding(.horizontal, 32)
                .padding(.vertical, 14)
                .background(Theme.brandRed)
                .cornerRadius(12)
            }
            .accessibilityLabel("Refresh orders")
            .accessibilityHint("Check for new available delivery orders")

            Spacer()
        }
        .padding()
    }

    // MARK: - Rideshare Empty State
    private var rideEmptyStateView: some View {
        VStack(spacing: 24) {
            Spacer()

            ZStack {
                Circle()
                    .fill(Color.blue.opacity(0.1))
                    .frame(width: 140, height: 140)

                Circle()
                    .fill(Color.blue.opacity(0.15))
                    .frame(width: 100, height: 100)

                Image(systemName: "car.fill")
                    .font(.system(size: 44))
                    .foregroundColor(.blue)
            }

            VStack(spacing: 8) {
                Text("No Ride Requests")
                    .font(.title2)
                    .fontWeight(.bold)
                    .foregroundColor(Theme.textPrimary)

                Text("Rider connection requests will appear here.\nOnly $\(String(format: "%.0f", AppConfig.shared.rideshareTier1Fee)) connection fee!")
                    .font(.subheadline)
                    .foregroundColor(Theme.textSecondary)
                    .multilineTextAlignment(.center)
            }

            Button(action: { viewModel.fetchAvailableRides() }) {
                HStack {
                    Image(systemName: "arrow.clockwise")
                    Text("Refresh")
                }
                .font(.headline)
                .foregroundColor(.white)
                .padding(.horizontal, 32)
                .padding(.vertical, 14)
                .background(Color.blue)
                .cornerRadius(12)
            }
            .accessibilityLabel("Refresh ride requests")
            .accessibilityHint("Check for new available ride requests")

            Spacer()
        }
        .padding()
    }

    // MARK: - Rides List
    private var ridesList: some View {
        ScrollView {
            LazyVStack(spacing: 16) {
                ForEach(viewModel.availableRides) { ride in
                    RideCard(
                        ride: ride,
                        locationManager: locationManager,
                        onTap: {
                            selectedRide = ride
                        },
                        onAccept: {
                            viewModel.acceptRide(ride)
                        },
                        onNegotiate: {
                            rideToNegotiate = ride
                        }
                    )
                }
            }
            .padding()
        }
        .refreshable {
            viewModel.fetchAvailableRides()
        }
    }

    // MARK: - Rides Map View
    private var ridesMapView: some View {
        RidesMapView(
            rides: viewModel.availableRides,
            locationManager: locationManager,
            onRideSelected: { ride in
                selectedRide = ride
            }
        )
    }

    // MARK: - Computed Properties
    private var filteredOrders: [Order] {
        switch selectedFilter {
        case .all:
            return viewModel.availableOrders
        case .nearby:
            return viewModel.availableOrders.sorted { order1, order2 in
                let dist1 = locationManager.distanceTo(latitude: order1.restaurant.latitude, longitude: order1.restaurant.longitude) ?? .infinity
                let dist2 = locationManager.distanceTo(latitude: order2.restaurant.latitude, longitude: order2.restaurant.longitude) ?? .infinity
                return dist1 < dist2
            }
        case .highPay:
            return viewModel.availableOrders.sorted { ($0.deliveryFee + $0.priorityFee + $0.tip) > ($1.deliveryFee + $1.priorityFee + $1.tip) }
        case .quick:
            return viewModel.availableOrders.sorted { order1, order2 in
                let dist1 = (locationManager.distanceTo(latitude: order1.deliveryAddress.latitude, longitude: order1.deliveryAddress.longitude) ?? .infinity)
                let dist2 = (locationManager.distanceTo(latitude: order2.deliveryAddress.latitude, longitude: order2.deliveryAddress.longitude) ?? .infinity)
                return dist1 < dist2
            }
        }
    }

    private var averageEarnings: Double? {
        guard !viewModel.availableOrders.isEmpty else { return nil }
        let total = viewModel.availableOrders.reduce(0) { $0 + $1.deliveryFee + $1.priorityFee + $1.tip }
        return total / Double(viewModel.availableOrders.count)
    }

    private var nearbyOrdersCount: Int? {
        guard locationManager.currentLocation != nil else { return nil }
        let nearbyDistance = AppConfig.shared.nearbyDistanceMeters
        return viewModel.availableOrders.filter { order in
            let distance = locationManager.distanceTo(latitude: order.restaurant.latitude, longitude: order.restaurant.longitude) ?? .infinity
            return distance < nearbyDistance
        }.count
    }
}

// MARK: - Quick Stat Pill
struct QuickStatPill: View {
    let icon: String
    let value: String
    let label: String
    let color: Color

    var body: some View {
        HStack(spacing: 8) {
            Image(systemName: icon)
                .font(.caption)
                .foregroundColor(color)

            VStack(alignment: .leading, spacing: 0) {
                Text(value)
                    .font(.subheadline)
                    .fontWeight(.bold)
                    .foregroundColor(Theme.textPrimary)
                Text(label)
                    .font(.caption2)
                    .foregroundColor(Theme.textSecondary)
            }
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 10)
        .background(color.opacity(0.1))
        .cornerRadius(20)
    }
}

// MARK: - Filter Chip
struct FilterChip: View {
    let title: String
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(title)
                .font(.subheadline)
                .fontWeight(.semibold)
                .foregroundColor(isSelected ? .white : Theme.textSecondary)
                .padding(.horizontal, 18)
                .padding(.vertical, 10)
                .background(isSelected ? Theme.brandRed : Theme.lightGrey)
                .cornerRadius(20)
        }
        .accessibilityLabel("Filter by \(title)")
        .accessibilityHint(isSelected ? "Currently selected" : "Tap to filter orders")
    }
}

// MARK: - Order Card
struct OrderCard: View {
    let order: Order
    let locationManager: LocationManager
    let onTap: () -> Void
    let onAccept: () -> Void

    @State private var showAcceptConfirmation = false

    private var totalEarnings: Double {
        order.deliveryFee + order.priorityFee + order.tip
    }

    private var distanceToRestaurant: String {
        guard let distance = locationManager.distanceTo(latitude: order.restaurant.latitude, longitude: order.restaurant.longitude) else {
            return "--"
        }
        return locationManager.formatDistance(distance)
    }

    private var estimatedTime: String {
        guard let eta = locationManager.etaTo(latitude: order.deliveryAddress.latitude, longitude: order.deliveryAddress.longitude) else {
            return "--"
        }
        return locationManager.formatETA(eta)
    }

    var body: some View {
        VStack(spacing: 0) {
            // Main Content
            VStack(alignment: .leading, spacing: 16) {
                // Header
                HStack(alignment: .top) {
                    VStack(alignment: .leading, spacing: 4) {
                        HStack(spacing: 8) {
                            Text(order.restaurant.name)
                                .font(.headline)
                                .fontWeight(.bold)
                                .foregroundColor(Theme.textPrimary)
                                .lineLimit(1)

                            // Order number badge - prominent for easy reference
                            Text("#\(order.orderId)")
                                .font(.caption)
                                .fontWeight(.bold)
                                .foregroundColor(.white)
                                .padding(.horizontal, 8)
                                .padding(.vertical, 3)
                                .background(Theme.brandOrange)
                                .cornerRadius(6)
                        }

                        HStack(spacing: 12) {
                            Label("\(order.itemsCount) items", systemImage: "bag.fill")
                            Label(distanceToRestaurant, systemImage: "location.fill")
                        }
                        .font(.caption)
                        .foregroundColor(Theme.textSecondary)
                    }

                    Spacer()

                    // Earnings Badge
                    VStack(alignment: .trailing, spacing: 2) {
                        Text("$\(String(format: "%.2f", totalEarnings))")
                            .font(.title2)
                            .fontWeight(.bold)
                            .foregroundColor(Theme.statusActive)

                        Text("earnings")
                            .font(.caption2)
                            .foregroundColor(Theme.textSecondary)
                    }
                }

                Divider()

                // Route Info
                VStack(spacing: 12) {
                    RouteStopRow(
                        type: .pickup,
                        title: "Pickup",
                        address: order.restaurant.address
                    )

                    RouteStopRow(
                        type: .dropoff,
                        title: "Dropoff",
                        address: order.deliveryAddress.fullAddress
                    )
                }

                // Quick Stats
                HStack(spacing: 16) {
                    // ETA badge - show "Ready in X min" or "Ready Now!"
                    if let isReady = order.isReady, isReady {
                        OrderStatBadge(icon: "checkmark.circle.fill", text: "Ready Now!", color: .green)
                    } else if let minutes = order.minutesUntilReady, minutes > 0 {
                        OrderStatBadge(icon: "clock.fill", text: "Ready ~\(minutes)m", color: Theme.brandOrange)
                    } else {
                        OrderStatBadge(icon: "clock.fill", text: estimatedTime, color: Theme.statusInfo)
                    }

                    OrderStatBadge(icon: "bag.fill", text: "\(order.itemsCount) items", color: Theme.brandOrange)

                    if order.priorityFee > 0 {
                        OrderStatBadge(icon: "bolt.fill", text: "Priority", color: Theme.statusWarning)
                    }
                }
            }
            .padding()
            .onTapGesture(perform: onTap)

            Divider()

            // Action Buttons
            HStack(spacing: 12) {
                Button(action: onTap) {
                    HStack {
                        Image(systemName: "map.fill")
                        Text("Details")
                    }
                    .font(.subheadline)
                    .fontWeight(.semibold)
                    .foregroundColor(Theme.brandRed)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 14)
                    .background(Theme.brandRed.opacity(0.1))
                    .cornerRadius(12)
                }
                .accessibilityLabel("View order details")
                .accessibilityHint("See full order information and route")

                Button(action: { showAcceptConfirmation = true }) {
                    HStack {
                        Image(systemName: "checkmark.circle.fill")
                        Text("Accept")
                    }
                    .font(.subheadline)
                    .fontWeight(.bold)
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 14)
                    .background(Theme.brandRed)
                    .cornerRadius(12)
                    .shadow(color: Theme.brandRed.opacity(0.3), radius: 8, x: 0, y: 4)
                }
                .accessibilityLabel("Accept this delivery order")
                .accessibilityHint("Assigns this order to you for delivery")
            }
            .padding()
        }
        .background(Theme.cardBackground)
        .cornerRadius(20)
        .shadow(color: .black.opacity(0.08), radius: 12, x: 0, y: 4)
        .confirmationDialog("Accept Delivery?", isPresented: $showAcceptConfirmation) {
            Button("Accept - Earn $\(String(format: "%.2f", totalEarnings))") {
                onAccept()
            }
            .accessibilityLabel("Confirm accept order for \(String(format: "%.2f", totalEarnings)) dollars")
            Button("Cancel", role: .cancel) {}
                .accessibilityLabel("Cancel and go back")
        } message: {
            Text("Pick up from \(order.restaurant.name) and deliver to \(order.customerName)")
        }
    }
}

// MARK: - Route Stop Row
struct RouteStopRow: View {
    enum StopType {
        case pickup
        case dropoff

        var icon: String {
            switch self {
            case .pickup: return "arrow.up.circle.fill"
            case .dropoff: return "arrow.down.circle.fill"
            }
        }

        var color: Color {
            switch self {
            case .pickup: return Theme.brandOrange
            case .dropoff: return Theme.statusActive
            }
        }
    }

    let type: StopType
    let title: String
    let address: String

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: type.icon)
                .font(.title3)
                .foregroundColor(type.color)
                .frame(width: 28)

            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.caption)
                    .fontWeight(.semibold)
                    .foregroundColor(Theme.textSecondary)

                Text(address)
                    .font(.subheadline)
                    .foregroundColor(Theme.textPrimary)
                    .lineLimit(1)
            }
        }
    }
}

// MARK: - Order Stat Badge
struct OrderStatBadge: View {
    let icon: String
    let text: String
    let color: Color

    var body: some View {
        HStack(spacing: 4) {
            Image(systemName: icon)
                .font(.caption2)
            Text(text)
                .font(.caption)
                .fontWeight(.medium)
        }
        .foregroundColor(color)
        .padding(.horizontal, 10)
        .padding(.vertical, 6)
        .background(color.opacity(0.1))
        .cornerRadius(8)
    }
}

// MARK: - Orders Map View
struct OrdersMapView: View {
    let orders: [Order]
    let locationManager: LocationManager
    let onOrderSelected: (Order) -> Void

    @State private var position: MapCameraPosition = .automatic

    var body: some View {
        Map(position: $position) {
            // Driver's current location - Blue Dot
            if let coordinate = locationManager.currentCoordinate, coordinate.isValid {
                Annotation("You", coordinate: coordinate) {
                    ZStack {
                        Circle()
                            .fill(Color.blue.opacity(0.2))
                            .frame(width: 60, height: 60)

                        Circle()
                            .fill(Color.blue.opacity(0.4))
                            .frame(width: 40, height: 40)

                        Circle()
                            .fill(Color.blue)
                            .frame(width: 20, height: 20)
                            .overlay(
                                Circle()
                                    .stroke(Color.white, lineWidth: 3)
                            )
                            .shadow(color: .blue.opacity(0.5), radius: 4)
                    }
                }
            }

            // Order pickup locations
            ForEach(orders) { order in
                Annotation(order.restaurant.name, coordinate: CLLocationCoordinate2D(
                    latitude: order.restaurant.latitude,
                    longitude: order.restaurant.longitude
                )) {
                    Button(action: { onOrderSelected(order) }) {
                        VStack(spacing: 2) {
                            ZStack {
                                Circle()
                                    .fill(Theme.brandRed)
                                    .frame(width: 44, height: 44)
                                    .shadow(color: Theme.brandRed.opacity(0.4), radius: 6)

                                Text("$\(Int(order.deliveryFee + order.priorityFee))")
                                    .font(.caption)
                                    .fontWeight(.bold)
                                    .foregroundColor(.white)
                            }

                            Image(systemName: "arrowtriangle.down.fill")
                                .font(.system(size: 10))
                                .foregroundColor(Theme.brandRed)
                                .offset(y: -4)
                        }
                    }
                    .accessibilityLabel("Order from \(order.restaurant.name), \(Int(order.deliveryFee + order.priorityFee)) dollars")
                    .accessibilityHint("Tap to view order details")
                }
            }
        }
        .mapStyle(.standard(elevation: .realistic))
        .mapControls {
            MapUserLocationButton()
            MapCompass()
        }
        .onAppear {
            updateMapPosition()
        }
    }

    private func updateMapPosition() {
        if let coordinate = locationManager.currentCoordinate, coordinate.isValid {
            position = .region(MKCoordinateRegion(
                center: coordinate,
                span: MKCoordinateSpan(latitudeDelta: 0.05, longitudeDelta: 0.05)
            ))
        }
    }
}

// MARK: - Order Detail Sheet
struct OrderDetailSheet: View {
    let order: Order
    @ObservedObject var viewModel: DeliveryViewModel
    let locationManager: LocationManager
    var onAccepted: (() -> Void)?  // Callback to switch tabs
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 20) {
                    // Map Preview
                    OrderDetailMapPreview(order: order, locationManager: locationManager)
                        .frame(height: 200)
                        .cornerRadius(16)
                        .padding(.horizontal)

                    // Earnings Card
                    VStack(spacing: 12) {
                        Text("Estimated Earnings")
                            .font(.subheadline)
                            .foregroundColor(Theme.textSecondary)

                        Text("$\(String(format: "%.2f", order.deliveryFee + order.priorityFee + order.tip))")
                            .font(.system(size: 44, weight: .bold))
                            .foregroundColor(Theme.statusActive)

                        HStack(spacing: 20) {
                            EarningBreakdownItem(label: "Delivery", amount: order.deliveryFee)
                            if order.priorityFee > 0 {
                                EarningBreakdownItem(label: "Priority", amount: order.priorityFee)
                            }
                            if order.tip > 0 {
                                EarningBreakdownItem(label: "Tip", amount: order.tip)
                            }
                        }
                    }
                    .padding()
                    .background(Theme.earningsGradient)
                    .cornerRadius(16)
                    .padding(.horizontal)

                    // Route Details
                    VStack(alignment: .leading, spacing: 16) {
                        Text("Route")
                            .font(.headline)
                            .foregroundColor(Theme.textPrimary)

                        DetailRouteCard(
                            icon: "bag.fill",
                            iconColor: Theme.brandOrange,
                            title: "Pickup",
                            name: order.restaurant.name,
                            address: order.restaurant.address
                        )

                        DetailRouteCard(
                            icon: "house.fill",
                            iconColor: Theme.statusActive,
                            title: "Dropoff",
                            name: order.customerName,
                            address: order.deliveryAddress.fullAddress
                        )
                    }
                    .padding()
                    .background(Theme.cardBackground)
                    .cornerRadius(16)
                    .padding(.horizontal)

                    // Order Items
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Order Items (\(order.itemsCount))")
                            .font(.headline)
                            .foregroundColor(Theme.textPrimary)

                        ForEach(order.items) { item in
                            HStack {
                                Text("\(item.quantity)x")
                                    .font(.subheadline)
                                    .fontWeight(.semibold)
                                    .foregroundColor(Theme.brandRed)
                                    .frame(width: 30)

                                Text(item.name)
                                    .font(.subheadline)
                                    .foregroundColor(Theme.textPrimary)

                                Spacer()
                            }
                            .padding(.vertical, 4)
                        }
                    }
                    .padding()
                    .background(Theme.cardBackground)
                    .cornerRadius(16)
                    .padding(.horizontal)

                    // Delivery Instructions
                    if !order.deliveryInstructions.isEmpty {
                        VStack(alignment: .leading, spacing: 12) {
                            HStack {
                                Image(systemName: "note.text")
                                    .foregroundColor(Theme.statusWarning)
                                Text("Delivery Instructions")
                                    .font(.headline)
                            }
                            .foregroundColor(Theme.textPrimary)

                            Text(order.deliveryInstructions)
                                .font(.subheadline)
                                .foregroundColor(Theme.textSecondary)
                        }
                        .padding()
                        .background(Theme.cardBackground)
                        .cornerRadius(16)
                        .padding(.horizontal)
                    }
                }
                .padding(.vertical)
            }
            .background(Theme.backgroundGrey.ignoresSafeArea())
            .navigationTitle("Order #\(order.orderId)")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Close") { dismiss() }
                        .accessibilityLabel("Close order details")
                }
            }
            .safeAreaInset(edge: .bottom) {
                Button(action: {
                    viewModel.acceptOrder(order)
                    dismiss()
                    // Switch to Active tab after accepting
                    DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
                        onAccepted?()
                    }
                }) {
                    HStack {
                        Image(systemName: "checkmark.circle.fill")
                        Text("Accept Delivery")
                    }
                    .font(.headline)
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Theme.brandRed)
                    .cornerRadius(16)
                }
                .accessibilityLabel("Accept this delivery order")
                .accessibilityHint("Assigns this order to you for delivery")
                .padding()
                .background(Theme.cardBackground)
            }
        }
    }
}

// MARK: - Helper Views
struct EarningBreakdownItem: View {
    let label: String
    let amount: Double

    var body: some View {
        VStack(spacing: 2) {
            Text("$\(String(format: "%.2f", amount))")
                .font(.subheadline)
                .fontWeight(.semibold)
                .foregroundColor(.white)
            Text(label)
                .font(.caption2)
                .foregroundColor(.white.opacity(0.8))
        }
    }
}

struct DetailRouteCard: View {
    let icon: String
    let iconColor: Color
    let title: String
    let name: String
    let address: String

    var body: some View {
        HStack(spacing: 14) {
            Image(systemName: icon)
                .font(.title2)
                .foregroundColor(iconColor)
                .frame(width: 50, height: 50)
                .background(iconColor.opacity(0.1))
                .cornerRadius(12)

            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.caption)
                    .foregroundColor(Theme.textSecondary)

                Text(name)
                    .font(.subheadline)
                    .fontWeight(.semibold)
                    .foregroundColor(Theme.textPrimary)

                Text(address)
                    .font(.caption)
                    .foregroundColor(Theme.textSecondary)
                    .lineLimit(2)
            }

            Spacer()
        }
    }
}

struct OrderDetailMapPreview: View {
    let order: Order
    let locationManager: LocationManager

    var body: some View {
        Map {
            // Driver location
            if let coordinate = locationManager.currentCoordinate, coordinate.isValid {
                Annotation("You", coordinate: coordinate) {
                    Circle()
                        .fill(Color.blue)
                        .frame(width: 16, height: 16)
                        .overlay(Circle().stroke(Color.white, lineWidth: 2))
                }
            }

            // Pickup
            Annotation("Pickup", coordinate: CLLocationCoordinate2D(
                latitude: order.restaurant.latitude,
                longitude: order.restaurant.longitude
            )) {
                Image(systemName: "bag.fill")
                    .foregroundColor(.white)
                    .padding(8)
                    .background(Theme.brandOrange)
                    .clipShape(Circle())
            }

            // Dropoff
            Annotation("Dropoff", coordinate: CLLocationCoordinate2D(
                latitude: order.deliveryAddress.latitude,
                longitude: order.deliveryAddress.longitude
            )) {
                Image(systemName: "house.fill")
                    .foregroundColor(.white)
                    .padding(8)
                    .background(Theme.statusActive)
                    .clipShape(Circle())
            }
        }
        .mapStyle(.standard)
    }
}

// MARK: - Ride Card Component
/// World-class ride card with pickup/dropoff locations and negotiation option
struct RideCard: View {
    let ride: P2PRide
    let locationManager: LocationManager
    let onTap: () -> Void
    let onAccept: () -> Void
    let onNegotiate: () -> Void

    private var distanceToPickup: Double? {
        guard let pickup = ride.pickup, let lat = pickup.lat, let lng = pickup.lng else { return nil }
        return locationManager.distanceTo(latitude: lat, longitude: lng)
    }

    var body: some View {
        VStack(spacing: 0) {
            // Header with earnings and distance
            HStack {
                // Earnings Badge - show customer's offer if available
                VStack(alignment: .leading, spacing: 2) {
                    Text("$\(String(format: "%.2f", ride.displayPrice))")
                        .font(.title2)
                        .fontWeight(.bold)
                        .foregroundColor(.white)
                    HStack(spacing: 4) {
                        if ride.hasCustomerOffer {
                            Text("Customer's offer")
                                .font(.caption2)
                        } else {
                            Text("$\(String(format: "%.2f", ride.fee)) fare")
                                .font(.caption2)
                        }
                        if let tip = ride.tip, tip > 0 {
                            Text("+ $\(String(format: "%.2f", tip)) tip")
                                .font(.caption2)
                        }
                    }
                    .foregroundColor(.white.opacity(0.8))
                }
                .padding(.horizontal, 12)
                .padding(.vertical, 8)
                .background(
                    LinearGradient(
                        colors: ride.hasCustomerOffer ? [Color.green, Color.green.opacity(0.8)] : [Color.blue, Color.blue.opacity(0.8)],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
                .cornerRadius(12)

                Spacer()

                // Distance & Platform Fee
                VStack(alignment: .trailing, spacing: 4) {
                    if let distance = distanceToPickup {
                        HStack(spacing: 4) {
                            Image(systemName: "location.fill")
                                .font(.caption2)
                            Text("\(String(format: "%.1f", distance / 1609.34)) mi away")
                                .font(.caption)
                                .fontWeight(.medium)
                        }
                        .foregroundColor(Theme.textSecondary)
                    }

                    // Connection fee badge - P2P matchmaking
                    HStack(spacing: 4) {
                        Image(systemName: "dollarsign.circle.fill")
                            .font(.caption2)
                        Text("$\(String(format: "%.0f", AppConfig.shared.rideshareTier1Fee)) connection fee")
                            .font(.caption2)
                            .fontWeight(.bold)
                    }
                    .foregroundColor(.green)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(Color.green.opacity(0.15))
                    .cornerRadius(8)

                    // Ride Number - for easy reference
                    Text("#\(ride.rideNumber)")
                        .font(.caption)
                        .fontWeight(.bold)
                        .foregroundColor(.white)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(Theme.brandOrange)
                        .cornerRadius(6)
                }
            }
            .padding()

            Divider()
                .padding(.horizontal)

            // Pickup Location
            HStack(spacing: 12) {
                ZStack {
                    Circle()
                        .fill(Color.green.opacity(0.15))
                        .frame(width: 40, height: 40)
                    Image(systemName: "person.fill")
                        .foregroundColor(.green)
                }

                VStack(alignment: .leading, spacing: 2) {
                    Text("PICKUP")
                        .font(.caption2)
                        .fontWeight(.semibold)
                        .foregroundColor(Theme.textSecondary)
                    Text(ride.pickup?.fullAddress ?? "Address pending...")
                        .font(.subheadline)
                        .foregroundColor(Theme.textPrimary)
                        .lineLimit(2)
                }

                Spacer()
            }
            .padding(.horizontal)
            .padding(.top, 12)

            // Route line
            HStack {
                Rectangle()
                    .fill(Color.blue.opacity(0.3))
                    .frame(width: 2, height: 24)
                    .padding(.leading, 32)
                Spacer()
            }

            // Dropoff Location
            HStack(spacing: 12) {
                ZStack {
                    Circle()
                        .fill(Color.red.opacity(0.15))
                        .frame(width: 40, height: 40)
                    Image(systemName: "mappin.circle.fill")
                        .foregroundColor(.red)
                }

                VStack(alignment: .leading, spacing: 2) {
                    Text("DROP-OFF")
                        .font(.caption2)
                        .fontWeight(.semibold)
                        .foregroundColor(Theme.textSecondary)
                    Text(ride.dropoff?.fullAddress ?? "Destination pending...")
                        .font(.subheadline)
                        .foregroundColor(Theme.textPrimary)
                        .lineLimit(2)
                }

                Spacer()
            }
            .padding(.horizontal)
            .padding(.bottom, 12)

            // Customer name if available
            if let customerName = ride.customerName, !customerName.isEmpty {
                HStack {
                    Image(systemName: "person.crop.circle")
                        .foregroundColor(Theme.textSecondary)
                    Text(customerName)
                        .font(.caption)
                        .foregroundColor(Theme.textSecondary)
                    Spacer()
                }
                .padding(.horizontal)
                .padding(.bottom, 8)
            }

            Divider()
                .padding(.horizontal)

            // Action Buttons
            HStack(spacing: 12) {
                // Accept Button
                Button(action: onAccept) {
                    HStack {
                        Image(systemName: "checkmark.circle.fill")
                        Text("Accept")
                    }
                    .font(.subheadline)
                    .fontWeight(.semibold)
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
                    .background(Color.blue)
                    .cornerRadius(10)
                }
                .accessibilityLabel("Accept this ride request")
                .accessibilityHint("Accept the ride at the current price")

                // Negotiate Button - unique feature!
                Button(action: onNegotiate) {
                    HStack {
                        Image(systemName: "arrow.triangle.2.circlepath")
                        Text("Negotiate")
                    }
                    .font(.subheadline)
                    .fontWeight(.semibold)
                    .foregroundColor(.blue)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
                    .background(Color.blue.opacity(0.1))
                    .cornerRadius(10)
                    .overlay(
                        RoundedRectangle(cornerRadius: 10)
                            .stroke(Color.blue, lineWidth: 1)
                    )
                }
                .accessibilityLabel("Negotiate fare")
                .accessibilityHint("Set your own price for this ride")
            }
            .padding()
        }
        .background(Theme.cardBackground)
        .cornerRadius(16)
        .shadow(color: Color.black.opacity(0.08), radius: 8, x: 0, y: 4)
        .onTapGesture(perform: onTap)
    }
}

// MARK: - Rides Map View Component
struct RidesMapView: View {
    let rides: [P2PRide]
    let locationManager: LocationManager
    let onRideSelected: (P2PRide) -> Void

    var body: some View {
        Map {
            // Driver's current location
            if let coordinate = locationManager.currentCoordinate, coordinate.isValid {
                Annotation("You", coordinate: coordinate) {
                    ZStack {
                        Circle()
                            .fill(Color.blue)
                            .frame(width: 20, height: 20)
                        Circle()
                            .stroke(Color.white, lineWidth: 3)
                            .frame(width: 20, height: 20)
                    }
                }
            }

            // All available ride pickups
            ForEach(rides) { ride in
                if let pickup = ride.pickup, let lat = pickup.lat, let lng = pickup.lng {
                    Annotation("$\(String(format: "%.0f", ride.earnings))", coordinate: CLLocationCoordinate2D(latitude: lat, longitude: lng)) {
                        Button(action: { onRideSelected(ride) }) {
                            VStack(spacing: 2) {
                                ZStack {
                                    Circle()
                                        .fill(Color.blue)
                                        .frame(width: 36, height: 36)
                                    Image(systemName: "car.fill")
                                        .font(.system(size: 16))
                                        .foregroundColor(.white)
                                }
                                Text("$\(String(format: "%.0f", ride.earnings))")
                                    .font(.caption2)
                                    .fontWeight(.bold)
                                    .foregroundColor(.white)
                                    .padding(.horizontal, 6)
                                    .padding(.vertical, 2)
                                    .background(Color.blue)
                                    .cornerRadius(4)
                            }
                        }
                        .accessibilityLabel("Ride request for \(String(format: "%.0f", ride.earnings)) dollars")
                        .accessibilityHint("Tap to view ride details")
                    }
                }
            }
        }
        .mapStyle(.standard)
    }
}

// MARK: - Fare Negotiation Sheet
/// P2P Matchmaking: Drivers set their own prices and negotiate directly with riders
/// $1 connection fee for using the matchmaking platform
struct FareNegotiationSheet: View {
    let ride: P2PRide
    @ObservedObject var viewModel: DeliveryViewModel
    @Environment(\.dismiss) var dismiss
    @State private var counterOffer: String = ""

    private var platformFee: Double { AppConfig.shared.rideshareTier1Fee }

    var body: some View {
        NavigationView {
            mainContent
                .background(Theme.backgroundGrey)
                .navigationTitle("Set Your Price")
                .navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    ToolbarItem(placement: .navigationBarTrailing) {
                        Button("Cancel") { dismiss() }
                            .accessibilityLabel("Cancel negotiation")
                    }
                }
        }
        .navigationViewStyle(.stack)
        .presentationBackground(Theme.backgroundGrey)
    }

    // MARK: - Main Content
    private var mainContent: some View {
        VStack(spacing: 24) {
            // Header
            VStack(spacing: 8) {
                ZStack {
                    Circle()
                        .fill(Color.blue.opacity(0.15))
                        .frame(width: 80, height: 80)
                    Image(systemName: "arrow.triangle.2.circlepath")
                        .font(.system(size: 32))
                        .foregroundColor(.blue)
                }

                Text("Set Your Price")
                    .font(.title2)
                    .fontWeight(.bold)

                Text("As an independent driver, you set your own rates")
                    .font(.subheadline)
                    .foregroundColor(Theme.textSecondary)
            }
            .padding(.top)

                // Current Fare Display
                VStack(spacing: 12) {
                    // Show customer's actual offer if they made one
                    if ride.hasCustomerOffer {
                        HStack {
                            VStack(alignment: .leading, spacing: 2) {
                                Text("Customer's Offer")
                                    .foregroundColor(Theme.textSecondary)
                                Text("Negotiated price")
                                    .font(.caption)
                                    .foregroundColor(.green)
                            }
                            Spacer()
                            Text("$\(String(format: "%.2f", ride.displayPrice))")
                                .font(.title2)
                                .fontWeight(.bold)
                                .foregroundColor(.green)
                        }

                        // Show suggested price for reference
                        HStack {
                            Text("Suggested fare")
                                .font(.caption)
                                .foregroundColor(Theme.textSecondary)
                            Spacer()
                            Text("$\(String(format: "%.2f", ride.fee))")
                                .font(.caption)
                                .foregroundColor(Theme.textSecondary)
                                .strikethrough()
                        }
                    } else {
                        HStack {
                            Text("Suggested Fare")
                                .foregroundColor(Theme.textSecondary)
                            Spacer()
                            Text("$\(String(format: "%.2f", ride.fee))")
                                .font(.title3)
                                .fontWeight(.bold)
                                .foregroundColor(Theme.textPrimary)
                        }
                    }

                    Divider()

                    // Connection Fee Info - P2P matchmaking
                    HStack {
                        VStack(alignment: .leading, spacing: 4) {
                            Text("Connection Fee")
                                .foregroundColor(Theme.textSecondary)
                            Text("$\(String(format: "%.0f", platformFee)) for matchmaking service")
                                .font(.caption)
                                .foregroundColor(.green)
                        }
                        Spacer()
                        Text("$\(String(format: "%.2f", platformFee))")
                            .font(.headline)
                            .foregroundColor(.green)
                    }
                }
                .padding()
                .background(Theme.lightGrey)
                .cornerRadius(12)
                .padding(.horizontal)

                // Your Price Input
                VStack(alignment: .leading, spacing: 8) {
                    Text("Your Price")
                        .font(.headline)
                        .foregroundColor(Theme.textPrimary)

                    HStack {
                        Text("$")
                            .font(.title)
                            .foregroundColor(Theme.textSecondary)
                        TextField("0.00", text: $counterOffer)
                            .font(.title)
                            .keyboardType(.decimalPad)
                            .foregroundColor(Theme.textPrimary)
                    }
                    .padding()
                    .background(Color.white)
                    .cornerRadius(12)
                    .overlay(
                        RoundedRectangle(cornerRadius: 12)
                            .stroke(Color.blue, lineWidth: 2)
                    )

                    // Earnings preview
                    if let offer = Double(counterOffer), offer > 0 {
                        HStack {
                            Text("You receive after $\(String(format: "%.0f", platformFee)) connection fee:")
                                .font(.caption)
                                .foregroundColor(Theme.textSecondary)
                            Spacer()
                            Text("$\(String(format: "%.2f", offer - platformFee))")
                                .font(.subheadline)
                                .fontWeight(.bold)
                                .foregroundColor(.green)
                        }
                        .padding(.top, 4)
                    }
                }
                .padding(.horizontal)

                Spacer()

                // Action Buttons
                VStack(spacing: 12) {
                    // Submit Your Price
                    Button(action: {
                        if let offer = Double(counterOffer), offer > 0 {
                            viewModel.submitCounterOffer(rideId: ride.rideId, counterFare: offer)
                            dismiss()
                        }
                    }) {
                        Text("Send My Price to Rider")
                            .font(.headline)
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(Double(counterOffer) ?? 0 > 0 ? Color.blue : Color.gray)
                            .cornerRadius(12)
                    }
                    .disabled((Double(counterOffer) ?? 0) <= 0)
                    .accessibilityLabel("Send your price to rider")
                    .accessibilityHint("Submit your counter offer for this ride")

                    // Accept Rider's Offer (use customer's negotiated price if available)
                    Button(action: {
                        viewModel.acceptCustomerFare(rideId: ride.rideId, fare: ride.displayPrice)
                        dismiss()
                    }) {
                        Text("Accept Rider's $\(String(format: "%.2f", ride.displayPrice)) Offer")
                            .font(.headline)
                            .foregroundColor(ride.hasCustomerOffer ? .white : .blue)
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(ride.hasCustomerOffer ? Color.green : Color.blue.opacity(0.1))
                            .cornerRadius(12)
                    }
                    .accessibilityLabel("Accept rider's offer of \(String(format: "%.2f", ride.displayPrice)) dollars")
                }
                .padding()
        }
    }
}

// MARK: - Ride Detail Sheet
/// Full ride details with accept/negotiate options
struct RideDetailSheet: View {
    let ride: P2PRide
    @ObservedObject var viewModel: DeliveryViewModel
    let locationManager: LocationManager
    @Environment(\.dismiss) var dismiss
    @State private var showNegotiationSheet = false

    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 20) {
                    // Map Preview
                    RideDetailMapPreview(ride: ride, locationManager: locationManager)
                        .frame(height: 220)
                        .cornerRadius(16)
                        .padding(.horizontal)

                    // Earnings Card
                    VStack(spacing: 12) {
                        HStack {
                            VStack(alignment: .leading, spacing: 4) {
                                Text("You Receive")
                                    .font(.subheadline)
                                    .foregroundColor(Theme.textSecondary)
                                Text("$\(String(format: "%.2f", ride.earnings))")
                                    .font(.system(size: 36, weight: .bold))
                                    .foregroundColor(Theme.textPrimary)
                            }
                            Spacer()
                            VStack(alignment: .trailing, spacing: 4) {
                                Text("Connection Fee")
                                    .font(.caption)
                                    .foregroundColor(Theme.textSecondary)
                                HStack(spacing: 4) {
                                    Image(systemName: "dollarsign.circle.fill")
                                    Text("$1")
                                }
                                .font(.headline)
                                .foregroundColor(.green)
                            }
                        }

                        Divider()

                        HStack {
                            EarningBreakdownItem(label: "Base Fare", amount: ride.fee)
                            Spacer()
                            if let tip = ride.tip, tip > 0 {
                                EarningBreakdownItem(label: "Tip", amount: tip)
                            }
                        }
                    }
                    .padding()
                    .background(
                        LinearGradient(
                            colors: [Color.blue, Color.blue.opacity(0.8)],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )
                    .cornerRadius(16)
                    .padding(.horizontal)

                    // Route Details
                    VStack(spacing: 0) {
                        // Pickup
                        DetailRouteCard(
                            icon: "person.fill",
                            iconColor: .green,
                            title: "PICKUP LOCATION",
                            name: ride.customerName ?? "Passenger",
                            address: ride.pickup?.fullAddress ?? "Address pending..."
                        )
                        .padding()

                        Divider()
                            .padding(.horizontal)

                        // Dropoff
                        DetailRouteCard(
                            icon: "mappin.circle.fill",
                            iconColor: .red,
                            title: "DROP-OFF LOCATION",
                            name: "Destination",
                            address: ride.dropoff?.fullAddress ?? "Destination pending..."
                        )
                        .padding()
                    }
                    .background(Theme.cardBackground)
                    .cornerRadius(16)
                    .padding(.horizontal)

                    // Ride notes if available
                    if let notes = ride.notes, !notes.isEmpty {
                        VStack(alignment: .leading, spacing: 8) {
                            HStack {
                                Image(systemName: "note.text")
                                Text("Ride Notes")
                                    .font(.subheadline)
                                    .fontWeight(.semibold)
                            }
                            .foregroundColor(Theme.textSecondary)

                            Text(notes)
                                .font(.subheadline)
                                .foregroundColor(Theme.textPrimary)
                        }
                        .padding()
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(Theme.cardBackground)
                        .cornerRadius(12)
                        .padding(.horizontal)
                    }
                }
                .padding(.vertical)
            }
            .background(Theme.backgroundGrey.ignoresSafeArea())
            .navigationTitle("Ride Details")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Close") { dismiss() }
                        .accessibilityLabel("Close ride details")
                }
            }
            .safeAreaInset(edge: .bottom) {
                HStack(spacing: 12) {
                    // Accept Button
                    Button(action: {
                        viewModel.acceptRide(ride)
                        dismiss()
                    }) {
                        HStack {
                            Image(systemName: "checkmark.circle.fill")
                            Text("Accept Ride")
                        }
                        .font(.headline)
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color.blue)
                        .cornerRadius(16)
                    }
                    .accessibilityLabel("Accept this ride")
                    .accessibilityHint("Accept the ride at the current price")

                    // Negotiate Button
                    Button(action: {
                        showNegotiationSheet = true
                    }) {
                        HStack {
                            Image(systemName: "arrow.triangle.2.circlepath")
                        }
                        .font(.headline)
                        .foregroundColor(.blue)
                        .padding()
                        .background(Color.blue.opacity(0.1))
                        .cornerRadius(16)
                    }
                    .accessibilityLabel("Negotiate fare")
                    .accessibilityHint("Set your own price for this ride")
                }
                .padding()
                .background(Theme.cardBackground)
            }
            .sheet(isPresented: $showNegotiationSheet) {
                FareNegotiationSheet(ride: ride, viewModel: viewModel)
            }
        }
    }
}

// MARK: - Ride Detail Map Preview
struct RideDetailMapPreview: View {
    let ride: P2PRide
    let locationManager: LocationManager

    var body: some View {
        Map {
            // Driver location
            if let coordinate = locationManager.currentCoordinate, coordinate.isValid {
                Annotation("You", coordinate: coordinate) {
                    Circle()
                        .fill(Color.blue)
                        .frame(width: 16, height: 16)
                        .overlay(Circle().stroke(Color.white, lineWidth: 2))
                }
            }

            // Pickup
            if let pickup = ride.pickup, let lat = pickup.lat, let lng = pickup.lng {
                Annotation("Pickup", coordinate: CLLocationCoordinate2D(latitude: lat, longitude: lng)) {
                    Image(systemName: "person.fill")
                        .foregroundColor(.white)
                        .padding(8)
                        .background(Color.green)
                        .clipShape(Circle())
                }
            }

            // Dropoff
            if let dropoff = ride.dropoff, let lat = dropoff.lat, let lng = dropoff.lng {
                Annotation("Dropoff", coordinate: CLLocationCoordinate2D(latitude: lat, longitude: lng)) {
                    Image(systemName: "mappin.circle.fill")
                        .foregroundColor(.white)
                        .padding(8)
                        .background(Color.red)
                        .clipShape(Circle())
                }
            }
        }
        .mapStyle(.standard)
    }
}

// MARK: - Earnings Summary Sheet (for voice command)
struct EarningsSummarySheet: View {
    @ObservedObject var viewModel: DeliveryViewModel
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 20) {
                    // Today's Earnings
                    VStack(spacing: 8) {
                        Text("Today's Earnings")
                            .font(.subheadline)
                            .foregroundColor(Theme.textSecondary)
                        Text("$\(String(format: "%.2f", viewModel.todayEarnings))")
                            .font(.system(size: 48, weight: .bold))
                            .foregroundColor(Theme.brandRed)
                    }
                    .padding(.top, 20)

                    // Stats Grid
                    LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 16) {
                        EarningStatCard(title: "Deliveries", value: "\(viewModel.completedDeliveries)", icon: "shippingbox.fill", color: Theme.brandOrange)
                        EarningStatCard(title: "Tips", value: "$\(String(format: "%.2f", viewModel.todayTips))", icon: "dollarsign.circle.fill", color: .green)
                        EarningStatCard(title: "Hours Online", value: String(format: "%.1fh", viewModel.hoursOnline), icon: "clock.fill", color: .blue)
                        EarningStatCard(title: "Avg Per Trip", value: "$\(String(format: "%.2f", viewModel.averagePerTrip))", icon: "chart.line.uptrend.xyaxis", color: .purple)
                    }
                    .padding(.horizontal)

                    // Weekly Summary
                    VStack(alignment: .leading, spacing: 12) {
                        Text("This Week")
                            .font(.headline)
                            .foregroundColor(Theme.textPrimary)

                        HStack {
                            Text("Total Earnings")
                            Spacer()
                            Text("$\(String(format: "%.2f", viewModel.weeklyEarnings))")
                                .fontWeight(.semibold)
                        }
                        .font(.subheadline)
                        .foregroundColor(Theme.textSecondary)

                        HStack {
                            Text("Total Deliveries")
                            Spacer()
                            Text("\(viewModel.weeklyDeliveries)")
                                .fontWeight(.semibold)
                        }
                        .font(.subheadline)
                        .foregroundColor(Theme.textSecondary)
                    }
                    .padding()
                    .background(Theme.cardBackground)
                    .cornerRadius(12)
                    .padding(.horizontal)

                    Spacer()
                }
            }
            .background(Theme.backgroundGrey.ignoresSafeArea())
            .navigationTitle("Earnings")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") { dismiss() }
                        .accessibilityLabel("Close earnings summary")
                }
            }
        }
    }
}

struct EarningStatCard: View {
    let title: String
    let value: String
    let icon: String
    let color: Color

    var body: some View {
        VStack(spacing: 8) {
            Image(systemName: icon)
                .font(.title2)
                .foregroundColor(color)
            Text(value)
                .font(.title3)
                .fontWeight(.bold)
                .foregroundColor(Theme.textPrimary)
            Text(title)
                .font(.caption)
                .foregroundColor(Theme.textSecondary)
        }
        .frame(maxWidth: .infinity)
        .padding()
        .background(Theme.cardBackground)
        .cornerRadius(12)
    }
}

// MARK: - Messages List Sheet (for voice command)
struct MessagesListSheet: View {
    @Environment(\.dismiss) private var dismiss
    @State private var messages: [(id: String, from: String, preview: String, time: String, unread: Bool)] = []

    var body: some View {
        NavigationView {
            List {
                if messages.isEmpty {
                    VStack(spacing: 12) {
                        Image(systemName: "message.badge.filled.fill")
                            .font(.system(size: 50))
                            .foregroundColor(Theme.textGrey)
                        Text("No Messages")
                            .font(.headline)
                            .foregroundColor(Theme.textSecondary)
                        Text("You'll receive messages from customers and support here.")
                            .font(.subheadline)
                            .foregroundColor(Theme.textGrey)
                            .multilineTextAlignment(.center)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 60)
                    .listRowBackground(Color.clear)
                } else {
                    ForEach(messages, id: \.id) { message in
                        HStack(spacing: 12) {
                            Circle()
                                .fill(message.unread ? Theme.brandRed : Theme.lightGrey)
                                .frame(width: 10, height: 10)

                            VStack(alignment: .leading, spacing: 4) {
                                HStack {
                                    Text(message.from)
                                        .font(.subheadline)
                                        .fontWeight(message.unread ? .bold : .regular)
                                    Spacer()
                                    Text(message.time)
                                        .font(.caption)
                                        .foregroundColor(Theme.textGrey)
                                }

                                Text(message.preview)
                                    .font(.caption)
                                    .foregroundColor(Theme.textSecondary)
                                    .lineLimit(2)
                            }
                        }
                        .padding(.vertical, 4)
                    }
                }
            }
            .listStyle(.plain)
            .navigationTitle("Messages")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") { dismiss() }
                        .accessibilityLabel("Close messages")
                }
            }
        }
    }
}
