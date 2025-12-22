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

    private var platformFee: Double { AppConfig.shared.rideshareTier1Fee }

    private var suggestedPrice: Double {
        request.suggested_price ?? 0
    }

    private var proposedAmount: Double {
        Double(proposedPrice) ?? 0
    }

    private var driverEarnings: Double {
        max(0, proposedAmount - platformFee)
    }

    private var isValidBid: Bool {
        proposedAmount > platformFee
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

            // Price Input
            HStack {
                Text("$")
                    .font(.system(size: 32, weight: .bold))
                    .foregroundColor(Theme.textSecondary)

                TextField("0", text: $proposedPrice)
                    .font(.system(size: 32, weight: .bold))
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

            // Quick Price Buttons
            HStack(spacing: 8) {
                ForEach([-5, 0, 5, 10], id: \.self) { adjustment in
                    Button(action: {
                        let newPrice = max(platformFee + 1, suggestedPrice + Double(adjustment))
                        proposedPrice = String(format: "%.0f", newPrice)
                    }) {
                        Text(adjustment >= 0 ? "+$\(adjustment)" : "-$\(abs(adjustment))")
                            .font(.caption)
                            .fontWeight(.semibold)
                            .foregroundColor(.blue)
                            .padding(.horizontal, 12)
                            .padding(.vertical, 8)
                            .background(Color.blue.opacity(0.1))
                            .cornerRadius(8)
                    }
                }
            }

            // Earnings Preview
            if proposedAmount > 0 {
                HStack {
                    Text("You earn after $\(String(format: "%.0f", platformFee)) fee:")
                        .font(.subheadline)
                        .foregroundColor(Theme.textSecondary)
                    Spacer()
                    Text("$\(String(format: "%.2f", driverEarnings))")
                        .font(.headline)
                        .fontWeight(.bold)
                        .foregroundColor(driverEarnings > 0 ? .green : .red)
                }
                .padding(.top, 4)
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
        HStack(spacing: 12) {
            Image(systemName: "info.circle.fill")
                .foregroundColor(.green)

            VStack(alignment: .leading, spacing: 4) {
                Text("Only $\(String(format: "%.0f", platformFee)) connection fee!")
                    .font(.subheadline)
                    .fontWeight(.semibold)
                    .foregroundColor(.green)

                Text("You set your own price. We only charge a small matchmaking fee.")
                    .font(.caption)
                    .foregroundColor(Theme.textSecondary)
            }
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

        // Dismiss after short delay to show success
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
            if !viewModel.showError {
                dismiss()
                onDismiss()
            }
        }
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
