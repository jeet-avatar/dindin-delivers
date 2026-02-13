import SwiftUI
import MapKit
import EatFairShared

/// AvailableRideRequestsView - Browse ride requests open for bidding
/// Matches web app RideBidding.tsx "Available Requests" tab
struct AvailableRideRequestsView: View {
    @StateObject private var viewModel = RideBiddingViewModel()
    @ObservedObject private var locationManager = LocationManager.shared
    @State private var selectedRequest: RideRequestForBidding?
    @State private var showBidSheet = false
    @State private var viewMode: ViewMode = .list
    @State private var sortBy: SortOption = .nearest

    enum ViewMode {
        case list
        case map
    }

    enum SortOption: String, CaseIterable {
        case nearest = "Nearest"
        case highestPay = "Highest Pay"
        case soonest = "Soonest"
    }

    var body: some View {
        NavigationView {
            ZStack {
                Theme.backgroundGrey.ignoresSafeArea()

                VStack(spacing: 0) {
                    // Stats Header
                    statsHeader

                    // Sort & View Toggle
                    sortAndViewBar

                    // Content
                    if viewModel.isLoading && viewModel.availableRequests.isEmpty {
                        loadingView
                    } else if viewModel.availableRequests.isEmpty {
                        emptyStateView
                    } else {
                        if viewMode == .list {
                            requestsList
                        } else {
                            requestsMapView
                        }
                    }
                }
            }
            .navigationTitle("Ride Requests")
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(action: {
                        // Manual refresh - loading state controlled by refreshData()
                        viewModel.refreshData()
                    }) {
                        if viewModel.isLoading {
                            ProgressView()
                                .progressViewStyle(CircularProgressViewStyle())
                        } else {
                            Image(systemName: "arrow.clockwise")
                                .foregroundColor(.blue)
                        }
                    }
                    .disabled(viewModel.isLoading)
                    .accessibilityLabel("Refresh ride requests")
                }
            }
            .onAppear {
                viewModel.startRefreshTimer()
                viewModel.fetchAvailableRequests()
                locationManager.requestPermission()
                locationManager.getCurrentLocation()
            }
            .onDisappear {
                // Stop background refresh when leaving view
                viewModel.stopRefreshTimer()
            }
            .sheet(isPresented: $showBidSheet) {
                if let request = selectedRequest {
                    SubmitBidSheet(request: request, viewModel: viewModel) {
                        showBidSheet = false
                    }
                }
            }
            .alert(alertTitle, isPresented: $viewModel.showError) {
                if isBlockingError {
                    Button("View Active Work") {
                        // Navigate to appropriate tab based on error type
                        NotificationCenter.default.post(
                            name: NSNotification.Name("NavigateToActiveWork"),
                            object: nil,
                            userInfo: ["type": hasActiveRide ? "ride" : "delivery"]
                        )
                    }
                    .accessibilityLabel("View your active work")
                    Button("OK", role: .cancel) {}
                        .accessibilityLabel("Dismiss error")
                } else {
                    Button("OK", role: .cancel) {}
                        .accessibilityLabel("Dismiss error")
                }
            } message: {
                Text(viewModel.errorMessage ?? "An error occurred")
            }
            .alert("Success", isPresented: $viewModel.showSuccess) {
                Button("OK", role: .cancel) {}
                    .accessibilityLabel("Dismiss success message")
            } message: {
                Text(viewModel.successMessage ?? "")
            }
        }
    }

    // MARK: - Stats Header

    private var statsHeader: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 12) {
                QuickStatPill(
                    icon: "car.fill",
                    value: "\(viewModel.availableRequests.count)",
                    label: "Available",
                    color: .blue
                )

                if let avgPrice = averagePrice {
                    QuickStatPill(
                        icon: "dollarsign.circle.fill",
                        value: "$\(String(format: "%.0f", avgPrice))",
                        label: "Avg Price",
                        color: .green
                    )
                }

                QuickStatPill(
                    icon: "clock.badge.checkmark.fill",
                    value: "\(viewModel.pendingBids.count)",
                    label: "My Bids",
                    color: .orange
                )

                QuickStatPill(
                    icon: "checkmark.circle.fill",
                    value: "\(viewModel.activeRides.count)",
                    label: "Matched",
                    color: .green
                )
            }
            .padding(.horizontal)
            .padding(.vertical, 12)
        }
        .background(Theme.cardBackground)
    }

    // MARK: - Sort & View Bar

    private var sortAndViewBar: some View {
        HStack {
            // Sort Picker
            Menu {
                ForEach(SortOption.allCases, id: \.self) { option in
                    Button(action: { sortBy = option }) {
                        HStack {
                            Text(option.rawValue)
                            if sortBy == option {
                                Image(systemName: "checkmark")
                            }
                        }
                    }
                    .accessibilityLabel("Sort by \(option.rawValue)")
                }
            } label: {
                HStack(spacing: 4) {
                    Image(systemName: "arrow.up.arrow.down")
                    Text(sortBy.rawValue)
                }
                .font(.subheadline)
                .foregroundColor(.blue)
                .padding(.horizontal, 12)
                .padding(.vertical, 8)
                .background(Color.blue.opacity(0.1))
                .cornerRadius(8)
            }
            .accessibilityLabel("Sort requests by \(sortBy.rawValue)")
            .accessibilityHint("Tap to change sort order")

            Spacer()

            // View Toggle
            HStack(spacing: 4) {
                Button(action: { viewMode = .list }) {
                    Image(systemName: "list.bullet")
                        .font(.subheadline)
                        .foregroundColor(viewMode == .list ? .white : Theme.textGrey)
                        .frame(width: 36, height: 36)
                        .background(viewMode == .list ? Color.blue : Color.clear)
                        .cornerRadius(8)
                }
                .accessibilityLabel("List view")
                .accessibilityHint(viewMode == .list ? "Currently selected" : "Show requests as a list")

                Button(action: { viewMode = .map }) {
                    Image(systemName: "map")
                        .font(.subheadline)
                        .foregroundColor(viewMode == .map ? .white : Theme.textGrey)
                        .frame(width: 36, height: 36)
                        .background(viewMode == .map ? Color.blue : Color.clear)
                        .cornerRadius(8)
                }
                .accessibilityLabel("Map view")
                .accessibilityHint(viewMode == .map ? "Currently selected" : "Show requests on a map")
            }
            .padding(4)
            .background(Theme.lightGrey)
            .cornerRadius(10)
        }
        .padding(.horizontal)
        .padding(.vertical, 12)
        .background(Theme.cardBackground)
    }

    // MARK: - Requests List

    private var requestsList: some View {
        ScrollView {
            LazyVStack(spacing: 16) {
                ForEach(sortedRequests) { request in
                    RideRequestCard(
                        request: request,
                        locationManager: locationManager,
                        onBid: {
                            selectedRequest = request
                            showBidSheet = true
                        }
                    )
                }
            }
            .padding()
        }
        .refreshable {
            viewModel.fetchAvailableRequests()
        }
    }

    // MARK: - Map View

    private var requestsMapView: some View {
        RideRequestsMapView(
            requests: viewModel.availableRequests,
            locationManager: locationManager,
            onRequestSelected: { request in
                selectedRequest = request
                showBidSheet = true
            }
        )
    }

    // MARK: - Loading View

    private var loadingView: some View {
        VStack(spacing: 20) {
            Spacer()
            ProgressView()
                .scaleEffect(1.5)
                .tint(.blue)

            Text("Finding ride requests nearby...")
                .font(.headline)
                .foregroundColor(Theme.textSecondary)
            Spacer()
        }
    }

    // MARK: - Empty State

    private var emptyStateView: some View {
        VStack(spacing: 24) {
            Spacer()

            ZStack {
                Circle()
                    .fill(Color.blue.opacity(0.1))
                    .frame(width: 140, height: 140)

                Circle()
                    .fill(Color.blue.opacity(0.15))
                    .frame(width: 100, height: 100)

                Image(systemName: "car.2.fill")
                    .font(.system(size: 44))
                    .foregroundColor(.blue)
            }

            VStack(spacing: 8) {
                Text("No Ride Requests")
                    .font(.title2)
                    .fontWeight(.bold)
                    .foregroundColor(Theme.textPrimary)

                Text("Ride requests from customers will appear here.\nSubmit competitive bids to get matched!")
                    .font(.subheadline)
                    .foregroundColor(Theme.textSecondary)
                    .multilineTextAlignment(.center)
            }

            Button(action: { viewModel.fetchAvailableRequests() }) {
                HStack {
                    Image(systemName: "arrow.clockwise")
                    Text("Refresh")
                }
                .font(.headline)
                .foregroundColor(.white)
                .padding(.horizontal, 32)
                .padding(.vertical, 14)
                .background(Color.blue)
                .cornerRadius(12)
            }
            .accessibilityLabel("Refresh ride requests")
            .accessibilityHint("Check for new available ride requests")

            Spacer()
        }
        .padding()
    }

    // MARK: - Computed Properties

    private var sortedRequests: [RideRequestForBidding] {
        switch sortBy {
        case .nearest:
            return viewModel.availableRequests.sorted { r1, r2 in
                (r1.distance_to_pickup_km ?? .infinity) < (r2.distance_to_pickup_km ?? .infinity)
            }
        case .highestPay:
            return viewModel.availableRequests.sorted { r1, r2 in
                (r1.suggested_price ?? 0) > (r2.suggested_price ?? 0)
            }
        case .soonest:
            return viewModel.availableRequests.sorted { r1, r2 in
                (r1.created_at ?? "") > (r2.created_at ?? "")
            }
        }
    }

    private var averagePrice: Double? {
        let prices = viewModel.availableRequests.compactMap { $0.suggested_price }
        guard !prices.isEmpty else { return nil }
        return prices.reduce(0, +) / Double(prices.count)
    }

    // MARK: - Smart Error Alert Helpers

    /// Check if error is about active ride blocking
    private var hasActiveRide: Bool {
        viewModel.errorMessage?.contains("active ride") == true
    }

    /// Check if error is about active delivery blocking
    private var hasActiveDelivery: Bool {
        viewModel.errorMessage?.contains("active delivery") == true
    }

    /// Check if this is a blocking error (driver has active work)
    private var isBlockingError: Bool {
        hasActiveRide || hasActiveDelivery
    }

    /// Smart alert title based on error type
    private var alertTitle: String {
        if hasActiveRide {
            return "Complete Active Ride First"
        } else if hasActiveDelivery {
            return "Complete Delivery First"
        } else {
            return "Error"
        }
    }
}

// MARK: - Ride Request Card

struct RideRequestCard: View {
    let request: RideRequestForBidding
    let locationManager: LocationManager
    let onBid: () -> Void

    private var distanceToPickup: String {
        if let km = request.distance_to_pickup_km {
            let miles = km * 0.621371
            return String(format: "%.1f mi", miles)
        }
        return "--"
    }

    private var tripDistance: String {
        if let km = request.estimated_distance_km {
            let miles = km * 0.621371
            return String(format: "%.1f mi", miles)
        }
        return "--"
    }

    private var tripDuration: String {
        if let minutes = request.estimated_duration_minutes {
            return "\(minutes) min"
        }
        return "--"
    }

    var body: some View {
        VStack(spacing: 0) {
            // Header - Price & Distance
            HStack {
                // Suggested Price
                VStack(alignment: .leading, spacing: 2) {
                    Text("$\(String(format: "%.0f", request.suggested_price ?? 0))")
                        .font(.title2)
                        .fontWeight(.bold)
                        .foregroundColor(.white)
                    Text("suggested")
                        .font(.caption2)
                        .foregroundColor(.white.opacity(0.8))
                }
                .padding(.horizontal, 12)
                .padding(.vertical, 8)
                .background(
                    LinearGradient(
                        colors: [Color.blue, Color.blue.opacity(0.8)],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
                .cornerRadius(12)

                Spacer()

                // Distance & Bid Count
                VStack(alignment: .trailing, spacing: 4) {
                    HStack(spacing: 4) {
                        Image(systemName: "location.fill")
                            .font(.caption2)
                        Text("\(distanceToPickup) away")
                            .font(.caption)
                            .fontWeight(.medium)
                    }
                    .foregroundColor(Theme.textSecondary)

                    if let bidCount = request.bid_count, bidCount > 0 {
                        HStack(spacing: 4) {
                            Image(systemName: "person.3.fill")
                                .font(.caption2)
                            Text("\(bidCount) bid\(bidCount == 1 ? "" : "s")")
                                .font(.caption2)
                                .fontWeight(.bold)
                        }
                        .foregroundColor(.orange)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(Color.orange.opacity(0.15))
                        .cornerRadius(8)
                    }
                }
            }
            .padding()

            Divider()
                .padding(.horizontal)

            // Pickup Location
            HStack(spacing: 12) {
                ZStack {
                    Circle()
                        .fill(Color.green.opacity(0.15))
                        .frame(width: 40, height: 40)
                    Image(systemName: "person.fill")
                        .foregroundColor(.green)
                }

                VStack(alignment: .leading, spacing: 2) {
                    Text("PICKUP")
                        .font(.caption2)
                        .fontWeight(.semibold)
                        .foregroundColor(Theme.textSecondary)
                    Text(request.pickup.address)
                        .font(.subheadline)
                        .foregroundColor(Theme.textPrimary)
                        .lineLimit(2)
                }

                Spacer()
            }
            .padding(.horizontal)
            .padding(.top, 12)

            // Route line
            HStack {
                Rectangle()
                    .fill(Color.blue.opacity(0.3))
                    .frame(width: 2, height: 24)
                    .padding(.leading, 32)
                Spacer()
            }

            // Dropoff Location
            HStack(spacing: 12) {
                ZStack {
                    Circle()
                        .fill(Color.red.opacity(0.15))
                        .frame(width: 40, height: 40)
                    Image(systemName: "mappin.circle.fill")
                        .foregroundColor(.red)
                }

                VStack(alignment: .leading, spacing: 2) {
                    Text("DROP-OFF")
                        .font(.caption2)
                        .fontWeight(.semibold)
                        .foregroundColor(Theme.textSecondary)
                    Text(request.dropoff.address)
                        .font(.subheadline)
                        .foregroundColor(Theme.textPrimary)
                        .lineLimit(2)
                }

                Spacer()
            }
            .padding(.horizontal)
            .padding(.bottom, 12)

            // Trip Stats
            HStack(spacing: 16) {
                TripStatBadge(icon: "arrow.left.and.right", text: tripDistance, label: "Trip")
                TripStatBadge(icon: "clock.fill", text: tripDuration, label: "Duration")

                if let specialRequests = request.special_requests, !specialRequests.isEmpty {
                    TripStatBadge(icon: "note.text", text: "Notes", label: "Special")
                }
            }
            .padding(.horizontal)
            .padding(.bottom, 12)

            Divider()
                .padding(.horizontal)

            // Bid Button
            Button(action: onBid) {
                HStack {
                    Image(systemName: "hand.raised.fill")
                    Text("Submit Bid")
                }
                .font(.headline)
                .foregroundColor(.white)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 14)
                .background(Color.blue)
                .cornerRadius(12)
            }
            .accessibilityLabel("Submit bid for this ride")
            .accessibilityHint("Place your bid to pick up this rider")
            .padding()
        }
        .background(Theme.cardBackground)
        .cornerRadius(16)
        .shadow(color: Color.black.opacity(0.08), radius: 8, x: 0, y: 4)
    }
}

// MARK: - Trip Stat Badge

struct TripStatBadge: View {
    let icon: String
    let text: String
    let label: String

    var body: some View {
        VStack(spacing: 2) {
            HStack(spacing: 4) {
                Image(systemName: icon)
                    .font(.caption2)
                Text(text)
                    .font(.caption)
                    .fontWeight(.semibold)
            }
            .foregroundColor(.blue)

            Text(label)
                .font(.caption2)
                .foregroundColor(Theme.textSecondary)
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
        .background(Color.blue.opacity(0.1))
        .cornerRadius(10)
    }
}

// MARK: - Map View

struct RideRequestsMapView: View {
    let requests: [RideRequestForBidding]
    let locationManager: LocationManager
    let onRequestSelected: (RideRequestForBidding) -> Void

    @State private var position: MapCameraPosition = .automatic

    var body: some View {
        Map(position: $position) {
            // Driver's current location
            if let coordinate = locationManager.currentCoordinate, coordinate.isValid {
                Annotation("You", coordinate: coordinate) {
                    ZStack {
                        Circle()
                            .fill(Color.blue.opacity(0.2))
                            .frame(width: 60, height: 60)

                        Circle()
                            .fill(Color.blue)
                            .frame(width: 20, height: 20)
                            .overlay(Circle().stroke(Color.white, lineWidth: 3))
                            .shadow(color: .blue.opacity(0.5), radius: 4)
                    }
                }
            }

            // Ride request pickups
            ForEach(requests) { request in
                Annotation(
                    "$\(String(format: "%.0f", request.suggested_price ?? 0))",
                    coordinate: CLLocationCoordinate2D(
                        latitude: request.pickup.latitude,
                        longitude: request.pickup.longitude
                    )
                ) {
                    Button(action: { onRequestSelected(request) }) {
                        VStack(spacing: 2) {
                            ZStack {
                                Circle()
                                    .fill(Color.blue)
                                    .frame(width: 44, height: 44)
                                    .shadow(color: Color.blue.opacity(0.4), radius: 6)

                                Text("$\(Int(request.suggested_price ?? 0))")
                                    .font(.caption)
                                    .fontWeight(.bold)
                                    .foregroundColor(.white)
                            }

                            Image(systemName: "arrowtriangle.down.fill")
                                .font(.system(size: 10))
                                .foregroundColor(.blue)
                                .offset(y: -4)
                        }
                    }
                    .accessibilityLabel("Ride request for \(Int(request.suggested_price ?? 0)) dollars")
                    .accessibilityHint("Tap to submit a bid")
                }
            }
        }
        .mapStyle(.standard(elevation: .realistic))
        .mapControls {
            MapUserLocationButton()
            MapCompass()
        }
        .onAppear {
            updateMapPosition()
        }
    }

    private func updateMapPosition() {
        if let coordinate = locationManager.currentCoordinate, coordinate.isValid {
            position = .region(MKCoordinateRegion(
                center: coordinate,
                span: MKCoordinateSpan(latitudeDelta: 0.1, longitudeDelta: 0.1)
            ))
        }
    }
}

// MARK: - Preview

#if DEBUG
struct AvailableRideRequestsView_Previews: PreviewProvider {
    static var previews: some View {
        AvailableRideRequestsView()
    }
}
#endif
