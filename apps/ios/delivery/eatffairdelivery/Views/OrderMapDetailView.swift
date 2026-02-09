import SwiftUI
import CoreLocation
import EatFairShared

struct OrderMapDetailView: View {
    let order: Order
    @ObservedObject var viewModel: DeliveryViewModel
    @State private var distance: String = ""
    @State private var travelTime: String = ""
    @State private var routePolyline: String?
    @State private var cameraPosition: CLLocationCoordinate2D

    private let mapsService = GoogleMapsService.shared

    init(order: Order, viewModel: DeliveryViewModel) {
        self.order = order
        self.viewModel = viewModel
        // Initialize camera position to center between restaurant and customer
        let centerLat = (order.restaurant.latitude + order.deliveryAddress.latitude) / 2
        let centerLon = (order.restaurant.longitude + order.deliveryAddress.longitude) / 2
        _cameraPosition = State(initialValue: CLLocationCoordinate2D(latitude: centerLat, longitude: centerLon))
    }

    var body: some View {
        let hasRestaurantLocation = order.restaurant.latitude != 0 && order.restaurant.longitude != 0
        let hasCustomerLocation = order.deliveryAddress.latitude != 0 && order.deliveryAddress.longitude != 0

        VStack {
            // Map
            if hasRestaurantLocation && hasCustomerLocation {
                let restaurantLocation = CLLocationCoordinate2D(
                    latitude: order.restaurant.latitude,
                    longitude: order.restaurant.longitude
                )
                let customerLocation = CLLocationCoordinate2D(
                    latitude: order.deliveryAddress.latitude,
                    longitude: order.deliveryAddress.longitude
                )

                // Google Maps View
                GoogleMapView(
                    cameraPosition: $cameraPosition,
                    zoom: calculateZoom(),
                    markers: [
                        MapMarker(
                            id: "restaurant",
                            coordinate: restaurantLocation,
                            title: order.restaurant.name,
                            subtitle: "Pickup",
                            type: .restaurant
                        ),
                        MapMarker(
                            id: "customer",
                            coordinate: customerLocation,
                            title: order.customerName,
                            subtitle: "Delivery",
                            type: .customer
                        )
                    ],
                    polylinePath: routePolyline,
                    showsUserLocation: true
                )
                .frame(height: 300)
                .overlay(
                    VStack {
                        if !distance.isEmpty {
                            HStack {
                                Text(formattedMapInfo)
                            }
                            .font(.subheadline)
                            .fontWeight(.medium)
                            .padding(8)
                            .background(Color.white.opacity(0.9))
                            .cornerRadius(8)
                            .shadow(color: .black.opacity(0.1), radius: 4, x: 0, y: 2)
                            .padding(.top, 10)
                        }
                        Spacer()
                    }
                )
            } else {
                ZStack {
                    Color.gray.opacity(0.1)
                    VStack(spacing: 10) {
                        Image(systemName: "location.slash")
                            .font(.largeTitle)
                            .foregroundColor(.gray)
                        Text("Map location unavailable")
                            .font(.headline)
                            .foregroundColor(.gray)
                        Text("Coordinates missing for restaurant or customer")
                            .font(.caption)
                            .foregroundColor(.gray)
                    }
                }
                .frame(height: 300)
            }

            // Order Details
            ScrollView {
                VStack(alignment: .leading, spacing: 15) {
                    Text("Pickup from: \(order.restaurant.name)")
                        .font(.headline)
                    Text(order.restaurant.address)
                        .font(.subheadline)
                        .foregroundColor(.gray)

                    Divider()

                    Text("Deliver to: \(order.customerName)")
                        .font(.headline)
                    Text(order.deliveryAddress.fullAddress)
                        .font(.subheadline)
                        .foregroundColor(.gray)

                    if !order.deliveryInstructions.isEmpty {
                        Text("Instructions: \(order.deliveryInstructions)")
                            .font(.caption)
                            .italic()
                    }

                    Divider()

                    HStack {
                        Text("Total Earnings")
                        Spacer()
                        Text("$\(String(format: "%.2f", order.deliveryFee + order.priorityFee))")
                            .fontWeight(.bold)
                    }

                    Button(action: {
                        viewModel.acceptOrder(order)
                    }) {
                        Text("Accept Order")
                            .fontWeight(.bold)
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(Theme.brandGreen)
                            .cornerRadius(10)
                    }
                    .padding(.top, 20)
                }
                .padding()
            }
        }
        .navigationTitle("Order Details")
        .onAppear {
            calculateRoute()
        }
    }

    /// World-class formatted ETA display (like Uber/DoorDash)
    private var formattedMapInfo: String {
        // Parse distance in miles if available
        var distanceMiles: Double = 0.0
        if let miles = Double(distance.replacingOccurrences(of: " mi", with: "").replacingOccurrences(of: "mi", with: "")) {
            distanceMiles = miles
        }

        // Parse ETA in minutes
        var etaMinutes: Int = 0
        if let mins = Int(travelTime.replacingOccurrences(of: " min", with: "").replacingOccurrences(of: "min", with: "")) {
            etaMinutes = mins
        }

        // Use DateTimeFormatter for world-class display
        if distanceMiles > 0 && etaMinutes > 0 {
            return DateTimeFormatter.shared.mapAnnotationTime(etaMinutes: etaMinutes, distanceMiles: distanceMiles)
        } else if etaMinutes > 0 {
            return DateTimeFormatter.shared.formatDuration(minutes: etaMinutes)
        }

        // Fallback
        return "\(distance) • \(travelTime)"
    }

    private func calculateZoom() -> Float {
        // Calculate appropriate zoom based on distance between points
        let latDiff = abs(order.restaurant.latitude - order.deliveryAddress.latitude)
        let lonDiff = abs(order.restaurant.longitude - order.deliveryAddress.longitude)
        let maxDiff = max(latDiff, lonDiff)

        if maxDiff < 0.01 { return 15 }
        if maxDiff < 0.05 { return 13 }
        if maxDiff < 0.1 { return 12 }
        return 11
    }

    func calculateRoute() {
        guard order.restaurant.latitude != 0, order.restaurant.longitude != 0,
              order.deliveryAddress.latitude != 0, order.deliveryAddress.longitude != 0 else {
            return
        }

        let origin = CLLocationCoordinate2D(
            latitude: order.restaurant.latitude,
            longitude: order.restaurant.longitude
        )
        let destination = CLLocationCoordinate2D(
            latitude: order.deliveryAddress.latitude,
            longitude: order.deliveryAddress.longitude
        )

        mapsService.getDirections(origin: origin, destination: destination) { result in
            switch result {
            case .success(let directions):
                self.distance = directions.distanceText
                self.travelTime = directions.durationText
                self.routePolyline = directions.polyline
            case .failure(let error):
                #if DEBUG
                print("[OrderMapDetailView] Failed to get directions: \(error)")
                #endif
                // Fallback: calculate straight-line distance
                self.calculateStraightLineDistance()
            }
        }
    }

    private func calculateStraightLineDistance() {
        let restaurantLocation = CLLocation(
            latitude: order.restaurant.latitude,
            longitude: order.restaurant.longitude
        )
        let customerLocation = CLLocation(
            latitude: order.deliveryAddress.latitude,
            longitude: order.deliveryAddress.longitude
        )

        let distanceMeters = restaurantLocation.distance(from: customerLocation)
        let distanceMiles = distanceMeters / 1609.34

        self.distance = String(format: "%.1f mi", distanceMiles)
        // Estimate 2 min per mile
        self.travelTime = String(format: "%.0f min", distanceMiles * 2)
    }
}
