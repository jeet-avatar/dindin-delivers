import SwiftUI
import MapKit
import EatFairShared

/// Uber-style Passenger Pickup/Dropoff View for Ride-sharing
/// Shows active ride with swipe-to-confirm for pickup and dropoff actions
struct PassengerPickupDropoffView: View {
    @ObservedObject var viewModel: RideViewModel
    @State private var mapPosition: MapCameraPosition = .automatic
    @State private var isMapExpanded = false
    @State private var isPassengerPickedUp = false

    var body: some View {
        ZStack {
            if let activeRide = viewModel.activeRide {
                ActiveRideView(
                    ride: activeRide,
                    viewModel: viewModel,
                    mapPosition: $mapPosition,
                    isMapExpanded: $isMapExpanded,
                    isPassengerPickedUp: $isPassengerPickedUp
                )
            } else {
                NoActiveRideView(viewModel: viewModel)
            }
        }
        .navigationTitle("Active Ride")
        .navigationBarTitleDisplayMode(.inline)
    }
}

// MARK: - Active Ride View
struct ActiveRideView: View {
    let ride: P2PRide
    @ObservedObject var viewModel: RideViewModel
    @Binding var mapPosition: MapCameraPosition
    @Binding var isMapExpanded: Bool
    @Binding var isPassengerPickedUp: Bool

    var body: some View {
        GeometryReader { geometry in
            ZStack(alignment: .bottom) {
                // Full screen map
                RideMapView(
                    ride: ride,
                    mapPosition: $mapPosition,
                    showPickupLocation: !isPassengerPickedUp,
                    showDropoffLocation: true
                )
                .ignoresSafeArea(edges: .top)

                // Bottom action sheet
                if !isMapExpanded {
                    RideBottomActionSheet(
                        ride: ride,
                        viewModel: viewModel,
                        isPassengerPickedUp: $isPassengerPickedUp,
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
                            .background(Theme.statusInfo)
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

// MARK: - Ride Map View
struct RideMapView: View {
    let ride: P2PRide
    @Binding var mapPosition: MapCameraPosition
    let showPickupLocation: Bool
    let showDropoffLocation: Bool

    var body: some View {
        Map(position: $mapPosition) {
            // Pickup (Passenger) Marker
            if showPickupLocation, let pickup = ride.pickup?.coordinate {
                Annotation("Pickup", coordinate: CLLocationCoordinate2D(
                    latitude: pickup.lat,
                    longitude: pickup.lng
                )) {
                    PassengerPickupMarker()
                }
            }

            // Dropoff Marker
            if showDropoffLocation, let dropoff = ride.dropoff?.coordinate {
                Annotation("Dropoff", coordinate: CLLocationCoordinate2D(
                    latitude: dropoff.lat,
                    longitude: dropoff.lng
                )) {
                    PassengerDropoffMarker()
                }
            }

            // Driver's current location
            UserAnnotation()
        }
        .mapStyle(.standard(pointsOfInterest: .excludingAll))
        .mapControls {
            MapUserLocationButton()
            MapCompass()
        }
        .onAppear {
            updateMapRegion()
        }
    }

    private func updateMapRegion() {
        var coordinates: [CLLocationCoordinate2D] = []

        if showPickupLocation, let pickup = ride.pickup?.coordinate {
            coordinates.append(CLLocationCoordinate2D(latitude: pickup.lat, longitude: pickup.lng))
        }

        if showDropoffLocation, let dropoff = ride.dropoff?.coordinate {
            coordinates.append(CLLocationCoordinate2D(latitude: dropoff.lat, longitude: dropoff.lng))
        }

        guard !coordinates.isEmpty else { return }

        let latitudes = coordinates.map { $0.latitude }
        let longitudes = coordinates.map { $0.longitude }

        let centerLat = (latitudes.min()! + latitudes.max()!) / 2
        let centerLon = (longitudes.min()! + longitudes.max()!) / 2
        let spanLat = (latitudes.max()! - latitudes.min()!) * 1.5 + 0.02
        let spanLon = (longitudes.max()! - longitudes.min()!) * 1.5 + 0.02

        let region = MKCoordinateRegion(
            center: CLLocationCoordinate2D(latitude: centerLat, longitude: centerLon),
            span: MKCoordinateSpan(latitudeDelta: max(spanLat, 0.02), longitudeDelta: max(spanLon, 0.02))
        )

        mapPosition = .region(region)
    }
}

// MARK: - Map Markers
struct PassengerPickupMarker: View {
    var body: some View {
        VStack(spacing: 0) {
            ZStack {
                Circle()
                    .fill(Theme.statusInfo)
                    .frame(width: 50, height: 50)
                    .shadow(color: .black.opacity(0.3), radius: 4, x: 0, y: 2)

                Image(systemName: "person.fill")
                    .font(.system(size: 22))
                    .foregroundColor(.white)
            }

            Image(systemName: "triangle.fill")
                .font(.system(size: 12))
                .foregroundColor(Theme.statusInfo)
                .rotationEffect(.degrees(180))
                .offset(y: -5)
        }
    }
}

struct PassengerDropoffMarker: View {
    var body: some View {
        VStack(spacing: 0) {
            ZStack {
                Circle()
                    .fill(Theme.statusActive)
                    .frame(width: 50, height: 50)
                    .shadow(color: .black.opacity(0.3), radius: 4, x: 0, y: 2)

                Image(systemName: "flag.checkered")
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

// MARK: - Ride Bottom Action Sheet
struct RideBottomActionSheet: View {
    let ride: P2PRide
    @ObservedObject var viewModel: RideViewModel
    @Binding var isPassengerPickedUp: Bool
    let onExpandMap: () -> Void

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
                    Text(isPassengerPickedUp ? "Step 2 of 2" : "Step 1 of 2")
                        .font(.caption)
                        .foregroundColor(.secondary)

                    Text(isPassengerPickedUp ? "Drop Off Passenger" : "Pick Up Passenger")
                        .font(.title)
                        .fontWeight(.bold)
                        .foregroundColor(isPassengerPickedUp ? Theme.statusActive : Theme.statusInfo)
                }

                Spacer()

                // Expand map button
                Button(action: onExpandMap) {
                    Image(systemName: "arrow.up.left.and.arrow.down.right")
                        .font(.title3)
                        .foregroundColor(.white)
                        .frame(width: 44, height: 44)
                        .background(Theme.statusInfo)
                        .clipShape(Circle())
                }
            }
            .padding()

            Divider()

            // Pickup/Dropoff Location Card
            if isPassengerPickedUp {
                RideDropoffCard(ride: ride, onNavigate: { navigateToDropoff() })
            } else {
                RidePickupCard(ride: ride, onNavigate: { navigateToPickup() })
            }

            Divider()

            // Earnings Summary
            RideEarningsSummary(ride: ride)

            // Swipe to Confirm Button
            SwipeToConfirmButton(
                title: isPassengerPickedUp ? "Swipe to Complete Ride" : "Swipe to Confirm Pickup",
                color: isPassengerPickedUp ? Theme.statusActive : Theme.statusInfo,
                onConfirm: {
                    if isPassengerPickedUp {
                        viewModel.completeRide(ride)
                    } else {
                        withAnimation {
                            isPassengerPickedUp = true
                        }
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
        guard let pickup = ride.pickup?.coordinate else { return }
        openMaps(to: CLLocationCoordinate2D(latitude: pickup.lat, longitude: pickup.lng), name: "Passenger Pickup")
    }

    private func navigateToDropoff() {
        guard let dropoff = ride.dropoff?.coordinate else { return }
        openMaps(to: CLLocationCoordinate2D(latitude: dropoff.lat, longitude: dropoff.lng), name: "Dropoff Location")
    }

    private func openMaps(to coordinate: CLLocationCoordinate2D, name: String) {
        let googleMapsURL = URL(string: "comgooglemaps://?daddr=\(coordinate.latitude),\(coordinate.longitude)&directionsmode=driving")
        let appleMapsURL = URL(string: "http://maps.apple.com/?daddr=\(coordinate.latitude),\(coordinate.longitude)&dirflg=d")

        if let googleMapsURL = googleMapsURL, UIApplication.shared.canOpenURL(googleMapsURL) {
            UIApplication.shared.open(googleMapsURL)
        } else if let appleMapsURL = appleMapsURL {
            UIApplication.shared.open(appleMapsURL)
        }
    }
}

// MARK: - Ride Pickup Card
struct RidePickupCard: View {
    let ride: P2PRide
    let onNavigate: () -> Void

    var body: some View {
        HStack(spacing: 16) {
            ZStack {
                Circle()
                    .fill(Theme.statusInfo.opacity(0.15))
                    .frame(width: 50, height: 50)

                Image(systemName: "person.fill")
                    .font(.title3)
                    .foregroundColor(Theme.statusInfo)
            }

            VStack(alignment: .leading, spacing: 4) {
                Text(ride.customerName ?? "Passenger")
                    .font(.headline)
                    .foregroundColor(Theme.textPrimary)

                Text(ride.pickup?.fullAddress ?? "Pickup location")
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

// MARK: - Ride Dropoff Card
struct RideDropoffCard: View {
    let ride: P2PRide
    let onNavigate: () -> Void

    var body: some View {
        VStack(spacing: 12) {
            HStack(spacing: 16) {
                ZStack {
                    Circle()
                        .fill(Theme.statusActive.opacity(0.15))
                        .frame(width: 50, height: 50)

                    Image(systemName: "flag.checkered")
                        .font(.title3)
                        .foregroundColor(Theme.statusActive)
                }

                VStack(alignment: .leading, spacing: 4) {
                    Text("Destination")
                        .font(.headline)
                        .foregroundColor(Theme.textPrimary)

                    Text(ride.dropoff?.fullAddress ?? "Dropoff location")
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

            // Notes if any
            if let notes = ride.notes, !notes.isEmpty {
                HStack(alignment: .top, spacing: 8) {
                    Image(systemName: "note.text")
                        .font(.caption)
                        .foregroundColor(Theme.statusWarning)

                    Text(notes)
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

// MARK: - Ride Earnings Summary
struct RideEarningsSummary: View {
    let ride: P2PRide

    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text("Ride #\(ride.rideNumber.prefix(12))")
                    .font(.caption)
                    .foregroundColor(Theme.textSecondary)

                Text("Your Earnings")
                    .font(.caption)
                    .foregroundColor(Theme.textSecondary)
            }

            Spacer()

            VStack(alignment: .trailing, spacing: 4) {
                Text("$\(String(format: "%.2f", ride.earnings))")
                    .font(.title2)
                    .fontWeight(.bold)
                    .foregroundColor(Theme.statusActive)

                if let tip = ride.tip, tip > 0 {
                    Text("incl. $\(String(format: "%.2f", tip)) tip")
                        .font(.caption)
                        .foregroundColor(Theme.statusActive)
                }
            }
        }
        .padding()
        .background(Theme.backgroundGrey)
    }
}

// MARK: - No Active Ride View
struct NoActiveRideView: View {
    @ObservedObject var viewModel: RideViewModel

    var body: some View {
        VStack(spacing: 24) {
            Spacer()

            ZStack {
                Circle()
                    .fill(Theme.statusInfo.opacity(0.1))
                    .frame(width: 120, height: 120)

                Image(systemName: "car.fill")
                    .font(.system(size: 50))
                    .foregroundColor(Theme.statusInfo)
            }

            VStack(spacing: 8) {
                Text("No Active Ride")
                    .font(.title2)
                    .fontWeight(.bold)
                    .foregroundColor(Theme.textPrimary)

                Text("Accept a ride from the Rides tab\nto start driving passengers")
                    .font(.subheadline)
                    .foregroundColor(Theme.textSecondary)
                    .multilineTextAlignment(.center)
            }

            Spacer()

            // Quick stats
            HStack(spacing: 20) {
                QuickStatCard(
                    icon: "checkmark.circle.fill",
                    value: "\(viewModel.todayRideCount)",
                    label: "Today",
                    color: Theme.statusActive
                )

                QuickStatCard(
                    icon: "dollarsign.circle.fill",
                    value: "$\(String(format: "%.0f", viewModel.todayEarnings))",
                    label: "Earned",
                    color: Theme.statusInfo
                )

                QuickStatCard(
                    icon: "car.fill",
                    value: "\(viewModel.availableRides.count)",
                    label: "Available",
                    color: Theme.brandOrange
                )
            }
            .padding(.horizontal)
            .padding(.bottom, 40)
        }
        .padding()
        .background(Theme.backgroundGrey.ignoresSafeArea())
    }
}

// MARK: - Preview
#Preview {
    NavigationView {
        PassengerPickupDropoffView(viewModel: RideViewModel())
    }
}
