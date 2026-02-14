import SwiftUI
import EatFairShared

/// RideshareDashboardView - Main rideshare screen with tabs
/// Matches web app RideBidding.tsx with Available Requests and My Bids tabs
struct RideshareDashboardView: View {
    @StateObject private var viewModel = RideBiddingViewModel()
    @State private var selectedTab: RideshareTab = .available

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
            case .available: return .blue
            case .myBids: return .orange
            case .active: return .green
            }
        }
    }

    var body: some View {
        NavigationView {
            ZStack {
                Theme.backgroundGrey.ignoresSafeArea()

                VStack(spacing: 0) {
                    // Tab Selector
                    tabSelector

                    // Content
                    TabView(selection: $selectedTab) {
                        // Available Requests Tab
                        AvailableRequestsContent(viewModel: viewModel)
                            .tag(RideshareTab.available)

                        // My Bids Tab
                        MyBidsContent(viewModel: viewModel)
                            .tag(RideshareTab.myBids)

                        // Active Rides Tab
                        ActiveRidesContent(viewModel: viewModel)
                            .tag(RideshareTab.active)
                    }
                    .tabViewStyle(.page(indexDisplayMode: .never))
                }
            }
            .navigationTitle("Rideshare")
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(action: { viewModel.refreshData() }) {
                        Image(systemName: "arrow.clockwise")
                            .foregroundColor(.blue)
                    }
                    .accessibilityLabel("Refresh rideshare data")
                }
            }
            .onAppear {
                viewModel.refreshData()
            }
            .alert(alertTitle, isPresented: $viewModel.showError) {
                if isBlockingError {
                    Button("View Active Work") {
                        // Navigate to active tab
                        withAnimation {
                            selectedTab = .active
                        }
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
                    .foregroundColor(selectedTab == tab ? tab.color : Theme.textSecondary)
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
        .background(Theme.cardBackground)
    }

    private func countForTab(_ tab: RideshareTab) -> Int {
        switch tab {
        case .available:
            return viewModel.availableRequests.count
        case .myBids:
            return viewModel.myBids.count
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
}

// MARK: - My Bids Content

struct MyBidsContent: View {
    @ObservedObject var viewModel: RideBiddingViewModel
    @State private var selectedBid: RideBid?
    @State private var showCounterOfferSheet = false

    var body: some View {
        Group {
            if viewModel.myBids.isEmpty {
                emptyStateView
            } else {
                bidsList
            }
        }
        .sheet(isPresented: $showCounterOfferSheet) {
            if let bid = selectedBid {
                CounterOfferResponseSheet(bid: bid, viewModel: viewModel) {
                    showCounterOfferSheet = false
                }
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
                    NavigationLink(destination: ActiveRideView(bid: bid, viewModel: viewModel)) {
                        ActiveRideCard(bid: bid)
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

// MARK: - Preview

#if DEBUG
struct RideshareDashboardView_Previews: PreviewProvider {
    static var previews: some View {
        RideshareDashboardView()
    }
}
#endif
