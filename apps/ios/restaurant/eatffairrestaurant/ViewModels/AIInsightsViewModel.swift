import SwiftUI
import Combine
import EatFairShared
import os

private let logger = Logger(subsystem: "com.dollorai.restaurant", category: "AIInsightsViewModel")

/// ViewModel for AI Insights - fetches real data from backend API
class AIInsightsViewModel: ObservableObject {
    // MARK: - Published Properties

    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var insights: P2PAIInsightsResponse?

    // Derived properties for easy access
    var demandForecast: [P2PDemandForecast] {
        let backendData = insights?.demandForecast ?? []
        return backendData.isEmpty ? generateSampleForecast() : backendData
    }

    /// Returns true when the forecast is sample/placeholder data (no real backend data)
    var isSampleForecast: Bool {
        insights == nil || (insights?.demandForecast ?? []).isEmpty
    }
    var popularItems: [P2PPopularItem] { insights?.popularItems ?? [] }
    var hourlyDistribution: [P2PHourlyData] { insights?.hourlyDistribution ?? [] }
    var staffingRecommendations: [P2PStaffingRecommendation] { insights?.staffingRecommendations ?? [] }
    var recommendations: [P2PAIRecommendation] {
        let backendData = insights?.recommendations ?? []
        return backendData.isEmpty ? generateSampleRecommendations() : backendData
    }

    /// Returns true when the recommendations are sample/placeholder data (no real backend data)
    var isSampleRecommendations: Bool {
        insights == nil || (insights?.recommendations ?? []).isEmpty
    }

    var totalOrders: Int { insights?.totalOrders ?? 0 }
    var totalRevenue: Double { insights?.totalRevenue ?? 0 }
    var averageOrderValue: Double { insights?.averageOrderValue ?? 0 }
    var orderCompletionRate: Double { insights?.orderCompletionRate ?? 0 }
    var averagePrepTime: Int { insights?.averagePrepTimeMinutes ?? 0 }

    var estimatedOrdersNextHour: Int { insights?.estimatedOrdersNextHour ?? 0 }
    var peakHour: String { insights?.peakHour ?? "--" }
    var peakHourOrders: Int { insights?.peakHourOrders ?? 0 }
    var forecastConfidence: Double { insights?.forecastConfidence ?? 0 }

    var lunchPeakTime: String { insights?.lunchPeak.time ?? "--" }
    var lunchPeakOrders: Int { insights?.lunchPeak.orders ?? 0 }
    var dinnerPeakTime: String { insights?.dinnerPeak.time ?? "--" }
    var dinnerPeakOrders: Int { insights?.dinnerPeak.orders ?? 0 }

    // Check if we have valid data
    var hasData: Bool { insights != nil && totalOrders > 0 }

    // MARK: - Private Properties
    private let p2pAPI = P2PAPIService.shared
    private var cancellables = Set<AnyCancellable>()

    private var vendorId: Int? {
        p2pAPI.currentVendorId
    }

    // MARK: - Initialization
    init() {}

    // MARK: - Sample Forecast Generation

    /// Generates realistic sample forecast data when backend returns no forecast entries.
    /// Covers hours 9-22 matching backend logic, with higher values at lunch/dinner peaks.
    private func generateSampleForecast() -> [P2PDemandForecast] {
        let currentHour = Calendar.current.component(.hour, from: Date())

        // Generate forecast hours starting from current hour, within 9-22 range
        var hours: [Int] = []
        for offset in 0..<7 {
            let h = currentHour + offset
            if h >= 9 && h <= 22 {
                hours.append(h)
            }
        }

        // If no hours fall in range (late night), show next day's lunch-dinner block
        if hours.isEmpty {
            hours = Array(11...17)
        }

        return hours.map { h in
            let predicted: Int
            if h >= 11 && h <= 14 {
                // Lunch peak
                predicted = [5, 6, 7, 8][h % 4]
            } else if h >= 17 && h <= 21 {
                // Dinner peak
                predicted = [4, 5, 6, 7][h % 4]
            } else {
                // Off-peak
                predicted = [1, 2, 3][h % 3]
            }

            let hourString: String
            if h < 12 {
                hourString = "\(h):00 AM"
            } else if h == 12 {
                hourString = "12:00 PM"
            } else {
                hourString = "\(h - 12):00 PM"
            }

            return P2PDemandForecast(
                hour: hourString,
                hour24: h,
                predicted: predicted,
                minOrders: max(0, predicted - 2),
                maxOrders: predicted + 3
            )
        }
    }

    // MARK: - Sample Recommendations Generation

    /// Generates realistic sample recommendations when backend returns no recommendation entries.
    private func generateSampleRecommendations() -> [P2PAIRecommendation] {
        [
            P2PAIRecommendation(
                type: "menu",
                icon: "star.fill",
                title: "Add combo meals",
                description: "Restaurants with combo deals see 20-30% higher average order values.",
                impact: "+25% avg order value",
                priority: "high"
            ),
            P2PAIRecommendation(
                type: "timing",
                icon: "clock.fill",
                title: "Extend weekend hours",
                description: "Your area shows high demand after 9 PM on weekends. Consider extending hours.",
                impact: "+15% weekend orders",
                priority: "medium"
            ),
            P2PAIRecommendation(
                type: "promotion",
                icon: "tag.fill",
                title: "Launch a lunch special",
                description: "A 10% off lunch promo can boost weekday orders during 11 AM-2 PM.",
                impact: "+20% lunch orders",
                priority: "medium"
            )
        ]
    }

    // MARK: - Fetch AI Insights
    func fetchInsights(period: String = "today") {
        guard let vendorId = vendorId else {
            errorMessage = "Not logged in as a vendor"
            return
        }

        isLoading = true
        errorMessage = nil

        p2pAPI.getAIInsights(vendorId: vendorId, period: period) { [weak self] result in
            DispatchQueue.main.async {
                self?.isLoading = false

                switch result {
                case .success(let response):
                    self?.insights = response
                    #if DEBUG
                    logger.info("[AIInsights] Loaded \(response.totalOrders) orders, \(response.popularItems.count) popular items")
                    #endif

                case .failure(let error):
                    let errorMsg = error.localizedDescription.lowercased()
                    if errorMsg.contains("network") || errorMsg.contains("connection") {
                        self?.errorMessage = "Unable to connect. Please check your internet connection."
                    } else if errorMsg.contains("no data") || errorMsg.contains("empty") {
                        self?.errorMessage = "No insights available yet. Complete some orders first."
                    } else {
                        self?.errorMessage = "Unable to load insights. Please try again."
                    }
                    #if DEBUG
                    logger.info("[AIInsights] Error: \(error.localizedDescription)")
                    #endif
                }
            }
        }
    }
}
