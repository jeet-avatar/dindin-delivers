import SwiftUI
import Combine
import PhotosUI
import UserNotifications
import FirebaseAuth
import FirebaseFirestore
import EatFairShared

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

                // Business Documents Section
                Section("Business Documents") {
                    NavigationLink(destination: RestaurantDocumentsView()) {
                        HStack {
                            Label {
                                VStack(alignment: .leading, spacing: 2) {
                                    Text("Verification Documents")
                                    Text("License, Tax ID, Health Permit")
                                        .font(.caption)
                                        .foregroundColor(.secondary)
                                }
                            } icon: {
                                Image(systemName: "doc.badge.checkmark")
                                    .foregroundColor(.blue)
                            }
                            Spacer()
                            Text("Required")
                                .font(.caption)
                                .foregroundColor(.orange)
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
                        Text("$\(String(format: "%.2f", viewModel.monthlyEarnings))")
                            .fontWeight(.semibold)
                            .foregroundColor(RestaurantTheme.brandGreen)
                    }
                }

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
                        Text(viewModel.restaurantId.prefix(12) + "...")
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

    // P2P backend data
    @Published var cuisineType: String = ""
    @Published var phone: String = ""
    @Published var email: String = ""
    @Published var operatingHoursText: String = ""

    private let db = Firestore.firestore()
    private let p2pAPI = P2PAPIService.shared

    var restaurantId: String {
        Auth.auth().currentUser?.uid ?? ""
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
                    print("Loaded vendor profile from P2P: \(profile.name)")
                    #endif
                case .failure(let error):
                    #if DEBUG
                    print("Error: Failed to fetch vendor profile - \(error.localizedDescription)")
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
        guard !restaurantId.isEmpty else { return }

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
        ]) { [weak self] error in
            if error == nil {
                DispatchQueue.main.async {
                    self?.operatingHours = hours
                }
            }
        }
    }

    private func fetchMonthlyEarnings() {
        guard !restaurantId.isEmpty else { return }

        let calendar = Calendar.current
        let now = Date()
        guard let startOfMonth = calendar.date(from: calendar.dateComponents([.year, .month], from: now)) else { return }
        let startTimestamp = Int64(startOfMonth.timeIntervalSince1970 * 1000)

        db.collection("orders")
            .whereField("restaurantId", isEqualTo: restaurantId)
            .whereField("placedAt", isGreaterThanOrEqualTo: startTimestamp)
            .whereField("status", in: ["Delivered", "Picked Up", "Ready"])
            .getDocuments { [weak self] snapshot, error in
                guard let documents = snapshot?.documents else { return }

                let total = documents.compactMap { doc -> Double? in
                    doc.data()["total"] as? Double
                }.reduce(0, +)

                // Subtract flat $1 platform fee per order
                let orderCount = documents.count
                let platformFee = AppConfig.shared.restaurantPlatformFee
                let earnings = total - (Double(orderCount) * platformFee)

                DispatchQueue.main.async {
                    self?.monthlyEarnings = earnings
                }
            }
    }

    func updateOnlineStatus(_ isOnline: Bool) {
        guard !restaurantId.isEmpty else { return }

        db.collection("restaurants").document(restaurantId).updateData([
            "isOnline": isOnline
        ])
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
                }
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Save") {
                        // Save changes
                        dismiss()
                    }
                    .fontWeight(.semibold)
                }
            }
            .onAppear {
                name = viewModel.restaurantName
                address = viewModel.restaurantAddress
            }
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

                    Button("Set All to Weekday Hours (Mon-Fri)") {
                        if let monday = hours.first {
                            for i in 0..<5 { // Mon-Fri
                                hours[i].isOpen = monday.isOpen
                                hours[i].openTime = monday.openTime
                                hours[i].closeTime = monday.closeTime
                            }
                        }
                    }
                }
            }
            .navigationTitle("Operating Hours")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Save") {
                        isSaving = true
                        viewModel.saveOperatingHours(hours)
                        dismiss()
                    }
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

    @State private var newOrderNotifications = true
    @State private var orderUpdateNotifications = true
    @State private var lowStockAlerts = true
    @State private var performanceReports = true
    @State private var promotionalEmails = false

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
                }
            }
            .navigationTitle("Notifications")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") { dismiss() }
                }
            }
        }
    }
}

// MARK: - Payment Settings View
struct PaymentSettingsView: View {
    @Environment(\.dismiss) var dismiss

    @State private var bankName = ""
    @State private var accountNumber = ""
    @State private var routingNumber = ""
    @State private var payoutFrequency = "Weekly"

    var body: some View {
        NavigationStack {
            Form {
                Section("Bank Account") {
                    TextField("Bank Name", text: $bankName)
                    TextField("Account Number", text: $accountNumber)
                        .keyboardType(.numberPad)
                    TextField("Routing Number", text: $routingNumber)
                        .keyboardType(.numberPad)
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
                    PayoutRow(date: "Nov 22, 2024", amount: 1250.00, status: "Completed")
                    PayoutRow(date: "Nov 15, 2024", amount: 980.50, status: "Completed")
                    PayoutRow(date: "Nov 8, 2024", amount: 1420.00, status: "Completed")
                }
            }
            .navigationTitle("Payment Settings")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") { dismiss() }
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
