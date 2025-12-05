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

    var body: some View {
        Map(position: $mapPosition) {
            // Restaurant (Pickup) Marker
            Annotation("Pickup", coordinate: CLLocationCoordinate2D(
                latitude: order.restaurant.latitude,
                longitude: order.restaurant.longitude
            )) {
                PickupMarker(name: order.restaurant.name)
            }

            // Customer (Dropoff) Marker
            Annotation("Dropoff", coordinate: CLLocationCoordinate2D(
                latitude: order.deliveryAddress.latitude,
                longitude: order.deliveryAddress.longitude
            )) {
                DropoffMarker()
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
        .onReceive(Timer.publish(every: 3, on: .main, in: .common).autoconnect()) { _ in
            updateMapRegion()
        }
    }

    private func updateMapRegion() {
        var coordinates: [CLLocationCoordinate2D] = [
            CLLocationCoordinate2D(latitude: order.restaurant.latitude, longitude: order.restaurant.longitude),
            CLLocationCoordinate2D(latitude: order.deliveryAddress.latitude, longitude: order.deliveryAddress.longitude)
        ]

        if let driverLoc = driverLocation {
            coordinates.append(driverLoc)
        }

        // Calculate center and span to fit all markers
        let latitudes = coordinates.map { $0.latitude }
        let longitudes = coordinates.map { $0.longitude }

        let centerLat = (latitudes.min()! + latitudes.max()!) / 2
        let centerLon = (longitudes.min()! + longitudes.max()!) / 2
        let spanLat = (latitudes.max()! - latitudes.min()!) * 1.5 + 0.01
        let spanLon = (longitudes.max()! - longitudes.min()!) * 1.5 + 0.01

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

    var body: some View {
        VStack(spacing: 0) {
            // Handle bar
            RoundedRectangle(cornerRadius: 3)
                .fill(Color.gray.opacity(0.3))
                .frame(width: 40, height: 5)
                .padding(.top, 10)

            // ETA Header
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Arriving in")
                        .font(.subheadline)
                        .foregroundColor(.secondary)

                    Text(estimatedTime)
                        .font(.system(size: 32, weight: .bold))
                        .foregroundColor(Theme.brandGreen)
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

            Divider()

            // Status Timeline
            DeliveryStatusTimeline(order: order)
                .padding()

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

            // Contact Driver Button
            if isOutForDelivery {
                Divider()

                Button(action: {
                    // Contact driver action
                }) {
                    HStack {
                        Image(systemName: "phone.fill")
                        Text("Contact Driver")
                    }
                    .font(.headline)
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Theme.brandGreen)
                    .cornerRadius(12)
                }
                .padding()
            }
        }
        .background(
            RoundedRectangle(cornerRadius: 20)
                .fill(Color(.systemBackground))
                .shadow(color: .black.opacity(0.1), radius: 10, x: 0, y: -5)
        )
    }

    private var isPickedUp: Bool {
        ["Out for Delivery", "OnTheWay", "Delivered"].contains(order.status)
    }

    private var isOutForDelivery: Bool {
        ["Out for Delivery", "OnTheWay"].contains(order.status)
    }
}

// MARK: - Delivery Status Timeline
struct DeliveryStatusTimeline: View {
    let order: Order

    private var stages: [(name: String, icon: String, isActive: Bool, isCompleted: Bool)] {
        let status = order.status.lowercased()
        return [
            ("Placed", "checkmark.circle.fill",
             status == "placed" || status == "pending",
             true),
            ("Preparing", "flame.fill",
             status == "preparing" || status == "confirmed",
             ["preparing", "ready", "out for delivery", "ontheway", "delivered"].contains(status)),
            ("Ready", "bag.fill",
             status == "ready",
             ["ready", "out for delivery", "ontheway", "delivered"].contains(status)),
            ("On the way", "car.fill",
             status == "out for delivery" || status == "ontheway",
             ["out for delivery", "ontheway", "delivered"].contains(status)),
            ("Delivered", "house.fill",
             status == "delivered",
             status == "delivered")
        ]
    }

    var body: some View {
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

                    Text(stage.name)
                        .font(.caption2)
                        .fontWeight(stage.isActive ? .semibold : .regular)
                        .foregroundColor(stage.isCompleted || stage.isActive ? Theme.brandGreen : .gray)
                        .multilineTextAlignment(.center)
                        .frame(width: 60)
                }

                if index < stages.count - 1 {
                    Rectangle()
                        .fill(stages[index].isCompleted ? Theme.brandGreen : Color.gray.opacity(0.2))
                        .frame(height: 2)
                        .frame(maxWidth: .infinity)
                        .padding(.bottom, 24)
                }
            }
        }
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

#Preview {
    NavigationStack {
        DeliveryTrackingView()
    }
}
