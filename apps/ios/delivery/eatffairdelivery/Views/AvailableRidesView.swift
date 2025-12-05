import SwiftUI
import MapKit
import EatFairShared

/// Available Rides View - Shows P2P ride requests for drivers
/// Similar to Uber driver app showing passenger pickup requests
struct AvailableRidesView: View {
    @ObservedObject var viewModel: RideViewModel
    @State private var showMapView = false

    var body: some View {
        NavigationView {
            ZStack {
                Theme.backgroundGrey.ignoresSafeArea()

                if viewModel.isLoading && viewModel.availableRides.isEmpty {
                    ProgressView("Finding rides...")
                        .foregroundColor(Theme.textSecondary)
                } else if viewModel.availableRides.isEmpty {
                    NoRidesAvailableView(onRefresh: { viewModel.fetchAvailableRides() })
                } else {
                    ScrollView {
                        VStack(spacing: 16) {
                            // Stats header
                            RideStatsHeader(viewModel: viewModel)
                                .padding(.horizontal)

                            // Available rides list
                            ForEach(viewModel.availableRides) { ride in
                                RideRequestCard(ride: ride) {
                                    viewModel.acceptRide(ride)
                                }
                                .padding(.horizontal)
                            }
                        }
                        .padding(.vertical)
                    }
                    .refreshable {
                        viewModel.fetchAvailableRides()
                    }
                }
            }
            .navigationTitle("Available Rides")
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(action: { viewModel.fetchAvailableRides() }) {
                        Image(systemName: "arrow.clockwise")
                            .foregroundColor(Theme.statusInfo)
                    }
                }
            }
            .alert("Error", isPresented: $viewModel.showError) {
                Button("OK", role: .cancel) { }
            } message: {
                Text(viewModel.errorMessage ?? "An error occurred")
            }
        }
    }
}

// MARK: - Ride Stats Header
struct RideStatsHeader: View {
    @ObservedObject var viewModel: RideViewModel

    var body: some View {
        HStack(spacing: 16) {
            RideStatPill(
                icon: "car.fill",
                value: "\(viewModel.availableRides.count)",
                label: "Available",
                color: Theme.statusInfo
            )

            RideStatPill(
                icon: "checkmark.circle.fill",
                value: "\(viewModel.todayRideCount)",
                label: "Today",
                color: Theme.statusActive
            )

            RideStatPill(
                icon: "dollarsign.circle.fill",
                value: "$\(String(format: "%.0f", viewModel.todayEarnings))",
                label: "Earned",
                color: Theme.brandOrange
            )
        }
    }
}

struct RideStatPill: View {
    let icon: String
    let value: String
    let label: String
    let color: Color

    var body: some View {
        VStack(spacing: 4) {
            HStack(spacing: 4) {
                Image(systemName: icon)
                    .font(.caption)
                Text(value)
                    .font(.headline)
                    .fontWeight(.bold)
            }
            .foregroundColor(color)

            Text(label)
                .font(.caption2)
                .foregroundColor(Theme.textSecondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 12)
        .background(color.opacity(0.1))
        .cornerRadius(12)
    }
}

// MARK: - Ride Request Card
struct RideRequestCard: View {
    let ride: P2PRide
    let onAccept: () -> Void

    @State private var showDetails = false

    var body: some View {
        VStack(spacing: 0) {
            // Main card content
            VStack(alignment: .leading, spacing: 12) {
                // Header with earnings
                HStack {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Ride Request")
                            .font(.caption)
                            .foregroundColor(Theme.textSecondary)
                        Text(ride.rideNumber)
                            .font(.subheadline)
                            .fontWeight(.medium)
                            .foregroundColor(Theme.textPrimary)
                    }

                    Spacer()

                    VStack(alignment: .trailing, spacing: 2) {
                        Text("Earnings")
                            .font(.caption)
                            .foregroundColor(Theme.textSecondary)
                        Text("$\(String(format: "%.2f", ride.earnings))")
                            .font(.title2)
                            .fontWeight(.bold)
                            .foregroundColor(Theme.statusActive)
                    }
                }

                Divider()

                // Pickup location
                HStack(spacing: 12) {
                    ZStack {
                        Circle()
                            .fill(Theme.statusInfo.opacity(0.15))
                            .frame(width: 40, height: 40)
                        Image(systemName: "person.fill")
                            .foregroundColor(Theme.statusInfo)
                    }

                    VStack(alignment: .leading, spacing: 2) {
                        Text("PICKUP")
                            .font(.caption2)
                            .fontWeight(.semibold)
                            .foregroundColor(Theme.statusInfo)
                        Text(ride.pickup?.fullAddress ?? "Address pending")
                            .font(.subheadline)
                            .foregroundColor(Theme.textPrimary)
                            .lineLimit(2)
                    }

                    Spacer()
                }

                // Connector line
                HStack {
                    Rectangle()
                        .fill(Theme.textGrey.opacity(0.3))
                        .frame(width: 2, height: 20)
                        .padding(.leading, 19)
                    Spacer()
                }

                // Dropoff location
                HStack(spacing: 12) {
                    ZStack {
                        Circle()
                            .fill(Theme.statusActive.opacity(0.15))
                            .frame(width: 40, height: 40)
                        Image(systemName: "mappin.circle.fill")
                            .foregroundColor(Theme.statusActive)
                    }

                    VStack(alignment: .leading, spacing: 2) {
                        Text("DROPOFF")
                            .font(.caption2)
                            .fontWeight(.semibold)
                            .foregroundColor(Theme.statusActive)
                        Text(ride.dropoff?.fullAddress ?? "Address pending")
                            .font(.subheadline)
                            .foregroundColor(Theme.textPrimary)
                            .lineLimit(2)
                    }

                    Spacer()
                }

                // Notes if any
                if let notes = ride.notes, !notes.isEmpty {
                    HStack(alignment: .top, spacing: 8) {
                        Image(systemName: "note.text")
                            .font(.caption)
                            .foregroundColor(Theme.statusWarning)
                        Text(notes)
                            .font(.caption)
                            .foregroundColor(Theme.textSecondary)
                    }
                    .padding(10)
                    .background(Theme.statusWarning.opacity(0.1))
                    .cornerRadius(8)
                }

                // Accept button
                Button(action: onAccept) {
                    HStack {
                        Image(systemName: "checkmark.circle.fill")
                        Text("Accept Ride")
                    }
                    .font(.headline)
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 14)
                    .background(Theme.statusInfo)
                    .cornerRadius(12)
                }
            }
            .padding()
        }
        .background(Theme.cardBackground)
        .cornerRadius(16)
        .shadow(color: .black.opacity(0.08), radius: 8, x: 0, y: 4)
    }
}

// MARK: - No Rides Available View
struct NoRidesAvailableView: View {
    let onRefresh: () -> Void

    var body: some View {
        VStack(spacing: 24) {
            Spacer()

            ZStack {
                Circle()
                    .fill(Theme.statusInfo.opacity(0.1))
                    .frame(width: 120, height: 120)

                Image(systemName: "car.fill")
                    .font(.system(size: 50))
                    .foregroundColor(Theme.statusInfo)
            }

            VStack(spacing: 8) {
                Text("No Rides Available")
                    .font(.title2)
                    .fontWeight(.bold)
                    .foregroundColor(Theme.textPrimary)

                Text("New ride requests will appear here.\nStay online to receive requests!")
                    .font(.subheadline)
                    .foregroundColor(Theme.textSecondary)
                    .multilineTextAlignment(.center)
            }

            Button(action: onRefresh) {
                HStack {
                    Image(systemName: "arrow.clockwise")
                    Text("Refresh")
                }
                .font(.headline)
                .foregroundColor(.white)
                .padding(.horizontal, 32)
                .padding(.vertical, 14)
                .background(Theme.statusInfo)
                .cornerRadius(12)
            }

            Spacer()
        }
        .padding()
    }
}

// MARK: - Ride History View (Placeholder)
struct RideHistoryView: View {
    @ObservedObject var viewModel: RideViewModel

    var body: some View {
        NavigationView {
            VStack(spacing: 24) {
                if viewModel.completedRides.isEmpty {
                    Spacer()

                    Image(systemName: "clock.fill")
                        .font(.system(size: 60))
                        .foregroundColor(Theme.textGrey)

                    Text("No Ride History")
                        .font(.title2)
                        .fontWeight(.bold)
                        .foregroundColor(Theme.textPrimary)

                    Text("Completed rides will appear here")
                        .font(.subheadline)
                        .foregroundColor(Theme.textSecondary)

                    Spacer()
                } else {
                    List(viewModel.completedRides) { ride in
                        RideHistoryRow(ride: ride)
                    }
                    .listStyle(.plain)
                }
            }
            .navigationTitle("Ride History")
            .navigationBarTitleDisplayMode(.large)
            .background(Theme.backgroundGrey.ignoresSafeArea())
        }
    }
}

struct RideHistoryRow: View {
    let ride: P2PRide

    var body: some View {
        HStack(spacing: 12) {
            ZStack {
                Circle()
                    .fill(Theme.statusActive.opacity(0.1))
                    .frame(width: 44, height: 44)
                Image(systemName: "checkmark.circle.fill")
                    .foregroundColor(Theme.statusActive)
            }

            VStack(alignment: .leading, spacing: 4) {
                Text(ride.rideNumber)
                    .font(.headline)
                    .foregroundColor(Theme.textPrimary)
                Text(ride.dropoff?.city ?? "Completed")
                    .font(.subheadline)
                    .foregroundColor(Theme.textSecondary)
            }

            Spacer()

            Text("$\(String(format: "%.2f", ride.earnings))")
                .font(.headline)
                .fontWeight(.bold)
                .foregroundColor(Theme.statusActive)
        }
        .padding(.vertical, 8)
    }
}

// MARK: - Preview
#Preview {
    AvailableRidesView(viewModel: RideViewModel())
}
