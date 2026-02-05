import SwiftUI
import MapKit
import EatFairShared

// MARK: - Active Delivery Detail View
struct ActiveDeliveryDetailView: View {
    let order: Order
    @ObservedObject var viewModel: DeliveryViewModel
    @State private var region = MKCoordinateRegion()
    @State private var showingCompleteAlert = false
    @State private var mapHeight: CGFloat = 300
    @State private var isMapExpanded = false
    
    var body: some View {
        ZStack(alignment: .bottom) {
            ScrollView {
                VStack(spacing: 0) {
                    // Map View
                    ZStack(alignment: .topTrailing) {
                        DeliveryMapView(
                            order: order,
                            region: $region
                        )
                        .frame(height: isMapExpanded ? UIScreen.main.bounds.height * 0.7 : mapHeight)
                        .clipped()
                        
                        // Map Expand Button
                        Button(action: {
                            withAnimation(.spring()) {
                                isMapExpanded.toggle()
                            }
                        }) {
                            Image(systemName: isMapExpanded ? "arrow.down.right.and.arrow.up.left" : "arrow.up.left.and.arrow.down.right")
                                .font(.system(size: 16, weight: .semibold))
                                .foregroundColor(.white)
                                .frame(width: 40, height: 40)
                                .background(Theme.brandRed)
                                .clipShape(Circle())
                                .shadow(color: .black.opacity(0.2), radius: 8, x: 0, y: 4)
                        }
                        .padding()
                    }
                    
                    // Order Details
                    VStack(spacing: 20) {
                        // Status Card
                        HStack {
                            VStack(alignment: .leading, spacing: 8) {
                                Text(statusText)
                                    .font(.title3)
                                    .fontWeight(.bold)
                                    .foregroundColor(Theme.textPrimary)
                                
                                Text("Order #\(order.orderId)")
                                    .font(.caption)
                                    .foregroundColor(Theme.textSecondary)
                            }
                            
                            Spacer()
                            
                            ZStack {
                                Circle()
                                    .fill(statusColor.opacity(0.15))
                                    .frame(width: 60, height: 60)
                                
                                Image(systemName: statusIcon)
                                    .font(.title2)
                                    .foregroundColor(statusColor)
                            }
                        }
                        .padding()
                        .background(Theme.cardBackground)
                        .cornerRadius(16)
                        
                        // Timeline
                        DeliveryTimelineView(order: order)
                        
                        // Restaurant Details
                        DetailSectionCard(
                            icon: "bag.fill",
                            iconColor: Theme.brandOrange,
                            title: "Pickup Location",
                            subtitle: order.restaurant.name,
                            address: order.restaurant.address,
                            action: {
                                openMapsNavigation(
                                    to: CLLocationCoordinate2D(
                                        latitude: order.restaurant.latitude,
                                        longitude: order.restaurant.longitude
                                    ),
                                    name: order.restaurant.name
                                )
                            }
                        )

                        // Customer Details
                        DetailSectionCard(
                            icon: "person.circle.fill",
                            iconColor: Theme.statusActive,
                            title: "Delivery Location",
                            subtitle: order.customerName,
                            address: order.deliveryAddress.fullAddress,
                            action: {
                                openMapsNavigation(
                                    to: CLLocationCoordinate2D(
                                        latitude: order.deliveryAddress.latitude,
                                        longitude: order.deliveryAddress.longitude
                                    ),
                                    name: "Delivery Location"
                                )
                            }
                        )
                        
                        // Order Items
                        VStack(alignment: .leading, spacing: 12) {
                            HStack {
                                Image(systemName: "list.bullet.rectangle")
                                    .font(.headline)
                                    .foregroundColor(Theme.brandRed)
                                Text("Order Items")
                                    .font(.headline)
                                    .foregroundColor(Theme.textPrimary)
                            }
                            
                            ForEach(order.items) { item in
                                HStack {
                                    Text("\(item.quantity)x")
                                        .font(.subheadline)
                                        .fontWeight(.semibold)
                                        .foregroundColor(Theme.textSecondary)
                                        .frame(width: 40, alignment: .leading)
                                    
                                    Text(item.name)
                                        .font(.subheadline)
                                        .foregroundColor(Theme.textPrimary)
                                    
                                    Spacer()
                                    
                                    Text("$\(String(format: "%.2f", item.price))")
                                        .font(.subheadline)
                                        .fontWeight(.medium)
                                        .foregroundColor(Theme.textPrimary)
                                }
                                .padding(.vertical, 8)
                                
                                if item.id != order.items.last?.id {
                                    Divider()
                                }
                            }
                            
                            Divider()
                            
                            HStack {
                                Text("Total")
                                    .font(.headline)
                                    .fontWeight(.bold)
                                    .foregroundColor(Theme.textPrimary)
                                Spacer()
                                Text("$\(String(format: "%.2f", order.total))")
                                    .font(.headline)
                                    .fontWeight(.bold)
                                    .foregroundColor(Theme.brandRed)
                            }
                        }
                        .padding()
                        .background(Theme.cardBackground)
                        .cornerRadius(16)
                        
                        // Delivery Instructions
                        if !order.deliveryInstructions.isEmpty {
                            VStack(alignment: .leading, spacing: 12) {
                                HStack {
                                    Image(systemName: "note.text")
                                        .font(.headline)
                                        .foregroundColor(Theme.statusWarning)
                                    Text("Delivery Instructions")
                                        .font(.headline)
                                        .foregroundColor(Theme.textPrimary)
                                }
                                
                                Text(order.deliveryInstructions)
                                    .font(.subheadline)
                                    .foregroundColor(Theme.textSecondary)
                                    .padding()
                                    .frame(maxWidth: .infinity, alignment: .leading)
                                    .background(Theme.statusWarning.opacity(0.1))
                                    .cornerRadius(12)
                            }
                            .padding()
                            .background(Theme.cardBackground)
                            .cornerRadius(16)
                        }
                        
                        // Earnings Summary
                        VStack(alignment: .leading, spacing: 12) {
                            HStack {
                                Image(systemName: "dollarsign.circle.fill")
                                    .font(.headline)
                                    .foregroundColor(Theme.statusActive)
                                Text("Your Earnings")
                                    .font(.headline)
                                    .foregroundColor(Theme.textPrimary)
                            }
                            
                            HStack {
                                Text("Delivery Fee")
                                    .font(.subheadline)
                                    .foregroundColor(Theme.textSecondary)
                                Spacer()
                                Text("$\(String(format: "%.2f", order.deliveryFee))")
                                    .font(.subheadline)
                                    .fontWeight(.semibold)
                                    .foregroundColor(Theme.textPrimary)
                            }
                            
                            HStack {
                                Text("Tip")
                                    .font(.subheadline)
                                    .foregroundColor(Theme.textSecondary)
                                Spacer()
                                Text("$\(String(format: "%.2f", order.tip))")
                                    .font(.subheadline)
                                    .fontWeight(.semibold)
                                    .foregroundColor(Theme.textPrimary)
                            }

                            Divider()

                            HStack {
                                Text("Total Earnings")
                                    .font(.headline)
                                    .fontWeight(.bold)
                                    .foregroundColor(Theme.textPrimary)
                                Spacer()
                                Text("$\(String(format: "%.2f", order.deliveryFee + order.tip))")
                                    .font(.headline)
                                    .fontWeight(.bold)
                                    .foregroundColor(Theme.statusActive)
                            }
                        }
                        .padding()
                        .background(Theme.cardBackground)
                        .cornerRadius(16)
                    }
                    .padding()
                    .padding(.bottom, 100)
                }
            }
            .background(Theme.backgroundGrey.ignoresSafeArea())
            
            // Bottom Action Bar
            VStack(spacing: 0) {
                Divider()
                
                HStack(spacing: 12) {
                    // Contact Button
                    Button(action: {
                        callCustomer()
                    }) {
                        HStack(spacing: 8) {
                            Image(systemName: "phone.fill")
                                .font(.headline)
                            Text("Contact")
                                .font(.subheadline)
                                .fontWeight(.semibold)
                        }
                        .foregroundColor(Theme.brandRed)
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Theme.brandRed.opacity(0.1))
                        .cornerRadius(12)
                    }
                    .disabled(order.customerPhone?.isEmpty != false)
                    
                    // Primary Action Button
                    Button(action: {
                        if orderStatus == .outForDelivery || orderStatus == .restaurantWillDeliver {
                            showingCompleteAlert = true
                        } else {
                            viewModel.markAsPickedUp(order)
                        }
                    }) {
                        HStack(spacing: 8) {
                            Image(systemName: actionIcon)
                                .font(.headline)
                            Text(actionText)
                                .font(.subheadline)
                                .fontWeight(.bold)
                        }
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(actionColor)
                        .cornerRadius(12)
                    }
                }
                .padding()
                .background(Theme.cardBackground)
            }
        }
        .navigationTitle("Delivery Details")
        .navigationBarTitleDisplayMode(.inline)
        .alert("Complete Delivery", isPresented: $showingCompleteAlert) {
            Button("Cancel", role: .cancel) {}
            Button("Confirm") {
                viewModel.markAsDelivered(order)
            }
        } message: {
            Text("Have you delivered the order to the customer?")
        }
        .onAppear {
            setupMapRegion()
        }
    }
    
    private func setupMapRegion() {
        let restaurantLocation = CLLocationCoordinate2D(
            latitude: order.restaurant.latitude,
            longitude: order.restaurant.longitude
        )
        
        region = MKCoordinateRegion(
            center: restaurantLocation,
            span: MKCoordinateSpan(latitudeDelta: 0.05, longitudeDelta: 0.05)
        )
    }
    
    private var orderStatus: DeliveryOrderStatus {
        DeliveryOrderStatus.from(order.status)
    }

    var statusText: String {
        switch orderStatus {
        case .readyForPickup: return "Heading to Restaurant"
        case .outForDelivery, .restaurantWillDeliver: return "Heading to Customer"
        case .delivered: return "Order Completed"
        case .cancelled: return "Order Cancelled"
        default: return "Order Pending"
        }
    }

    var statusIcon: String {
        switch orderStatus {
        case .readyForPickup: return "bag"
        case .outForDelivery, .restaurantWillDeliver: return "shippingbox"
        case .delivered: return "checkmark.circle"
        case .cancelled: return "xmark.circle"
        default: return "clock"
        }
    }

    var statusColor: Color {
        switch orderStatus {
        case .readyForPickup: return Theme.brandOrange
        case .outForDelivery, .restaurantWillDeliver: return Theme.statusInfo
        case .delivered: return Theme.statusActive
        case .cancelled: return Theme.statusError
        default: return Theme.brandOrange
        }
    }

    var actionText: String {
        orderStatus == .outForDelivery || orderStatus == .restaurantWillDeliver ? "Complete Delivery" : "Start Delivery"
    }

    var actionIcon: String {
        orderStatus == .outForDelivery || orderStatus == .restaurantWillDeliver ? "checkmark.circle.fill" : "arrow.right.circle.fill"
    }

    var actionColor: Color {
        orderStatus == .outForDelivery || orderStatus == .restaurantWillDeliver ? Theme.statusActive : Theme.statusInfo
    }

    // MARK: - Helper Functions

    private func callCustomer() {
        guard let customerPhone = order.customerPhone, !customerPhone.isEmpty else { return }
        let phone = customerPhone.replacingOccurrences(of: " ", with: "")
            .replacingOccurrences(of: "-", with: "")
            .replacingOccurrences(of: "(", with: "")
            .replacingOccurrences(of: ")", with: "")
        guard !phone.isEmpty, let url = URL(string: "tel://\(phone)") else { return }
        UIApplication.shared.open(url)
    }

    private func openMapsNavigation(to coordinate: CLLocationCoordinate2D, name: String) {
        // Try Google Maps first, fall back to Apple Maps
        let googleMapsURL = URL(string: "comgooglemaps://?daddr=\(coordinate.latitude),\(coordinate.longitude)&directionsmode=driving")
        let appleMapsURL = URL(string: "https://maps.apple.com/?daddr=\(coordinate.latitude),\(coordinate.longitude)&dirflg=d")

        if let googleMapsURL = googleMapsURL, UIApplication.shared.canOpenURL(googleMapsURL) {
            UIApplication.shared.open(googleMapsURL)
        } else if let appleMapsURL = appleMapsURL {
            UIApplication.shared.open(appleMapsURL)
        }
    }
}

// MARK: - Delivery Map View
struct DeliveryMapView: View {
    let order: Order
    @Binding var region: MKCoordinateRegion
    @StateObject private var locationManager = LocationManager.shared
    @State private var mapPosition: MapCameraPosition = .automatic

    var body: some View {
        Map(position: $mapPosition) {
            // Driver's Current Location (Blue Dot with Pulse)
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
                                .font(.system(size: 12, weight: .bold))
                                .foregroundColor(.white)
                                .rotationEffect(.degrees(heading.trueHeading))
                        }
                    }
                }
            }

            // Pickup Location (Restaurant)
            Annotation("Pickup", coordinate: CLLocationCoordinate2D(
                latitude: order.restaurant.latitude,
                longitude: order.restaurant.longitude
            )) {
                VStack {
                    Image(systemName: "bag.fill")
                        .font(.headline)
                        .foregroundColor(.white)
                        .frame(width: 40, height: 40)
                        .background(Theme.brandOrange)
                        .clipShape(Circle())
                        .shadow(radius: 4)

                    Text("Pickup")
                        .font(.caption)
                        .fontWeight(.semibold)
                        .foregroundColor(.white)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(Color.black.opacity(0.7))
                        .cornerRadius(8)
                }
            }

            // Dropoff Location (Customer)
            Annotation("Dropoff", coordinate: CLLocationCoordinate2D(
                latitude: order.deliveryAddress.latitude,
                longitude: order.deliveryAddress.longitude
            )) {
                VStack {
                    Image(systemName: "house.fill")
                        .font(.headline)
                        .foregroundColor(.white)
                        .frame(width: 40, height: 40)
                        .background(Theme.statusActive)
                        .clipShape(Circle())
                        .shadow(radius: 4)

                    Text("Dropoff")
                        .font(.caption)
                        .fontWeight(.semibold)
                        .foregroundColor(.white)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(Color.black.opacity(0.7))
                        .cornerRadius(8)
                }
            }
        }
        .mapStyle(.standard(elevation: .realistic))
        .mapControls {
            MapUserLocationButton()
            MapCompass()
            MapScaleView()
        }
        .onAppear {
            // Start tracking driver location
            locationManager.startTracking()

            // Set initial map position to show all annotations
            updateMapPosition()
        }
        .onChange(of: locationManager.currentCoordinate) { _, newLocation in
            // Update map to follow driver
            if let location = newLocation {
                withAnimation(.easeInOut(duration: 0.5)) {
                    mapPosition = .camera(MapCamera(
                        centerCoordinate: location,
                        distance: 2000,
                        heading: locationManager.heading?.trueHeading ?? 0,
                        pitch: 45
                    ))
                }
            }
        }
    }

    private func updateMapPosition() {
        // Calculate region to fit all points
        let pickupCoord = CLLocationCoordinate2D(
            latitude: order.restaurant.latitude,
            longitude: order.restaurant.longitude
        )
        let dropoffCoord = CLLocationCoordinate2D(
            latitude: order.deliveryAddress.latitude,
            longitude: order.deliveryAddress.longitude
        )

        var coordinates = [pickupCoord, dropoffCoord]
        if let driverCoord = locationManager.currentCoordinate {
            coordinates.append(driverCoord)
        }

        // Calculate center and span
        let minLat = coordinates.map { $0.latitude }.min() ?? 0
        let maxLat = coordinates.map { $0.latitude }.max() ?? 0
        let minLon = coordinates.map { $0.longitude }.min() ?? 0
        let maxLon = coordinates.map { $0.longitude }.max() ?? 0

        let center = CLLocationCoordinate2D(
            latitude: (minLat + maxLat) / 2,
            longitude: (minLon + maxLon) / 2
        )

        let span = MKCoordinateSpan(
            latitudeDelta: (maxLat - minLat) * 1.5 + 0.01,
            longitudeDelta: (maxLon - minLon) * 1.5 + 0.01
        )

        mapPosition = .region(MKCoordinateRegion(center: center, span: span))
    }
}

// MARK: - Detail Section Card
struct DetailSectionCard: View {
    let icon: String
    let iconColor: Color
    let title: String
    let subtitle: String
    let address: String
    let action: () -> Void
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: icon)
                    .font(.headline)
                    .foregroundColor(iconColor)
                Text(title)
                    .font(.headline)
                    .foregroundColor(Theme.textPrimary)
            }
            
            HStack(spacing: 16) {
                Image(systemName: icon)
                    .font(.title2)
                    .foregroundColor(iconColor)
                    .frame(width: 50, height: 50)
                    .background(iconColor.opacity(0.1))
                    .cornerRadius(12)
                
                VStack(alignment: .leading, spacing: 6) {
                    Text(subtitle)
                        .font(.headline)
                        .foregroundColor(Theme.textPrimary)
                    
                    Text(address)
                        .font(.subheadline)
                        .foregroundColor(Theme.textSecondary)
                        .lineLimit(2)
                }
                
                Spacer()
                
                Button(action: action) {
                    Image(systemName: "arrow.triangle.turn.up.right.circle.fill")
                        .font(.title2)
                        .foregroundColor(Theme.statusInfo)
                }
            }
        }
        .padding()
        .background(Theme.cardBackground)
        .cornerRadius(16)
    }
}

// MARK: - Delivery Timeline View
struct DeliveryTimelineView: View {
    let order: Order

    private var orderStatus: DeliveryOrderStatus {
        DeliveryOrderStatus.from(order.status)
    }

    private var isPickedUp: Bool {
        orderStatus == .outForDelivery || orderStatus == .restaurantWillDeliver || orderStatus == .delivered
    }

    private var isDelivered: Bool {
        orderStatus == .delivered
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            TimelineStep(
                title: "Order Placed",
                time: formatTime(order.placedAt),
                isCompleted: true,
                isLast: false
            )

            TimelineStep(
                title: "Accepted by Driver",
                time: formatTime(order.acceptedAt),
                isCompleted: order.acceptedAt != nil,
                isLast: false
            )

            TimelineStep(
                title: isPickedUp ? "Picked Up" : "Ready for Pickup",
                time: isPickedUp ? formatTime(order.pickedUpAt) : "Pending",
                isCompleted: isPickedUp,
                isLast: false
            )

            TimelineStep(
                title: DeliveryOrderStatus.delivered.displayName,
                time: isDelivered ? formatTime(order.deliveredAt) : "Pending",
                isCompleted: isDelivered,
                isLast: true
            )
        }
        .padding()
        .background(Theme.cardBackground)
        .cornerRadius(16)
    }

    func formatTime(_ timestamp: Int64?) -> String {
        guard let timestamp = timestamp else { return "Pending" }
        let date = Date(timeIntervalSince1970: TimeInterval(timestamp / 1000))
        return DateTimeFormatter.shared.statusTimelineTime(from: date)
    }
}

struct TimelineStep: View {
    let title: String
    let time: String
    let isCompleted: Bool
    let isLast: Bool
    
    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            VStack(spacing: 0) {
                Circle()
                    .fill(isCompleted ? Theme.statusActive : Theme.lightGrey)
                    .frame(width: 20, height: 20)
                    .overlay(
                        Circle()
                            .stroke(isCompleted ? Theme.statusActive : Theme.lightGrey, lineWidth: 3)
                            .frame(width: 28, height: 28)
                    )
                
                if !isLast {
                    Rectangle()
                        .fill(isCompleted ? Theme.statusActive.opacity(0.3) : Theme.lightGrey)
                        .frame(width: 2, height: 30)
                }
            }
            
            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.subheadline)
                    .fontWeight(isCompleted ? .semibold : .regular)
                    .foregroundColor(isCompleted ? Theme.textPrimary : Theme.textGrey)
                
                Text(time)
                    .font(.caption)
                    .foregroundColor(Theme.textSecondary)
            }
            
            Spacer()
        }
    }
}
