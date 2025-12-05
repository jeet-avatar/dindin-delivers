import SwiftUI
import GoogleSignIn
import GoogleSignInSwift
import EatFairShared

struct DriverLoginView: View {
    @State private var email = ""
    @State private var password = ""
    @State private var errorMessage = ""
    @State private var isLoading = false
    @State private var isSignUp = false
    @State private var firstName = ""
    @State private var lastName = ""
    @State private var phone = ""
    @Binding var isLoggedIn: Bool

    private let p2pService = P2PAPIService.shared

    // Google Client ID from GoogleService-Info.plist (Delivery app)
    private let googleClientID = "107524350806-smtgnkufvnf2a7dp0luc7qgp1h5ara1e.apps.googleusercontent.com"

    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                Image(systemName: "bicycle.circle.fill")
                    .resizable()
                    .frame(width: 100, height: 100)
                    .foregroundColor(Theme.brandGreen)
                    .padding(.bottom, isSignUp ? 20 : 40)

                Text(isSignUp ? "Driver Sign Up" : "Driver Login")
                    .font(.largeTitle)
                    .fontWeight(.bold)
                    .foregroundColor(Theme.brandBlack)

                if isSignUp {
                    HStack(spacing: 10) {
                        TextField("First Name", text: $firstName)
                            .textFieldStyle(RoundedBorderTextFieldStyle())
                            .autocapitalization(.words)

                        TextField("Last Name", text: $lastName)
                            .textFieldStyle(RoundedBorderTextFieldStyle())
                            .autocapitalization(.words)
                    }

                    TextField("Phone Number", text: $phone)
                        .textFieldStyle(RoundedBorderTextFieldStyle())
                        .keyboardType(.phonePad)
                }

                TextField("Email", text: $email)
                    .textFieldStyle(RoundedBorderTextFieldStyle())
                    .autocapitalization(.none)
                    .keyboardType(.emailAddress)

                SecureField("Password", text: $password)
                    .textFieldStyle(RoundedBorderTextFieldStyle())

                if !errorMessage.isEmpty {
                    Text(errorMessage)
                        .foregroundColor(.red)
                        .font(.caption)
                        .multilineTextAlignment(.center)
                }

                Button(action: handleAction) {
                    if isLoading {
                        ProgressView()
                            .progressViewStyle(CircularProgressViewStyle(tint: .white))
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(Theme.brandGreen)
                            .cornerRadius(10)
                    } else {
                        Text(isSignUp ? "Sign Up" : "Login")
                            .fontWeight(.bold)
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(Theme.brandGreen)
                            .cornerRadius(10)
                    }
                }
                .disabled(isLoading)

                Button(action: {
                    isSignUp.toggle()
                    errorMessage = ""
                }) {
                    Text(isSignUp ? "Already have an account? Login" : "Don't have an account? Sign Up")
                        .foregroundColor(Theme.brandGreen)
                }

                HStack {
                    VStack { Divider() }
                    Text("OR")
                        .foregroundColor(.gray)
                        .font(.caption)
                    VStack { Divider() }
                }
                .padding(.vertical)

                GoogleSignInButton(action: handleGoogleLogin)

                Spacer()
            }
            .padding()
        }
    }

    func handleGoogleLogin() {
        let config = GIDConfiguration(clientID: googleClientID)
        GIDSignIn.sharedInstance.configuration = config

        guard let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
              let rootViewController = windowScene.windows.first?.rootViewController else {
            errorMessage = "Unable to get root view controller"
            return
        }

        isLoading = true

        GIDSignIn.sharedInstance.signIn(withPresenting: rootViewController) { result, error in
            if let error = error {
                DispatchQueue.main.async {
                    self.errorMessage = error.localizedDescription
                    self.isLoading = false
                }
                return
            }

            guard let user = result?.user else {
                DispatchQueue.main.async {
                    self.errorMessage = "Failed to get user info"
                    self.isLoading = false
                }
                return
            }

            // Use Google user info to register/login with P2P
            let googleEmail = user.profile?.email ?? ""
            let googleFirstName = user.profile?.givenName ?? ""
            let googleLastName = user.profile?.familyName ?? ""

            // Try to register first (for new users), if fails try login
            let googlePassword = "google_oauth_\(user.userID ?? "")"

            p2pService.driverRegister(
                email: googleEmail,
                password: googlePassword,
                firstName: googleFirstName,
                lastName: googleLastName,
                phone: ""
            ) { regResult in
                switch regResult {
                case .success:
                    DispatchQueue.main.async {
                        self.isLoading = false
                        self.isLoggedIn = true
                    }
                case .failure:
                    // Registration failed (user exists), try login with Google password
                    self.p2pService.driverLogin(email: googleEmail, password: googlePassword) { loginResult in
                        DispatchQueue.main.async {
                            self.isLoading = false
                            switch loginResult {
                            case .success:
                                self.isLoggedIn = true
                            case .failure:
                                // Account exists but was registered with different password
                                // Pre-fill email and ask user to login manually
                                self.email = googleEmail
                                self.errorMessage = "Account exists. Please login with your password or use manual signup."
                            }
                        }
                    }
                }
            }
        }
    }

    func handleAction() {
        if isSignUp {
            guard !firstName.isEmpty, !lastName.isEmpty, !email.isEmpty, !password.isEmpty else {
                errorMessage = "Please fill in all required fields"
                return
            }
        } else {
            guard !email.isEmpty, !password.isEmpty else {
                errorMessage = "Please enter email and password"
                return
            }
        }

        isLoading = true
        errorMessage = ""

        if isSignUp {
            p2pService.driverRegister(
                email: email,
                password: password,
                firstName: firstName,
                lastName: lastName,
                phone: phone
            ) { result in
                DispatchQueue.main.async {
                    self.isLoading = false
                    switch result {
                    case .success:
                        self.isLoggedIn = true
                    case .failure(let error):
                        self.errorMessage = error.localizedDescription
                    }
                }
            }
        } else {
            p2pService.driverLogin(email: email, password: password) { result in
                DispatchQueue.main.async {
                    self.isLoading = false
                    switch result {
                    case .success:
                        self.isLoggedIn = true
                    case .failure(let error):
                        self.errorMessage = error.localizedDescription
                    }
                }
            }
        }
    }
}

#if DEBUG
struct DriverLoginView_Previews: PreviewProvider {
    static var previews: some View {
        DriverLoginView(isLoggedIn: .constant(false))
    }
}
#endif
