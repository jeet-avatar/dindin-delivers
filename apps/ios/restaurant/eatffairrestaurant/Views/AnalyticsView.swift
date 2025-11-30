import SwiftUI
import Charts
import EatFairShared

/// World-class Analytics Dashboard with insights and trends
struct AnalyticsView: View {
    @ObservedObject var ordersVM: OrdersViewModel
    @State private var selectedPeriod: TimePeriod = .today
    @State private var selectedChart: ChartType = .revenue

    enum TimePeriod: String, CaseIterable {
        case today = "Today"
        case week = "This Week"
        case month = "This Month"
        case year = "This Year"
    }

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
        }
    }

    // MARK: - Period Selector
    private var periodSelector: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(TimePeriod.allCases, id: \.self) { period in
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
                value: "$\(Int(ordersVM.todayRevenue))",
                change: "+12.5%",
                isPositive: true,
                icon: "dollarsign.circle.fill",
                color: RestaurantTheme.brandGreen
            )

            MetricCard(
                title: "Total Orders",
                value: "\(ordersVM.todayOrderCount)",
                change: "+8.2%",
                isPositive: true,
                icon: "bag.fill",
                color: RestaurantTheme.brandBlue
            )

            MetricCard(
                title: "Avg Order Value",
                value: "$\(ordersVM.todayOrderCount > 0 ? Int(ordersVM.todayRevenue / Double(ordersVM.todayOrderCount)) : 0)",
                change: "+5.1%",
                isPositive: true,
                icon: "chart.line.uptrend.xyaxis",
                color: RestaurantTheme.brandPurple
            )

            MetricCard(
                title: "Avg Prep Time",
                value: "\(ordersVM.averagePrepTime) min",
                change: "-2 min",
                isPositive: true,
                icon: "clock.fill",
                color: RestaurantTheme.brandOrange
            )
        }
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

            // Chart
            Chart {
                ForEach(sampleHourlyData, id: \.hour) { data in
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
                Text("Today")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }

            ForEach(Array(samplePopularItems.enumerated()), id: \.element.name) { index, item in
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

                if index < samplePopularItems.count - 1 {
                    Divider()
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
                ForEach(sampleHourlyData, id: \.hour) { data in
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
                PeakHourInfo(label: "Lunch Peak", time: "12:00 - 2:00 PM", orders: 45)
                PeakHourInfo(label: "Dinner Peak", time: "6:00 - 9:00 PM", orders: 78)
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
                    value: "98.5%",
                    progress: 0.985,
                    color: RestaurantTheme.brandGreen
                )

                PerformanceRow(
                    label: "On-Time Delivery",
                    value: "94.2%",
                    progress: 0.942,
                    color: RestaurantTheme.brandBlue
                )

                PerformanceRow(
                    label: "Customer Rating",
                    value: "4.8/5",
                    progress: 0.96,
                    color: RestaurantTheme.brandOrange
                )

                PerformanceRow(
                    label: "Repeat Customers",
                    value: "67%",
                    progress: 0.67,
                    color: RestaurantTheme.brandPurple
                )
            }
        }
        .padding()
        .background(RestaurantTheme.backgroundPrimary)
        .cornerRadius(16)
        .shadow(color: RestaurantTheme.cardShadow, radius: 4, x: 0, y: 2)
    }

    // MARK: - Sample Data
    private var sampleHourlyData: [HourlyData] {
        [
            HourlyData(hour: "9AM", revenue: 120, orders: 8, avgOrder: 15),
            HourlyData(hour: "10AM", revenue: 180, orders: 12, avgOrder: 15),
            HourlyData(hour: "11AM", revenue: 350, orders: 22, avgOrder: 16),
            HourlyData(hour: "12PM", revenue: 520, orders: 35, avgOrder: 15),
            HourlyData(hour: "1PM", revenue: 480, orders: 30, avgOrder: 16),
            HourlyData(hour: "2PM", revenue: 280, orders: 18, avgOrder: 16),
            HourlyData(hour: "3PM", revenue: 150, orders: 10, avgOrder: 15),
            HourlyData(hour: "4PM", revenue: 180, orders: 12, avgOrder: 15),
            HourlyData(hour: "5PM", revenue: 320, orders: 20, avgOrder: 16),
            HourlyData(hour: "6PM", revenue: 580, orders: 38, avgOrder: 15),
            HourlyData(hour: "7PM", revenue: 720, orders: 45, avgOrder: 16),
            HourlyData(hour: "8PM", revenue: 650, orders: 42, avgOrder: 15),
            HourlyData(hour: "9PM", revenue: 420, orders: 28, avgOrder: 15)
        ]
    }

    private var samplePopularItems: [PopularItem] {
        [
            PopularItem(name: "Margherita Pizza", quantity: 45, revenue: 675),
            PopularItem(name: "Chicken Tikka Masala", quantity: 38, revenue: 570),
            PopularItem(name: "Caesar Salad", quantity: 32, revenue: 320),
            PopularItem(name: "Beef Burger", quantity: 28, revenue: 392),
            PopularItem(name: "Pasta Carbonara", quantity: 25, revenue: 375)
        ]
    }
}

// MARK: - Supporting Types
struct HourlyData {
    let hour: String
    let revenue: Double
    let orders: Int
    let avgOrder: Double
}

struct PopularItem {
    let name: String
    let quantity: Int
    let revenue: Double
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
