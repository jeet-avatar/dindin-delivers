import SwiftUI
import MapKit
import EatFairShared

/// RideshareDashboardView - Main rideshare screen with tabs
/// Matches web app RideBidding.tsx with Available Requests and My Bids tabs
struct RideshareDashboardView: View {
    @StateObject private var viewModel = RideBiddingViewModel()
    @ObservedObject private var onlineManager = OnlineStatusManager.shared
    @State private var selectedTab: RideshareTab = .available
    @State private var showPayoutDashboard = false
    /// The bid currently presented full-screen. Set when an active ride appears;
    /// cleared only when the driver explicitly finishes (done/cancel/no-show).
    /// Using local state prevents the poll-driven activeRides update from
    /// force-dismissing the screen mid-flow.
    @State private var presentedActiveBid: RideBid?

    enum RideshareTab: String, CaseIterable {
        case available = "Available"
        case myBids = "My Bids"
        case active = "Active"

        var icon: String {
            switch self {
            case .available: return "car.2.fill"
            case .myBids: return "hand.raised.fill"
            case .active: return "location.fill"
            }
        }

        var color: Color {
            switch self {
            case .available: return Theme.lxOrange
            case .myBids: return Theme.lxOrangeBright
            case .active: return Theme.lxSuccess
            }
        }
    }

    var body: some View {
        mainNavigationContent
            .alert(alertTitle, isPresented: $viewModel.showError) {
                errorAlertButtons
            } message: {
                Text(viewModel.errorMessage ?? "An error occurred")
            }
            .alert("Success", isPresented: $viewModel.showSuccess) {
                Button("OK", role: .cancel) {}
                    .accessibilityLabel("Dismiss success message")
            } message: {
                Text(viewModel.successMessage ?? "")
            }
            .alert("Can't go online yet", isPresented: Binding(
                get: { onlineManager.statusError != nil },
                set: { if !$0 { onlineManager.statusError = nil } }
            )) {
                Button("OK", role: .cancel) { onlineManager.statusError = nil }
            } message: {
                Text(onlineManager.statusError ?? "")
            }
    }

    private var mainNavigationContent: some View {
        NavigationView {
            ZStack {
                Theme.lxBg.ignoresSafeArea()
                VStack(spacing: 0) {
                    onlineToggleBar
                    tabSelector
                    TabView(selection: $selectedTab) {
                        AvailableRequestsContent(viewModel: viewModel, onBidSubmitted: {
                            selectedTab = .myBids
                        })
                        .tag(RideshareTab.available)

                        MyBidsContent(viewModel: viewModel)
                            .tag(RideshareTab.myBids)

                        ActiveRidesContent(viewModel: viewModel, presentedActiveBid: $presentedActiveBid)
                            .tag(RideshareTab.active)
                    }
                    .tabViewStyle(.page(indexDisplayMode: .never))
                }
            }
            .navigationTitle("Rideshare")
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    HStack(spacing: 12) {
                        Button(action: { showPayoutDashboard = true }) {
                            Image(systemName: "dollarsign.circle")
                                .foregroundColor(Theme.lxSuccess)
                        }
                        .accessibilityLabel("View payout history")
                        Button(action: { viewModel.refreshData() }) {
                            Image(systemName: "arrow.clockwise")
                                .foregroundColor(Theme.lxOrange)
                        }
                        .accessibilityLabel("Refresh rideshare data")
                    }
                }
            }
            .sheet(isPresented: $showPayoutDashboard) {
                PayoutDashboardView()
            }
            // Full-screen active ride cover. Driven by presentedActiveBid (not
            // activeRides directly) so that a poll-driven activeRides update cannot
            // force-dismiss the screen while the driver is mid-flow (rating, etc.).
            // The cover is set by the .onChange below when a ride first appears,
            // and cleared only when the driver explicitly finishes via onRideDone.
            .fullScreenCover(item: $presentedActiveBid) { activeBid in
                NavigationStack {
                    ActiveRideView(
                        bid: activeBid,
                        viewModel: viewModel,
                        onRideDone: {
                            viewModel.clearActiveRide(activeBid)
                            presentedActiveBid = nil
                            viewModel.refreshData()
                        }
                    )
                }
                .interactiveDismissDisabled(true)
            }
            .onAppear { viewModel.refreshData() }
            .onChange(of: viewModel.activeRides) { _, newRides in
                // Present when a ride appears for the first time; never close from here.
                if presentedActiveBid == nil, let first = newRides.first {
                    presentedActiveBid = first
                }
            }

        }
        .preferredColorScheme(.dark)
    }

    private var onlineToggleBar: some View {
        HStack(spacing: 12) {
            Circle()
                .fill(viewModel.isOnline ? Theme.lxSuccess : Theme.lxError)
                .frame(width: 12, height: 12)
            Text(viewModel.isOnline ? "Online" : "Offline")
                .font(.subheadline)
                .fontWeight(.semibold)
                .foregroundColor(viewModel.isOnline ? Theme.lxSuccess : Theme.lxError)
            Spacer()
            Toggle("", isOn: Binding(
                get: { viewModel.isOnline },
                set: { viewModel.setOnlineStatus($0) }
            ))
            .labelsHidden()
            .tint(Theme.lxSuccess)
        }
        .padding(.horizontal)
        .padding(.vertical, 10)
        .background(viewModel.isOnline ? Theme.lxSuccess.opacity(0.15) : Theme.lxError.opacity(0.15))
    }

    @ViewBuilder
    private var errorAlertButtons: some View {
        if isBlockingError {
            Button("View Active Work") {
                withAnimation { selectedTab = .active }
            }
            .accessibilityLabel("View your active work")
            Button("OK", role: .cancel) {}
                .accessibilityLabel("Dismiss error")
        } else {
            Button("OK", role: .cancel) {}
                .accessibilityLabel("Dismiss error")
        }
    }

    // MARK: - Tab Selector

    private var tabSelector: some View {
        HStack(spacing: 0) {
            ForEach(RideshareTab.allCases, id: \.self) { tab in
                Button(action: {
                    withAnimation(.spring(response: 0.3)) {
                        selectedTab = tab
                    }
                }) {
                    VStack(spacing: 6) {
                        HStack(spacing: 6) {
                            Image(systemName: tab.icon)
                                .font(.subheadline)
                            Text(tab.rawValue)
                                .font(.subheadline)
                                .fontWeight(.semibold)
                        }

                        // Badge
                        Text("\(countForTab(tab))")
                            .font(.caption2)
                            .fontWeight(.bold)
                            .foregroundColor(selectedTab == tab ? .white : tab.color)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 2)
                            .background(selectedTab == tab ? tab.color : tab.color.opacity(0.2))
                            .cornerRadius(10)
                    }
                    .foregroundColor(selectedTab == tab ? tab.color : Theme.lxTextSecondary)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
                    .background(
                        VStack {
                            Spacer()
                            if selectedTab == tab {
                                Rectangle()
                                    .fill(tab.color)
                                    .frame(height: 3)
                            }
                        }
                    )
                }
                .accessibilityLabel("\(tab.rawValue) tab, \(countForTab(tab)) items")
                .accessibilityHint(selectedTab == tab ? "Currently selected" : "Tap to view \(tab.rawValue.lowercased())")
            }
        }
        .background(Theme.lxSurface)
        .overlay(alignment: .bottom) {
            Rectangle()
                .fill(Theme.lxHairline)
                .frame(height: 1)
        }
    }

    private func countForTab(_ tab: RideshareTab) -> Int {
        switch tab {
        case .available:
            return viewModel.availableRequests.count
        case .myBids:
            return viewModel.pendingBids.count + viewModel.counteredBids.count
        case .active:
            return viewModel.activeRides.count
        }
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

// MARK: - Available Requests Content

struct AvailableRequestsContent: View {
    @ObservedObject var viewModel: RideBiddingViewModel
    var onBidSubmitted: (() -> Void)? = nil
    @StateObject private var locationManager = LocationManager.shared
    @State private var selectedRequest: RideRequestForBidding?
    @State private var showBidSheet = false

    var body: some View {
        Group {
            if viewModel.isLoading && viewModel.availableRequests.isEmpty {
                loadingView
            } else if viewModel.availableRequests.isEmpty {
                emptyStateView
            } else {
                requestsList
            }
        }
        .sheet(isPresented: $showBidSheet) {
            if let request = selectedRequest {
                SubmitBidSheet(request: request, viewModel: viewModel) {
                    showBidSheet = false
                    onBidSubmitted?()
                }
            }
        }
    }

    private var loadingView: some View {
        VStack(spacing: 20) {
            Spacer()
            ProgressView()
                .scaleEffect(1.5)
                .tint(.blue)
            Text("Finding ride requests...")
                .font(.headline)
                .foregroundColor(Theme.textSecondary)
            Spacer()
        }
    }

    private var emptyStateView: some View {
        VStack(spacing: 24) {
            Spacer()

            ZStack {
                Circle()
                    .fill(Color.blue.opacity(0.1))
                    .frame(width: 120, height: 120)

                Image(systemName: "car.2.fill")
                    .font(.system(size: 44))
                    .foregroundColor(.blue)
            }

            VStack(spacing: 8) {
                Text("No Ride Requests")
                    .font(.title3)
                    .fontWeight(.bold)
                    .foregroundColor(Theme.textPrimary)

                Text("Ride requests will appear here.\nSubmit competitive bids to get matched!")
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

    private var requestsList: some View {
        ScrollView {
            LazyVStack(spacing: 16) {
                ForEach(viewModel.availableRequests) { request in
                    TinderSwipeCard(
                        onAccept: {
                            selectedRequest = request
                            showBidSheet = true
                        },
                        onDecline: { /* skip to next card — no-op */ }
                    ) {
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
            }
            .padding()
        }
        .refreshable {
            viewModel.fetchAvailableRequests()
        }
    }
}

// MARK: - My Bids Content

struct MyBidsContent: View {
    @ObservedObject var viewModel: RideBiddingViewModel
    @State private var selectedBid: RideBid?
    @State private var showCounterOfferSheet = false

    /// True when there are bids worth showing (pending or countered).
    /// Accepted bids live in the Active tab so they don't count here.
    private var hasVisibleBids: Bool {
        !viewModel.pendingBids.isEmpty || !viewModel.counteredBids.isEmpty
    }

    var body: some View {
        Group {
            if hasVisibleBids {
                bidsList
            } else {
                emptyStateView
            }
        }
        .sheet(isPresented: $showCounterOfferSheet) {
            if let bid = selectedBid {
                CounterOfferResponseSheet(bid: bid, viewModel: viewModel) {
                    showCounterOfferSheet = false
                }
            }
        }
        // Wire the ViewModel's auto-detected counter-offer to the local sheet.
        // When a new counter-offer arrives mid-poll, the VM sets selectedCounterOffer
        // and flips showCounterOfferSheet — we observe that and mirror it here.
        .onChange(of: viewModel.showCounterOfferSheet) { _, isShowing in
            if isShowing, let offer = viewModel.selectedCounterOffer {
                selectedBid = offer
                showCounterOfferSheet = true
                viewModel.showCounterOfferSheet = false
            }
        }
    }

    private var emptyStateView: some View {
        VStack(spacing: 24) {
            Spacer()

            ZStack {
                Circle()
                    .fill(Color.orange.opacity(0.1))
                    .frame(width: 120, height: 120)

                Image(systemName: "hand.raised.fill")
                    .font(.system(size: 44))
                    .foregroundColor(.orange)
            }

            VStack(spacing: 8) {
                Text("No Bids Yet")
                    .font(.title3)
                    .fontWeight(.bold)
                    .foregroundColor(Theme.textPrimary)

                Text("Submit bids on ride requests\nto see them here.")
                    .font(.subheadline)
                    .foregroundColor(Theme.textSecondary)
                    .multilineTextAlignment(.center)
            }

            Spacer()
        }
        .padding()
    }

    private var bidsList: some View {
        ScrollView {
            LazyVStack(spacing: 16) {
                // Counter-offers section
                if !viewModel.counteredBids.isEmpty {
                    VStack(alignment: .leading, spacing: 12) {
                        HStack {
                            Image(systemName: "exclamationmark.circle.fill")
                                .foregroundColor(.blue)
                            Text("Counter-Offers (\(viewModel.counteredBids.count))")
                                .font(.headline)
                                .foregroundColor(Theme.textPrimary)
                        }

                        ForEach(viewModel.counteredBids) { bid in
                            BidCard(
                                bid: bid,
                                viewModel: viewModel,
                                onCounterOffer: {
                                    selectedBid = bid
                                    showCounterOfferSheet = true
                                }
                            )
                        }
                    }
                    .padding(.bottom, 8)
                }

                // Pending bids section
                if !viewModel.pendingBids.isEmpty {
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Pending (\(viewModel.pendingBids.count))")
                            .font(.headline)
                            .foregroundColor(Theme.textPrimary)

                        ForEach(viewModel.pendingBids) { bid in
                            BidCard(
                                bid: bid,
                                viewModel: viewModel,
                                onCounterOffer: {}
                            )
                        }
                    }
                }
            }
            .padding()
        }
        .refreshable {
            viewModel.fetchMyBids()
        }
    }
}

// MARK: - Active Rides Content

struct ActiveRidesContent: View {
    @ObservedObject var viewModel: RideBiddingViewModel
    /// Bound to the parent's presentedActiveBid so tapping a card reopens the
    /// full-screen cover instead of pushing a separate NavigationLink destination
    /// (which would receive no onRideDone callback and be unable to dismiss cleanly).
    @Binding var presentedActiveBid: RideBid?

    var body: some View {
        Group {
            if viewModel.activeRides.isEmpty {
                emptyStateView
            } else {
                ridesList
            }
        }
    }

    private var emptyStateView: some View {
        VStack(spacing: 24) {
            Spacer()

            ZStack {
                Circle()
                    .fill(Color.green.opacity(0.1))
                    .frame(width: 120, height: 120)

                Image(systemName: "location.fill")
                    .font(.system(size: 44))
                    .foregroundColor(.green)
            }

            VStack(spacing: 8) {
                Text("No Active Rides")
                    .font(.title3)
                    .fontWeight(.bold)
                    .foregroundColor(Theme.textPrimary)

                Text("When a customer accepts your bid,\nthe ride will appear here.")
                    .font(.subheadline)
                    .foregroundColor(Theme.textSecondary)
                    .multilineTextAlignment(.center)
            }

            Spacer()
        }
        .padding()
    }

    private var ridesList: some View {
        ScrollView {
            LazyVStack(spacing: 16) {
                ForEach(viewModel.activeRides) { bid in
                    // Use a plain button that sets presentedActiveBid, which triggers
                    // the parent's fullScreenCover (with onRideDone wired correctly).
                    // A NavigationLink here gets no onRideDone and can't dismiss the cover.
                    Button {
                        presentedActiveBid = bid
                    } label: {
                        ActiveRideCard(bid: bid)
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding()
        }
        .refreshable {
            viewModel.fetchMyBids()
        }
    }
}

// MARK: - Active Ride Card

struct ActiveRideCard: View {
    let bid: RideBid

    private var request: RideRequestForBidding? {
        bid.ride_request
    }

    private var finalPrice: Double {
        bid.customer_counter_price ?? bid.proposed_price
    }

    var body: some View {
        VStack(spacing: 0) {
            // Header
            HStack {
                HStack(spacing: 8) {
                    Image(systemName: "checkmark.circle.fill")
                        .foregroundColor(.green)
                    Text("Matched")
                        .font(.subheadline)
                        .fontWeight(.bold)
                        .foregroundColor(.green)
                }

                Spacer()

                Text("$\(String(format: "%.0f", finalPrice))")
                    .font(.title3)
                    .fontWeight(.bold)
                    .foregroundColor(Theme.textPrimary)
            }
            .padding()

            Divider()
                .padding(.horizontal)

            // Route
            if let request = request {
                VStack(spacing: 8) {
                    HStack(spacing: 8) {
                        Circle()
                            .fill(Color.green)
                            .frame(width: 10, height: 10)
                        Text(request.pickup.address)
                            .font(.caption)
                            .foregroundColor(Theme.textPrimary)
                            .lineLimit(1)
                        Spacer()
                    }

                    HStack(spacing: 8) {
                        Circle()
                            .fill(Color.red)
                            .frame(width: 10, height: 10)
                        Text(request.dropoff.address)
                            .font(.caption)
                            .foregroundColor(Theme.textPrimary)
                            .lineLimit(1)
                        Spacer()
                    }
                }
                .padding()
            }

            // Go to Ride Button
            HStack {
                Image(systemName: "car.fill")
                Text("View Ride")
            }
            .font(.subheadline)
            .fontWeight(.semibold)
            .foregroundColor(.white)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 12)
            .background(Color.green)
            .cornerRadius(12)
            .padding()
        }
        .background(Theme.cardBackground)
        .cornerRadius(16)
        .shadow(color: Color.black.opacity(0.08), radius: 8, x: 0, y: 4)
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

                if request.accessibility_requested == true {
                    TripStatBadge(icon: "figure.roll", text: "Access", label: "Needed")
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

// MARK: - Preview

#if DEBUG
struct RideshareDashboardView_Previews: PreviewProvider {
    static var previews: some View {
        RideshareDashboardView()
    }
}
#endif
