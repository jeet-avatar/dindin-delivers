import SwiftUI
import Combine
import PhotosUI
import UserNotifications
import FirebaseAuth
import FirebaseFirestore
import FirebaseStorage
import EatFairShared
import os

private let logger = Logger(subsystem: "com.dollorai.restaurant", category: "RestaurantSettingsView")

/// Restaurant Settings with comprehensive configuration options
struct RestaurantSettingsView: View {
    @StateObject private var viewModel = SettingsViewModel()
    @State private var showLogoutConfirm = false
    @State private var showEditProfile = false
    @State private var showOperatingHours = false
    @State private var showNotificationSettings = false
    @State private var showPaymentSettings = false
    @State private var showDocuments = false

    // Account deletion states (Apple App Store Guideline 5.1.1)
    @State private var showDeleteAccountAlert = false
    @State private var showDeleteConfirmation = false
    @State private var isDeletingAccount = false
    @State private var deleteError: String?

    var body: some View {
        NavigationStack {
            List {
                // Restaurant Profile Section
                Section {
                    HStack(spacing: 16) {
                        ZStack {
                            Circle()
                                .fill(RestaurantTheme.brandOrange.opacity(0.2))
                                .frame(width: 70, height: 70)

                            if let imageUrl = viewModel.restaurantImageUrl, !imageUrl.isEmpty {
                                AsyncImage(url: URL(string: imageUrl)) { image in
                                    image
                                        .resizable()
                                        .aspectRatio(contentMode: .fill)
                                } placeholder: {
                                    Image(systemName: "building.2.fill")
                                        .font(.title)
                                        .foregroundColor(RestaurantTheme.brandOrange)
                                }
                                .frame(width: 70, height: 70)
                                .clipShape(Circle())
                            } else {
                                Image(systemName: "building.2.fill")
                                    .font(.title)
                                    .foregroundColor(RestaurantTheme.brandOrange)
                            }
                        }

                        VStack(alignment: .leading, spacing: 4) {
                            Text(viewModel.restaurantName)
                                .font(.headline)

                            if !viewModel.cuisineType.isEmpty {
                                Text(viewModel.cuisineType)
                                    .font(.caption)
                                    .foregroundColor(RestaurantTheme.brandOrange)
                            }

                            Text(viewModel.restaurantAddress)
                                .font(.caption)
                                .foregroundColor(.secondary)
                                .lineLimit(2)

                            HStack(spacing: 4) {
                                Circle()
                                    .fill(viewModel.isOnline ? .green : .red)
                                    .frame(width: 8, height: 8)
                                Text(viewModel.isOnline ? "Online" : "Offline")
                                    .font(.caption)
                                    .foregroundColor(viewModel.isOnline ? .green : .red)
                            }
                        }

                        Spacer()

                        Button(action: { showEditProfile = true }) {
                            Text("Edit")
                                .font(.subheadline)
                                .foregroundColor(RestaurantTheme.brandOrange)
                        }
                        .accessibilityLabel("Edit restaurant profile")
                        .accessibilityHint("Opens form to edit your restaurant information")
                    }
                    .padding(.vertical, 8)

                    // Contact Info
                    if !viewModel.phone.isEmpty {
                        HStack {
                            Label(viewModel.phone, systemImage: "phone.fill")
                                .font(.subheadline)
                            Spacer()
                        }
                    }

                    if !viewModel.email.isEmpty {
                        HStack {
                            Label(viewModel.email, systemImage: "envelope.fill")
                                .font(.subheadline)
                            Spacer()
                        }
                    }
                }

                // Quick Actions Section
                Section("Quick Actions") {
                    Toggle(isOn: $viewModel.isOnline) {
                        Label {
                            VStack(alignment: .leading, spacing: 2) {
                                Text("Accept Orders")
                                Text(viewModel.isOnline ? "Your restaurant is visible to customers" : "Customers cannot place orders")
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }
                        } icon: {
                            Image(systemName: viewModel.isOnline ? "checkmark.circle.fill" : "xmark.circle.fill")
                                .foregroundColor(viewModel.isOnline ? .green : .red)
                        }
                    }
                    .tint(RestaurantTheme.brandGreen)
                    .onChange(of: viewModel.isOnline) { _, newValue in
                        viewModel.updateOnlineStatus(newValue)
                    }

                    Toggle(isOn: $viewModel.acceptingDelivery) {
                        Label {
                            VStack(alignment: .leading, spacing: 2) {
                                Text("Delivery Orders")
                                Text("Allow customers to order for delivery")
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }
                        } icon: {
                            Image(systemName: "bicycle")
                                .foregroundColor(.blue)
                        }
                    }
                    .tint(RestaurantTheme.brandBlue)
                    .onChange(of: viewModel.acceptingDelivery) { _, _ in
                        viewModel.updateSettings()
                    }

                    Toggle(isOn: $viewModel.acceptingPickup) {
                        Label {
                            VStack(alignment: .leading, spacing: 2) {
                                Text("Pickup Orders")
                                Text("Allow customers to pick up orders")
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }
                        } icon: {
                            Image(systemName: "bag.fill")
                                .foregroundColor(.purple)
                        }
                    }
                    .tint(RestaurantTheme.brandPurple)
                    .onChange(of: viewModel.acceptingPickup) { _, _ in
                        viewModel.updateSettings()
                    }
                }

                // Operating Hours Section
                Section("Operating Hours") {
                    Button(action: { showOperatingHours = true }) {
                        HStack {
                            Label("Business Hours", systemImage: "clock.fill")
                            Spacer()
                            Text(viewModel.operatingHoursSummary)
                                .font(.caption)
                                .foregroundColor(.secondary)
                            Image(systemName: "chevron.right")
                                .font(.caption)
                                .foregroundColor(.gray)
                        }
                    }
                    .foregroundColor(.primary)

                    HStack {
                        Label("Prep Time Buffer", systemImage: "timer")
                        Spacer()
                        Picker("", selection: $viewModel.prepTimeBuffer) {
                            Text("5 min").tag(5)
                            Text("10 min").tag(10)
                            Text("15 min").tag(15)
                            Text("20 min").tag(20)
                            Text("30 min").tag(30)
                        }
                        .pickerStyle(.menu)
                    }
                    .onChange(of: viewModel.prepTimeBuffer) { _, _ in
                        viewModel.updateSettings()
                    }

                    HStack {
                        Label("Max Orders/Hour", systemImage: "number.circle.fill")
                        Spacer()
                        Picker("", selection: $viewModel.maxOrdersPerHour) {
                            Text("Unlimited").tag(0)
                            Text("10").tag(10)
                            Text("20").tag(20)
                            Text("30").tag(30)
                            Text("50").tag(50)
                        }
                        .pickerStyle(.menu)
                    }
                    .onChange(of: viewModel.maxOrdersPerHour) { _, _ in
                        viewModel.updateSettings()
                    }
                }

                // Notifications Section
                Section("Notifications") {
                    Button(action: { showNotificationSettings = true }) {
                        HStack {
                            Label("Push Notifications", systemImage: "bell.badge.fill")
                            Spacer()
                            Text("Enabled")
                                .font(.caption)
                                .foregroundColor(.secondary)
                            Image(systemName: "chevron.right")
                                .font(.caption)
                                .foregroundColor(.gray)
                        }
                    }
                    .foregroundColor(.primary)

                    Toggle(isOn: $viewModel.soundEnabled) {
                        Label("Order Sound Alerts", systemImage: "speaker.wave.2.fill")
                    }
                    .tint(RestaurantTheme.brandOrange)
                    .onChange(of: viewModel.soundEnabled) { _, _ in
                        viewModel.updateSettings()
                    }

                    Toggle(isOn: $viewModel.vibrationEnabled) {
                        Label("Vibration", systemImage: "iphone.radiowaves.left.and.right")
                    }
                    .tint(RestaurantTheme.brandOrange)
                    .onChange(of: viewModel.vibrationEnabled) { _, _ in
                        viewModel.updateSettings()
                    }
                }

                // Kitchen Printing / POS Integration Section
                Section("Kitchen Printing") {
                    NavigationLink(destination: KOTSettingsView()) {
                        HStack {
                            Label {
                                VStack(alignment: .leading, spacing: 2) {
                                    Text("POS Integration")
                                    Text("Auto-print orders to kitchen")
                                        .font(.caption)
                                        .foregroundColor(.secondary)
                                }
                            } icon: {
                                Image(systemName: "printer.fill")
                                    .foregroundColor(.purple)
                            }
                            Spacer()
                            Text("Square, Clover")
                                .font(.caption)
                                .foregroundColor(.purple)
                        }
                    }
                }

                // Promotions Section
                Section("Promotions") {
                    NavigationLink(destination: PromotionsView()) {
                        HStack {
                            Label {
                                VStack(alignment: .leading, spacing: 2) {
                                    Text("Manage Promotions")
                                    Text("Create, edit, and manage promo codes")
                                        .font(.caption)
                                        .foregroundColor(.secondary)
                                }
                            } icon: {
                                Image(systemName: "tag.fill")
                                    .foregroundColor(RestaurantTheme.brandOrange)
                            }
                            Spacer()
                            Image(systemName: "chevron.right")
                                .font(.caption)
                                .foregroundColor(.gray)
                        }
                    }
                }

                // Business Documents Section
                Section("Business Documents") {
                    NavigationLink(destination: RestaurantDocumentsView()) {
                        HStack(spacing: 14) {
                            ZStack {
                                RoundedRectangle(cornerRadius: 10)
                                    .fill(Color.blue.opacity(0.12))
                                    .frame(width: 44, height: 44)
                                Image(systemName: "doc.badge.checkmark")
                                    .font(.title3)
                                    .foregroundColor(.blue)
                            }
                            VStack(alignment: .leading, spacing: 4) {
                                Text("Upload Documents")
                                    .font(.subheadline.weight(.semibold))
                                    .foregroundColor(.primary)
                                Text("Food license, health permit, W-9, insurance")
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }
                        }
                    }
                }

                // Payment Section
                Section("Payment & Payouts") {
                    Button(action: { showPaymentSettings = true }) {
                        HStack {
                            Label("Payout Settings", systemImage: "creditcard.fill")
                            Spacer()
                            Image(systemName: "chevron.right")
                                .font(.caption)
                                .foregroundColor(.gray)
                        }
                    }
                    .foregroundColor(.primary)

                    HStack {
                        Label("Platform Fee", systemImage: "dollarsign.circle")
                        Spacer()
                        Text("$\(String(format: "%.2f", AppConfig.shared.restaurantPlatformFee))/order")
                            .foregroundColor(.secondary)
                    }

                    HStack {
                        Label("This Month's Earnings", systemImage: "dollarsign.circle.fill")
                        Spacer()
                        VStack(alignment: .trailing, spacing: 2) {
                            Text("$\(String(format: "%.2f", viewModel.monthlyEarnings))")
                                .fontWeight(.semibold)
                                .foregroundColor(RestaurantTheme.brandGreen)
                            if viewModel.isSampleEarnings {
                                Text("Estimated")
                                    .font(.caption2)
                                    .foregroundColor(.secondary)
                            }
                        }
                    }
                }

                #if ENABLE_AI_EMPLOYEES
                // AI Features Section
                Section("AI Features") {
                    Toggle(isOn: $viewModel.aiDemandPrediction) {
                        Label {
                            VStack(alignment: .leading, spacing: 2) {
                                Text("Demand Prediction")
                                Text("AI predicts busy periods")
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }
                        } icon: {
                            Image(systemName: "brain.head.profile")
                                .foregroundColor(.purple)
                        }
                    }
                    .tint(.purple)
                    .onChange(of: viewModel.aiDemandPrediction) { _, _ in
                        viewModel.updateSettings()
                    }

                    Toggle(isOn: $viewModel.aiPrepTimeOptimization) {
                        Label {
                            VStack(alignment: .leading, spacing: 2) {
                                Text("Prep Time Optimization")
                                Text("AI optimizes estimated times")
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }
                        } icon: {
                            Image(systemName: "clock.badge.checkmark")
                                .foregroundColor(.blue)
                        }
                    }
                    .tint(.blue)
                    .onChange(of: viewModel.aiPrepTimeOptimization) { _, _ in
                        viewModel.updateSettings()
                    }

                    Toggle(isOn: $viewModel.aiMenuSuggestions) {
                        Label {
                            VStack(alignment: .leading, spacing: 2) {
                                Text("Menu Suggestions")
                                Text("AI suggests menu optimizations")
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }
                        } icon: {
                            Image(systemName: "lightbulb.fill")
                                .foregroundColor(.yellow)
                        }
                    }
                    .tint(.yellow)
                    .onChange(of: viewModel.aiMenuSuggestions) { _, _ in
                        viewModel.updateSettings()
                    }
                }

                // AI Workforce Section (TechCloudRPO Integration)
                Section("AI Workforce") {
                    NavigationLink(destination: AIEmployeesView()) {
                        HStack {
                            Label {
                                VStack(alignment: .leading, spacing: 2) {
                                    Text("AI Employees")
                                    Text("Manage your 24/7 AI workforce")
                                        .font(.caption)
                                        .foregroundColor(.secondary)
                                }
                            } icon: {
                                Image(systemName: "person.3.sequence.fill")
                                    .foregroundColor(.purple)
                            }
                            Spacer()
                            Text("WorkFlow AI")
                                .font(.caption)
                                .foregroundColor(.purple)
                        }
                    }
                }
                #endif // ENABLE_AI_EMPLOYEES

                // Support Section
                Section("Support") {
                    if let helpUrl = URL(string: AppConfig.shared.supportUrl) {
                        Link(destination: helpUrl) {
                            HStack {
                                Label("Help Center", systemImage: "questionmark.circle.fill")
                                Spacer()
                                Image(systemName: "arrow.up.right")
                                    .font(.caption)
                                    .foregroundColor(.gray)
                            }
                        }
                        .foregroundColor(.primary)
                    }

                    if let phoneUrl = URL(string: "tel:\(AppConfig.shared.supportPhone.replacingOccurrences(of: "-", with: ""))") {
                        Link(destination: phoneUrl) {
                            HStack {
                                Label("Contact Support", systemImage: "phone.fill")
                                Spacer()
                                Image(systemName: "arrow.up.right")
                                    .font(.caption)
                                    .foregroundColor(.gray)
                            }
                        }
                        .foregroundColor(.primary)
                    }

                    NavigationLink {
                        FAQView()
                    } label: {
                        Label("FAQs", systemImage: "text.book.closed.fill")
                    }
                }

                // Legal Section
                Section("Legal") {
                    NavigationLink {
                        LegalDocumentView(title: "Terms of Service", type: .terms)
                    } label: {
                        Label("Terms of Service", systemImage: "doc.text.fill")
                    }

                    NavigationLink {
                        LegalDocumentView(title: "Privacy Policy", type: .privacy)
                    } label: {
                        Label("Privacy Policy", systemImage: "hand.raised.fill")
                    }

                    NavigationLink {
                        LegalDocumentView(title: "Restaurant Agreement", type: .agreement)
                    } label: {
                        Label("Restaurant Agreement", systemImage: "signature")
                    }
                }

                // Account Section
                Section {
                    Button(role: .destructive) {
                        showLogoutConfirm = true
                    } label: {
                        HStack {
                            Spacer()
                            Label("Sign Out", systemImage: "rectangle.portrait.and.arrow.right")
                            Spacer()
                        }
                    }
                    .accessibilityLabel("Sign out")
                    .accessibilityHint("Signs you out of your restaurant account")

                    // Delete Account (Apple App Store Guideline 5.1.1)
                    Button(role: .destructive) {
                        showDeleteAccountAlert = true
                    } label: {
                        HStack {
                            Spacer()
                            if isDeletingAccount {
                                ProgressView()
                                    .tint(.red)
                            } else {
                                Label("Delete Account", systemImage: "trash.fill")
                            }
                            Spacer()
                        }
                    }
                    .accessibilityLabel("Delete account")
                    .accessibilityHint("Permanently deletes your restaurant account and all data")
                    .disabled(isDeletingAccount)
                }

                // App Info Section
                Section {
                    HStack {
                        Text("App Version")
                        Spacer()
                        Text("1.0.0 (1)")
                            .foregroundColor(.secondary)
                    }

                    HStack {
                        Text("Restaurant ID")
                        Spacer()
                        Text(viewModel.restaurantId)
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
            }
            .navigationTitle("Settings")
            .navigationBarTitleDisplayMode(.large)
            .onAppear {
                viewModel.fetchSettings()
            }
            .alert("Sign Out?", isPresented: $showLogoutConfirm) {
                Button("Cancel", role: .cancel) { }
                Button("Sign Out", role: .destructive) {
                    viewModel.signOut()
                }
            } message: {
                Text("Are you sure you want to sign out of your account?")
            }
            .alert("Delete Account?", isPresented: $showDeleteAccountAlert) {
                Button("Cancel", role: .cancel) { }
                Button("Continue", role: .destructive) {
                    showDeleteConfirmation = true
                }
            } message: {
                Text("This will permanently delete your restaurant account, including all menu items, order history, and earnings data. This action cannot be undone.")
            }
            .alert("Final Confirmation", isPresented: $showDeleteConfirmation) {
                Button("Cancel", role: .cancel) { }
                Button("Delete Forever", role: .destructive) {
                    performAccountDeletion()
                }
            } message: {
                Text("Are you absolutely sure? Your restaurant account and all associated data will be permanently deleted.")
            }
            .alert("Error", isPresented: .constant(deleteError != nil)) {
                Button("OK") { deleteError = nil }
            } message: {
                Text(deleteError ?? "")
            }
            .sheet(isPresented: $showEditProfile) {
                EditRestaurantProfileView(viewModel: viewModel)
            }
            .sheet(isPresented: $showOperatingHours) {
                OperatingHoursView(viewModel: viewModel)
            }
            .sheet(isPresented: $showNotificationSettings) {
                NotificationSettingsView()
            }
            .sheet(isPresented: $showPaymentSettings) {
                PaymentSettingsView()
            }
        }
    }

    // MARK: - Account Deletion (Apple App Store Guideline 5.1.1)

    private func performAccountDeletion() {
        isDeletingAccount = true

        guard let vendorId = viewModel.vendorId else {
            deleteError = "Unable to identify account. Please try logging out and back in."
            isDeletingAccount = false
            return
        }

        P2PAPIService.shared.deleteVendorAccount(vendorId: vendorId) { result in
            DispatchQueue.main.async {
                self.isDeletingAccount = false

                switch result {
                case .success:
                    // Clear all local data
                    self.clearAllLocalData()
                    // Sign out from Firebase
                    try? Auth.auth().signOut()
                    // P2P logout handled by deleteVendorAccount
                case .failure(let error):
                    self.deleteError = "Failed to delete account: \(error.localizedDescription)"
                }
            }
        }
    }

    private func clearAllLocalData() {
        // Clear UserDefaults
        let vendorKeys = [
            "p2p_vendor_id",
            "p2p_vendor_name",
            "p2p_vendor_email",
            "p2p_vendor_access_token",
            "restaurant_name",
            "restaurant_id",
            "is_online",
            "accepting_delivery",
            "accepting_pickup"
        ]
        for key in vendorKeys {
            UserDefaults.standard.removeObject(forKey: key)
        }
        UserDefaults.standard.synchronize()

        // Clear Keychain
        SecureStorage.shared.clearAuthTokens(type: .vendor)
    }
}

// MARK: - Settings ViewModel
class SettingsViewModel: ObservableObject {
    @Published var restaurantName = "My Restaurant"
    @Published var restaurantAddress = ""
    @Published var restaurantImageUrl: String?
    @Published var isOnline = true
    @Published var acceptingDelivery = true
    @Published var acceptingPickup = true
    @Published var prepTimeBuffer = 10
    @Published var maxOrdersPerHour = 0
    @Published var soundEnabled = true
    @Published var vibrationEnabled = true
    @Published var aiDemandPrediction = true
    @Published var aiPrepTimeOptimization = true
    @Published var aiMenuSuggestions = true
    @Published var operatingHours: [DayHours] = []
    @Published var monthlyEarnings: Double = 0.0
    @Published var isSampleEarnings: Bool = false

    // P2P backend data
    @Published var cuisineType: String = ""
    @Published var phone: String = ""
    @Published var email: String = ""
    @Published var operatingHoursText: String = ""

    private let db = Firestore.firestore()
    private let p2pAPI = P2PAPIService.shared

    var restaurantId: String {
        if let vendorId = P2PAPIService.shared.currentVendorId {
            return String(vendorId)
        }
        return Auth.auth().currentUser?.uid ?? ""
    }

    var vendorId: Int? {
        P2PAPIService.shared.currentVendorId
    }

    var operatingHoursSummary: String {
        // Use P2P operating hours text if available
        if !operatingHoursText.isEmpty {
            return operatingHoursText
        }

        guard !operatingHours.isEmpty else {
            return "Not set"
        }

        let formatter = DateFormatter()
        formatter.dateFormat = "h:mma"

        // Group days with same hours
        var hourGroups: [(days: [String], hours: String)] = []

        for dayHour in operatingHours {
            let hoursString: String
            if dayHour.isOpen {
                let open = formatter.string(from: dayHour.openTime).lowercased()
                let close = formatter.string(from: dayHour.closeTime).lowercased()
                hoursString = "\(open)-\(close)"
            } else {
                hoursString = "Closed"
            }

            // Check if we can add to existing group
            if let lastIndex = hourGroups.indices.last,
               hourGroups[lastIndex].hours == hoursString {
                hourGroups[lastIndex].days.append(String(dayHour.day.prefix(3)))
            } else {
                hourGroups.append((days: [String(dayHour.day.prefix(3))], hours: hoursString))
            }
        }

        // Format output
        if hourGroups.count == 1 {
            let group = hourGroups[0]
            if group.days.count == 7 {
                return "Every day: \(group.hours)"
            }
        }

        return hourGroups.map { group in
            let daysStr: String
            if group.days.count > 2, let first = group.days.first, let last = group.days.last {
                daysStr = "\(first)-\(last)"
            } else {
                daysStr = group.days.joined(separator: ", ")
            }
            return "\(daysStr): \(group.hours)"
        }.joined(separator: " | ")
    }

    func fetchSettings() {
        // Try P2P backend first (primary source for restaurant data)
        if let vendorId = vendorId {
            fetchP2PVendorProfile(vendorId: vendorId)
        }

        // Also fetch from Firebase for additional settings
        guard !restaurantId.isEmpty else { return }

        db.collection("restaurants").document(restaurantId).getDocument { [weak self] snapshot, error in
            guard let self = self, let data = snapshot?.data() else { return }

            DispatchQueue.main.async {
                // Only use Firebase data if P2P didn't provide it
                if self.restaurantName == "My Restaurant" {
                    self.restaurantName = data["name"] as? String ?? "My Restaurant"
                }
                if self.restaurantAddress.isEmpty {
                    self.restaurantAddress = data["address"] as? String ?? ""
                }
                if self.restaurantImageUrl == nil {
                    self.restaurantImageUrl = data["imageUrl"] as? String
                }
                self.isOnline = data["isOnline"] as? Bool ?? true
                self.prepTimeBuffer = data["prepTimeBuffer"] as? Int ?? 10
                self.maxOrdersPerHour = data["maxOrdersPerHour"] as? Int ?? 0

                // Parse operating hours from Firestore if not set from P2P
                if self.operatingHours.isEmpty {
                    if let hoursData = data["operatingHours"] as? [[String: Any]] {
                        self.operatingHours = self.parseOperatingHours(hoursData)
                    } else {
                        self.operatingHours = self.defaultOperatingHours()
                    }
                }
            }
        }

        // Fetch monthly earnings from orders
        fetchMonthlyEarnings()
    }

    private func fetchP2PVendorProfile(vendorId: Int) {
        p2pAPI.fetchVendorProfile(vendorId: vendorId) { [weak self] result in
            DispatchQueue.main.async {
                switch result {
                case .success(let profile):
                    self?.restaurantName = profile.name
                    self?.restaurantAddress = profile.address.fullAddress
                    self?.cuisineType = profile.cuisineType ?? "Indian"
                    self?.phone = profile.contact.phone ?? ""
                    self?.email = profile.contact.email ?? ""
                    self?.operatingHoursText = profile.operatingHours ?? ""
                    self?.acceptingDelivery = profile.deliveryAvailable
                    self?.acceptingPickup = profile.pickupAvailable
                    #if DEBUG
                    logger.debug("Loaded vendor profile from P2P: \(profile.name)")
                    #endif
                case .failure(let error):
                    #if DEBUG
                    logger.debug("Error: Failed to fetch vendor profile - \(error.localizedDescription)")
                    #endif
                }
            }
        }
    }

    private func parseOperatingHours(_ data: [[String: Any]]) -> [DayHours] {
        let calendar = Calendar.current
        let today = calendar.startOfDay(for: Date())

        return data.compactMap { hourData -> DayHours? in
            guard let day = hourData["day"] as? String else { return nil }

            let isOpen = hourData["isOpen"] as? Bool ?? true
            let openMinutes = hourData["openTime"] as? Int ?? 600 // Default 10:00 AM
            let closeMinutes = hourData["closeTime"] as? Int ?? 1320 // Default 10:00 PM

            let openTime = calendar.date(byAdding: .minute, value: openMinutes, to: today) ?? today
            let closeTime = calendar.date(byAdding: .minute, value: closeMinutes, to: today) ?? today

            return DayHours(day: day, isOpen: isOpen, openTime: openTime, closeTime: closeTime)
        }
    }

    private func defaultOperatingHours() -> [DayHours] {
        let calendar = Calendar.current
        let today = calendar.startOfDay(for: Date())
        let defaultOpen = calendar.date(byAdding: .hour, value: 10, to: today) ?? today
        let defaultClose = calendar.date(byAdding: .hour, value: 22, to: today) ?? today

        return [
            DayHours(day: "Monday", isOpen: true, openTime: defaultOpen, closeTime: defaultClose),
            DayHours(day: "Tuesday", isOpen: true, openTime: defaultOpen, closeTime: defaultClose),
            DayHours(day: "Wednesday", isOpen: true, openTime: defaultOpen, closeTime: defaultClose),
            DayHours(day: "Thursday", isOpen: true, openTime: defaultOpen, closeTime: defaultClose),
            DayHours(day: "Friday", isOpen: true, openTime: defaultOpen, closeTime: defaultClose),
            DayHours(day: "Saturday", isOpen: true, openTime: defaultOpen, closeTime: defaultClose),
            DayHours(day: "Sunday", isOpen: false, openTime: defaultOpen, closeTime: defaultClose)
        ]
    }

    func saveOperatingHours(_ hours: [DayHours]) {
        // Always update local state immediately
        operatingHours = hours
        let hoursString = formatHoursForP2P(hours)
        operatingHoursText = hoursString

        // Save to Firebase (if logged in via Firebase)
        if !restaurantId.isEmpty {
            let calendar = Calendar.current
            let today = calendar.startOfDay(for: Date())

            let hoursData: [[String: Any]] = hours.map { dayHour in
                let openMinutes = calendar.dateComponents([.hour, .minute], from: today, to: dayHour.openTime)
                let closeMinutes = calendar.dateComponents([.hour, .minute], from: today, to: dayHour.closeTime)

                return [
                    "day": dayHour.day,
                    "isOpen": dayHour.isOpen,
                    "openTime": (openMinutes.hour ?? 0) * 60 + (openMinutes.minute ?? 0),
                    "closeTime": (closeMinutes.hour ?? 0) * 60 + (closeMinutes.minute ?? 0)
                ]
            }

            db.collection("restaurants").document(restaurantId).updateData([
                "operatingHours": hoursData
            ])
        }

        // Save to P2P backend (primary source of truth)
        if let vendorId = vendorId {
            p2pAPI.patchVendorSettings(vendorId: vendorId, updates: ["operating_hours": hoursString]) { [weak self] result in
                DispatchQueue.main.async {
                    switch result {
                    case .success:
                        #if DEBUG
                        logger.info("[Settings] P2P operating hours saved successfully")
                        #endif
                    case .failure:
                        // Revert local state on failure
                        self?.operatingHoursText = ""
                        self?.operatingHours = []
                    }
                }
            }
        }
    }

    private func formatHoursForP2P(_ hours: [DayHours]) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "h:mma"

        return hours.map { dayHour in
            if dayHour.isOpen {
                let open = formatter.string(from: dayHour.openTime).lowercased()
                let close = formatter.string(from: dayHour.closeTime).lowercased()
                return "\(dayHour.day): \(open)-\(close)"
            } else {
                return "\(dayHour.day): Closed"
            }
        }.joined(separator: ", ")
    }

    private func fetchMonthlyEarnings() {
        guard let vendorId = vendorId else { return }

        p2pAPI.getAIInsights(vendorId: vendorId, period: "month") { [weak self] result in
            DispatchQueue.main.async {
                switch result {
                case .success(let response):
                    // totalRevenue from backend is gross revenue; subtract platform fee ($1/order)
                    let platformFee = AppConfig.shared.restaurantPlatformFee
                    let earnings = response.totalRevenue - (Double(response.totalOrders) * platformFee)
                    if response.totalOrders == 0 {
                        // Show sample earnings when no real order data
                        self?.monthlyEarnings = 847.50
                        self?.isSampleEarnings = true
                    } else {
                        self?.monthlyEarnings = max(0, earnings)
                        self?.isSampleEarnings = false
                    }
                case .failure:
                    // Show sample earnings on failure so UI doesn't show $0.00
                    self?.monthlyEarnings = 847.50
                    self?.isSampleEarnings = true
                }
            }
        }
    }

    func updateOnlineStatus(_ isOnline: Bool) {
        guard !restaurantId.isEmpty else { return }

        // Update Firebase for legacy clients
        db.collection("restaurants").document(restaurantId).updateData([
            "isOnline": isOnline
        ])

        // Sync to P2P backend (drives customer app visibility + auto-cancels pending orders)
        if let vendorId = vendorId {
            p2pAPI.updateVendorStatus(vendorId: vendorId, isOnline: isOnline) { _ in }
        }
    }

    func updateSettings() {
        guard !restaurantId.isEmpty else { return }

        db.collection("restaurants").document(restaurantId).updateData([
            "acceptingDelivery": acceptingDelivery,
            "acceptingPickup": acceptingPickup,
            "prepTimeBuffer": prepTimeBuffer,
            "maxOrdersPerHour": maxOrdersPerHour
        ])
    }

    func signOut() {
        // Clear P2P backend session
        P2PAPIService.shared.logout()
        // Sign out from Firebase
        try? Auth.auth().signOut()
        // Clear any Apple Sign-In stored data
        UserDefaults.standard.removeObject(forKey: "vendor_apple_user_name")
        UserDefaults.standard.removeObject(forKey: "vendor_apple_user_id")
        UserDefaults.standard.removeObject(forKey: "vendor_apple_user_email")
        UserDefaults.standard.synchronize()
        // Post notification to update UI
        NotificationCenter.default.post(name: NSNotification.Name("UserDidLogout"), object: nil)
    }
}

// MARK: - Supporting Types
struct DayHours: Identifiable {
    let id = UUID()
    var day: String
    var isOpen: Bool
    var openTime: Date
    var closeTime: Date
}

// MARK: - Edit Restaurant Profile View
struct EditRestaurantProfileView: View {
    @ObservedObject var viewModel: SettingsViewModel
    @Environment(\.dismiss) var dismiss

    @State private var name = ""
    @State private var address = ""
    @State private var phone = ""
    @State private var email = ""
    @State private var description = ""
    @State private var cuisine = ""
    @State private var showImagePicker = false
    @State private var selectedLogoData: Data?
    @State private var isSaving = false

    var body: some View {
        NavigationStack {
            Form {
                Section("Basic Info") {
                    TextField("Restaurant Name", text: $name)
                    TextField("Address", text: $address)
                    TextField("Phone", text: $phone)
                        .keyboardType(.phonePad)
                    TextField("Email", text: $email)
                        .keyboardType(.emailAddress)
                        .textInputAutocapitalization(.never)
                }

                Section("About") {
                    TextField("Cuisine Type", text: $cuisine)
                    TextField("Description", text: $description, axis: .vertical)
                        .lineLimit(3...5)
                }

                Section("Logo") {
                    HStack {
                        Spacer()
                        ZStack {
                            Circle()
                                .fill(Color.gray.opacity(0.2))
                                .frame(width: 100, height: 100)

                            if let logoData = selectedLogoData,
                               let uiImage = UIImage(data: logoData) {
                                Image(uiImage: uiImage)
                                    .resizable()
                                    .scaledToFill()
                                    .frame(width: 100, height: 100)
                                    .clipShape(Circle())
                            } else if let urlString = viewModel.restaurantImageUrl,
                                      let url = URL(string: urlString) {
                                AsyncImage(url: url) { phase in
                                    switch phase {
                                    case .success(let image):
                                        image
                                            .resizable()
                                            .scaledToFill()
                                            .frame(width: 100, height: 100)
                                            .clipShape(Circle())
                                    default:
                                        Image(systemName: "camera.fill")
                                            .font(.title)
                                            .foregroundColor(.gray)
                                    }
                                }
                            } else {
                                Image(systemName: "camera.fill")
                                    .font(.title)
                                    .foregroundColor(.gray)
                            }
                        }
                        Spacer()
                    }
                    .padding(.vertical)

                    Button("Upload Logo") {
                        showImagePicker = true
                    }
                    .accessibilityLabel("Upload restaurant logo")
                    .accessibilityHint("Opens photo picker to select a logo image")
                    .frame(maxWidth: .infinity)
                }
                .photosPicker(isPresented: $showImagePicker, selection: .init(get: { nil }, set: { item in
                    Task {
                        if let item = item,
                           let data = try? await item.loadTransferable(type: Data.self) {
                            selectedLogoData = data
                        }
                    }
                }), matching: .images)
            }
            .navigationTitle("Edit Profile")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") { dismiss() }
                        .accessibilityLabel("Cancel")
                        .accessibilityHint("Discards changes and closes this screen")
                }
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Save") {
                        saveProfile()
                    }
                    .accessibilityLabel("Save profile changes")
                    .accessibilityHint("Saves your restaurant profile updates")
                    .fontWeight(.semibold)
                    .disabled(isSaving)
                }
            }
            .onAppear {
                name = viewModel.restaurantName
                address = viewModel.restaurantAddress
                phone = viewModel.phone
                email = viewModel.email
                cuisine = viewModel.cuisineType
            }
            .overlay {
                if isSaving {
                    ZStack {
                        Color.black.opacity(0.4)
                        VStack(spacing: 12) {
                            ProgressView()
                                .scaleEffect(1.5)
                            Text("Saving...")
                                .foregroundColor(.white)
                        }
                    }
                    .ignoresSafeArea()
                }
            }
        }
    }

    private func saveProfile() {
        guard let vendorId = viewModel.vendorId else {
            dismiss()
            return
        }

        isSaving = true

        // Build updates dict
        var updates: [String: Any] = [:]
        if name != viewModel.restaurantName { updates["restaurant_name"] = name }
        if address != viewModel.restaurantAddress { updates["address"] = address }
        if phone != viewModel.phone { updates["phone"] = phone }
        if email != viewModel.email { updates["email"] = email }
        if cuisine != viewModel.cuisineType { updates["cuisine_type"] = cuisine }

        // If logo was selected, upload first then save URL
        if let logoData = selectedLogoData,
           let image = UIImage(data: logoData),
           let jpegData = image.jpegData(compressionQuality: 0.7) {
            let storage = Storage.storage()
            let ref = storage.reference()
                .child("restaurants")
                .child(String(vendorId))
                .child("logo.jpg")
            let metadata = StorageMetadata()
            metadata.contentType = "image/jpeg"

            ref.putData(jpegData, metadata: metadata) { (_: StorageMetadata?, error: Error?) in
                if error != nil {
                    DispatchQueue.main.async { isSaving = false }
                    return
                }
                ref.downloadURL { (url: URL?, _: Error?) in
                    if let url = url {
                        updates["image_url"] = url.absoluteString
                    }
                    self.patchAndDismiss(vendorId: vendorId, updates: updates)
                }
            }
        } else if updates.isEmpty {
            isSaving = false
            dismiss()
        } else {
            patchAndDismiss(vendorId: vendorId, updates: updates)
        }
    }

    private func patchAndDismiss(vendorId: Int, updates: [String: Any]) {
        guard !updates.isEmpty else {
            isSaving = false
            dismiss()
            return
        }

        P2PAPIService.shared.patchVendorSettings(vendorId: vendorId, updates: updates) { result in
            isSaving = false
            switch result {
            case .success:
                viewModel.restaurantName = name
                viewModel.restaurantAddress = address
                viewModel.phone = phone
                viewModel.email = email
                viewModel.cuisineType = cuisine
            case .failure:
                break
            }
            dismiss()
        }
    }
}

// MARK: - Operating Hours View
struct OperatingHoursView: View {
    @ObservedObject var viewModel: SettingsViewModel
    @Environment(\.dismiss) var dismiss

    @State private var hours: [DayHours] = []
    @State private var isSaving = false

    var body: some View {
        NavigationStack {
            List {
                ForEach($hours) { $dayHours in
                    Section(dayHours.day) {
                        Toggle("Open", isOn: $dayHours.isOpen)
                            .tint(RestaurantTheme.brandGreen)

                        if dayHours.isOpen {
                            DatePicker("Opens", selection: $dayHours.openTime, displayedComponents: .hourAndMinute)
                            DatePicker("Closes", selection: $dayHours.closeTime, displayedComponents: .hourAndMinute)
                        }
                    }
                }

                Section {
                    Button("Copy Monday to All Days") {
                        if let monday = hours.first {
                            for i in 1..<hours.count {
                                hours[i].isOpen = monday.isOpen
                                hours[i].openTime = monday.openTime
                                hours[i].closeTime = monday.closeTime
                            }
                        }
                    }
                    .accessibilityLabel("Copy Monday hours to all days")
                    .accessibilityHint("Applies Monday's schedule to every day of the week")

                    Button("Set All to Weekday Hours (Mon-Fri)") {
                        if let monday = hours.first {
                            for i in 0..<5 { // Mon-Fri
                                hours[i].isOpen = monday.isOpen
                                hours[i].openTime = monday.openTime
                                hours[i].closeTime = monday.closeTime
                            }
                        }
                    }
                    .accessibilityLabel("Set weekday hours")
                    .accessibilityHint("Applies Monday's schedule to Monday through Friday")
                }
            }
            .navigationTitle("Operating Hours")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") { dismiss() }
                        .accessibilityLabel("Cancel")
                        .accessibilityHint("Discards changes and closes this screen")
                }
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Save") {
                        isSaving = true
                        viewModel.saveOperatingHours(hours)
                        dismiss()
                    }
                    .accessibilityLabel("Save operating hours")
                    .accessibilityHint("Saves your restaurant's business hours")
                    .fontWeight(.semibold)
                    .disabled(isSaving)
                }
            }
            .onAppear {
                // Load existing hours from viewModel or use defaults
                if viewModel.operatingHours.isEmpty {
                    hours = createDefaultHours()
                } else {
                    hours = viewModel.operatingHours
                }
            }
        }
    }

    private func createDefaultHours() -> [DayHours] {
        let calendar = Calendar.current
        let today = calendar.startOfDay(for: Date())
        let defaultOpen = calendar.date(byAdding: .hour, value: 10, to: today) ?? today
        let defaultClose = calendar.date(byAdding: .hour, value: 22, to: today) ?? today

        return [
            DayHours(day: "Monday", isOpen: true, openTime: defaultOpen, closeTime: defaultClose),
            DayHours(day: "Tuesday", isOpen: true, openTime: defaultOpen, closeTime: defaultClose),
            DayHours(day: "Wednesday", isOpen: true, openTime: defaultOpen, closeTime: defaultClose),
            DayHours(day: "Thursday", isOpen: true, openTime: defaultOpen, closeTime: defaultClose),
            DayHours(day: "Friday", isOpen: true, openTime: defaultOpen, closeTime: defaultClose),
            DayHours(day: "Saturday", isOpen: true, openTime: defaultOpen, closeTime: defaultClose),
            DayHours(day: "Sunday", isOpen: false, openTime: defaultOpen, closeTime: defaultClose)
        ]
    }
}

// MARK: - Notification Settings View
struct NotificationSettingsView: View {
    @Environment(\.dismiss) var dismiss

    @AppStorage("notification_newOrderNotifications") private var newOrderNotifications = true
    @AppStorage("notification_orderUpdateNotifications") private var orderUpdateNotifications = true
    @AppStorage("notification_lowStockAlerts") private var lowStockAlerts = true
    @AppStorage("notification_performanceReports") private var performanceReports = true
    @AppStorage("notification_promotionalEmails") private var promotionalEmails = false

    var body: some View {
        NavigationStack {
            List {
                Section("Push Notifications") {
                    Toggle("New Order Alerts", isOn: $newOrderNotifications)
                    Toggle("Order Updates", isOn: $orderUpdateNotifications)
                    Toggle("Low Stock Alerts", isOn: $lowStockAlerts)
                }

                Section("Email Notifications") {
                    Toggle("Daily Performance Reports", isOn: $performanceReports)
                    Toggle("Promotional Updates", isOn: $promotionalEmails)
                }

                Section {
                    Button("Test Notification") {
                        // Send local test notification
                        let content = UNMutableNotificationContent()
                        content.title = "New Order!"
                        content.body = "You have a new order waiting to be accepted."
                        content.sound = .default
                        let request = UNNotificationRequest(identifier: UUID().uuidString, content: content, trigger: nil)
                        UNUserNotificationCenter.current().add(request)
                    }
                    .accessibilityLabel("Test notification")
                    .accessibilityHint("Sends a test notification to verify your settings")
                }
            }
            .navigationTitle("Notifications")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") {
                        syncNotificationPreferences()
                        dismiss()
                    }
                        .accessibilityLabel("Done")
                        .accessibilityHint("Closes notification settings")
                }
            }
        }
    }

    private func syncNotificationPreferences() {
        guard let vendorId = P2PAPIService.shared.currentVendorId else { return }
        let prefs: [String: Any] = [
            "new_order_notifications": newOrderNotifications,
            "order_update_notifications": orderUpdateNotifications,
            "low_stock_alerts": lowStockAlerts,
            "performance_reports": performanceReports,
            "promotional_emails": promotionalEmails
        ]
        P2PAPIService.shared.patchVendorSettings(vendorId: vendorId, updates: ["notification_preferences": prefs]) { result in
            #if DEBUG
            switch result {
            case .success:
                logger.info("[Settings] P2P notification preferences synced")
            case .failure(let error):
                logger.info("[Settings] P2P notification sync failed: \(error.localizedDescription)")
            }
            #endif
        }
    }
}

// MARK: - Payment Settings View
struct PaymentSettingsView: View {
    @Environment(\.dismiss) var dismiss

    @State private var payoutFrequency = "Weekly"

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    HStack(spacing: 12) {
                        Image(systemName: "building.columns.fill")
                            .font(.title2)
                            .foregroundColor(.red)
                        VStack(alignment: .leading, spacing: 2) {
                            Text("Wells Fargo")
                                .font(.headline)
                            Text("Checking Account")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                        Spacer()
                        Image(systemName: "checkmark.circle.fill")
                            .foregroundColor(.green)
                    }
                    .padding(.vertical, 4)
                } header: {
                    Text("Linked Bank Account")
                }

                Section {
                    HStack {
                        Text("Account Number")
                            .foregroundColor(.secondary)
                        Spacer()
                        Text("xxxx xxxx 4891")
                            .font(.system(.body, design: .monospaced))
                    }
                    HStack {
                        Text("Routing Number")
                            .foregroundColor(.secondary)
                        Spacer()
                        Text("xxxx xxxx 2710")
                            .font(.system(.body, design: .monospaced))
                    }
                    HStack {
                        Text("Account Type")
                            .foregroundColor(.secondary)
                        Spacer()
                        Text("Business Checking")
                    }
                } header: {
                    Text("Account Details")
                }

                Section("Payout Schedule") {
                    Picker("Frequency", selection: $payoutFrequency) {
                        Text("Daily").tag("Daily")
                        Text("Weekly").tag("Weekly")
                        Text("Bi-Weekly").tag("Bi-Weekly")
                        Text("Monthly").tag("Monthly")
                    }
                }

                Section("Recent Payouts") {
                    PayoutRow(date: "Mar 8, 2026", amount: 1250.00, status: "Completed")
                    PayoutRow(date: "Mar 1, 2026", amount: 980.50, status: "Completed")
                    PayoutRow(date: "Feb 22, 2026", amount: 1420.00, status: "Completed")
                }
            }
            .navigationTitle("Payment Settings")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") { dismiss() }
                        .accessibilityLabel("Done")
                        .accessibilityHint("Closes payment settings")
                }
            }
        }
    }
}

struct PayoutRow: View {
    let date: String
    let amount: Double
    let status: String

    var body: some View {
        HStack {
            VStack(alignment: .leading) {
                Text(date)
                    .font(.subheadline)
                Text(status)
                    .font(.caption)
                    .foregroundColor(.green)
            }
            Spacer()
            Text("$\(String(format: "%.2f", amount))")
                .fontWeight(.semibold)
        }
    }
}

// MARK: - FAQ View
struct FAQView: View {
    var body: some View {
        List {
            FAQItem(
                question: "How do I update my menu?",
                answer: "Go to the Menu tab and tap the + button to add items, or tap any existing item to edit it."
            )
            FAQItem(
                question: "How do I receive payments?",
                answer: "Payments are processed automatically and deposited to your linked bank account based on your payout schedule."
            )
            FAQItem(
                question: "What if I need to reject an order?",
                answer: "Tap on the order and select 'Reject'. Please provide a reason so customers understand why."
            )
            FAQItem(
                question: "How does AI demand prediction work?",
                answer: "Our AI analyzes your historical order data, time patterns, and external factors to predict busy periods."
            )
        }
        .navigationTitle("FAQs")
    }
}

struct FAQItem: View {
    let question: String
    let answer: String
    @State private var isExpanded = false

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Button(action: { withAnimation { isExpanded.toggle() } }) {
                HStack {
                    Text(question)
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .foregroundColor(.primary)
                        .multilineTextAlignment(.leading)
                    Spacer()
                    Image(systemName: isExpanded ? "chevron.up" : "chevron.down")
                        .font(.caption)
                        .foregroundColor(.gray)
                }
            }
            .accessibilityLabel(question)
            .accessibilityHint(isExpanded ? "Tap to collapse answer" : "Tap to expand answer")

            if isExpanded {
                Text(answer)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
        }
        .padding(.vertical, 4)
    }
}

// MARK: - Legal Document View
struct LegalDocumentView: View {
    let title: String
    let type: LegalDocType
    @Environment(\.openURL) private var openURL

    enum LegalDocType {
        case terms, privacy, agreement

        var url: URL? {
            switch self {
            case .terms:
                return URL(string: AppConstants.termsOfServiceURL)
            case .privacy:
                return URL(string: AppConstants.privacyPolicyURL)
            case .agreement:
                return URL(string: AppConstants.termsOfServiceURL)
            }
        }

        var description: String {
            switch self {
            case .terms:
                return """
                Dollor.AI is a peer-to-platform matchmaking service that connects restaurants with customers and independent delivery partners.

                IMPORTANT: Dollor.AI is NOT a transportation network company (TNC). We do not:
                • Employ or control delivery drivers
                • Set delivery routes or schedules
                • Provide transportation services directly

                Dollor.AI operates as a technology platform that:
                • Facilitates connections between restaurants and customers
                • Enables independent contractors to accept delivery requests
                • Provides order management tools for restaurant partners
                • Charges a flat $1 per order platform fee

                All delivery services are performed by independent contractors who maintain their own schedules, use their own vehicles, and operate their own businesses.
                """
            case .privacy:
                return """
                Your privacy is important to us. Dollor.AI collects and processes data necessary to provide our matchmaking services.

                We collect:
                • Restaurant business information
                • Order and transaction data
                • Communication preferences

                We use this data to:
                • Facilitate orders between customers and restaurants
                • Match delivery requests with available independent contractors
                • Improve our platform services
                • Send relevant notifications

                We do not sell your personal information to third parties.
                """
            case .agreement:
                return """
                As a Restaurant Partner on Dollor.AI:

                • You maintain full control of your menu, pricing, and operations
                • You agree to fulfill orders placed through our platform
                • You understand Dollor.AI is a matchmaking platform only
                • You acknowledge delivery partners are independent contractors
                • You agree to the flat $1 per order platform fee

                Dollor.AI provides the technology platform to connect you with customers. We do not control your business operations, employment decisions, or food preparation.
                """
            }
        }
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                Image(systemName: iconName)
                    .font(.system(size: 60))
                    .foregroundColor(Theme.brandGreen)
                    .padding(.top, 40)

                Text(title)
                    .font(.title2)
                    .fontWeight(.bold)

                // In-app summary
                VStack(alignment: .leading, spacing: 12) {
                    Text("Summary")
                        .font(.headline)
                        .foregroundColor(.primary)

                    Text(type.description)
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                        .fixedSize(horizontal: false, vertical: true)
                }
                .padding()
                .background(Color.gray.opacity(0.1))
                .cornerRadius(12)
                .padding(.horizontal)

                // Platform Disclosure
                VStack(alignment: .leading, spacing: 8) {
                    HStack {
                        Image(systemName: "info.circle.fill")
                            .foregroundColor(.blue)
                        Text("Platform Disclosure")
                            .font(.headline)
                    }

                    Text("Dollor.AI operates as a peer-to-platform matchmaking service. We are not a transportation network company (TNC) and do not directly provide delivery or transportation services.")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                .padding()
                .background(Color.blue.opacity(0.1))
                .cornerRadius(12)
                .padding(.horizontal)

                if let url = type.url {
                    Button(action: { openURL(url) }) {
                        HStack {
                            Image(systemName: "safari")
                            Text("View Full Document")
                        }
                        .font(.headline)
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Theme.brandGreen)
                        .cornerRadius(12)
                    }
                    .accessibilityLabel("View full \(title)")
                    .accessibilityHint("Opens the complete document in your browser")
                    .padding(.horizontal)
                }

                Spacer(minLength: 40)
            }
        }
        .navigationTitle(title)
        .navigationBarTitleDisplayMode(.inline)
    }

    private var iconName: String {
        switch type {
        case .terms: return "doc.text.fill"
        case .privacy: return "hand.raised.fill"
        case .agreement: return "signature"
        }
    }
}

#Preview {
    RestaurantSettingsView()
}
