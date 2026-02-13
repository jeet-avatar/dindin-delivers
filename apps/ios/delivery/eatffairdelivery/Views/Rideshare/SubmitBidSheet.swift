import SwiftUI
import MapKit
import EatFairShared

/// SubmitBidSheet - Submit a competitive bid on a ride request
/// Matches web app RideBidding.tsx bid submission modal
struct SubmitBidSheet: View {
    let request: RideRequestForBidding
    @ObservedObject var viewModel: RideBiddingViewModel
    let onDismiss: () -> Void

    @Environment(\.dismiss) private var dismiss
    @State private var proposedPrice: String = ""
    @State private var estimatedArrival: Int = 5
    @State private var message: String = ""
    @FocusState private var isPriceFocused: Bool

    private var platformFee: Double {
        viewModel.getPlatformFee(for: proposedAmount)
    }

    private var suggestedPrice: Double {
        request.suggested_price ?? 0
    }

    private var proposedAmount: Double {
        Double(proposedPrice) ?? 0
    }

    private var driverEarnings: Double {
        viewModel.calculateEarnings(proposedPrice: proposedAmount)
    }

    private var isValidBid: Bool {
        proposedAmount > platformFee
    }

    private var suggestedBids: (quickAccept: Double, fairPrice: Double, premium: Double) {
        viewModel.calculateSuggestedBids(baseFare: suggestedPrice)
    }

    private var earningsPerMile: Double? {
        viewModel.calculateEarningsPerMile(proposedPrice: proposedAmount, distanceKm: request.estimated_distance_km)
    }

    private var earningsPerHour: Double? {
        viewModel.calculateEarningsPerHour(proposedPrice: proposedAmount, durationMinutes: request.estimated_duration_minutes)
    }

    private var keepPercentage: Double {
        viewModel.calculateDriverKeepPercentage(proposedPrice: proposedAmount)
    }

    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 24) {
                    // Map Preview
                    mapPreview
                        .frame(height: 180)
                        .cornerRadius(16)
                        .padding(.horizontal)

                    // Route Summary
                    routeSummary
                        .padding(.horizontal)

                    // Price Section
                    priceSection
                        .padding(.horizontal)

                    // Arrival Time
                    arrivalSection
                        .padding(.horizontal)

                    // Optional Message
                    messageSection
                        .padding(.horizontal)

                    // Platform Fee Info
                    platformFeeInfo
                        .padding(.horizontal)
                }
                .padding(.vertical)
            }
            .background(Theme.backgroundGrey.ignoresSafeArea())
            .navigationTitle("Submit Your Bid")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") {
                        dismiss()
                        onDismiss()
                    }
                }
            }
            .safeAreaInset(edge: .bottom) {
                submitButton
            }
            .onAppear {
                // Pre-fill with suggested price
                proposedPrice = String(format: "%.0f", suggestedPrice)
            }
            .onChange(of: viewModel.showSuccess) { _, success in
                // Dismiss sheet when bid is successfully submitted
                if success {
                    DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
                        dismiss()
                        onDismiss()
                    }
                }
            }
        }
    }

    // MARK: - Map Preview

    private var mapPreview: some View {
        Map {
            // Pickup
            Annotation("Pickup", coordinate: CLLocationCoordinate2D(
                latitude: request.pickup.latitude,
                longitude: request.pickup.longitude
            )) {
                Image(systemName: "person.fill")
                    .foregroundColor(.white)
                    .padding(8)
                    .background(Color.green)
                    .clipShape(Circle())
            }

            // Dropoff
            Annotation("Dropoff", coordinate: CLLocationCoordinate2D(
                latitude: request.dropoff.latitude,
                longitude: request.dropoff.longitude
            )) {
                Image(systemName: "mappin.circle.fill")
                    .foregroundColor(.white)
                    .padding(8)
                    .background(Color.red)
                    .clipShape(Circle())
            }
        }
        .mapStyle(.standard)
    }

    // MARK: - Route Summary

    private var routeSummary: some View {
        VStack(spacing: 12) {
            // Pickup
            HStack(spacing: 12) {
                Circle()
                    .fill(Color.green)
                    .frame(width: 12, height: 12)

                VStack(alignment: .leading, spacing: 2) {
                    Text("Pickup")
                        .font(.caption)
                        .foregroundColor(Theme.textSecondary)
                    Text(request.pickup.address)
                        .font(.subheadline)
                        .foregroundColor(Theme.textPrimary)
                        .lineLimit(1)
                }

                Spacer()
            }

            // Connector
            HStack {
                Rectangle()
                    .fill(Color.blue.opacity(0.3))
                    .frame(width: 2, height: 20)
                    .padding(.leading, 5)
                Spacer()
            }

            // Dropoff
            HStack(spacing: 12) {
                Circle()
                    .fill(Color.red)
                    .frame(width: 12, height: 12)

                VStack(alignment: .leading, spacing: 2) {
                    Text("Drop-off")
                        .font(.caption)
                        .foregroundColor(Theme.textSecondary)
                    Text(request.dropoff.address)
                        .font(.subheadline)
                        .foregroundColor(Theme.textPrimary)
                        .lineLimit(1)
                }

                Spacer()
            }

            // Trip Stats
            HStack(spacing: 20) {
                if let distance = request.estimated_distance_km {
                    HStack(spacing: 4) {
                        Image(systemName: "arrow.left.and.right")
                            .font(.caption)
                        Text(String(format: "%.1f mi", distance * 0.621371))
                            .font(.caption)
                            .fontWeight(.semibold)
                    }
                    .foregroundColor(.blue)
                }

                if let duration = request.estimated_duration_minutes {
                    HStack(spacing: 4) {
                        Image(systemName: "clock.fill")
                            .font(.caption)
                        Text("\(duration) min")
                            .font(.caption)
                            .fontWeight(.semibold)
                    }
                    .foregroundColor(.blue)
                }
            }
            .padding(.top, 8)
        }
        .padding()
        .background(Theme.cardBackground)
        .cornerRadius(16)
    }

    // MARK: - Price Section

    private var priceSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            // Header
            HStack {
                Text("Your Bid Price")
                    .font(.headline)
                    .foregroundColor(Theme.textPrimary)

                Spacer()

                Text("Suggested: $\(String(format: "%.0f", suggestedPrice))")
                    .font(.subheadline)
                    .foregroundColor(.blue)
            }

            // Suggested Bid Options - Quick Accept 92%, Fair Price 100%, Premium 108%
            VStack(spacing: 8) {
                Text("Suggested Bids")
                    .font(.subheadline)
                    .fontWeight(.semibold)
                    .foregroundColor(Theme.textSecondary)
                    .frame(maxWidth: .infinity, alignment: .leading)

                HStack(spacing: 8) {
                    // Quick Accept - 92% (8% discount to win fast)
                    BidOptionButton(
                        title: "Quick Accept",
                        subtitle: "92%",
                        amount: suggestedBids.quickAccept,
                        earnings: viewModel.calculateEarnings(proposedPrice: suggestedBids.quickAccept),
                        color: .orange,
                        isSelected: proposedAmount == suggestedBids.quickAccept,
                        action: {
                            proposedPrice = String(format: "%.0f", suggestedBids.quickAccept)
                        }
                    )

                    // Fair Price - 100% (market rate)
                    BidOptionButton(
                        title: "Fair Price",
                        subtitle: "100%",
                        amount: suggestedBids.fairPrice,
                        earnings: viewModel.calculateEarnings(proposedPrice: suggestedBids.fairPrice),
                        color: .blue,
                        isSelected: proposedAmount == suggestedBids.fairPrice,
                        action: {
                            proposedPrice = String(format: "%.0f", suggestedBids.fairPrice)
                        }
                    )

                    // Premium - 108% (8% premium for guaranteed higher earnings)
                    BidOptionButton(
                        title: "Premium",
                        subtitle: "108%",
                        amount: suggestedBids.premium,
                        earnings: viewModel.calculateEarnings(proposedPrice: suggestedBids.premium),
                        color: .green,
                        isSelected: proposedAmount == suggestedBids.premium,
                        action: {
                            proposedPrice = String(format: "%.0f", suggestedBids.premium)
                        }
                    )
                }
            }

            // Price Input - Custom bid
            VStack(alignment: .leading, spacing: 8) {
                Text("Custom Bid")
                    .font(.subheadline)
                    .fontWeight(.semibold)
                    .foregroundColor(Theme.textSecondary)

                HStack {
                    Text("$")
                        .font(.system(size: 28, weight: .bold))
                        .foregroundColor(Theme.textSecondary)

                    TextField("0", text: $proposedPrice)
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
            }

            // Earnings Breakdown
            if proposedAmount > 0 {
                VStack(spacing: 12) {
                    // Keep percentage messaging
                    HStack {
                        Image(systemName: "checkmark.circle.fill")
                            .foregroundColor(.green)
                        Text("Keep \(String(format: "%.0f", keepPercentage))%+ of every fare")
                            .font(.subheadline)
                            .fontWeight(.bold)
                            .foregroundColor(.green)
                        Spacer()
                    }

                    Divider()

                    // Driver earnings
                    HStack {
                        Text("You earn:")
                            .font(.subheadline)
                            .foregroundColor(Theme.textSecondary)
                        Spacer()
                        Text("$\(String(format: "%.2f", driverEarnings))")
                            .font(.headline)
                            .fontWeight(.bold)
                            .foregroundColor(.green)
                    }

                    // Earnings per mile
                    if let perMile = earningsPerMile {
                        HStack {
                            Image(systemName: "arrow.left.and.right")
                                .font(.caption)
                                .foregroundColor(Theme.textSecondary)
                            Text("Per mile:")
                                .font(.subheadline)
                                .foregroundColor(Theme.textSecondary)
                            Spacer()
                            Text("$\(String(format: "%.2f", perMile))")
                                .font(.subheadline)
                                .fontWeight(.semibold)
                                .foregroundColor(Theme.textPrimary)
                        }
                    }

                    // Earnings per hour
                    if let perHour = earningsPerHour {
                        HStack {
                            Image(systemName: "clock.fill")
                                .font(.caption)
                                .foregroundColor(Theme.textSecondary)
                            Text("Per hour:")
                                .font(.subheadline)
                                .foregroundColor(Theme.textSecondary)
                            Spacer()
                            Text("$\(String(format: "%.2f", perHour))")
                                .font(.subheadline)
                                .fontWeight(.semibold)
                                .foregroundColor(Theme.textPrimary)
                        }
                    }

                    Divider()

                    // Platform fee transparency
                    HStack {
                        Text("Platform fee:")
                            .font(.caption)
                            .foregroundColor(Theme.textSecondary)
                        Spacer()
                        Text("$\(String(format: "%.0f", platformFee))")
                            .font(.caption)
                            .foregroundColor(Theme.textSecondary)
                    }
                }
                .padding()
                .background(Color.green.opacity(0.05))
                .cornerRadius(12)
            }
        }
        .padding()
        .background(Theme.cardBackground)
        .cornerRadius(16)
    }

    // MARK: - Arrival Section

    private var arrivalSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Estimated Arrival")
                .font(.headline)
                .foregroundColor(Theme.textPrimary)

            HStack(spacing: 8) {
                ForEach([3, 5, 10, 15], id: \.self) { minutes in
                    Button(action: { estimatedArrival = minutes }) {
                        Text("\(minutes) min")
                            .font(.subheadline)
                            .fontWeight(.semibold)
                            .foregroundColor(estimatedArrival == minutes ? .white : .blue)
                            .padding(.horizontal, 16)
                            .padding(.vertical, 10)
                            .background(estimatedArrival == minutes ? Color.blue : Color.blue.opacity(0.1))
                            .cornerRadius(10)
                    }
                }
            }
        }
        .padding()
        .background(Theme.cardBackground)
        .cornerRadius(16)
    }

    // MARK: - Message Section

    private var messageSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("Message to Rider")
                    .font(.headline)
                    .foregroundColor(Theme.textPrimary)
                Text("(Optional)")
                    .font(.caption)
                    .foregroundColor(Theme.textSecondary)
            }

            TextField("e.g., I'm nearby and can pick you up quickly!", text: $message, axis: .vertical)
                .lineLimit(2...4)
                .padding()
                .background(Color.white)
                .cornerRadius(12)
                .overlay(
                    RoundedRectangle(cornerRadius: 12)
                        .stroke(Theme.lightGrey, lineWidth: 1)
                )
        }
        .padding()
        .background(Theme.cardBackground)
        .cornerRadius(16)
    }

    // MARK: - Platform Fee Info

    private var platformFeeInfo: some View {
        VStack(spacing: 12) {
            HStack(spacing: 12) {
                Image(systemName: "info.circle.fill")
                    .foregroundColor(.green)
                    .font(.title3)

                VStack(alignment: .leading, spacing: 4) {
                    Text("Keep 96%+ of every fare")
                        .font(.subheadline)
                        .fontWeight(.bold)
                        .foregroundColor(.green)

                    Text("$1-3 flat fee, NOT a percentage")
                        .font(.caption)
                        .fontWeight(.semibold)
                        .foregroundColor(.green)
                }

                Spacer()
            }

            Divider()

            VStack(alignment: .leading, spacing: 8) {
                HStack {
                    Text("Platform Fee Structure:")
                        .font(.caption)
                        .fontWeight(.semibold)
                        .foregroundColor(Theme.textPrimary)
                    Spacer()
                }

                HStack {
                    Circle()
                        .fill(Color.green)
                        .frame(width: 6, height: 6)
                    Text("Fares up to $35:")
                        .font(.caption)
                        .foregroundColor(Theme.textSecondary)
                    Spacer()
                    Text("$1 flat")
                        .font(.caption)
                        .fontWeight(.semibold)
                        .foregroundColor(.green)
                }

                HStack {
                    Circle()
                        .fill(Color.green)
                        .frame(width: 6, height: 6)
                    Text("Fares $35.01-$70:")
                        .font(.caption)
                        .foregroundColor(Theme.textSecondary)
                    Spacer()
                    Text("$2 flat")
                        .font(.caption)
                        .fontWeight(.semibold)
                        .foregroundColor(.green)
                }

                HStack {
                    Circle()
                        .fill(Color.green)
                        .frame(width: 6, height: 6)
                    Text("Fares over $70:")
                        .font(.caption)
                        .foregroundColor(Theme.textSecondary)
                    Spacer()
                    Text("$3 flat")
                        .font(.caption)
                        .fontWeight(.semibold)
                        .foregroundColor(.green)
                }
            }

            Text("You control your earnings. No percentage commissions!")
                .font(.caption)
                .foregroundColor(Theme.textSecondary)
                .frame(maxWidth: .infinity, alignment: .leading)
        }
        .padding()
        .background(Color.green.opacity(0.1))
        .cornerRadius(12)
    }

    // MARK: - Submit Button

    private var submitButton: some View {
        VStack(spacing: 12) {
            Button(action: submitBid) {
                HStack {
                    if viewModel.isSubmittingBid {
                        ProgressView()
                            .tint(.white)
                    } else {
                        Image(systemName: "hand.raised.fill")
                        Text("Submit Bid - $\(String(format: "%.0f", proposedAmount))")
                    }
                }
                .font(.headline)
                .foregroundColor(.white)
                .frame(maxWidth: .infinity)
                .padding()
                .background(isValidBid && !viewModel.isSubmittingBid ? Color.blue : Color.gray)
                .cornerRadius(16)
            }
            .disabled(!isValidBid || viewModel.isSubmittingBid)

            if !isValidBid && proposedAmount > 0 {
                Text("Price must be greater than $\(String(format: "%.0f", platformFee)) platform fee")
                    .font(.caption)
                    .foregroundColor(.red)
            }
        }
        .padding()
        .background(Theme.cardBackground)
    }

    // MARK: - Submit Bid Action

    private func submitBid() {
        isPriceFocused = false

        viewModel.submitBid(
            requestId: request.id,
            proposedPrice: proposedAmount,
            estimatedArrivalMinutes: estimatedArrival,
            message: message.isEmpty ? nil : message
        )
    }
}

// MARK: - Bid Option Button Component

struct BidOptionButton: View {
    let title: String
    let subtitle: String
    let amount: Double
    let earnings: Double
    let color: Color
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(spacing: 6) {
                Text(title)
                    .font(.caption)
                    .fontWeight(.bold)
                    .foregroundColor(isSelected ? .white : color)

                Text(subtitle)
                    .font(.caption2)
                    .foregroundColor(isSelected ? .white.opacity(0.9) : color.opacity(0.8))

                Text("$\(String(format: "%.0f", amount))")
                    .font(.headline)
                    .fontWeight(.bold)
                    .foregroundColor(isSelected ? .white : color)

                Text("Earn $\(String(format: "%.0f", earnings))")
                    .font(.caption2)
                    .foregroundColor(isSelected ? .white.opacity(0.9) : Theme.textSecondary)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 12)
            .padding(.horizontal, 4)
            .background(isSelected ? color : color.opacity(0.1))
            .cornerRadius(12)
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(color, lineWidth: isSelected ? 0 : 2)
            )
        }
        .buttonStyle(PlainButtonStyle())
    }
}

// MARK: - Preview

#if DEBUG
struct SubmitBidSheet_Previews: PreviewProvider {
    static var previews: some View {
        Text("Preview")
    }
}
#endif
