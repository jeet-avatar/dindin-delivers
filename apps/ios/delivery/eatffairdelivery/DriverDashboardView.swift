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
                AvailableOrdersView(viewModel: deliveryViewModel, selectedTab: $selectedTab)
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
        .alert("Error", isPresented: $deliveryViewModel.showError) {
            Button("OK", role: .cancel) { }
        } message: {
            Text(deliveryViewModel.errorMessage ?? "")
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
