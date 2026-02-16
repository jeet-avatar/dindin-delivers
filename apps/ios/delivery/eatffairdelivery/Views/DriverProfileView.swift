import SwiftUI
import FirebaseAuth
import FirebaseFirestore
import FirebaseStorage
import PhotosUI
import MapKit
import EatFairShared
import SafariServices

// MARK: - Safari View for Persona Verification
struct SafariView: UIViewControllerRepresentable {
    let url: URL

    func makeUIViewController(context: Context) -> SFSafariViewController {
        return SFSafariViewController(url: url)
    }

    func updateUIViewController(_ uiViewController: SFSafariViewController, context: Context) {}
}

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
                    .accessibilityLabel(viewModel.isEditing ? "Done editing profile" : "Edit profile")
                }
            }
            .onAppear {
                viewModel.fetchProfile()
            }
            .alert("Error", isPresented: $viewModel.showError) {
                Button("OK", role: .cancel) { }
                    .accessibilityLabel("Dismiss error")
            } message: {
                Text(viewModel.errorMessage)
            }
            .sheet(isPresented: $viewModel.showVerificationWebView) {
                if let urlString = viewModel.pendingVerificationUrl,
                   let url = URL(string: urlString) {
                    SafariView(url: url)
                        .ignoresSafeArea()
                }
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
                    .accessibilityLabel("\(tabs[index]) tab")
                    .accessibilityHint(selectedTab == index ? "Currently selected" : "Tap to view \(tabs[index].lowercased()) information")
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
                .accessibilityLabel("Save profile changes")
            }
        }
        .padding(.bottom, 24)
    }
}

// MARK: - Vehicle & Documents Section
struct VehicleDocumentsSection: View {
    @ObservedObject var viewModel: DriverProfileViewModel
    @State private var showWebVerification = false

    private let webVerificationURL = AppConstants.driverApplicationURL

    var body: some View {
        VStack(spacing: 16) {
            // Vehicle Information (Editable)
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

                    ProfileField(
                        label: "License Plate",
                        value: $viewModel.licensePlate,
                        isEditing: viewModel.isEditing,
                        icon: "rectangle"
                    )

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
                    } else if !viewModel.vehicleType.isEmpty {
                        HStack {
                            Image(systemName: "car.2.fill")
                                .foregroundColor(Theme.textGrey)
                            Text("Vehicle Type")
                                .foregroundColor(Theme.textSecondary)
                            Spacer()
                            Text(viewModel.vehicleType)
                                .foregroundColor(Theme.textPrimary)
                        }
                        .padding(.horizontal, 12)
                        .padding(.vertical, 8)
                    }

                    // Vehicle photo is managed via web portal
                }
            }

            // Document Verification Status Card
            ProfileCard(title: "Document Verification", icon: "doc.text.magnifyingglass") {
                VStack(spacing: 16) {
                    // Status Summary
                    if let response = viewModel.documentsResponse {
                        HStack {
                            if response.allVerified {
                                Image(systemName: "checkmark.shield.fill")
                                    .font(.title2)
                                    .foregroundColor(Theme.statusActive)
                                VStack(alignment: .leading, spacing: 4) {
                                    Text("All Documents Verified")
                                        .font(.headline)
                                        .foregroundColor(Theme.statusActive)
                                    Text("Your account is fully verified")
                                        .font(.caption)
                                        .foregroundColor(Theme.textSecondary)
                                }
                            } else {
                                Image(systemName: "exclamationmark.shield.fill")
                                    .font(.title2)
                                    .foregroundColor(Theme.statusWarning)
                                VStack(alignment: .leading, spacing: 4) {
                                    Text("Verification Incomplete")
                                        .font(.headline)
                                        .foregroundColor(Theme.statusWarning)
                                    Text("\(response.documents.filter { $0.verified }.count)/\(response.count) documents verified")
                                        .font(.caption)
                                        .foregroundColor(Theme.textSecondary)
                                }
                            }
                            Spacer()
                        }
                        .padding()
                        .background((response.allVerified ? Theme.statusActive : Theme.statusWarning).opacity(0.1))
                        .cornerRadius(12)

                        // Document Status List (Read-only)
                        if !response.documents.isEmpty {
                            VStack(spacing: 8) {
                                ForEach(response.documents) { doc in
                                    DocumentStatusRow(document: doc)
                                }
                            }
                        }
                    } else if viewModel.isLoadingDocuments {
                        HStack {
                            ProgressView()
                            Text("Loading verification status...")
                                .font(.subheadline)
                                .foregroundColor(Theme.textSecondary)
                        }
                        .frame(maxWidth: .infinity)
                        .padding()
                    } else {
                        // No documents yet
                        VStack(spacing: 12) {
                            Image(systemName: "doc.badge.plus")
                                .font(.system(size: 40))
                                .foregroundColor(Theme.textGrey)
                            Text("No Documents Submitted")
                                .font(.headline)
                                .foregroundColor(Theme.textPrimary)
                            Text("Complete your verification on the web portal")
                                .font(.subheadline)
                                .foregroundColor(Theme.textSecondary)
                                .multilineTextAlignment(.center)
                        }
                        .padding()
                    }

                    Divider()

                    // Web Verification Button
                    VStack(spacing: 8) {
                        Text("Upload documents through our secure web portal:")
                            .font(.caption)
                            .foregroundColor(Theme.textSecondary)
                            .multilineTextAlignment(.center)

                        Button(action: { showWebVerification = true }) {
                            HStack {
                                Image(systemName: "safari.fill")
                                Text("Upload Documents on Web")
                            }
                            .font(.subheadline)
                            .fontWeight(.semibold)
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 12)
                            .background(Theme.brandRed)
                            .cornerRadius(10)
                        }
                        .accessibilityLabel("Upload documents on web")
                        .accessibilityHint("Opens the web portal for document upload")
                    }
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
                .accessibilityLabel("Save vehicle and document changes")
            }
        }
        .padding(.bottom, 24)
        .sheet(isPresented: $showWebVerification) {
            if let url = URL(string: webVerificationURL) {
                SafariView(url: url)
                    .ignoresSafeArea()
            }
        }
    }
}

// MARK: - Document Status Row (Read-only display)
struct DocumentStatusRowItem: View {
    let icon: String
    let text: String

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .font(.system(size: 14))
                .foregroundColor(Theme.brandRed)
                .frame(width: 24)
            Text(text)
                .font(.subheadline)
                .foregroundColor(Theme.textPrimary)
            Spacer()
        }
    }
}

// MARK: - Vehicle Photo Upload View
struct VehiclePhotoUploadView: View {
    let imageUrl: String?
    let isEditing: Bool
    let onUpload: (Data) -> Void

    @State private var selectedItem: PhotosPickerItem?
    @State private var isUploading = false

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text("Vehicle Photo")
                    .font(.caption)
                    .foregroundColor(Theme.textSecondary)
                Spacer()
                Text("Visible to customers")
                    .font(.caption2)
                    .foregroundColor(Theme.textGrey)
            }

            if let imageUrl = imageUrl, !imageUrl.isEmpty {
                // Show existing photo
                AsyncImage(url: URL(string: imageUrl)) { phase in
                    switch phase {
                    case .empty:
                        ProgressView()
                            .frame(height: 150)
                            .frame(maxWidth: .infinity)
                    case .success(let image):
                        image
                            .resizable()
                            .scaledToFill()
                            .frame(height: 150)
                            .frame(maxWidth: .infinity)
                            .clipped()
                            .cornerRadius(12)
                    case .failure:
                        placeholderView
                    @unknown default:
                        placeholderView
                    }
                }
                .overlay(alignment: .topTrailing) {
                    if isEditing {
                        PhotosPicker(selection: $selectedItem, matching: .images) {
                            Image(systemName: "pencil.circle.fill")
                                .font(.title2)
                                .foregroundColor(.white)
                                .background(Circle().fill(Theme.brandRed))
                                .padding(8)
                        }
                        .onChange(of: selectedItem) { _, newItem in
                            handleImageSelection(newItem)
                        }
                    }
                }
            } else if isEditing {
                // Upload prompt
                PhotosPicker(selection: $selectedItem, matching: .images) {
                    VStack(spacing: 12) {
                        if isUploading {
                            ProgressView()
                                .scaleEffect(1.2)
                        } else {
                            Image(systemName: "camera.fill")
                                .font(.system(size: 32))
                                .foregroundColor(Theme.brandRed)
                            Text("Add Vehicle Photo")
                                .font(.subheadline)
                                .fontWeight(.medium)
                                .foregroundColor(Theme.brandRed)
                            Text("Help customers identify your vehicle")
                                .font(.caption)
                                .foregroundColor(Theme.textGrey)
                        }
                    }
                    .frame(height: 150)
                    .frame(maxWidth: .infinity)
                    .background(Theme.backgroundGrey)
                    .cornerRadius(12)
                    .overlay(
                        RoundedRectangle(cornerRadius: 12)
                            .stroke(style: StrokeStyle(lineWidth: 2, dash: [8]))
                            .foregroundColor(Theme.brandRed.opacity(0.3))
                    )
                }
                .onChange(of: selectedItem) { _, newItem in
                    handleImageSelection(newItem)
                }
            } else {
                // Read-only empty state
                placeholderView
            }
        }
    }

    private var placeholderView: some View {
        VStack(spacing: 8) {
            Image(systemName: "car.fill")
                .font(.system(size: 32))
                .foregroundColor(Theme.textGrey)
            Text("No photo uploaded")
                .font(.caption)
                .foregroundColor(Theme.textGrey)
        }
        .frame(height: 150)
        .frame(maxWidth: .infinity)
        .background(Theme.backgroundGrey)
        .cornerRadius(12)
    }

    private func handleImageSelection(_ item: PhotosPickerItem?) {
        guard let item = item else { return }
        isUploading = true

        Task {
            if let data = try? await item.loadTransferable(type: Data.self) {
                onUpload(data)
            }
            isUploading = false
            selectedItem = nil
        }
    }
}

// MARK: - Earnings & Payment Section
struct EarningsPaymentSection: View {
    @ObservedObject var viewModel: DriverProfileViewModel
    @StateObject private var earningsViewModel = EarningsViewModel()

    var body: some View {
        VStack(spacing: 16) {
            // Earnings Summary - Uses EarningsViewModel for accurate data from P2P Dashboard API
            ProfileCard(title: "Earnings Summary", icon: "dollarsign.circle.fill") {
                VStack(spacing: 16) {
                    HStack {
                        EarningsStat(
                            title: "This Week",
                            amount: earningsViewModel.weekEarnings
                        )

                        Divider().frame(height: 50)

                        EarningsStat(
                            title: "This Month",
                            amount: earningsViewModel.monthEarnings
                        )
                    }

                    Divider()

                    HStack {
                        VStack(alignment: .leading, spacing: 4) {
                            Text("Weekly Deliveries")
                                .font(.caption)
                                .foregroundColor(Theme.textSecondary)
                            Text("\(earningsViewModel.weekDeliveries)")
                                .font(.title3)
                                .fontWeight(.bold)
                        }

                        Spacer()

                        VStack(alignment: .trailing, spacing: 4) {
                            Text("Weekly Hours")
                                .font(.caption)
                                .foregroundColor(Theme.textSecondary)
                            Text(String(format: "%.1f hrs", earningsViewModel.weekHours))
                                .font(.title3)
                                .fontWeight(.bold)
                        }
                    }
                }
            }
            .onAppear {
                earningsViewModel.fetchEarnings()
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
                .accessibilityLabel("Save earnings and payment changes")
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
            .accessibilityLabel("Logout from account")
            .padding(.horizontal)
            .alert("Logout", isPresented: $showLogoutAlert) {
                Button("Cancel", role: .cancel) { }
                    .accessibilityLabel("Cancel logout")
                Button("Logout", role: .destructive) {
                    performLogout()
                }
                .accessibilityLabel("Confirm logout")
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
            .accessibilityLabel("Delete account permanently")
            .accessibilityHint("This action cannot be undone")
            .padding(.horizontal)
            .disabled(isDeletingAccount)
            .alert("Delete Account", isPresented: $showDeleteAccountAlert) {
                Button("Cancel", role: .cancel) { }
                    .accessibilityLabel("Cancel account deletion")
                Button("Delete", role: .destructive) {
                    showDeleteConfirmation = true
                }
                .accessibilityLabel("Proceed with account deletion")
            } message: {
                Text("Are you sure you want to delete your account? This action cannot be undone. All your data, earnings history, and profile information will be permanently removed.")
            }
            .alert("Final Confirmation", isPresented: $showDeleteConfirmation) {
                Button("Cancel", role: .cancel) { }
                    .accessibilityLabel("Cancel and keep account")
                Button("Permanently Delete", role: .destructive) {
                    performAccountDeletion()
                }
                .accessibilityLabel("Permanently delete my account")
            } message: {
                Text("This is your final warning. Your account and all associated data will be permanently deleted. This cannot be reversed.")
            }
            .alert("Error", isPresented: .constant(deleteError != nil)) {
                Button("OK") { deleteError = nil }
                    .accessibilityLabel("Dismiss error")
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
