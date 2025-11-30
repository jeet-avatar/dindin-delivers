import SwiftUI
import MapKit
import EatFairShared

// MARK: - World-Class Available Orders View
struct AvailableOrdersView: View {
    @ObservedObject var viewModel: DeliveryViewModel
    @StateObject private var locationManager = LocationManager.shared
    @State private var selectedFilter: OrderFilter = .all
    @State private var viewMode: ViewMode = .list
    @State private var selectedOrder: Order?
    @State private var showOrderDetail = false

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
                    // Header Stats Bar
                    statsHeader

                    // Filter & View Toggle
                    filterBar

                    // Content
                    if viewModel.isLoading {
                        loadingView
                    } else if filteredOrders.isEmpty {
                        emptyStateView
                    } else {
                        if viewMode == .list {
                            ordersList
                        } else {
                            ordersMapView
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
                }
            }
            .onAppear {
                viewModel.fetchAvailableOrders()
                locationManager.requestPermission()
                locationManager.getCurrentLocation()
            }
            .sheet(isPresented: $showOrderDetail) {
                if let order = selectedOrder {
                    OrderDetailSheet(order: order, viewModel: viewModel, locationManager: locationManager)
                }
            }
        }
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

                Button(action: { viewMode = .map }) {
                    Image(systemName: "map")
                        .font(.subheadline)
                        .foregroundColor(viewMode == .map ? .white : Theme.textGrey)
                        .frame(width: 36, height: 36)
                        .background(viewMode == .map ? Theme.brandRed : Color.clear)
                        .cornerRadius(8)
                }
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
                            showOrderDetail = true
                        },
                        onAccept: {
                            viewModel.acceptOrder(order)
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
                showOrderDetail = true
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

            Spacer()
        }
        .padding()
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
                        Text(order.restaurant.name)
                            .font(.headline)
                            .fontWeight(.bold)
                            .foregroundColor(Theme.textPrimary)
                            .lineLimit(1)

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
                    OrderStatBadge(icon: "clock.fill", text: estimatedTime, color: Theme.statusInfo)
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
            Button("Cancel", role: .cancel) {}
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
            .navigationTitle("Order Details")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Close") { dismiss() }
                }
            }
            .safeAreaInset(edge: .bottom) {
                Button(action: {
                    viewModel.acceptOrder(order)
                    dismiss()
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
