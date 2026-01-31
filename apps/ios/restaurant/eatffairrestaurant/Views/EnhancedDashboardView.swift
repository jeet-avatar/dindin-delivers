import SwiftUI
import EatFairShared

/// World-class Restaurant Dashboard with AI-powered insights
struct EnhancedDashboardView: View {
    @StateObject private var ordersVM = OrdersViewModel()
    @State private var selectedTab = 0
    @State private var showOrderDetail: Order?
    @State private var showSettings = false

    var body: some View {
        TabView(selection: $selectedTab) {
            // Orders Dashboard
            OrdersDashboardView(ordersVM: ordersVM)
                .tabItem {
                    Label("Orders", systemImage: "list.clipboard.fill")
                }
                .tag(0)

            // Menu Management
            EnhancedMenuView()
                .tabItem {
                    Label("Menu", systemImage: "menucard.fill")
                }
                .tag(1)

            // Analytics
            AnalyticsView(ordersVM: ordersVM)
                .tabItem {
                    Label("Analytics", systemImage: "chart.bar.fill")
                }
                .tag(2)

            // AI Insights
            AIInsightsView(ordersVM: ordersVM)
                .tabItem {
                    Label("AI", systemImage: "brain.head.profile")
                }
                .tag(3)

            // Settings
            RestaurantSettingsView()
                .tabItem {
                    Label("Settings", systemImage: "gearshape.fill")
                }
                .tag(4)
        }
        .accentColor(RestaurantTheme.brandOrange)
        .onAppear {
            ordersVM.startListening()
        }
        .onDisappear {
            ordersVM.stopListening()
        }
    }
}

// MARK: - Orders Dashboard View
struct OrdersDashboardView: View {
    @ObservedObject var ordersVM: OrdersViewModel
    @State private var selectedFilter: OrderFilter = .all
    @State private var showOrderDetail: Order?

    enum OrderFilter: String, CaseIterable {
        case all = "All"
        case new = "New"
        case preparing = "Preparing"
        case ready = "Ready"
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Status Bar
                statusBar

                // Quick Stats
                quickStatsBar

                // Filter Tabs
                filterTabs

                // Orders List
                ScrollView {
                    LazyVStack(spacing: 12) {
                        // AI Suggestion Banner
                        if let suggestion = ordersVM.aiSuggestion {
                            AISuggestionBanner(suggestion: suggestion)
                        }

                        // Orders
                        ForEach(filteredOrders) { order in
                            EnhancedOrderCard(
                                order: order,
                                onAccept: { ordersVM.acceptOrder(order) },
                                onReject: { ordersVM.rejectOrder(order) },
                                onMarkReady: { ordersVM.markOrderReady(order) },
                                onSelfDeliver: { ordersVM.acceptDelivery(order) },
                                onSendToDriver: { ordersVM.declineDelivery(order) },
                                onTap: { showOrderDetail = order }
                            )
                        }

                        if filteredOrders.isEmpty && !ordersVM.isLoading {
                            EmptyOrdersView(filter: selectedFilter)
                        }
                    }
                    .padding()
                }
                .refreshable {
                    ordersVM.startListening()
                }
            }
            .background(RestaurantTheme.backgroundGrouped)
            .navigationTitle("Orders")
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(action: { ordersVM.toggleOnlineStatus() }) {
                        HStack(spacing: 4) {
                            Circle()
                                .fill(ordersVM.isOnline ? Color.green : Color.red)
                                .frame(width: 8, height: 8)
                            Text(ordersVM.isOnline ? "Online" : "Offline")
                                .font(.caption)
                                .fontWeight(.medium)
                        }
                        .padding(.horizontal, 10)
                        .padding(.vertical, 6)
                        .background(ordersVM.isOnline ? Color.green.opacity(0.1) : Color.red.opacity(0.1))
                        .cornerRadius(12)
                    }
                }
            }
            .sheet(item: $showOrderDetail) { order in
                OrderDetailSheet(order: order, ordersVM: ordersVM)
            }
        }
    }

    private var filteredOrders: [Order] {
        switch selectedFilter {
        case .all:
            return ordersVM.newOrders + ordersVM.preparingOrders + ordersVM.readyOrders
        case .new:
            return ordersVM.newOrders
        case .preparing:
            return ordersVM.preparingOrders
        case .ready:
            return ordersVM.readyOrders
        }
    }

    // MARK: - Status Bar
    private var statusBar: some View {
        HStack(spacing: 16) {
            // Busy Level Indicator
            HStack(spacing: 6) {
                Image(systemName: ordersVM.busyLevel.icon)
                    .foregroundColor(ordersVM.busyLevel.color)
                Text(ordersVM.busyLevel.rawValue)
                    .font(.subheadline)
                    .fontWeight(.medium)
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
            .background(ordersVM.busyLevel.color.opacity(0.1))
            .cornerRadius(20)

            Spacer()

            // Avg Prep Time
            HStack(spacing: 4) {
                Image(systemName: "clock.fill")
                    .font(.caption)
                Text("~\(ordersVM.averagePrepTime) min")
                    .font(.caption)
                    .fontWeight(.medium)
            }
            .foregroundColor(.secondary)
        }
        .padding()
        .background(RestaurantTheme.backgroundPrimary)
    }

    // MARK: - Quick Stats Bar
    private var quickStatsBar: some View {
        HStack(spacing: 12) {
            QuickStatCard(
                title: "New",
                value: "\(ordersVM.newOrders.count)",
                color: RestaurantTheme.statusNew,
                icon: "bell.badge.fill"
            )

            QuickStatCard(
                title: "Preparing",
                value: "\(ordersVM.preparingOrders.count)",
                color: RestaurantTheme.statusPreparing,
                icon: "flame.fill"
            )

            QuickStatCard(
                title: "Ready",
                value: "\(ordersVM.readyOrders.count)",
                color: RestaurantTheme.statusReady,
                icon: "bag.fill"
            )

            QuickStatCard(
                title: "Today",
                value: "$\(Int(ordersVM.todayRevenue))",
                color: RestaurantTheme.brandPurple,
                icon: "dollarsign.circle.fill"
            )
        }
        .padding(.horizontal)
        .padding(.vertical, 8)
        .background(RestaurantTheme.backgroundPrimary)
    }

    // MARK: - Filter Tabs
    private var filterTabs: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(OrderFilter.allCases, id: \.self) { filter in
                    FilterTab(
                        title: filter.rawValue,
                        count: countForFilter(filter),
                        isSelected: selectedFilter == filter
                    ) {
                        withAnimation(.spring(response: 0.3)) {
                            selectedFilter = filter
                        }
                    }
                }
            }
            .padding(.horizontal)
        }
        .padding(.vertical, 8)
        .background(RestaurantTheme.backgroundPrimary)
    }

    private func countForFilter(_ filter: OrderFilter) -> Int {
        switch filter {
        case .all: return ordersVM.newOrders.count + ordersVM.preparingOrders.count + ordersVM.readyOrders.count
        case .new: return ordersVM.newOrders.count
        case .preparing: return ordersVM.preparingOrders.count
        case .ready: return ordersVM.readyOrders.count
        }
    }
}

// MARK: - Quick Stat Card
struct QuickStatCard: View {
    let title: String
    let value: String
    let color: Color
    let icon: String

    var body: some View {
        VStack(spacing: 4) {
            HStack(spacing: 4) {
                Image(systemName: icon)
                    .font(.caption2)
                Text(value)
                    .font(.headline)
                    .fontWeight(.bold)
            }
            .foregroundColor(color)

            Text(title)
                .font(.caption2)
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 8)
        .background(color.opacity(0.1))
        .cornerRadius(10)
    }
}

// MARK: - Filter Tab
struct FilterTab: View {
    let title: String
    let count: Int
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 6) {
                Text(title)
                    .fontWeight(isSelected ? .semibold : .regular)

                if count != 0 {
                    Text("\(count)")
                        .font(.caption2)
                        .fontWeight(.bold)
                        .foregroundColor(.white)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(isSelected ? RestaurantTheme.brandOrange : Color.gray)
                        .clipShape(Capsule())
                }
            }
            .foregroundColor(isSelected ? RestaurantTheme.brandOrange : .secondary)
            .padding(.horizontal, 16)
            .padding(.vertical, 8)
            .background(isSelected ? RestaurantTheme.brandOrange.opacity(0.1) : Color.clear)
            .cornerRadius(20)
        }
    }
}

// MARK: - AI Suggestion Banner
struct AISuggestionBanner: View {
    let suggestion: String
    var onDismiss: (() -> Void)? = nil

    @State private var isVisible = true

    var body: some View {
        if isVisible {
            HStack(spacing: 12) {
                Image(systemName: "sparkles")
                    .font(.title3)
                    .foregroundColor(.purple)

                Text(suggestion)
                    .font(.subheadline)
                    .foregroundColor(.primary)

                Spacer()

                Button(action: {
                    withAnimation {
                        isVisible = false
                    }
                    onDismiss?()
                }) {
                    Image(systemName: "xmark")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
            .padding()
            .background(
                LinearGradient(
                    colors: [Color.purple.opacity(0.1), Color.blue.opacity(0.1)],
                    startPoint: .leading,
                    endPoint: .trailing
                )
            )
            .cornerRadius(12)
        }
    }
}

// MARK: - Enhanced Order Card
struct EnhancedOrderCard: View {
    let order: Order
    var onAccept: () -> Void
    var onReject: () -> Void
    var onMarkReady: () -> Void
    var onSelfDeliver: (() -> Void)? = nil
    var onSendToDriver: (() -> Void)? = nil
    var onTap: () -> Void

    @State private var isExpanded = false
    @State private var deliveryDecisionSeconds: Int = 180
    @State private var deliveryTimer: Timer? = nil

    private var orderStatus: OrderStatus {
        OrderStatus(rawValue: order.status) ?? .placed
    }

    private var timeElapsed: String {
        let orderDate = Date(timeIntervalSince1970: TimeInterval(order.placedAt) / 1000)
        return DateTimeFormatter.shared.orderedTime(from: orderDate)
    }

    // MARK: - Delivery Timer Functions

    private func formatTime(_ seconds: Int) -> String {
        let mins = seconds / 60
        let secs = seconds % 60
        return String(format: "%d:%02d", mins, secs)
    }

    private func startDeliveryTimer() {
        deliveryDecisionSeconds = 180
        deliveryTimer?.invalidate()
        deliveryTimer = Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { timer in
            if deliveryDecisionSeconds > 0 {
                deliveryDecisionSeconds -= 1
            } else {
                timer.invalidate()
                // Auto-send to driver when time runs out
                #if DEBUG
                print("⏰ Timer expired - auto-sending order \(order.orderId) to driver pool")
                #endif
                onSendToDriver?()
            }
        }
    }

    var body: some View {
        VStack(spacing: 0) {
            // Header
            HStack(spacing: 12) {
                // Status Badge
                ZStack {
                    Circle()
                        .fill(orderStatus.color.opacity(0.2))
                        .frame(width: 44, height: 44)

                    Image(systemName: orderStatus.icon)
                        .foregroundColor(orderStatus.color)
                        .font(.system(size: 18))
                }

                VStack(alignment: .leading, spacing: 2) {
                    HStack {
                        Text("#\(order.orderId.uppercased())")
                            .font(.headline)
                            .fontWeight(.bold)

                        if order.status == "Placed" {
                            Text("NEW")
                                .font(.caption2)
                                .fontWeight(.bold)
                                .foregroundColor(.white)
                                .padding(.horizontal, 6)
                                .padding(.vertical, 2)
                                .background(RestaurantTheme.brandOrange)
                                .clipShape(Capsule())
                        }
                    }

                    Text("\(order.itemsCount) items • \(timeElapsed)")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }

                Spacer()

                VStack(alignment: .trailing, spacing: 2) {
                    Text("$\(String(format: "%.2f", order.total))")
                        .font(.headline)
                        .fontWeight(.bold)
                        .foregroundColor(RestaurantTheme.brandGreen)

                    Text(orderStatus.displayName)
                        .font(.caption)
                        .foregroundColor(orderStatus.color)
                }
            }
            .padding()
            .contentShape(Rectangle())
            .onTapGesture { onTap() }

            // Expandable Items Preview
            if order.status == "Placed" || order.status == "Preparing" {
                Divider()
                    .padding(.horizontal)

                // Items Preview
                VStack(alignment: .leading, spacing: 6) {
                    ForEach(order.items.prefix(3), id: \.id) { item in
                        HStack {
                            Text("\(item.quantity)x")
                                .font(.caption)
                                .foregroundColor(.secondary)
                                .frame(width: 24, alignment: .leading)

                            Text(item.name)
                                .font(.subheadline)
                                .lineLimit(1)

                            Spacer()

                            Text("$\(String(format: "%.2f", item.price * Double(item.quantity)))")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                    }

                    if order.items.count > 3 {
                        Text("+ \(order.items.count - 3) more items")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
                .padding(.horizontal)
                .padding(.vertical, 8)
            }

            // Action Buttons
            if order.status == "Placed" {
                Divider()

                HStack(spacing: 12) {
                    Button {
                        #if DEBUG
                        print("🟡 Reject button tapped for order \(order.orderId)")
                        #endif
                        onReject()
                    } label: {
                        HStack {
                            Image(systemName: "xmark")
                            Text("Reject")
                        }
                        .font(.subheadline)
                        .fontWeight(.semibold)
                        .foregroundColor(RestaurantTheme.brandRed)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 12)
                        .background(RestaurantTheme.brandRed.opacity(0.1))
                        .cornerRadius(10)
                    }
                    .buttonStyle(.borderless)

                    Button {
                        #if DEBUG
                        print("🟡 Accept button tapped for order \(order.orderId)")
                        #endif
                        onAccept()
                    } label: {
                        HStack {
                            Image(systemName: "checkmark")
                            Text("Accept")
                        }
                        .font(.subheadline)
                        .fontWeight(.semibold)
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 12)
                        .background(RestaurantTheme.brandGreen)
                        .cornerRadius(10)
                    }
                    .buttonStyle(.borderless)
                }
                .padding()
            } else if order.status == "Preparing" {
                Divider()

                Button {
                    #if DEBUG
                    print("🟡 Mark Ready button tapped for order \(order.orderId)")
                    #endif
                    onMarkReady()
                } label: {
                    HStack {
                        Image(systemName: "checkmark.circle.fill")
                        Text("Mark Ready for Pickup")
                    }
                    .font(.subheadline)
                    .fontWeight(.semibold)
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
                    .background(RestaurantTheme.brandOrange)
                    .cornerRadius(10)
                }
                .buttonStyle(.borderless)
                .padding()
            } else if order.status.lowercased() == "ready" ||
                      order.status.lowercased() == "ready_for_pickup" ||
                      order.status.lowercased() == "pending_delivery_decision" {
                // Delivery Decision Flow - 3 minute window
                Divider()

                VStack(spacing: 8) {
                    // Timer countdown
                    HStack {
                        Image(systemName: "timer")
                            .foregroundColor(deliveryDecisionSeconds <= 30 ? .red : .orange)
                        Text("Decide in: \(formatTime(deliveryDecisionSeconds))")
                            .font(.subheadline)
                            .fontWeight(.bold)
                            .foregroundColor(deliveryDecisionSeconds <= 30 ? .red : .orange)
                        Spacer()
                        if deliveryDecisionSeconds <= 30 {
                            Text("Auto-sending to drivers...")
                                .font(.caption)
                                .foregroundColor(.red)
                        }
                    }
                    .padding(.horizontal)
                    .padding(.top, 8)

                    HStack(spacing: 12) {
                        // Send to Driver button
                        Button(action: {
                            #if DEBUG
                            print("🚗 Send to Driver tapped for order \(order.orderId)")
                            #endif
                            deliveryTimer?.invalidate()
                            onSendToDriver?()
                        }) {
                            HStack {
                                Image(systemName: "car.fill")
                                Text("Send to Driver")
                            }
                            .font(.subheadline)
                            .fontWeight(.semibold)
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 14)
                            .background(RestaurantTheme.brandBlue)
                            .cornerRadius(10)
                        }
                        .contentShape(Rectangle())

                        // I'll Deliver button
                        Button(action: {
                            #if DEBUG
                            print("🏃 I'll Deliver tapped for order \(order.orderId)")
                            #endif
                            deliveryTimer?.invalidate()
                            onSelfDeliver?()
                        }) {
                            HStack {
                                Image(systemName: "figure.walk")
                                Text("I'll Deliver")
                            }
                            .font(.subheadline)
                            .fontWeight(.semibold)
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 14)
                            .background(RestaurantTheme.brandGreen)
                            .cornerRadius(10)
                        }
                        .contentShape(Rectangle())
                    }
                    .padding(.horizontal)
                    .padding(.bottom)
                }
                .onAppear {
                    startDeliveryTimer()
                }
                .onDisappear {
                    deliveryTimer?.invalidate()
                }
            }
        }
        .background(RestaurantTheme.backgroundPrimary)
        .cornerRadius(16)
        .shadow(color: RestaurantTheme.cardShadow, radius: 8, x: 0, y: 4)
    }
}

// MARK: - Empty Orders View
struct EmptyOrdersView: View {
    let filter: OrdersDashboardView.OrderFilter

    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: "tray")
                .font(.system(size: 50))
                .foregroundColor(.gray.opacity(0.5))

            Text("No \(filter == .all ? "" : filter.rawValue.lowercased() + " ")orders")
                .font(.headline)
                .foregroundColor(.secondary)

            Text("New orders will appear here automatically")
                .font(.subheadline)
                .foregroundColor(.gray)
        }
        .padding(.vertical, 60)
    }
}

// MARK: - Order Detail Sheet
struct OrderDetailSheet: View {
    let order: Order
    @ObservedObject var ordersVM: OrdersViewModel
    @Environment(\.dismiss) var dismiss
    @State private var showInvoice = false

    private var orderStatus: OrderStatus {
        OrderStatus(rawValue: order.status) ?? .placed
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    // Status Header
                    VStack(spacing: 12) {
                        ZStack {
                            Circle()
                                .fill(orderStatus.color.opacity(0.2))
                                .frame(width: 80, height: 80)

                            Image(systemName: orderStatus.icon)
                                .font(.system(size: 32))
                                .foregroundColor(orderStatus.color)
                        }

                        Text(orderStatus.displayName)
                            .font(.title2)
                            .fontWeight(.bold)

                        Text("#\(order.orderId)")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    .padding(.top)

                    // Customer Info
                    VStack(alignment: .leading, spacing: 12) {
                        SectionHeader(title: "Customer", icon: "person.fill")

                        HStack {
                            VStack(alignment: .leading, spacing: 4) {
                                Text(order.customerName)
                                    .font(.headline)
                                if let phone = order.customerPhone {
                                    Text(phone)
                                        .font(.subheadline)
                                        .foregroundColor(.secondary)
                                }
                            }

                            Spacer()

                            Button(action: {
                                if let phone = order.customerPhone {
                                    let cleanPhone = phone.replacingOccurrences(of: "-", with: "")
                                        .replacingOccurrences(of: " ", with: "")
                                        .replacingOccurrences(of: "(", with: "")
                                        .replacingOccurrences(of: ")", with: "")
                                    if let url = URL(string: "tel:\(cleanPhone)") {
                                        UIApplication.shared.open(url)
                                    }
                                }
                            }) {
                                Image(systemName: "phone.fill")
                                    .foregroundColor(.white)
                                    .padding(10)
                                    .background(RestaurantTheme.brandGreen)
                                    .clipShape(Circle())
                            }
                        }
                    }
                    .padding()
                    .cardStyle()

                    // Delivery Address
                    VStack(alignment: .leading, spacing: 12) {
                        SectionHeader(title: "Delivery Address", icon: "location.fill")

                        Text(order.deliveryAddress.fullAddress)
                            .font(.subheadline)

                        if !order.deliveryInstructions.isEmpty {
                            HStack(spacing: 8) {
                                Image(systemName: "note.text")
                                    .foregroundColor(.orange)
                                Text(order.deliveryInstructions)
                                    .font(.caption)
                                    .foregroundColor(.orange)
                            }
                        }
                    }
                    .padding()
                    .cardStyle()

                    // Order Items
                    VStack(alignment: .leading, spacing: 12) {
                        SectionHeader(title: "Order Items", icon: "cart.fill")

                        ForEach(order.items, id: \.id) { item in
                            HStack {
                                Text("\(item.quantity)x")
                                    .font(.subheadline)
                                    .fontWeight(.medium)
                                    .foregroundColor(.secondary)
                                    .frame(width: 30, alignment: .leading)

                                Text(item.name)
                                    .font(.subheadline)

                                Spacer()

                                Text("$\(String(format: "%.2f", item.price * Double(item.quantity)))")
                                    .font(.subheadline)
                                    .foregroundColor(.secondary)
                            }
                            .padding(.vertical, 4)

                            if item.id != order.items.last?.id {
                                Divider()
                            }
                        }
                    }
                    .padding()
                    .cardStyle()

                    // Price Breakdown
                    VStack(alignment: .leading, spacing: 12) {
                        SectionHeader(title: "Payment Details", icon: "creditcard.fill")

                        PriceRow(label: "Subtotal", value: order.subtotal)
                        PriceRow(label: "Tax", value: order.tax)
                        PriceRow(label: "Delivery Fee", value: order.deliveryFee)
                        if order.tip > 0 {
                            PriceRow(label: "Tip", value: order.tip)
                        }

                        Divider()

                        HStack {
                            Text("Total")
                                .font(.headline)
                            Spacer()
                            Text("$\(String(format: "%.2f", order.total))")
                                .font(.headline)
                                .foregroundColor(RestaurantTheme.brandGreen)
                        }
                    }
                    .padding()
                    .cardStyle()

                    // Actions based on status
                    if order.status == "Placed" {
                        HStack(spacing: 12) {
                            Button(action: {
                                ordersVM.rejectOrder(order)
                                dismiss()
                            }) {
                                Text("Reject Order")
                            }
                            .buttonStyle(DangerButtonStyle())

                            Button(action: {
                                ordersVM.acceptOrder(order)
                                dismiss()
                            }) {
                                Text("Accept Order")
                            }
                            .buttonStyle(SuccessButtonStyle())
                        }
                        .padding()
                    } else if order.status == "Preparing" {
                        Button(action: {
                            ordersVM.markOrderReady(order)
                            dismiss()
                        }) {
                            Text("Mark Ready for Pickup")
                        }
                        .buttonStyle(PrimaryButtonStyle())
                        .padding()
                    }
                }
                .padding()
            }
            .background(RestaurantTheme.backgroundGrouped)
            .navigationTitle("Order Details")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    HStack(spacing: 16) {
                        Button(action: { showInvoice = true }) {
                            Label("Invoice", systemImage: "doc.text.fill")
                        }
                        // KOT Reprint Button (only show for preparing/ready orders)
                        if order.status == "Preparing" || order.status == "Ready" {
                            Button(action: { reprintKOT() }) {
                                Label("Print", systemImage: "printer.fill")
                            }
                        }
                    }
                }
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") { dismiss() }
                }
            }
            .sheet(isPresented: $showInvoice) {
                OrderInvoiceView(order: order)
            }
        }
    }

    private func reprintKOT() {
        // Get the order ID (it's stored as optional string in the Order model but is an Int in the API)
        guard let orderIdString = order.id, let orderId = Int(orderIdString) else {
            print("Invalid order ID for KOT reprint")
            return
        }

        P2PAPIService.shared.printKOT(orderId: orderId) { result in
            switch result {
            case .success(let response):
                if response.success {
                    print("KOT reprinted successfully for order \(order.orderId)")
                } else {
                    print("KOT reprint failed: \(response.error ?? "Unknown error")")
                }
            case .failure(let error):
                print("KOT reprint error: \(error.localizedDescription)")
            }
        }
    }
}

// MARK: - Order Invoice View
struct OrderInvoiceView: View {
    let order: Order
    @Environment(\.dismiss) var dismiss
    @State private var showShareSheet = false

    private let dateFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.dateStyle = .long
        formatter.timeStyle = .short
        return formatter
    }()

    private var orderDate: Date {
        Date(timeIntervalSince1970: TimeInterval(order.placedAt) / 1000)
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 24) {
                    // Invoice Header
                    VStack(spacing: 8) {
                        Image(systemName: "doc.text.fill")
                            .font(.system(size: 40))
                            .foregroundColor(RestaurantTheme.brandOrange)

                        Text("INVOICE")
                            .font(.title)
                            .fontWeight(.bold)

                        Text("#\(order.orderId)")
                            .font(.headline)
                            .foregroundColor(.secondary)
                    }
                    .padding(.top)

                    Divider()

                    // Invoice Details
                    HStack(alignment: .top) {
                        VStack(alignment: .leading, spacing: 6) {
                            Text("Date")
                                .font(.caption)
                                .foregroundColor(.secondary)
                            Text(dateFormatter.string(from: orderDate))
                                .font(.subheadline)
                        }

                        Spacer()

                        VStack(alignment: .trailing, spacing: 6) {
                            Text("Status")
                                .font(.caption)
                                .foregroundColor(.secondary)
                            Text(order.status)
                                .font(.subheadline)
                                .fontWeight(.medium)
                                .foregroundColor(RestaurantTheme.brandGreen)
                        }
                    }
                    .padding(.horizontal)

                    // Customer Info
                    VStack(alignment: .leading, spacing: 8) {
                        Text("BILL TO")
                            .font(.caption)
                            .fontWeight(.semibold)
                            .foregroundColor(.secondary)

                        Text(order.customerName)
                            .font(.headline)

                        if let phone = order.customerPhone {
                            Text(phone)
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                        }

                        Text(order.deliveryAddress.fullAddress)
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding()
                    .background(Color(.systemGray6))
                    .cornerRadius(12)
                    .padding(.horizontal)

                    // Line Items
                    VStack(alignment: .leading, spacing: 12) {
                        Text("ITEMS")
                            .font(.caption)
                            .fontWeight(.semibold)
                            .foregroundColor(.secondary)
                            .padding(.horizontal)

                        VStack(spacing: 0) {
                            // Header
                            HStack {
                                Text("Item")
                                    .font(.caption)
                                    .fontWeight(.semibold)
                                    .foregroundColor(.secondary)
                                Spacer()
                                Text("Qty")
                                    .font(.caption)
                                    .fontWeight(.semibold)
                                    .foregroundColor(.secondary)
                                    .frame(width: 40)
                                Text("Price")
                                    .font(.caption)
                                    .fontWeight(.semibold)
                                    .foregroundColor(.secondary)
                                    .frame(width: 70, alignment: .trailing)
                            }
                            .padding()
                            .background(Color(.systemGray5))

                            // Items
                            ForEach(order.items, id: \.id) { item in
                                HStack {
                                    Text(item.name)
                                        .font(.subheadline)
                                    Spacer()
                                    Text("\(item.quantity)")
                                        .font(.subheadline)
                                        .frame(width: 40)
                                    Text("$\(String(format: "%.2f", item.price * Double(item.quantity)))")
                                        .font(.subheadline)
                                        .frame(width: 70, alignment: .trailing)
                                }
                                .padding()

                                if item.id != order.items.last?.id {
                                    Divider()
                                        .padding(.leading)
                                }
                            }
                        }
                        .background(Color(.systemBackground))
                        .cornerRadius(12)
                        .overlay(
                            RoundedRectangle(cornerRadius: 12)
                                .stroke(Color(.systemGray4), lineWidth: 1)
                        )
                        .padding(.horizontal)
                    }

                    // Totals
                    VStack(spacing: 8) {
                        InvoiceTotalRow(label: "Subtotal", value: order.subtotal)
                        InvoiceTotalRow(label: "Tax", value: order.tax)
                        InvoiceTotalRow(label: "Delivery Fee", value: order.deliveryFee)
                        if order.tip > 0 {
                            InvoiceTotalRow(label: "Tip", value: order.tip)
                        }

                        Divider()
                            .padding(.vertical, 4)

                        HStack {
                            Text("TOTAL")
                                .font(.headline)
                                .fontWeight(.bold)
                            Spacer()
                            Text("$\(String(format: "%.2f", order.total))")
                                .font(.title2)
                                .fontWeight(.bold)
                                .foregroundColor(RestaurantTheme.brandGreen)
                        }
                    }
                    .padding()
                    .background(Color(.systemGray6))
                    .cornerRadius(12)
                    .padding(.horizontal)

                    // Footer
                    VStack(spacing: 8) {
                        Text("Thank you for your order!")
                            .font(.headline)

                        Text("Powered by Dollor.AI")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    .padding(.top)

                    Spacer(minLength: 20)
                }
            }
            .navigationTitle("Invoice")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Close") { dismiss() }
                }
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(action: { showShareSheet = true }) {
                        Label("Share", systemImage: "square.and.arrow.up")
                    }
                }
            }
            .sheet(isPresented: $showShareSheet) {
                InvoiceShareSheet(order: order)
            }
        }
    }
}

// MARK: - Invoice Total Row
struct InvoiceTotalRow: View {
    let label: String
    let value: Double

    var body: some View {
        HStack {
            Text(label)
                .font(.subheadline)
                .foregroundColor(.secondary)
            Spacer()
            Text("$\(String(format: "%.2f", value))")
                .font(.subheadline)
        }
    }
}

// MARK: - Invoice Share Sheet
struct InvoiceShareSheet: UIViewControllerRepresentable {
    let order: Order

    func makeUIViewController(context: Context) -> UIActivityViewController {
        let invoiceText = generateInvoiceText()
        let activityVC = UIActivityViewController(
            activityItems: [invoiceText],
            applicationActivities: nil
        )
        return activityVC
    }

    func updateUIViewController(_ uiViewController: UIActivityViewController, context: Context) {}

    private func generateInvoiceText() -> String {
        let dateFormatter = DateFormatter()
        dateFormatter.dateStyle = .long
        dateFormatter.timeStyle = .short
        let orderDate = Date(timeIntervalSince1970: TimeInterval(order.placedAt) / 1000)

        var text = """
        ================================
                    INVOICE
        ================================

        Order #\(order.orderId)
        Date: \(dateFormatter.string(from: orderDate))
        Status: \(order.status)

        --------------------------------
        BILL TO:
        \(order.customerName)
        \(order.deliveryAddress.fullAddress)
        --------------------------------

        ITEMS:

        """

        for item in order.items {
            let itemTotal = item.price * Double(item.quantity)
            text += "\(item.quantity)x \(item.name)\n"
            text += "   $\(String(format: "%.2f", itemTotal))\n"
        }

        text += """

        --------------------------------
        Subtotal:     $\(String(format: "%.2f", order.subtotal))
        Tax:          $\(String(format: "%.2f", order.tax))
        Delivery:     $\(String(format: "%.2f", order.deliveryFee))
        """

        if order.tip > 0 {
            text += "\nTip:          $\(String(format: "%.2f", order.tip))"
        }

        text += """

        --------------------------------
        TOTAL:        $\(String(format: "%.2f", order.total))
        ================================

        Thank you for your order!
        Powered by Dollor.AI
        """

        return text
    }
}

// MARK: - Helper Views
struct SectionHeader: View {
    let title: String
    let icon: String

    var body: some View {
        HStack(spacing: 8) {
            Image(systemName: icon)
                .foregroundColor(RestaurantTheme.brandOrange)
            Text(title)
                .font(.headline)
        }
    }
}

struct PriceRow: View {
    let label: String
    let value: Double

    var body: some View {
        HStack {
            Text(label)
                .font(.subheadline)
                .foregroundColor(.secondary)
            Spacer()
            Text("$\(String(format: "%.2f", value))")
                .font(.subheadline)
        }
    }
}

// MARK: - Preview
#Preview {
    EnhancedDashboardView()
}
