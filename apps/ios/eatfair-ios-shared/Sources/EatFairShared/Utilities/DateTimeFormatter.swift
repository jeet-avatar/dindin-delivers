import Foundation

/// World-class date/time formatting utility following patterns from Uber, DoorDash, Lyft
/// Handles all time display scenarios for delivery and rideshare apps
public struct DateTimeFormatter {

    // MARK: - Shared Instance
    public static let shared = DateTimeFormatter()

    // MARK: - Private Formatters (Cached for performance)
    private let iso8601Formatter: ISO8601DateFormatter = {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return formatter
    }()

    private let iso8601FormatterNoFractional: ISO8601DateFormatter = {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime]
        return formatter
    }()

    private let timeOnlyFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.dateFormat = "h:mm a"
        formatter.locale = Locale.current
        return formatter
    }()

    private let shortDateFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.dateFormat = "MMM d"
        formatter.locale = Locale.current
        return formatter
    }()

    private let fullDateFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.dateFormat = "MMM d, yyyy"
        formatter.locale = Locale.current
        return formatter
    }()

    private let dateTimeFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.dateFormat = "MMM d 'at' h:mm a"
        formatter.locale = Locale.current
        return formatter
    }()

    private let fullDateTimeFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.dateFormat = "MMM d, yyyy 'at' h:mm a"
        formatter.locale = Locale.current
        return formatter
    }()

    private init() {}

    // MARK: - ISO8601 Parsing

    /// Parse ISO8601 date string from API (handles both with and without fractional seconds)
    public func parseISO8601(_ dateString: String?) -> Date? {
        guard let dateString = dateString else { return nil }

        // Try with fractional seconds first
        if let date = iso8601Formatter.date(from: dateString) {
            return date
        }

        // Try without fractional seconds
        if let date = iso8601FormatterNoFractional.date(from: dateString) {
            return date
        }

        return nil
    }

    // MARK: - Smart Relative Time (Like Uber/DoorDash)

    /// Returns smart relative time string based on how recent the date is
    /// - "Just now" (< 1 minute)
    /// - "5 min ago" (1-59 minutes)
    /// - "2 hours ago" (1-23 hours)
    /// - "Yesterday at 2:30 PM" (24-48 hours)
    /// - "Dec 5 at 7:15 PM" (same year)
    /// - "Dec 5, 2024 at 7:15 PM" (different year)
    public func smartRelativeTime(from date: Date) -> String {
        let now = Date()
        let calendar = Calendar.current
        let components = calendar.dateComponents([.minute, .hour, .day, .year], from: date, to: now)

        let minutes = components.minute ?? 0
        let hours = components.hour ?? 0
        let days = components.day ?? 0

        // Just now (< 1 minute)
        if days == 0 && hours == 0 && minutes < 1 {
            return "Just now"
        }

        // Minutes ago (1-59 minutes)
        if days == 0 && hours == 0 && minutes >= 1 && minutes < 60 {
            return "\(minutes) min ago"
        }

        // Hours ago (1-23 hours)
        if days == 0 && hours >= 1 && hours < 24 {
            return hours == 1 ? "1 hour ago" : "\(hours) hours ago"
        }

        // Yesterday
        if calendar.isDateInYesterday(date) {
            return "Yesterday at \(timeOnlyFormatter.string(from: date))"
        }

        // Same year
        let currentYear = calendar.component(.year, from: now)
        let dateYear = calendar.component(.year, from: date)

        if currentYear == dateYear {
            return dateTimeFormatter.string(from: date)
        }

        // Different year
        return fullDateTimeFormatter.string(from: date)
    }

    /// Returns smart relative time from ISO8601 string
    public func smartRelativeTime(from dateString: String?) -> String {
        guard let date = parseISO8601(dateString) else {
            return "--"
        }
        return smartRelativeTime(from: date)
    }

    // MARK: - Active Order/Ride Time Display (Real-time)

    /// Format for active delivery/ride ETA countdown
    /// Returns: "4 min" or "Arriving now"
    public func etaCountdown(arrivalTime: Date) -> String {
        let now = Date()
        let seconds = arrivalTime.timeIntervalSince(now)

        if seconds <= 60 {
            return "Arriving now"
        }

        let minutes = Int(ceil(seconds / 60))
        return "\(minutes) min"
    }

    /// Format for active delivery/ride ETA with distance
    /// Returns: "0.8 mi - 4 min"
    public func etaWithDistance(distanceMiles: Double, etaMinutes: Int) -> String {
        let distanceStr = String(format: "%.1f mi", distanceMiles)
        return "\(distanceStr) - \(etaMinutes) min"
    }

    /// Format for expected arrival time
    /// Returns: "ETA 6:32 PM" or "Arriving by 6:32 PM"
    public func etaArrivalTime(arrivalTime: Date, prefix: String = "ETA") -> String {
        return "\(prefix) \(timeOnlyFormatter.string(from: arrivalTime))"
    }

    /// Calculate and format ETA from current location
    /// Returns: "Arriving in 5 min" or "Arriving by 6:45 PM"
    public func formattedETA(etaMinutes: Int, showArrivalTime: Bool = false) -> String {
        if showArrivalTime {
            let arrivalTime = Date().addingTimeInterval(Double(etaMinutes) * 60)
            return "Arriving by \(timeOnlyFormatter.string(from: arrivalTime))"
        }
        return "Arriving in \(etaMinutes) min"
    }

    // MARK: - Order History Display

    /// Format for order/ride history list items
    /// Returns short relative time or date based on recency
    public func historyListTime(from date: Date) -> String {
        let calendar = Calendar.current

        if calendar.isDateInToday(date) {
            // Show time for today
            return timeOnlyFormatter.string(from: date)
        } else if calendar.isDateInYesterday(date) {
            return "Yesterday"
        } else {
            // Show date for older
            let currentYear = calendar.component(.year, from: Date())
            let dateYear = calendar.component(.year, from: date)

            if currentYear == dateYear {
                return shortDateFormatter.string(from: date)
            }
            return fullDateFormatter.string(from: date)
        }
    }

    /// Format for order/ride history list items from ISO8601 string
    public func historyListTime(from dateString: String?) -> String {
        guard let date = parseISO8601(dateString) else {
            return "--"
        }
        return historyListTime(from: date)
    }

    /// Format for order/ride detail view with full date and time
    public func historyDetailTime(from date: Date) -> String {
        let calendar = Calendar.current
        let currentYear = calendar.component(.year, from: Date())
        let dateYear = calendar.component(.year, from: date)

        if currentYear == dateYear {
            return dateTimeFormatter.string(from: date)
        }
        return fullDateTimeFormatter.string(from: date)
    }

    /// Format for order/ride detail view from ISO8601 string
    public func historyDetailTime(from dateString: String?) -> String {
        guard let date = parseISO8601(dateString) else {
            return "--"
        }
        return historyDetailTime(from: date)
    }

    // MARK: - Status Timeline Display

    /// Format for status timeline events (order placed, picked up, delivered)
    /// Returns: "2:30 PM" or "Yesterday 2:30 PM" or "Dec 5, 2:30 PM"
    public func statusTimelineTime(from date: Date) -> String {
        let calendar = Calendar.current

        if calendar.isDateInToday(date) {
            return timeOnlyFormatter.string(from: date)
        } else if calendar.isDateInYesterday(date) {
            return "Yesterday \(timeOnlyFormatter.string(from: date))"
        } else {
            return "\(shortDateFormatter.string(from: date)), \(timeOnlyFormatter.string(from: date))"
        }
    }

    /// Format for status timeline from ISO8601 string
    public func statusTimelineTime(from dateString: String?) -> String {
        guard let date = parseISO8601(dateString) else {
            return "--"
        }
        return statusTimelineTime(from: date)
    }

    // MARK: - Duration Formatting

    /// Format duration in minutes/hours
    /// Returns: "15 min" or "1h 30min"
    public func formatDuration(minutes: Int) -> String {
        if minutes < 60 {
            return "\(minutes) min"
        }

        let hours = minutes / 60
        let remainingMinutes = minutes % 60

        if remainingMinutes == 0 {
            return hours == 1 ? "1 hour" : "\(hours) hours"
        }

        return "\(hours)h \(remainingMinutes)min"
    }

    /// Format duration between two dates
    public func formatDuration(from startDate: Date, to endDate: Date) -> String {
        let seconds = endDate.timeIntervalSince(startDate)
        let minutes = Int(ceil(seconds / 60))
        return formatDuration(minutes: max(0, minutes))
    }

    // MARK: - Time Only

    /// Get time only string (e.g., "2:30 PM")
    public func timeOnly(from date: Date) -> String {
        return timeOnlyFormatter.string(from: date)
    }

    /// Get time only from ISO8601 string
    public func timeOnly(from dateString: String?) -> String {
        guard let date = parseISO8601(dateString) else {
            return "--"
        }
        return timeOnly(from: date)
    }

    // MARK: - Restaurant/Driver Active Order Display

    /// Format for restaurant order cards showing when order was placed
    /// Returns: "Ordered 5 min ago" or "Ordered at 2:30 PM"
    public func orderedTime(from date: Date, verbose: Bool = false) -> String {
        let calendar = Calendar.current
        let components = calendar.dateComponents([.minute, .hour], from: date, to: Date())

        let minutes = components.minute ?? 0
        let hours = components.hour ?? 0

        // For recent orders (< 1 hour), show relative time
        if hours == 0 && minutes < 60 {
            if minutes < 1 {
                return verbose ? "Ordered just now" : "Just now"
            }
            return verbose ? "Ordered \(minutes) min ago" : "\(minutes) min ago"
        }

        // For older orders, show the actual time
        if verbose {
            return "Ordered at \(timeOnlyFormatter.string(from: date))"
        }
        return timeOnlyFormatter.string(from: date)
    }

    /// Format for restaurant order cards from ISO8601 string
    public func orderedTime(from dateString: String?, verbose: Bool = false) -> String {
        guard let date = parseISO8601(dateString) else {
            return "--"
        }
        return orderedTime(from: date, verbose: verbose)
    }

    // MARK: - Rideshare Specific

    /// Format pickup/dropoff time for rideshare
    /// Returns: "Pickup at 6:30 PM" or "Dropoff at 6:45 PM"
    public func rideTime(type: String, date: Date) -> String {
        return "\(type) at \(timeOnlyFormatter.string(from: date))"
    }

    /// Format scheduled ride time
    /// Returns: "Today at 6:30 PM" or "Tomorrow at 9:00 AM" or "Dec 10 at 2:00 PM"
    public func scheduledRideTime(from date: Date) -> String {
        let calendar = Calendar.current

        if calendar.isDateInToday(date) {
            return "Today at \(timeOnlyFormatter.string(from: date))"
        } else if calendar.isDateInTomorrow(date) {
            return "Tomorrow at \(timeOnlyFormatter.string(from: date))"
        } else {
            return "\(shortDateFormatter.string(from: date)) at \(timeOnlyFormatter.string(from: date))"
        }
    }

    // MARK: - Maps Display

    /// Format for map annotation/info window
    /// Returns compact time info for map overlays
    public func mapAnnotationTime(etaMinutes: Int, distanceMiles: Double) -> String {
        let distanceStr = String(format: "%.1f mi", distanceMiles)
        return "\(etaMinutes) min (\(distanceStr))"
    }

    /// Format for driver location update timestamp
    /// Returns: "Updated just now" or "Updated 2 min ago"
    public func lastUpdatedTime(from date: Date) -> String {
        let seconds = Date().timeIntervalSince(date)

        if seconds < 60 {
            return "Updated just now"
        }

        let minutes = Int(seconds / 60)
        return "Updated \(minutes) min ago"
    }

    // MARK: - Enterprise Order ID Formatting

    /// Parse enterprise order ID to extract date and time
    /// Format: EF-YYYYMMDD-HHMMSS-XXXX (e.g., EF-20251208-143525-0042)
    /// Returns: (date: Date?, sequence: String?)
    public func parseOrderId(_ orderId: String) -> (date: Date?, sequence: String?) {
        // Handle enterprise format: EF-YYYYMMDD-HHMMSS-XXXX
        let parts = orderId.split(separator: "-")
        guard parts.count >= 4,
              parts[0] == "EF",
              parts[1].count == 8,
              parts[2].count == 6 else {
            // Handle legacy format: EF120800042 (no dashes)
            return (nil, nil)
        }

        let dateString = "\(parts[1])\(parts[2])"
        let sequence = String(parts[3])

        let formatter = DateFormatter()
        formatter.dateFormat = "yyyyMMddHHmmss"
        let date = formatter.date(from: dateString)

        return (date, sequence)
    }

    /// Format order ID for display with human-readable date/time
    /// "EF-20251208-143525-0042" -> "Order #0042 | Dec 8, 2025 at 2:35 PM"
    public func formatOrderIdForDisplay(_ orderId: String) -> String {
        let (date, sequence) = parseOrderId(orderId)

        guard let date = date, let sequence = sequence else {
            // Return original ID for legacy formats
            return "Order #\(orderId)"
        }

        let dateStr = historyDetailTime(from: date)
        return "Order #\(sequence) | \(dateStr)"
    }

    /// Get just the order sequence number from enterprise order ID
    /// "EF-20251208-143525-0042" -> "0042"
    public func orderSequence(_ orderId: String) -> String {
        let (_, sequence) = parseOrderId(orderId)
        return sequence ?? orderId
    }

    /// Get placed date from order ID
    /// "EF-20251208-143525-0042" -> Date or nil
    public func orderPlacedDate(_ orderId: String) -> Date? {
        let (date, _) = parseOrderId(orderId)
        return date
    }

    /// Format order placed time from order ID
    /// "EF-20251208-143525-0042" -> "Dec 8, 2025 at 2:35 PM"
    public func orderPlacedTime(_ orderId: String) -> String {
        guard let date = orderPlacedDate(orderId) else {
            return "--"
        }
        return historyDetailTime(from: date)
    }

    /// Generate enterprise order ID on client side (fallback for offline)
    public static func generateOrderId(sequence: Int = Int.random(in: 1...9999)) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyyMMdd-HHmmss"
        return "EF-\(formatter.string(from: Date()))-\(String(format: "%04d", sequence))"
    }
}

// MARK: - Convenience Extensions

public extension Date {
    /// Convert to smart relative time string
    var smartRelativeTime: String {
        DateTimeFormatter.shared.smartRelativeTime(from: self)
    }

    /// Convert to history list format
    var historyListTime: String {
        DateTimeFormatter.shared.historyListTime(from: self)
    }

    /// Convert to time only format
    var timeOnly: String {
        DateTimeFormatter.shared.timeOnly(from: self)
    }
}

public extension String {
    /// Parse ISO8601 string and convert to smart relative time
    var asSmartRelativeTime: String {
        DateTimeFormatter.shared.smartRelativeTime(from: self)
    }

    /// Parse ISO8601 string and convert to history list time
    var asHistoryListTime: String {
        DateTimeFormatter.shared.historyListTime(from: self)
    }

    /// Parse ISO8601 string and convert to time only
    var asTimeOnly: String {
        DateTimeFormatter.shared.timeOnly(from: self)
    }

    /// Parse ISO8601 string and convert to status timeline time
    var asStatusTimelineTime: String {
        DateTimeFormatter.shared.statusTimelineTime(from: self)
    }

    /// Parse ISO8601 string and convert to Date
    var asDate: Date? {
        DateTimeFormatter.shared.parseISO8601(self)
    }
}
