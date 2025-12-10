import SwiftUI
import Combine
import EatFairShared

/// Order History ViewModel - Uses P2P API as primary source
class OrderHistoryViewModel: ObservableObject {
    @Published var orders: [Order] = []
    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var showError = false

    // Cancel order state
    @Published var isCancelling = false
    @Published var cancelSuccess = false
    @Published var cancelResponse: P2PCancelOrderResponse?

    // Refund status per order (keyed by order ID)
    @Published var refundStatuses: [String: P2PRefundStatusResponse] = [:]

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
                    #if DEBUG
                    print("Fetched \(self.orders.count) orders from P2P backend")
                    #endif

                case .failure(let error):
                    self.errorMessage = error.localizedDescription
                    #if DEBUG
                    print("Error fetching orders: \(error.localizedDescription)")
                    #endif
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

    // MARK: - Cancel Order

    /// Cancel an order via P2P API
    func cancelOrder(_ order: Order, reason: String? = nil, reasonDetails: String? = nil) {
        guard let orderId = extractOrderId(from: order) else {
            errorMessage = "Invalid order ID"
            showError = true
            return
        }

        isCancelling = true
        cancelSuccess = false
        cancelResponse = nil

        p2pAPI.cancelOrder(orderId: orderId, reason: reason, reasonDetails: reasonDetails) { [weak self] result in
            guard let self = self else { return }

            DispatchQueue.main.async {
                self.isCancelling = false

                switch result {
                case .success(let response):
                    self.cancelResponse = response
                    self.cancelSuccess = response.success
                    if response.success {
                        // Refresh orders to reflect the cancellation
                        self.fetchOrders()
                    } else {
                        self.errorMessage = response.message
                        self.showError = true
                    }

                case .failure(let error):
                    self.errorMessage = error.localizedDescription
                    self.showError = true
                }
            }
        }
    }

    /// Check if an order can be cancelled (only Placed or Confirmed orders)
    func canCancelOrder(_ order: Order) -> Bool {
        let cancellableStatuses = ["Placed", "Confirmed", "Pending"]
        return cancellableStatuses.contains(order.status)
    }

    // MARK: - Refund Status

    /// Get refund status for a cancelled order
    func fetchRefundStatus(for order: Order) {
        guard let orderId = extractOrderId(from: order), let orderIdString = order.id else {
            return
        }

        p2pAPI.getRefundStatus(orderId: orderId) { [weak self] result in
            guard let self = self else { return }

            DispatchQueue.main.async {
                switch result {
                case .success(let status):
                    self.refundStatuses[orderIdString] = status

                case .failure(let error):
                    #if DEBUG
                    print("Failed to fetch refund status: \(error.localizedDescription)")
                    #endif
                }
            }
        }
    }

    /// Get refund status for a specific order
    func getRefundStatus(for order: Order) -> P2PRefundStatusResponse? {
        guard let orderId = order.id else { return nil }
        return refundStatuses[orderId]
    }

    // MARK: - Helpers

    private func extractOrderId(from order: Order) -> Int? {
        // Try to get the numeric ID from order.id first (database ID)
        if let idString = order.id, let intId = Int(idString) {
            return intId
        }
        // Fallback: extract from orderId string like "EF123"
        let digits = order.orderId.filter { $0.isNumber }
        return Int(digits)
    }
}
