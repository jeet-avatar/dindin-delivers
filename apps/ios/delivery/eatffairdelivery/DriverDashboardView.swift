import SwiftUI
import EatFairShared

struct DriverDashboardView: View {
    @EnvironmentObject var authManager: AuthManager
    @StateObject private var deliveryViewModel = DeliveryViewModel()
    @StateObject private var chatManager = ChatManager.shared
    @StateObject private var rideBiddingViewModel = RideBiddingViewModel()
    @State private var selectedTab = 0
    @State private var showTerms = false

    var body: some View {
        VStack(spacing: 0) {
            // Driver App - Food Delivery and Rideshare
            TabView(selection: $selectedTab) {
                // Available Orders Tab (Food Delivery)
                AvailableOrdersView(viewModel: deliveryViewModel)
                    .tabItem {
                        Label("Delivery", systemImage: "bag.fill")
                    }
                    .tag(0)

                // Rideshare Tab - P2P Ride Bidding
                RideshareDashboardView()
                    .tabItem {
                        Label("Rideshare", systemImage: "car.fill")
                    }
                    .tag(1)
                    .badge(rideBiddingViewModel.counteredBids.isEmpty ? 0 : rideBiddingViewModel.counteredBids.count)

                // Active Delivery Tab
                NavigationView {
                    PickupDropoffView(viewModel: deliveryViewModel)
                }
                .tabItem {
                    Label("Active", systemImage: "location.fill")
                }
                .tag(2)

                // Messages Tab
                ConversationsListView()
                    .tabItem {
                        Label("Messages", systemImage: "message.fill")
                    }
                    .tag(3)
                    .badge(chatManager.unreadCount)

                // Profile Tab
                DriverProfileView()
                    .environmentObject(authManager)
                    .tabItem {
                        Label("Profile", systemImage: "person.crop.circle.fill")
                    }
                    .tag(4)
            }
            .accentColor(Theme.brandGreen)
        }
        .onAppear {
            deliveryViewModel.fetchAvailableOrders()
            deliveryViewModel.fetchMyDeliveries()
            checkTermsAcceptance()
        }
        .sheet(isPresented: $showTerms) {
            TermsAndConditionsView {
                showTerms = false
            }
        }
    }

    private func checkTermsAcceptance() {
        let termsAccepted = UserDefaults.standard.bool(forKey: UserDefaultsKeys.driverTermsAccepted)
        if !termsAccepted {
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
                showTerms = true
            }
        }
    }
}

// MARK: - Dashboard Components
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
                    // Pending Approval Banner
                    if !earningsVM.isApproved {
                        PendingApprovalBanner(
                            status: earningsVM.driverStatus,
                            requiresDocuments: earningsVM.requiresDocuments
                        )
                        .padding(.horizontal)
                    }

                    // Error Message (if any)
                    if let errorMessage = earningsVM.errorMessage {
                        HStack {
                            Image(systemName: "exclamationmark.triangle.fill")
                                .foregroundColor(.orange)
                            Text(errorMessage)
                                .font(.subheadline)
                                .foregroundColor(.orange)
                        }
                        .padding()
                        .frame(maxWidth: .infinity)
                        .background(Color.orange.opacity(0.1))
                        .cornerRadius(8)
                        .padding(.horizontal)
                    }

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
                        .background(earningsVM.isApproved ? (earningsVM.isOnline ? Color.red : Color.green) : Color.gray)
                        .cornerRadius(12)
                    }
                    .disabled(!earningsVM.isApproved && !earningsVM.isOnline)
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
                earningsVM.refreshDriverStatus()
                earningsVM.fetchEarnings()
                earningsVM.fetchOnlineStatus()
            }
        }
    }
}

// MARK: - Pending Approval Banner
struct PendingApprovalBanner: View {
    let status: String
    let requiresDocuments: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: requiresDocuments ? "doc.badge.plus" : "clock.badge.checkmark")
                    .font(.title2)
                    .foregroundColor(requiresDocuments ? .orange : .blue)

                VStack(alignment: .leading, spacing: 4) {
                    Text(requiresDocuments ? "Documents Required" : "Verification Pending")
                        .font(.headline)
                        .foregroundColor(.primary)

                    Text(requiresDocuments
                         ? "Upload your driver's license and insurance to get approved"
                         : "Your documents are being reviewed. You'll be notified when approved.")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }

                Spacer()
            }

            if requiresDocuments {
                NavigationLink(destination: DriverProfileView()) {
                    HStack {
                        Image(systemName: "arrow.right.circle.fill")
                        Text("Upload Documents")
                    }
                    .font(.subheadline.weight(.semibold))
                    .foregroundColor(.white)
                    .padding(.horizontal, 16)
                    .padding(.vertical, 10)
                    .background(Theme.brandGreen)
                    .cornerRadius(8)
                }
            } else {
                HStack {
                    ProgressView()
                        .scaleEffect(0.8)
                    Text("Reviewing your documents...")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
        }
        .padding()
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(requiresDocuments ? Color.orange.opacity(0.1) : Color.blue.opacity(0.1))
        )
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(requiresDocuments ? Color.orange.opacity(0.3) : Color.blue.opacity(0.3), lineWidth: 1)
        )
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
