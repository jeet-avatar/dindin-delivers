import SwiftUI
import GoogleSignIn
import EatFairShared
import AuthenticationServices
import CryptoKit

struct LoginView: View {
    @State private var email = ""
    @State private var password = ""
    @State private var errorMessage = ""
    @State private var successMessage = ""
    @State private var isLoading = false
    @State private var showForgotPassword = false
    @State private var showSignUp = false
    @State private var currentNonce: String?
    @State private var emailValidationError: String?
    @Binding var isLoggedIn: Bool

    private let p2pAPI = P2PAPIService.shared

    // Keys for storing Apple user info (Apple only provides name on first sign-in)
    private let appleUserNameKey = "vendor_apple_user_name"
    private let appleUserIdKey = "vendor_apple_user_id"

    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 24) {
                    // Logo and Title
                    VStack(spacing: 12) {
                        ZStack {
                            Circle()
                                .fill(Color.green.opacity(0.15))
                                .frame(width: 100, height: 100)

                            Text("$")
                                .font(.system(size: 50, weight: .bold))
                                .foregroundColor(.green)
                        }

                        Text("Dollor AI Restaurant")
                            .font(.largeTitle)
                            .fontWeight(.bold)

                        Text("$ online store")
                            .font(.subheadline)
                            .foregroundColor(.gray)
                    }
                    .padding(.top, 40)
                    .padding(.bottom, 20)

                    // Login Form
                    VStack(spacing: 16) {
                        // Email Field
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Email")
                                .font(.subheadline)
                                .fontWeight(.medium)
                                .foregroundColor(.gray)

                            TextField("Enter your email", text: $email)
                                .textFieldStyle(RoundedBorderTextFieldStyle())
                                .autocapitalization(.none)
                                .keyboardType(.emailAddress)
                                .textContentType(.emailAddress)
                                .autocorrectionDisabled()
                                .onChange(of: email) { emailValidationError = nil }

                            if let error = emailValidationError {
                                Text(error)
                                    .font(.caption)
                                    .foregroundColor(.red)
                            }
                        }

                        // Password Field
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Password")
                                .font(.subheadline)
                                .fontWeight(.medium)
                                .foregroundColor(.gray)

                            SecureField("Enter your password", text: $password)
                                .textFieldStyle(RoundedBorderTextFieldStyle())
                                .textContentType(.password)
                        }

                        // Forgot Password Link
                        HStack {
                            Spacer()
                            Button(action: { showForgotPassword = true }) {
                                Text("Forgot Password?")
                                    .font(.subheadline)
                                    .foregroundColor(.orange)
                            }
                        }
                    }
                    .padding(.horizontal)

                    // Error Message
                    if !errorMessage.isEmpty {
                        HStack {
                            Image(systemName: "exclamationmark.circle.fill")
                                .foregroundColor(.red)
                            Text(errorMessage)
                                .foregroundColor(.red)
                                .font(.subheadline)
                        }
                        .padding()
                        .background(Color.red.opacity(0.1))
                        .cornerRadius(8)
                        .padding(.horizontal)
                    }

                    // Success Message
                    if !successMessage.isEmpty {
                        HStack {
                            Image(systemName: "checkmark.circle.fill")
                                .foregroundColor(.green)
                            Text(successMessage)
                                .foregroundColor(.green)
                                .font(.subheadline)
                        }
                        .padding()
                        .background(Color.green.opacity(0.1))
                        .cornerRadius(8)
                        .padding(.horizontal)
                    }

                    // Login Button
                    Button(action: login) {
                        HStack {
                            if isLoading {
                                ProgressView()
                                    .progressViewStyle(CircularProgressViewStyle(tint: .white))
                            } else {
                                Text("Log In")
                                    .fontWeight(.bold)
                            }
                        }
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color.orange)
                        .cornerRadius(12)
                    }
                    .disabled(isLoading || email.isEmpty || password.isEmpty)
                    .opacity((email.isEmpty || password.isEmpty) ? 0.6 : 1.0)
                    .padding(.horizontal)

                    // Divider
                    HStack {
                        Rectangle()
                            .fill(Color.gray.opacity(0.3))
                            .frame(height: 1)
                        Text("or")
                            .font(.subheadline)
                            .foregroundColor(.gray)
                        Rectangle()
                            .fill(Color.gray.opacity(0.3))
                            .frame(height: 1)
                    }
                    .padding(.horizontal)

                    // Google Sign-In Button
                    Button(action: googleLogin) {
                        HStack {
                            Image(systemName: "g.circle.fill")
                                .font(.title2)
                            Text("Sign in with Google")
                                .fontWeight(.semibold)
                        }
                        .foregroundColor(.primary)
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color(.systemBackground))
                        .cornerRadius(12)
                        .overlay(
                            RoundedRectangle(cornerRadius: 12)
                                .stroke(Color.gray.opacity(0.3), lineWidth: 1)
                        )
                    }
                    .disabled(isLoading)
                    .padding(.horizontal)

                    // Sign in with Apple Button (Required by Apple for App Store)
                    SignInWithAppleButton(.signIn) { request in
                        let nonce = randomNonceString()
                        currentNonce = nonce
                        request.requestedScopes = [.fullName, .email]
                        request.nonce = sha256(nonce)
                    } onCompletion: { result in
                        handleAppleSignIn(result: result)
                    }
                    .signInWithAppleButtonStyle(.black)
                    .frame(height: 50)
                    .cornerRadius(12)
                    .padding(.horizontal)

                    // Sign Up Link
                    HStack {
                        Text("Don't have an account?")
                            .foregroundColor(.gray)
                        Button(action: { showSignUp = true }) {
                            Text("Sign Up")
                                .fontWeight(.semibold)
                                .foregroundColor(.orange)
                        }
                    }
                    .padding(.top, 8)

                    Spacer(minLength: 40)
                }
            }
            .navigationBarHidden(true)
            .sheet(isPresented: $showForgotPassword) {
                ForgotPasswordView(isPresented: $showForgotPassword, successMessage: $successMessage)
            }
            .sheet(isPresented: $showSignUp) {
                RestaurantRegistrationView(isPresented: $showSignUp, isLoggedIn: $isLoggedIn)
            }
        }
    }

    // MARK: - Apple Sign-In Helper Functions

    /// Generate random nonce for Apple Sign-In security
    private func randomNonceString(length: Int = 32) -> String {
        precondition(length > 0)
        var randomBytes = [UInt8](repeating: 0, count: length)
        let errorCode = SecRandomCopyBytes(kSecRandomDefault, randomBytes.count, &randomBytes)
        if errorCode != errSecSuccess {
            fatalError("Unable to generate nonce. SecRandomCopyBytes failed with OSStatus \(errorCode)")
        }

        let charset: [Character] = Array("0123456789ABCDEFGHIJKLMNOPQRSTUVXYZabcdefghijklmnopqrstuvwxyz-._")
        let nonce = randomBytes.map { byte in
            charset[Int(byte) % charset.count]
        }
        return String(nonce)
    }

    /// SHA256 hash for nonce
    private func sha256(_ input: String) -> String {
        let inputData = Data(input.utf8)
        let hashedData = SHA256.hash(data: inputData)
        let hashString = hashedData.compactMap { String(format: "%02x", $0) }.joined()
        return hashString
    }

    /// Handle Apple Sign-In result
    private func handleAppleSignIn(result: Result<ASAuthorization, Error>) {
        switch result {
        case .success(let authorization):
            guard let appleIDCredential = authorization.credential as? ASAuthorizationAppleIDCredential else {
                errorMessage = "Unable to get Apple ID credential"
                return
            }

            guard let _ = currentNonce else {
                errorMessage = "Invalid login state. Please try again."
                return
            }

            isLoading = true
            errorMessage = ""

            // Extract user info
            let appleUserId = appleIDCredential.user
            let appleEmail = appleIDCredential.email ?? ""
            var fullName = [appleIDCredential.fullName?.givenName, appleIDCredential.fullName?.familyName]
                .compactMap { $0 }
                .joined(separator: " ")

            // IMPORTANT: Apple only provides name on FIRST sign-in
            // Save name locally if provided, or retrieve saved name for subsequent logins
            if !fullName.isEmpty {
                // First sign-in - save the name locally for future logins
                UserDefaults.standard.set(fullName, forKey: appleUserNameKey)
                UserDefaults.standard.set(appleUserId, forKey: appleUserIdKey)
            } else {
                // Subsequent sign-in - try to retrieve saved name for this Apple ID
                let savedAppleId = UserDefaults.standard.string(forKey: appleUserIdKey)
                if savedAppleId == appleUserId, let savedName = UserDefaults.standard.string(forKey: appleUserNameKey), !savedName.isEmpty {
                    fullName = savedName
                }
            }

            // Call P2P backend for Apple auth
            p2pAPI.vendorAppleAuth(
                email: appleEmail,
                name: fullName.isEmpty ? "My Restaurant" : fullName,
                appleId: appleUserId
            ) { [self] result in
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

        case .failure(let error):
            let nsError = error as NSError
            // Don't show error if user cancelled
            if nsError.code != ASAuthorizationError.canceled.rawValue {
                errorMessage = error.localizedDescription
            }
        }
    }

    func login() {
        guard !email.isEmpty, !password.isEmpty else {
            errorMessage = "Please fill in all fields"
            return
        }

        // Validate email using shared EmailValidator
        let validation = EmailValidator.validate(email)
        guard validation.isValid else {
            emailValidationError = validation.errorMessage
            return
        }

        isLoading = true
        errorMessage = ""
        successMessage = ""
        emailValidationError = nil

        // Use P2P backend for vendor login
        p2pAPI.vendorLogin(email: email, password: password) { result in
            DispatchQueue.main.async {
                isLoading = false
                switch result {
                case .success(let response):
                    #if DEBUG
                    print("P2P Login successful: \(response.user.fullName)")
                    #endif
                    isLoggedIn = true
                case .failure(let error):
                    // Show user-friendly error message
                    if let apiError = error as? P2PAPIError {
                        switch apiError {
                        case .serverError(let message):
                            errorMessage = message
                        case .invalidURL:
                            errorMessage = "Connection error. Please try again."
                        case .noData:
                            errorMessage = "No response from server. Please check your connection."
                        case .decodingError:
                            errorMessage = "Server returned an unexpected response."
                        case .encodingFailed:
                            errorMessage = "Failed to send request. Please try again."
                        case .httpError(let code):
                            errorMessage = "Server error (\(code)). Please try again later."
                        }
                    } else {
                        errorMessage = "Login failed. Please check your credentials."
                    }
                }
            }
        }
    }

    /// Load Google Client ID from GoogleService-Info.plist instead of hardcoding
    /// Falls back to plist value only - no hardcoded credentials in source code
    private var googleClientID: String {
        guard let path = Bundle.main.path(forResource: "GoogleService-Info", ofType: "plist"),
              let plist = NSDictionary(contentsOfFile: path),
              let clientID = plist["CLIENT_ID"] as? String else {
            #if DEBUG
            print("[LoginView] ERROR: Could not load CLIENT_ID from GoogleService-Info.plist")
            #endif
            // Return empty string - will fail gracefully in googleLogin()
            return ""
        }
        return clientID
    }

    func googleLogin() {
        guard !googleClientID.isEmpty else {
            errorMessage = "Google Sign-In not configured. Please contact support."
            return
        }
        let config = GIDConfiguration(clientID: googleClientID)
        GIDSignIn.sharedInstance.configuration = config

        guard let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
              let rootViewController = windowScene.windows.first?.rootViewController else {
            errorMessage = "Unable to get root view controller"
            return
        }

        isLoading = true
        errorMessage = ""

        GIDSignIn.sharedInstance.signIn(withPresenting: rootViewController) { [self] result, error in
            if let error = error {
                DispatchQueue.main.async {
                    // Check if user cancelled
                    let nsError = error as NSError
                    if nsError.domain == "com.google.GIDSignIn" && nsError.code == -5 {
                        // User cancelled - don't show error
                        self.isLoading = false
                        return
                    }
                    self.isLoading = false
                    self.errorMessage = error.localizedDescription
                }
                return
            }

            guard let user = result?.user else {
                DispatchQueue.main.async {
                    self.isLoading = false
                    self.errorMessage = "Failed to get user info from Google"
                }
                return
            }

            // Extract Google user info
            guard let googleEmail = user.profile?.email, !googleEmail.isEmpty else {
                DispatchQueue.main.async {
                    self.isLoading = false
                    self.errorMessage = "Unable to retrieve email from Google account"
                }
                return
            }

            let googleName = user.profile?.name ?? "My Restaurant"
            let googleUserId = user.userID ?? ""

            // Use proper OAuth endpoint - handles both login and registration
            self.p2pAPI.vendorGoogleAuth(
                email: googleEmail,
                name: googleName,
                googleId: googleUserId
            ) { result in
                DispatchQueue.main.async {
                    self.isLoading = false
                    switch result {
                    case .success(let response):
                        #if DEBUG
                        print("Google Sign-In: Vendor auth successful - \(response.user.fullName)")
                        #endif
                        self.isLoggedIn = true
                    case .failure(let error):
                        if let apiError = error as? P2PAPIError {
                            switch apiError {
                            case .serverError(let message):
                                self.errorMessage = message
                            default:
                                self.errorMessage = "Google sign-in failed. Please try again."
                            }
                        } else {
                            self.errorMessage = error.localizedDescription
                        }
                    }
                }
            }
        }
    }
}

// MARK: - Forgot Password View
struct ForgotPasswordView: View {
    @Binding var isPresented: Bool
    @Binding var successMessage: String
    @State private var email = ""
    @State private var errorMessage = ""
    @State private var isLoading = false
    @State private var resetSent = false

    private let p2pAPI = P2PAPIService.shared

    var body: some View {
        NavigationView {
            VStack(spacing: 24) {
                // Icon
                Image(systemName: "lock.rotation")
                    .resizable()
                    .scaledToFit()
                    .frame(width: 80, height: 80)
                    .foregroundColor(.orange)
                    .padding(.top, 40)

                // Title
                Text("Reset Password")
                    .font(.title)
                    .fontWeight(.bold)

                Text("Enter your email address and we'll send you instructions to reset your password.")
                    .font(.subheadline)
                    .foregroundColor(.gray)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal)

                if resetSent {
                    // Success State
                    VStack(spacing: 16) {
                        Image(systemName: "checkmark.circle.fill")
                            .resizable()
                            .scaledToFit()
                            .frame(width: 60, height: 60)
                            .foregroundColor(.green)

                        Text("Reset Email Sent!")
                            .font(.headline)
                            .foregroundColor(.green)

                        Text("Check your inbox for password reset instructions.")
                            .font(.subheadline)
                            .foregroundColor(.gray)
                            .multilineTextAlignment(.center)

                        Button(action: {
                            successMessage = "Password reset email sent. Check your inbox."
                            isPresented = false
                        }) {
                            Text("Back to Login")
                                .fontWeight(.bold)
                                .foregroundColor(.white)
                                .frame(maxWidth: .infinity)
                                .padding()
                                .background(Color.orange)
                                .cornerRadius(12)
                        }
                        .padding(.horizontal)
                        .padding(.top, 20)
                    }
                } else {
                    // Email Input
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Email")
                            .font(.subheadline)
                            .fontWeight(.medium)
                            .foregroundColor(.gray)

                        TextField("Enter your email", text: $email)
                            .textFieldStyle(RoundedBorderTextFieldStyle())
                            .autocapitalization(.none)
                            .keyboardType(.emailAddress)
                            .textContentType(.emailAddress)
                    }
                    .padding(.horizontal)

                    // Error Message
                    if !errorMessage.isEmpty {
                        Text(errorMessage)
                            .foregroundColor(.red)
                            .font(.subheadline)
                            .padding(.horizontal)
                    }

                    // Send Reset Email Button
                    Button(action: sendResetEmail) {
                        HStack {
                            if isLoading {
                                ProgressView()
                                    .progressViewStyle(CircularProgressViewStyle(tint: .white))
                            } else {
                                Text("Send Reset Email")
                                    .fontWeight(.bold)
                            }
                        }
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color.orange)
                        .cornerRadius(12)
                    }
                    .disabled(isLoading || email.isEmpty)
                    .opacity(email.isEmpty ? 0.6 : 1.0)
                    .padding(.horizontal)
                }

                Spacer()
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button(action: { isPresented = false }) {
                        Image(systemName: "xmark")
                            .foregroundColor(.gray)
                    }
                }
            }
        }
    }

    func sendResetEmail() {
        guard !email.isEmpty else {
            errorMessage = "Please enter your email"
            return
        }

        isLoading = true
        errorMessage = ""

        // Use P2P backend for vendor password reset (NOT customer endpoint!)
        p2pAPI.requestVendorPasswordReset(email: email) { (result: Result<P2PPasswordResetResponse, Error>) in
            DispatchQueue.main.async {
                isLoading = false
                switch result {
                case .success:
                    resetSent = true
                case .failure(let error):
                    if let apiError = error as? P2PAPIError {
                        switch apiError {
                        case .serverError(let message):
                            errorMessage = message
                        default:
                            errorMessage = "Failed to send reset email. Please try again."
                        }
                    } else {
                        errorMessage = "Failed to send reset email. Please try again."
                    }
                }
            }
        }
    }
}

// MARK: - Sign Up View
struct SignUpView: View {
    @Binding var isPresented: Bool
    @Binding var isLoggedIn: Bool
    @State private var email = ""
    @State private var password = ""
    @State private var confirmPassword = ""
    @State private var restaurantName = ""
    @State private var errorMessage = ""
    @State private var isLoading = false

    private let p2pAPI = P2PAPIService.shared

    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 24) {
                    // Icon
                    Image(systemName: "building.2.crop.circle.fill")
                        .resizable()
                        .scaledToFit()
                        .frame(width: 80, height: 80)
                        .foregroundColor(.orange)
                        .padding(.top, 20)

                    // Title
                    Text("Create Account")
                        .font(.title)
                        .fontWeight(.bold)

                    Text("Join Dollor AI and start managing your restaurant")
                        .font(.subheadline)
                        .foregroundColor(.gray)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal)

                    // Form Fields
                    VStack(spacing: 16) {
                        // Restaurant Name
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Restaurant Name")
                                .font(.subheadline)
                                .fontWeight(.medium)
                                .foregroundColor(.gray)

                            TextField("Enter restaurant name", text: $restaurantName)
                                .textFieldStyle(RoundedBorderTextFieldStyle())
                        }

                        // Email
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Email")
                                .font(.subheadline)
                                .fontWeight(.medium)
                                .foregroundColor(.gray)

                            TextField("Enter your email", text: $email)
                                .textFieldStyle(RoundedBorderTextFieldStyle())
                                .autocapitalization(.none)
                                .keyboardType(.emailAddress)
                                .textContentType(.emailAddress)
                        }

                        // Password
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Password")
                                .font(.subheadline)
                                .fontWeight(.medium)
                                .foregroundColor(.gray)

                            SecureField("Create a password", text: $password)
                                .textFieldStyle(RoundedBorderTextFieldStyle())
                                .textContentType(.newPassword)

                            Text("At least 8 characters")
                                .font(.caption)
                                .foregroundColor(.gray)
                        }

                        // Confirm Password
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Confirm Password")
                                .font(.subheadline)
                                .fontWeight(.medium)
                                .foregroundColor(.gray)

                            SecureField("Confirm your password", text: $confirmPassword)
                                .textFieldStyle(RoundedBorderTextFieldStyle())
                                .textContentType(.newPassword)
                        }
                    }
                    .padding(.horizontal)

                    // Error Message
                    if !errorMessage.isEmpty {
                        HStack {
                            Image(systemName: "exclamationmark.circle.fill")
                                .foregroundColor(.red)
                            Text(errorMessage)
                                .foregroundColor(.red)
                                .font(.subheadline)
                        }
                        .padding()
                        .background(Color.red.opacity(0.1))
                        .cornerRadius(8)
                        .padding(.horizontal)
                    }

                    // Sign Up Button
                    Button(action: signUp) {
                        HStack {
                            if isLoading {
                                ProgressView()
                                    .progressViewStyle(CircularProgressViewStyle(tint: .white))
                            } else {
                                Text("Create Account")
                                    .fontWeight(.bold)
                            }
                        }
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color.orange)
                        .cornerRadius(12)
                    }
                    .disabled(isLoading || !isFormValid)
                    .opacity(isFormValid ? 1.0 : 0.6)
                    .padding(.horizontal)

                    // Terms
                    Text("By signing up, you agree to our Terms of Service and Privacy Policy")
                        .font(.caption)
                        .foregroundColor(.gray)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal)

                    Spacer(minLength: 40)
                }
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button(action: { isPresented = false }) {
                        Image(systemName: "xmark")
                            .foregroundColor(.gray)
                    }
                }
            }
        }
    }

    var isFormValid: Bool {
        !email.isEmpty &&
        !password.isEmpty &&
        !confirmPassword.isEmpty &&
        !restaurantName.isEmpty &&
        password == confirmPassword &&
        password.count >= 8 &&
        EmailValidator.isValid(email)
    }

    func signUp() {
        // Validate
        guard !email.isEmpty, !password.isEmpty, !restaurantName.isEmpty else {
            errorMessage = "Please fill in all fields"
            return
        }

        // Validate email using shared EmailValidator
        let emailValidation = EmailValidator.validate(email)
        guard emailValidation.isValid else {
            errorMessage = emailValidation.errorMessage ?? "Invalid email address"
            return
        }

        guard password == confirmPassword else {
            errorMessage = "Passwords do not match"
            return
        }

        guard password.count >= 8 else {
            errorMessage = "Password must be at least 8 characters"
            return
        }

        isLoading = true
        errorMessage = ""

        // Register with P2P backend
        p2pAPI.vendorRegister(email: email, password: password, restaurantName: restaurantName) { result in
            DispatchQueue.main.async {
                isLoading = false
                switch result {
                case .success(let response):
                    #if DEBUG
                    print("Registration successful: \(response.user.fullName)")
                    #endif
                    isPresented = false
                    isLoggedIn = true
                case .failure(let error):
                    if let apiError = error as? P2PAPIError {
                        switch apiError {
                        case .serverError(let message):
                            errorMessage = message
                        default:
                            errorMessage = "Registration failed. Please try again."
                        }
                    } else {
                        errorMessage = "Registration failed. Please try again."
                    }
                }
            }
        }
    }
}
