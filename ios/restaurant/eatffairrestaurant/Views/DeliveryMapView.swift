import SwiftUI
import MapKit
import EatFairShared

struct DeliveryMapView: View {
    @State private var position: MapCameraPosition = .userLocation(fallback: .automatic)
    
    var body: some View {
        NavigationView {
            Map(position: $position) {
                UserAnnotation()
            }
            .edgesIgnoringSafeArea(.all)
            .navigationTitle("Delivery Map")
            .navigationBarTitleDisplayMode(.inline)
            .mapControls {
                MapUserLocationButton()
                MapCompass()
            }
        }
    }
}
