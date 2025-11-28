import SwiftUI
import FirebaseAuth
import FirebaseFirestore
import EatFairShared

struct DriverDashboardView: View {
    @StateObject private var viewModel = DeliveryViewModel()
    @State private var selectedTab = 0
    
    var body: some View {
        TabView(selection: $selectedTab) {
            // Available Orders (Redesigned)
            AvailableOrdersView(viewModel: viewModel)
                .tabItem {
                    Label("Orders", systemImage: "tray.fill")
                }
                .tag(0)
            
            // My Active Deliveries
            MyDeliveriesView(viewModel: viewModel)
                .tabItem {
                    Label("My Deliveries", systemImage: "shippingbox.fill")
                }
                .tag(1)
            
            // Profile
            DriverProfileView()
                .tabItem {
                    Label("Profile", systemImage: "person.crop.circle.fill")
                }
                .tag(2)
        }
        .accentColor(Color(red: 0.91, green: 0.30, blue: 0.24))
        .onAppear {
            viewModel.fetchAvailableOrders()
            viewModel.fetchMyDeliveries()
        }
    }
}

// MARK: - Missing Import
// Note: Make sure EarningsViewModel has listenForTips() called in fetchEarnings() or onAppear

// MARK: - Home Tab (Dashboard Overview)
struct HomeTabView: View {
    @ObservedObject var viewModel: DeliveryViewModel
    @StateObject private var earningsVM = EarningsViewModel()
    @State private var showingSettings = false
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 20) {
                    // Go Online/Offline Button
                    Button {
                        if earningsVM.isOnline {
                            earningsVM.endSession()
                        } else {
                            earningsVM.startSession()
                        }
                    } label: {
                        HStack {
                            Image(systemName: earningsVM.isOnline ? "pause.circle.fill" : "play.circle.fill")
                            Text(earningsVM.isOnline ? "Go Offline" : "Go Online")
                        }
                        .font(.headline)
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(earningsVM.isOnline ? Color.red : Color.green)
                        .cornerRadius(12)
                    }
                    .padding(.horizontal)
                    
                    // Driver Stats Card
                    DriverStatsCard()
                        .padding(.horizontal)
                    
                    // Tip Notifications
                    ForEach(earningsVM.recentTips.prefix(3)) { tip in
                        TipNotificationView(tip: tip)
                            .padding(.horizontal)
                    }
                    
                    // Online/Offline Toggle
                    OnlineStatusCard(earningsVM: earningsVM)
                    
                    // Today's Earnings Summary
                    TodaysEarningsCard(earningsVM: earningsVM)
                    
                    // Active Delivery (if any)
                    if let activeDelivery = viewModel.myDeliveries.first {
                        ActiveDeliveryCard(order: activeDelivery, viewModel: viewModel)
                    }
                    
                    // Available Orders Preview
                    if !viewModel.availableOrders.isEmpty {
                        VStack(alignment: .leading, spacing: 12) {
                            HStack {
                                Text("Available Orders")
                                    .font(.title3)
                                    .fontWeight(.bold)
                                Spacer()
                                Text("\(viewModel.availableOrders.count)")
                                    .font(.title3)
                                    .fontWeight(.bold)
                                    .foregroundColor(Theme.brandRed)
                            }
                            
                            ForEach(viewModel.availableOrders.prefix(3)) { order in
                                NavigationLink(destination: ActiveDeliveryDetailView(order: order, viewModel: viewModel)) {
                                    CompactOrderCard(order: order)
                                }
                            }
                        }
                        .padding()
                        .background(Theme.cardBackground)
                        .cornerRadius(16)
                        .shadow(color: .black.opacity(0.05), radius: 8, x: 0, y: 2)
                        .padding(.horizontal)
                    } else {
                        EmptyStateView()
                    }
                }
                .padding(.vertical)
            }
            .background(Theme.backgroundGrey.ignoresSafeArea())
            .navigationTitle("Dashboard")
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(action: { showingSettings = true }) {
                        Image(systemName: "gearshape.fill")
                            .foregroundColor(Theme.textSecondary)
                    }
                }
            }
            .onAppear {
                earningsVM.fetchEarnings()
                earningsVM.fetchOnlineStatus()
            }
        }
    }
}

// MARK: - Online Status Card
struct OnlineStatusCard: View {
    @ObservedObject var earningsVM: EarningsViewModel
    
    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text(earningsVM.isOnline ? "You're Online" : "You're Offline")
                    .font(.headline)
                    .foregroundColor(Theme.textPrimary)
                Text(earningsVM.isOnline ? "Ready to accept orders" : "Go online to start earning")
                    .font(.subheadline)
                    .foregroundColor(Theme.textSecondary)
            }
            
            Spacer()
            
            Toggle("", isOn: Binding(
                get: { earningsVM.isOnline },
                set: { earningsVM.updateOnlineStatus($0) }
            ))
                .labelsHidden()
                .toggleStyle(SwitchToggleStyle(tint: Theme.statusActive))
        }
        .padding()
        .background(
            LinearGradient(
                colors: earningsVM.isOnline ? [Theme.statusActive.opacity(0.1), Theme.statusActive.opacity(0.05)] : [Theme.lightGrey, Theme.lightGrey],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        )
        .cornerRadius(16)
        .padding(.horizontal)
    }
}

// MARK: - Today's Earnings Card
struct TodaysEarningsCard: View {
    @ObservedObject var earningsVM: EarningsViewModel
    
    var body: some View {
        HStack(spacing: 20) {
            VStack(alignment: .leading, spacing: 8) {
                Text("Today's Earnings")
                    .font(.subheadline)
                    .foregroundColor(.white.opacity(0.9))
                Text("$\(String(format: "%.2f", earningsVM.todayEarnings))")
                    .font(.system(size: 36, weight: .bold))
                    .foregroundColor(.white)
                if earningsVM.todayDeliveries > 0 {
                    HStack(spacing: 4) {
                        Image(systemName: "checkmark.circle")
                            .font(.caption)
                        Text("\(earningsVM.todayDeliveries) deliveries completed")
                            .font(.caption)
                    }
                    .foregroundColor(.white.opacity(0.9))
                } else {
                    Text("No deliveries yet")
                        .font(.caption)
                        .foregroundColor(.white.opacity(0.7))
                }
            }
            
            Spacer()
            
            VStack(spacing: 12) {
                StatBubble(value: "\(earningsVM.todayDeliveries)", label: "Deliveries", color: .white)
            }
        }
        .padding()
        .background(Theme.earningsGradient)
        .cornerRadius(20)
        .shadow(color: Theme.statusActive.opacity(0.3), radius: 12, x: 0, y: 6)
        .padding(.horizontal)
    }
}

struct StatBubble: View {
    let value: String
    let label: String
    let color: Color
    
    var body: some View {
        VStack(spacing: 2) {
            Text(value)
                .font(.headline)
                .fontWeight(.bold)
            Text(label)
                .font(.caption2)
        }
        .foregroundColor(color)
        .frame(width: 70)
        .padding(.vertical, 8)
        .background(Color.white.opacity(0.2))
        .cornerRadius(12)
    }
}

// MARK: - Active Delivery Card
struct ActiveDeliveryCard: View {
    let order: Order
    @ObservedObject var viewModel: DeliveryViewModel
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("Active Delivery")
                    .font(.headline)
                    .foregroundColor(Theme.textPrimary)
                Spacer()
                Text(order.status)
                    .font(.caption)
                    .fontWeight(.semibold)
                    .foregroundColor(.white)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 6)
                    .background(Theme.statusActive)
                    .cornerRadius(12)
            }
            
            Divider()
            
            HStack(spacing: 12) {
                Image(systemName: "bag.fill")
                    .font(.title2)
                    .foregroundColor(Theme.brandRed)
                    .frame(width: 50, height: 50)
                    .background(Theme.brandRed.opacity(0.1))
                    .cornerRadius(12)
                
                VStack(alignment: .leading, spacing: 4) {
                    Text(order.restaurant.name)
                        .font(.headline)
                        .foregroundColor(Theme.textPrimary)
                    Text("Deliver to \(order.customerName)")
                        .font(.subheadline)
                        .foregroundColor(Theme.textSecondary)
                    Text("$\(String(format: "%.2f", order.deliveryFee)) earnings")
                        .font(.caption)
                        .fontWeight(.semibold)
                        .foregroundColor(Theme.statusActive)
                }
                
                Spacer()
                
                NavigationLink(destination: ActiveDeliveryDetailView(order: order, viewModel: viewModel)) {
                    Image(systemName: "chevron.right")
                        .foregroundColor(Theme.textSecondary)
                }
            }
        }
        .padding()
        .background(Theme.cardBackground)
        .cornerRadius(16)
        .shadow(color: .black.opacity(0.08), radius: 8, x: 0, y: 4)
        .padding(.horizontal)
    }
}

// MARK: - Compact Order Card
struct CompactOrderCard: View {
    let order: Order
    
    var body: some View {
        HStack(spacing: 12) {
            VStack(alignment: .leading, spacing: 4) {
                Text(order.restaurant.name)
                    .font(.subheadline)
                    .fontWeight(.semibold)
                    .foregroundColor(Theme.textPrimary)
                Text("\(order.itemsCount) items")
                    .font(.caption)
                    .foregroundColor(Theme.textSecondary)
            }
            
            Spacer()
            
            VStack(alignment: .trailing, spacing: 4) {
                Text("$\(String(format: "%.2f", order.deliveryFee))")
                    .font(.headline)
                    .fontWeight(.bold)
                    .foregroundColor(Theme.statusActive)
            }
        }
        .padding()
        .background(Theme.backgroundGrey)
        .cornerRadius(12)
    }
}

// MARK: - Empty State
struct EmptyStateView: View {
    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: "tray")
                .font(.system(size: 60))
                .foregroundColor(Theme.textGrey)
            
            Text("No orders available")
                .font(.headline)
                .foregroundColor(Theme.textPrimary)
            
            Text("New delivery requests will appear here")
                .font(.subheadline)
                .foregroundColor(Theme.textSecondary)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
        .padding(40)
        .background(Theme.cardBackground)
        .cornerRadius(16)
        .padding(.horizontal)
    }
}

// Available Orders View is now in AvailableOrdersViewRedesigned.swift
// Using the redesigned version with premium cards and filters

// My Deliveries View is now in MyDeliveriesAndEarnings.swift
// Using the redesigned version with active delivery cards and progress tracking

// DriverProfileView is now in Views/DriverProfileView.swift
// with comprehensive professional features including:
// - Profile photo upload
// - Driver's license upload (front/back)
// - Vehicle information with photos
// - Insurance details
// - Bank account for payouts
// - Current location map
// - Stats overview (rating, deliveries, acceptance rate)
// - Preferences and settings
