import SwiftUI
import EatFairShared

/// MyBidsView - Manage driver's submitted bids
/// Matches web app RideBidding.tsx "My Bids" tab
struct MyBidsView: View {
    @ObservedObject var viewModel: RideBiddingViewModel
    @State private var selectedTab: BidTab = .pending
    @State private var selectedBid: RideBid?
    @State private var showCounterOfferSheet = false

    enum BidTab: String, CaseIterable {
        case pending = "Pending"
        case countered = "Countered"
        case accepted = "Matched"

        var icon: String {
            switch self {
            case .pending: return "clock.fill"
            case .countered: return "arrow.triangle.2.circlepath"
            case .accepted: return "checkmark.circle.fill"
            }
        }

        var color: Color {
            switch self {
            case .pending: return .orange
            case .countered: return .blue
            case .accepted: return .green
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
                    if viewModel.isLoading && viewModel.myBids.isEmpty {
                        loadingView
                    } else if bidsForCurrentTab.isEmpty {
                        emptyStateView
                    } else {
                        bidsList
                    }
                }
            }
            .navigationTitle("My Bids")
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(action: { viewModel.fetchMyBids() }) {
                        Image(systemName: "arrow.clockwise")
                            .foregroundColor(.blue)
                    }
                }
            }
            .onAppear {
                viewModel.fetchMyBids()
            }
            .sheet(isPresented: $showCounterOfferSheet) {
                if let bid = selectedBid {
                    CounterOfferResponseSheet(bid: bid, viewModel: viewModel) {
                        showCounterOfferSheet = false
                    }
                }
            }
            .alert("Error", isPresented: $viewModel.showError) {
                Button("OK", role: .cancel) {}
            } message: {
                Text(viewModel.errorMessage ?? "An error occurred")
            }
            .alert("Success", isPresented: $viewModel.showSuccess) {
                Button("OK", role: .cancel) {}
            } message: {
                Text(viewModel.successMessage ?? "")
            }
        }
    }

    // MARK: - Tab Selector

    private var tabSelector: some View {
        HStack(spacing: 0) {
            ForEach(BidTab.allCases, id: \.self) { tab in
                Button(action: {
                    withAnimation(.spring(response: 0.3)) {
                        selectedTab = tab
                    }
                }) {
                    VStack(spacing: 4) {
                        HStack(spacing: 6) {
                            Image(systemName: tab.icon)
                                .font(.caption)
                            Text(tab.rawValue)
                                .font(.subheadline)
                                .fontWeight(.semibold)
                        }

                        // Badge count
                        Text("\(countForTab(tab))")
                            .font(.caption2)
                            .fontWeight(.bold)
                            .foregroundColor(selectedTab == tab ? .white : tab.color)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 2)
                            .background(selectedTab == tab ? tab.color.opacity(0.8) : tab.color.opacity(0.2))
                            .cornerRadius(10)
                    }
                    .foregroundColor(selectedTab == tab ? tab.color : Theme.textSecondary)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
                    .background(
                        selectedTab == tab ? tab.color.opacity(0.15) : Color.clear
                    )
                }
            }
        }
        .background(Theme.cardBackground)
    }

    // MARK: - Bids List

    private var bidsList: some View {
        ScrollView {
            LazyVStack(spacing: 16) {
                ForEach(bidsForCurrentTab) { bid in
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
            .padding()
        }
        .refreshable {
            viewModel.fetchMyBids()
        }
    }

    // MARK: - Loading View

    private var loadingView: some View {
        VStack(spacing: 20) {
            Spacer()
            ProgressView()
                .scaleEffect(1.5)
                .tint(.blue)
            Text("Loading your bids...")
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
                    .fill(selectedTab.color.opacity(0.1))
                    .frame(width: 120, height: 120)

                Image(systemName: selectedTab.icon)
                    .font(.system(size: 44))
                    .foregroundColor(selectedTab.color)
            }

            VStack(spacing: 8) {
                Text(emptyStateTitle)
                    .font(.title3)
                    .fontWeight(.bold)
                    .foregroundColor(Theme.textPrimary)

                Text(emptyStateMessage)
                    .font(.subheadline)
                    .foregroundColor(Theme.textSecondary)
                    .multilineTextAlignment(.center)
            }

            Spacer()
        }
        .padding()
    }

    // MARK: - Computed Properties

    private var bidsForCurrentTab: [RideBid] {
        switch selectedTab {
        case .pending:
            return viewModel.pendingBids
        case .countered:
            return viewModel.counteredBids
        case .accepted:
            return viewModel.acceptedBids
        }
    }

    private func countForTab(_ tab: BidTab) -> Int {
        switch tab {
        case .pending:
            return viewModel.pendingBids.count
        case .countered:
            return viewModel.counteredBids.count
        case .accepted:
            return viewModel.acceptedBids.count
        }
    }

    private var emptyStateTitle: String {
        switch selectedTab {
        case .pending:
            return "No Pending Bids"
        case .countered:
            return "No Counter-Offers"
        case .accepted:
            return "No Matched Rides"
        }
    }

    private var emptyStateMessage: String {
        switch selectedTab {
        case .pending:
            return "Submit bids on ride requests to see them here."
        case .countered:
            return "Customers' counter-offers will appear here."
        case .accepted:
            return "Your accepted bids will appear here."
        }
    }
}

// MARK: - Bid Card

struct BidCard: View {
    let bid: RideBid
    @ObservedObject var viewModel: RideBiddingViewModel
    let onCounterOffer: () -> Void

    @State private var showWithdrawAlert = false

    private var statusColor: Color {
        switch bid.status {
        case "pending": return .orange
        case "countered": return .blue
        case "accepted": return .green
        case "rejected": return .red
        default: return .gray
        }
    }

    private var statusIcon: String {
        switch bid.status {
        case "pending": return "clock.fill"
        case "countered": return "arrow.triangle.2.circlepath"
        case "accepted": return "checkmark.circle.fill"
        case "rejected": return "xmark.circle.fill"
        default: return "questionmark.circle"
        }
    }

    var body: some View {
        VStack(spacing: 0) {
            // Header
            HStack {
                // Status Badge
                HStack(spacing: 6) {
                    Image(systemName: statusIcon)
                        .font(.caption)
                    Text(bid.status.capitalized)
                        .font(.caption)
                        .fontWeight(.bold)
                }
                .foregroundColor(statusColor)
                .padding(.horizontal, 10)
                .padding(.vertical, 6)
                .background(statusColor.opacity(0.15))
                .cornerRadius(8)

                Spacer()

                // Your Bid Amount
                VStack(alignment: .trailing, spacing: 2) {
                    Text("$\(String(format: "%.0f", bid.proposed_price))")
                        .font(.title3)
                        .fontWeight(.bold)
                        .foregroundColor(Theme.textPrimary)
                    Text("your bid")
                        .font(.caption2)
                        .foregroundColor(Theme.textSecondary)
                }
            }
            .padding()

            Divider()
                .padding(.horizontal)

            // Route Info
            if let request = bid.ride_request {
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
                .padding(.horizontal)
                .padding(.vertical, 12)
            }

            // Counter-Offer Section (if countered)
            if bid.status == "countered", let counterPrice = bid.customer_counter_price {
                Divider()
                    .padding(.horizontal)

                HStack {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Customer Counter-Offer")
                            .font(.caption)
                            .foregroundColor(Theme.textSecondary)
                        HStack(spacing: 4) {
                            Text("$\(String(format: "%.0f", counterPrice))")
                                .font(.headline)
                                .fontWeight(.bold)
                                .foregroundColor(.blue)
                            if counterPrice > bid.proposed_price {
                                Image(systemName: "arrow.up.circle.fill")
                                    .foregroundColor(.green)
                            } else {
                                Image(systemName: "arrow.down.circle.fill")
                                    .foregroundColor(.orange)
                            }
                        }
                    }

                    Spacer()

                    // Respond Button
                    Button(action: onCounterOffer) {
                        Text("Respond")
                            .font(.subheadline)
                            .fontWeight(.semibold)
                            .foregroundColor(.white)
                            .padding(.horizontal, 16)
                            .padding(.vertical, 8)
                            .background(Color.blue)
                            .cornerRadius(8)
                    }
                }
                .padding()
                .background(Color.blue.opacity(0.05))
            }

            // Expiry Warning
            if viewModel.isBidExpiringSoon(bid) {
                HStack(spacing: 8) {
                    Image(systemName: "exclamationmark.triangle.fill")
                        .foregroundColor(.orange)
                    Text("Expiring soon!")
                        .font(.caption)
                        .fontWeight(.semibold)
                        .foregroundColor(.orange)
                    Spacer()
                }
                .padding(.horizontal)
                .padding(.vertical, 8)
                .background(Color.orange.opacity(0.1))
            }

            // Actions
            if bid.status == "pending" {
                Divider()
                    .padding(.horizontal)

                HStack(spacing: 12) {
                    Button(action: { showWithdrawAlert = true }) {
                        HStack {
                            Image(systemName: "xmark.circle")
                            Text("Withdraw")
                        }
                        .font(.subheadline)
                        .foregroundColor(.red)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 12)
                        .background(Color.red.opacity(0.1))
                        .cornerRadius(10)
                    }
                }
                .padding()
            }

            // Accepted - Show Active Ride Button
            if bid.status == "accepted" {
                Divider()
                    .padding(.horizontal)

                NavigationLink(destination: ActiveRideView(bid: bid, viewModel: viewModel)) {
                    HStack {
                        Image(systemName: "car.fill")
                        Text("View Active Ride")
                    }
                    .font(.headline)
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 14)
                    .background(Color.green)
                    .cornerRadius(12)
                }
                .padding()
            }
        }
        .background(Theme.cardBackground)
        .cornerRadius(16)
        .shadow(color: Color.black.opacity(0.08), radius: 8, x: 0, y: 4)
        .alert("Withdraw Bid?", isPresented: $showWithdrawAlert) {
            Button("Cancel", role: .cancel) {}
            Button("Withdraw", role: .destructive) {
                viewModel.withdrawBid(bid)
            }
        } message: {
            Text("Are you sure you want to withdraw this bid? This action cannot be undone.")
        }
    }
}

// MARK: - Preview

#if DEBUG
struct MyBidsView_Previews: PreviewProvider {
    static var previews: some View {
        MyBidsView(viewModel: RideBiddingViewModel())
    }
}
#endif
