import SwiftUI
import MapKit
import EatFairShared

// MARK: - World-Class My Deliveries View
struct MyDeliveriesView: View {
    @ObservedObject var viewModel: DeliveryViewModel
    @StateObject private var locationManager = LocationManager.shared
    @State private var selectedDelivery: Order?
    @State private var dummyTab: Int = 0  // Local state for standalone usage

    var body: some View {
        NavigationView {
            ZStack {
                Theme.backgroundGrey.ignoresSafeArea()

                if viewModel.isLoading {
                    loadingView
                } else if viewModel.myDeliveries.isEmpty {
                    emptyStateView
                } else {
                    deliveriesContent
                }
            }
            .navigationTitle("My Deliveries")
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    onlineStatusToggle
                }
            }
            .onAppear {
                viewModel.fetchMyDeliveries()
                locationManager.startTracking()
            }
            .fullScreenCover(item: $selectedDelivery) { delivery in
                ActiveDeliveryFullScreen(order: delivery, viewModel: viewModel, locationManager: locationManager)
            }
            .overlay(alignment: .bottomTrailing) {
                // Voice Assistant Floating Button
                VoiceAssistantButton()
            }
            .alert("Error", isPresented: $viewModel.showError) {
                Button("OK", role: .cancel) { }
            } message: {
                Text(viewModel.errorMessage ?? "")
            }
        }
    }

    // MARK: - Online Status Toggle
    private var onlineStatusToggle: some View {
        HStack(spacing: 6) {
            Circle()
                .fill(locationManager.isTracking ? Theme.statusActive : Theme.textGrey)
                .frame(width: 8, height: 8)
            Text(locationManager.isTracking ? "Online" : "Offline")
                .font(.caption)
                .fontWeight(.semibold)
                .foregroundColor(locationManager.isTracking ? Theme.statusActive : Theme.textGrey)
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 6)
        .background(locationManager.isTracking ? Theme.statusActive.opacity(0.1) : Theme.lightGrey)
        .cornerRadius(16)
        .onTapGesture {
            if locationManager.isTracking {
                locationManager.stopTracking()
            } else {
                locationManager.startTracking()
            }
        }
    }

    // MARK: - Loading View
    private var loadingView: some View {
        VStack(spacing: 20) {
            ProgressView()
                .scaleEffect(1.5)
                .tint(Theme.brandRed)

            Text("Loading your deliveries...")
                .font(.headline)
                .foregroundColor(Theme.textSecondary)
        }
    }

    // MARK: - Empty State
    private var emptyStateView: some View {
        VStack(spacing: 24) {
            Spacer()

            LottieStyleAnimation()

            VStack(spacing: 8) {
                Text("No Active Deliveries")
                    .font(.title2)
                    .fontWeight(.bold)
                    .foregroundColor(Theme.textPrimary)

                Text("Accept an order from Available Orders\nto start earning!")
                    .font(.subheadline)
                    .foregroundColor(Theme.textSecondary)
                    .multilineTextAlignment(.center)
            }

            NavigationLink(destination: AvailableOrdersView(viewModel: viewModel, selectedTab: $dummyTab)) {
                HStack {
                    Image(systemName: "shippingbox.fill")
                    Text("Browse Available Orders")
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

    // MARK: - Deliveries Content
    private var deliveriesContent: some View {
        ScrollView {
            VStack(spacing: 20) {
                // Active Delivery Hero Card (if any)
                if let activeDelivery = viewModel.myDeliveries.first(where: { [.outForDelivery, .pendingDeliveryProof].contains(DeliveryOrderStatus.from($0.status)) }) {
                    ActiveDeliveryHeroCard(
                        order: activeDelivery,
                        locationManager: locationManager,
                        onTap: {
                            selectedDelivery = activeDelivery
                        },
                        onComplete: {
                            viewModel.markAsDelivered(activeDelivery)
                        }
                    )
                    .padding(.horizontal)
                }

                // Other Deliveries
                let otherDeliveries = viewModel.myDeliveries.filter { ![.outForDelivery, .pendingDeliveryProof].contains(DeliveryOrderStatus.from($0.status)) }
                if !otherDeliveries.isEmpty {
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Pending Pickups")
                            .font(.headline)
                            .foregroundColor(Theme.textPrimary)
                            .padding(.horizontal)

                        ForEach(otherDeliveries) { order in
                            PendingDeliveryCard(
                                order: order,
                                locationManager: locationManager,
                                onTap: {
                                    selectedDelivery = order
                                }
                            )
                            .padding(.horizontal)
                        }
                    }
                }

                // Today's Stats Summary
                TodayStatsSummary(viewModel: viewModel)
                    .padding(.horizontal)
            }
            .padding(.vertical)
        }
        .refreshable {
            viewModel.fetchMyDeliveries()
        }
        .sheet(isPresented: $viewModel.showDeliveryProofCamera) {
            DeliveryProofSheet(viewModel: viewModel)
        }
    }
}

// MARK: - Lottie Style Animation (Placeholder)
struct LottieStyleAnimation: View {
    @State private var isAnimating = false

    var body: some View {
        ZStack {
            Circle()
                .fill(Theme.statusInfo.opacity(0.1))
                .frame(width: 160, height: 160)
                .scaleEffect(isAnimating ? 1.1 : 1.0)

            Circle()
                .fill(Theme.statusInfo.opacity(0.15))
                .frame(width: 120, height: 120)
                .scaleEffect(isAnimating ? 1.05 : 1.0)

            Image(systemName: "shippingbox.fill")
                .font(.system(size: 50))
                .foregroundColor(Theme.statusInfo)
                .offset(y: isAnimating ? -5 : 5)
        }
        .onAppear {
            withAnimation(.easeInOut(duration: 1.5).repeatForever(autoreverses: true)) {
                isAnimating = true
            }
        }
    }
}

// MARK: - Active Delivery Hero Card
struct ActiveDeliveryHeroCard: View {
    let order: Order
    let locationManager: LocationManager
    let onTap: () -> Void
    let onComplete: () -> Void

    @State private var showCompleteConfirmation = false

    private var etaToDropoff: String {
        guard let eta = locationManager.etaTo(latitude: order.deliveryAddress.latitude, longitude: order.deliveryAddress.longitude) else {
            return "--"
        }
        return locationManager.formatETA(eta)
    }

    private var distanceToDropoff: String {
        guard let distance = locationManager.distanceTo(latitude: order.deliveryAddress.latitude, longitude: order.deliveryAddress.longitude) else {
            return "--"
        }
        return locationManager.formatDistance(distance)
    }

    var body: some View {
        VStack(spacing: 0) {
            // Live Map
            ActiveDeliveryMapView(order: order, locationManager: locationManager)
                .frame(height: 200)
                .clipped()

            VStack(spacing: 16) {
                // Status Header
                HStack {
                    HStack(spacing: 8) {
                        PulsingDot(color: Theme.statusInfo)
                        Text("On the Way")
                            .font(.headline)
                            .fontWeight(.bold)
                            .foregroundColor(Theme.statusInfo)
                    }

                    Spacer()

                    Text("Order #\(order.orderId)")
                        .font(.caption)
                        .foregroundColor(Theme.textSecondary)
                        .padding(.horizontal, 10)
                        .padding(.vertical, 4)
                        .background(Theme.lightGrey)
                        .cornerRadius(8)
                }

                // ETA & Distance
                HStack(spacing: 24) {
                    VStack(spacing: 4) {
                        Text(etaToDropoff)
                            .font(.title)
                            .fontWeight(.bold)
                            .foregroundColor(Theme.textPrimary)
                        Text("ETA")
                            .font(.caption)
                            .foregroundColor(Theme.textSecondary)
                    }

                    Divider()
                        .frame(height: 40)

                    VStack(spacing: 4) {
                        Text(distanceToDropoff)
                            .font(.title)
                            .fontWeight(.bold)
                            .foregroundColor(Theme.textPrimary)
                        Text("Distance")
                            .font(.caption)
                            .foregroundColor(Theme.textSecondary)
                    }

                    Divider()
                        .frame(height: 40)

                    VStack(spacing: 4) {
                        Text("$\(String(format: "%.2f", order.deliveryFee + order.tip))")
                            .font(.title)
                            .fontWeight(.bold)
                            .foregroundColor(Theme.statusActive)
                        Text("Earnings")
                            .font(.caption)
                            .foregroundColor(Theme.textSecondary)
                    }
                }

                Divider()

                // Customer Info
                HStack(spacing: 12) {
                    Image(systemName: "person.circle.fill")
                        .font(.title)
                        .foregroundColor(Theme.statusActive)

                    VStack(alignment: .leading, spacing: 2) {
                        Text(order.customerName)
                            .font(.subheadline)
                            .fontWeight(.semibold)
                            .foregroundColor(Theme.textPrimary)

                        Text(order.deliveryAddress.fullAddress)
                            .font(.caption)
                            .foregroundColor(Theme.textSecondary)
                            .lineLimit(1)
                    }

                    Spacer()

                    // Chat Button
                    NavigationLink(destination: ChatView(
                        conversationId: order.id ?? "",
                        customerName: order.customerName,
                        orderId: order.orderId
                    )) {
                        Image(systemName: "message.fill")
                            .font(.headline)
                            .foregroundColor(Theme.brandRed)
                            .frame(width: 44, height: 44)
                            .background(Theme.brandRed.opacity(0.1))
                            .cornerRadius(12)
                    }

                    // Call Button
                    if let phone = order.customerPhone, !phone.isEmpty {
                        Button(action: {
                            if let url = URL(string: "tel://\(phone.replacingOccurrences(of: " ", with: ""))") {
                                UIApplication.shared.open(url)
                            }
                        }) {
                            Image(systemName: "phone.fill")
                                .font(.headline)
                                .foregroundColor(Theme.statusInfo)
                                .frame(width: 44, height: 44)
                                .background(Theme.statusInfo.opacity(0.1))
                                .cornerRadius(12)
                        }
                    }
                }

                // Delivery Instructions
                if !order.deliveryInstructions.isEmpty {
                    HStack(spacing: 8) {
                        Image(systemName: "note.text")
                            .font(.caption)
                            .foregroundColor(Theme.statusWarning)

                        Text(order.deliveryInstructions)
                            .font(.caption)
                            .foregroundColor(Theme.textSecondary)
                            .lineLimit(2)
                    }
                    .padding(12)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(Theme.statusWarning.opacity(0.1))
                    .cornerRadius(10)
                }

                // Action Buttons
                HStack(spacing: 12) {
                    Button(action: {
                        openInMaps(
                            latitude: order.deliveryAddress.latitude,
                            longitude: order.deliveryAddress.longitude,
                            name: order.customerName
                        )
                    }) {
                        HStack {
                            Image(systemName: "arrow.triangle.turn.up.right.diamond.fill")
                            Text("Navigate")
                        }
                        .font(.subheadline)
                        .fontWeight(.semibold)
                        .foregroundColor(Theme.statusInfo)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 14)
                        .background(Theme.statusInfo.opacity(0.1))
                        .cornerRadius(12)
                    }

                    Button(action: { showCompleteConfirmation = true }) {
                        HStack {
                            Image(systemName: "checkmark.circle.fill")
                            Text("Complete")
                        }
                        .font(.subheadline)
                        .fontWeight(.bold)
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 14)
                        .background(Theme.statusActive)
                        .cornerRadius(12)
                        .shadow(color: Theme.statusActive.opacity(0.3), radius: 8, x: 0, y: 4)
                    }
                }
            }
            .padding()
        }
        .background(Theme.cardBackground)
        .cornerRadius(24)
        .shadow(color: .black.opacity(0.1), radius: 16, x: 0, y: 8)
        .onTapGesture(perform: onTap)
        .confirmationDialog("Complete Delivery?", isPresented: $showCompleteConfirmation) {
            Button("Take Photo & Complete") {
                onComplete()
            }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("You'll take a proof photo at the door to complete delivery to \(order.customerName).")
        }
    }

    private func openInMaps(latitude: Double, longitude: Double, name: String) {
        let coordinate = CLLocationCoordinate2D(latitude: latitude, longitude: longitude)
        let mapItem = MKMapItem(placemark: MKPlacemark(coordinate: coordinate))
        mapItem.name = name
        mapItem.openInMaps(launchOptions: [MKLaunchOptionsDirectionsModeKey: MKLaunchOptionsDirectionsModeDriving])
    }
}

// MARK: - Active Delivery Map View with Blue Dot
struct ActiveDeliveryMapView: View {
    let order: Order
    let locationManager: LocationManager

    @State private var position: MapCameraPosition = .automatic

    var body: some View {
        Map(position: $position) {
            // Driver's Current Location - Blue Pulsing Dot
            if let coordinate = locationManager.currentCoordinate, coordinate.isValid {
                Annotation("You", coordinate: coordinate) {
                    DriverLocationMarker()
                }
            }

            // Dropoff Location
            Annotation(order.customerName, coordinate: CLLocationCoordinate2D(
                latitude: order.deliveryAddress.latitude,
                longitude: order.deliveryAddress.longitude
            )) {
                VStack(spacing: 2) {
                    ZStack {
                        Circle()
                            .fill(Theme.statusActive)
                            .frame(width: 36, height: 36)
                            .shadow(color: Theme.statusActive.opacity(0.4), radius: 6)

                        Image(systemName: "house.fill")
                            .font(.system(size: 16))
                            .foregroundColor(.white)
                    }

                    Image(systemName: "arrowtriangle.down.fill")
                        .font(.system(size: 10))
                        .foregroundColor(Theme.statusActive)
                        .offset(y: -4)
                }
            }
        }
        .mapStyle(.standard(elevation: .realistic))
        .onAppear {
            updateCameraPosition()
        }
        .onChange(of: locationManager.currentCoordinate) { _, _ in
            updateCameraPosition()
        }
    }

    private func updateCameraPosition() {
        if let driverCoord = locationManager.currentCoordinate, driverCoord.isValid {
            let dropoffCoord = CLLocationCoordinate2D(
                latitude: order.deliveryAddress.latitude,
                longitude: order.deliveryAddress.longitude
            )

            // Calculate center point between driver and dropoff
            let centerLat = (driverCoord.latitude + dropoffCoord.latitude) / 2
            let centerLon = (driverCoord.longitude + dropoffCoord.longitude) / 2

            let latDelta = abs(driverCoord.latitude - dropoffCoord.latitude) * 1.5
            let lonDelta = abs(driverCoord.longitude - dropoffCoord.longitude) * 1.5

            position = .region(MKCoordinateRegion(
                center: CLLocationCoordinate2D(latitude: centerLat, longitude: centerLon),
                span: MKCoordinateSpan(latitudeDelta: max(latDelta, 0.01), longitudeDelta: max(lonDelta, 0.01))
            ))
        }
    }
}

// MARK: - Driver Location Marker (Blue Dot)
struct DriverLocationMarker: View {
    @State private var isPulsing = false

    var body: some View {
        ZStack {
            // Outer pulse
            Circle()
                .fill(Color.blue.opacity(0.15))
                .frame(width: 60, height: 60)
                .scaleEffect(isPulsing ? 1.3 : 1.0)
                .opacity(isPulsing ? 0 : 0.6)

            // Middle ring
            Circle()
                .fill(Color.blue.opacity(0.25))
                .frame(width: 40, height: 40)
                .scaleEffect(isPulsing ? 1.2 : 1.0)

            // Inner dot
            Circle()
                .fill(Color.blue)
                .frame(width: 18, height: 18)
                .overlay(
                    Circle()
                        .stroke(Color.white, lineWidth: 3)
                )
                .shadow(color: Color.blue.opacity(0.5), radius: 4)
        }
        .onAppear {
            withAnimation(.easeInOut(duration: 1.5).repeatForever(autoreverses: false)) {
                isPulsing = true
            }
        }
    }
}

// MARK: - Pulsing Dot
struct PulsingDot: View {
    let color: Color
    @State private var isPulsing = false

    var body: some View {
        ZStack {
            Circle()
                .fill(color.opacity(0.3))
                .frame(width: 16, height: 16)
                .scaleEffect(isPulsing ? 1.5 : 1.0)
                .opacity(isPulsing ? 0 : 1)

            Circle()
                .fill(color)
                .frame(width: 10, height: 10)
        }
        .onAppear {
            withAnimation(.easeInOut(duration: 1).repeatForever(autoreverses: false)) {
                isPulsing = true
            }
        }
    }
}

// MARK: - Pending Delivery Card
struct PendingDeliveryCard: View {
    let order: Order
    let locationManager: LocationManager
    let onTap: () -> Void

    private var distanceToPickup: String {
        guard let distance = locationManager.distanceTo(latitude: order.restaurant.latitude, longitude: order.restaurant.longitude) else {
            return "--"
        }
        return locationManager.formatDistance(distance)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Header
            HStack {
                HStack(spacing: 8) {
                    Image(systemName: "bag.fill")
                        .foregroundColor(Theme.brandOrange)
                    Text("Ready for Pickup")
                        .font(.subheadline)
                        .fontWeight(.semibold)
                        .foregroundColor(Theme.brandOrange)
                }

                Spacer()

                Text(distanceToPickup)
                    .font(.caption)
                    .fontWeight(.medium)
                    .foregroundColor(Theme.textSecondary)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 4)
                    .background(Theme.lightGrey)
                    .cornerRadius(8)
            }

            Divider()

            // Restaurant Info
            HStack(spacing: 12) {
                Image(systemName: "storefront.fill")
                    .font(.title2)
                    .foregroundColor(Theme.brandOrange)
                    .frame(width: 44, height: 44)
                    .background(Theme.brandOrange.opacity(0.1))
                    .cornerRadius(10)

                VStack(alignment: .leading, spacing: 2) {
                    Text(order.restaurant.name)
                        .font(.subheadline)
                        .fontWeight(.semibold)
                        .foregroundColor(Theme.textPrimary)

                    // Order number for reference
                    Text("#\(order.orderId)")
                        .font(.caption)
                        .fontWeight(.medium)
                        .foregroundColor(Theme.brandRed)

                    Text(order.restaurant.address)
                        .font(.caption)
                        .foregroundColor(Theme.textSecondary)
                        .lineLimit(1)
                }

                Spacer()

                VStack(alignment: .trailing, spacing: 2) {
                    Text("$\(String(format: "%.2f", order.deliveryFee + order.tip))")
                        .font(.headline)
                        .fontWeight(.bold)
                        .foregroundColor(Theme.statusActive)

                    Text("\(order.itemsCount) items")
                        .font(.caption)
                        .foregroundColor(Theme.textSecondary)
                }
            }

            // Navigate Button
            Button(action: {
                openInMaps(
                    latitude: order.restaurant.latitude,
                    longitude: order.restaurant.longitude,
                    name: order.restaurant.name
                )
            }) {
                HStack {
                    Image(systemName: "arrow.triangle.turn.up.right.diamond.fill")
                    Text("Navigate to Restaurant")
                }
                .font(.subheadline)
                .fontWeight(.semibold)
                .foregroundColor(Theme.brandOrange)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 12)
                .background(Theme.brandOrange.opacity(0.1))
                .cornerRadius(10)
            }
        }
        .padding()
        .background(Theme.cardBackground)
        .cornerRadius(16)
        .shadow(color: .black.opacity(0.05), radius: 8, x: 0, y: 4)
        .onTapGesture(perform: onTap)
    }

    private func openInMaps(latitude: Double, longitude: Double, name: String) {
        let coordinate = CLLocationCoordinate2D(latitude: latitude, longitude: longitude)
        let mapItem = MKMapItem(placemark: MKPlacemark(coordinate: coordinate))
        mapItem.name = name
        mapItem.openInMaps(launchOptions: [MKLaunchOptionsDirectionsModeKey: MKLaunchOptionsDirectionsModeDriving])
    }
}

// MARK: - Today's Stats Summary
struct TodayStatsSummary: View {
    @ObservedObject var viewModel: DeliveryViewModel

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: "chart.bar.fill")
                    .foregroundColor(Theme.brandRed)
                Text("Today's Progress")
                    .font(.headline)
                    .foregroundColor(Theme.textPrimary)
            }

            HStack(spacing: 16) {
                TodayStatItem(
                    icon: "shippingbox.fill",
                    value: "\(viewModel.myDeliveries.count)",
                    label: "Active",
                    color: Theme.statusInfo
                )

                TodayStatItem(
                    icon: "checkmark.circle.fill",
                    value: "\(viewModel.todayCompletedCount)",
                    label: "Completed",
                    color: Theme.statusActive
                )

                TodayStatItem(
                    icon: "dollarsign.circle.fill",
                    value: String(format: "$%.2f", viewModel.todayEarnings),
                    label: "Earned",
                    color: Theme.brandRed
                )
            }
        }
        .padding()
        .background(Theme.cardBackground)
        .cornerRadius(16)
        .shadow(color: .black.opacity(0.05), radius: 8, x: 0, y: 4)
    }
}

struct TodayStatItem: View {
    let icon: String
    let value: String
    let label: String
    let color: Color

    var body: some View {
        VStack(spacing: 6) {
            Image(systemName: icon)
                .font(.title2)
                .foregroundColor(color)

            Text(value)
                .font(.headline)
                .fontWeight(.bold)
                .foregroundColor(Theme.textPrimary)

            Text(label)
                .font(.caption2)
                .foregroundColor(Theme.textSecondary)
        }
        .frame(maxWidth: .infinity)
    }
}

// MARK: - Active Delivery Full Screen
struct ActiveDeliveryFullScreen: View {
    let order: Order
    @ObservedObject var viewModel: DeliveryViewModel
    let locationManager: LocationManager
    @Environment(\.dismiss) private var dismiss

    @State private var showCompleteConfirmation = false
    @State private var showPickupConfirmation = false

    // Determine if order has been picked up based on status
    private var isPickedUp: Bool {
        let status = OrderStatus.from(order.status)
        return status == .outForDelivery || status == .restaurantWillDeliver || status == .pendingDeliveryProof
    }

    var body: some View {
        ZStack(alignment: .bottom) {
            // Full Screen Map - shows pickup or dropoff location based on status
            FullScreenDeliveryMap(order: order, locationManager: locationManager, isPickedUp: isPickedUp)
                .ignoresSafeArea()

            // Bottom Sheet
            VStack(spacing: 0) {
                // Handle
                Capsule()
                    .fill(Theme.lightGrey)
                    .frame(width: 40, height: 4)
                    .padding(.top, 8)

                VStack(spacing: 16) {
                    // ETA - shows restaurant or customer based on pickup status
                    HStack {
                        VStack(alignment: .leading, spacing: 4) {
                            Text(isPickedUp ? "Delivering to" : "Picking up from")
                                .font(.caption)
                                .foregroundColor(Theme.textSecondary)
                            Text(isPickedUp ? order.customerName : order.restaurant.name)
                                .font(.headline)
                                .fontWeight(.bold)
                                .foregroundColor(Theme.textPrimary)
                        }

                        Spacer()

                        // ETA to destination (restaurant for pickup, customer for delivery)
                        if isPickedUp {
                            if let eta = locationManager.etaTo(latitude: order.deliveryAddress.latitude, longitude: order.deliveryAddress.longitude) {
                                VStack(alignment: .trailing, spacing: 4) {
                                    Text(locationManager.formatETA(eta))
                                        .font(.title2)
                                        .fontWeight(.bold)
                                        .foregroundColor(Theme.statusInfo)
                                    Text("ETA")
                                        .font(.caption)
                                        .foregroundColor(Theme.textSecondary)
                                }
                            }
                        } else {
                            if let eta = locationManager.etaTo(latitude: order.restaurant.latitude, longitude: order.restaurant.longitude) {
                                VStack(alignment: .trailing, spacing: 4) {
                                    Text(locationManager.formatETA(eta))
                                        .font(.title2)
                                        .fontWeight(.bold)
                                        .foregroundColor(Theme.brandOrange)
                                    Text("ETA")
                                        .font(.caption)
                                        .foregroundColor(Theme.textSecondary)
                                }
                            }
                        }
                    }

                    // Address - shows restaurant or customer address based on pickup status
                    HStack(spacing: 12) {
                        Image(systemName: isPickedUp ? "house.fill" : "storefront.fill")
                            .foregroundColor(isPickedUp ? Theme.statusActive : Theme.brandOrange)

                        Text(isPickedUp ? order.deliveryAddress.fullAddress : order.restaurant.address)
                            .font(.subheadline)
                            .foregroundColor(Theme.textSecondary)
                            .lineLimit(2)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)

                    // Instructions - only show during delivery phase
                    if isPickedUp && !order.deliveryInstructions.isEmpty {
                        HStack(spacing: 8) {
                            Image(systemName: "note.text")
                                .foregroundColor(Theme.statusWarning)
                            Text(order.deliveryInstructions)
                                .font(.caption)
                                .foregroundColor(Theme.textSecondary)
                        }
                        .padding(12)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(Theme.statusWarning.opacity(0.1))
                        .cornerRadius(10)
                    }

                    // Order info for pickup phase
                    if !isPickedUp {
                        HStack(spacing: 8) {
                            Image(systemName: "bag.fill")
                                .foregroundColor(Theme.brandOrange)
                            Text("#\(order.orderId) • \(order.itemsCount) items")
                                .font(.caption)
                                .fontWeight(.medium)
                                .foregroundColor(Theme.textSecondary)
                        }
                        .padding(12)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(Theme.brandOrange.opacity(0.1))
                        .cornerRadius(10)
                    }

                    // Actions
                    HStack(spacing: 12) {
                        Button(action: { dismiss() }) {
                            Image(systemName: "xmark")
                                .font(.headline)
                                .foregroundColor(Theme.textGrey)
                                .frame(width: 50, height: 50)
                                .background(Theme.lightGrey)
                                .cornerRadius(12)
                        }

                        // Phone button - only show during delivery phase (customer phone)
                        if isPickedUp, let phone = order.customerPhone, !phone.isEmpty {
                            Button(action: {
                                if let url = URL(string: "tel://\(phone.replacingOccurrences(of: " ", with: ""))") {
                                    UIApplication.shared.open(url)
                                }
                            }) {
                                Image(systemName: "phone.fill")
                                    .font(.headline)
                                    .foregroundColor(Theme.statusInfo)
                                    .frame(width: 50, height: 50)
                                    .background(Theme.statusInfo.opacity(0.1))
                                    .cornerRadius(12)
                            }
                        }

                        // Action button - Confirm Pickup or Complete Delivery
                        if isPickedUp {
                            Button(action: { showCompleteConfirmation = true }) {
                                HStack {
                                    Image(systemName: "checkmark.circle.fill")
                                    Text("Complete Delivery")
                                }
                                .font(.headline)
                                .foregroundColor(.white)
                                .frame(maxWidth: .infinity)
                                .frame(height: 50)
                                .background(Theme.statusActive)
                                .cornerRadius(12)
                            }
                        } else {
                            Button(action: { showPickupConfirmation = true }) {
                                HStack {
                                    Image(systemName: "bag.circle.fill")
                                    Text("Confirm Pickup")
                                }
                                .font(.headline)
                                .foregroundColor(.white)
                                .frame(maxWidth: .infinity)
                                .frame(height: 50)
                                .background(Theme.brandOrange)
                                .cornerRadius(12)
                            }
                        }
                    }
                }
                .padding()
            }
            .background(Theme.cardBackground)
            .cornerRadius(24, corners: [.topLeft, .topRight])
            .shadow(color: .black.opacity(0.15), radius: 20, x: 0, y: -10)
        }
        .confirmationDialog("Complete Delivery?", isPresented: $showCompleteConfirmation) {
            Button("Confirm Delivered") {
                viewModel.markAsDelivered(order)
                dismiss()
            }
            Button("Cancel", role: .cancel) {}
        }
        .confirmationDialog("Confirm Pickup?", isPresented: $showPickupConfirmation) {
            Button("I've Picked Up the Order") {
                viewModel.markAsPickedUp(order)
                // Don't dismiss - stay on screen with updated state
            }
            Button("Cancel", role: .cancel) {}
        }
    }
}

// MARK: - Full Screen Delivery Map
struct FullScreenDeliveryMap: View {
    let order: Order
    let locationManager: LocationManager
    let isPickedUp: Bool

    @State private var position: MapCameraPosition = .automatic

    var body: some View {
        Map(position: $position) {
            // Driver Location
            if let coordinate = locationManager.currentCoordinate, coordinate.isValid {
                Annotation("You", coordinate: coordinate) {
                    DriverLocationMarker()
                }
            }

            // Restaurant Location (pickup) - always show but highlight when active
            Annotation(order.restaurant.name, coordinate: CLLocationCoordinate2D(
                latitude: order.restaurant.latitude,
                longitude: order.restaurant.longitude
            )) {
                VStack(spacing: 2) {
                    ZStack {
                        Circle()
                            .fill(isPickedUp ? Theme.textGrey : Theme.brandOrange)
                            .frame(width: isPickedUp ? 36 : 44, height: isPickedUp ? 36 : 44)
                            .shadow(color: (isPickedUp ? Theme.textGrey : Theme.brandOrange).opacity(0.4), radius: 8)

                        Image(systemName: "storefront.fill")
                            .font(.system(size: isPickedUp ? 16 : 20))
                            .foregroundColor(.white)
                    }

                    if !isPickedUp {
                        Image(systemName: "arrowtriangle.down.fill")
                            .font(.system(size: 12))
                            .foregroundColor(Theme.brandOrange)
                            .offset(y: -4)
                    }
                }
            }

            // Customer Location (dropoff) - always show but highlight when active
            Annotation(order.customerName, coordinate: CLLocationCoordinate2D(
                latitude: order.deliveryAddress.latitude,
                longitude: order.deliveryAddress.longitude
            )) {
                VStack(spacing: 2) {
                    ZStack {
                        Circle()
                            .fill(isPickedUp ? Theme.statusActive : Theme.textGrey)
                            .frame(width: isPickedUp ? 44 : 36, height: isPickedUp ? 44 : 36)
                            .shadow(color: (isPickedUp ? Theme.statusActive : Theme.textGrey).opacity(0.4), radius: 8)

                        Image(systemName: "house.fill")
                            .font(.system(size: isPickedUp ? 20 : 16))
                            .foregroundColor(.white)
                    }

                    if isPickedUp {
                        Image(systemName: "arrowtriangle.down.fill")
                            .font(.system(size: 12))
                            .foregroundColor(Theme.statusActive)
                            .offset(y: -4)
                    }
                }
            }
        }
        .mapStyle(.standard(elevation: .realistic, pointsOfInterest: .excludingAll))
        .mapControls {
            MapUserLocationButton()
            MapCompass()
        }
    }
}

// MARK: - Corner Radius Extension
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
