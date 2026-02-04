import SwiftUI
import MapKit
import EatFairShared

struct MapView: View {
    @StateObject private var locationManager = LocationManager()
    @State private var position: MapCameraPosition = .userLocation(followsHeading: false, fallback: .automatic)
    
    // Optional: Annotations for Restaurants
    var restaurants: [Restaurant] = []
    
    var body: some View {
        Map(position: $position) {
            UserAnnotation() // Shows user location dot
            
            ForEach(restaurants) { restaurant in
                Annotation(restaurant.name, coordinate: CLLocationCoordinate2D(latitude: restaurant.latitude, longitude: restaurant.longitude)) {
                    Image(systemName: "mappin.circle.fill")
                        .foregroundColor(Theme.brandOrange)
                        .font(.title)
                }
            }
        }
        .edgesIgnoringSafeArea(.all)
        .onAppear {
            locationManager.requestLocation()
        }
        // .onChange(of: locationManager.location) removed as .userLocation handles tracking automatically
    }
}

struct TrackOrderMapView: View {
    @StateObject private var viewModel = OrderTrackingViewModel()
    @State private var position: MapCameraPosition = .automatic
    
    var body: some View {
        ZStack(alignment: .bottom) {
            Map(position: $position) {
                if let order = viewModel.currentOrder {
                    // Restaurant Location
                    Annotation(order.restaurant.name, coordinate: CLLocationCoordinate2D(latitude: order.restaurant.latitude, longitude: order.restaurant.longitude)) {
                        Image(systemName: "house.fill")
                            .foregroundColor(Theme.brandOrange)
                            .padding(5)
                            .background(Circle().fill(.white))
                    }
                    
                    // Delivery Location
                    Annotation("Delivery", coordinate: CLLocationCoordinate2D(latitude: order.deliveryAddress.latitude, longitude: order.deliveryAddress.longitude)) {
                        Image(systemName: "mappin.circle.fill")
                            .foregroundColor(Theme.brandGreen)
                            .font(.title)
                    }
                    
                    // Driver Location (if available)
                    if let driverLoc = viewModel.driverLocation {
                        Annotation("Driver", coordinate: driverLoc) {
                            Image(systemName: "car.circle.fill")
                                .foregroundColor(.blue)
                                .font(.title)
                                .background(Circle().fill(.white))
                        }
                    }
                }
            }
            .edgesIgnoringSafeArea(.all)
            
            // Order Info Card
            if let order = viewModel.currentOrder {
                VStack(alignment: .leading, spacing: 10) {
                    HStack {
                        Text("Status: \(order.status)")
                            .font(.headline)
                            .fontWeight(.bold)
                            .foregroundColor(Theme.brandGreen)
                        Spacer()
                        VStack(alignment: .trailing) {
                            Text("Est. Delivery")
                                .font(.caption)
                                .foregroundColor(.gray)
                            if let estTime = order.estimatedDeliveryTime {
                                Text(Date(timeIntervalSince1970: TimeInterval(estTime) / 1000), style: .time)
                                    .font(.subheadline)
                                    .fontWeight(.bold)
                            } else {
                                Text("Calculated after acceptance")
                                    .font(.caption2)
                                    .foregroundColor(.gray)
                            }
                        }
                    }
                    
                    Divider()
                    
                    // Timing Info
                    HStack {
                        VStack(alignment: .leading) {
                            Text("Placed At")
                                .font(.caption)
                                .foregroundColor(.gray)
                            Text(Date(timeIntervalSince1970: TimeInterval(order.placedAt) / 1000), style: .time)
                                .font(.subheadline)
                        }
                        Spacer()
                    }
                    
                    if !order.deliveryInstructions.isEmpty {
                        Divider()
                        VStack(alignment: .leading, spacing: 4) {
                            Text("Delivery Instructions")
                                .font(.caption)
                                .fontWeight(.bold)
                                .foregroundColor(.gray)
                            Text(order.deliveryInstructions)
                                .font(.body)
                                .italic()
                        }
                    }
                    
                    Divider()
                    
                    if order.status == "out_for_delivery" {
                        // Show Driver Placeholder (Dynamic later)
                        HStack {
                            Image(systemName: "car.fill")
                            .font(.title2)
                            .padding(10)
                            .background(Color.gray.opacity(0.1))
                            .clipShape(Circle())
                            
                                VStack(alignment: .leading) {
                                    Text(order.driverName ?? "Driver Assigned")
                                        .fontWeight(.semibold)
                                    if let phone = order.driverPhone {
                                        Text(phone)
                                            .font(.caption)
                                            .foregroundColor(.gray)
                                    } else {
                                        Text("On the way")
                                            .font(.caption)
                                            .foregroundColor(.gray)
                                    }
                                }
                            Spacer()
                        }
                    } else {
                        // Show Restaurant Info Placeholder
                        HStack {
                            Image(systemName: "house.fill")
                            .font(.title2)
                            .padding(10)
                            .background(Color.gray.opacity(0.1))
                            .clipShape(Circle())
                            
                            VStack(alignment: .leading) {
                                Text(order.restaurant.name)
                                    .fontWeight(.semibold)
                                Text("Preparing your order")
                                    .font(.caption)
                                    .foregroundColor(.gray)
                            }
                            Spacer()
                        }
                    }
                }
                .padding()
                .background(Color.white)
                .cornerRadius(15)
                .shadow(radius: 5)
                .padding()
            } else {
                // Loading or No Order
                VStack {
                    if viewModel.isLoading {
                        ProgressView("Loading Order...")
                    } else {
                        Text("No active orders found.")
                            .padding()
                            .background(Color.white)
                            .cornerRadius(10)
                    }
                }
                .padding()
            }
        }
        .onAppear {
            viewModel.listenToLatestOrder()
        }
        .onChange(of: viewModel.currentOrder?.id) {
            if let order = viewModel.currentOrder {
                // Center map on delivery address when order loads
                let region = MKCoordinateRegion(
                    center: CLLocationCoordinate2D(latitude: order.deliveryAddress.latitude, longitude: order.deliveryAddress.longitude),
                    span: MKCoordinateSpan(latitudeDelta: 0.02, longitudeDelta: 0.02)
                )
                position = .region(region)
            }
        }
    }
}
