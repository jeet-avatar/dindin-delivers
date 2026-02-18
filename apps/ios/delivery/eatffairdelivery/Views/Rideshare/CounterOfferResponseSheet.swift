import SwiftUI
import EatFairShared

/// CounterOfferResponseSheet - Respond to customer counter-offers
/// Matches web app RideBidding.tsx counter-offer handling
struct CounterOfferResponseSheet: View {
    let bid: RideBid
    @ObservedObject var viewModel: RideBiddingViewModel
    let onDismiss: () -> Void

    @Environment(\.dismiss) private var dismiss
    @State private var showNewCounterInput = false
    @State private var newCounterPrice: String = ""
    @FocusState private var isPriceFocused: Bool

    private var platformFee: Double { AppConfig.shared.calculateRidesharePlatformFee(fareAmount: customerCounterPrice) }

    private var customerCounterPrice: Double {
        bid.customer_counter_price ?? 0
    }

    private var originalPrice: Double {
        bid.proposed_price
    }

    private var priceDifference: Double {
        customerCounterPrice - originalPrice
    }

    private var driverEarningsIfAccept: Double {
        max(0, customerCounterPrice - platformFee)
    }

    private var newCounterAmount: Double {
        Double(newCounterPrice) ?? 0
    }

    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 24) {
                    // Header Icon
                    headerIcon

                    // Price Comparison
                    priceComparison

                    // Route Info
                    if let request = bid.ride_request {
                        routeInfo(request: request)
                    }

                    // New Counter Offer Input (if shown)
                    if showNewCounterInput {
                        newCounterOfferSection
                    }

                    // Platform Fee Info
                    platformFeeInfo
                }
                .padding()
            }
            .background(Theme.backgroundGrey.ignoresSafeArea())
            .navigationTitle("Counter-Offer")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Close") {
                        dismiss()
                        onDismiss()
                    }
                }
            }
            .safeAreaInset(edge: .bottom) {
                actionButtons
            }
            .alert("Error", isPresented: $viewModel.showError) {
                Button("OK", role: .cancel) {}
            } message: {
                Text(viewModel.errorMessage ?? "An error occurred")
            }
        }
    }

    // MARK: - Header Icon

    private var headerIcon: some View {
        VStack(spacing: 12) {
            ZStack {
                Circle()
                    .fill(Color.blue.opacity(0.15))
                    .frame(width: 100, height: 100)

                Image(systemName: "arrow.triangle.2.circlepath")
                    .font(.system(size: 40))
                    .foregroundColor(.blue)
            }

            Text("Customer Counter-Offer")
                .font(.title3)
                .fontWeight(.bold)
                .foregroundColor(Theme.textPrimary)

            Text("The customer has made a counter-offer on your bid")
                .font(.subheadline)
                .foregroundColor(Theme.textSecondary)
                .multilineTextAlignment(.center)
        }
    }

    // MARK: - Price Comparison

    private var priceComparison: some View {
        VStack(spacing: 16) {
            // Your Original Bid
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Your Bid")
                        .font(.caption)
                        .foregroundColor(Theme.textSecondary)
                    Text("$\(String(format: "%.0f", originalPrice))")
                        .font(.title2)
                        .fontWeight(.bold)
                        .foregroundColor(Theme.textPrimary)
                }

                Spacer()

                // Arrow
                Image(systemName: "arrow.right")
                    .font(.title2)
                    .foregroundColor(Theme.textGrey)

                Spacer()

                // Customer Counter
                VStack(alignment: .trailing, spacing: 4) {
                    Text("Their Offer")
                        .font(.caption)
                        .foregroundColor(Theme.textSecondary)
                    Text("$\(String(format: "%.0f", customerCounterPrice))")
                        .font(.title2)
                        .fontWeight(.bold)
                        .foregroundColor(.blue)
                }
            }
            .padding()
            .background(Color.blue.opacity(0.05))
            .cornerRadius(12)

            // Difference Badge
            HStack {
                if priceDifference > 0 {
                    Image(systemName: "arrow.up.circle.fill")
                        .foregroundColor(.green)
                    Text("+$\(String(format: "%.0f", priceDifference)) more than your bid")
                        .font(.subheadline)
                        .fontWeight(.semibold)
                        .foregroundColor(.green)
                } else if priceDifference < 0 {
                    Image(systemName: "arrow.down.circle.fill")
                        .foregroundColor(.orange)
                    Text("$\(String(format: "%.0f", abs(priceDifference))) less than your bid")
                        .font(.subheadline)
                        .fontWeight(.semibold)
                        .foregroundColor(.orange)
                } else {
                    Image(systemName: "equal.circle.fill")
                        .foregroundColor(.blue)
                    Text("Same as your bid")
                        .font(.subheadline)
                        .fontWeight(.semibold)
                        .foregroundColor(.blue)
                }
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 10)
            .background(priceDifference >= 0 ? Color.green.opacity(0.1) : Color.orange.opacity(0.1))
            .cornerRadius(10)

            // Earnings Preview
            HStack {
                Text("If you accept:")
                    .font(.subheadline)
                    .foregroundColor(Theme.textSecondary)
                Spacer()
                VStack(alignment: .trailing, spacing: 2) {
                    Text("$\(String(format: "%.2f", driverEarningsIfAccept))")
                        .font(.headline)
                        .fontWeight(.bold)
                        .foregroundColor(.green)
                    Text("after $\(String(format: "%.0f", platformFee)) fee")
                        .font(.caption2)
                        .foregroundColor(Theme.textSecondary)
                }
            }
        }
        .padding()
        .background(Theme.cardBackground)
        .cornerRadius(16)
    }

    // MARK: - Route Info

    private func routeInfo(request: RideRequestForBidding) -> some View {
        VStack(spacing: 12) {
            HStack {
                Text("Trip Details")
                    .font(.headline)
                    .foregroundColor(Theme.textPrimary)
                Spacer()
            }

            // Pickup
            HStack(spacing: 12) {
                Circle()
                    .fill(Color.green)
                    .frame(width: 10, height: 10)
                VStack(alignment: .leading, spacing: 2) {
                    Text("Pickup")
                        .font(.caption)
                        .foregroundColor(Theme.textSecondary)
                    Text(request.pickup.address)
                        .font(.subheadline)
                        .foregroundColor(Theme.textPrimary)
                        .lineLimit(2)
                }
                Spacer()
            }

            // Dropoff
            HStack(spacing: 12) {
                Circle()
                    .fill(Color.red)
                    .frame(width: 10, height: 10)
                VStack(alignment: .leading, spacing: 2) {
                    Text("Drop-off")
                        .font(.caption)
                        .foregroundColor(Theme.textSecondary)
                    Text(request.dropoff.address)
                        .font(.subheadline)
                        .foregroundColor(Theme.textPrimary)
                        .lineLimit(2)
                }
                Spacer()
            }

            // Stats
            HStack(spacing: 16) {
                if let distance = request.estimated_distance_km {
                    HStack(spacing: 4) {
                        Image(systemName: "arrow.left.and.right")
                            .font(.caption2)
                        Text(String(format: "%.1f mi", distance * 0.621371))
                            .font(.caption)
                    }
                    .foregroundColor(.blue)
                }

                if let duration = request.estimated_duration_minutes {
                    HStack(spacing: 4) {
                        Image(systemName: "clock.fill")
                            .font(.caption2)
                        Text("\(duration) min")
                            .font(.caption)
                    }
                    .foregroundColor(.blue)
                }
            }
        }
        .padding()
        .background(Theme.cardBackground)
        .cornerRadius(16)
    }

    // MARK: - New Counter Offer Section

    private var newCounterOfferSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Your New Price")
                .font(.headline)
                .foregroundColor(Theme.textPrimary)

            HStack {
                Text("$")
                    .font(.system(size: 28, weight: .bold))
                    .foregroundColor(Theme.textSecondary)

                TextField("0", text: $newCounterPrice)
                    .font(.system(size: 28, weight: .bold))
                    .keyboardType(.decimalPad)
                    .foregroundColor(Theme.textPrimary)
                    .focused($isPriceFocused)
            }
            .padding()
            .background(Color.white)
            .cornerRadius(12)
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(Color.blue, lineWidth: 2)
            )

            // Quick adjustments
            HStack(spacing: 8) {
                Button(action: {
                    newCounterPrice = String(format: "%.0f", customerCounterPrice)
                }) {
                    Text("Match Offer")
                        .font(.caption)
                        .fontWeight(.semibold)
                        .foregroundColor(.blue)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 8)
                        .background(Color.blue.opacity(0.1))
                        .cornerRadius(8)
                }

                Button(action: {
                    let middle = (originalPrice + customerCounterPrice) / 2
                    newCounterPrice = String(format: "%.0f", middle)
                }) {
                    Text("Split Difference")
                        .font(.caption)
                        .fontWeight(.semibold)
                        .foregroundColor(.blue)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 8)
                        .background(Color.blue.opacity(0.1))
                        .cornerRadius(8)
                }
            }

            if newCounterAmount > 0 {
                let newCounterFee = AppConfig.shared.calculateRidesharePlatformFee(fareAmount: newCounterAmount)
                HStack {
                    Text("You'll receive:")
                        .font(.subheadline)
                        .foregroundColor(Theme.textSecondary)
                    Spacer()
                    Text("$\(String(format: "%.2f", max(0, newCounterAmount - newCounterFee)))")
                        .font(.headline)
                        .fontWeight(.bold)
                        .foregroundColor(.green)
                }
            }
        }
        .padding()
        .background(Theme.cardBackground)
        .cornerRadius(16)
    }

    // MARK: - Platform Fee Info

    private var platformFeeInfo: some View {
        HStack(spacing: 12) {
            Image(systemName: "info.circle.fill")
                .foregroundColor(.green)

            Text("Only $\(String(format: "%.0f", platformFee)) connection fee deducted from your earnings")
                .font(.caption)
                .foregroundColor(Theme.textSecondary)
        }
        .padding()
        .background(Color.green.opacity(0.1))
        .cornerRadius(12)
    }

    // MARK: - Action Buttons

    private var actionButtons: some View {
        VStack(spacing: 12) {
            if showNewCounterInput {
                // Send New Counter
                Button(action: {
                    isPriceFocused = false
                    viewModel.submitNewCounterOffer(bid, newPrice: newCounterAmount)
                }) {
                    HStack {
                        if viewModel.isLoading {
                            ProgressView()
                                .tint(.white)
                        } else {
                            Image(systemName: "paperplane.fill")
                            Text("Send $\(String(format: "%.0f", newCounterAmount)) Offer")
                        }
                    }
                    .font(.headline)
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(newCounterAmount > 0 ? Color.blue : Color.gray)
                    .cornerRadius(16)
                }
                .disabled(newCounterAmount <= 0 || viewModel.isLoading)

                // Cancel Counter
                Button(action: {
                    withAnimation {
                        showNewCounterInput = false
                        newCounterPrice = ""
                    }
                }) {
                    Text("Cancel")
                        .font(.headline)
                        .foregroundColor(Theme.textSecondary)
                        .frame(maxWidth: .infinity)
                        .padding()
                }
            } else {
                // Accept Counter-Offer
                Button(action: {
                    viewModel.acceptCounterOffer(bid)
                }) {
                    HStack {
                        if viewModel.isLoading {
                            ProgressView()
                                .tint(.white)
                        } else {
                            Image(systemName: "checkmark.circle.fill")
                            Text("Accept $\(String(format: "%.0f", customerCounterPrice))")
                        }
                    }
                    .font(.headline)
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color.green)
                    .cornerRadius(16)
                }
                .disabled(viewModel.isLoading)

                // Counter with New Price
                Button(action: {
                    withAnimation {
                        showNewCounterInput = true
                        newCounterPrice = String(format: "%.0f", originalPrice)
                    }
                }) {
                    HStack {
                        Image(systemName: "arrow.triangle.2.circlepath")
                        Text("Counter with Different Price")
                    }
                    .font(.headline)
                    .foregroundColor(.blue)
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color.blue.opacity(0.1))
                    .cornerRadius(16)
                }

                // Reject
                Button(action: {
                    viewModel.rejectCounterOffer(bid)
                }) {
                    Text("Reject Offer")
                        .font(.headline)
                        .foregroundColor(.red)
                        .frame(maxWidth: .infinity)
                        .padding()
                }
            }
        }
        .padding()
        .background(Theme.cardBackground)
    }
}

// MARK: - Preview

#if DEBUG
struct CounterOfferResponseSheet_Previews: PreviewProvider {
    static var previews: some View {
        Text("Preview")
    }
}
#endif
