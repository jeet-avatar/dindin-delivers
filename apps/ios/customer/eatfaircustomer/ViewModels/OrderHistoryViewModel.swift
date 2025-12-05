import SwiftUI
import Combine
import EatFairShared

/// Order History ViewModel - Uses P2P API as primary source
class OrderHistoryViewModel: ObservableObject {
    @Published var orders: [Order] = []
    @Published var isLoading = false
    @Published var errorMessage: String?

    private let p2pAPI = P2PAPIService.shared
    private var refreshTimer: Timer?

    func fetchOrders() {
        isLoading = true
        errorMessage = nil

        // Fetch orders from P2P backend
        p2pAPI.fetchCustomerOrders { [weak self] result in
            guard let self = self else { return }

            DispatchQueue.main.async {
                self.isLoading = false

                switch result {
                case .success(let p2pOrders):
                    // Convert P2P orders to shared Order model
                    self.orders = p2pOrders
                        .map { $0.toOrder() }
                        .sorted(by: { $0.placedAt > $1.placedAt })
                    print("Fetched \(self.orders.count) orders from P2P backend")

                case .failure(let error):
                    self.errorMessage = error.localizedDescription
                    print("Error fetching orders: \(error.localizedDescription)")
                }
            }
        }
    }

    /// Start auto-refresh for active orders
    func startAutoRefresh() {
        // Refresh every 30 seconds
        refreshTimer?.invalidate()
        refreshTimer = Timer.scheduledTimer(withTimeInterval: 30, repeats: true) { [weak self] _ in
            self?.fetchOrders()
        }
    }

    func stopAutoRefresh() {
        refreshTimer?.invalidate()
        refreshTimer = nil
    }

    deinit {
        stopAutoRefresh()
    }
}
