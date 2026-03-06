import SwiftUI
import MapKit
import Combine
import EatFairShared

/// Uber-style Delivery Tracking View for Customer App
/// Shows real-time pickup and dropoff tracking with driver location
struct DeliveryTrackingView: View {
    @StateObject private var viewModel = OrderTrackingViewModel()
    @State private var mapPosition: MapCameraPosition = .automatic
    @State private var isMapExpanded = false
    @State private var showThankYou = false
    @State private var previousStatus: String = ""

    var body: some View {
        ZStack {
            if let order = viewModel.currentOrder {
                // Active delivery view
                ActiveDeliveryTrackingView(
                    order: order,
                    viewModel: viewModel,
                    mapPosition: $mapPosition,
                    isMapExpanded: $isMapExpanded
                )

                // Thank You overlay when delivered
                if showThankYou {
                    OrderDeliveredCelebrationView(
                        order: order,
                        onDismiss: { showThankYou = false }
                    )
                    .transition(.opacity.combined(with: .scale))
                }
            } else if viewModel.isLoading {
                LoadingView()
            } else {
                NoActiveDeliveryView()
            }
        }
        .navigationTitle("Track Delivery")
        .navigationBarTitleDisplayMode(.inline)
        .onAppear {
            viewModel.listenToLatestOrder()
        }
        .onDisappear {
            viewModel.stopPolling()
        }
        .onChange(of: viewModel.currentOrder?.status) { oldStatus, newStatus in
            // Show thank you when status changes to Delivered
            if let newStatus = newStatus,
               newStatus.lowercased() == "delivered",
               oldStatus?.lowercased() != "delivered" {
                withAnimation(.spring(response: 0.5, dampingFraction: 0.7)) {
                    showThankYou = true
                }
            }
        }
    }
}

// MARK: - Active Delivery Tracking View
struct ActiveDeliveryTrackingView: View {
    let order: Order
    @ObservedObject var viewModel: OrderTrackingViewModel
    @Binding var mapPosition: MapCameraPosition
    @Binding var isMapExpanded: Bool

    var body: some View {
        GeometryReader { geometry in
            ZStack(alignment: .bottom) {
                // Map takes full screen
                DeliveryTrackingMapView(
                    order: order,
                    driverLocation: viewModel.driverLocation,
                    mapPosition: $mapPosition
                )
                .ignoresSafeArea(edges: .top)

                // Bottom sheet with delivery info
                if !isMapExpanded {
                    DeliveryBottomSheet(
                        order: order,
                        estimatedTime: viewModel.estimatedTime,
                        driverLocation: viewModel.driverLocation,
                        onExpandMap: { isMapExpanded = true },
                        timelineEvents: viewModel.timelineEvents,
                        driverInfo: viewModel.driverInfo,
                        isTrafficAwareETA: viewModel.isTrafficAwareETA,
                        etaDistanceMiles: viewModel.etaDistanceMiles
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
                            .background(Theme.brandGreen)
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

// MARK: - Delivery Tracking Map View
struct DeliveryTrackingMapView: View {
    let order: Order
    let driverLocation: CLLocationCoordinate2D?
    @Binding var mapPosition: MapCameraPosition

    // Store the timer publisher to allow proper cancellation
    private let mapUpdateTimer = Timer.publish(every: 3, on: .main, in: .common).autoconnect()

    /// Check if coordinate is valid (not at 0,0 which is Atlantic Ocean)
    private func isValidCoordinate(_ lat: Double, _ lng: Double) -> Bool {
        // Valid if not at origin and within reasonable bounds
        return abs(lat) > 0.01 && abs(lng) > 0.01 &&
               lat >= -90 && lat <= 90 &&
               lng >= -180 && lng <= 180
    }

    private var hasValidRestaurantLocation: Bool {
        isValidCoordinate(order.restaurant.latitude, order.restaurant.longitude)
    }

    private var hasValidDeliveryLocation: Bool {
        isValidCoordinate(order.deliveryAddress.latitude, order.deliveryAddress.longitude)
    }

    private var hasAnyValidLocation: Bool {
        hasValidRestaurantLocation || hasValidDeliveryLocation || driverLocation != nil
    }

    var body: some View {
        ZStack {
            if hasAnyValidLocation {
                Map(position: $mapPosition) {
                    // Restaurant (Pickup) Marker - only show if valid
                    if hasValidRestaurantLocation {
                        Annotation("Pickup", coordinate: CLLocationCoordinate2D(
                            latitude: order.restaurant.latitude,
                            longitude: order.restaurant.longitude
                        )) {
                            PickupMarker(name: order.restaurant.name)
                        }
                    }

                    // Customer (Dropoff) Marker - only show if valid
                    if hasValidDeliveryLocation {
                        Annotation("Dropoff", coordinate: CLLocationCoordinate2D(
                            latitude: order.deliveryAddress.latitude,
                            longitude: order.deliveryAddress.longitude
                        )) {
                            DropoffMarker()
                        }
                    }

                    // Driver Marker (if available)
                    if let driverLoc = driverLocation {
                        Annotation("Driver", coordinate: driverLoc) {
                            DriverMarker()
                        }
                    }
                }
                .mapStyle(.standard)
                .onAppear {
                    updateMapRegion()
                }
                .onReceive(mapUpdateTimer) { _ in
                    updateMapRegion()
                }
            } else {
                // Fallback when no valid coordinates - show status message
                VStack(spacing: 16) {
                    Image(systemName: "map.fill")
                        .font(.system(size: 60))
                        .foregroundColor(Theme.brandGreen.opacity(0.5))

                    Text("Tracking Your Order")
                        .font(.title2)
                        .fontWeight(.bold)

                    Text("Map will update when driver location is available")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal)

                    // Show current status
                    HStack {
                        Circle()
                            .fill(Theme.brandGreen)
                            .frame(width: 12, height: 12)
                        Text("Status: \(order.status)")
                            .font(.headline)
                            .foregroundColor(Theme.brandGreen)
                    }
                    .padding(.top, 8)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .background(Color(.systemGray6))
            }
        }
    }

    private func updateMapRegion() {
        var coordinates: [CLLocationCoordinate2D] = []

        // Only add valid coordinates
        if hasValidRestaurantLocation {
            coordinates.append(CLLocationCoordinate2D(
                latitude: order.restaurant.latitude,
                longitude: order.restaurant.longitude
            ))
        }

        if hasValidDeliveryLocation {
            coordinates.append(CLLocationCoordinate2D(
                latitude: order.deliveryAddress.latitude,
                longitude: order.deliveryAddress.longitude
            ))
        }

        if let driverLoc = driverLocation,
           isValidCoordinate(driverLoc.latitude, driverLoc.longitude) {
            coordinates.append(driverLoc)
        }

        // Need at least one valid coordinate
        guard !coordinates.isEmpty else { return }

        // Calculate center and span to fit all markers
        let latitudes = coordinates.map { $0.latitude }
        let longitudes = coordinates.map { $0.longitude }

        guard let minLat = latitudes.min(),
              let maxLat = latitudes.max(),
              let minLon = longitudes.min(),
              let maxLon = longitudes.max() else {
            return
        }

        let centerLat = (minLat + maxLat) / 2
        let centerLon = (minLon + maxLon) / 2
        let spanLat = (maxLat - minLat) * 1.5 + 0.01
        let spanLon = (maxLon - minLon) * 1.5 + 0.01

        let region = MKCoordinateRegion(
            center: CLLocationCoordinate2D(latitude: centerLat, longitude: centerLon),
            span: MKCoordinateSpan(latitudeDelta: max(spanLat, 0.02), longitudeDelta: max(spanLon, 0.02))
        )

        mapPosition = .region(region)
    }
}

// MARK: - Map Markers
struct PickupMarker: View {
    let name: String

    var body: some View {
        VStack(spacing: 0) {
            ZStack {
                Circle()
                    .fill(Theme.brandOrange)
                    .frame(width: 40, height: 40)
                    .shadow(color: .black.opacity(0.3), radius: 4, x: 0, y: 2)

                Image(systemName: "bag.fill")
                    .font(.system(size: 18))
                    .foregroundColor(.white)
            }

            // Triangle pointer
            Triangle()
                .fill(Theme.brandOrange)
                .frame(width: 12, height: 8)
                .offset(y: -2)
        }
    }
}

struct DropoffMarker: View {
    var body: some View {
        VStack(spacing: 0) {
            ZStack {
                Circle()
                    .fill(Theme.brandGreen)
                    .frame(width: 40, height: 40)
                    .shadow(color: .black.opacity(0.3), radius: 4, x: 0, y: 2)

                Image(systemName: "house.fill")
                    .font(.system(size: 18))
                    .foregroundColor(.white)
            }

            Triangle()
                .fill(Theme.brandGreen)
                .frame(width: 12, height: 8)
                .offset(y: -2)
        }
    }
}

struct DriverMarker: View {
    @State private var isPulsing = false

    var body: some View {
        ZStack {
            // Pulse animation
            Circle()
                .fill(Theme.brandGreen.opacity(0.3))
                .frame(width: 60, height: 60)
                .scaleEffect(isPulsing ? 1.3 : 1.0)
                .opacity(isPulsing ? 0 : 0.6)

            Circle()
                .fill(.white)
                .frame(width: 44, height: 44)
                .shadow(color: .black.opacity(0.3), radius: 4, x: 0, y: 2)

            Circle()
                .fill(Theme.brandGreen)
                .frame(width: 38, height: 38)

            Image(systemName: "car.fill")
                .font(.system(size: 20))
                .foregroundColor(.white)
        }
        .onAppear {
            withAnimation(.easeInOut(duration: 1.5).repeatForever(autoreverses: false)) {
                isPulsing = true
            }
        }
    }
}

struct Triangle: Shape {
    func path(in rect: CGRect) -> Path {
        var path = Path()
        path.move(to: CGPoint(x: rect.midX, y: rect.maxY))
        path.addLine(to: CGPoint(x: rect.minX, y: rect.minY))
        path.addLine(to: CGPoint(x: rect.maxX, y: rect.minY))
        path.closeSubpath()
        return path
    }
}

// MARK: - Delivery Bottom Sheet
struct DeliveryBottomSheet: View {
    let order: Order
    let estimatedTime: String
    let driverLocation: CLLocationCoordinate2D?
    let onExpandMap: () -> Void
    var timelineEvents: [P2PTimelineEvent] = []
    var driverInfo: P2PTrackingDriver?
    var isTrafficAwareETA: Bool = false
    var etaDistanceMiles: Double? = nil
    @State private var showChat = false

    /// Check if driver is en-route to restaurant (early acceptance)
    private var isDriverEnRoute: Bool {
        order.driverEnRoute == true
    }

    /// Get driver ETA to restaurant
    private var driverEtaToRestaurant: String? {
        if isDriverEnRoute, let eta = order.driverEtaText {
            return eta
        }
        return nil
    }

    /// Format ETA using world-class time formatting
    private var formattedETA: String {
        // If estimatedTime contains "min", extract minutes and use formatter
        if let minutes = extractMinutes(from: estimatedTime) {
            return DateTimeFormatter.shared.formattedETA(etaMinutes: minutes, showArrivalTime: false)
        }
        return estimatedTime
    }

    /// Extract minutes from strings like "15 mins", "10-15 mins", "30-40 mins"
    private func extractMinutes(from eta: String) -> Int? {
        // Handle "Arrived" case
        if eta.lowercased().contains("arrived") {
            return nil
        }

        // Try to extract from "X mins" or "X-Y mins" pattern
        let components = eta.components(separatedBy: CharacterSet.decimalDigits.inverted)
        let numbers = components.compactMap { Int($0) }.filter { $0 > 0 }

        if numbers.count >= 2 {
            // For ranges like "10-15", use the average
            return (numbers[0] + numbers[1]) / 2
        } else if let first = numbers.first {
            return first
        }
        return nil
    }

    var body: some View {
        VStack(spacing: 0) {
            // Handle bar
            RoundedRectangle(cornerRadius: 3)
                .fill(Color.gray.opacity(0.3))
                .frame(width: 40, height: 5)
                .padding(.top, 10)

            // Delivery Failed Banner
            if order.status.lowercased() == "delivery_failed" {
                HStack {
                    Image(systemName: "exclamationmark.triangle.fill")
                        .foregroundColor(.white)
                    VStack(alignment: .leading) {
                        Text("Delivery Failed")
                            .font(.headline)
                            .foregroundColor(.white)
                        Text("A full refund has been issued to your payment method.")
                            .font(.subheadline)
                            .foregroundColor(.white.opacity(0.9))
                    }
                }
                .padding()
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(Color.red)
                .cornerRadius(12)
                .padding(.horizontal)
                .padding(.top, 12)
            }

            // ETA Header
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    HStack(spacing: 6) {
                        Text(estimatedTime == "Arrived" ? "Status" : "Arriving in")
                            .font(.subheadline)
                            .foregroundColor(.secondary)

                        // Traffic indicator when using real traffic data
                        if isTrafficAwareETA {
                            HStack(spacing: 2) {
                                Image(systemName: "car.fill")
                                    .font(.caption2)
                                Text("Live")
                                    .font(.caption2)
                                    .fontWeight(.medium)
                            }
                            .foregroundColor(.white)
                            .padding(.horizontal, 6)
                            .padding(.vertical, 2)
                            .background(Theme.brandGreen)
                            .cornerRadius(4)
                        }
                    }

                    Text(formattedETA)
                        .font(.system(size: 32, weight: .bold))
                        .foregroundColor(Theme.brandGreen)

                    // Show distance when available
                    if let distance = etaDistanceMiles, distance > 0 {
                        Text(String(format: "%.1f mi away", distance))
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }

                Spacer()

                // Expand map button
                Button(action: onExpandMap) {
                    Image(systemName: "arrow.up.left.and.arrow.down.right")
                        .font(.title3)
                        .foregroundColor(.white)
                        .frame(width: 44, height: 44)
                        .background(Theme.brandGreen)
                        .clipShape(Circle())
                }
            }
            .padding()

            // Driver En-Route Banner (early acceptance - driver heading to restaurant)
            if isDriverEnRoute {
                HStack(spacing: 12) {
                    Image(systemName: "car.fill")
                        .font(.title3)
                        .foregroundColor(.white)
                        .frame(width: 40, height: 40)
                        .background(Theme.brandOrange)
                        .clipShape(Circle())

                    VStack(alignment: .leading, spacing: 2) {
                        Text("Driver heading to restaurant")
                            .font(.subheadline)
                            .fontWeight(.semibold)
                        if let eta = driverEtaToRestaurant {
                            Text("Arriving at restaurant in \(eta)")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                        if let foodEta = order.minutesUntilReady, foodEta > 0 {
                            Text("Food ready in ~\(foodEta) min")
                                .font(.caption)
                                .foregroundColor(Theme.brandGreen)
                        }
                    }

                    Spacer()
                }
                .padding()
                .background(Theme.brandOrange.opacity(0.1))
                .cornerRadius(12)
                .padding(.horizontal)
            }

            Divider()

            // Status Timeline - use real timeline events if available
            DeliveryStatusTimeline(order: order, timelineEvents: timelineEvents)
                .padding()

            // Driver Info (if available from full tracking)
            if let driver = driverInfo, driver.name != nil {
                Divider()
                DriverInfoRow(driver: driver)
                    .padding(.horizontal)
            }

            Divider()

            // Pickup & Dropoff Info
            VStack(spacing: 16) {
                // Pickup
                LocationInfoRow(
                    icon: "bag.fill",
                    iconColor: Theme.brandOrange,
                    title: "Pickup",
                    subtitle: order.restaurant.name,
                    address: order.restaurant.address,
                    isCompleted: isPickedUp
                )

                // Divider line
                HStack {
                    VStack {
                        ForEach(0..<3) { _ in
                            Circle()
                                .fill(Color.gray.opacity(0.3))
                                .frame(width: 4, height: 4)
                        }
                    }
                    .frame(width: 30)

                    Spacer()
                }
                .padding(.leading, 10)

                // Dropoff
                LocationInfoRow(
                    icon: "house.fill",
                    iconColor: Theme.brandGreen,
                    title: "Dropoff",
                    subtitle: order.customerName,
                    address: order.deliveryAddress.fullAddress,
                    isCompleted: order.status == "Delivered"
                )
            }
            .padding()

            // Contact Driver Buttons
            if isOutForDelivery {
                Divider()

                HStack(spacing: 12) {
                    // Chat with Driver
                    Button(action: { showChat = true }) {
                        HStack {
                            Image(systemName: "message.fill")
                            Text("Chat")
                        }
                        .font(.headline)
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Theme.brandGreen)
                        .cornerRadius(12)
                    }

                    // Call Driver
                    if let driverPhone = order.driverPhone, !driverPhone.isEmpty {
                        Button(action: {
                            callDriver(phone: driverPhone)
                        }) {
                            HStack {
                                Image(systemName: "phone.fill")
                                Text("Call")
                            }
                            .font(.headline)
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(Theme.brandGreen)
                            .cornerRadius(12)
                        }
                    }
                }
                .padding()
            }
        }
        .background(
            RoundedRectangle(cornerRadius: 20)
                .fill(Color(.systemBackground))
                .shadow(color: .black.opacity(0.1), radius: 10, x: 0, y: -5)
        )
        .sheet(isPresented: $showChat) {
            NavigationStack {
                OrderChatView(
                    orderId: Int(order.id ?? "0") ?? 0,
                    driverName: driverInfo?.name ?? "Driver",
                    driverPhone: order.driverPhone
                )
            }
        }
    }

    private var isPickedUp: Bool {
        ["out_for_delivery", "ontheway", "pending_delivery_proof", "delivered"].contains(order.status.lowercased())
    }

    private var isOutForDelivery: Bool {
        ["out_for_delivery", "ontheway", "pending_delivery_proof"].contains(order.status.lowercased())
    }

    private func callDriver(phone: String) {
        let cleanPhone = phone.replacingOccurrences(of: " ", with: "")
            .replacingOccurrences(of: "-", with: "")
            .replacingOccurrences(of: "(", with: "")
            .replacingOccurrences(of: ")", with: "")
        if let url = URL(string: "tel://\(cleanPhone)") {
            UIApplication.shared.open(url)
        }
    }
}

// MARK: - Delivery Status Timeline
struct DeliveryStatusTimeline: View {
    let order: Order
    var timelineEvents: [P2PTimelineEvent] = []

    /// Convert API timeline events to display format
    private var timelineEventMap: [String: String] {
        var map: [String: String] = [:]
        for event in timelineEvents {
            map[event.status.lowercased()] = event.time
        }
        return map
    }

    private var stages: [(name: String, icon: String, isActive: Bool, isCompleted: Bool, time: String?)] {
        let status = order.status.lowercased()
        let events = timelineEventMap

        // Determine current phase
        let isConfirming = status == "confirming" || status == "pending_restaurant"
        let isPlaced = status == "placed" || status == "pending"
        let isPreparing = ["preparing", "accepted", "confirmed"].contains(status)
        let isReady = status == "ready" || status == "pending_delivery_decision" || status == "ready_for_pickup"
        let isOnTheWay = ["out_for_delivery", "ontheway", "restaurant_will_deliver", "pending_delivery_proof"].contains(status)
        let isDelivered = status == "delivered"
        let isDeliveryFailed = status == "delivery_failed"

        // Stage completion logic - each stage is complete when we've moved past it
        let stage1Complete = !isPlaced && !isConfirming  // Past Placed/Confirming
        let stage2Complete = isReady || isOnTheWay || isDelivered || isDeliveryFailed  // Past Preparing
        let stage3Complete = isOnTheWay || isDelivered || isDeliveryFailed  // Past Ready
        let stage4Complete = isDelivered || isDeliveryFailed  // Past On the Way

        return [
            // Stage 1: Placed/Confirming - shows "Confirming" with clock during restaurant acceptance
            (isConfirming ? "Confirming" : "Placed",
             isConfirming ? "clock.fill" : "checkmark.circle.fill",
             isPlaced || isConfirming,
             stage1Complete,
             events["placed"] ?? events["confirming"] ?? events["pending"]),

            // Stage 2: Preparing - restaurant is cooking
            ("Preparing", "flame.fill",
             isPreparing,
             stage2Complete,
             events["preparing"] ?? events["confirmed"] ?? events["accepted"]),

            // Stage 3: Ready - food ready, waiting for pickup (hides delivery decision complexity)
            ("Ready", "bag.fill",
             isReady,
             stage3Complete,
             events["ready"] ?? events["pending_delivery_decision"] ?? events["ready_for_pickup"]),

            // Stage 4: On the Way - driver or restaurant delivering
            ("On the Way", "car.fill",
             isOnTheWay,
             stage4Complete,
             events["picked_up"] ?? events["out_for_delivery"] ?? events["ontheway"] ?? events["restaurant_will_deliver"]),

            // Stage 5: Delivered or Failed
            (isDeliveryFailed ? "Delivery Failed" : "Delivered",
             isDeliveryFailed ? "xmark.circle.fill" : "house.fill",
             isDelivered || isDeliveryFailed,
             isDelivered || isDeliveryFailed,
             isDeliveryFailed ? events["delivery_failed"] : events["delivered"])
        ]
    }

    var body: some View {
        VStack(spacing: 12) {
            HStack(spacing: 0) {
                ForEach(Array(stages.enumerated()), id: \.offset) { index, stage in
                    VStack(spacing: 8) {
                        ZStack {
                            Circle()
                                .fill(stage.isCompleted ? Theme.brandGreen : Color.gray.opacity(0.2))
                                .frame(width: 36, height: 36)

                            if stage.isActive && !stage.isCompleted {
                                Circle()
                                    .stroke(Theme.brandGreen, lineWidth: 2)
                                    .frame(width: 36, height: 36)
                            }

                            Image(systemName: stage.icon)
                                .font(.system(size: 14))
                                .foregroundColor(stage.isCompleted ? .white : .gray)
                        }

                        VStack(spacing: 2) {
                            Text(stage.name)
                                .font(.caption2)
                                .fontWeight(stage.isActive ? .semibold : .regular)
                                .foregroundColor(stage.isCompleted || stage.isActive ? Theme.brandGreen : .gray)
                                .multilineTextAlignment(.center)

                            // Show timestamp if available
                            if let time = stage.time {
                                Text(formatTimelineTime(time))
                                    .font(.system(size: 9))
                                    .foregroundColor(.secondary)
                            }
                        }
                        .frame(width: 60)
                    }

                    if index < stages.count - 1 {
                        Rectangle()
                            .fill(stages[index].isCompleted ? Theme.brandGreen : Color.gray.opacity(0.2))
                            .frame(height: 2)
                            .frame(maxWidth: .infinity)
                            .padding(.bottom, 40)
                    }
                }
            }
        }
    }

    /// Format timeline timestamp for display
    private func formatTimelineTime(_ timeString: String) -> String {
        // Try to parse ISO8601 format
        let isoFormatter = ISO8601DateFormatter()
        isoFormatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]

        if let date = isoFormatter.date(from: timeString) {
            let displayFormatter = DateFormatter()
            displayFormatter.dateFormat = "h:mm a"
            return displayFormatter.string(from: date)
        }

        // Try alternate ISO format without fractional seconds
        isoFormatter.formatOptions = [.withInternetDateTime]
        if let date = isoFormatter.date(from: timeString) {
            let displayFormatter = DateFormatter()
            displayFormatter.dateFormat = "h:mm a"
            return displayFormatter.string(from: date)
        }

        // If already formatted (like "2:30 PM"), return as-is
        if timeString.contains(":") && (timeString.contains("AM") || timeString.contains("PM")) {
            return timeString
        }

        return timeString
    }
}

// MARK: - Driver Info Row
struct DriverInfoRow: View {
    let driver: P2PTrackingDriver

    var body: some View {
        HStack(spacing: 12) {
            // Driver photo or placeholder
            ZStack {
                Circle()
                    .fill(Theme.brandGreen.opacity(0.1))
                    .frame(width: 50, height: 50)

                if let photoUrl = driver.photoUrl, let url = URL(string: photoUrl) {
                    AsyncImage(url: url) { image in
                        image
                            .resizable()
                            .aspectRatio(contentMode: .fill)
                            .frame(width: 50, height: 50)
                            .clipShape(Circle())
                    } placeholder: {
                        Image(systemName: "person.fill")
                            .font(.title2)
                            .foregroundColor(Theme.brandGreen)
                    }
                } else {
                    Image(systemName: "person.fill")
                        .font(.title2)
                        .foregroundColor(Theme.brandGreen)
                }
            }

            VStack(alignment: .leading, spacing: 4) {
                Text(driver.name ?? "Driver")
                    .font(.subheadline)
                    .fontWeight(.semibold)

                HStack(spacing: 8) {
                    if let rating = driver.rating {
                        HStack(spacing: 2) {
                            Image(systemName: "star.fill")
                                .font(.caption2)
                                .foregroundColor(.yellow)
                            Text(String(format: "%.1f", rating))
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                    }

                    if let vehicle = driver.vehicle {
                        Text(vehicle)
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }

                    if let plate = driver.licensePlate {
                        Text(plate)
                            .font(.caption)
                            .fontWeight(.medium)
                            .foregroundColor(Theme.brandGreen)
                    }
                }
            }

            Spacer()

            // Vehicle Photo (if available)
            if let vehiclePhotoUrl = driver.vehiclePhotoUrl, let url = URL(string: vehiclePhotoUrl) {
                AsyncImage(url: url) { image in
                    image
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                        .frame(width: 60, height: 45)
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                } placeholder: {
                    RoundedRectangle(cornerRadius: 8)
                        .fill(Color.gray.opacity(0.2))
                        .frame(width: 60, height: 45)
                        .overlay(
                            Image(systemName: "car.fill")
                                .foregroundColor(.gray)
                        )
                }
            }

            // Call button
            if let phone = driver.phone, !phone.isEmpty {
                Button(action: {
                    let cleanPhone = phone.replacingOccurrences(of: " ", with: "")
                        .replacingOccurrences(of: "-", with: "")
                    if let url = URL(string: "tel://\(cleanPhone)") {
                        UIApplication.shared.open(url)
                    }
                }) {
                    Image(systemName: "phone.fill")
                        .font(.body)
                        .foregroundColor(.white)
                        .frame(width: 40, height: 40)
                        .background(Theme.brandGreen)
                        .clipShape(Circle())
                }
            }
        }
        .padding(.vertical, 8)
    }
}

// MARK: - Location Info Row
struct LocationInfoRow: View {
    let icon: String
    let iconColor: Color
    let title: String
    let subtitle: String
    let address: String
    let isCompleted: Bool

    var body: some View {
        HStack(spacing: 12) {
            ZStack {
                Circle()
                    .fill(isCompleted ? iconColor : iconColor.opacity(0.2))
                    .frame(width: 40, height: 40)

                Image(systemName: icon)
                    .font(.system(size: 16))
                    .foregroundColor(isCompleted ? .white : iconColor)
            }

            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.caption)
                    .foregroundColor(.secondary)

                Text(subtitle)
                    .font(.subheadline)
                    .fontWeight(.semibold)

                Text(address)
                    .font(.caption)
                    .foregroundColor(.secondary)
                    .lineLimit(1)
            }

            Spacer()

            if isCompleted {
                Image(systemName: "checkmark.circle.fill")
                    .font(.title3)
                    .foregroundColor(Theme.brandGreen)
            }
        }
    }
}

// MARK: - Loading View
struct LoadingView: View {
    var body: some View {
        VStack(spacing: 20) {
            ProgressView()
                .scaleEffect(1.5)

            Text("Loading delivery status...")
                .font(.subheadline)
                .foregroundColor(.secondary)
        }
    }
}

// MARK: - No Active Delivery View
struct NoActiveDeliveryView: View {
    var body: some View {
        VStack(spacing: 24) {
            Spacer()

            ZStack {
                Circle()
                    .fill(Theme.brandGreen.opacity(0.1))
                    .frame(width: 120, height: 120)

                Image(systemName: "bicycle")
                    .font(.system(size: 50))
                    .foregroundColor(Theme.brandGreen)
            }

            VStack(spacing: 8) {
                Text("No Active Deliveries")
                    .font(.title2)
                    .fontWeight(.bold)

                Text("When you place an order, you can track\nyour delivery in real-time here")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                    .multilineTextAlignment(.center)
            }

            Spacer()

            NavigationLink(destination: HomeView()) {
                HStack {
                    Image(systemName: "fork.knife")
                    Text("Browse Restaurants")
                }
                .font(.headline)
                .foregroundColor(.white)
                .frame(maxWidth: .infinity)
                .padding()
                .background(Theme.brandGreen)
                .cornerRadius(12)
            }
            .padding(.horizontal, 40)
            .padding(.bottom, 40)
        }
        .padding()
    }
}

// MARK: - Order Delivered Celebration View
struct OrderDeliveredCelebrationView: View {
    let order: Order
    let onDismiss: () -> Void
    @State private var showConfetti = false
    @State private var showContent = false

    var body: some View {
        ZStack {
            // Semi-transparent background
            Color.black.opacity(0.6)
                .ignoresSafeArea()
                .onTapGesture {
                    onDismiss()
                }

            // Celebration card
            VStack(spacing: 24) {
                // Checkmark animation
                ZStack {
                    Circle()
                        .fill(Theme.brandGreen)
                        .frame(width: 100, height: 100)
                        .scaleEffect(showContent ? 1 : 0)

                    Image(systemName: "checkmark")
                        .font(.system(size: 50, weight: .bold))
                        .foregroundColor(.white)
                        .scaleEffect(showContent ? 1 : 0)
                }
                .animation(.spring(response: 0.5, dampingFraction: 0.6).delay(0.2), value: showContent)

                // Thank you message
                VStack(spacing: 8) {
                    Text("Order Delivered!")
                        .font(.title)
                        .fontWeight(.bold)
                        .foregroundColor(Theme.brandGreen)

                    Text("Thank you for ordering with Dollor!")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                        .multilineTextAlignment(.center)
                }
                .opacity(showContent ? 1 : 0)
                .offset(y: showContent ? 0 : 20)
                .animation(.easeOut(duration: 0.4).delay(0.4), value: showContent)

                // Order summary
                VStack(spacing: 12) {
                    HStack {
                        Text("Order #")
                            .foregroundColor(.secondary)
                        Spacer()
                        Text(order.orderId)
                            .fontWeight(.semibold)
                    }

                    Divider()

                    HStack {
                        Text("From")
                            .foregroundColor(.secondary)
                        Spacer()
                        Text(order.restaurant.name)
                            .fontWeight(.medium)
                            .lineLimit(1)
                    }

                    Divider()

                    HStack {
                        Text("Total")
                            .foregroundColor(.secondary)
                        Spacer()
                        Text(String(format: "$%.2f", order.total))
                            .font(.title3)
                            .fontWeight(.bold)
                            .foregroundColor(Theme.brandGreen)
                    }
                }
                .padding()
                .background(Color(.systemGray6))
                .cornerRadius(12)
                .opacity(showContent ? 1 : 0)
                .animation(.easeOut(duration: 0.4).delay(0.5), value: showContent)

                // Receipt note
                HStack(spacing: 8) {
                    Image(systemName: "envelope.fill")
                        .foregroundColor(Theme.brandGreen)
                    Text("Receipt sent to your email")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                .opacity(showContent ? 1 : 0)
                .animation(.easeOut(duration: 0.4).delay(0.6), value: showContent)

                // Rate & Close buttons
                VStack(spacing: 12) {
                    NavigationLink(destination: RateRestaurantView(order: order)) {
                        HStack {
                            Image(systemName: "star.fill")
                            Text("Rate Your Experience")
                        }
                        .font(.headline)
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Theme.brandGreen)
                        .cornerRadius(12)
                    }

                    Button(action: onDismiss) {
                        Text("Close")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                    }
                }
                .opacity(showContent ? 1 : 0)
                .animation(.easeOut(duration: 0.4).delay(0.7), value: showContent)
            }
            .padding(24)
            .background(
                RoundedRectangle(cornerRadius: 24)
                    .fill(Color(.systemBackground))
                    .shadow(color: .black.opacity(0.2), radius: 20, x: 0, y: 10)
            )
            .padding(.horizontal, 24)
            .scaleEffect(showContent ? 1 : 0.8)
            .animation(.spring(response: 0.4, dampingFraction: 0.7), value: showContent)
        }
        .onAppear {
            showContent = true
        }
    }
}

#Preview {
    NavigationStack {
        DeliveryTrackingView()
    }
}
