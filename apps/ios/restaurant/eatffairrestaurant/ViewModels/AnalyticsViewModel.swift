import SwiftUI
import Combine
import EatFairShared

/// ViewModel for analytics dashboard - computes analytics from real order data
class AnalyticsViewModel: ObservableObject {
    // MARK: - Published Properties

    // Key Metrics
    @Published var totalRevenue: Double = 0
    @Published var totalOrders: Int = 0
    @Published var averageOrderValue: Double = 0
    @Published var averagePrepTime: Int = 20

    // Change percentages (computed from previous period)
    @Published var revenueChange: Double = 0
    @Published var ordersChange: Double = 0
    @Published var avgOrderChange: Double = 0
    @Published var prepTimeChange: Int = 0

    // Hourly data for charts
    @Published var hourlyData: [HourlyAnalytics] = []

    // Popular items
    @Published var popularItems: [PopularItemAnalytics] = []

    // Peak hours
    @Published var lunchPeakTime: String = "12:00 - 2:00 PM"
    @Published var lunchPeakOrders: Int = 0
    @Published var dinnerPeakTime: String = "6:00 - 9:00 PM"
    @Published var dinnerPeakOrders: Int = 0

    // Performance metrics (calculated from real order data)
    @Published var orderCompletionRate: Double = 0.0
    @Published var onTimeDeliveryRate: Double = 0.0

    // Promotion Analytics
    @Published var promotionAnalytics: P2PPromotionAnalytics?

    // Loading state
    @Published var isLoading = false
    @Published var errorMessage: String?

    // MARK: - Private Properties
    private let p2pAPI = P2PAPIService.shared
    private var cancellables = Set<AnyCancellable>()

    private var vendorId: Int {
        p2pAPI.currentVendorId ?? 1
    }

    // MARK: - Initialization

    init() {}

    // MARK: - Compute Analytics from Orders

    /// Update analytics based on orders from OrdersViewModel
    func updateFromOrders(_ orders: [Order], period: TimePeriod = .today) {
        // Filter orders based on period
        let filteredOrders = filterOrdersByPeriod(orders, period: period)
        let previousPeriodOrders = filterOrdersByPreviousPeriod(orders, period: period)

        // Calculate key metrics
        calculateKeyMetrics(from: filteredOrders, previous: previousPeriodOrders)

        // Calculate hourly distribution
        calculateHourlyData(from: filteredOrders)

        // Calculate popular items
        calculatePopularItems(from: filteredOrders)

        // Calculate peak hours
        calculatePeakHours(from: filteredOrders)

        // Calculate performance metrics
        calculatePerformanceMetrics(from: filteredOrders)
    }

    /// Fetch promotion analytics from P2P API
    func fetchPromotionAnalytics() {
        p2pAPI.getPromotionAnalytics(vendorId: vendorId) { [weak self] result in
            DispatchQueue.main.async {
                switch result {
                case .success(let analytics):
                    self?.promotionAnalytics = analytics
                case .failure(let error):
                    #if DEBUG
                    print("[Analytics] Failed to fetch promotion analytics: \(error.localizedDescription)")
                    #endif
                }
            }
        }
    }

    // MARK: - Private Methods

    private func filterOrdersByPeriod(_ orders: [Order], period: TimePeriod) -> [Order] {
        let calendar = Calendar.current
        let now = Date()

        return orders.filter { order in
            let orderDate = Date(timeIntervalSince1970: TimeInterval(order.placedAt) / 1000)

            switch period {
            case .today:
                return calendar.isDateInToday(orderDate)
            case .week:
                guard let weekAgo = calendar.date(byAdding: .day, value: -7, to: now) else { return false }
                return orderDate >= weekAgo
            case .month:
                guard let monthAgo = calendar.date(byAdding: .month, value: -1, to: now) else { return false }
                return orderDate >= monthAgo
            case .year:
                guard let yearAgo = calendar.date(byAdding: .year, value: -1, to: now) else { return false }
                return orderDate >= yearAgo
            }
        }
    }

    private func filterOrdersByPreviousPeriod(_ orders: [Order], period: TimePeriod) -> [Order] {
        let calendar = Calendar.current
        let now = Date()

        return orders.filter { order in
            let orderDate = Date(timeIntervalSince1970: TimeInterval(order.placedAt) / 1000)

            switch period {
            case .today:
                return calendar.isDateInYesterday(orderDate)
            case .week:
                guard let weekAgo = calendar.date(byAdding: .day, value: -7, to: now),
                      let twoWeeksAgo = calendar.date(byAdding: .day, value: -14, to: now) else { return false }
                return orderDate >= twoWeeksAgo && orderDate < weekAgo
            case .month:
                guard let monthAgo = calendar.date(byAdding: .month, value: -1, to: now),
                      let twoMonthsAgo = calendar.date(byAdding: .month, value: -2, to: now) else { return false }
                return orderDate >= twoMonthsAgo && orderDate < monthAgo
            case .year:
                guard let yearAgo = calendar.date(byAdding: .year, value: -1, to: now),
                      let twoYearsAgo = calendar.date(byAdding: .year, value: -2, to: now) else { return false }
                return orderDate >= twoYearsAgo && orderDate < yearAgo
            }
        }
    }

    private func calculateKeyMetrics(from orders: [Order], previous: [Order]) {
        // Current period metrics
        let completedOrders = orders.filter {
            ["Delivered", "Picked Up", "Ready", "Completed"].contains($0.status)
        }

        totalOrders = orders.count
        totalRevenue = completedOrders.reduce(0) { $0 + $1.total }
        averageOrderValue = totalOrders > 0 ? totalRevenue / Double(totalOrders) : 0

        // Calculate average prep time from completed orders
        var totalPrepTime: Int64 = 0
        var prepTimeCount = 0
        for order in completedOrders {
            if let preparedAt = order.preparedAt {
                let prepTime = (preparedAt - order.placedAt) / 1000 / 60
                if prepTime > 0 && prepTime < 120 {
                    totalPrepTime += prepTime
                    prepTimeCount += 1
                }
            }
        }
        if prepTimeCount > 0 {
            averagePrepTime = Int(totalPrepTime / Int64(prepTimeCount))
        }

        // Calculate change percentages from previous period
        let previousCompletedOrders = previous.filter {
            ["Delivered", "Picked Up", "Ready", "Completed"].contains($0.status)
        }
        let previousRevenue = previousCompletedOrders.reduce(0) { $0 + $1.total }
        let previousOrderCount = previous.count
        let previousAvgOrder = previousOrderCount > 0 ? previousRevenue / Double(previousOrderCount) : 0

        // Revenue change
        if previousRevenue > 0 {
            revenueChange = ((totalRevenue - previousRevenue) / previousRevenue) * 100
        } else {
            revenueChange = totalRevenue > 0 ? 100 : 0
        }

        // Orders change
        if previousOrderCount > 0 {
            ordersChange = ((Double(totalOrders) - Double(previousOrderCount)) / Double(previousOrderCount)) * 100
        } else {
            ordersChange = totalOrders > 0 ? 100 : 0
        }

        // Average order change
        if previousAvgOrder > 0 {
            avgOrderChange = ((averageOrderValue - previousAvgOrder) / previousAvgOrder) * 100
        } else {
            avgOrderChange = averageOrderValue > 0 ? 100 : 0
        }
    }

    private func calculateHourlyData(from orders: [Order]) {
        let calendar = Calendar.current
        var hourlyDict: [Int: (revenue: Double, orders: Int)] = [:]

        // Initialize all hours
        for hour in 9...21 {
            hourlyDict[hour] = (revenue: 0, orders: 0)
        }

        // Aggregate by hour
        for order in orders {
            let orderDate = Date(timeIntervalSince1970: TimeInterval(order.placedAt) / 1000)
            let hour = calendar.component(.hour, from: orderDate)

            if hour >= 9 && hour <= 21 {
                let current = hourlyDict[hour] ?? (revenue: 0, orders: 0)
                hourlyDict[hour] = (revenue: current.revenue + order.total, orders: current.orders + 1)
            }
        }

        // Convert to array
        hourlyData = hourlyDict.keys.sorted().compactMap { hour in
            guard let data = hourlyDict[hour] else { return nil }
            let hourString = formatHour(hour)
            let avgOrder = data.orders > 0 ? data.revenue / Double(data.orders) : 0
            return HourlyAnalytics(
                hour: hourString,
                revenue: data.revenue,
                orders: data.orders,
                avgOrder: avgOrder
            )
        }
    }

    private func calculatePopularItems(from orders: [Order]) {
        var itemCounts: [String: (name: String, quantity: Int, revenue: Double)] = [:]

        for order in orders {
            for item in order.items {
                let key = item.name
                let current = itemCounts[key] ?? (name: item.name, quantity: 0, revenue: 0)
                let itemTotal = item.price * Double(item.quantity)
                itemCounts[key] = (
                    name: item.name,
                    quantity: current.quantity + item.quantity,
                    revenue: current.revenue + itemTotal
                )
            }
        }

        // Sort by quantity and take top 5
        popularItems = itemCounts.values
            .sorted { $0.quantity > $1.quantity }
            .prefix(5)
            .map { PopularItemAnalytics(name: $0.name, quantity: $0.quantity, revenue: $0.revenue) }

        // If no items, use placeholder
        if popularItems.isEmpty {
            popularItems = [
                PopularItemAnalytics(name: "No orders yet", quantity: 0, revenue: 0)
            ]
        }
    }

    private func calculatePeakHours(from orders: [Order]) {
        let calendar = Calendar.current
        var lunchOrders = 0
        var dinnerOrders = 0
        var lunchPeakHour = 12
        var dinnerPeakHour = 18
        var hourCounts: [Int: Int] = [:]

        for order in orders {
            let orderDate = Date(timeIntervalSince1970: TimeInterval(order.placedAt) / 1000)
            let hour = calendar.component(.hour, from: orderDate)
            hourCounts[hour, default: 0] += 1

            if hour >= 11 && hour <= 14 {
                lunchOrders += 1
            } else if hour >= 17 && hour <= 21 {
                dinnerOrders += 1
            }
        }

        // Find actual peak hours
        let lunchHours = hourCounts.filter { $0.key >= 11 && $0.key <= 14 }
        let dinnerHours = hourCounts.filter { $0.key >= 17 && $0.key <= 21 }

        if let maxLunch = lunchHours.max(by: { $0.value < $1.value }) {
            lunchPeakHour = maxLunch.key
        }
        if let maxDinner = dinnerHours.max(by: { $0.value < $1.value }) {
            dinnerPeakHour = maxDinner.key
        }

        lunchPeakTime = "\(formatHour(lunchPeakHour)) - \(formatHour(lunchPeakHour + 2))"
        dinnerPeakTime = "\(formatHour(dinnerPeakHour)) - \(formatHour(dinnerPeakHour + 2))"
        lunchPeakOrders = lunchOrders
        dinnerPeakOrders = dinnerOrders
    }

    private func calculatePerformanceMetrics(from orders: [Order]) {
        guard !orders.isEmpty else { return }

        // Order completion rate
        let completedCount = orders.filter {
            ["Delivered", "Picked Up", "Ready", "Completed"].contains($0.status)
        }.count
        let cancelledCount = orders.filter { $0.status == "Cancelled" }.count
        let totalProcessed = completedCount + cancelledCount

        if totalProcessed > 0 {
            orderCompletionRate = Double(completedCount) / Double(totalProcessed)
        }

        // On-time delivery rate (orders delivered within estimated time)
        var onTimeCount = 0
        var deliveredCount = 0
        for order in orders where order.status == "Delivered" {
            deliveredCount += 1
            // Consider on-time if delivered (simplified - in production check actual vs estimated)
            onTimeCount += 1
        }
        if deliveredCount > 0 {
            onTimeDeliveryRate = Double(onTimeCount) / Double(deliveredCount)
        }
    }

    private func formatHour(_ hour: Int) -> String {
        let period = hour >= 12 ? "PM" : "AM"
        let displayHour = hour > 12 ? hour - 12 : (hour == 0 ? 12 : hour)
        return "\(displayHour)\(period)"
    }

    // MARK: - Time Period Enum

    enum TimePeriod: String, CaseIterable {
        case today = "Today"
        case week = "This Week"
        case month = "This Month"
        case year = "This Year"
    }
}

// MARK: - Analytics Data Models

struct HourlyAnalytics: Identifiable {
    let id = UUID()
    let hour: String
    let revenue: Double
    let orders: Int
    let avgOrder: Double
}

struct PopularItemAnalytics: Identifiable {
    let id = UUID()
    let name: String
    let quantity: Int
    let revenue: Double
}
