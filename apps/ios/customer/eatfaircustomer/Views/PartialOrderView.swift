import SwiftUI
import Combine
import EatFairShared

/// View shown when restaurant marks items as unavailable
/// Customer can accept partial order or reject for full refund
struct PartialOrderView: View {
    let orderId: Int
    let orderNumber: String
    let onDismiss: () -> Void

    @State private var modification: P2POrderModificationResponse?
    @State private var isLoading = true
    @State private var errorMessage: String?
    @State private var isProcessing = false
    @State private var showSuccessAlert = false
    @State private var successMessage = ""
    @State private var timeRemaining: Int = 0

    // Timer for countdown - stored for proper lifecycle management
    private let countdownTimer = Timer.publish(every: 1, on: .main, in: .common).autoconnect()

    var body: some View {
        NavigationView {
            ZStack {
                Color(.systemGroupedBackground)
                    .ignoresSafeArea()

                if isLoading {
                    ProgressView("Loading order details...")
                } else if let error = errorMessage {
                    VStack(spacing: 16) {
                        Image(systemName: "exclamationmark.triangle")
                            .font(.system(size: 50))
                            .foregroundColor(.orange)
                        Text(error)
                            .multilineTextAlignment(.center)
                        Button("Try Again") {
                            loadModification()
                        }
                        .buttonStyle(.bordered)
                    }
                    .padding()
                } else if let mod = modification, mod.hasPendingModification {
                    ScrollView {
                        VStack(spacing: 20) {
                            // Alert Banner
                            alertBanner

                            // Countdown Timer
                            if timeRemaining > 0 {
                                countdownView
                            }

                            // Unavailable Items
                            unavailableItemsSection

                            // Available Items
                            availableItemsSection

                            // Price Comparison
                            priceComparisonSection

                            // Action Buttons
                            actionButtonsSection
                        }
                        .padding()
                    }
                } else {
                    VStack(spacing: 16) {
                        Image(systemName: "checkmark.circle")
                            .font(.system(size: 50))
                            .foregroundColor(.green)
                        Text("No pending modifications")
                        Button("Close") {
                            onDismiss()
                        }
                        .buttonStyle(.borderedProminent)
                    }
                }
            }
            .navigationTitle("Order Update")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Close") {
                        onDismiss()
                    }
                }
            }
            .alert("Success", isPresented: $showSuccessAlert) {
                Button("OK") {
                    onDismiss()
                }
            } message: {
                Text(successMessage)
            }
        }
        .onAppear {
            loadModification()
        }
        .onReceive(countdownTimer) { _ in
            if timeRemaining > 0 {
                timeRemaining -= 1
            }
        }
    }

    // MARK: - Subviews

    private var alertBanner: some View {
        HStack(spacing: 12) {
            Image(systemName: "exclamationmark.triangle.fill")
                .foregroundColor(.orange)
                .font(.title2)

            VStack(alignment: .leading, spacing: 4) {
                Text("Some items are unavailable")
                    .font(.headline)
                if let name = modification?.restaurantName {
                    Text("\(name) cannot fulfill all items")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
            }
            Spacer()
        }
        .padding()
        .background(Color.orange.opacity(0.1))
        .cornerRadius(12)
    }

    private var countdownView: some View {
        VStack(spacing: 8) {
            Text("Time to decide")
                .font(.caption)
                .foregroundColor(.secondary)

            HStack(spacing: 4) {
                Image(systemName: "clock")
                    .foregroundColor(timeRemaining < 60 ? .red : .orange)
                Text(formatTime(timeRemaining))
                    .font(.title2)
                    .fontWeight(.bold)
                    .foregroundColor(timeRemaining < 60 ? .red : .orange)
                    .monospacedDigit()
            }

            Text("Order will auto-cancel if not responded")
                .font(.caption2)
                .foregroundColor(.secondary)
        }
        .padding()
        .frame(maxWidth: .infinity)
        .background(Color(.secondarySystemGroupedBackground))
        .cornerRadius(12)
    }

    private var unavailableItemsSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: "xmark.circle.fill")
                    .foregroundColor(.red)
                Text("Unavailable Items")
                    .font(.headline)
                Spacer()
            }

            if let items = modification?.unavailableItems {
                ForEach(items) { item in
                    HStack {
                        VStack(alignment: .leading) {
                            Text(item.name)
                                .strikethrough()
                                .foregroundColor(.secondary)
                            Text(item.reason.capitalized)
                                .font(.caption)
                                .foregroundColor(.red)
                        }
                        Spacer()
                        Text("-$\(item.price * Double(item.quantity), specifier: "%.2f")")
                            .foregroundColor(.red)
                    }
                    .padding(.vertical, 4)
                }
            }
        }
        .padding()
        .background(Color(.secondarySystemGroupedBackground))
        .cornerRadius(12)
    }

    private var availableItemsSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: "checkmark.circle.fill")
                    .foregroundColor(.green)
                Text("Available Items")
                    .font(.headline)
                Spacer()
                Text("\(modification?.availableCount ?? 0) items")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }

            if let items = modification?.availableItems {
                ForEach(items) { item in
                    HStack {
                        Text("\(item.quantity)x")
                            .foregroundColor(.secondary)
                        Text(item.name)
                        Spacer()
                        Text("$\(item.price * Double(item.quantity), specifier: "%.2f")")
                    }
                    .padding(.vertical, 4)
                }
            }
        }
        .padding()
        .background(Color(.secondarySystemGroupedBackground))
        .cornerRadius(12)
    }

    private var priceComparisonSection: some View {
        VStack(spacing: 12) {
            HStack {
                Text("Original Total")
                Spacer()
                Text("$\(modification?.originalTotal ?? 0, specifier: "%.2f")")
                    .strikethrough()
                    .foregroundColor(.secondary)
            }

            HStack {
                Text("New Total")
                    .fontWeight(.semibold)
                Spacer()
                Text("$\(modification?.newTotal ?? 0, specifier: "%.2f")")
                    .fontWeight(.semibold)
            }

            Divider()

            HStack {
                Text("Your Refund")
                    .foregroundColor(.green)
                    .fontWeight(.semibold)
                Spacer()
                Text("$\(modification?.partialRefundAmount ?? 0, specifier: "%.2f")")
                    .foregroundColor(.green)
                    .fontWeight(.bold)
            }

            Text("Platform fee remains $\(String(format: "%.2f", AppConfig.shared.foodCustomerFee))")
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .padding()
        .background(Color(.secondarySystemGroupedBackground))
        .cornerRadius(12)
    }

    private var actionButtonsSection: some View {
        VStack(spacing: 12) {
            // Accept Partial Order
            Button {
                respondToModification(accept: true)
            } label: {
                HStack {
                    if isProcessing {
                        ProgressView()
                            .tint(.white)
                    }
                    VStack {
                        Text("Accept Partial Order")
                            .fontWeight(.semibold)
                        Text("Get $\(modification?.partialRefundAmount ?? 0, specifier: "%.2f") refund")
                            .font(.caption)
                    }
                }
                .frame(maxWidth: .infinity)
                .padding()
                .background(Color.green)
                .foregroundColor(.white)
                .cornerRadius(12)
            }
            .disabled(isProcessing)

            // Reject - Full Refund
            Button {
                respondToModification(accept: false)
            } label: {
                VStack {
                    Text("Cancel Entire Order")
                        .fontWeight(.semibold)
                    Text("Full refund of $\(modification?.originalTotal ?? 0, specifier: "%.2f")")
                        .font(.caption)
                }
                .frame(maxWidth: .infinity)
                .padding()
                .background(Color(.secondarySystemGroupedBackground))
                .foregroundColor(.red)
                .cornerRadius(12)
                .overlay(
                    RoundedRectangle(cornerRadius: 12)
                        .stroke(Color.red, lineWidth: 1)
                )
            }
            .disabled(isProcessing)
        }
    }

    // MARK: - Helper Functions

    private func formatTime(_ seconds: Int) -> String {
        let minutes = seconds / 60
        let secs = seconds % 60
        return String(format: "%d:%02d", minutes, secs)
    }

    // MARK: - API Calls

    private func loadModification() {
        isLoading = true
        errorMessage = nil

        P2PAPIService.shared.getOrderModification(orderId: orderId) { result in
            isLoading = false
            switch result {
            case .success(let mod):
                self.modification = mod
                self.timeRemaining = mod.timeRemainingSeconds ?? 0
            case .failure(let error):
                let errMsg = error.localizedDescription.lowercased()
                if errMsg.contains("expired") || errMsg.contains("timeout") {
                    self.errorMessage = "This modification request has expired."
                } else {
                    self.errorMessage = "Unable to load modification details. Please try again."
                }
            }
        }
    }

    private func respondToModification(accept: Bool) {
        isProcessing = true
        let response = accept ? "accept_partial" : "reject_full_refund"

        P2PAPIService.shared.respondToOrderModification(orderId: orderId, response: response) { result in
            isProcessing = false
            switch result {
            case .success(_):
                if accept {
                    successMessage = "Order updated! You'll receive a $\(modification?.partialRefundAmount ?? 0) refund. Restaurant is preparing your order."
                } else {
                    successMessage = "Order cancelled. Full refund of $\(modification?.originalTotal ?? 0) has been issued."
                }
                showSuccessAlert = true
            case .failure(let error):
                let errMsg = error.localizedDescription.lowercased()
                if errMsg.contains("expired") || errMsg.contains("timeout") {
                    errorMessage = "Response window has expired. Please contact support."
                } else {
                    errorMessage = "Unable to process your response. Please try again."
                }
            }
        }
    }
}

#Preview {
    PartialOrderView(
        orderId: 1,
        orderNumber: "EF-2024-001",
        onDismiss: {}
    )
}
