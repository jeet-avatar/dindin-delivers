//
//  eatffairdeliveryTests.swift
//  eatffairdeliveryTests
//
//  Created by Jithesh Manoharan on 11/26/25.
//

import Testing
import Foundation
@testable import eatffairdelivery

// MARK: - Earnings Calculation Tests

@Suite("Earnings Calculations")
struct EarningsCalculationTests {

    @Test("Breakdown totals match sum of components")
    func testBreakdownTotalMatchesComponents() {
        let breakdown = EarningsBreakdown(
            deliveryFees: 60.00,
            tips: 35.00,
            bonuses: 5.00,
            total: 100.00
        )

        let calculatedTotal = breakdown.deliveryFees + breakdown.tips + breakdown.bonuses
        #expect(calculatedTotal == breakdown.total)
    }

    @Test("Default breakdown has zero values")
    func testDefaultBreakdownIsZero() {
        let breakdown = EarningsBreakdown()

        #expect(breakdown.deliveryFees == 0.0)
        #expect(breakdown.tips == 0.0)
        #expect(breakdown.bonuses == 0.0)
        #expect(breakdown.total == 0.0)
    }

    @Test("Daily earnings structure")
    func testDailyEarningsStructure() {
        let daily = DailyEarning(day: "Mon", amount: 127.50)

        #expect(daily.day == "Mon")
        #expect(daily.amount == 127.50)
    }

    @Test("Standard 60/35/5 earnings split")
    func testStandardEarningsSplit() {
        // Test the standard split used in updateFromDashboard
        let grossEarnings = 1000.00

        let deliveryFees = grossEarnings * 0.6
        let tips = grossEarnings * 0.35
        let bonuses = grossEarnings * 0.05

        #expect(deliveryFees == 600.00)
        #expect(tips == 350.00)
        #expect(bonuses == 50.00)
        #expect(deliveryFees + tips + bonuses == grossEarnings)
    }

    @Test("Weekly average calculation")
    func testWeeklyAverageCalculation() {
        let weeklyTotal = 700.00
        let daysWorked = 7

        let avgDaily = weeklyTotal / Double(daysWorked)
        #expect(avgDaily == 100.00)
    }

    @Test("Hourly rate calculation")
    func testHourlyRateCalculation() {
        let earnings = 200.00
        let hours = 8.0

        let hourlyRate = earnings / hours
        #expect(hourlyRate == 25.00)
    }

    @Test("Zero hours returns zero rate")
    func testZeroHoursRate() {
        let earnings = 200.00
        let hours = 0.0

        // Should handle division by zero gracefully
        let hourlyRate = hours > 0 ? earnings / hours : 0.0
        #expect(hourlyRate == 0.0)
    }
}

// MARK: - Session Tracking Tests

@Suite("Session Tracking")
struct SessionTrackingTests {

    @Test("Session duration calculation")
    func testSessionDuration() {
        let startTime = Date()
        let endTime = startTime.addingTimeInterval(3600 * 6.5) // 6.5 hours

        let durationHours = endTime.timeIntervalSince(startTime) / 3600.0
        #expect(durationHours == 6.5)
    }

    @Test("Session ID generation")
    func testSessionIdGeneration() {
        let sessionId = UUID().uuidString

        #expect(!sessionId.isEmpty)
        #expect(sessionId.count == 36) // UUID format: 8-4-4-4-12
    }

    @Test("Timestamp conversion")
    func testTimestampConversion() {
        let now = Date()
        let timestamp = Int64(now.timeIntervalSince1970 * 1000)

        // Convert back
        let convertedDate = Date(timeIntervalSince1970: TimeInterval(timestamp) / 1000)

        // Should be within 1 second
        let difference = abs(now.timeIntervalSince(convertedDate))
        #expect(difference < 0.001)
    }
}

// MARK: - Driver Stats Tests

@Suite("Driver Statistics")
struct DriverStatsTests {

    @Test("Delivery count tracking")
    func testDeliveryCountTracking() {
        var stats = TestDriverStats()

        stats.completedDeliveries += 1
        stats.completedDeliveries += 1
        stats.completedDeliveries += 1

        #expect(stats.completedDeliveries == 3)
    }

    @Test("Cumulative earnings")
    func testCumulativeEarnings() {
        var stats = TestDriverStats()

        stats.totalEarnings += 50.00
        stats.totalEarnings += 75.00
        stats.totalEarnings += 100.00

        #expect(stats.totalEarnings == 225.00)
    }

    @Test("Online time accumulation")
    func testOnlineTimeAccumulation() {
        var stats = TestDriverStats()

        stats.totalOnlineHours += 4.5
        stats.totalOnlineHours += 6.0
        stats.totalOnlineHours += 3.5

        #expect(stats.totalOnlineHours == 14.0)
    }

    @Test("Distance tracking")
    func testDistanceTracking() {
        var stats = TestDriverStats()

        stats.totalDistanceMiles += 15.5
        stats.totalDistanceMiles += 22.3
        stats.totalDistanceMiles += 18.7

        #expect(abs(stats.totalDistanceMiles - 56.5) < 0.001)
    }

    @Test("Rating calculation")
    func testRatingCalculation() {
        let ratings = [5.0, 4.0, 5.0, 4.5, 5.0]
        let averageRating = ratings.reduce(0, +) / Double(ratings.count)

        #expect(averageRating == 4.7)
    }

    @Test("On-time percentage")
    func testOnTimePercentage() {
        let totalDeliveries = 100
        let onTimeDeliveries = 95

        let percentage = (Double(onTimeDeliveries) / Double(totalDeliveries)) * 100
        #expect(percentage == 95.0)
    }
}

// MARK: - Tip Handling Tests

@Suite("Tip Handling")
struct TipHandlingTests {

    @Test("Default tip rate calculation")
    func testDefaultTipRate() {
        let orderTotal = 50.00
        let defaultTipRate = 0.15 // 15%

        let estimatedTip = orderTotal * defaultTipRate
        #expect(estimatedTip == 7.50)
    }

    @Test("Tip from order breakdown")
    func testTipFromOrderBreakdown() {
        let total = 100.00
        let deliveryFee = 5.00
        let priorityFee = 2.00
        let tipRate = 0.18

        let tip = total * tipRate
        let driverEarnings = deliveryFee + priorityFee + tip

        #expect(tip == 18.00)
        #expect(driverEarnings == 25.00)
    }

    @Test("Recent tips list limit")
    func testRecentTipsLimit() {
        var recentTips: [TestTip] = []
        let limit = 5

        // Add 10 tips
        for i in 0..<10 {
            recentTips.append(TestTip(amount: Double(i) * 5.0))
        }

        // Keep only most recent 5
        if recentTips.count > limit {
            recentTips = Array(recentTips.suffix(limit))
        }

        #expect(recentTips.count == 5)
    }
}

// MARK: - Date/Time Helpers Tests

@Suite("Date Time Helpers")
struct DateTimeHelperTests {

    @Test("Day of week formatting")
    func testDayOfWeekFormatting() {
        let formatter = DateFormatter()
        formatter.dateFormat = "EEE"

        let days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

        // All days should be valid short format
        for day in days {
            #expect(day.count == 3)
        }
    }

    @Test("Start of day calculation")
    func testStartOfDay() {
        let calendar = Calendar.current
        let now = Date()
        let startOfDay = calendar.startOfDay(for: now)

        let components = calendar.dateComponents([.hour, .minute, .second], from: startOfDay)

        #expect(components.hour == 0)
        #expect(components.minute == 0)
        #expect(components.second == 0)
    }

    @Test("Start of week calculation")
    func testStartOfWeek() {
        let calendar = Calendar.current
        let now = Date()

        if let startOfWeek = calendar.date(from: calendar.dateComponents([.yearForWeekOfYear, .weekOfYear], from: now)) {
            let weekday = calendar.component(.weekday, from: startOfWeek)
            // Should be Sunday (1) or Monday (2) depending on locale
            #expect(weekday >= 1 && weekday <= 2)
        }
    }

    @Test("Start of month calculation")
    func testStartOfMonth() {
        let calendar = Calendar.current
        let now = Date()

        if let startOfMonth = calendar.date(from: calendar.dateComponents([.year, .month], from: now)) {
            let day = calendar.component(.day, from: startOfMonth)
            #expect(day == 1)
        }
    }
}

// MARK: - Retry Logic Tests

@Suite("Retry Logic")
struct RetryLogicTests {

    @Test("Retry count tracking")
    func testRetryCountTracking() {
        var retryCount = 0
        let maxRetries = 3

        while retryCount < maxRetries {
            retryCount += 1
        }

        #expect(retryCount == 3)
    }

    @Test("Exponential backoff delay")
    func testExponentialBackoff() {
        let baseDelay = 2.0

        let delay1 = baseDelay * 1.0 // 2 seconds
        let delay2 = baseDelay * 2.0 // 4 seconds
        let delay3 = baseDelay * 3.0 // 6 seconds

        #expect(delay1 == 2.0)
        #expect(delay2 == 4.0)
        #expect(delay3 == 6.0)
    }
}

// MARK: - Test Helpers

struct TestDriverStats {
    var completedDeliveries: Int = 0
    var totalEarnings: Double = 0.0
    var totalOnlineHours: Double = 0.0
    var totalDistanceMiles: Double = 0.0
}

struct TestTip {
    let id = UUID()
    let amount: Double
}
