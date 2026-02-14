import SwiftUI
import Charts
import EatFairShared

/// World-class Analytics Dashboard with insights and trends
struct AnalyticsView: View {
    @ObservedObject var ordersVM: OrdersViewModel
    @StateObject private var analyticsVM = AnalyticsViewModel()
    @State private var selectedPeriod: AnalyticsViewModel.TimePeriod = .today
    @State private var selectedChart: ChartType = .revenue

    enum ChartType: String, CaseIterable {
        case revenue = "Revenue"
        case orders = "Orders"
        case avgOrder = "Avg Order"
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    // Period Selector
                    periodSelector

                    // Key Metrics Cards
                    keyMetricsGrid

                    // Revenue Chart
                    revenueChartCard

                    // Orders by Status
                    ordersByStatusCard

                    // Popular Items
                    popularItemsCard

                    // Peak Hours
                    peakHoursCard

                    // Performance Summary
                    performanceSummaryCard
                }
                .padding()
            }
            .background(RestaurantTheme.backgroundGrouped)
            .navigationTitle("Analytics")
            .navigationBarTitleDisplayMode(.large)
            .onAppear {
                // Update analytics from orders when view appears
                analyticsVM.updateFromOrders(ordersVM.allOrders, period: selectedPeriod)
                analyticsVM.fetchPromotionAnalytics()
            }
            .onChange(of: selectedPeriod) { _, newPeriod in
                // Update analytics when period changes
                analyticsVM.updateFromOrders(ordersVM.allOrders, period: newPeriod)
            }
            .onChange(of: ordersVM.allOrders.count) { _, _ in
                // Update analytics when orders change
                analyticsVM.updateFromOrders(ordersVM.allOrders, period: selectedPeriod)
            }
        }
    }

    // MARK: - Period Selector
    private var periodSelector: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(AnalyticsViewModel.TimePeriod.allCases, id: \.self) { period in
                    Button(action: {
                        withAnimation(.spring(response: 0.3)) {
                            selectedPeriod = period
                        }
                    }) {
                        Text(period.rawValue)
                            .font(.subheadline)
                            .fontWeight(selectedPeriod == period ? .semibold : .regular)
                            .foregroundColor(selectedPeriod == period ? .white : .secondary)
                            .padding(.horizontal, 20)
                            .padding(.vertical, 10)
                            .background(selectedPeriod == period ? RestaurantTheme.brandOrange : Color.gray.opacity(0.1))
                            .cornerRadius(20)
                    }
                    .accessibilityLabel("View \(period.rawValue) analytics")
                    .accessibilityHint("Shows analytics for \(period.rawValue.lowercased())")
                }
            }
        }
    }

    // MARK: - Key Metrics Grid
    private var keyMetricsGrid: some View {
        LazyVGrid(columns: [
            GridItem(.flexible()),
            GridItem(.flexible())
        ], spacing: 12) {
            MetricCard(
                title: "Total Revenue",
                value: "$\(Int(analyticsVM.totalRevenue))",
                change: formatChange(analyticsVM.revenueChange),
                isPositive: analyticsVM.revenueChange >= 0,
                icon: "dollarsign.circle.fill",
                color: RestaurantTheme.brandGreen
            )

            MetricCard(
                title: "Total Orders",
                value: "\(analyticsVM.totalOrders)",
                change: formatChange(analyticsVM.ordersChange),
                isPositive: analyticsVM.ordersChange >= 0,
                icon: "bag.fill",
                color: RestaurantTheme.brandBlue
            )

            MetricCard(
                title: "Avg Order Value",
                value: "$\(Int(analyticsVM.averageOrderValue))",
                change: formatChange(analyticsVM.avgOrderChange),
                isPositive: analyticsVM.avgOrderChange >= 0,
                icon: "chart.line.uptrend.xyaxis",
                color: RestaurantTheme.brandPurple
            )

            MetricCard(
                title: "Avg Prep Time",
                value: "\(analyticsVM.averagePrepTime) min",
                change: "\(analyticsVM.prepTimeChange >= 0 ? "+" : "")\(analyticsVM.prepTimeChange) min",
                isPositive: analyticsVM.prepTimeChange <= 0, // Lower prep time is better
                icon: "clock.fill",
                color: RestaurantTheme.brandOrange
            )
        }
    }

    private func formatChange(_ value: Double) -> String {
        let prefix = value >= 0 ? "+" : ""
        return "\(prefix)\(String(format: "%.1f", value))%"
    }

    // MARK: - Revenue Chart Card
    private var revenueChartCard: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack {
                Text("Revenue Trend")
                    .font(.headline)

                Spacer()

                Picker("", selection: $selectedChart) {
                    ForEach(ChartType.allCases, id: \.self) { type in
                        Text(type.rawValue).tag(type)
                    }
                }
                .pickerStyle(.segmented)
                .frame(width: 200)
            }

            // Chart using real data from analyticsVM
            Chart {
                ForEach(analyticsVM.hourlyData) { data in
                    BarMark(
                        x: .value("Hour", data.hour),
                        y: .value("Value", selectedChart == .revenue ? data.revenue : (selectedChart == .orders ? Double(data.orders) : data.avgOrder))
                    )
                    .foregroundStyle(
                        LinearGradient(
                            colors: [RestaurantTheme.brandOrange, RestaurantTheme.brandOrange.opacity(0.6)],
                            startPoint: .top,
                            endPoint: .bottom
                        )
                    )
                    .cornerRadius(4)
                }
            }
            .frame(height: 200)
            .chartXAxis {
                AxisMarks(values: .stride(by: 2)) { value in
                    AxisGridLine()
                    AxisValueLabel {
                        if let hour = value.as(String.self) {
                            Text(hour)
                                .font(.caption2)
                        }
                    }
                }
            }
            .chartYAxis {
                AxisMarks(position: .leading) { value in
                    AxisGridLine()
                    AxisValueLabel {
                        if let val = value.as(Double.self) {
                            Text(selectedChart == .revenue ? "$\(Int(val))" : "\(Int(val))")
                                .font(.caption2)
                        }
                    }
                }
            }
        }
        .padding()
        .background(RestaurantTheme.backgroundPrimary)
        .cornerRadius(16)
        .shadow(color: RestaurantTheme.cardShadow, radius: 4, x: 0, y: 2)
    }

    // MARK: - Orders by Status Card
    private var ordersByStatusCard: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Orders by Status")
                .font(.headline)

            HStack(spacing: 16) {
                StatusDonutItem(
                    label: "Completed",
                    value: ordersVM.completedOrders.count,
                    color: RestaurantTheme.brandGreen
                )

                StatusDonutItem(
                    label: "Preparing",
                    value: ordersVM.preparingOrders.count,
                    color: RestaurantTheme.brandBlue
                )

                StatusDonutItem(
                    label: "Ready",
                    value: ordersVM.readyOrders.count,
                    color: RestaurantTheme.brandOrange
                )

                StatusDonutItem(
                    label: "New",
                    value: ordersVM.newOrders.count,
                    color: RestaurantTheme.brandPurple
                )
            }
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
                Text("Top Selling Items")
                    .font(.headline)
                Spacer()
                Text(selectedPeriod.rawValue)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }

            if analyticsVM.popularItems.isEmpty {
                Text("No order data available")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                    .padding(.vertical, 20)
            } else {
                ForEach(Array(analyticsVM.popularItems.enumerated()), id: \.element.id) { index, item in
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

                    if index < analyticsVM.popularItems.count - 1 {
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

    // MARK: - Peak Hours Card
    private var peakHoursCard: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Peak Hours")
                .font(.headline)

            Chart {
                ForEach(analyticsVM.hourlyData) { data in
                    AreaMark(
                        x: .value("Hour", data.hour),
                        y: .value("Orders", data.orders)
                    )
                    .foregroundStyle(
                        LinearGradient(
                            colors: [RestaurantTheme.brandBlue.opacity(0.5), RestaurantTheme.brandBlue.opacity(0.1)],
                            startPoint: .top,
                            endPoint: .bottom
                        )
                    )

                    LineMark(
                        x: .value("Hour", data.hour),
                        y: .value("Orders", data.orders)
                    )
                    .foregroundStyle(RestaurantTheme.brandBlue)
                    .lineStyle(StrokeStyle(lineWidth: 2))
                }
            }
            .frame(height: 150)
            .chartXAxis {
                AxisMarks(values: .stride(by: 3)) { value in
                    AxisValueLabel {
                        if let hour = value.as(String.self) {
                            Text(hour)
                                .font(.caption2)
                        }
                    }
                }
            }

            HStack(spacing: 20) {
                PeakHourInfo(label: "Lunch Peak", time: analyticsVM.lunchPeakTime, orders: analyticsVM.lunchPeakOrders)
                PeakHourInfo(label: "Dinner Peak", time: analyticsVM.dinnerPeakTime, orders: analyticsVM.dinnerPeakOrders)
            }
        }
        .padding()
        .background(RestaurantTheme.backgroundPrimary)
        .cornerRadius(16)
        .shadow(color: RestaurantTheme.cardShadow, radius: 4, x: 0, y: 2)
    }

    // MARK: - Performance Summary Card
    private var performanceSummaryCard: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Performance Summary")
                .font(.headline)

            VStack(spacing: 12) {
                PerformanceRow(
                    label: "Order Completion Rate",
                    value: String(format: "%.1f%%", analyticsVM.orderCompletionRate * 100),
                    progress: analyticsVM.orderCompletionRate,
                    color: RestaurantTheme.brandGreen
                )

                PerformanceRow(
                    label: "On-Time Delivery",
                    value: String(format: "%.1f%%", analyticsVM.onTimeDeliveryRate * 100),
                    progress: analyticsVM.onTimeDeliveryRate,
                    color: RestaurantTheme.brandBlue
                )
            }
        }
        .padding()
        .background(RestaurantTheme.backgroundPrimary)
        .cornerRadius(16)
        .shadow(color: RestaurantTheme.cardShadow, radius: 4, x: 0, y: 2)
    }

}

// MARK: - Metric Card
struct MetricCard: View {
    let title: String
    let value: String
    let change: String
    let isPositive: Bool
    let icon: String
    let color: Color

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: icon)
                    .foregroundColor(color)
                Spacer()
                HStack(spacing: 2) {
                    Image(systemName: isPositive ? "arrow.up.right" : "arrow.down.right")
                        .font(.caption2)
                    Text(change)
                        .font(.caption)
                        .fontWeight(.medium)
                }
                .foregroundColor(isPositive ? .green : .red)
            }

            VStack(alignment: .leading, spacing: 4) {
                Text(value)
                    .font(.title2)
                    .fontWeight(.bold)

                Text(title)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
        }
        .padding()
        .background(RestaurantTheme.backgroundPrimary)
        .cornerRadius(16)
        .shadow(color: RestaurantTheme.cardShadow, radius: 4, x: 0, y: 2)
    }
}

// MARK: - Status Donut Item
struct StatusDonutItem: View {
    let label: String
    let value: Int
    let color: Color

    var body: some View {
        VStack(spacing: 8) {
            ZStack {
                Circle()
                    .stroke(color.opacity(0.2), lineWidth: 6)
                    .frame(width: 50, height: 50)

                Circle()
                    .trim(from: 0, to: min(CGFloat(value) / 20, 1))
                    .stroke(color, style: StrokeStyle(lineWidth: 6, lineCap: .round))
                    .frame(width: 50, height: 50)
                    .rotationEffect(.degrees(-90))

                Text("\(value)")
                    .font(.headline)
                    .fontWeight(.bold)
            }

            Text(label)
                .font(.caption2)
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity)
    }
}

// MARK: - Peak Hour Info
struct PeakHourInfo: View {
    let label: String
    let time: String
    let orders: Int

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label)
                .font(.caption)
                .foregroundColor(.secondary)

            Text(time)
                .font(.subheadline)
                .fontWeight(.semibold)

            HStack(spacing: 4) {
                Image(systemName: "bag.fill")
                    .font(.caption)
                Text("\(orders) orders")
                    .font(.caption)
            }
            .foregroundColor(RestaurantTheme.brandBlue)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .background(RestaurantTheme.brandBlue.opacity(0.1))
        .cornerRadius(12)
    }
}

// MARK: - Performance Row
struct PerformanceRow: View {
    let label: String
    let value: String
    let progress: Double
    let color: Color

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text(label)
                    .font(.subheadline)
                Spacer()
                Text(value)
                    .font(.subheadline)
                    .fontWeight(.semibold)
                    .foregroundColor(color)
            }

            GeometryReader { geometry in
                ZStack(alignment: .leading) {
                    Rectangle()
                        .fill(color.opacity(0.2))
                        .frame(height: 8)
                        .cornerRadius(4)

                    Rectangle()
                        .fill(color)
                        .frame(width: geometry.size.width * progress, height: 8)
                        .cornerRadius(4)
                }
            }
            .frame(height: 8)
        }
    }
}

#Preview {
    AnalyticsView(ordersVM: OrdersViewModel())
}
