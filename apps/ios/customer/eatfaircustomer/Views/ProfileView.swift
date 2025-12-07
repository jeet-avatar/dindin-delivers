import SwiftUI
import FirebaseAuth
import EatFairShared

struct ProfileView: View {
    @EnvironmentObject var authViewModel: AuthViewModel
    @State private var userEmail: String = ""
    @State private var userName: String = "User" // Placeholder
    @State private var showEditProfile = false
    @State private var showLanguageSheet = false
    @State private var selectedLanguage = "English"

    private let availableLanguages = ["English", "Spanish", "French", "Chinese", "Hindi"]

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
                                NavigationLink(destination: NotificationsView()) {
                                    ProfileOptionRow(icon: "bell.fill", title: "Notifications")
                                }
                                Divider()
                                Button(action: { showLanguageSheet = true }) {
                                    HStack {
                                        Image(systemName: "globe")
                                            .foregroundColor(Theme.brandOrange)
                                            .font(.title3)
                                            .frame(width: 30)

                                        Text("Language")
                                            .font(.body)
                                            .foregroundColor(Theme.brandBlack)

                                        Spacer()

                                        Text(selectedLanguage)
                                            .font(.subheadline)
                                            .foregroundColor(.gray)

                                        Image(systemName: "chevron.right")
                                            .foregroundColor(.gray)
                                            .font(.caption)
                                    }
                                    .padding()
                                }
                                Divider()
                                NavigationLink(destination: HelpSupportView()) {
                                    ProfileOptionRow(icon: "questionmark.circle.fill", title: "Help & Support")
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
                        .padding(.bottom, 30)
                    }
                }
            }
            .navigationTitle("Profile")
            .navigationBarTitleDisplayMode(.inline)
            .onAppear {
                if let user = Auth.auth().currentUser {
                    self.userEmail = user.email ?? "No Email"
                    self.userName = user.displayName ?? "User"
                }
            }
            .sheet(isPresented: $showEditProfile) {
                EditProfileView(userName: $userName, userEmail: $userEmail)
            }
            .sheet(isPresented: $showLanguageSheet) {
                LanguageSelectionSheet(selectedLanguage: $selectedLanguage, languages: availableLanguages)
            }
        }
    }
}

// MARK: - Edit Profile View
struct EditProfileView: View {
    @Environment(\.dismiss) private var dismiss
    @Binding var userName: String
    @Binding var userEmail: String
    @State private var editedName: String = ""
    @State private var isSaving = false

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
            }
            .navigationTitle("Edit Profile")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Save") {
                        isSaving = true
                        // Update Firebase profile
                        let changeRequest = Auth.auth().currentUser?.createProfileChangeRequest()
                        changeRequest?.displayName = editedName
                        changeRequest?.commitChanges { error in
                            isSaving = false
                            if error == nil {
                                userName = editedName
                                dismiss()
                            }
                        }
                    }
                    .disabled(editedName.isEmpty || isSaving)
                }
            }
            .onAppear {
                editedName = userName
            }
        }
    }
}

// MARK: - Language Selection Sheet
struct LanguageSelectionSheet: View {
    @Environment(\.dismiss) private var dismiss
    @Binding var selectedLanguage: String
    let languages: [String]

    var body: some View {
        NavigationView {
            List(languages, id: \.self) { language in
                Button(action: {
                    selectedLanguage = language
                    dismiss()
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
            .navigationTitle("Select Language")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") { dismiss() }
                }
            }
        }
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
