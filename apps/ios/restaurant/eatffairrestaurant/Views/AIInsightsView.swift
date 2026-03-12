import SwiftUI
import Charts
import EatFairShared

/// AI-Powered Insights Dashboard with real data from backend API
struct AIInsightsView: View {
    @ObservedObject var ordersVM: OrdersViewModel
    @StateObject private var viewModel = AIInsightsViewModel()
    @State private var selectedInsight: AIInsightType = .demand
    @State private var selectedPeriod: String = "today"
    @State private var showingNonPromoAlert = false
    @State private var selectedRecommendation: P2PAIRecommendation?

    enum AIInsightType: String, CaseIterable {
        case demand = "Demand"
        case performance = "Performance"
        case items = "Top Items"
        case staff = "Staffing"
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    // AI Status Header
                    aiStatusHeader

                    // Period Selector
                    periodSelector

                    // Insight Type Selector
                    insightTypeSelector

                    if viewModel.isLoading {
                        loadingView
                    } else if let error = viewModel.errorMessage {
                        errorView(error)
                    } else {
                        // Main Insight Card based on selection
                        switch selectedInsight {
                        case .demand:
                            demandForecastCard
                        case .performance:
                            performanceCard
                        case .items:
                            popularItemsCard
                        case .staff:
                            staffingInsightsCard
                        }

                        // Smart Recommendations (if available)
                        if !viewModel.recommendations.isEmpty {
                            smartRecommendationsCard
                        }

                        // Peak Hours Analysis
                        peakHoursCard
                    }
                }
                .padding()
            }
            .background(RestaurantTheme.backgroundGrouped)
            .navigationTitle("AI Insights")
            .navigationBarTitleDisplayMode(.large)
            .onAppear {
                viewModel.fetchInsights(period: selectedPeriod)
            }
            .onChange(of: selectedPeriod) { _, newPeriod in
                viewModel.fetchInsights(period: newPeriod)
            }
            .refreshable {
                viewModel.fetchInsights(period: selectedPeriod)
            }
        }
    }

    // MARK: - Loading View
    private var loadingView: some View {
        VStack(spacing: 16) {
            ProgressView()
                .scaleEffect(1.5)
            Text("Loading AI Insights...")
                .font(.subheadline)
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 60)
    }

    // MARK: - Error View
    private func errorView(_ error: String) -> some View {
        VStack(spacing: 16) {
            Image(systemName: "exclamationmark.triangle")
                .font(.system(size: 40))
                .foregroundColor(.orange)
            Text("Unable to load insights")
                .font(.headline)
            Text(error)
                .font(.caption)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
            Button("Retry") {
                viewModel.fetchInsights(period: selectedPeriod)
            }
            .buttonStyle(.borderedProminent)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 40)
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
                        .fill(viewModel.insights != nil ? .green : .orange)
                        .frame(width: 8, height: 8)
                }

                Text("Analyzing \(viewModel.totalOrders) orders to optimize your restaurant")
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

    // MARK: - Period Selector
    private var periodSelector: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(["today", "week", "month", "year"], id: \.self) { period in
                    Button(action: {
                        withAnimation(.spring(response: 0.3)) {
                            selectedPeriod = period
                        }
                    }) {
                        Text(period.capitalized)
                            .font(.subheadline)
                            .fontWeight(selectedPeriod == period ? .semibold : .regular)
                            .foregroundColor(selectedPeriod == period ? .white : .secondary)
                            .padding(.horizontal, 20)
                            .padding(.vertical, 10)
                            .background(selectedPeriod == period ? RestaurantTheme.brandOrange : Color.gray.opacity(0.1))
                            .cornerRadius(20)
                    }
                }
            }
        }
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
            }

            if viewModel.demandForecast.isEmpty {
                Text("Not enough data for forecast. Keep processing orders!")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                    .padding(.vertical, 20)
            } else {
                // Forecast Chart
                Chart {
                    ForEach(viewModel.demandForecast) { data in
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
                    AxisMarks(values: .automatic) { value in
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
                        value: "\(viewModel.estimatedOrdersNextHour)",
                        sublabel: "orders expected",
                        color: .purple
                    )

                    PredictionBadge(
                        label: "Peak Time",
                        value: viewModel.peakHour,
                        sublabel: "\(viewModel.peakHourOrders) orders",
                        color: .orange
                    )

                    PredictionBadge(
                        label: "Confidence",
                        value: "\(Int(viewModel.forecastConfidence * 100))%",
                        sublabel: "accuracy",
                        color: .green
                    )
                }
            }
        }
        .padding()
        .background(RestaurantTheme.backgroundPrimary)
        .cornerRadius(16)
        .shadow(color: RestaurantTheme.cardShadow, radius: 4, x: 0, y: 2)
    }

    // MARK: - Performance Card
    private var performanceCard: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack {
                Image(systemName: "chart.bar.fill")
                    .foregroundColor(.green)
                Text("Performance Metrics")
                    .font(.headline)
                Spacer()
            }

            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                MetricTile(
                    title: "Total Orders",
                    value: "\(viewModel.totalOrders)",
                    icon: "bag.fill",
                    color: .blue
                )

                MetricTile(
                    title: "Revenue",
                    value: "$\(Int(viewModel.totalRevenue))",
                    icon: "dollarsign.circle.fill",
                    color: .green
                )

                MetricTile(
                    title: "Avg Order",
                    value: "$\(Int(viewModel.averageOrderValue))",
                    icon: "chart.line.uptrend.xyaxis",
                    color: .purple
                )

                MetricTile(
                    title: "Completion Rate",
                    value: "\(Int(viewModel.orderCompletionRate * 100))%",
                    icon: "checkmark.circle.fill",
                    color: .orange
                )
            }

            // Prep Time
            HStack {
                Image(systemName: "clock.fill")
                    .foregroundColor(.blue)
                Text("Avg Prep Time")
                    .font(.subheadline)
                Spacer()
                Text("\(viewModel.averagePrepTime) min")
                    .font(.headline)
                    .foregroundColor(viewModel.averagePrepTime > 25 ? .red : .green)
            }
            .padding()
            .background(Color.gray.opacity(0.1))
            .cornerRadius(10)
        }
        .padding()
        .background(RestaurantTheme.backgroundPrimary)
        .cornerRadius(16)
        .shadow(color: RestaurantTheme.cardShadow, radius: 4, x: 0, y: 2)
    }

    // MARK: - Popular Items Card
    private var popularItemsCard: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack {
                Image(systemName: "star.fill")
                    .foregroundColor(.orange)
                Text("Top Selling Items")
                    .font(.headline)
                Spacer()
                Text(selectedPeriod.capitalized)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }

            if viewModel.popularItems.isEmpty {
                Text("No order data available yet")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                    .padding(.vertical, 20)
            } else {
                ForEach(Array(viewModel.popularItems.enumerated()), id: \.element.id) { index, item in
                    HStack(spacing: 12) {
                        Text("\(index + 1)")
                            .font(.caption)
                            .fontWeight(.bold)
                            .foregroundColor(.white)
                            .frame(width: 24, height: 24)
                            .background(index < 3 ? RestaurantTheme.brandOrange : Color.gray)
                            .clipShape(Circle())

                        VStack(alignment: .leading, spacing: 2) {
                            Text(item.name)
                                .font(.subheadline)
                                .fontWeight(.medium)
                            Text("\(item.quantity) orders")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }

                        Spacer()

                        Text("$\(Int(item.revenue))")
                            .font(.subheadline)
                            .fontWeight(.semibold)
                            .foregroundColor(RestaurantTheme.brandGreen)
                    }
                    .padding(.vertical, 4)

                    if index < viewModel.popularItems.count - 1 {
                        Divider()
                    }
                }
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
                Text("Staffing Recommendations")
                    .font(.headline)
                Spacer()
            }

            if viewModel.staffingRecommendations.isEmpty {
                Text("Not enough data for staffing recommendations")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                    .padding(.vertical, 20)
            } else {
                ForEach(viewModel.staffingRecommendations) { slot in
                    HStack {
                        Text(slot.timeSlot)
                            .font(.subheadline)
                            .frame(width: 110, alignment: .leading)

                        Spacer()

                        HStack(spacing: 4) {
                            ForEach(0..<slot.recommendedStaff, id: \.self) { _ in
                                Image(systemName: "person.fill")
                                    .font(.caption)
                                    .foregroundColor(.green)
                            }
                        }

                        Spacer()

                        VStack(alignment: .trailing) {
                            Text("\(slot.recommendedStaff) staff")
                                .font(.caption)
                                .fontWeight(.semibold)
                            Text("\(slot.expectedOrders) orders")
                                .font(.caption2)
                                .foregroundColor(.secondary)
                        }
                    }
                    .padding(.vertical, 6)
                }
            }

            Divider()

            HStack {
                Image(systemName: "lightbulb.fill")
                    .foregroundColor(.yellow)
                Text("Based on \(selectedPeriod) order patterns")
                    .font(.caption)
                    .foregroundColor(.secondary)
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

            ForEach(viewModel.recommendations) { rec in
                if rec.type == "promotion" {
                    NavigationLink(destination: PromotionsView()) {
                        recommendationRow(rec: rec)
                    }
                    .buttonStyle(.plain)
                } else {
                    Button {
                        selectedRecommendation = rec
                        showingNonPromoAlert = true
                    } label: {
                        recommendationRow(rec: rec)
                    }
                    .buttonStyle(.plain)
                }
            }
        }
        .padding()
        .background(RestaurantTheme.backgroundPrimary)
        .cornerRadius(16)
        .shadow(color: RestaurantTheme.cardShadow, radius: 4, x: 0, y: 2)
        .alert("Recommendation", isPresented: $showingNonPromoAlert) {
            Button("OK", role: .cancel) {}
        } message: {
            if let rec = selectedRecommendation {
                switch rec.type {
                case "menu":
                    Text("Go to Menu Management to add combo meals and update your offerings.")
                case "timing":
                    Text("Update your operating hours in Restaurant Settings to capture more orders.")
                default:
                    Text("Check your restaurant settings to implement this recommendation.")
                }
            }
        }
    }

    // MARK: - Recommendation Row
    private func recommendationRow(rec: P2PAIRecommendation) -> some View {
        HStack(spacing: 12) {
            Image(systemName: rec.icon)
                .font(.title3)
                .foregroundColor(colorForPriority(rec.priority))
                .frame(width: 40)

            VStack(alignment: .leading, spacing: 4) {
                Text(rec.title)
                    .font(.subheadline)
                    .fontWeight(.medium)

                Text(rec.description)
                    .font(.caption)
                    .foregroundColor(.secondary)

                Text(rec.impact)
                    .font(.caption)
                    .fontWeight(.medium)
                    .foregroundColor(.green)
            }

            Spacer()

            Image(systemName: rec.type == "promotion" ? "chevron.right" : "info.circle")
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .padding()
        .background(colorForPriority(rec.priority).opacity(0.05))
        .cornerRadius(10)
    }

    // MARK: - Peak Hours Card
    private var peakHoursCard: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack {
                Image(systemName: "clock.fill")
                    .foregroundColor(.blue)
                Text("Peak Hours")
                    .font(.headline)
                Spacer()
            }

            HStack(spacing: 20) {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Lunch Peak")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    Text(viewModel.lunchPeakTime)
                        .font(.subheadline)
                        .fontWeight(.semibold)
                    HStack(spacing: 4) {
                        Image(systemName: "bag.fill")
                            .font(.caption)
                        Text("\(viewModel.lunchPeakOrders) orders")
                            .font(.caption)
                    }
                    .foregroundColor(RestaurantTheme.brandBlue)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding()
                .background(RestaurantTheme.brandBlue.opacity(0.1))
                .cornerRadius(12)

                VStack(alignment: .leading, spacing: 4) {
                    Text("Dinner Peak")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    Text(viewModel.dinnerPeakTime)
                        .font(.subheadline)
                        .fontWeight(.semibold)
                    HStack(spacing: 4) {
                        Image(systemName: "bag.fill")
                            .font(.caption)
                        Text("\(viewModel.dinnerPeakOrders) orders")
                            .font(.caption)
                    }
                    .foregroundColor(RestaurantTheme.brandOrange)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding()
                .background(RestaurantTheme.brandOrange.opacity(0.1))
                .cornerRadius(12)
            }
        }
        .padding()
        .background(RestaurantTheme.backgroundPrimary)
        .cornerRadius(16)
        .shadow(color: RestaurantTheme.cardShadow, radius: 4, x: 0, y: 2)
    }

    // MARK: - Helper Functions
    private func colorForPriority(_ priority: String) -> Color {
        switch priority {
        case "high": return .red
        case "medium": return .orange
        default: return .blue
        }
    }
}

// MARK: - Supporting Views

struct InsightTypeButton: View {
    let type: AIInsightsView.AIInsightType
    let isSelected: Bool
    let action: () -> Void

    var icon: String {
        switch type {
        case .demand: return "chart.line.uptrend.xyaxis"
        case .performance: return "chart.bar.fill"
        case .items: return "star.fill"
        case .staff: return "person.3.fill"
        }
    }

    var color: Color {
        switch type {
        case .demand: return .purple
        case .performance: return .green
        case .items: return .orange
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

struct MetricTile: View {
    let title: String
    let value: String
    let icon: String
    let color: Color

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Image(systemName: icon)
                    .foregroundColor(color)
                Spacer()
            }

            Text(value)
                .font(.title2)
                .fontWeight(.bold)

            Text(title)
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .padding()
        .background(Color.gray.opacity(0.05))
        .cornerRadius(12)
    }
}

#Preview {
    AIInsightsView(ordersVM: OrdersViewModel())
}
