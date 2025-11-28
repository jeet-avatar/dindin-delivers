import SwiftUI
import MapKit
import EatFairShared

struct OrderMapDetailView: View {
    let order: Order
    @ObservedObject var viewModel: DeliveryViewModel
    @State private var route: MKRoute?
    @State private var distance: String = ""
    @State private var travelTime: String = ""
    @State private var position: MapCameraPosition = .region(MKCoordinateRegion(
        center: CLLocationCoordinate2D(latitude: 37.7749, longitude: -122.4194),
        span: MKCoordinateSpan(latitudeDelta: 0.1, longitudeDelta: 0.1)
    ))
    
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
                
                Map(position: $position) {
                    Annotation("Restaurant", coordinate: restaurantLocation) {
                        Image(systemName: "house.fill")
                            .foregroundColor(.orange)
                            .padding(5)
                            .background(Circle().fill(.white))
                            .shadow(radius: 3)
                    }
                    
                    Annotation("Customer", coordinate: customerLocation) {
                        Image(systemName: "person.fill")
                            .foregroundColor(.green)
                            .padding(5)
                            .background(Circle().fill(.white))
                            .shadow(radius: 3)
                    }
                    
                    if let route = route {
                        MapPolyline(route)
                            .stroke(.blue, lineWidth: 5)
                    }
                }
                .frame(height: 300)
                .overlay(
                    VStack {
                        if !distance.isEmpty {
                            HStack {
                                Text("Distance: \(distance)")
                                Text("•")
                                Text("Time: \(travelTime)")
                            }
                            .padding(8)
                            .background(Color.white.opacity(0.9))
                            .cornerRadius(8)
                            .padding(.top, 10)
                        }
                        Spacer()
                    }
                )
                .onAppear {
                    // Center map between points
                    let centerLat = (restaurantLocation.latitude + customerLocation.latitude) / 2
                    let centerLon = (restaurantLocation.longitude + customerLocation.longitude) / 2
                    let spanLat = abs(restaurantLocation.latitude - customerLocation.latitude) * 1.5
                    let spanLon = abs(restaurantLocation.longitude - customerLocation.longitude) * 1.5
                    
                    position = .region(MKCoordinateRegion(
                        center: CLLocationCoordinate2D(latitude: centerLat, longitude: centerLon),
                        span: MKCoordinateSpan(latitudeDelta: max(spanLat, 0.01), longitudeDelta: max(spanLon, 0.01))
                    ))
                }
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
                        Text("$\(String(format: "%.2f", order.deliveryFee + order.priorityFee))") // Mock earnings logic
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
    
    func calculateRoute() {
        guard order.restaurant.latitude != 0, order.restaurant.longitude != 0,
              order.deliveryAddress.latitude != 0, order.deliveryAddress.longitude != 0 else {
            return
        }
        
        let restaurantLocation = CLLocationCoordinate2D(
            latitude: order.restaurant.latitude,
            longitude: order.restaurant.longitude
        )
        let customerLocation = CLLocationCoordinate2D(
            latitude: order.deliveryAddress.latitude,
            longitude: order.deliveryAddress.longitude
        )
        
        let request = MKDirections.Request()
        request.source = MKMapItem(placemark: MKPlacemark(coordinate: restaurantLocation))
        request.destination = MKMapItem(placemark: MKPlacemark(coordinate: customerLocation))
        request.transportType = .automobile
        
        let directions = MKDirections(request: request)
        directions.calculate { response, error in
            guard let route = response?.routes.first else { return }
            self.route = route
            self.distance = String(format: "%.1f mi", route.distance / 1609.34)
            self.travelTime = String(format: "%.0f min", route.expectedTravelTime / 60)
        }
    }
}
