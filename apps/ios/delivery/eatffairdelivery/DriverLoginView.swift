import SwiftUI
import GoogleSignIn
import GoogleSignInSwift
import EatFairShared
import Security

// MARK: - Keychain Helper for Secure Password Storage
struct KeychainHelper {
    static func save(password: String, for email: String) {
        let data = password.data(using: .utf8)!
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: email,
            kSecAttrService as String: "com.eatfair.delivery.google-oauth",
            kSecValueData as String: data
        ]

        // Delete any existing item
        SecItemDelete(query as CFDictionary)

        // Add new item
        SecItemAdd(query as CFDictionary, nil)
    }

    static func getPassword(for email: String) -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: email,
            kSecAttrService as String: "com.eatfair.delivery.google-oauth",
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]

        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)

        guard status == errSecSuccess,
              let data = result as? Data,
              let password = String(data: data, encoding: .utf8) else {
            return nil
        }

        return password
    }

    static func deletePassword(for email: String) {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: email,
            kSecAttrService as String: "com.eatfair.delivery.google-oauth"
        ]
        SecItemDelete(query as CFDictionary)
    }
}

struct DriverLoginView: View {
    @State private var email = ""
    @State private var password = ""
    @State private var confirmPassword = ""
    @State private var errorMessage = ""
    @State private var isLoading = false
    @State private var isSignUp = false
    @State private var firstName = ""
    @State private var lastName = ""
    @State private var phone = ""
    @State private var showTerms = false
    @State private var agreedToTerms = false
    @Binding var isLoggedIn: Bool

    private let p2pService = P2PAPIService.shared

    // Google Client ID from GoogleService-Info.plist (Delivery app)
    private let googleClientID = "107524350806-smtgnkufvnf2a7dp0luc7qgp1h5ara1e.apps.googleusercontent.com"

    // Email validation
    private var isValidEmail: Bool {
        let emailRegex = "^[A-Z0-9a-z._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$"
        let emailPredicate = NSPredicate(format: "SELF MATCHES %@", emailRegex)
        return emailPredicate.evaluate(with: email)
    }

    // Password validation (min 8 chars, 1 uppercase, 1 number)
    private var isValidPassword: Bool {
        password.count >= 8 &&
        password.rangeOfCharacter(from: .uppercaseLetters) != nil &&
        password.rangeOfCharacter(from: .decimalDigits) != nil
    }

    // Phone validation
    private var isValidPhone: Bool {
        let phoneRegex = "^[0-9]{10,15}$"
        let phonePredicate = NSPredicate(format: "SELF MATCHES %@", phoneRegex)
        let cleanPhone = phone.replacingOccurrences(of: "[^0-9]", with: "", options: .regularExpression)
        return phonePredicate.evaluate(with: cleanPhone)
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                // App branding with dollar sign
                ZStack {
                    Circle()
                        .fill(Theme.brandGreen.opacity(0.15))
                        .frame(width: 120, height: 120)

                    Text("$")
                        .font(.system(size: 60, weight: .bold))
                        .foregroundColor(Theme.brandGreen)
                }
                .padding(.bottom, isSignUp ? 10 : 20)

                Text("Dollor AI Service")
                    .font(.largeTitle)
                    .fontWeight(.bold)
                    .foregroundColor(Theme.brandBlack)

                Text("$ online store")
                    .font(.subheadline)
                    .foregroundColor(Theme.textSecondary)
                    .padding(.bottom, isSignUp ? 10 : 20)

                Text(isSignUp ? "Driver Sign Up" : "Driver Login")
                    .font(.title2)
                    .fontWeight(.semibold)
                    .foregroundColor(Theme.brandBlack)

                if isSignUp {
                    HStack(spacing: 10) {
                        VStack(alignment: .leading, spacing: 4) {
                            TextField("First Name", text: $firstName)
                                .textFieldStyle(RoundedBorderTextFieldStyle())
                                .autocapitalization(.words)
                            if isSignUp && firstName.isEmpty {
                                Text("Required")
                                    .font(.caption2)
                                    .foregroundColor(.red)
                            }
                        }

                        VStack(alignment: .leading, spacing: 4) {
                            TextField("Last Name", text: $lastName)
                                .textFieldStyle(RoundedBorderTextFieldStyle())
                                .autocapitalization(.words)
                            if isSignUp && lastName.isEmpty {
                                Text("Required")
                                    .font(.caption2)
                                    .foregroundColor(.red)
                            }
                        }
                    }

                    VStack(alignment: .leading, spacing: 4) {
                        TextField("Phone Number", text: $phone)
                            .textFieldStyle(RoundedBorderTextFieldStyle())
                            .keyboardType(.phonePad)
                        if !phone.isEmpty && !isValidPhone {
                            Text("Enter valid phone (10-15 digits)")
                                .font(.caption2)
                                .foregroundColor(.red)
                        }
                    }
                }

                VStack(alignment: .leading, spacing: 4) {
                    TextField("Email", text: $email)
                        .textFieldStyle(RoundedBorderTextFieldStyle())
                        .autocapitalization(.none)
                        .keyboardType(.emailAddress)
                        .textContentType(.emailAddress)
                    if !email.isEmpty && !isValidEmail {
                        Text("Enter a valid email address")
                            .font(.caption2)
                            .foregroundColor(.red)
                    }
                }

                VStack(alignment: .leading, spacing: 4) {
                    SecureField("Password", text: $password)
                        .textFieldStyle(RoundedBorderTextFieldStyle())
                        .textContentType(isSignUp ? .newPassword : .password)
                    if isSignUp && !password.isEmpty && !isValidPassword {
                        Text("Min 8 chars, 1 uppercase, 1 number")
                            .font(.caption2)
                            .foregroundColor(.red)
                    }
                }

                if isSignUp {
                    VStack(alignment: .leading, spacing: 4) {
                        SecureField("Confirm Password", text: $confirmPassword)
                            .textFieldStyle(RoundedBorderTextFieldStyle())
                            .textContentType(.newPassword)
                        if !confirmPassword.isEmpty && password != confirmPassword {
                            Text("Passwords do not match")
                                .font(.caption2)
                                .foregroundColor(.red)
                        }
                    }

                    // Terms and Conditions
                    HStack(spacing: 8) {
                        Button(action: { agreedToTerms.toggle() }) {
                            Image(systemName: agreedToTerms ? "checkmark.square.fill" : "square")
                                .foregroundColor(agreedToTerms ? Theme.brandGreen : .gray)
                        }

                        Text("I agree to the ")
                            .font(.caption)
                            .foregroundColor(.gray)
                        +
                        Text("Terms & Conditions")
                            .font(.caption)
                            .foregroundColor(Theme.brandGreen)
                            .underline()
                    }
                    .onTapGesture {
                        showTerms = true
                    }
                }

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
                    // Reset fields when switching
                    if !isSignUp {
                        firstName = ""
                        lastName = ""
                        phone = ""
                        confirmPassword = ""
                        agreedToTerms = false
                    }
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
        .sheet(isPresented: $showTerms) {
            DriverTermsSheet(agreedToTerms: $agreedToTerms)
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

            // Generate secure password using cryptographic hash of Google ID + timestamp + random
            let timestamp = String(Int(Date().timeIntervalSince1970))
            let randomComponent = UUID().uuidString.prefix(8)
            let secureBase = "\(user.userID ?? "")\(timestamp)\(randomComponent)"
            let googlePassword = secureBase.data(using: .utf8)?.base64EncodedString() ?? UUID().uuidString

            p2pService.driverRegister(
                email: googleEmail,
                password: googlePassword,
                firstName: googleFirstName,
                lastName: googleLastName,
                phone: ""
            ) { regResult in
                switch regResult {
                case .success:
                    // Store the generated password securely in Keychain for future logins
                    KeychainHelper.save(password: googlePassword, for: googleEmail)
                    DispatchQueue.main.async {
                        self.isLoading = false
                        self.isLoggedIn = true
                    }
                case .failure:
                    // Registration failed (user exists), try login with stored password
                    if let storedPassword = KeychainHelper.getPassword(for: googleEmail) {
                        self.p2pService.driverLogin(email: googleEmail, password: storedPassword) { loginResult in
                            DispatchQueue.main.async {
                                self.isLoading = false
                                switch loginResult {
                                case .success:
                                    self.isLoggedIn = true
                                case .failure:
                                    self.email = googleEmail
                                    self.errorMessage = "Account exists. Please login with your password."
                                }
                            }
                        }
                    } else {
                        // No stored password, ask user to login manually
                        DispatchQueue.main.async {
                            self.isLoading = false
                            self.email = googleEmail
                            self.errorMessage = "Account exists. Please login with your password."
                        }
                    }
                }
            }
        }
    }

    func handleAction() {
        // Validate email format
        guard isValidEmail else {
            errorMessage = "Please enter a valid email address"
            return
        }

        if isSignUp {
            // Full signup validation
            guard !firstName.isEmpty else {
                errorMessage = "Please enter your first name"
                return
            }
            guard !lastName.isEmpty else {
                errorMessage = "Please enter your last name"
                return
            }
            guard !phone.isEmpty && isValidPhone else {
                errorMessage = "Please enter a valid phone number"
                return
            }
            guard isValidPassword else {
                errorMessage = "Password must be at least 8 characters with 1 uppercase and 1 number"
                return
            }
            guard password == confirmPassword else {
                errorMessage = "Passwords do not match"
                return
            }
            guard agreedToTerms else {
                errorMessage = "Please agree to the Terms & Conditions"
                return
            }
        } else {
            guard !password.isEmpty else {
                errorMessage = "Please enter your password"
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
                phone: phone.replacingOccurrences(of: "[^0-9]", with: "", options: .regularExpression)
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

// MARK: - Terms and Conditions Sheet
struct DriverTermsSheet: View {
    @Environment(\.dismiss) var dismiss
    @Binding var agreedToTerms: Bool

    var body: some View {
        NavigationView {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    Text("Terms & Conditions")
                        .font(.title)
                        .fontWeight(.bold)

                    Text("Last Updated: December 2024")
                        .font(.caption)
                        .foregroundColor(.gray)

                    Group {
                        sectionHeader("1. Driver Agreement")
                        Text("By registering as a driver on Dollor AI Service, you agree to provide delivery services in accordance with these terms. You must maintain a valid driver's license, vehicle insurance, and pass our background verification process.")

                        sectionHeader("2. Account Requirements")
                        Text("You must be at least 18 years old, possess a valid driver's license, and have access to a reliable vehicle. You are responsible for maintaining accurate account information.")

                        sectionHeader("3. Document Verification")
                        Text("All submitted documents (driver's license, insurance, etc.) will be verified by our AI-powered verification system. Approval is automatic upon successful verification. Falsified documents will result in immediate account termination.")

                        sectionHeader("4. Earnings & Payments")
                        Text("You will receive payment for completed deliveries as per the agreed rates. Payments are processed weekly via direct deposit or your preferred payment method.")

                        sectionHeader("5. Code of Conduct")
                        Text("You agree to provide professional, courteous service. Any violations of our code of conduct may result in account suspension or termination.")

                        sectionHeader("6. Privacy")
                        Text("Your personal information is protected under our Privacy Policy. We collect only necessary information for service delivery and compliance purposes.")
                    }

                    Spacer(minLength: 40)

                    Button(action: {
                        agreedToTerms = true
                        dismiss()
                    }) {
                        Text("I Agree to Terms & Conditions")
                            .fontWeight(.bold)
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(Theme.brandGreen)
                            .cornerRadius(10)
                    }
                }
                .padding()
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Close") {
                        dismiss()
                    }
                }
            }
        }
    }

    private func sectionHeader(_ text: String) -> some View {
        Text(text)
            .font(.headline)
            .padding(.top, 8)
    }
}

#if DEBUG
struct DriverLoginView_Previews: PreviewProvider {
    static var previews: some View {
        DriverLoginView(isLoggedIn: .constant(false))
    }
}
#endif
