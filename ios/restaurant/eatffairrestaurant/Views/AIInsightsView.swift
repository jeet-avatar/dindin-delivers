import SwiftUI
import Charts
import EatFairShared

/// AI-Powered Insights Dashboard with predictive analytics and smart suggestions
struct AIInsightsView: View {
    @ObservedObject var ordersVM: OrdersViewModel
    @State private var selectedInsight: AIInsightType = .demand
    @State private var showDetailSheet: AIInsightDetail?

    enum AIInsightType: String, CaseIterable {
        case demand = "Demand"
        case inventory = "Inventory"
        case pricing = "Pricing"
        case staff = "Staffing"
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    // AI Status Header
                    aiStatusHeader

                    // Insight Type Selector
                    insightTypeSelector

                    // Main Insight Card based on selection
                    switch selectedInsight {
                    case .demand:
                        demandForecastCard
                    case .inventory:
                        inventoryInsightsCard
                    case .pricing:
                        pricingInsightsCard
                    case .staff:
                        staffingInsightsCard
                    }

                    // Smart Recommendations
                    smartRecommendationsCard

                    // Real-time Alerts
                    realTimeAlertsCard

                    // AI Learning Progress
                    aiLearningCard
                }
                .padding()
            }
            .background(RestaurantTheme.backgroundGrouped)
            .navigationTitle("AI Insights")
            .navigationBarTitleDisplayMode(.large)
            .sheet(item: $showDetailSheet) { detail in
                AIInsightDetailSheet(detail: detail)
            }
        }
    }

    // MARK: - AI Status Header
    private var aiStatusHeader: some View {
        HStack(spacing: 16) {
            ZStack {
                Circle()
                    .fill(
                        LinearGradient(
                            colors: [.purple, .blue],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )
                    .frame(width: 60, height: 60)

                Image(systemName: "brain.head.profile")
                    .font(.title)
                    .foregroundColor(.white)
            }

            VStack(alignment: .leading, spacing: 4) {
                HStack {
                    Text("AI Engine Active")
                        .font(.headline)

                    Circle()
                        .fill(.green)
                        .frame(width: 8, height: 8)
                }

                Text("Analyzing \(ordersVM.allOrders.count) orders to optimize your restaurant")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }

            Spacer()
        }
        .padding()
        .background(
            LinearGradient(
                colors: [Color.purple.opacity(0.1), Color.blue.opacity(0.1)],
                startPoint: .leading,
                endPoint: .trailing
            )
        )
        .cornerRadius(16)
    }

    // MARK: - Insight Type Selector
    private var insightTypeSelector: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 12) {
                ForEach(AIInsightType.allCases, id: \.self) { type in
                    InsightTypeButton(
                        type: type,
                        isSelected: selectedInsight == type,
                        action: {
                            withAnimation(.spring(response: 0.3)) {
                                selectedInsight = type
                            }
                        }
                    )
                }
            }
        }
    }

    // MARK: - Demand Forecast Card
    private var demandForecastCard: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack {
                Image(systemName: "chart.line.uptrend.xyaxis")
                    .foregroundColor(.purple)
                Text("Demand Forecast")
                    .font(.headline)
                Spacer()
                Button("View Details") {
                    showDetailSheet = AIInsightDetail(
                        title: "Demand Forecast",
                        description: "AI-powered prediction of order volume for the next 24 hours",
                        icon: "chart.line.uptrend.xyaxis"
                    )
                }
                .font(.caption)
                .foregroundColor(.purple)
            }

            // Forecast Chart
            Chart {
                ForEach(demandForecastData, id: \.hour) { data in
                    AreaMark(
                        x: .value("Hour", data.hour),
                        yStart: .value("Min", data.minOrders),
                        yEnd: .value("Max", data.maxOrders)
                    )
                    .foregroundStyle(Color.purple.opacity(0.2))

                    LineMark(
                        x: .value("Hour", data.hour),
                        y: .value("Predicted", data.predicted)
                    )
                    .foregroundStyle(Color.purple)
                    .lineStyle(StrokeStyle(lineWidth: 2))

                    PointMark(
                        x: .value("Hour", data.hour),
                        y: .value("Predicted", data.predicted)
                    )
                    .foregroundStyle(Color.purple)
                }
            }
            .frame(height: 180)
            .chartXAxis {
                AxisMarks(values: .stride(by: 2)) { value in
                    AxisValueLabel {
                        if let hour = value.as(String.self) {
                            Text(hour)
                                .font(.caption2)
                        }
                    }
                }
            }

            // Key Predictions
            HStack(spacing: 16) {
                PredictionBadge(
                    label: "Next Hour",
                    value: "\(ordersVM.estimatedOrdersNextHour)",
                    sublabel: "orders expected",
                    color: .purple
                )

                PredictionBadge(
                    label: "Peak Time",
                    value: "7:00 PM",
                    sublabel: "prepare extra staff",
                    color: .orange
                )

                PredictionBadge(
                    label: "Confidence",
                    value: "87%",
                    sublabel: "prediction accuracy",
                    color: .green
                )
            }
        }
        .padding()
        .background(RestaurantTheme.backgroundPrimary)
        .cornerRadius(16)
        .shadow(color: RestaurantTheme.cardShadow, radius: 4, x: 0, y: 2)
    }

    // MARK: - Inventory Insights Card
    private var inventoryInsightsCard: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack {
                Image(systemName: "cube.box.fill")
                    .foregroundColor(.orange)
                Text("Inventory Insights")
                    .font(.headline)
                Spacer()
            }

            // Low Stock Alerts
            VStack(spacing: 12) {
                InventoryAlertRow(
                    item: "Chicken Breast",
                    status: .critical,
                    remaining: "~8 servings",
                    action: "Order now"
                )

                InventoryAlertRow(
                    item: "Mozzarella Cheese",
                    status: .warning,
                    remaining: "~20 servings",
                    action: "Order soon"
                )

                InventoryAlertRow(
                    item: "Olive Oil",
                    status: .good,
                    remaining: "~50 servings",
                    action: "Well stocked"
                )
            }

            Divider()

            HStack {
                VStack(alignment: .leading) {
                    Text("AI Suggestion")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    Text("Based on tonight's forecast, order extra chicken and cheese before 3 PM")
                        .font(.subheadline)
                }

                Spacer()

                Button(action: {}) {
                    Text("Order")
                        .font(.subheadline)
                        .fontWeight(.semibold)
                        .foregroundColor(.white)
                        .padding(.horizontal, 16)
                        .padding(.vertical, 8)
                        .background(RestaurantTheme.brandOrange)
                        .cornerRadius(20)
                }
            }
        }
        .padding()
        .background(RestaurantTheme.backgroundPrimary)
        .cornerRadius(16)
        .shadow(color: RestaurantTheme.cardShadow, radius: 4, x: 0, y: 2)
    }

    // MARK: - Pricing Insights Card
    private var pricingInsightsCard: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack {
                Image(systemName: "dollarsign.circle.fill")
                    .foregroundColor(.green)
                Text("Dynamic Pricing Insights")
                    .font(.headline)
                Spacer()
            }

            // Pricing Recommendations
            VStack(spacing: 12) {
                PricingRecommendation(
                    item: "Margherita Pizza",
                    currentPrice: 14.99,
                    suggestedPrice: 16.99,
                    reason: "High demand during dinner hours",
                    impact: "+$45/day revenue"
                )

                PricingRecommendation(
                    item: "Caesar Salad",
                    currentPrice: 11.99,
                    suggestedPrice: 9.99,
                    reason: "Low order volume, price sensitivity detected",
                    impact: "+12 orders/day"
                )
            }

            Divider()

            HStack {
                Image(systemName: "lightbulb.fill")
                    .foregroundColor(.yellow)

                Text("Enable dynamic pricing to automatically adjust prices based on demand, time, and competition")
                    .font(.caption)
                    .foregroundColor(.secondary)

                Spacer()

                Toggle("", isOn: .constant(false))
                    .labelsHidden()
            }
        }
        .padding()
        .background(RestaurantTheme.backgroundPrimary)
        .cornerRadius(16)
        .shadow(color: RestaurantTheme.cardShadow, radius: 4, x: 0, y: 2)
    }

    // MARK: - Staffing Insights Card
    private var staffingInsightsCard: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack {
                Image(systemName: "person.3.fill")
                    .foregroundColor(.blue)
                Text("Staffing Optimization")
                    .font(.headline)
                Spacer()
            }

            // Staffing Schedule
            VStack(spacing: 8) {
                StaffingTimeSlot(
                    time: "11 AM - 2 PM",
                    recommended: 3,
                    current: 2,
                    status: .understaffed
                )

                StaffingTimeSlot(
                    time: "2 PM - 5 PM",
                    recommended: 2,
                    current: 2,
                    status: .optimal
                )

                StaffingTimeSlot(
                    time: "5 PM - 9 PM",
                    recommended: 4,
                    current: 3,
                    status: .understaffed
                )

                StaffingTimeSlot(
                    time: "9 PM - Close",
                    recommended: 2,
                    current: 3,
                    status: .overstaffed
                )
            }

            Divider()

            HStack {
                VStack(alignment: .leading) {
                    Text("Weekly Labor Cost Optimization")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    Text("Potential savings: $320/week")
                        .font(.subheadline)
                        .fontWeight(.semibold)
                        .foregroundColor(.green)
                }

                Spacer()

                Button("Optimize Schedule") {}
                    .font(.caption)
                    .fontWeight(.semibold)
                    .foregroundColor(.white)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 6)
                    .background(RestaurantTheme.brandBlue)
                    .cornerRadius(16)
            }
        }
        .padding()
        .background(RestaurantTheme.backgroundPrimary)
        .cornerRadius(16)
        .shadow(color: RestaurantTheme.cardShadow, radius: 4, x: 0, y: 2)
    }

    // MARK: - Smart Recommendations Card
    private var smartRecommendationsCard: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack {
                Image(systemName: "sparkles")
                    .foregroundColor(.purple)
                Text("Smart Recommendations")
                    .font(.headline)
                Spacer()
            }

            VStack(spacing: 12) {
                RecommendationRow(
                    icon: "clock.badge.checkmark",
                    title: "Reduce Prep Time",
                    description: "Pre-prep pizza dough 30 min before dinner rush",
                    impact: "Save 5 min per order",
                    color: .blue
                )

                RecommendationRow(
                    icon: "bag.badge.plus",
                    title: "Bundle Suggestion",
                    description: "Create 'Family Meal Deal' - projected +15% order value",
                    impact: "+$180/day revenue",
                    color: .green
                )

                RecommendationRow(
                    icon: "star.fill",
                    title: "Trending Item",
                    description: "Chicken Tikka orders up 45% - feature on homepage",
                    impact: "Increase visibility",
                    color: .orange
                )
            }
        }
        .padding()
        .background(RestaurantTheme.backgroundPrimary)
        .cornerRadius(16)
        .shadow(color: RestaurantTheme.cardShadow, radius: 4, x: 0, y: 2)
    }

    // MARK: - Real-time Alerts Card
    private var realTimeAlertsCard: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack {
                Image(systemName: "bell.badge.fill")
                    .foregroundColor(.red)
                Text("Real-time Alerts")
                    .font(.headline)
                Spacer()

                Text("3 active")
                    .font(.caption)
                    .foregroundColor(.white)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(.red)
                    .cornerRadius(10)
            }

            VStack(spacing: 8) {
                AlertRow(
                    type: .warning,
                    message: "Prep time above average (28 min vs 20 min target)",
                    time: "2 min ago"
                )

                AlertRow(
                    type: .info,
                    message: "Unusual spike in orders from Downtown area",
                    time: "15 min ago"
                )

                AlertRow(
                    type: .success,
                    message: "Customer rating improved to 4.8 this week",
                    time: "1 hour ago"
                )
            }
        }
        .padding()
        .background(RestaurantTheme.backgroundPrimary)
        .cornerRadius(16)
        .shadow(color: RestaurantTheme.cardShadow, radius: 4, x: 0, y: 2)
    }

    // MARK: - AI Learning Card
    private var aiLearningCard: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack {
                Image(systemName: "brain")
                    .foregroundColor(.purple)
                Text("AI Learning Progress")
                    .font(.headline)
                Spacer()
            }

            VStack(spacing: 12) {
                LearningProgressRow(
                    label: "Order Pattern Recognition",
                    progress: 0.92,
                    status: "Excellent"
                )

                LearningProgressRow(
                    label: "Customer Preference Model",
                    progress: 0.78,
                    status: "Good"
                )

                LearningProgressRow(
                    label: "Prep Time Optimization",
                    progress: 0.85,
                    status: "Very Good"
                )

                LearningProgressRow(
                    label: "Demand Forecasting",
                    progress: 0.67,
                    status: "Learning"
                )
            }

            HStack {
                Image(systemName: "info.circle")
                    .foregroundColor(.blue)
                Text("AI accuracy improves as more orders are processed. Current dataset: \(ordersVM.allOrders.count) orders")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
        }
        .padding()
        .background(RestaurantTheme.backgroundPrimary)
        .cornerRadius(16)
        .shadow(color: RestaurantTheme.cardShadow, radius: 4, x: 0, y: 2)
    }

    // MARK: - Sample Data
    private var demandForecastData: [DemandForecast] {
        [
            DemandForecast(hour: "Now", predicted: 5, minOrders: 3, maxOrders: 7),
            DemandForecast(hour: "4PM", predicted: 8, minOrders: 6, maxOrders: 11),
            DemandForecast(hour: "5PM", predicted: 15, minOrders: 12, maxOrders: 18),
            DemandForecast(hour: "6PM", predicted: 25, minOrders: 20, maxOrders: 30),
            DemandForecast(hour: "7PM", predicted: 35, minOrders: 28, maxOrders: 42),
            DemandForecast(hour: "8PM", predicted: 30, minOrders: 25, maxOrders: 36),
            DemandForecast(hour: "9PM", predicted: 20, minOrders: 15, maxOrders: 25)
        ]
    }
}

// MARK: - Supporting Types
struct DemandForecast {
    let hour: String
    let predicted: Int
    let minOrders: Int
    let maxOrders: Int
}

struct AIInsightDetail: Identifiable {
    let id = UUID()
    let title: String
    let description: String
    let icon: String
}

// MARK: - Supporting Views
struct InsightTypeButton: View {
    let type: AIInsightsView.AIInsightType
    let isSelected: Bool
    let action: () -> Void

    var icon: String {
        switch type {
        case .demand: return "chart.line.uptrend.xyaxis"
        case .inventory: return "cube.box.fill"
        case .pricing: return "dollarsign.circle.fill"
        case .staff: return "person.3.fill"
        }
    }

    var color: Color {
        switch type {
        case .demand: return .purple
        case .inventory: return .orange
        case .pricing: return .green
        case .staff: return .blue
        }
    }

    var body: some View {
        Button(action: action) {
            VStack(spacing: 8) {
                Image(systemName: icon)
                    .font(.title2)
                    .foregroundColor(isSelected ? .white : color)

                Text(type.rawValue)
                    .font(.caption)
                    .fontWeight(isSelected ? .semibold : .regular)
                    .foregroundColor(isSelected ? .white : .primary)
            }
            .frame(width: 80, height: 70)
            .background(isSelected ? color : color.opacity(0.1))
            .cornerRadius(12)
        }
    }
}

struct PredictionBadge: View {
    let label: String
    let value: String
    let sublabel: String
    let color: Color

    var body: some View {
        VStack(spacing: 4) {
            Text(label)
                .font(.caption2)
                .foregroundColor(.secondary)

            Text(value)
                .font(.headline)
                .fontWeight(.bold)
                .foregroundColor(color)

            Text(sublabel)
                .font(.caption2)
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 8)
        .background(color.opacity(0.1))
        .cornerRadius(10)
    }
}

struct InventoryAlertRow: View {
    let item: String
    let status: InventoryStatus
    let remaining: String
    let action: String

    enum InventoryStatus {
        case critical, warning, good

        var color: Color {
            switch self {
            case .critical: return .red
            case .warning: return .orange
            case .good: return .green
            }
        }

        var icon: String {
            switch self {
            case .critical: return "exclamationmark.triangle.fill"
            case .warning: return "exclamationmark.circle.fill"
            case .good: return "checkmark.circle.fill"
            }
        }
    }

    var body: some View {
        HStack {
            Image(systemName: status.icon)
                .foregroundColor(status.color)

            VStack(alignment: .leading, spacing: 2) {
                Text(item)
                    .font(.subheadline)
                    .fontWeight(.medium)
                Text(remaining)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }

            Spacer()

            Text(action)
                .font(.caption)
                .fontWeight(.medium)
                .foregroundColor(status.color)
                .padding(.horizontal, 10)
                .padding(.vertical, 4)
                .background(status.color.opacity(0.1))
                .cornerRadius(8)
        }
    }
}

struct PricingRecommendation: View {
    let item: String
    let currentPrice: Double
    let suggestedPrice: Double
    let reason: String
    let impact: String

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text(item)
                    .font(.subheadline)
                    .fontWeight(.medium)

                Spacer()

                HStack(spacing: 4) {
                    Text("$\(String(format: "%.2f", currentPrice))")
                        .strikethrough()
                        .foregroundColor(.secondary)

                    Image(systemName: "arrow.right")
                        .font(.caption)

                    Text("$\(String(format: "%.2f", suggestedPrice))")
                        .fontWeight(.bold)
                        .foregroundColor(suggestedPrice > currentPrice ? .green : .orange)
                }
                .font(.caption)
            }

            Text(reason)
                .font(.caption)
                .foregroundColor(.secondary)

            Text(impact)
                .font(.caption)
                .fontWeight(.medium)
                .foregroundColor(.green)
        }
        .padding()
        .background(Color.gray.opacity(0.05))
        .cornerRadius(10)
    }
}

struct StaffingTimeSlot: View {
    let time: String
    let recommended: Int
    let current: Int
    let status: StaffingStatus

    enum StaffingStatus {
        case understaffed, optimal, overstaffed

        var color: Color {
            switch self {
            case .understaffed: return .red
            case .optimal: return .green
            case .overstaffed: return .orange
            }
        }

        var label: String {
            switch self {
            case .understaffed: return "Need +\(abs(0)) more"
            case .optimal: return "Optimal"
            case .overstaffed: return "Overstaffed"
            }
        }
    }

    var body: some View {
        HStack {
            Text(time)
                .font(.subheadline)
                .frame(width: 100, alignment: .leading)

            Spacer()

            HStack(spacing: 4) {
                ForEach(0..<max(recommended, current), id: \.self) { i in
                    Image(systemName: "person.fill")
                        .font(.caption)
                        .foregroundColor(i < current ? (i < recommended ? .green : .orange) : .gray.opacity(0.3))
                }
            }

            Spacer()

            Text(status == .understaffed ? "Need +\(recommended - current)" : status.label)
                .font(.caption)
                .foregroundColor(status.color)
        }
        .padding(.vertical, 6)
    }
}

struct RecommendationRow: View {
    let icon: String
    let title: String
    let description: String
    let impact: String
    let color: Color

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .font(.title3)
                .foregroundColor(color)
                .frame(width: 40)

            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.subheadline)
                    .fontWeight(.medium)

                Text(description)
                    .font(.caption)
                    .foregroundColor(.secondary)

                Text(impact)
                    .font(.caption)
                    .fontWeight(.medium)
                    .foregroundColor(.green)
            }

            Spacer()

            Button(action: {}) {
                Image(systemName: "arrow.right.circle.fill")
                    .foregroundColor(color)
            }
        }
        .padding()
        .background(color.opacity(0.05))
        .cornerRadius(10)
    }
}

struct AlertRow: View {
    let type: AlertType
    let message: String
    let time: String

    enum AlertType {
        case warning, info, success

        var color: Color {
            switch self {
            case .warning: return .orange
            case .info: return .blue
            case .success: return .green
            }
        }

        var icon: String {
            switch self {
            case .warning: return "exclamationmark.triangle.fill"
            case .info: return "info.circle.fill"
            case .success: return "checkmark.circle.fill"
            }
        }
    }

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: type.icon)
                .foregroundColor(type.color)

            VStack(alignment: .leading, spacing: 2) {
                Text(message)
                    .font(.caption)
                Text(time)
                    .font(.caption2)
                    .foregroundColor(.secondary)
            }

            Spacer()
        }
        .padding(10)
        .background(type.color.opacity(0.1))
        .cornerRadius(8)
    }
}

struct LearningProgressRow: View {
    let label: String
    let progress: Double
    let status: String

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Text(label)
                    .font(.caption)
                Spacer()
                Text("\(Int(progress * 100))%")
                    .font(.caption)
                    .fontWeight(.semibold)
                    .foregroundColor(.purple)
            }

            GeometryReader { geometry in
                ZStack(alignment: .leading) {
                    Rectangle()
                        .fill(Color.purple.opacity(0.2))
                        .frame(height: 6)
                        .cornerRadius(3)

                    Rectangle()
                        .fill(
                            LinearGradient(
                                colors: [.purple, .blue],
                                startPoint: .leading,
                                endPoint: .trailing
                            )
                        )
                        .frame(width: geometry.size.width * progress, height: 6)
                        .cornerRadius(3)
                }
            }
            .frame(height: 6)
        }
    }
}

struct AIInsightDetailSheet: View {
    let detail: AIInsightDetail
    @Environment(\.dismiss) var dismiss

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    Image(systemName: detail.icon)
                        .font(.system(size: 60))
                        .foregroundColor(.purple)
                        .padding()

                    Text(detail.title)
                        .font(.title2)
                        .fontWeight(.bold)

                    Text(detail.description)
                        .font(.body)
                        .foregroundColor(.secondary)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal)

                    // Placeholder for detailed content
                    Text("Detailed analytics and insights coming soon...")
                        .font(.caption)
                        .foregroundColor(.gray)
                        .padding(.top, 40)
                }
                .padding()
            }
            .navigationTitle("Details")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") { dismiss() }
                }
            }
        }
    }
}

#Preview {
    AIInsightsView(ordersVM: OrdersViewModel())
}
