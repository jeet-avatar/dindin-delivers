import SwiftUI
import MapKit
import EatFairShared

/// Uber-style Pickup/Dropoff View for Driver App
/// Shows active delivery with swipe-to-confirm for pickup and dropoff actions
struct PickupDropoffView: View {
    @ObservedObject var viewModel: DeliveryViewModel
    @State private var mapPosition: MapCameraPosition = .automatic
    @State private var isMapExpanded = false

    var body: some View {
        ZStack {
            if let activeOrder = viewModel.myDeliveries.first {
                ActivePickupDropoffView(
                    order: activeOrder,
                    viewModel: viewModel,
                    mapPosition: $mapPosition,
                    isMapExpanded: $isMapExpanded
                )
            } else {
                NoActiveOrderView(viewModel: viewModel)
            }
        }
        .navigationTitle("Active Delivery")
        .navigationBarTitleDisplayMode(.inline)
    }
}

// MARK: - Active Pickup/Dropoff View
struct ActivePickupDropoffView: View {
    let order: Order
    @ObservedObject var viewModel: DeliveryViewModel
    @Binding var mapPosition: MapCameraPosition
    @Binding var isMapExpanded: Bool

    @State private var showPickupConfirm = false
    @State private var showDropoffConfirm = false
    @State private var sliderOffset: CGFloat = 0
    @State private var isSliding = false

    private var isPickedUp: Bool {
        let status = DeliveryOrderStatus.from(order.status)
        return status == .outForDelivery || status == .restaurantWillDeliver
    }

    var body: some View {
        GeometryReader { geometry in
            ZStack(alignment: .bottom) {
                // Full screen map
                DriverDeliveryMapView(
                    order: order,
                    mapPosition: $mapPosition,
                    showPickupLocation: !isPickedUp,
                    showDropoffLocation: true
                )
                .ignoresSafeArea(edges: .top)

                // Bottom action sheet
                if !isMapExpanded {
                    DriverBottomActionSheet(
                        order: order,
                        viewModel: viewModel,
                        isPickedUp: isPickedUp,
                        onExpandMap: { isMapExpanded = true }
                    )
                    .transition(.move(edge: .bottom))
                }

                // Collapse button when map is expanded
                if isMapExpanded {
                    VStack {
                        Spacer()
                        Button(action: { isMapExpanded = false }) {
                            HStack {
                                Image(systemName: "chevron.up")
                                Text("Show Details")
                            }
                            .font(.subheadline)
                            .fontWeight(.semibold)
                            .foregroundColor(.white)
                            .padding(.horizontal, 20)
                            .padding(.vertical, 12)
                            .background(Theme.brandRed)
                            .cornerRadius(25)
                            .shadow(color: .black.opacity(0.2), radius: 8, x: 0, y: 4)
                        }
                        .padding(.bottom, 30)
                    }
                }
            }
        }
        .animation(.spring(response: 0.4), value: isMapExpanded)
    }
}

// MARK: - Driver Delivery Map View
struct DriverDeliveryMapView: View {
    let order: Order
    @Binding var mapPosition: MapCameraPosition
    let showPickupLocation: Bool
    let showDropoffLocation: Bool

    @StateObject private var locationManager = LocationManager.shared

    var body: some View {
        Map(position: $mapPosition) {
            // Driver's current location (custom blue dot with pulse)
            if let driverLocation = locationManager.currentCoordinate {
                Annotation("You", coordinate: driverLocation) {
                    ZStack {
                        // Pulse animation circle
                        Circle()
                            .fill(Color.blue.opacity(0.2))
                            .frame(width: 60, height: 60)

                        // Inner circle
                        Circle()
                            .fill(Color.blue)
                            .frame(width: 20, height: 20)
                            .overlay(
                                Circle()
                                    .stroke(Color.white, lineWidth: 3)
                            )
                            .shadow(color: .blue.opacity(0.5), radius: 8)

                        // Direction arrow if heading available
                        if let heading = locationManager.heading {
                            Image(systemName: "location.north.fill")
                                .font(.system(size: 10, weight: .bold))
                                .foregroundColor(.white)
                                .rotationEffect(.degrees(heading.trueHeading))
                        }
                    }
                }
            }

            // Pickup (Restaurant) Marker
            if showPickupLocation {
                Annotation("Pickup", coordinate: CLLocationCoordinate2D(
                    latitude: order.restaurant.latitude,
                    longitude: order.restaurant.longitude
                )) {
                    DriverPickupMarker()
                }
            }

            // Dropoff (Customer) Marker
            if showDropoffLocation {
                Annotation("Dropoff", coordinate: CLLocationCoordinate2D(
                    latitude: order.deliveryAddress.latitude,
                    longitude: order.deliveryAddress.longitude
                )) {
                    DriverDropoffMarker()
                }
            }
        }
        .mapStyle(.standard(elevation: .realistic, pointsOfInterest: .excludingAll))
        .mapControls {
            MapUserLocationButton()
            MapCompass()
            MapScaleView()
        }
        .onAppear {
            // Start tracking driver's location
            locationManager.requestPermission()
            locationManager.startTracking()
            updateMapRegion()
        }
        .onChange(of: locationManager.currentCoordinate) { _, newLocation in
            // Optionally update map to follow driver
            if let location = newLocation {
                // Smoothly animate to new position while keeping destinations visible
                updateMapRegionWithDriver(driverLocation: location)
            }
        }
    }

    private func updateMapRegion() {
        var coordinates: [CLLocationCoordinate2D] = []

        // Include driver's location if available
        if let driverLocation = locationManager.currentCoordinate {
            coordinates.append(driverLocation)
        }

        if showPickupLocation {
            coordinates.append(CLLocationCoordinate2D(
                latitude: order.restaurant.latitude,
                longitude: order.restaurant.longitude
            ))
        }

        if showDropoffLocation {
            coordinates.append(CLLocationCoordinate2D(
                latitude: order.deliveryAddress.latitude,
                longitude: order.deliveryAddress.longitude
            ))
        }

        guard !coordinates.isEmpty else { return }

        let latitudes = coordinates.map { $0.latitude }
        let longitudes = coordinates.map { $0.longitude }

        guard let minLat = latitudes.min(),
              let maxLat = latitudes.max(),
              let minLon = longitudes.min(),
              let maxLon = longitudes.max() else { return }

        let centerLat = (minLat + maxLat) / 2
        let centerLon = (minLon + maxLon) / 2
        let spanLat = (maxLat - minLat) * 1.5 + 0.02
        let spanLon = (maxLon - minLon) * 1.5 + 0.02

        let region = MKCoordinateRegion(
            center: CLLocationCoordinate2D(latitude: centerLat, longitude: centerLon),
            span: MKCoordinateSpan(latitudeDelta: max(spanLat, 0.02), longitudeDelta: max(spanLon, 0.02))
        )

        mapPosition = .region(region)
    }

    private func updateMapRegionWithDriver(driverLocation: CLLocationCoordinate2D) {
        var coordinates: [CLLocationCoordinate2D] = [driverLocation]

        if showPickupLocation {
            coordinates.append(CLLocationCoordinate2D(
                latitude: order.restaurant.latitude,
                longitude: order.restaurant.longitude
            ))
        }

        if showDropoffLocation {
            coordinates.append(CLLocationCoordinate2D(
                latitude: order.deliveryAddress.latitude,
                longitude: order.deliveryAddress.longitude
            ))
        }

        let latitudes = coordinates.map { $0.latitude }
        let longitudes = coordinates.map { $0.longitude }

        guard let minLat = latitudes.min(),
              let maxLat = latitudes.max(),
              let minLon = longitudes.min(),
              let maxLon = longitudes.max() else { return }

        let centerLat = (minLat + maxLat) / 2
        let centerLon = (minLon + maxLon) / 2
        let spanLat = (maxLat - minLat) * 1.5 + 0.02
        let spanLon = (maxLon - minLon) * 1.5 + 0.02

        let region = MKCoordinateRegion(
            center: CLLocationCoordinate2D(latitude: centerLat, longitude: centerLon),
            span: MKCoordinateSpan(latitudeDelta: max(spanLat, 0.02), longitudeDelta: max(spanLon, 0.02))
        )

        withAnimation(.easeInOut(duration: 0.5)) {
            mapPosition = .region(region)
        }
    }
}

// MARK: - Driver Map Markers
struct DriverPickupMarker: View {
    var body: some View {
        VStack(spacing: 0) {
            ZStack {
                Circle()
                    .fill(Theme.brandOrange)
                    .frame(width: 50, height: 50)
                    .shadow(color: .black.opacity(0.3), radius: 4, x: 0, y: 2)

                Image(systemName: "bag.fill")
                    .font(.system(size: 22))
                    .foregroundColor(.white)
            }

            Image(systemName: "triangle.fill")
                .font(.system(size: 12))
                .foregroundColor(Theme.brandOrange)
                .rotationEffect(.degrees(180))
                .offset(y: -5)
        }
    }
}

struct DriverDropoffMarker: View {
    var body: some View {
        VStack(spacing: 0) {
            ZStack {
                Circle()
                    .fill(Theme.statusActive)
                    .frame(width: 50, height: 50)
                    .shadow(color: .black.opacity(0.3), radius: 4, x: 0, y: 2)

                Image(systemName: "house.fill")
                    .font(.system(size: 22))
                    .foregroundColor(.white)
            }

            Image(systemName: "triangle.fill")
                .font(.system(size: 12))
                .foregroundColor(Theme.statusActive)
                .rotationEffect(.degrees(180))
                .offset(y: -5)
        }
    }
}

// MARK: - Driver Bottom Action Sheet
struct DriverBottomActionSheet: View {
    let order: Order
    @ObservedObject var viewModel: DeliveryViewModel
    let isPickedUp: Bool
    let onExpandMap: () -> Void

    @State private var showNavigateOptions = false

    var body: some View {
        VStack(spacing: 0) {
            // Handle bar
            RoundedRectangle(cornerRadius: 3)
                .fill(Color.gray.opacity(0.3))
                .frame(width: 40, height: 5)
                .padding(.top, 10)

            // Current Step Header
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text(isPickedUp ? "Step 2 of 2" : "Step 1 of 2")
                        .font(.caption)
                        .foregroundColor(.secondary)

                    Text(isPickedUp ? "Dropoff" : "Pickup")
                        .font(.title)
                        .fontWeight(.bold)
                        .foregroundColor(isPickedUp ? Theme.statusActive : Theme.brandOrange)
                }

                Spacer()

                // Expand map button
                Button(action: onExpandMap) {
                    Image(systemName: "arrow.up.left.and.arrow.down.right")
                        .font(.title3)
                        .foregroundColor(.white)
                        .frame(width: 44, height: 44)
                        .background(Theme.brandRed)
                        .clipShape(Circle())
                }
            }
            .padding()

            Divider()

            // Pickup/Dropoff Location Card
            if isPickedUp {
                DropoffLocationCard(order: order, onNavigate: { navigateToDropoff() })
            } else {
                PickupLocationCard(order: order, onNavigate: { navigateToPickup() })
            }

            Divider()

            // Order Summary
            OrderSummaryCard(order: order)

            // Swipe to Confirm Button
            SwipeToConfirmButton(
                title: isPickedUp ? "Swipe to Complete Delivery" : "Swipe to Confirm Pickup",
                color: isPickedUp ? Theme.statusActive : Theme.brandOrange,
                onConfirm: {
                    if isPickedUp {
                        viewModel.markAsDelivered(order)
                    } else {
                        viewModel.markAsPickedUp(order)
                    }
                }
            )
            .padding()
        }
        .background(
            RoundedRectangle(cornerRadius: 20)
                .fill(Theme.cardBackground)
                .shadow(color: .black.opacity(0.1), radius: 10, x: 0, y: -5)
        )
    }

    private func navigateToPickup() {
        let coordinate = CLLocationCoordinate2D(
            latitude: order.restaurant.latitude,
            longitude: order.restaurant.longitude
        )
        openMaps(to: coordinate, name: order.restaurant.name)
    }

    private func navigateToDropoff() {
        let coordinate = CLLocationCoordinate2D(
            latitude: order.deliveryAddress.latitude,
            longitude: order.deliveryAddress.longitude
        )
        openMaps(to: coordinate, name: "Delivery Location")
    }

    private func openMaps(to coordinate: CLLocationCoordinate2D, name: String) {
        let googleMapsURL = URL(string: "comgooglemaps://?daddr=\(coordinate.latitude),\(coordinate.longitude)&directionsmode=driving")
        let appleMapsURL = URL(string: "https://maps.apple.com/?daddr=\(coordinate.latitude),\(coordinate.longitude)&dirflg=d")

        if let googleMapsURL = googleMapsURL, UIApplication.shared.canOpenURL(googleMapsURL) {
            UIApplication.shared.open(googleMapsURL)
        } else if let appleMapsURL = appleMapsURL {
            UIApplication.shared.open(appleMapsURL)
        }
    }
}

// MARK: - Pickup Location Card
struct PickupLocationCard: View {
    let order: Order
    let onNavigate: () -> Void

    var body: some View {
        HStack(spacing: 16) {
            ZStack {
                Circle()
                    .fill(Theme.brandOrange.opacity(0.15))
                    .frame(width: 50, height: 50)

                Image(systemName: "bag.fill")
                    .font(.title3)
                    .foregroundColor(Theme.brandOrange)
            }

            VStack(alignment: .leading, spacing: 4) {
                Text(order.restaurant.name)
                    .font(.headline)
                    .foregroundColor(Theme.textPrimary)

                Text(order.restaurant.address)
                    .font(.subheadline)
                    .foregroundColor(Theme.textSecondary)
                    .lineLimit(2)
            }

            Spacer()

            Button(action: onNavigate) {
                VStack(spacing: 4) {
                    Image(systemName: "arrow.triangle.turn.up.right.circle.fill")
                        .font(.title)
                        .foregroundColor(Theme.statusInfo)

                    Text("Navigate")
                        .font(.caption2)
                        .foregroundColor(Theme.statusInfo)
                }
            }
        }
        .padding()
    }
}

// MARK: - Dropoff Location Card
struct DropoffLocationCard: View {
    let order: Order
    let onNavigate: () -> Void

    var body: some View {
        VStack(spacing: 12) {
            HStack(spacing: 16) {
                ZStack {
                    Circle()
                        .fill(Theme.statusActive.opacity(0.15))
                        .frame(width: 50, height: 50)

                    Image(systemName: "house.fill")
                        .font(.title3)
                        .foregroundColor(Theme.statusActive)
                }

                VStack(alignment: .leading, spacing: 4) {
                    Text(order.customerName)
                        .font(.headline)
                        .foregroundColor(Theme.textPrimary)

                    Text(order.deliveryAddress.fullAddress)
                        .font(.subheadline)
                        .foregroundColor(Theme.textSecondary)
                        .lineLimit(2)
                }

                Spacer()

                Button(action: onNavigate) {
                    VStack(spacing: 4) {
                        Image(systemName: "arrow.triangle.turn.up.right.circle.fill")
                            .font(.title)
                            .foregroundColor(Theme.statusInfo)

                        Text("Navigate")
                            .font(.caption2)
                            .foregroundColor(Theme.statusInfo)
                    }
                }
            }

            // Contact customer buttons
            HStack(spacing: 12) {
                Button(action: {
                    if let phone = order.customerPhone, !phone.isEmpty {
                        let cleanPhone = phone.replacingOccurrences(of: " ", with: "")
                            .replacingOccurrences(of: "-", with: "")
                            .replacingOccurrences(of: "(", with: "")
                            .replacingOccurrences(of: ")", with: "")
                        if let url = URL(string: "tel://\(cleanPhone)") {
                            UIApplication.shared.open(url)
                        }
                    }
                }) {
                    HStack {
                        Image(systemName: "phone.fill")
                        Text("Call")
                    }
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .foregroundColor(Theme.statusActive)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 10)
                    .background(Theme.statusActive.opacity(0.1))
                    .cornerRadius(10)
                }

                Button(action: {
                    if let phone = order.customerPhone, !phone.isEmpty {
                        let cleanPhone = phone.replacingOccurrences(of: " ", with: "")
                            .replacingOccurrences(of: "-", with: "")
                        if let url = URL(string: "sms:\(cleanPhone)") {
                            UIApplication.shared.open(url)
                        }
                    }
                }) {
                    HStack {
                        Image(systemName: "message.fill")
                        Text("Text")
                    }
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .foregroundColor(Theme.statusInfo)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 10)
                    .background(Theme.statusInfo.opacity(0.1))
                    .cornerRadius(10)
                }
            }

            // Delivery instructions
            if !order.deliveryInstructions.isEmpty {
                HStack(alignment: .top, spacing: 8) {
                    Image(systemName: "note.text")
                        .font(.caption)
                        .foregroundColor(Theme.statusWarning)

                    Text(order.deliveryInstructions)
                        .font(.caption)
                        .foregroundColor(Theme.textSecondary)
                }
                .padding(10)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(Theme.statusWarning.opacity(0.1))
                .cornerRadius(8)
            }
        }
        .padding()
    }
}

// MARK: - Order Summary Card
struct OrderSummaryCard: View {
    let order: Order

    var body: some View {
        VStack(spacing: 12) {
            HStack {
                Text("Order #\(order.orderId.prefix(8))")
                    .font(.caption)
                    .foregroundColor(Theme.textSecondary)

                Spacer()

                Text("\(order.itemsCount) items")
                    .font(.caption)
                    .foregroundColor(Theme.textSecondary)
            }

            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Your Earnings")
                        .font(.caption)
                        .foregroundColor(Theme.textSecondary)

                    Text("$\(String(format: "%.2f", order.deliveryFee))")
                        .font(.title2)
                        .fontWeight(.bold)
                        .foregroundColor(Theme.statusActive)
                }

                Spacer()

                if order.tip > 0 {
                    VStack(alignment: .trailing, spacing: 4) {
                        Text("Tip")
                            .font(.caption)
                            .foregroundColor(Theme.textSecondary)

                        Text("+$\(String(format: "%.2f", order.tip))")
                            .font(.headline)
                            .fontWeight(.semibold)
                            .foregroundColor(Theme.statusActive)
                    }
                }
            }
        }
        .padding()
        .background(Theme.backgroundGrey)
    }
}

// MARK: - Swipe to Confirm Button
struct SwipeToConfirmButton: View {
    let title: String
    let color: Color
    let onConfirm: () -> Void

    @State private var offset: CGFloat = 0
    @State private var isConfirmed = false
    @GestureState private var isDragging = false

    private let buttonWidth: CGFloat = 60
    private let threshold: CGFloat = 0.75

    var body: some View {
        GeometryReader { geometry in
            let maxOffset = geometry.size.width - buttonWidth - 8

            ZStack(alignment: .leading) {
                // Background track
                RoundedRectangle(cornerRadius: 16)
                    .fill(color.opacity(0.2))

                // Progress fill
                RoundedRectangle(cornerRadius: 16)
                    .fill(color.opacity(0.4))
                    .frame(width: offset + buttonWidth + 8)

                // Label
                HStack {
                    Spacer()
                    if !isConfirmed {
                        Text(title)
                            .font(.subheadline)
                            .fontWeight(.semibold)
                            .foregroundStyle(color)
                            .opacity(1 - Double(offset / maxOffset))
                    } else {
                        HStack(spacing: 8) {
                            ProgressView()
                                .progressViewStyle(CircularProgressViewStyle(tint: color))
                            Text("Confirming...")
                                .font(.subheadline)
                                .fontWeight(.semibold)
                                .foregroundStyle(color)
                        }
                    }
                    Spacer()
                }

                // Slider button
                RoundedRectangle(cornerRadius: 12)
                    .fill(color)
                    .frame(width: buttonWidth, height: 50)
                    .overlay(
                        Image(systemName: isConfirmed ? "checkmark" : "chevron.right.2")
                            .font(.title3)
                            .fontWeight(.bold)
                            .foregroundColor(.white)
                    )
                    .offset(x: offset + 4)
                    .gesture(
                        DragGesture()
                            .updating($isDragging) { _, state, _ in
                                state = true
                            }
                            .onChanged { value in
                                guard !isConfirmed else { return }
                                let newOffset = max(0, min(value.translation.width, maxOffset))
                                offset = newOffset
                            }
                            .onEnded { value in
                                guard !isConfirmed else { return }
                                if offset >= maxOffset * threshold {
                                    // Confirm action
                                    withAnimation(.spring(response: 0.3)) {
                                        offset = maxOffset
                                        isConfirmed = true
                                    }

                                    // Haptic feedback
                                    let generator = UINotificationFeedbackGenerator()
                                    generator.notificationOccurred(.success)

                                    // Execute action after brief delay
                                    DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
                                        onConfirm()
                                    }
                                } else {
                                    // Reset
                                    withAnimation(.spring(response: 0.3)) {
                                        offset = 0
                                    }
                                }
                            }
                    )
                    .shadow(color: color.opacity(0.3), radius: 4, x: 0, y: 2)
            }
        }
        .frame(height: 58)
    }
}

// MARK: - No Active Order View
struct NoActiveOrderView: View {
    @ObservedObject var viewModel: DeliveryViewModel

    var body: some View {
        VStack(spacing: 24) {
            Spacer()

            ZStack {
                Circle()
                    .fill(Theme.brandRed.opacity(0.1))
                    .frame(width: 120, height: 120)

                Image(systemName: "car.fill")
                    .font(.system(size: 50))
                    .foregroundColor(Theme.brandRed)
            }

            VStack(spacing: 8) {
                Text("No Active Delivery")
                    .font(.title2)
                    .fontWeight(.bold)
                    .foregroundColor(Theme.textPrimary)

                Text("Accept an order from the Orders tab\nto start a delivery")
                    .font(.subheadline)
                    .foregroundColor(Theme.textSecondary)
                    .multilineTextAlignment(.center)
            }

            Spacer()

            // Quick stats
            HStack(spacing: 20) {
                QuickStatCard(
                    icon: "checkmark.circle.fill",
                    value: "\(viewModel.todayCompletedCount)",
                    label: "Today",
                    color: Theme.statusActive
                )

                QuickStatCard(
                    icon: "dollarsign.circle.fill",
                    value: "$\(String(format: "%.0f", viewModel.todayEarnings))",
                    label: "Earned",
                    color: Theme.brandRed
                )

                QuickStatCard(
                    icon: "tray.fill",
                    value: "\(viewModel.availableOrders.count)",
                    label: "Available",
                    color: Theme.statusInfo
                )
            }
            .padding(.horizontal)
            .padding(.bottom, 40)
        }
        .padding()
        .background(Theme.backgroundGrey.ignoresSafeArea())
    }
}

// MARK: - Quick Stat Card
struct QuickStatCard: View {
    let icon: String
    let value: String
    let label: String
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

            Text(label)
                .font(.caption)
                .foregroundColor(Theme.textSecondary)
        }
        .frame(maxWidth: .infinity)
        .padding()
        .background(Theme.cardBackground)
        .cornerRadius(12)
        .shadow(color: .black.opacity(0.05), radius: 4, x: 0, y: 2)
    }
}

// MARK: - Preview
#Preview {
    NavigationView {
        PickupDropoffView(viewModel: DeliveryViewModel())
    }
}
