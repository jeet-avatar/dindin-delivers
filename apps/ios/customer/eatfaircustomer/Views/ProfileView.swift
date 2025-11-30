import SwiftUI
import FirebaseAuth

struct ProfileView: View {
    @State private var userEmail: String = ""
    @State private var userName: String = "User" // Placeholder
    
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
                                
                                // Edit Badge
                                VStack {
                                    Spacer()
                                    HStack {
                                        Spacer()
                                        Image(systemName: "pencil.circle.fill")
                                            .foregroundColor(Theme.brandOrange)
                                            .font(.title)
                                            .background(Color.white.clipShape(Circle()))
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
                                ProfileOptionRow(icon: "globe", title: "Language") // Keep as placeholder or add view
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
                            try? Auth.auth().signOut()
                            if let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
                               let window = windowScene.windows.first {
                                window.rootViewController = UIHostingController(rootView: MainAppView())
                                window.makeKeyAndVisible()
                            }
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
