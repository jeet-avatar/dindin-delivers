import SwiftUI
import Combine
import EatFairShared

/// RideViewModel manages P2P ride-sharing (passenger pickup/dropoff)
/// Connected to P2P API - rides are stored as special orders with RIDE- prefix
class RideViewModel: ObservableObject {
    // MARK: - Published Properties
    @Published var availableRides: [P2PRide] = []
    @Published var activeRide: P2PRide?
    @Published var completedRides: [P2PRide] = []
    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var showError = false

    // MARK: - Stats
    @Published var todayRideCount = 0
    @Published var todayEarnings: Double = 0.0

    // MARK: - Private Properties
    private let p2pService = P2PAPIService.shared
    private var refreshTimer: Timer?

    // MARK: - Initialization
    init() {
        setupRefreshTimer()
    }

    deinit {
        refreshTimer?.invalidate()
    }

    // MARK: - Refresh Timer
    private func setupRefreshTimer() {
        refreshTimer = Timer.scheduledTimer(withTimeInterval: 10, repeats: true) { [weak self] _ in
            self?.refreshAllData()
        }
    }

    func refreshAllData() {
        fetchAvailableRides()
    }

    // MARK: - Fetch Available Rides
    func fetchAvailableRides() {
        isLoading = true

        p2pService.fetchAvailableRides { [weak self] result in
            DispatchQueue.main.async {
                self?.isLoading = false

                switch result {
                case .success(let rides):
                    self?.availableRides = rides

                case .failure(let error):
                    print("RideViewModel Error: \(error.localizedDescription)")
                    // Don't show error for empty results
                    if self?.availableRides.isEmpty == true {
                        self?.availableRides = []
                    }
                }
            }
        }
    }

    // MARK: - Accept Ride
    func acceptRide(_ ride: P2PRide) {
        isLoading = true

        p2pService.acceptRide(rideId: ride.rideId) { [weak self] result in
            DispatchQueue.main.async {
                self?.isLoading = false

                switch result {
                case .success:
                    self?.activeRide = ride
                    // Remove from available
                    self?.availableRides.removeAll { $0.rideId == ride.rideId }
                    // Start location tracking
                    LocationManager.shared.startDeliveryTracking(orderId: ride.rideId)

                case .failure(let error):
                    self?.showErrorMessage("Failed to accept ride: \(error.localizedDescription)")
                }
            }
        }
    }

    // MARK: - Complete Ride (Dropoff)
    func completeRide(_ ride: P2PRide) {
        isLoading = true

        p2pService.completeRide(rideId: ride.rideId) { [weak self] result in
            DispatchQueue.main.async {
                self?.isLoading = false

                switch result {
                case .success:
                    // Stop tracking
                    LocationManager.shared.stopDeliveryTracking()
                    // Update stats
                    self?.todayRideCount += 1
                    self?.todayEarnings += ride.earnings
                    // Clear active ride
                    self?.activeRide = nil
                    // Refresh
                    self?.refreshAllData()

                case .failure(let error):
                    self?.showErrorMessage("Failed to complete ride: \(error.localizedDescription)")
                }
            }
        }
    }

    // MARK: - Cancel Ride
    func cancelRide(_ ride: P2PRide) {
        // Use the same cancel endpoint as deliveries
        p2pService.cancelDeliveryAssignment(orderId: ride.rideId) { [weak self] result in
            DispatchQueue.main.async {
                switch result {
                case .success:
                    self?.activeRide = nil
                    LocationManager.shared.stopDeliveryTracking()
                    self?.refreshAllData()
                case .failure(let error):
                    self?.showErrorMessage("Failed to cancel ride: \(error.localizedDescription)")
                }
            }
        }
    }

    // MARK: - Private Helpers
    private func showErrorMessage(_ message: String) {
        DispatchQueue.main.async {
            self.errorMessage = message
            self.showError = true
        }
    }
}

// MARK: - Preview Helper
#if DEBUG
extension RideViewModel {
    static var preview: RideViewModel {
        let vm = RideViewModel()
        return vm
    }
}
#endif
