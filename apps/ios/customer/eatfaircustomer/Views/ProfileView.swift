import SwiftUI
import FirebaseAuth
import EatFairShared

struct ProfileView: View {
    @EnvironmentObject var authViewModel: AuthViewModel
    @State private var showEditProfile = false
    @State private var showLanguageSheet = false
    @AppStorage("app_selected_language") private var selectedLanguage = "English"

    @State private var showRecurringRides = false

    // Account deletion states (Apple App Store Guideline 5.1.1)
    @State private var showDeleteAccountAlert = false
    @State private var showDeleteConfirmation = false
    @State private var isDeletingAccount = false
    @State private var deleteError: String?

    // Debug seeder state (DEBUG builds only)
    #if DEBUG
    @State private var isSeeding = false
    @State private var seedingMessage: String?
    #endif

    private let availableLanguages = ["English", "Spanish", "French", "Chinese", "Hindi"]

    // Use P2P backend data via AuthViewModel
    private var userName: String {
        if !authViewModel.customerName.isEmpty {
            return authViewModel.customerName
        }
        // Fallback to UserDefaults
        if let name = UserDefaults.standard.string(forKey: "p2p_customer_name"), !name.isEmpty {
            return name
        }
        // Last resort - Firebase
        return Auth.auth().currentUser?.displayName ?? "User"
    }

    private var userEmail: String {
        if !authViewModel.customerEmail.isEmpty {
            return authViewModel.customerEmail
        }
        // Fallback to UserDefaults
        if let email = UserDefaults.standard.string(forKey: "p2p_customer_email"), !email.isEmpty {
            return email
        }
        // Last resort - Firebase
        return Auth.auth().currentUser?.email ?? "No Email"
    }

    var body: some View {
        NavigationView {
            ZStack {
                Theme.brandGrey.edgesIgnoringSafeArea(.all)
                
                ScrollView {
                    VStack(spacing: 25) {
                        // Profile Header
                        VStack(spacing: 15) {
                            ZStack {
                                Circle()
                                    .fill(Theme.brandGreen)
                                    .frame(width: 100, height: 100)
                                    .shadow(radius: 5)
                                Text(String(userName.prefix(1)))
                                    .font(.system(size: 40, weight: .bold))
                                    .foregroundColor(.white)
                                
                                // Edit Badge - Tappable
                                VStack {
                                    Spacer()
                                    HStack {
                                        Spacer()
                                        Button(action: { showEditProfile = true }) {
                                            Image(systemName: "pencil.circle.fill")
                                                .foregroundColor(Theme.brandOrange)
                                                .font(.title)
                                                .background(Color.white.clipShape(Circle()))
                                        }
                                        .accessibilityLabel("Edit profile")
                                    }
                                }
                                .frame(width: 100, height: 100)
                            }
                            
                            VStack(spacing: 5) {
                                Text(userName)
                                    .font(.title2)
                                    .fontWeight(.bold)
                                    .foregroundColor(Theme.brandBlack)
                                
                                Text(userEmail)
                                    .font(.subheadline)
                                    .foregroundColor(Theme.textGrey)
                            }
                        }
                        .padding(.top, 30)
                        
                        // Account Settings Section
                        VStack(alignment: .leading, spacing: 0) {
                            Text("ACCOUNT")
                                .font(.caption)
                                .fontWeight(.bold)
                                .foregroundColor(Theme.textGrey)
                                .padding(.leading, 20)
                                .padding(.bottom, 10)
                            
                            VStack(spacing: 0) {
                                NavigationLink(destination: AddressListView()) {
                                    ProfileOptionRow(icon: "mappin.circle.fill", title: "Manage Addresses")
                                }
                                Divider()
                                NavigationLink(destination: PaymentMethodsView()) {
                                    ProfileOptionRow(icon: "creditcard.fill", title: "Payment Methods")
                                }
                                Divider()
                                NavigationLink(destination: FavoritesView()) {
                                    ProfileOptionRow(icon: "heart.fill", title: "Favorites")
                                }
                            }
                            .background(Color.white)
                            .cornerRadius(12)
                            .shadow(color: Color.black.opacity(0.05), radius: 5, x: 0, y: 2)
                        }
                        .padding(.horizontal)
                        
                        // App Settings Section
                        VStack(alignment: .leading, spacing: 0) {
                            Text("APP SETTINGS")
                                .font(.caption)
                                .fontWeight(.bold)
                                .foregroundColor(Theme.textGrey)
                                .padding(.leading, 20)
                                .padding(.bottom, 10)
                            
                            VStack(spacing: 0) {
                                NavigationLink(destination: SettingsView()) {
                                    ProfileOptionRow(icon: "gearshape.fill", title: "Settings")
                                }
                                Divider()
                                NavigationLink(destination: NotificationsView()) {
                                    ProfileOptionRow(icon: "bell.fill", title: "Notifications")
                                }
                                Divider()
                                NavigationLink(destination: ReferAndEarnView()) {
                                    ProfileOptionRow(icon: "gift.fill", title: "Refer & Earn")
                                }
                                Divider()
                                NavigationLink(destination: HelpSupportView()) {
                                    ProfileOptionRow(icon: "questionmark.circle.fill", title: "Help & Support")
                                }
                                Divider()
                                Button(action: { showRecurringRides = true }) {
                                    ProfileOptionRow(icon: "repeat.circle.fill", title: "Recurring Rides")
                                }
                            }
                            .background(Color.white)
                            .cornerRadius(12)
                            .shadow(color: Color.black.opacity(0.05), radius: 5, x: 0, y: 2)
                        }
                        .padding(.horizontal)

                        // Privacy & Safety Section - Uber Eats style transparency
                        VStack(alignment: .leading, spacing: 0) {
                            Text("PRIVACY & SAFETY")
                                .font(.caption)
                                .fontWeight(.bold)
                                .foregroundColor(Theme.textGrey)
                                .padding(.leading, 20)
                                .padding(.bottom, 10)

                            VStack(spacing: 0) {
                                NavigationLink(destination: WhatDriversSeePage()) {
                                    ProfileOptionRow(icon: "eye.fill", title: "What Drivers See")
                                }
                                Divider()
                                NavigationLink(destination: YourPrivacyPage()) {
                                    ProfileOptionRow(icon: "lock.shield.fill", title: "Your Privacy")
                                }
                                Divider()
                                NavigationLink(destination: SafetyFeaturesPage()) {
                                    ProfileOptionRow(icon: "checkmark.shield.fill", title: "Safety Features")
                                }
                            }
                            .background(Color.white)
                            .cornerRadius(12)
                            .shadow(color: Color.black.opacity(0.05), radius: 5, x: 0, y: 2)
                        }
                        .padding(.horizontal)

                        // Logout Button
                        Button(action: {
                            // Use the authViewModel to properly logout
                            authViewModel.logout()
                            // Also sign out from Firebase
                            try? Auth.auth().signOut()
                        }) {
                            Text("Log Out")
                                .fontWeight(.bold)
                                .foregroundColor(.white)
                                .frame(maxWidth: .infinity)
                                .padding()
                                .background(Theme.brandBlack)
                                .cornerRadius(12)
                                .shadow(radius: 5)
                        }
                        .padding(.horizontal)
                        .padding(.top, 10)

                        // Debug Section - Only in DEBUG builds
                        #if DEBUG
                        VStack(alignment: .leading, spacing: 0) {
                            Text("DEVELOPER TOOLS")
                                .font(.caption)
                                .fontWeight(.bold)
                                .foregroundColor(.orange)
                                .padding(.leading, 20)
                                .padding(.bottom, 10)

                            VStack(spacing: 0) {
                                // Seed Showcase Orders
                                Button(action: {
                                    isSeeding = true
                                    seedingMessage = nil
                                    DatabaseSeeder.shared.seedShowcaseOrders()
                                    DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
                                        isSeeding = false
                                        seedingMessage = "Successfully seeded 10 showcase orders!"
                                    }
                                }) {
                                    HStack {
                                        Image(systemName: "ladybug.fill")
                                            .foregroundColor(.orange)
                                            .font(.title3)
                                            .frame(width: 30)

                                        VStack(alignment: .leading) {
                                            Text("Seed Showcase Orders")
                                                .font(.body)
                                                .foregroundColor(Theme.brandBlack)
                                            Text("Creates 10 orders with promotions")
                                                .font(.caption)
                                                .foregroundColor(.gray)
                                        }

                                        Spacer()

                                        if isSeeding {
                                            ProgressView()
                                                .tint(.orange)
                                        } else {
                                            Image(systemName: "chevron.right")
                                                .foregroundColor(.gray)
                                                .font(.caption)
                                        }
                                    }
                                    .padding()
                                }
                                .disabled(isSeeding)

                                Divider()

                                // Cleanup Showcase Data
                                Button(action: {
                                    isSeeding = true
                                    seedingMessage = nil
                                    DatabaseSeeder.shared.cleanupTestData()
                                    DispatchQueue.main.asyncAfter(deadline: .now() + 1) {
                                        isSeeding = false
                                        seedingMessage = "Showcase data cleaned up!"
                                    }
                                }) {
                                    HStack {
                                        Image(systemName: "trash.circle.fill")
                                            .foregroundColor(.red)
                                            .font(.title3)
                                            .frame(width: 30)

                                        VStack(alignment: .leading) {
                                            Text("Cleanup Showcase Data")
                                                .font(.body)
                                                .foregroundColor(Theme.brandBlack)
                                            Text("Removes test orders")
                                                .font(.caption)
                                                .foregroundColor(.gray)
                                        }

                                        Spacer()

                                        Image(systemName: "chevron.right")
                                            .foregroundColor(.gray)
                                            .font(.caption)
                                    }
                                    .padding()
                                }
                                .disabled(isSeeding)
                            }
                            .background(Color.orange.opacity(0.1))
                            .cornerRadius(12)

                            // Seeding status message
                            if let message = seedingMessage {
                                Text(message)
                                    .font(.caption)
                                    .foregroundColor(message.contains("Error") ? .red : .green)
                                    .padding(.horizontal, 20)
                                    .padding(.top, 8)
                            }
                        }
                        .padding(.horizontal)
                        .padding(.top, 10)
                        #endif

                        // Delete Account Button (Apple App Store Guideline 5.1.1)
                        Button(action: {
                            showDeleteAccountAlert = true
                        }) {
                            HStack {
                                if isDeletingAccount {
                                    ProgressView()
                                        .tint(.red)
                                } else {
                                    Image(systemName: "trash.fill")
                                    Text("Delete Account")
                                }
                            }
                            .fontWeight(.semibold)
                            .foregroundColor(.red)
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(Color.red.opacity(0.1))
                            .cornerRadius(12)
                        }
                        .padding(.horizontal)
                        .padding(.bottom, 30)
                        .disabled(isDeletingAccount)
                    }
                }
            }
            .navigationTitle("Profile")
            .navigationBarTitleDisplayMode(.inline)
            .sheet(isPresented: $showEditProfile) {
                EditProfileView(authViewModel: authViewModel)
            }
            .sheet(isPresented: $showLanguageSheet) {
                LanguageSelectionSheet(selectedLanguage: $selectedLanguage, languages: availableLanguages)
            }
            .sheet(isPresented: $showRecurringRides) {
                RecurringRidesView()
            }
            .alert("Delete Account?", isPresented: $showDeleteAccountAlert) {
                Button("Cancel", role: .cancel) { }
                Button("Continue", role: .destructive) {
                    showDeleteConfirmation = true
                }
            } message: {
                Text("This will permanently delete your account, including all your order history, saved addresses, and payment methods. This action cannot be undone.")
            }
            .alert("Final Confirmation", isPresented: $showDeleteConfirmation) {
                Button("Cancel", role: .cancel) { }
                Button("Delete Forever", role: .destructive) {
                    performAccountDeletion()
                }
            } message: {
                Text("Are you absolutely sure? Your account and all associated data will be permanently deleted.")
            }
            .alert("Error", isPresented: .constant(deleteError != nil)) {
                Button("OK") { deleteError = nil }
            } message: {
                Text(deleteError ?? "")
            }
        }
    }

    // MARK: - Account Deletion (Apple App Store Guideline 5.1.1)

    private func performAccountDeletion() {
        isDeletingAccount = true

        let customerId = UserDefaults.standard.integer(forKey: "p2p_customer_id")
        guard customerId > 0 else {
            deleteError = "Unable to identify account. Please try logging out and back in."
            isDeletingAccount = false
            return
        }

        P2PAPIService.shared.deleteCustomerAccount(customerId: customerId) { result in
            DispatchQueue.main.async {
                self.isDeletingAccount = false

                switch result {
                case .success:
                    // Clear all local data
                    self.clearAllLocalData()
                    // Sign out from Firebase
                    try? Auth.auth().signOut()
                    // Use the authViewModel to logout
                    self.authViewModel.logout()
                case .failure(let error):
                    self.deleteError = "Failed to delete account: \(error.localizedDescription)"
                }
            }
        }
    }

    private func clearAllLocalData() {
        // Clear UserDefaults
        let customerKeys = [
            "p2p_customer_id",
            "p2p_customer_name",
            "p2p_customer_email",
            "p2p_customer_access_token",
            "p2p_access_token",
            "saved_addresses",
            "favorites",
            "cart_items"
        ]
        for key in customerKeys {
            UserDefaults.standard.removeObject(forKey: key)
        }
        UserDefaults.standard.synchronize()

        // Clear Keychain
        SecureStorage.shared.clearAuthTokens(type: .customer)
    }
}

// MARK: - Edit Profile View
struct EditProfileView: View {
    @Environment(\.dismiss) private var dismiss
    @ObservedObject var authViewModel: AuthViewModel
    @State private var editedName: String = ""
    @State private var isSaving = false
    @State private var saveError: String?

    private var userEmail: String {
        if !authViewModel.customerEmail.isEmpty {
            return authViewModel.customerEmail
        }
        if let email = UserDefaults.standard.string(forKey: "p2p_customer_email"), !email.isEmpty {
            return email
        }
        return Auth.auth().currentUser?.email ?? "No Email"
    }

    var body: some View {
        NavigationView {
            Form {
                Section("Profile Information") {
                    TextField("Name", text: $editedName)
                        .textContentType(.name)

                    HStack {
                        Text("Email")
                            .foregroundColor(.secondary)
                        Spacer()
                        Text(userEmail)
                            .foregroundColor(.gray)
                    }
                }

                Section {
                    Text("Your email cannot be changed. Contact support if you need to update it.")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }

                if let error = saveError {
                    Section {
                        Text(error)
                            .foregroundColor(.red)
                            .font(.caption)
                    }
                }
            }
            .navigationTitle("Edit Profile")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Save") {
                        saveProfile()
                    }
                    .disabled(editedName.isEmpty || isSaving)
                }
            }
            .onAppear {
                // Initialize with current name
                if !authViewModel.customerName.isEmpty {
                    editedName = authViewModel.customerName
                } else if let name = UserDefaults.standard.string(forKey: "p2p_customer_name"), !name.isEmpty {
                    editedName = name
                } else {
                    editedName = Auth.auth().currentUser?.displayName ?? ""
                }
            }
        }
    }

    private func saveProfile() {
        isSaving = true
        saveError = nil

        // Get customer ID for P2P update
        let customerId = UserDefaults.standard.integer(forKey: "p2p_customer_id")

        if customerId > 0 {
            // Update via P2P backend
            P2PAPIService.shared.updateCustomerProfile(customerId: customerId, name: editedName) { result in
                DispatchQueue.main.async {
                    self.isSaving = false
                    switch result {
                    case .success:
                        // Update local state
                        self.authViewModel.customerName = self.editedName
                        UserDefaults.standard.set(self.editedName, forKey: "p2p_customer_name")
                        self.dismiss()
                    case .failure(let error):
                        self.saveError = error.localizedDescription
                    }
                }
            }
        } else {
            // Fallback to Firebase
            let changeRequest = Auth.auth().currentUser?.createProfileChangeRequest()
            changeRequest?.displayName = editedName
            changeRequest?.commitChanges { error in
                isSaving = false
                if let error = error {
                    saveError = error.localizedDescription
                } else {
                    authViewModel.customerName = editedName
                    dismiss()
                }
            }
        }
    }
}

// MARK: - Language Selection Sheet
struct LanguageSelectionSheet: View {
    @Environment(\.dismiss) private var dismiss
    @Binding var selectedLanguage: String
    let languages: [String]
    @State private var showRestartAlert = false

    private let languageCodes: [String: String] = [
        "English": "en",
        "Spanish": "es",
        "French": "fr",
        "Chinese": "zh-Hans",
        "Hindi": "hi"
    ]

    var body: some View {
        NavigationView {
            VStack {
                List(languages, id: \.self) { language in
                    Button(action: {
                        if language != selectedLanguage {
                            selectedLanguage = language
                            saveLanguagePreference(language)
                            showRestartAlert = true
                        }
                    }) {
                        HStack {
                            Text(language)
                                .foregroundColor(Theme.brandBlack)
                            Spacer()
                            if language == selectedLanguage {
                                Image(systemName: "checkmark")
                                    .foregroundColor(Theme.brandOrange)
                            }
                        }
                    }
                }

                // Note about language
                Text("Language changes will take effect on next app launch.")
                    .font(.caption)
                    .foregroundColor(.secondary)
                    .padding()
            }
            .navigationTitle("Select Language")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") { dismiss() }
                }
            }
            .alert("Language Changed", isPresented: $showRestartAlert) {
                Button("OK") { dismiss() }
            } message: {
                Text("Please restart the app for the language change to take effect.")
            }
        }
    }

    private func saveLanguagePreference(_ language: String) {
        UserDefaults.standard.set(language, forKey: "app_selected_language")
        if let code = languageCodes[language] {
            UserDefaults.standard.set([code], forKey: "AppleLanguages")
        }
        UserDefaults.standard.synchronize()
    }
}

struct ProfileOptionRow: View {
    let icon: String
    let title: String
    
    var body: some View {
        HStack {
            Image(systemName: icon)
                .foregroundColor(Theme.brandOrange)
                .font(.title3)
                .frame(width: 30)
            
            Text(title)
                .font(.body)
                .foregroundColor(Theme.brandBlack)
            
            Spacer()
            
            Image(systemName: "chevron.right")
                .foregroundColor(.gray)
                .font(.caption)
        }
        .padding()
    }
}
