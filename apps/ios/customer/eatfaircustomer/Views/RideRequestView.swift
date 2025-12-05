import SwiftUI
import MapKit
import EatFairShared

/// Uber-style Ride Request View for Customers
struct RideRequestView: View {
    @StateObject private var viewModel = RideRequestViewModel()
    @StateObject private var locationManager = RideLocationManager()
    @EnvironmentObject var authViewModel: AuthViewModel
    @Environment(\.dismiss) var dismiss

    @State private var showPickupSearch = false
    @State private var showDropoffSearch = false
    @State private var mapPosition: MapCameraPosition = .userLocation(fallback: .automatic)

    var body: some View {
        ZStack {
            // Map Background
            RideMapBackground(
                pickupLocation: viewModel.pickupAddress,
                dropoffLocation: viewModel.dropoffAddress,
                mapPosition: $mapPosition
            )
            .ignoresSafeArea(edges: .top)
            .onAppear {
                // Request location permission on appear
                locationManager.requestLocationPermission()
            }

            // Bottom Sheet
            VStack {
                Spacer()

                RideBottomSheet(
                    viewModel: viewModel,
                    showPickupSearch: $showPickupSearch,
                    showDropoffSearch: $showDropoffSearch,
                    onRequestRide: requestRide,
                    onDismiss: { dismiss() }
                )
            }

            // Loading Overlay
            if viewModel.isLoading {
                Color.black.opacity(0.3)
                    .ignoresSafeArea()
                ProgressView("Requesting ride...")
                    .padding()
                    .background(Color.white)
                    .cornerRadius(12)
            }
        }
        .navigationBarHidden(true)
        .sheet(isPresented: $showPickupSearch) {
            RideLocationSearchView(
                title: "Pickup Location",
                onSelect: { address in
                    viewModel.setPickupLocation(
                        street: address.street,
                        city: address.city,
                        state: address.state,
                        zip: address.zip,
                        lat: address.lat,
                        lng: address.lng
                    )
                    showPickupSearch = false
                }
            )
        }
        .sheet(isPresented: $showDropoffSearch) {
            RideLocationSearchView(
                title: "Dropoff Location",
                onSelect: { address in
                    viewModel.setDropoffLocation(
                        street: address.street,
                        city: address.city,
                        state: address.state,
                        zip: address.zip,
                        lat: address.lat,
                        lng: address.lng
                    )
                    showDropoffSearch = false
                }
            )
        }
        .alert("Error", isPresented: $viewModel.showError) {
            Button("OK", role: .cancel) { }
        } message: {
            Text(viewModel.errorMessage ?? "An error occurred")
        }
        .fullScreenCover(isPresented: $viewModel.isRideActive) {
            RideTrackingView(viewModel: viewModel)
        }
    }

    private func requestRide() {
        let name = authViewModel.customerName.isEmpty ? "Customer" : authViewModel.customerName
        let email = authViewModel.customerEmail

        viewModel.requestRide(
            customerName: name,
            customerEmail: email,
            customerPhone: ""
        )
    }
}

// MARK: - Ride Map Background
struct RideMapBackground: View {
    let pickupLocation: RideAddressInput?
    let dropoffLocation: RideAddressInput?
    @Binding var mapPosition: MapCameraPosition

    var body: some View {
        Map(position: $mapPosition) {
            // Pickup Marker
            if let pickup = pickupLocation {
                Annotation("Pickup", coordinate: CLLocationCoordinate2D(
                    latitude: pickup.lat,
                    longitude: pickup.lng
                )) {
                    RidePickupMarker()
                }
            }

            // Dropoff Marker
            if let dropoff = dropoffLocation {
                Annotation("Dropoff", coordinate: CLLocationCoordinate2D(
                    latitude: dropoff.lat,
                    longitude: dropoff.lng
                )) {
                    RideDropoffMarker()
                }
            }

            // User location
            UserAnnotation()
        }
        .mapStyle(.standard(pointsOfInterest: .excludingAll))
        .mapControls {
            MapUserLocationButton()
        }
        .onAppear {
            updateMapRegion()
        }
        .onChange(of: pickupLocation?.lat) { _, _ in updateMapRegion() }
        .onChange(of: dropoffLocation?.lat) { _, _ in updateMapRegion() }
    }

    private func updateMapRegion() {
        var coordinates: [CLLocationCoordinate2D] = []

        if let pickup = pickupLocation {
            coordinates.append(CLLocationCoordinate2D(latitude: pickup.lat, longitude: pickup.lng))
        }

        if let dropoff = dropoffLocation {
            coordinates.append(CLLocationCoordinate2D(latitude: dropoff.lat, longitude: dropoff.lng))
        }

        guard !coordinates.isEmpty else {
            // Default to user's location or a default region
            mapPosition = .userLocation(fallback: .automatic)
            return
        }

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
struct RidePickupMarker: View {
    var body: some View {
        VStack(spacing: 0) {
            ZStack {
                Circle()
                    .fill(Color.blue)
                    .frame(width: 44, height: 44)
                    .shadow(color: .black.opacity(0.3), radius: 4, x: 0, y: 2)

                Image(systemName: "figure.wave")
                    .font(.system(size: 20))
                    .foregroundColor(.white)
            }

            Image(systemName: "triangle.fill")
                .font(.system(size: 10))
                .foregroundColor(.blue)
                .rotationEffect(.degrees(180))
                .offset(y: -4)
        }
    }
}

struct RideDropoffMarker: View {
    var body: some View {
        VStack(spacing: 0) {
            ZStack {
                Circle()
                    .fill(Color.green)
                    .frame(width: 44, height: 44)
                    .shadow(color: .black.opacity(0.3), radius: 4, x: 0, y: 2)

                Image(systemName: "flag.checkered")
                    .font(.system(size: 20))
                    .foregroundColor(.white)
            }

            Image(systemName: "triangle.fill")
                .font(.system(size: 10))
                .foregroundColor(.green)
                .rotationEffect(.degrees(180))
                .offset(y: -4)
        }
    }
}

// MARK: - Ride Bottom Sheet
struct RideBottomSheet: View {
    @ObservedObject var viewModel: RideRequestViewModel
    @Binding var showPickupSearch: Bool
    @Binding var showDropoffSearch: Bool
    let onRequestRide: () -> Void
    let onDismiss: () -> Void

    var body: some View {
        VStack(spacing: 0) {
            // Handle
            RoundedRectangle(cornerRadius: 3)
                .fill(Color.gray.opacity(0.3))
                .frame(width: 40, height: 5)
                .padding(.top, 10)

            // Header
            HStack {
                Button(action: onDismiss) {
                    Image(systemName: "xmark")
                        .font(.title3)
                        .foregroundColor(.gray)
                }

                Spacer()

                Text("Request a Ride")
                    .font(.headline)

                Spacer()

                // Placeholder for balance
                Image(systemName: "xmark")
                    .font(.title3)
                    .foregroundColor(.clear)
            }
            .padding()

            Divider()

            // Location Inputs
            VStack(spacing: 0) {
                // Pickup
                Button(action: { showPickupSearch = true }) {
                    HStack(spacing: 12) {
                        ZStack {
                            Circle()
                                .fill(Color.blue.opacity(0.15))
                                .frame(width: 36, height: 36)
                            Circle()
                                .fill(Color.blue)
                                .frame(width: 12, height: 12)
                        }

                        VStack(alignment: .leading, spacing: 2) {
                            Text("PICKUP")
                                .font(.caption2)
                                .fontWeight(.semibold)
                                .foregroundColor(.blue)

                            Text(viewModel.pickupAddress?.fullAddress ?? "Select pickup location")
                                .font(.subheadline)
                                .foregroundColor(viewModel.pickupAddress != nil ? .primary : .gray)
                                .lineLimit(1)
                        }

                        Spacer()

                        Image(systemName: "chevron.right")
                            .foregroundColor(.gray)
                            .font(.caption)
                    }
                    .padding()
                }

                // Connector
                HStack {
                    Rectangle()
                        .fill(Color.gray.opacity(0.3))
                        .frame(width: 2, height: 24)
                        .padding(.leading, 29)
                    Spacer()
                }

                // Dropoff
                Button(action: { showDropoffSearch = true }) {
                    HStack(spacing: 12) {
                        ZStack {
                            Circle()
                                .fill(Color.green.opacity(0.15))
                                .frame(width: 36, height: 36)
                            Image(systemName: "mappin")
                                .foregroundColor(.green)
                                .font(.system(size: 14, weight: .bold))
                        }

                        VStack(alignment: .leading, spacing: 2) {
                            Text("DROPOFF")
                                .font(.caption2)
                                .fontWeight(.semibold)
                                .foregroundColor(.green)

                            Text(viewModel.dropoffAddress?.fullAddress ?? "Select dropoff location")
                                .font(.subheadline)
                                .foregroundColor(viewModel.dropoffAddress != nil ? .primary : .gray)
                                .lineLimit(1)
                        }

                        Spacer()

                        Image(systemName: "chevron.right")
                            .foregroundColor(.gray)
                            .font(.caption)
                    }
                    .padding()
                }
            }

            Divider()

            // Notes (optional)
            if viewModel.canRequestRide {
                HStack(spacing: 12) {
                    Image(systemName: "note.text")
                        .foregroundColor(.gray)

                    TextField("Add notes for driver (optional)", text: $viewModel.notes)
                        .font(.subheadline)
                }
                .padding()

                Divider()
            }

            // Price Summary - World Class Fare Breakdown
            if viewModel.canRequestRide {
                VStack(spacing: 12) {
                    // Trip Estimate Header
                    HStack {
                        VStack(alignment: .leading, spacing: 2) {
                            Text("TRIP ESTIMATE")
                                .font(.caption2)
                                .fontWeight(.semibold)
                                .foregroundColor(.secondary)
                            HStack(spacing: 12) {
                                Label(viewModel.estimatedDistanceText, systemImage: "road.lanes")
                                Label(viewModel.estimatedTimeText, systemImage: "clock")
                            }
                            .font(.subheadline)
                            .foregroundColor(.primary)
                        }
                        Spacer()
                        if viewModel.surgeMultiplier > 1.0 {
                            Text("\(String(format: "%.1f", viewModel.surgeMultiplier))x")
                                .font(.caption)
                                .fontWeight(.bold)
                                .foregroundColor(.white)
                                .padding(.horizontal, 8)
                                .padding(.vertical, 4)
                                .background(Color.orange)
                                .cornerRadius(6)
                        }
                    }
                    .padding(.vertical, 4)

                    Divider()

                    // Fare Breakdown
                    VStack(spacing: 6) {
                        FareLineItem(label: "Base Fare", amount: viewModel.baseFare)
                        FareLineItem(label: "Distance (\(viewModel.estimatedDistanceText))", amount: viewModel.distanceFee)
                        FareLineItem(label: "Time (\(viewModel.estimatedTimeText))", amount: viewModel.timeFee)
                        FareLineItem(label: "Platform Fee", amount: viewModel.platformFee)
                        if viewModel.taxAmount > 0 {
                            FareLineItem(
                                label: "Tax (\(String(format: "%.2f", viewModel.taxRate * 100))%)",
                                amount: viewModel.taxAmount
                            )
                        }
                    }

                    Divider()

                    // Tip options
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Add Tip for Driver")
                            .font(.subheadline)
                            .foregroundColor(.secondary)

                        HStack(spacing: 8) {
                            ForEach([0.0, 2.0, 5.0, 10.0], id: \.self) { amount in
                                Button(action: { viewModel.tip = amount }) {
                                    Text(amount == 0 ? "None" : "$\(Int(amount))")
                                        .font(.subheadline)
                                        .fontWeight(.medium)
                                        .frame(maxWidth: .infinity)
                                        .padding(.vertical, 10)
                                        .background(viewModel.tip == amount ? Color.blue : Color.gray.opacity(0.1))
                                        .foregroundColor(viewModel.tip == amount ? .white : .primary)
                                        .cornerRadius(10)
                                }
                            }
                        }
                    }

                    Divider()

                    // Total & Driver Earnings
                    VStack(spacing: 8) {
                        HStack {
                            Text("Total")
                                .font(.headline)
                            Spacer()
                            Text("$\(String(format: "%.2f", viewModel.totalAmount))")
                                .font(.title2)
                                .fontWeight(.bold)
                                .foregroundColor(.blue)
                        }

                        // Driver earnings info (transparency!)
                        HStack {
                            Image(systemName: "person.fill.checkmark")
                                .foregroundColor(.green)
                            Text("Driver earns: $\(String(format: "%.2f", viewModel.driverEarnings))")
                                .font(.caption)
                                .foregroundColor(.green)
                            Text("(90%+ of fare)")
                                .font(.caption2)
                                .foregroundColor(.secondary)
                        }
                    }
                }
                .padding()
            }

            // Request Button
            Button(action: onRequestRide) {
                HStack {
                    Image(systemName: "car.fill")
                    Text("Request Ride")
                }
                .font(.headline)
                .foregroundColor(.white)
                .frame(maxWidth: .infinity)
                .padding()
                .background(viewModel.canRequestRide ? Color.blue : Color.gray)
                .cornerRadius(12)
            }
            .disabled(!viewModel.canRequestRide)
            .padding()
        }
        .background(
            RoundedRectangle(cornerRadius: 20)
                .fill(Color.white)
                .shadow(color: .black.opacity(0.1), radius: 10, x: 0, y: -5)
        )
    }
}

// MARK: - Location Search View
struct RideLocationSearchView: View {
    let title: String
    let onSelect: (RideAddressInput) -> Void
    @Environment(\.dismiss) var dismiss

    @State private var searchText = ""
    @State private var searchResults: [SearchResult] = []
    @State private var isSearching = false
    @State private var isGettingLocation = false
    @StateObject private var locationManager = RideLocationManager()

    struct SearchResult: Identifiable {
        let id = UUID()
        let name: String
        let address: String
        let lat: Double
        let lng: Double
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Search Bar
                HStack(spacing: 12) {
                    Image(systemName: "magnifyingglass")
                        .foregroundColor(.gray)

                    TextField("Search address...", text: $searchText)
                        .textFieldStyle(.plain)
                        .autocorrectionDisabled()

                    if !searchText.isEmpty {
                        Button(action: { searchText = "" }) {
                            Image(systemName: "xmark.circle.fill")
                                .foregroundColor(.gray)
                        }
                    }
                }
                .padding()
                .background(Color(.systemGray6))
                .cornerRadius(12)
                .padding()
                .onChange(of: searchText) { _, newValue in
                    searchAddress(newValue)
                }

                // Current Location Option
                Button(action: useCurrentLocation) {
                    HStack(spacing: 12) {
                        ZStack {
                            Circle()
                                .fill(Color.blue.opacity(0.1))
                                .frame(width: 44, height: 44)
                            if isGettingLocation {
                                ProgressView()
                                    .scaleEffect(0.8)
                            } else {
                                Image(systemName: "location.fill")
                                    .foregroundColor(.blue)
                            }
                        }

                        VStack(alignment: .leading) {
                            Text("Use Current Location")
                                .font(.subheadline)
                                .fontWeight(.medium)
                            Text(isGettingLocation ? "Getting your location..." : "Based on your GPS")
                                .font(.caption)
                                .foregroundColor(.gray)
                        }

                        Spacer()

                        Image(systemName: "chevron.right")
                            .foregroundColor(.gray)
                            .font(.caption)
                    }
                    .padding()
                }
                .disabled(isGettingLocation)

                Divider()
                    .padding(.horizontal)

                // Search Results
                if isSearching {
                    ProgressView()
                        .padding()
                } else {
                    ScrollView {
                        LazyVStack(spacing: 0) {
                            ForEach(searchResults) { result in
                                Button(action: {
                                    selectResult(result)
                                }) {
                                    HStack(spacing: 12) {
                                        Image(systemName: "mappin.circle.fill")
                                            .font(.title2)
                                            .foregroundColor(.gray)

                                        VStack(alignment: .leading, spacing: 2) {
                                            Text(result.name)
                                                .font(.subheadline)
                                                .fontWeight(.medium)
                                                .foregroundColor(.primary)
                                            Text(result.address)
                                                .font(.caption)
                                                .foregroundColor(.gray)
                                                .lineLimit(1)
                                        }

                                        Spacer()
                                    }
                                    .padding()
                                }

                                Divider()
                                    .padding(.leading, 56)
                            }
                        }
                    }
                }

                Spacer()
            }
            .navigationTitle(title)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") { dismiss() }
                }
            }
        }
    }

    private func searchAddress(_ query: String) {
        guard query.count > 2 else {
            searchResults = []
            return
        }

        isSearching = true

        // Use MKLocalSearch for address lookup
        let request = MKLocalSearch.Request()
        request.naturalLanguageQuery = query
        request.resultTypes = .address

        let search = MKLocalSearch(request: request)
        search.start { response, error in
            DispatchQueue.main.async {
                isSearching = false

                guard let response = response else { return }

                searchResults = response.mapItems.prefix(10).map { item in
                    SearchResult(
                        name: item.name ?? "Unknown",
                        address: item.placemark.formattedAddress,
                        lat: item.placemark.coordinate.latitude,
                        lng: item.placemark.coordinate.longitude
                    )
                }
            }
        }
    }

    private func selectResult(_ result: SearchResult) {
        let components = result.address.components(separatedBy: ", ")
        let street = components.first ?? result.address
        let city = components.count > 1 ? components[1] : ""
        let stateZip = components.count > 2 ? components[2] : ""
        let stateParts = stateZip.components(separatedBy: " ")
        let state = stateParts.first ?? ""
        let zip = stateParts.count > 1 ? stateParts[1] : ""

        let address = RideAddressInput(
            street: street,
            city: city,
            state: state,
            zip: zip,
            lat: result.lat,
            lng: result.lng
        )

        onSelect(address)
    }

    private func useCurrentLocation() {
        isGettingLocation = true

        // Request location permission if needed
        locationManager.requestLocationPermission()

        // Get current location
        locationManager.getCurrentLocation { location in
            guard let location = location else {
                isGettingLocation = false
                return
            }

            // Reverse geocode to get address
            let geocoder = CLGeocoder()
            geocoder.reverseGeocodeLocation(location) { placemarks, error in
                isGettingLocation = false

                guard let placemark = placemarks?.first else {
                    // Use coordinates even without address
                    let address = RideAddressInput(
                        street: "Current Location",
                        city: "Unknown",
                        state: "CA",
                        zip: "",
                        lat: location.coordinate.latitude,
                        lng: location.coordinate.longitude
                    )
                    onSelect(address)
                    return
                }

                let address = RideAddressInput(
                    street: placemark.thoroughfare ?? placemark.name ?? "Current Location",
                    city: placemark.locality ?? "",
                    state: placemark.administrativeArea ?? "",
                    zip: placemark.postalCode ?? "",
                    lat: location.coordinate.latitude,
                    lng: location.coordinate.longitude
                )
                onSelect(address)
            }
        }
    }
}

// MARK: - Location Manager for Ride Request
class RideLocationManager: NSObject, ObservableObject, CLLocationManagerDelegate {
    private let locationManager = CLLocationManager()
    private var locationCompletion: ((CLLocation?) -> Void)?

    @Published var authorizationStatus: CLAuthorizationStatus = .notDetermined
    @Published var currentLocation: CLLocation?

    override init() {
        super.init()
        locationManager.delegate = self
        locationManager.desiredAccuracy = kCLLocationAccuracyBest
        authorizationStatus = locationManager.authorizationStatus
    }

    func requestLocationPermission() {
        if authorizationStatus == .notDetermined {
            locationManager.requestWhenInUseAuthorization()
        }
    }

    func getCurrentLocation(completion: @escaping (CLLocation?) -> Void) {
        locationCompletion = completion

        switch authorizationStatus {
        case .authorizedWhenInUse, .authorizedAlways:
            locationManager.requestLocation()
        case .notDetermined:
            locationManager.requestWhenInUseAuthorization()
        default:
            completion(nil)
        }
    }

    func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        if let location = locations.last {
            currentLocation = location
            locationCompletion?(location)
            locationCompletion = nil
        }
    }

    func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        print("Location error: \(error.localizedDescription)")
        locationCompletion?(nil)
        locationCompletion = nil
    }

    func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        authorizationStatus = manager.authorizationStatus

        // If just authorized, try to get location
        if authorizationStatus == .authorizedWhenInUse || authorizationStatus == .authorizedAlways {
            if locationCompletion != nil {
                locationManager.requestLocation()
            }
        }
    }
}

// MARK: - Fare Line Item
struct FareLineItem: View {
    let label: String
    let amount: Double

    var body: some View {
        HStack {
            Text(label)
                .font(.subheadline)
                .foregroundColor(.secondary)
            Spacer()
            Text("$\(String(format: "%.2f", amount))")
                .font(.subheadline)
                .foregroundColor(.primary)
        }
    }
}

// MARK: - MKPlacemark Extension
extension MKPlacemark {
    var formattedAddress: String {
        let components = [
            thoroughfare,
            locality,
            administrativeArea,
            postalCode
        ].compactMap { $0 }
        return components.joined(separator: ", ")
    }
}

// MARK: - Ride Tracking View
struct RideTrackingView: View {
    @ObservedObject var viewModel: RideRequestViewModel
    @State private var mapPosition: MapCameraPosition = .automatic

    var body: some View {
        ZStack {
            // Map
            Map(position: $mapPosition) {
                // Pickup
                if let pickup = viewModel.pickupAddress {
                    Annotation("Pickup", coordinate: CLLocationCoordinate2D(
                        latitude: pickup.lat,
                        longitude: pickup.lng
                    )) {
                        RidePickupMarker()
                    }
                }

                // Dropoff
                if let dropoff = viewModel.dropoffAddress {
                    Annotation("Dropoff", coordinate: CLLocationCoordinate2D(
                        latitude: dropoff.lat,
                        longitude: dropoff.lng
                    )) {
                        RideDropoffMarker()
                    }
                }

                // Driver location
                if let tracking = viewModel.rideTracking,
                   let lat = tracking.driverLatitude,
                   let lng = tracking.driverLongitude {
                    Annotation("Driver", coordinate: CLLocationCoordinate2D(
                        latitude: lat,
                        longitude: lng
                    )) {
                        ZStack {
                            Circle()
                                .fill(Color.black)
                                .frame(width: 40, height: 40)
                            Image(systemName: "car.fill")
                                .foregroundColor(.white)
                        }
                    }
                }

                UserAnnotation()
            }
            .ignoresSafeArea(edges: .top)

            // Bottom Info Card
            VStack {
                Spacer()

                RideStatusCard(viewModel: viewModel)
            }
        }
    }
}

// MARK: - Ride Status Card
struct RideStatusCard: View {
    @ObservedObject var viewModel: RideRequestViewModel

    var statusText: String {
        switch viewModel.currentStep {
        case .waitingForDriver:
            return "Looking for a driver..."
        case .driverEnRoute:
            return "Driver is on the way!"
        case .rideInProgress:
            return "Enjoy your ride!"
        case .completed:
            return "Ride completed!"
        default:
            return "Processing..."
        }
    }

    var statusIcon: String {
        switch viewModel.currentStep {
        case .waitingForDriver:
            return "magnifyingglass"
        case .driverEnRoute:
            return "car.fill"
        case .rideInProgress:
            return "arrow.right"
        case .completed:
            return "checkmark.circle.fill"
        default:
            return "clock"
        }
    }

    var body: some View {
        VStack(spacing: 16) {
            // Handle
            RoundedRectangle(cornerRadius: 3)
                .fill(Color.gray.opacity(0.3))
                .frame(width: 40, height: 5)
                .padding(.top, 10)

            // Status
            HStack(spacing: 12) {
                ZStack {
                    Circle()
                        .fill(Color.blue.opacity(0.1))
                        .frame(width: 50, height: 50)

                    if viewModel.currentStep == .waitingForDriver {
                        ProgressView()
                    } else {
                        Image(systemName: statusIcon)
                            .font(.title2)
                            .foregroundColor(.blue)
                    }
                }

                VStack(alignment: .leading, spacing: 4) {
                    Text(statusText)
                        .font(.headline)

                    if let ride = viewModel.activeRide {
                        Text("Ride #\(ride.rideNumber)")
                            .font(.caption)
                            .foregroundColor(.gray)
                    }
                }

                Spacer()
            }
            .padding(.horizontal)

            // Driver Info (when assigned)
            if let tracking = viewModel.rideTracking,
               let driverName = tracking.driverName {
                Divider()

                HStack(spacing: 12) {
                    ZStack {
                        Circle()
                            .fill(Color.gray.opacity(0.2))
                            .frame(width: 50, height: 50)
                        Image(systemName: "person.fill")
                            .foregroundColor(.gray)
                    }

                    VStack(alignment: .leading) {
                        Text(driverName)
                            .font(.headline)
                        Text("Your driver")
                            .font(.caption)
                            .foregroundColor(.gray)
                    }

                    Spacer()

                    if let phone = tracking.driverPhone {
                        Button(action: { callDriver(phone) }) {
                            Image(systemName: "phone.fill")
                                .font(.title3)
                                .foregroundColor(.white)
                                .frame(width: 44, height: 44)
                                .background(Color.green)
                                .clipShape(Circle())
                        }
                    }
                }
                .padding(.horizontal)
            }

            // Complete Button (when ride is done)
            if viewModel.currentStep == .completed {
                Button(action: { viewModel.resetRide() }) {
                    Text("Done")
                        .font(.headline)
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color.green)
                        .cornerRadius(12)
                }
                .padding(.horizontal)
            }

            Spacer().frame(height: 20)
        }
        .background(
            RoundedRectangle(cornerRadius: 20)
                .fill(Color.white)
                .shadow(color: .black.opacity(0.1), radius: 10, x: 0, y: -5)
        )
    }

    private func callDriver(_ phone: String) {
        let cleanPhone = phone.replacingOccurrences(of: " ", with: "")
            .replacingOccurrences(of: "-", with: "")
        if let url = URL(string: "tel://\(cleanPhone)") {
            UIApplication.shared.open(url)
        }
    }
}

// MARK: - Preview
#Preview {
    RideRequestView()
        .environmentObject(AuthViewModel())
}
