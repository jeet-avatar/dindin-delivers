import SwiftUI
import CoreLocation

#if canImport(GoogleMaps)
import GoogleMaps

/// SwiftUI wrapper for Google Maps
/// Provides a native Google Maps experience with markers, routes, and real-time tracking
public struct GoogleMapView: UIViewRepresentable {
    @Binding var cameraPosition: CLLocationCoordinate2D
    var zoom: Float
    var markers: [MapMarker]
    var polylinePath: String?  // Encoded polyline from Directions API
    var showsUserLocation: Bool
    var onMarkerTap: ((MapMarker) -> Void)?

    public init(
        cameraPosition: Binding<CLLocationCoordinate2D>,
        zoom: Float = 14,
        markers: [MapMarker] = [],
        polylinePath: String? = nil,
        showsUserLocation: Bool = true,
        onMarkerTap: ((MapMarker) -> Void)? = nil
    ) {
        self._cameraPosition = cameraPosition
        self.zoom = zoom
        self.markers = markers
        self.polylinePath = polylinePath
        self.showsUserLocation = showsUserLocation
        self.onMarkerTap = onMarkerTap
    }

    public func makeUIView(context: Context) -> GMSMapView {
        let camera = GMSCameraPosition.camera(
            withLatitude: cameraPosition.latitude,
            longitude: cameraPosition.longitude,
            zoom: zoom
        )
        let mapView = GMSMapView(frame: .zero, camera: camera)
        mapView.isMyLocationEnabled = showsUserLocation
        mapView.settings.myLocationButton = showsUserLocation
        mapView.settings.compassButton = true
        mapView.settings.zoomGestures = true
        mapView.settings.scrollGestures = true
        mapView.delegate = context.coordinator

        return mapView
    }

    public func updateUIView(_ mapView: GMSMapView, context: Context) {
        // Update camera if position changed significantly
        let currentCenter = mapView.camera.target
        let distance = CLLocation(latitude: currentCenter.latitude, longitude: currentCenter.longitude)
            .distance(from: CLLocation(latitude: cameraPosition.latitude, longitude: cameraPosition.longitude))

        if distance > 100 {  // Only animate if moved more than 100m
            let camera = GMSCameraPosition.camera(
                withLatitude: cameraPosition.latitude,
                longitude: cameraPosition.longitude,
                zoom: zoom
            )
            mapView.animate(to: camera)
        }

        // Clear and re-add markers
        mapView.clear()

        for marker in markers {
            let gmsMarker = GMSMarker(position: marker.coordinate)
            gmsMarker.title = marker.title
            gmsMarker.snippet = marker.subtitle
            gmsMarker.icon = markerImage(for: marker.type)
            gmsMarker.userData = marker
            gmsMarker.map = mapView
        }

        // Draw polyline if provided
        if let polylinePath = polylinePath {
            let path = GMSPath(fromEncodedPath: polylinePath)
            let polyline = GMSPolyline(path: path)
            polyline.strokeWidth = 5
            polyline.strokeColor = UIColor.systemBlue
            polyline.map = mapView
        }
    }

    public func makeCoordinator() -> Coordinator {
        Coordinator(self)
    }

    private func markerImage(for type: MapMarkerType) -> UIImage? {
        switch type {
        case .restaurant:
            return GMSMarker.markerImage(with: .orange)
        case .customer:
            return GMSMarker.markerImage(with: .green)
        case .driver:
            return GMSMarker.markerImage(with: .blue)
        case .pickup:
            return GMSMarker.markerImage(with: .orange)
        case .dropoff:
            return GMSMarker.markerImage(with: .green)
        case .custom(let color):
            return GMSMarker.markerImage(with: color)
        }
    }

    public class Coordinator: NSObject, GMSMapViewDelegate {
        var parent: GoogleMapView

        init(_ parent: GoogleMapView) {
            self.parent = parent
        }

        public func mapView(_ mapView: GMSMapView, didTap marker: GMSMarker) -> Bool {
            if let mapMarker = marker.userData as? MapMarker {
                parent.onMarkerTap?(mapMarker)
            }
            return false  // Return false to show default info window
        }
    }
}

#else

/// Fallback when GoogleMaps is not available
public struct GoogleMapView: View {
    @Binding var cameraPosition: CLLocationCoordinate2D
    var zoom: Float
    var markers: [MapMarker]
    var polylinePath: String?
    var showsUserLocation: Bool
    var onMarkerTap: ((MapMarker) -> Void)?

    public init(
        cameraPosition: Binding<CLLocationCoordinate2D>,
        zoom: Float = 14,
        markers: [MapMarker] = [],
        polylinePath: String? = nil,
        showsUserLocation: Bool = true,
        onMarkerTap: ((MapMarker) -> Void)? = nil
    ) {
        self._cameraPosition = cameraPosition
        self.zoom = zoom
        self.markers = markers
        self.polylinePath = polylinePath
        self.showsUserLocation = showsUserLocation
        self.onMarkerTap = onMarkerTap
    }

    public var body: some View {
        Text("Google Maps SDK not available")
            .foregroundColor(.gray)
    }
}

#endif

// MARK: - Map Marker Model

public struct MapMarker: Identifiable, Equatable {
    public let id: String
    public let coordinate: CLLocationCoordinate2D
    public let title: String
    public let subtitle: String?
    public let type: MapMarkerType

    public init(
        id: String = UUID().uuidString,
        coordinate: CLLocationCoordinate2D,
        title: String,
        subtitle: String? = nil,
        type: MapMarkerType = .custom(.red)
    ) {
        self.id = id
        self.coordinate = coordinate
        self.title = title
        self.subtitle = subtitle
        self.type = type
    }

    public static func == (lhs: MapMarker, rhs: MapMarker) -> Bool {
        lhs.id == rhs.id
    }
}

public enum MapMarkerType: Equatable {
    case restaurant
    case customer
    case driver
    case pickup
    case dropoff
    case custom(UIColor)

    public static func == (lhs: MapMarkerType, rhs: MapMarkerType) -> Bool {
        switch (lhs, rhs) {
        case (.restaurant, .restaurant),
             (.customer, .customer),
             (.driver, .driver),
             (.pickup, .pickup),
             (.dropoff, .dropoff):
            return true
        case (.custom(let c1), .custom(let c2)):
            return c1 == c2
        default:
            return false
        }
    }
}
