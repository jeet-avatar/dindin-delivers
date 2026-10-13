import SwiftUI
import EatFairShared

struct DriverDashboardView: View {
    @EnvironmentObject var authManager: AuthManager
    @StateObject private var chatManager = ChatManager.shared
    @StateObject private var rideBiddingViewModel = RideBiddingViewModel()
    // Rideshare-only build lands on the Rideshare tab.
    @State private var selectedTab = 1
    @State private var showTerms = false

    var body: some View {
        VStack(spacing: 0) {
            // Driver App - Rideshare
            TabView(selection: $selectedTab) {
                // Rideshare Tab - P2P Ride Bidding
                RideshareDashboardView()
                    .tabItem {
                        Label("Rideshare", systemImage: "car.fill")
                    }
                    .tag(1)
                    .badge(rideBiddingViewModel.counteredBids.isEmpty ? 0 : rideBiddingViewModel.counteredBids.count)

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
            .accentColor(Theme.lxOrange)
            .preferredColorScheme(.dark)
        }
        .background(Theme.lxBg.ignoresSafeArea())
        .preferredColorScheme(.dark)
        .onAppear {
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
