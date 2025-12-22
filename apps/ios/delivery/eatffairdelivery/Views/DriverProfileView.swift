import SwiftUI
import FirebaseAuth
import FirebaseFirestore
import FirebaseStorage
import PhotosUI
import MapKit
import EatFairShared

// MARK: - Main Profile View
struct DriverProfileView: View {
    @EnvironmentObject var authManager: AuthManager
    @StateObject private var viewModel = DriverProfileViewModel()
    @State private var selectedTab = 0

    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 0) {
                    // Expiration Alerts Banner
                    if !viewModel.expirationAlerts.isEmpty {
                        ExpirationAlertsBanner(alerts: viewModel.expirationAlerts)
                    }

                    // Profile Header with Photo
                    ProfileHeaderView(viewModel: viewModel)

                    // Stats Overview
                    StatsOverviewCard(stats: viewModel.driver?.stats)

                    // Tab Selection
                    ProfileTabSelector(selectedTab: $selectedTab)

                    // Tab Content
                    switch selectedTab {
                    case 0:
                        PersonalInfoSection(viewModel: viewModel)
                    case 1:
                        VehicleDocumentsSection(viewModel: viewModel)
                    case 2:
                        EarningsPaymentSection(viewModel: viewModel)
                    case 3:
                        SettingsSection(viewModel: viewModel)
                            .environmentObject(authManager)
                    default:
                        PersonalInfoSection(viewModel: viewModel)
                    }
                }
            }
            .background(Theme.backgroundGrey.ignoresSafeArea())
            .navigationTitle("Profile")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(action: { viewModel.isEditing.toggle() }) {
                        Text(viewModel.isEditing ? "Done" : "Edit")
                            .fontWeight(.semibold)
                            .foregroundColor(Theme.brandRed)
                    }
                }
            }
            .onAppear {
                viewModel.fetchProfile()
            }
            .alert("Error", isPresented: $viewModel.showError) {
                Button("OK", role: .cancel) { }
            } message: {
                Text(viewModel.errorMessage)
            }
        }
    }
}

// MARK: - Profile Header
struct ProfileHeaderView: View {
    @ObservedObject var viewModel: DriverProfileViewModel
    @State private var showImagePicker = false
    @State private var selectedItem: PhotosPickerItem?

    var body: some View {
        VStack(spacing: 16) {
            // Profile Image
            ZStack(alignment: .bottomTrailing) {
                if let imageUrl = viewModel.driver?.profileImageUrl, !imageUrl.isEmpty {
                    AsyncImage(url: URL(string: imageUrl)) { image in
                        image
                            .resizable()
                            .scaledToFill()
                    } placeholder: {
                        profilePlaceholder
                    }
                    .frame(width: 120, height: 120)
                    .clipShape(Circle())
                } else {
                    profilePlaceholder
                }

                if viewModel.isEditing {
                    PhotosPicker(selection: $selectedItem, matching: .images) {
                        Image(systemName: "camera.fill")
                            .font(.system(size: 14))
                            .foregroundColor(.white)
                            .frame(width: 36, height: 36)
                            .background(Theme.brandRed)
                            .clipShape(Circle())
                    }
                    .onChange(of: selectedItem) { _, newItem in
                        Task {
                            if let data = try? await newItem?.loadTransferable(type: Data.self) {
                                await viewModel.uploadProfileImage(data)
                            }
                        }
                    }
                }
            }

            // Name & Rating
            VStack(spacing: 4) {
                Text(viewModel.driver?.name ?? "Driver Name")
                    .font(.title2)
                    .fontWeight(.bold)
                    .foregroundColor(Theme.textPrimary)

                HStack(spacing: 4) {
                    Image(systemName: "star.fill")
                        .foregroundColor(.yellow)
                    Text(String(format: "%.1f", viewModel.driver?.stats?.rating ?? 5.0))
                        .fontWeight(.semibold)
                    Text("•")
                        .foregroundColor(Theme.textGrey)
                    Text("\(viewModel.driver?.stats?.totalDeliveries ?? 0) deliveries")
                        .foregroundColor(Theme.textSecondary)
                }
                .font(.subheadline)
            }

            // Status Badge
            HStack(spacing: 8) {
                statusBadge

                if viewModel.driver?.isApproved == true {
                    verifiedBadge
                }
            }
        }
        .padding(.vertical, 24)
        .frame(maxWidth: .infinity)
        .background(
            LinearGradient(
                colors: [Theme.brandRed.opacity(0.1), Theme.backgroundGrey],
                startPoint: .top,
                endPoint: .bottom
            )
        )
    }

    private var profilePlaceholder: some View {
        Image(systemName: "person.circle.fill")
            .resizable()
            .scaledToFit()
            .frame(width: 120, height: 120)
            .foregroundColor(Theme.textGrey)
    }

    private var statusBadge: some View {
        let status = viewModel.driver?.approvalStatus ?? "pending"
        let (color, icon, text) = statusInfo(for: status)

        return HStack(spacing: 4) {
            Image(systemName: icon)
            Text(text)
        }
        .font(.caption)
        .fontWeight(.semibold)
        .foregroundColor(.white)
        .padding(.horizontal, 12)
        .padding(.vertical, 6)
        .background(color)
        .cornerRadius(16)
    }

    private var verifiedBadge: some View {
        HStack(spacing: 4) {
            Image(systemName: "checkmark.seal.fill")
            Text("Verified")
        }
        .font(.caption)
        .fontWeight(.semibold)
        .foregroundColor(.white)
        .padding(.horizontal, 12)
        .padding(.vertical, 6)
        .background(Theme.statusActive)
        .cornerRadius(16)
    }

    private func statusInfo(for status: String) -> (Color, String, String) {
        switch status {
        case "approved":
            return (Theme.statusActive, "checkmark.circle.fill", "Active")
        case "pending":
            return (Theme.statusWarning, "clock.fill", "Pending Approval")
        case "rejected":
            return (Theme.statusError, "xmark.circle.fill", "Rejected")
        case "suspended":
            return (Theme.statusError, "exclamationmark.triangle.fill", "Suspended")
        default:
            return (Theme.textGrey, "questionmark.circle.fill", "Unknown")
        }
    }
}

// MARK: - Stats Overview Card
struct StatsOverviewCard: View {
    let stats: DriverStats?

    var body: some View {
        HStack(spacing: 0) {
            StatItem(
                value: String(format: "%.1f", stats?.rating ?? 5.0),
                label: "Rating",
                icon: "star.fill",
                color: .yellow
            )

            Divider().frame(height: 40)

            StatItem(
                value: "\(stats?.totalDeliveries ?? 0)",
                label: "Deliveries",
                icon: "shippingbox.fill",
                color: Theme.brandRed
            )

            Divider().frame(height: 40)

            StatItem(
                value: "\(Int(stats?.acceptanceRate ?? 100))%",
                label: "Acceptance",
                icon: "checkmark.circle.fill",
                color: Theme.statusActive
            )

            Divider().frame(height: 40)

            StatItem(
                value: "\(Int(stats?.onTimeRate ?? 100))%",
                label: "On Time",
                icon: "clock.fill",
                color: Theme.statusInfo
            )
        }
        .padding(.vertical, 16)
        .background(Theme.cardBackground)
        .cornerRadius(16)
        .shadow(color: .black.opacity(0.05), radius: 8, x: 0, y: 2)
        .padding(.horizontal)
        .padding(.bottom, 16)
    }
}

struct StatItem: View {
    let value: String
    let label: String
    let icon: String
    let color: Color

    var body: some View {
        VStack(spacing: 4) {
            HStack(spacing: 4) {
                Image(systemName: icon)
                    .foregroundColor(color)
                    .font(.caption)
                Text(value)
                    .font(.headline)
                    .fontWeight(.bold)
            }
            Text(label)
                .font(.caption2)
                .foregroundColor(Theme.textSecondary)
        }
        .frame(maxWidth: .infinity)
    }
}

// MARK: - Tab Selector
struct ProfileTabSelector: View {
    @Binding var selectedTab: Int
    let tabs = ["Personal", "Documents", "Earnings", "Settings"]

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(0..<tabs.count, id: \.self) { index in
                    Button(action: { selectedTab = index }) {
                        Text(tabs[index])
                            .font(.subheadline)
                            .fontWeight(selectedTab == index ? .semibold : .regular)
                            .foregroundColor(selectedTab == index ? .white : Theme.textSecondary)
                            .padding(.horizontal, 16)
                            .padding(.vertical, 10)
                            .background(selectedTab == index ? Theme.brandRed : Theme.cardBackground)
                            .cornerRadius(20)
                    }
                }
            }
            .padding(.horizontal)
        }
        .padding(.bottom, 16)
    }
}

// MARK: - Personal Info Section
struct PersonalInfoSection: View {
    @ObservedObject var viewModel: DriverProfileViewModel
    @StateObject private var locationManager = LocationManager.shared

    var body: some View {
        VStack(spacing: 16) {
            // Basic Information
            ProfileCard(title: "Basic Information", icon: "person.fill") {
                VStack(spacing: 12) {
                    ProfileField(
                        label: "Full Name",
                        value: $viewModel.name,
                        isEditing: viewModel.isEditing,
                        icon: "person"
                    )

                    ProfileField(
                        label: "Email",
                        value: $viewModel.email,
                        isEditing: false, // Email can't be changed
                        icon: "envelope"
                    )

                    ProfileField(
                        label: "Phone",
                        value: $viewModel.phone,
                        isEditing: viewModel.isEditing,
                        icon: "phone",
                        keyboardType: .phonePad
                    )

                    if viewModel.isEditing {
                        DatePicker(
                            "Date of Birth",
                            selection: Binding(
                                get: { viewModel.dateOfBirth ?? Date() },
                                set: { viewModel.dateOfBirth = $0 }
                            ),
                            displayedComponents: .date
                        )
                        .padding(.horizontal, 12)
                        .padding(.vertical, 8)
                        .background(Theme.backgroundGrey)
                        .cornerRadius(8)
                    } else if let dob = viewModel.dateOfBirth {
                        HStack {
                            Image(systemName: "calendar")
                                .foregroundColor(Theme.textGrey)
                            Text("Date of Birth")
                                .foregroundColor(Theme.textSecondary)
                            Spacer()
                            Text(dob, style: .date)
                                .foregroundColor(Theme.textPrimary)
                        }
                        .padding(.horizontal, 12)
                        .padding(.vertical, 8)
                    }
                }
            }

            // Address
            ProfileCard(title: "Address", icon: "location.fill") {
                VStack(spacing: 12) {
                    ProfileField(
                        label: "Street Address",
                        value: $viewModel.street,
                        isEditing: viewModel.isEditing,
                        icon: "house"
                    )

                    HStack(spacing: 12) {
                        ProfileField(
                            label: "City",
                            value: $viewModel.city,
                            isEditing: viewModel.isEditing,
                            icon: "building.2"
                        )

                        ProfileField(
                            label: "State",
                            value: $viewModel.state,
                            isEditing: viewModel.isEditing,
                            icon: "map"
                        )
                        .frame(width: 100)
                    }

                    ProfileField(
                        label: "Zip Code",
                        value: $viewModel.zipCode,
                        isEditing: viewModel.isEditing,
                        icon: "number",
                        keyboardType: .numberPad
                    )
                }
            }

            // Current Location Map - Uses live GPS location
            ProfileCard(title: "Current Location", icon: "map.fill") {
                CurrentLocationMapView(
                    latitude: locationManager.currentCoordinate?.latitude ?? viewModel.driver?.currentLatitude ?? 0,
                    longitude: locationManager.currentCoordinate?.longitude ?? viewModel.driver?.currentLongitude ?? 0
                )
                .frame(height: 200)
                .cornerRadius(12)
            }

            // Save Button
            if viewModel.isEditing {
                Button(action: { viewModel.saveProfile() }) {
                    if viewModel.isLoading {
                        ProgressView()
                            .tint(.white)
                    } else {
                        Text("Save Changes")
                            .fontWeight(.semibold)
                    }
                }
                .frame(maxWidth: .infinity)
                .padding()
                .background(Theme.brandRed)
                .foregroundColor(.white)
                .cornerRadius(12)
                .padding(.horizontal)
                .disabled(viewModel.isLoading)
            }
        }
        .padding(.bottom, 24)
    }
}

// MARK: - Vehicle & Documents Section
struct VehicleDocumentsSection: View {
    @ObservedObject var viewModel: DriverProfileViewModel

    var body: some View {
        VStack(spacing: 16) {
            // Document Verification Status (from P2P API)
            DocumentVerificationCard(viewModel: viewModel)

            // Driver's License
            ProfileCard(title: "Driver's License", icon: "creditcard.fill") {
                VStack(spacing: 12) {
                    ProfileField(
                        label: "License Number",
                        value: $viewModel.licenseNumber,
                        isEditing: viewModel.isEditing,
                        icon: "number"
                    )

                    HStack(spacing: 12) {
                        ProfileField(
                            label: "State",
                            value: $viewModel.licenseState,
                            isEditing: viewModel.isEditing,
                            icon: "map"
                        )

                        if viewModel.isEditing {
                            VStack(alignment: .leading, spacing: 4) {
                                Text("Class")
                                    .font(.caption)
                                    .foregroundColor(Theme.textSecondary)
                                Picker("Class", selection: $viewModel.licenseClass) {
                                    ForEach(["A", "B", "C", "D", "M"], id: \.self) { cls in
                                        Text(cls).tag(cls)
                                    }
                                }
                                .pickerStyle(.menu)
                                .padding(.horizontal, 12)
                                .padding(.vertical, 8)
                                .background(Theme.backgroundGrey)
                                .cornerRadius(8)
                            }
                        }
                    }

                    if viewModel.isEditing {
                        DatePicker(
                            "Expiration Date",
                            selection: Binding(
                                get: { viewModel.licenseExpiration ?? Date() },
                                set: { viewModel.licenseExpiration = $0 }
                            ),
                            displayedComponents: .date
                        )
                        .padding(.horizontal, 12)
                        .padding(.vertical, 8)
                        .background(Theme.backgroundGrey)
                        .cornerRadius(8)
                    }

                    // License Images
                    DocumentUploadSection(
                        title: "License Front",
                        imageUrl: viewModel.licenseFrontUrl,
                        isEditing: viewModel.isEditing,
                        onUpload: { data in
                            Task { await viewModel.uploadDocument(data, type: "license_front") }
                        }
                    )

                    DocumentUploadSection(
                        title: "License Back",
                        imageUrl: viewModel.licenseBackUrl,
                        isEditing: viewModel.isEditing,
                        onUpload: { data in
                            Task { await viewModel.uploadDocument(data, type: "license_back") }
                        }
                    )

                    // Verification Status
                    VerificationStatusBadge(
                        isVerified: viewModel.driver?.driversLicense?.isVerified ?? false
                    )
                }
            }

            // Vehicle Information
            ProfileCard(title: "Vehicle Information", icon: "car.fill") {
                VStack(spacing: 12) {
                    HStack(spacing: 12) {
                        ProfileField(
                            label: "Make",
                            value: $viewModel.vehicleMake,
                            isEditing: viewModel.isEditing,
                            icon: "car"
                        )

                        ProfileField(
                            label: "Model",
                            value: $viewModel.vehicleModel,
                            isEditing: viewModel.isEditing,
                            icon: "car.side"
                        )
                    }

                    HStack(spacing: 12) {
                        if viewModel.isEditing {
                            VStack(alignment: .leading, spacing: 4) {
                                Text("Year")
                                    .font(.caption)
                                    .foregroundColor(Theme.textSecondary)
                                Picker("Year", selection: $viewModel.vehicleYear) {
                                    ForEach((2000...Calendar.current.component(.year, from: Date())).reversed(), id: \.self) { year in
                                        Text(String(year)).tag(year)
                                    }
                                }
                                .pickerStyle(.menu)
                                .padding(.horizontal, 12)
                                .padding(.vertical, 8)
                                .background(Theme.backgroundGrey)
                                .cornerRadius(8)
                            }
                        } else {
                            ProfileField(
                                label: "Year",
                                value: .constant(String(viewModel.vehicleYear)),
                                isEditing: false,
                                icon: "calendar"
                            )
                        }

                        ProfileField(
                            label: "Color",
                            value: $viewModel.vehicleColor,
                            isEditing: viewModel.isEditing,
                            icon: "paintpalette"
                        )
                    }

                    HStack(spacing: 12) {
                        ProfileField(
                            label: "License Plate",
                            value: $viewModel.licensePlate,
                            isEditing: viewModel.isEditing,
                            icon: "rectangle"
                        )

                        ProfileField(
                            label: "State",
                            value: $viewModel.plateState,
                            isEditing: viewModel.isEditing,
                            icon: "map"
                        )
                        .frame(width: 100)
                    }

                    if viewModel.isEditing {
                        VStack(alignment: .leading, spacing: 4) {
                            Text("Vehicle Type")
                                .font(.caption)
                                .foregroundColor(Theme.textSecondary)
                            Picker("Vehicle Type", selection: $viewModel.vehicleType) {
                                ForEach(["Sedan", "SUV", "Truck", "Van", "Motorcycle", "Bicycle", "Scooter"], id: \.self) { type in
                                    Text(type).tag(type)
                                }
                            }
                            .pickerStyle(.segmented)
                        }
                    }

                    // Vehicle Photos
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Vehicle Photos")
                            .font(.caption)
                            .foregroundColor(Theme.textSecondary)

                        HStack(spacing: 12) {
                            VehiclePhotoUpload(
                                title: "Front",
                                imageUrl: viewModel.vehicleFrontUrl,
                                isEditing: viewModel.isEditing,
                                onUpload: { data in
                                    Task { await viewModel.uploadDocument(data, type: "vehicle_front") }
                                }
                            )

                            VehiclePhotoUpload(
                                title: "Side",
                                imageUrl: viewModel.vehicleSideUrl,
                                isEditing: viewModel.isEditing,
                                onUpload: { data in
                                    Task { await viewModel.uploadDocument(data, type: "vehicle_side") }
                                }
                            )

                            VehiclePhotoUpload(
                                title: "Back",
                                imageUrl: viewModel.vehicleBackUrl,
                                isEditing: viewModel.isEditing,
                                onUpload: { data in
                                    Task { await viewModel.uploadDocument(data, type: "vehicle_back") }
                                }
                            )
                        }
                    }
                }
            }

            // Insurance
            ProfileCard(title: "Insurance", icon: "shield.fill") {
                VStack(spacing: 12) {
                    ProfileField(
                        label: "Insurance Provider",
                        value: $viewModel.insuranceProvider,
                        isEditing: viewModel.isEditing,
                        icon: "building.columns"
                    )

                    ProfileField(
                        label: "Policy Number",
                        value: $viewModel.insurancePolicyNumber,
                        isEditing: viewModel.isEditing,
                        icon: "number"
                    )

                    if viewModel.isEditing {
                        DatePicker(
                            "Expiration Date",
                            selection: Binding(
                                get: { viewModel.insuranceExpiration ?? Date() },
                                set: { viewModel.insuranceExpiration = $0 }
                            ),
                            displayedComponents: .date
                        )
                        .padding(.horizontal, 12)
                        .padding(.vertical, 8)
                        .background(Theme.backgroundGrey)
                        .cornerRadius(8)
                    }

                    DocumentUploadSection(
                        title: "Insurance Card",
                        imageUrl: viewModel.insuranceCardUrl,
                        isEditing: viewModel.isEditing,
                        onUpload: { data in
                            Task { await viewModel.uploadDocument(data, type: "insurance_card") }
                        }
                    )

                    VerificationStatusBadge(
                        isVerified: viewModel.driver?.insurance?.isVerified ?? false
                    )
                }
            }

            // Save Button
            if viewModel.isEditing {
                Button(action: { viewModel.saveProfile() }) {
                    if viewModel.isLoading {
                        ProgressView()
                            .tint(.white)
                    } else {
                        Text("Save Changes")
                            .fontWeight(.semibold)
                    }
                }
                .frame(maxWidth: .infinity)
                .padding()
                .background(Theme.brandRed)
                .foregroundColor(.white)
                .cornerRadius(12)
                .padding(.horizontal)
                .disabled(viewModel.isLoading)
            }
        }
        .padding(.bottom, 24)
    }
}

// MARK: - Earnings & Payment Section
struct EarningsPaymentSection: View {
    @ObservedObject var viewModel: DriverProfileViewModel

    var body: some View {
        VStack(spacing: 16) {
            // Earnings Summary
            ProfileCard(title: "Earnings Summary", icon: "dollarsign.circle.fill") {
                VStack(spacing: 16) {
                    HStack {
                        EarningsStat(
                            title: "This Week",
                            amount: viewModel.driver?.stats?.weeklyEarnings ?? 0.0
                        )

                        Divider().frame(height: 50)

                        EarningsStat(
                            title: "Total Earnings",
                            amount: viewModel.driver?.stats?.totalEarnings ?? 0.0
                        )
                    }

                    Divider()

                    HStack {
                        VStack(alignment: .leading, spacing: 4) {
                            Text("Weekly Deliveries")
                                .font(.caption)
                                .foregroundColor(Theme.textSecondary)
                            Text("\(viewModel.driver?.stats?.weeklyDeliveries ?? 0)")
                                .font(.title3)
                                .fontWeight(.bold)
                        }

                        Spacer()

                        VStack(alignment: .trailing, spacing: 4) {
                            Text("Weekly Hours")
                                .font(.caption)
                                .foregroundColor(Theme.textSecondary)
                            Text(String(format: "%.1f hrs", viewModel.driver?.stats?.weeklyHours ?? 0.0))
                                .font(.title3)
                                .fontWeight(.bold)
                        }
                    }
                }
            }

            // Bank Account
            ProfileCard(title: "Bank Account", icon: "banknote.fill") {
                VStack(spacing: 12) {
                    ProfileField(
                        label: "Bank Name",
                        value: $viewModel.bankName,
                        isEditing: viewModel.isEditing,
                        icon: "building.columns"
                    )

                    ProfileField(
                        label: "Account Holder Name",
                        value: $viewModel.accountHolderName,
                        isEditing: viewModel.isEditing,
                        icon: "person"
                    )

                    if viewModel.isEditing {
                        HStack(spacing: 12) {
                            VStack(alignment: .leading, spacing: 4) {
                                Text("Account Type")
                                    .font(.caption)
                                    .foregroundColor(Theme.textSecondary)
                                Picker("Account Type", selection: $viewModel.accountType) {
                                    Text("Checking").tag("checking")
                                    Text("Savings").tag("savings")
                                }
                                .pickerStyle(.segmented)
                            }
                        }

                        ProfileField(
                            label: "Routing Number",
                            value: $viewModel.routingNumber,
                            isEditing: viewModel.isEditing,
                            icon: "number",
                            keyboardType: .numberPad
                        )

                        ProfileField(
                            label: "Account Number",
                            value: $viewModel.accountNumber,
                            isEditing: viewModel.isEditing,
                            icon: "creditcard",
                            keyboardType: .numberPad,
                            isSecure: true
                        )
                    } else {
                        HStack {
                            Image(systemName: "creditcard")
                                .foregroundColor(Theme.textGrey)
                            Text("Account")
                                .foregroundColor(Theme.textSecondary)
                            Spacer()
                            Text("****\(viewModel.driver?.bankAccount?.accountNumberLast4 ?? "****")")
                                .foregroundColor(Theme.textPrimary)
                        }
                        .padding(.horizontal, 12)
                        .padding(.vertical, 8)
                    }

                    VerificationStatusBadge(
                        isVerified: viewModel.driver?.bankAccount?.isVerified ?? false
                    )
                }
            }

            // Payout History Link
            NavigationLink(destination: PayoutHistoryView()) {
                HStack {
                    Image(systemName: "clock.arrow.circlepath")
                        .foregroundColor(Theme.brandRed)
                    Text("View Payout History")
                        .foregroundColor(Theme.textPrimary)
                    Spacer()
                    Image(systemName: "chevron.right")
                        .foregroundColor(Theme.textGrey)
                }
                .padding()
                .background(Theme.cardBackground)
                .cornerRadius(12)
                .shadow(color: .black.opacity(0.05), radius: 4, x: 0, y: 2)
            }
            .padding(.horizontal)

            // Save Button
            if viewModel.isEditing {
                Button(action: { viewModel.saveProfile() }) {
                    if viewModel.isLoading {
                        ProgressView()
                            .tint(.white)
                    } else {
                        Text("Save Changes")
                            .fontWeight(.semibold)
                    }
                }
                .frame(maxWidth: .infinity)
                .padding()
                .background(Theme.brandRed)
                .foregroundColor(.white)
                .cornerRadius(12)
                .padding(.horizontal)
                .disabled(viewModel.isLoading)
            }
        }
        .padding(.bottom, 24)
    }
}

struct EarningsStat: View {
    let title: String
    let amount: Double

    var body: some View {
        VStack(spacing: 4) {
            Text(title)
                .font(.caption)
                .foregroundColor(Theme.textSecondary)
            Text("$\(String(format: "%.2f", amount))")
                .font(.title2)
                .fontWeight(.bold)
                .foregroundColor(Theme.statusActive)
        }
        .frame(maxWidth: .infinity)
    }
}

// MARK: - Settings Section
struct SettingsSection: View {
    @ObservedObject var viewModel: DriverProfileViewModel
    @EnvironmentObject var authManager: AuthManager
    @State private var showLogoutAlert = false
    @State private var showDeleteAccountAlert = false
    @State private var showDeleteConfirmation = false
    @State private var isDeletingAccount = false
    @State private var deleteError: String?

    var body: some View {
        VStack(spacing: 16) {
            // Preferences
            ProfileCard(title: "Preferences", icon: "gearshape.fill") {
                VStack(spacing: 16) {
                    Toggle(isOn: $viewModel.notificationsEnabled) {
                        HStack {
                            Image(systemName: "bell.fill")
                                .foregroundColor(Theme.brandRed)
                            Text("Push Notifications")
                        }
                    }

                    Toggle(isOn: $viewModel.soundEnabled) {
                        HStack {
                            Image(systemName: "speaker.wave.2.fill")
                                .foregroundColor(Theme.brandRed)
                            Text("Sound Effects")
                        }
                    }

                    Toggle(isOn: $viewModel.acceptCashOrders) {
                        HStack {
                            Image(systemName: "banknote.fill")
                                .foregroundColor(Theme.brandRed)
                            Text("Accept Cash Orders")
                        }
                    }

                    Divider()

                    VStack(alignment: .leading, spacing: 8) {
                        Text("Max Delivery Distance")
                            .font(.subheadline)
                            .foregroundColor(Theme.textSecondary)

                        HStack {
                            Slider(value: $viewModel.maxDeliveryDistance, in: 1...25, step: 1)
                                .tint(Theme.brandRed)
                            Text("\(Int(viewModel.maxDeliveryDistance)) mi")
                                .fontWeight(.semibold)
                                .frame(width: 50)
                        }
                    }
                }
            }

            // Support
            ProfileCard(title: "Support", icon: "questionmark.circle.fill") {
                VStack(spacing: 0) {
                    if let termsURL = URL(string: AppConstants.termsOfServiceURL) {
                        Link(destination: termsURL) {
                            SettingsRow(icon: "doc.text.fill", title: "Terms of Service", color: Theme.statusInfo)
                        }
                        Divider()
                    }
                    if let privacyURL = URL(string: AppConstants.privacyPolicyURL) {
                        Link(destination: privacyURL) {
                            SettingsRow(icon: "hand.raised.fill", title: "Privacy Policy", color: Theme.statusInfo)
                        }
                        Divider()
                    }
                    if let supportURL = URL(string: "mailto:\(AppConfig.shared.supportEmail)") {
                        Link(destination: supportURL) {
                            SettingsRow(icon: "envelope.fill", title: "Contact Support", color: Theme.statusActive)
                        }
                        Divider()
                    }
                    if let rateURL = URL(string: "https://apps.apple.com/app/id\(Bundle.main.bundleIdentifier ?? "")") {
                        Link(destination: rateURL) {
                            SettingsRow(icon: "star.fill", title: "Rate the App", color: .yellow)
                        }
                    }
                }
            }

            // Logout
            Button(action: { showLogoutAlert = true }) {
                HStack {
                    Image(systemName: "rectangle.portrait.and.arrow.right")
                    Text("Logout")
                }
                .foregroundColor(.red)
                .frame(maxWidth: .infinity)
                .padding()
                .background(Theme.cardBackground)
                .cornerRadius(12)
                .shadow(color: .black.opacity(0.05), radius: 4, x: 0, y: 2)
            }
            .padding(.horizontal)
            .alert("Logout", isPresented: $showLogoutAlert) {
                Button("Cancel", role: .cancel) { }
                Button("Logout", role: .destructive) {
                    performLogout()
                }
            } message: {
                Text("Are you sure you want to logout?")
            }

            // Delete Account (Apple App Store Requirement)
            Button(action: { showDeleteAccountAlert = true }) {
                HStack {
                    Image(systemName: "trash.fill")
                    Text("Delete Account")
                }
                .foregroundColor(.red)
                .frame(maxWidth: .infinity)
                .padding()
                .background(Color.red.opacity(0.1))
                .cornerRadius(12)
            }
            .padding(.horizontal)
            .disabled(isDeletingAccount)
            .alert("Delete Account", isPresented: $showDeleteAccountAlert) {
                Button("Cancel", role: .cancel) { }
                Button("Delete", role: .destructive) {
                    showDeleteConfirmation = true
                }
            } message: {
                Text("Are you sure you want to delete your account? This action cannot be undone. All your data, earnings history, and profile information will be permanently removed.")
            }
            .alert("Final Confirmation", isPresented: $showDeleteConfirmation) {
                Button("Cancel", role: .cancel) { }
                Button("Permanently Delete", role: .destructive) {
                    performAccountDeletion()
                }
            } message: {
                Text("This is your final warning. Your account and all associated data will be permanently deleted. This cannot be reversed.")
            }
            .alert("Error", isPresented: .constant(deleteError != nil)) {
                Button("OK") { deleteError = nil }
            } message: {
                Text(deleteError ?? "")
            }

            // App Version
            Text("Version \(AppConfig.shared.appVersion)")
                .font(.caption)
                .foregroundColor(Theme.textGrey)
                .padding(.top, 8)
        }
        .padding(.bottom, 24)
    }

    private func performLogout() {
        // Clear P2P session data first
        authManager.logout()

        // Also sign out from Firebase if logged in there
        try? Auth.auth().signOut()

        // Clear any cached data
        UserDefaults.standard.removeObject(forKey: UserDefaultsKeys.driverTermsAccepted)
        UserDefaults.standard.removeObject(forKey: UserDefaultsKeys.driverFCMToken)
        UserDefaults.standard.synchronize()
    }

    private func performAccountDeletion() {
        isDeletingAccount = true

        // Get driver ID from P2P session
        let driverId = UserDefaults.standard.integer(forKey: "p2p_driver_id")

        guard driverId > 0 else {
            deleteError = "Unable to identify account. Please try logging out and back in."
            isDeletingAccount = false
            return
        }

        // Call backend to delete account
        P2PAPIService.shared.deleteDriverAccount(driverId: driverId) { result in
            DispatchQueue.main.async {
                self.isDeletingAccount = false

                switch result {
                case .success:
                    // Clear all local data
                    self.clearAllLocalData()
                    // Logout
                    self.authManager.logout()
                    try? Auth.auth().signOut()

                case .failure(let error):
                    self.deleteError = "Failed to delete account: \(error.localizedDescription)"
                }
            }
        }
    }

    private func clearAllLocalData() {
        // Remove all driver-related UserDefaults
        let keysToRemove = [
            "p2p_driver_id",
            "p2p_driver_email",
            "p2p_driver_name",
            "p2p_driver_phone",
            "p2p_driver_terms_accepted",
            "p2p_driver_terms_accepted_at",
            UserDefaultsKeys.driverTermsAccepted,
            UserDefaultsKeys.driverTermsVersion,
            UserDefaultsKeys.driverFCMToken
        ]

        for key in keysToRemove {
            UserDefaults.standard.removeObject(forKey: key)
        }
        UserDefaults.standard.synchronize()
    }
}

struct SettingsRow: View {
    let icon: String
    let title: String
    let color: Color

    var body: some View {
        HStack {
            Image(systemName: icon)
                .foregroundColor(color)
                .frame(width: 24)
            Text(title)
                .foregroundColor(Theme.textPrimary)
            Spacer()
            Image(systemName: "chevron.right")
                .foregroundColor(Theme.textGrey)
                .font(.caption)
        }
        .padding(.vertical, 12)
    }
}

// MARK: - Reusable Components
struct ProfileCard<Content: View>: View {
    let title: String
    let icon: String
    @ViewBuilder let content: Content

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack {
                Image(systemName: icon)
                    .foregroundColor(Theme.brandRed)
                Text(title)
                    .font(.headline)
                    .foregroundColor(Theme.textPrimary)
            }

            content
        }
        .padding()
        .background(Theme.cardBackground)
        .cornerRadius(16)
        .shadow(color: .black.opacity(0.05), radius: 8, x: 0, y: 2)
        .padding(.horizontal)
    }
}

struct ProfileField: View {
    let label: String
    @Binding var value: String
    let isEditing: Bool
    let icon: String
    var keyboardType: UIKeyboardType = .default
    var isSecure: Bool = false

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label)
                .font(.caption)
                .foregroundColor(Theme.textSecondary)

            HStack {
                Image(systemName: icon)
                    .foregroundColor(Theme.textGrey)
                    .frame(width: 20)

                if isEditing {
                    if isSecure {
                        SecureField(label, text: $value)
                    } else {
                        TextField(label, text: $value)
                            .keyboardType(keyboardType)
                    }
                } else {
                    Text(value.isEmpty ? "-" : value)
                        .foregroundColor(value.isEmpty ? Theme.textGrey : Theme.textPrimary)
                    Spacer()
                }
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 10)
            .background(isEditing ? Theme.backgroundGrey : Color.clear)
            .cornerRadius(8)
        }
    }
}

struct DocumentUploadSection: View {
    let title: String
    let imageUrl: String?
    let isEditing: Bool
    let onUpload: (Data) -> Void

    @State private var selectedItem: PhotosPickerItem?

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title)
                .font(.caption)
                .foregroundColor(Theme.textSecondary)

            if let imageUrl = imageUrl, !imageUrl.isEmpty {
                AsyncImage(url: URL(string: imageUrl)) { image in
                    image
                        .resizable()
                        .scaledToFit()
                } placeholder: {
                    ProgressView()
                }
                .frame(height: 120)
                .frame(maxWidth: .infinity)
                .background(Theme.backgroundGrey)
                .cornerRadius(8)
            } else if isEditing {
                PhotosPicker(selection: $selectedItem, matching: .images) {
                    HStack {
                        Image(systemName: "camera.fill")
                        Text("Upload \(title)")
                    }
                    .foregroundColor(Theme.brandRed)
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Theme.backgroundGrey)
                    .cornerRadius(8)
                    .overlay(
                        RoundedRectangle(cornerRadius: 8)
                            .stroke(style: StrokeStyle(lineWidth: 1, dash: [5]))
                            .foregroundColor(Theme.brandRed.opacity(0.5))
                    )
                }
                .onChange(of: selectedItem) { _, newItem in
                    Task {
                        if let data = try? await newItem?.loadTransferable(type: Data.self) {
                            onUpload(data)
                        }
                    }
                }
            } else {
                HStack {
                    Image(systemName: "doc.text")
                        .foregroundColor(Theme.textGrey)
                    Text("Not uploaded")
                        .foregroundColor(Theme.textGrey)
                }
                .frame(maxWidth: .infinity)
                .padding()
                .background(Theme.backgroundGrey)
                .cornerRadius(8)
            }
        }
    }
}

struct VehiclePhotoUpload: View {
    let title: String
    let imageUrl: String?
    let isEditing: Bool
    let onUpload: (Data) -> Void

    @State private var selectedItem: PhotosPickerItem?

    var body: some View {
        VStack(spacing: 4) {
            if let imageUrl = imageUrl, !imageUrl.isEmpty {
                AsyncImage(url: URL(string: imageUrl)) { image in
                    image
                        .resizable()
                        .scaledToFill()
                } placeholder: {
                    ProgressView()
                }
                .frame(width: 80, height: 60)
                .clipShape(RoundedRectangle(cornerRadius: 8))
            } else if isEditing {
                PhotosPicker(selection: $selectedItem, matching: .images) {
                    Image(systemName: "camera.fill")
                        .foregroundColor(Theme.brandRed)
                        .frame(width: 80, height: 60)
                        .background(Theme.backgroundGrey)
                        .cornerRadius(8)
                }
                .onChange(of: selectedItem) { _, newItem in
                    Task {
                        if let data = try? await newItem?.loadTransferable(type: Data.self) {
                            onUpload(data)
                        }
                    }
                }
            } else {
                Image(systemName: "car")
                    .foregroundColor(Theme.textGrey)
                    .frame(width: 80, height: 60)
                    .background(Theme.backgroundGrey)
                    .cornerRadius(8)
            }

            Text(title)
                .font(.caption2)
                .foregroundColor(Theme.textSecondary)
        }
    }
}

struct VerificationStatusBadge: View {
    let isVerified: Bool

    var body: some View {
        HStack {
            Image(systemName: isVerified ? "checkmark.seal.fill" : "clock.fill")
            Text(isVerified ? "Verified" : "Pending Verification")
        }
        .font(.caption)
        .foregroundColor(isVerified ? Theme.statusActive : Theme.statusWarning)
        .padding(.horizontal, 12)
        .padding(.vertical, 6)
        .background((isVerified ? Theme.statusActive : Theme.statusWarning).opacity(0.1))
        .cornerRadius(8)
    }
}

// MARK: - Document Verification Status Card (P2P API)
struct DocumentVerificationCard: View {
    @ObservedObject var viewModel: DriverProfileViewModel

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack {
                Image(systemName: "doc.text.magnifyingglass")
                    .foregroundColor(Theme.brandRed)
                Text("Document Verification Status")
                    .font(.headline)
                    .foregroundColor(Theme.textPrimary)
                Spacer()
                if viewModel.isLoadingDocuments {
                    ProgressView()
                        .scaleEffect(0.8)
                }
            }

            if let response = viewModel.documentsResponse {
                // Overall status
                HStack {
                    if response.allVerified {
                        Image(systemName: "checkmark.shield.fill")
                            .foregroundColor(Theme.statusActive)
                        Text("All Documents Verified")
                            .font(.subheadline)
                            .fontWeight(.semibold)
                            .foregroundColor(Theme.statusActive)
                    } else {
                        Image(systemName: "exclamationmark.shield.fill")
                            .foregroundColor(Theme.statusWarning)
                        Text("\(response.documents.filter { $0.verified }.count)/\(response.count) Documents Verified")
                            .font(.subheadline)
                            .fontWeight(.semibold)
                            .foregroundColor(Theme.statusWarning)
                    }
                    Spacer()
                }
                .padding()
                .background((response.allVerified ? Theme.statusActive : Theme.statusWarning).opacity(0.1))
                .cornerRadius(8)

                // Individual document statuses
                VStack(spacing: 8) {
                    ForEach(response.documents) { doc in
                        DocumentStatusRow(document: doc)
                    }
                }

                if response.documents.isEmpty {
                    Text("No documents uploaded yet")
                        .font(.subheadline)
                        .foregroundColor(Theme.textSecondary)
                        .padding()
                }
            } else if !viewModel.isLoadingDocuments {
                VStack(spacing: 8) {
                    Image(systemName: "doc.badge.plus")
                        .font(.title2)
                        .foregroundColor(Theme.textGrey)
                    Text("Upload documents to get started")
                        .font(.subheadline)
                        .foregroundColor(Theme.textSecondary)
                }
                .frame(maxWidth: .infinity)
                .padding()
            }
        }
        .padding()
        .background(Theme.cardBackground)
        .cornerRadius(16)
        .shadow(color: .black.opacity(0.05), radius: 8, x: 0, y: 2)
        .padding(.horizontal)
    }
}

struct DocumentStatusRow: View {
    let document: DriverDocument

    private var statusColor: Color {
        switch document.status.lowercased() {
        case "verified", "approved":
            return Theme.statusActive
        case "pending", "pending_review", "under_review":
            return Theme.statusWarning
        case "rejected", "expired":
            return Theme.statusError
        default:
            return Theme.textGrey
        }
    }

    private var statusIcon: String {
        switch document.status.lowercased() {
        case "verified", "approved":
            return "checkmark.circle.fill"
        case "pending", "pending_review", "under_review":
            return "clock.fill"
        case "rejected":
            return "xmark.circle.fill"
        case "expired":
            return "exclamationmark.triangle.fill"
        default:
            return "questionmark.circle"
        }
    }

    private var displayName: String {
        DriverDocumentType(rawValue: document.documentType)?.displayName ?? document.documentType.replacingOccurrences(of: "_", with: " ").capitalized
    }

    var body: some View {
        HStack(spacing: 12) {
            // Document type icon
            Image(systemName: documentIcon)
                .font(.system(size: 18))
                .foregroundColor(Theme.brandRed)
                .frame(width: 28)

            // Document name and upload date
            VStack(alignment: .leading, spacing: 2) {
                Text(displayName)
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .foregroundColor(Theme.textPrimary)

                if let uploadDate = document.uploadDate {
                    Text("Uploaded \(formatDate(uploadDate))")
                        .font(.caption2)
                        .foregroundColor(Theme.textSecondary)
                }
            }

            Spacer()

            // Status badge
            HStack(spacing: 4) {
                Image(systemName: statusIcon)
                    .font(.caption)
                Text(document.status.capitalized.replacingOccurrences(of: "_", with: " "))
                    .font(.caption)
                    .fontWeight(.medium)
            }
            .foregroundColor(statusColor)
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(statusColor.opacity(0.1))
            .cornerRadius(6)
        }
        .padding(.vertical, 8)
        .padding(.horizontal, 12)
        .background(Theme.backgroundGrey)
        .cornerRadius(8)
    }

    private var documentIcon: String {
        switch document.documentType {
        case "license_front", "license_back", "drivers_license":
            return "car.fill"
        case "insurance", "insurance_card":
            return "shield.fill"
        case "vehicle_front", "vehicle_side", "vehicle_back":
            return "camera.fill"
        case "profile_photo":
            return "person.fill"
        default:
            return "doc.fill"
        }
    }

    private func formatDate(_ dateString: String) -> String {
        let formatter = ISO8601DateFormatter()
        if let date = formatter.date(from: dateString) {
            let displayFormatter = DateFormatter()
            displayFormatter.dateStyle = .medium
            return displayFormatter.string(from: date)
        }
        return dateString
    }
}

// MARK: - Current Location Map View
struct CurrentLocationMapView: View {
    let latitude: Double
    let longitude: Double

    private var driverLocation: CLLocationCoordinate2D {
        CLLocationCoordinate2D(
            latitude: latitude != 0 ? latitude : MapConfig.defaultLatitude,
            longitude: longitude != 0 ? longitude : MapConfig.defaultLongitude
        )
    }

    @State private var position: MapCameraPosition

    init(latitude: Double, longitude: Double) {
        self.latitude = latitude
        self.longitude = longitude
        let center = CLLocationCoordinate2D(
            latitude: latitude != 0 ? latitude : MapConfig.defaultLatitude,
            longitude: longitude != 0 ? longitude : MapConfig.defaultLongitude
        )
        _position = State(initialValue: .region(MKCoordinateRegion(
            center: center,
            span: MKCoordinateSpan(latitudeDelta: MapConfig.detailedZoomSpan, longitudeDelta: MapConfig.detailedZoomSpan)
        )))
    }

    var body: some View {
        Map(position: $position) {
            Annotation("Your Location", coordinate: driverLocation) {
                VStack(spacing: 0) {
                    Image(systemName: "car.fill")
                        .foregroundColor(.white)
                        .padding(8)
                        .background(Theme.brandRed)
                        .clipShape(Circle())
                        .shadow(radius: 3)

                    Image(systemName: "arrowtriangle.down.fill")
                        .foregroundColor(Theme.brandRed)
                        .font(.system(size: 10))
                        .offset(y: -3)
                }
            }
        }
        .mapStyle(.standard)
    }
}

// MARK: - Payout History View
struct PayoutHistoryView: View {
    @StateObject private var earningsViewModel = EarningsViewModel()

    var body: some View {
        List {
            // Weekly Summary Section
            Section(header: Text("This Week")) {
                HStack {
                    VStack(alignment: .leading) {
                        Text("Week Total")
                            .fontWeight(.semibold)
                        Text("\(earningsViewModel.weekDeliveries) deliveries")
                            .font(.caption)
                            .foregroundColor(Theme.textSecondary)
                    }
                    Spacer()
                    Text(String(format: "$%.2f", earningsViewModel.weekEarnings))
                        .fontWeight(.bold)
                        .foregroundColor(Theme.statusActive)
                }
                .padding(.vertical, 4)
            }

            // Daily Breakdown Section
            Section(header: Text("Daily Breakdown")) {
                if earningsViewModel.dailyEarnings.isEmpty {
                    Text("No earnings data yet")
                        .foregroundColor(Theme.textSecondary)
                        .italic()
                } else {
                    ForEach(earningsViewModel.dailyEarnings) { daily in
                        HStack {
                            VStack(alignment: .leading) {
                                Text(daily.day)
                                    .fontWeight(.semibold)
                            }
                            Spacer()
                            Text(String(format: "$%.2f", daily.amount))
                                .fontWeight(.bold)
                                .foregroundColor(daily.amount > 0 ? Theme.statusActive : Theme.textSecondary)
                        }
                        .padding(.vertical, 4)
                    }
                }
            }

            // Monthly Summary Section
            Section(header: Text("This Month")) {
                HStack {
                    VStack(alignment: .leading) {
                        Text("Month Total")
                            .fontWeight(.semibold)
                        Text("\(earningsViewModel.monthDeliveries) deliveries")
                            .font(.caption)
                            .foregroundColor(Theme.textSecondary)
                    }
                    Spacer()
                    Text(String(format: "$%.2f", earningsViewModel.monthEarnings))
                        .fontWeight(.bold)
                        .foregroundColor(Theme.statusActive)
                }
                .padding(.vertical, 4)
            }
        }
        .navigationTitle("Payout History")
        .onAppear {
            earningsViewModel.fetchEarnings()
        }
    }
}

// MARK: - Expiration Alerts Banner

struct ExpirationAlertsBanner: View {
    let alerts: [DriverProfileViewModel.ExpirationAlert]
    @State private var isExpanded = false

    var body: some View {
        VStack(spacing: 0) {
            // Header
            Button {
                withAnimation(.spring(response: 0.3)) {
                    isExpanded.toggle()
                }
            } label: {
                HStack(spacing: 12) {
                    // Warning Icon
                    ZStack {
                        Circle()
                            .fill(urgentColor.opacity(0.2))
                            .frame(width: 40, height: 40)
                        Image(systemName: hasExpired ? "exclamationmark.triangle.fill" : "clock.badge.exclamationmark.fill")
                            .font(.system(size: 18))
                            .foregroundColor(urgentColor)
                    }

                    // Text
                    VStack(alignment: .leading, spacing: 2) {
                        Text(hasExpired ? "Document(s) Expired" : "Documents Expiring Soon")
                            .font(.subheadline)
                            .fontWeight(.semibold)
                            .foregroundColor(.primary)
                        Text("\(alerts.count) item\(alerts.count == 1 ? "" : "s") need\(alerts.count == 1 ? "s" : "") attention")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }

                    Spacer()

                    // Expand Arrow
                    Image(systemName: isExpanded ? "chevron.up" : "chevron.down")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                .padding()
                .background(urgentColor.opacity(0.1))
            }
            .buttonStyle(.plain)

            // Expanded Content
            if isExpanded {
                VStack(spacing: 8) {
                    ForEach(alerts) { alert in
                        ExpirationAlertRow(alert: alert)
                    }
                }
                .padding(.horizontal)
                .padding(.bottom, 12)
                .background(urgentColor.opacity(0.05))
            }
        }
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(urgentColor.opacity(0.3), lineWidth: 1)
        )
        .padding(.horizontal)
        .padding(.top, 8)
    }

    private var hasExpired: Bool {
        alerts.contains { $0.isExpired }
    }

    private var urgentColor: Color {
        if hasExpired { return .red }
        if alerts.contains(where: { $0.isUrgent }) { return .orange }
        return .yellow
    }
}

struct ExpirationAlertRow: View {
    let alert: DriverProfileViewModel.ExpirationAlert

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: alert.icon)
                .font(.system(size: 16))
                .foregroundColor(alert.color)
                .frame(width: 24)

            Text(alert.message)
                .font(.subheadline)
                .foregroundColor(.primary)

            Spacer()

            if alert.isExpired {
                Text("EXPIRED")
                    .font(.caption2)
                    .fontWeight(.bold)
                    .foregroundColor(.white)
                    .padding(.horizontal, 6)
                    .padding(.vertical, 2)
                    .background(Color.red)
                    .cornerRadius(4)
            } else {
                Text(formattedDate)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
        }
        .padding(.vertical, 8)
        .padding(.horizontal, 12)
        .background(Color(.systemBackground))
        .cornerRadius(8)
    }

    private var formattedDate: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "MMM d, yyyy"
        return formatter.string(from: alert.expirationDate)
    }
}

#Preview {
    DriverProfileView()
}
