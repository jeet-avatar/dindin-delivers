import SwiftUI
import MapKit
import EatFairShared

/// ActiveRideView - Track and manage an active matched ride
/// Matches web app ActiveDelivery.tsx for rideshare
struct ActiveRideView: View {
    let bid: RideBid
    @ObservedObject var viewModel: RideBiddingViewModel
    @StateObject private var locationManager = LocationManager.shared
    @State private var showChat = false
    @State private var rideStatus: RideStatus = .matched
    @State private var showCompleteAlert = false
    @State private var position: MapCameraPosition = .automatic
    @State private var driverRoute: MKRoute?

    enum RideStatus: String {
        case matched = "Matched"
        case enRouteToPickup = "En Route"
        case arrivedAtPickup = "Arrived"
        case inProgress = "In Progress"
        case completed = "Completed"

        var color: Color {
            switch self {
            case .matched: return .blue
            case .enRouteToPickup: return .orange
            case .arrivedAtPickup: return .green
            case .inProgress: return .purple
            case .completed: return .green
            }
        }

        var icon: String {
            switch self {
            case .matched: return "checkmark.circle.fill"
            case .enRouteToPickup: return "car.fill"
            case .arrivedAtPickup: return "mappin.circle.fill"
            case .inProgress: return "arrow.right.circle.fill"
            case .completed: return "flag.checkered"
            }
        }
    }

    private var request: RideRequestForBidding? {
        bid.ride_request
    }

    private var finalPrice: Double {
        bid.customer_counter_price ?? bid.proposed_price
    }

    private var driverEarnings: Double {
        max(0, finalPrice - AppConfig.shared.rideshareTier1Fee)
    }

    private var hasRiderPhone: Bool {
        guard let phone = request?.customer_phone, !phone.isEmpty else { return false }
        return true
    }

    var body: some View {
        ZStack {
            // Full-screen Map
            mapView
                .ignoresSafeArea()

            // Overlay Content
            VStack {
                // Top Card - Status
                statusCard
                    .padding(.horizontal)
                    .padding(.top, 8)

                Spacer()

                // Bottom Card - Actions
                actionCard
            }
        }
        .navigationTitle("Active Ride")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                Button(action: { showChat = true }) {
                    Image(systemName: "message.fill")
                        .foregroundColor(.blue)
                }
            }
        }
        .sheet(isPresented: $showChat) {
            if let request = request {
                RiderChatView(
                    rideRequestId: request.id,
                    riderName: request.customer_name ?? "Rider",
                    riderPhone: request.customer_phone
                )
            }
        }
        .alert("Complete Ride?", isPresented: $showCompleteAlert) {
            Button("Cancel", role: .cancel) {}
            Button("Complete") {
                completeRide()
            }
        } message: {
            Text("Confirm that you have dropped off the passenger at their destination.")
        }
        .onAppear {
            updateMapPosition()
        }
    }

    // MARK: - Map View

    private var mapView: some View {
        Map(position: $position) {
            // Driver location
            if let coordinate = locationManager.currentCoordinate, coordinate.isValid {
                Annotation("You", coordinate: coordinate) {
                    ZStack {
                        Circle()
                            .fill(Color.blue.opacity(0.2))
                            .frame(width: 60, height: 60)

                        Image(systemName: "car.fill")
                            .font(.title2)
                            .foregroundColor(.white)
                            .padding(12)
                            .background(Color.blue)
                            .clipShape(Circle())
                            .shadow(color: .blue.opacity(0.5), radius: 6)
                    }
                }
            }

            // Pickup
            if let request = request {
                Annotation("Pickup", coordinate: CLLocationCoordinate2D(
                    latitude: request.pickup.latitude,
                    longitude: request.pickup.longitude
                )) {
                    VStack(spacing: 2) {
                        Image(systemName: "person.fill")
                            .foregroundColor(.white)
                            .padding(10)
                            .background(Color.green)
                            .clipShape(Circle())
                            .shadow(color: .green.opacity(0.5), radius: 4)

                        Image(systemName: "arrowtriangle.down.fill")
                            .font(.system(size: 10))
                            .foregroundColor(.green)
                            .offset(y: -4)
                    }
                }

                // Dropoff
                Annotation("Dropoff", coordinate: CLLocationCoordinate2D(
                    latitude: request.dropoff.latitude,
                    longitude: request.dropoff.longitude
                )) {
                    VStack(spacing: 2) {
                        Image(systemName: "mappin.circle.fill")
                            .foregroundColor(.white)
                            .padding(10)
                            .background(Color.red)
                            .clipShape(Circle())
                            .shadow(color: .red.opacity(0.5), radius: 4)

                        Image(systemName: "arrowtriangle.down.fill")
                            .font(.system(size: 10))
                            .foregroundColor(.red)
                            .offset(y: -4)
                    }
                }
            }

            // Route polyline
            if let driverRoute = driverRoute {
                MapPolyline(driverRoute.polyline)
                    .stroke(.blue, lineWidth: 5)
            }
        }
        .mapStyle(.standard(elevation: .realistic))
        .mapControls {
            MapUserLocationButton()
            MapCompass()
        }
        .onAppear { calculateDriverRoute() }
        .onChange(of: rideStatus) { _, _ in calculateDriverRoute() }
    }

    // MARK: - Status Card

    private var statusCard: some View {
        VStack(spacing: 12) {
            // Status Badge
            HStack {
                HStack(spacing: 8) {
                    Image(systemName: rideStatus.icon)
                        .font(.headline)
                    Text(rideStatus.rawValue)
                        .font(.headline)
                        .fontWeight(.bold)
                }
                .foregroundColor(rideStatus.color)
                .padding(.horizontal, 16)
                .padding(.vertical, 10)
                .background(rideStatus.color.opacity(0.15))
                .cornerRadius(12)

                Spacer()

                // Earnings
                VStack(alignment: .trailing, spacing: 2) {
                    Text("$\(String(format: "%.2f", driverEarnings))")
                        .font(.title3)
                        .fontWeight(.bold)
                        .foregroundColor(.green)
                    Text("earnings")
                        .font(.caption2)
                        .foregroundColor(Theme.textSecondary)
                }
            }

            // Rider Info
            if let request = request {
                HStack(spacing: 12) {
                    // Rider Avatar
                    ZStack {
                        Circle()
                            .fill(Color.blue.opacity(0.15))
                            .frame(width: 50, height: 50)
                        Text(String((request.customer_name ?? "R").prefix(1)))
                            .font(.title2)
                            .fontWeight(.bold)
                            .foregroundColor(.blue)
                    }

                    VStack(alignment: .leading, spacing: 4) {
                        Text(request.customer_name ?? "Rider")
                            .font(.headline)
                            .foregroundColor(Theme.textPrimary)
                        Text("Passenger")
                            .font(.caption)
                            .foregroundColor(Theme.textSecondary)
                    }

                    Spacer()

                    // Quick Actions
                    HStack(spacing: 12) {
                        Button(action: { showChat = true }) {
                            Image(systemName: "message.fill")
                                .font(.title3)
                                .foregroundColor(.blue)
                                .frame(width: 44, height: 44)
                                .background(Color.blue.opacity(0.1))
                                .cornerRadius(12)
                        }

                        Button(action: callRider) {
                            Image(systemName: "phone.fill")
                                .font(.title3)
                                .foregroundColor(hasRiderPhone ? .green : .gray)
                                .frame(width: 44, height: 44)
                                .background(hasRiderPhone ? Color.green.opacity(0.1) : Color.gray.opacity(0.1))
                                .cornerRadius(12)
                        }
                        .disabled(!hasRiderPhone)
                    }
                }
            }
        }
        .padding()
        .background(.ultraThinMaterial)
        .cornerRadius(20)
        .shadow(color: .black.opacity(0.1), radius: 10, x: 0, y: 5)
    }

    // MARK: - Action Card

    private var actionCard: some View {
        VStack(spacing: 0) {
            // Route Info
            if let request = request {
                VStack(spacing: 12) {
                    // Current Destination
                    HStack(spacing: 12) {
                        ZStack {
                            Circle()
                                .fill(rideStatus == .inProgress ? Color.red : Color.green)
                                .frame(width: 40, height: 40)
                            Image(systemName: rideStatus == .inProgress ? "mappin.circle.fill" : "person.fill")
                                .foregroundColor(.white)
                        }

                        VStack(alignment: .leading, spacing: 4) {
                            Text(rideStatus == .inProgress ? "DROP-OFF" : "PICKUP")
                                .font(.caption2)
                                .fontWeight(.semibold)
                                .foregroundColor(Theme.textSecondary)

                            Text(rideStatus == .inProgress ? request.dropoff.address : request.pickup.address)
                                .font(.subheadline)
                                .fontWeight(.medium)
                                .foregroundColor(Theme.textPrimary)
                                .lineLimit(2)
                        }

                        Spacer()

                        // Navigate Button
                        Button(action: openNavigation) {
                            Image(systemName: "arrow.triangle.turn.up.right.circle.fill")
                                .font(.title)
                                .foregroundColor(.blue)
                        }
                    }
                }
                .padding()
            }

            Divider()

            // Action Button
            actionButton
                .padding()
        }
        .background(.ultraThinMaterial)
        .cornerRadius(20, corners: [.topLeft, .topRight])
        .shadow(color: .black.opacity(0.1), radius: 10, x: 0, y: -5)
    }

    // MARK: - Action Button

    @ViewBuilder
    private var actionButton: some View {
        switch rideStatus {
        case .matched, .enRouteToPickup:
            Button(action: { viewModel.driverArrived(bid); rideStatus = .arrivedAtPickup }) {
                HStack {
                    Image(systemName: "mappin.circle.fill")
                    Text("I've Arrived")
                }
                .font(.headline)
                .foregroundColor(.white)
                .frame(maxWidth: .infinity)
                .padding()
                .background(Color.green)
                .cornerRadius(16)
            }

        case .arrivedAtPickup:
            Button(action: startRide) {
                HStack {
                    if viewModel.isLoading {
                        ProgressView()
                            .tint(.white)
                    } else {
                        Image(systemName: "car.fill")
                        Text("Start Ride")
                    }
                }
                .font(.headline)
                .foregroundColor(.white)
                .frame(maxWidth: .infinity)
                .padding()
                .background(Color.purple)
                .cornerRadius(16)
            }
            .disabled(viewModel.isLoading)

        case .inProgress:
            Button(action: { showCompleteAlert = true }) {
                HStack {
                    if viewModel.isLoading {
                        ProgressView()
                            .tint(.white)
                    } else {
                        Image(systemName: "flag.checkered")
                        Text("Complete Ride")
                    }
                }
                .font(.headline)
                .foregroundColor(.white)
                .frame(maxWidth: .infinity)
                .padding()
                .background(Color.green)
                .cornerRadius(16)
            }
            .disabled(viewModel.isLoading)

        case .completed:
            VStack(spacing: 8) {
                Image(systemName: "checkmark.circle.fill")
                    .font(.system(size: 50))
                    .foregroundColor(.green)
                Text("Ride Completed!")
                    .font(.headline)
                    .foregroundColor(.green)
                Text("$\(String(format: "%.2f", driverEarnings)) earned")
                    .font(.subheadline)
                    .foregroundColor(Theme.textSecondary)
            }
            .frame(maxWidth: .infinity)
            .padding()
        }
    }

    // MARK: - Actions

    private func startRide() {
        viewModel.startRide(bid)
        rideStatus = .inProgress
    }

    private func completeRide() {
        viewModel.completeRide(bid)
        rideStatus = .completed
    }

    private func callRider() {
        guard let request = request,
              let phone = request.customer_phone,
              !phone.isEmpty else {
            // Phone not available - show alert
            return
        }
        let cleanPhone = phone.replacingOccurrences(of: "[^0-9+]", with: "", options: .regularExpression)
        guard let url = URL(string: "tel://\(cleanPhone)") else { return }
        UIApplication.shared.open(url)
    }

    private func openNavigation() {
        guard let request = request else { return }

        let destination = rideStatus == .inProgress ? request.dropoff : request.pickup
        let coordinate = CLLocationCoordinate2D(
            latitude: destination.latitude,
            longitude: destination.longitude
        )

        let placemark = MKPlacemark(coordinate: coordinate)
        let mapItem = MKMapItem(placemark: placemark)
        mapItem.name = destination.address
        mapItem.openInMaps(launchOptions: [
            MKLaunchOptionsDirectionsModeKey: MKLaunchOptionsDirectionsModeDriving
        ])
    }

    private func calculateDriverRoute() {
        guard let request = request,
              let currentCoord = locationManager.currentCoordinate else { return }

        // Destination: dropoff if in progress, pickup otherwise
        let destCoord: CLLocationCoordinate2D
        if rideStatus == .inProgress {
            destCoord = CLLocationCoordinate2D(latitude: request.dropoff.latitude, longitude: request.dropoff.longitude)
        } else {
            destCoord = CLLocationCoordinate2D(latitude: request.pickup.latitude, longitude: request.pickup.longitude)
        }

        let dirRequest = MKDirections.Request()
        dirRequest.source = MKMapItem(placemark: MKPlacemark(coordinate: currentCoord))
        dirRequest.destination = MKMapItem(placemark: MKPlacemark(coordinate: destCoord))
        dirRequest.transportType = .automobile

        MKDirections(request: dirRequest).calculate { response, _ in
            if let route = response?.routes.first {
                DispatchQueue.main.async {
                    self.driverRoute = route
                }
            }
        }
    }

    private func updateMapPosition() {
        guard let request = request else { return }

        // Center map between driver, pickup, and dropoff
        let coordinates = [
            locationManager.currentCoordinate ?? CLLocationCoordinate2D(
                latitude: request.pickup.latitude,
                longitude: request.pickup.longitude
            ),
            CLLocationCoordinate2D(
                latitude: request.pickup.latitude,
                longitude: request.pickup.longitude
            ),
            CLLocationCoordinate2D(
                latitude: request.dropoff.latitude,
                longitude: request.dropoff.longitude
            )
        ]

        let validCoordinates = coordinates.filter { $0.isValid }
        guard !validCoordinates.isEmpty else { return }

        let minLat = validCoordinates.map { $0.latitude }.min() ?? 0
        let maxLat = validCoordinates.map { $0.latitude }.max() ?? 0
        let minLng = validCoordinates.map { $0.longitude }.min() ?? 0
        let maxLng = validCoordinates.map { $0.longitude }.max() ?? 0

        let center = CLLocationCoordinate2D(
            latitude: (minLat + maxLat) / 2,
            longitude: (minLng + maxLng) / 2
        )

        let span = MKCoordinateSpan(
            latitudeDelta: (maxLat - minLat) * 1.5 + 0.01,
            longitudeDelta: (maxLng - minLng) * 1.5 + 0.01
        )

        position = .region(MKCoordinateRegion(center: center, span: span))
    }
}

// MARK: - Corner Radius Extension
// Note: cornerRadius(_:corners:) and RoundedCorner are defined in MyDeliveriesView.swift

// MARK: - Preview

#if DEBUG
struct ActiveRideView_Previews: PreviewProvider {
    static var previews: some View {
        Text("Preview")
    }
}
#endif
