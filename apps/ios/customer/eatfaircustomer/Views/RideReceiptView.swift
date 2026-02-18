//
//  RideReceiptView.swift
//  eatfaircustomer
//
//  Created by Dollor.ai
//  Ride receipt/invoice view with fare breakdown and driver info
//

import SwiftUI
import EatFairShared
import os

private let logger = Logger(subsystem: "com.dollorai.customer", category: "RideReceiptView")

// MARK: - Receipt Data Models (matches backend nested JSON)

struct RideReceiptResponse: Codable {
    let success: Bool
    let receipt: RideReceipt
}

struct RideReceipt: Codable {
    let rideId: Int
    let requestId: String?
    let status: String
    let route: ReceiptRoute
    let fareBreakdown: ReceiptFareBreakdown
    let payment: ReceiptPayment?
    let driver: ReceiptDriver?
    let timestamps: ReceiptTimestamps?

    enum CodingKeys: String, CodingKey {
        case rideId = "ride_id"
        case requestId = "request_id"
        case status
        case route
        case fareBreakdown = "fare_breakdown"
        case payment
        case driver
        case timestamps
    }

    // Convenience accessors matching the view's usage
    var pickupAddress: String { route.pickupAddress }
    var dropoffAddress: String { route.dropoffAddress }
    var baseFare: Double { fareBreakdown.baseFare }
    var platformFee: Double { fareBreakdown.platformFee }
    var tipAmount: Double { fareBreakdown.tip }
    var totalCharged: Double { fareBreakdown.total }
    var driverName: String? { driver?.name }
    var driverPhoto: String? { driver?.photoUrl }
    var driverRating: Double? { driver?.rating }
    var vehicleInfo: String? { driver?.vehicle }
    var licensePlate: String? { driver?.licensePlate }
    var requestedAt: String? { timestamps?.requestedAt }
    var completedAt: String? { timestamps?.completedAt }
    var distanceMiles: Double? { route.distanceMiles }
    var durationMinutes: Double? { route.durationMinutes }
}

struct ReceiptRoute: Codable {
    let pickupAddress: String
    let dropoffAddress: String
    let distanceMiles: Double?
    let durationMinutes: Double?

    enum CodingKeys: String, CodingKey {
        case pickupAddress = "pickup_address"
        case dropoffAddress = "dropoff_address"
        case distanceMiles = "distance_miles"
        case durationMinutes = "duration_minutes"
    }
}

struct ReceiptFareBreakdown: Codable {
    let baseFare: Double
    let platformFee: Double
    let tip: Double
    let total: Double

    enum CodingKeys: String, CodingKey {
        case baseFare = "base_fare"
        case platformFee = "platform_fee"
        case tip
        case total
    }
}

struct ReceiptPayment: Codable {
    let status: String?
    let paidAt: String?

    enum CodingKeys: String, CodingKey {
        case status
        case paidAt = "paid_at"
    }
}

struct ReceiptDriver: Codable {
    let id: Int?
    let name: String?
    let photoUrl: String?
    let rating: Double?
    let vehicle: String?
    let licensePlate: String?

    enum CodingKeys: String, CodingKey {
        case id, name, rating, vehicle
        case photoUrl = "photo_url"
        case licensePlate = "license_plate"
    }
}

struct ReceiptTimestamps: Codable {
    let requestedAt: String?
    let matchedAt: String?
    let completedAt: String?

    enum CodingKeys: String, CodingKey {
        case requestedAt = "requested_at"
        case matchedAt = "matched_at"
        case completedAt = "completed_at"
    }
}

// MARK: - Ride Receipt View

struct RideReceiptView: View {
    let rideId: Int

    @Environment(\.dismiss) var dismiss
    @State private var receipt: RideReceipt?
    @State private var isLoading = true
    @State private var errorMessage: String?
    @State private var showDisputeSheet = false
    @State private var emailSent = false
    @State private var isSendingEmail = false

    private let baseURL = AppConfig.shared.p2pAPIBaseURL

    var body: some View {
        NavigationView {
            Group {
                if isLoading {
                    ProgressView("Loading receipt...")
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if let error = errorMessage {
                    errorView(message: error)
                } else if let receipt = receipt {
                    receiptContent(receipt)
                }
            }
            .navigationTitle("Ride Receipt")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Done") { dismiss() }
                }
            }
        }
        .onAppear { fetchReceipt() }
        .sheet(isPresented: $showDisputeSheet) {
            DisputeRideView(rideRequestId: rideId)
        }
    }

    // MARK: - Receipt Content

    @ViewBuilder
    private func receiptContent(_ receipt: RideReceipt) -> some View {
        ScrollView {
            VStack(spacing: 20) {
                // Header
                VStack(spacing: 8) {
                    Image(systemName: "checkmark.circle.fill")
                        .resizable()
                        .frame(width: 48, height: 48)
                        .foregroundColor(.green)

                    Text("Ride Complete")
                        .font(.title2)
                        .fontWeight(.bold)

                    Text("Ride #\(receipt.rideId)")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
                .padding(.top)

                // Route Summary
                routeSummaryCard(receipt)

                // Timestamps
                if receipt.requestedAt != nil || receipt.completedAt != nil {
                    timestampsCard(receipt)
                }

                // Driver Info
                driverInfoCard(receipt)

                // Fare Breakdown
                fareBreakdownCard(receipt)

                // Action Buttons
                actionButtons

                Spacer(minLength: 20)
            }
            .padding()
        }
    }

    // MARK: - Route Summary Card

    @ViewBuilder
    private func routeSummaryCard(_ receipt: RideReceipt) -> some View {
        VStack(spacing: 0) {
            HStack(alignment: .top, spacing: 12) {
                VStack(spacing: 4) {
                    Circle()
                        .fill(Color.green)
                        .frame(width: 12, height: 12)

                    Rectangle()
                        .fill(Color.gray.opacity(0.3))
                        .frame(width: 2, height: 30)

                    Circle()
                        .fill(Color.red)
                        .frame(width: 12, height: 12)
                }

                VStack(alignment: .leading, spacing: 16) {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Pickup")
                            .font(.caption)
                            .foregroundColor(.secondary)
                        Text(receipt.pickupAddress)
                            .font(.subheadline)
                            .fontWeight(.medium)
                    }

                    VStack(alignment: .leading, spacing: 2) {
                        Text("Dropoff")
                            .font(.caption)
                            .foregroundColor(.secondary)
                        Text(receipt.dropoffAddress)
                            .font(.subheadline)
                            .fontWeight(.medium)
                    }
                }

                Spacer()
            }
            .padding()

            if let distance = receipt.distanceMiles, let duration = receipt.durationMinutes {
                Divider()
                HStack {
                    Label(String(format: "%.1f mi", distance), systemImage: "map")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    Spacer()
                    Label(String(format: "%.0f min", duration), systemImage: "clock")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                .padding()
            }
        }
        .background(Color(.systemGray6))
        .cornerRadius(12)
    }

    // MARK: - Timestamps Card

    @ViewBuilder
    private func timestampsCard(_ receipt: RideReceipt) -> some View {
        VStack(spacing: 12) {
            HStack {
                Text("Trip Timeline")
                    .font(.headline)
                Spacer()
            }

            if let requested = receipt.requestedAt {
                HStack {
                    Image(systemName: "clock")
                        .foregroundColor(.blue)
                        .frame(width: 24)
                    Text("Requested")
                        .foregroundColor(.secondary)
                    Spacer()
                    Text(formatTimestamp(requested))
                        .font(.subheadline)
                        .fontWeight(.medium)
                }
            }

            if let completed = receipt.completedAt {
                HStack {
                    Image(systemName: "checkmark.circle")
                        .foregroundColor(.green)
                        .frame(width: 24)
                    Text("Completed")
                        .foregroundColor(.secondary)
                    Spacer()
                    Text(formatTimestamp(completed))
                        .font(.subheadline)
                        .fontWeight(.medium)
                }
            }
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(12)
    }

    // MARK: - Driver Info Card

    @ViewBuilder
    private func driverInfoCard(_ receipt: RideReceipt) -> some View {
        VStack(spacing: 12) {
            HStack {
                Text("Driver")
                    .font(.headline)
                Spacer()
            }

            HStack(spacing: 14) {
                // Driver Photo
                if let photoURL = receipt.driverPhoto, let url = URL(string: photoURL) {
                    AsyncImage(url: url) { image in
                        image.resizable()
                            .aspectRatio(contentMode: .fill)
                    } placeholder: {
                        Image(systemName: "person.circle.fill")
                            .resizable()
                            .foregroundColor(.gray)
                    }
                    .frame(width: 56, height: 56)
                    .clipShape(Circle())
                } else {
                    Image(systemName: "person.circle.fill")
                        .resizable()
                        .frame(width: 56, height: 56)
                        .foregroundColor(.gray)
                }

                VStack(alignment: .leading, spacing: 4) {
                    Text(receipt.driverName ?? "Driver")
                        .font(.headline)

                    if let rating = receipt.driverRating, rating > 0 {
                        HStack(spacing: 4) {
                            Image(systemName: "star.fill")
                                .font(.caption)
                                .foregroundColor(.yellow)
                            Text(String(format: "%.1f", rating))
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                        }
                    }
                }

                Spacer()

                // Vehicle Info
                VStack(alignment: .trailing, spacing: 4) {
                    if let vehicle = receipt.vehicleInfo, !vehicle.isEmpty {
                        Text(vehicle)
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    if let plate = receipt.licensePlate {
                        Text(plate)
                            .font(.caption)
                            .fontWeight(.bold)
                            .padding(.horizontal, 6)
                            .padding(.vertical, 2)
                            .background(Color(.systemGray5))
                            .cornerRadius(4)
                    }
                }
            }
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(12)
    }

    // MARK: - Fare Breakdown Card

    @ViewBuilder
    private func fareBreakdownCard(_ receipt: RideReceipt) -> some View {
        VStack(spacing: 12) {
            HStack {
                Text("Fare Breakdown")
                    .font(.headline)
                Spacer()
            }

            VStack(spacing: 8) {
                fareRow(label: "Base Fare", amount: receipt.baseFare)

                fareRow(label: "Platform Fee", amount: receipt.platformFee)

                if receipt.tipAmount > 0 {
                    fareRow(label: "Tip", amount: receipt.tipAmount, color: .green)
                }

                Divider()

                HStack {
                    Text("Total")
                        .font(.headline)
                    Spacer()
                    Text("$\(String(format: "%.2f", receipt.totalCharged))")
                        .font(.title3)
                        .fontWeight(.bold)
                        .foregroundColor(.green)
                }
            }
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(12)
    }

    @ViewBuilder
    private func fareRow(label: String, amount: Double, color: Color = .primary) -> some View {
        HStack {
            Text(label)
                .foregroundColor(.secondary)
            Spacer()
            Text("$\(String(format: "%.2f", amount))")
                .fontWeight(.medium)
                .foregroundColor(color)
        }
    }

    // MARK: - Action Buttons

    @ViewBuilder
    private var actionButtons: some View {
        VStack(spacing: 12) {
            // Email Receipt
            Button {
                sendEmailReceipt()
            } label: {
                HStack {
                    if isSendingEmail {
                        ProgressView()
                            .tint(.white)
                    } else {
                        Image(systemName: emailSent ? "checkmark.circle.fill" : "envelope.fill")
                    }
                    Text(emailSent ? "Receipt Sent" : "Email Receipt")
                }
                .font(.headline)
                .foregroundColor(.white)
                .frame(maxWidth: .infinity)
                .padding()
                .background(emailSent ? Color.gray : Color.green)
                .cornerRadius(12)
            }
            .disabled(isSendingEmail || emailSent)

            // Report Issue
            Button {
                showDisputeSheet = true
            } label: {
                HStack {
                    Image(systemName: "exclamationmark.triangle")
                    Text("Report Issue")
                }
                .font(.subheadline)
                .foregroundColor(.red)
                .frame(maxWidth: .infinity)
                .padding()
                .background(Color.red.opacity(0.1))
                .cornerRadius(12)
            }
        }
    }

    // MARK: - Error View

    @ViewBuilder
    private func errorView(message: String) -> some View {
        VStack(spacing: 16) {
            Image(systemName: "exclamationmark.triangle.fill")
                .resizable()
                .frame(width: 48, height: 48)
                .foregroundColor(.orange)

            Text("Unable to Load Receipt")
                .font(.headline)

            Text(message)
                .font(.subheadline)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)

            Button("Retry") { fetchReceipt() }
                .buttonStyle(.borderedProminent)
                .tint(.green)
        }
        .padding()
    }

    // MARK: - Helpers

    private func formatTimestamp(_ timestamp: String) -> String {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let date = formatter.date(from: timestamp) {
            let displayFormatter = DateFormatter()
            displayFormatter.dateStyle = .medium
            displayFormatter.timeStyle = .short
            return displayFormatter.string(from: date)
        }
        // Fallback: try without fractional seconds
        formatter.formatOptions = [.withInternetDateTime]
        if let date = formatter.date(from: timestamp) {
            let displayFormatter = DateFormatter()
            displayFormatter.dateStyle = .medium
            displayFormatter.timeStyle = .short
            return displayFormatter.string(from: date)
        }
        return timestamp
    }

    // MARK: - API Calls

    private func fetchReceipt() {
        isLoading = true
        errorMessage = nil

        guard let url = URL(string: "\(baseURL)/api/rides/request/\(rideId)/receipt") else {
            errorMessage = "Invalid URL"
            isLoading = false
            return
        }

        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        if let token = SecureStorage.shared.customerAccessToken {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        URLSession.shared.dataTask(with: request) { data, response, error in
            DispatchQueue.main.async {
                isLoading = false

                if let error = error {
                    errorMessage = error.localizedDescription
                    logger.error("[RideReceiptView] Fetch failed: \(error.localizedDescription)")
                    return
                }

                guard let httpResponse = response as? HTTPURLResponse else {
                    errorMessage = "Invalid server response"
                    return
                }

                guard let data = data else {
                    errorMessage = "No data received"
                    return
                }

                if httpResponse.statusCode >= 400 {
                    if let errorJson = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                       let detail = errorJson["detail"] as? String {
                        errorMessage = detail
                    } else {
                        errorMessage = "Server error (\(httpResponse.statusCode))"
                    }
                    return
                }

                do {
                    let decoder = JSONDecoder()
                    let wrapper = try decoder.decode(RideReceiptResponse.self, from: data)
                    receipt = wrapper.receipt
                    logger.info("[RideReceiptView] Receipt loaded for ride \(rideId)")
                } catch {
                    errorMessage = "Failed to parse receipt data"
                    logger.error("[RideReceiptView] Decode error: \(error)")
                }
            }
        }.resume()
    }

    private func sendEmailReceipt() {
        isSendingEmail = true

        guard let url = URL(string: "\(baseURL)/api/rides/request/\(rideId)/email-receipt") else {
            isSendingEmail = false
            return
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        if let token = SecureStorage.shared.customerAccessToken {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        URLSession.shared.dataTask(with: request) { _, response, error in
            DispatchQueue.main.async {
                isSendingEmail = false

                if error == nil,
                   let httpResponse = response as? HTTPURLResponse,
                   httpResponse.statusCode < 400 {
                    emailSent = true
                    logger.info("[RideReceiptView] Email receipt sent for ride \(rideId)")
                } else {
                    logger.error("[RideReceiptView] Email receipt failed")
                }
            }
        }.resume()
    }
}
