import SwiftUI
import GoogleSignIn
import EatFairShared
import AuthenticationServices
import CryptoKit
import os

private let logger = Logger(subsystem: "com.dollorai.restaurant", category: "LoginView")

// MARK: - Apple Sign-In Coordinator (Delegate-based approach like Customer App)
class AppleSignInCoordinator: NSObject, ASAuthorizationControllerDelegate, ASAuthorizationControllerPresentationContextProviding {
    private var currentNonce: String?
    private var completion: ((Result<ASAuthorizationAppleIDCredential, Error>) -> Void)?

    // Keys for storing Apple user info (Apple only provides name/email on first sign-in)
    private let appleUserNameKey = "vendor_apple_user_name"
    private let appleUserIdKey = "vendor_apple_user_id"
    private let appleUserEmailKey = "vendor_apple_user_email"

    func signIn(completion: @escaping (Result<ASAuthorizationAppleIDCredential, Error>) -> Void) {
        self.completion = completion

        let nonce = randomNonceString()
        currentNonce = nonce

        let appleIDProvider = ASAuthorizationAppleIDProvider()
        let request = appleIDProvider.createRequest()
        request.requestedScopes = [.fullName, .email]
        request.nonce = sha256(nonce)

        let authorizationController = ASAuthorizationController(authorizationRequests: [request])
        authorizationController.delegate = self
        authorizationController.presentationContextProvider = self
        authorizationController.performRequests()
    }

    // MARK: - ASAuthorizationControllerDelegate
    func authorizationController(controller: ASAuthorizationController, didCompleteWithAuthorization authorization: ASAuthorization) {
        guard let appleIDCredential = authorization.credential as? ASAuthorizationAppleIDCredential else {
            completion?(.failure(NSError(domain: "AppleSignIn", code: -1, userInfo: [NSLocalizedDescriptionKey: "Unable to get Apple ID credential"])))
            return
        }

        guard let _ = currentNonce else {
            completion?(.failure(NSError(domain: "AppleSignIn", code: -2, userInfo: [NSLocalizedDescriptionKey: "Invalid login state. Please try again."])))
            return
        }

        completion?(.success(appleIDCredential))
    }

    func authorizationController(controller: ASAuthorizationController, didCompleteWithError error: Error) {
        completion?(.failure(error))
    }

    // MARK: - ASAuthorizationControllerPresentationContextProviding
    func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
        // First try to get key window from connected scenes
        if let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene {
            if let keyWindow = windowScene.windows.first(where: { $0.isKeyWindow }) {
                return keyWindow
            }
            if let firstWindow = windowScene.windows.first {
                return firstWindow
            }
        }

        // Fallback: create a new window if none exists (should never happen in normal use)
        let fallbackWindow = UIWindow(frame: UIScreen.main.bounds)
        fallbackWindow.makeKeyAndVisible()
        return fallbackWindow
    }

    // MARK: - Helper Functions
    private func randomNonceString(length: Int = 32) -> String {
        let charset = "0123456789ABCDEFGHIJKLMNOPQRSTUVXYZabcdefghijklmnopqrstuvwxyz"
        guard length > 0 else {
            return String((0..<32).compactMap { _ in charset.randomElement() })
        }
        var randomBytes = [UInt8](repeating: 0, count: length)
        let errorCode = SecRandomCopyBytes(kSecRandomDefault, randomBytes.count, &randomBytes)
        if errorCode != errSecSuccess {
            // Fallback to UUID-based nonce if secure random fails
            let fallbackNonce = UUID().uuidString.replacingOccurrences(of: "-", with: "") + UUID().uuidString.replacingOccurrences(of: "-", with: "")
            return String(fallbackNonce.prefix(length))
        }
        let charsetArray: [Character] = Array("0123456789ABCDEFGHIJKLMNOPQRSTUVXYZabcdefghijklmnopqrstuvwxyz-._")
        let nonce = randomBytes.map { byte in charsetArray[Int(byte) % charsetArray.count] }
        return String(nonce)
    }

    private func sha256(_ input: String) -> String {
        let inputData = Data(input.utf8)
        let hashedData = SHA256.hash(data: inputData)
        let hashString = hashedData.compactMap { String(format: "%02x", $0) }.joined()
        return hashString
    }
}

struct LoginView: View {
    @State private var email = ""
    @State private var password = ""
    @State private var showPassword = false
    @State private var errorMessage = ""
    @State private var successMessage = ""
    @State private var isLoading = false
    @State private var showForgotPassword = false
    @State private var showSignUp = false
    @State private var emailValidationError: String?
    @State private var showRegistrationAlert = false
    @State private var registrationURL: String = ""
    @Binding var isLoggedIn: Bool

    private let p2pAPI = P2PAPIService.shared
    private let appleSignInCoordinator = AppleSignInCoordinator()

    // Keys for storing Apple user info (Apple only provides name/email on FIRST sign-in)
    private let appleUserNameKey = "vendor_apple_user_name"
    private let appleUserIdKey = "vendor_apple_user_id"
    private let appleUserEmailKey = "vendor_apple_user_email"

    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 24) {
                    // Logo and Title
                    VStack(spacing: 12) {
                        Image("LaunchIcon")
                            .resizable()
                            .scaledToFit()
                            .frame(width: 100, height: 100)
                            .clipShape(RoundedRectangle(cornerRadius: 22))

                        Text("Dollor AI Restaurant")
                            .font(.largeTitle)
                            .fontWeight(.bold)

                        Text("Manage your restaurant")
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

                            HStack {
                                if showPassword {
                                    TextField("Enter your password", text: $password)
                                        .textContentType(.password)
                                        .autocapitalization(.none)
                                        .autocorrectionDisabled()
                                } else {
                                    SecureField("Enter your password", text: $password)
                                        .textContentType(.password)
                                }
                                Button(action: { showPassword.toggle() }) {
                                    Image(systemName: showPassword ? "eye.slash.fill" : "eye.fill")
                                        .foregroundColor(.gray)
                                }
                            }
                            .padding(8)
                            .background(Color(.systemBackground))
                            .overlay(RoundedRectangle(cornerRadius: 6).stroke(Color(.systemGray4)))
                            .cornerRadius(6)
                        }

                        // Forgot Password Link
                        HStack {
                            Spacer()
                            Button(action: { showForgotPassword = true }) {
                                Text("Forgot Password?")
                                    .font(.subheadline)
                                    .foregroundColor(.orange)
                            }
                            .accessibilityLabel("Forgot password")
                            .accessibilityHint("Opens password reset screen")
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
                    .accessibilityLabel("Log in to your account")
                    .accessibilityHint("Signs you into the restaurant dashboard")
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
                    .accessibilityLabel("Sign in with Google")
                    .accessibilityHint("Uses your Google account to sign in")
                    .disabled(isLoading)
                    .padding(.horizontal)

                    // Sign in with Apple Button (Required by Apple for App Store)
                    // Using delegate-based approach (same as Customer App) for better compatibility
                    Button(action: appleLogin) {
                        HStack(spacing: 12) {
                            if isLoading {
                                ProgressView()
                                    .progressViewStyle(CircularProgressViewStyle(tint: .white))
                            } else {
                                Image(systemName: "apple.logo")
                                    .font(.system(size: 18))
                                Text("Sign in with Apple")
                                    .font(.system(size: 16, weight: .medium))
                            }
                        }
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .frame(height: 50)
                        .background(Color.black)
                        .cornerRadius(12)
                    }
                    .accessibilityLabel("Sign in with Apple")
                    .accessibilityHint("Uses your Apple ID to sign in")
                    .disabled(isLoading)
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
                        .accessibilityLabel("Sign up for a new account")
                        .accessibilityHint("Opens the registration screen")
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
            .alert("Registration Required", isPresented: $showRegistrationAlert) {
                Button("Register Now") {
                    if let url = URL(string: registrationURL) {
                        UIApplication.shared.open(url)
                    }
                }
                Button("Cancel", role: .cancel) {}
            } message: {
                Text("You need to register as a restaurant partner first. Tap 'Register Now' to apply on our website.")
            }
        }
    }

    // MARK: - Apple Sign-In (Delegate-based approach like Customer App)

    func appleLogin() {
        #if DEBUG
        logger.debug("DEBUG APPLE: ========== STARTING APPLE SIGN-IN ==========")
        #endif

        isLoading = true
        errorMessage = ""

        appleSignInCoordinator.signIn { [self] result in
            #if DEBUG
            logger.debug("DEBUG APPLE: Sign-in callback received")
            #endif

            DispatchQueue.main.async {
                switch result {
                case .success(let appleIDCredential):
                    #if DEBUG
                    logger.debug("DEBUG APPLE: Got Apple ID credential")
                    #endif

                    // Extract user info
                    let appleUserId = appleIDCredential.user
                    var appleEmail = appleIDCredential.email ?? ""
                    var fullName = [appleIDCredential.fullName?.givenName, appleIDCredential.fullName?.familyName]
                        .compactMap { $0 }
                        .joined(separator: " ")

                    // Extract identity token (contains real email for returning users)
                    var identityTokenString: String?
                    if let identityTokenData = appleIDCredential.identityToken,
                       let tokenString = String(data: identityTokenData, encoding: .utf8) {
                        identityTokenString = tokenString
                        #if DEBUG
                        logger.debug("DEBUG APPLE: Got identity token (length: \(tokenString.count))")
                        #endif
                    }

                    #if DEBUG
                    logger.debug("DEBUG APPLE: Raw data - userId: \(appleUserId.prefix(20))..., email: '\(appleEmail)', name: '\(fullName)'")
                    #endif

                    // IMPORTANT: Apple only provides name AND email on FIRST sign-in
                    // Save both locally if provided, or retrieve saved values for subsequent logins
                    let isFirstSignIn = !appleEmail.isEmpty || !fullName.isEmpty

                    if isFirstSignIn {
                        #if DEBUG
                        logger.debug("DEBUG APPLE: First sign-in - saving name and email locally")
                        #endif
                        if !fullName.isEmpty {
                            UserDefaults.standard.set(fullName, forKey: self.appleUserNameKey)
                        }
                        if !appleEmail.isEmpty {
                            UserDefaults.standard.set(appleEmail, forKey: self.appleUserEmailKey)
                        }
                        UserDefaults.standard.set(appleUserId, forKey: self.appleUserIdKey)
                    } else {
                        #if DEBUG
                        logger.debug("DEBUG APPLE: Subsequent sign-in - checking for saved data")
                        #endif
                        let savedAppleId = UserDefaults.standard.string(forKey: self.appleUserIdKey)
                        if savedAppleId == appleUserId {
                            // Retrieve saved name
                            if let savedName = UserDefaults.standard.string(forKey: self.appleUserNameKey), !savedName.isEmpty {
                                fullName = savedName
                                #if DEBUG
                                logger.debug("DEBUG APPLE: Found saved name: \(fullName)")
                                #endif
                            }
                            // Retrieve saved email
                            if let savedEmail = UserDefaults.standard.string(forKey: self.appleUserEmailKey), !savedEmail.isEmpty {
                                appleEmail = savedEmail
                                #if DEBUG
                                logger.debug("DEBUG APPLE: Found saved email: \(appleEmail)")
                                #endif
                            }
                        } else {
                            #if DEBUG
                            logger.debug("DEBUG APPLE: No saved data found for this Apple ID")
                            #endif
                        }
                    }

                    let finalName = fullName.isEmpty ? "My Restaurant" : fullName
                    let finalEmail = appleEmail
                    #if DEBUG
                    logger.debug("DEBUG APPLE: Final values - email: '\(finalEmail)', name: '\(finalName)'")
                    #endif

                    // If no email but we have identity token, backend can extract email from token
                    // Only fail if we have neither email nor identity token
                    guard !finalEmail.isEmpty || identityTokenString != nil else {
                        #if DEBUG
                        logger.debug("DEBUG APPLE: ERROR - No email and no identity token available.")
                        #endif
                        self.isLoading = false
                        self.errorMessage = "Email not available. Please go to Settings > Apple ID > Sign-In & Security > Apps Using Apple ID, remove Dollor Business, and try again."
                        return
                    }

                    #if DEBUG
                    logger.debug("DEBUG APPLE: Calling P2P backend vendorAppleAuth...")
                    logger.debug("DEBUG APPLE: Has identity token: \(identityTokenString != nil)")
                    #endif

                    self.p2pAPI.vendorAppleAuth(
                        email: finalEmail,
                        name: finalName,
                        appleId: appleUserId,
                        identityToken: identityTokenString
                    ) { result in
                        DispatchQueue.main.async {
                            self.isLoading = false
                            switch result {
                            case .success(let response):
                                #if DEBUG
                                logger.debug("DEBUG APPLE: SUCCESS from backend!")
                                logger.debug("DEBUG APPLE: vendorId: \(response.user.vendorId ?? -1)")
                                logger.debug("DEBUG APPLE: fullName: \(response.user.fullName)")
                                logger.debug("DEBUG APPLE: email: \(response.user.email)")
                                logger.debug("DEBUG APPLE: Setting isLoggedIn = true")
                                #endif
                                self.isLoggedIn = true
                            case .failure(let error):
                                #if DEBUG
                                logger.debug("DEBUG APPLE: FAILED from backend - error: \(error)")
                                if let apiError = error as? P2PAPIError {
                                    logger.debug("DEBUG APPLE: API Error type: \(apiError)")
                                }
                                #endif
                                if case P2PAPIError.registrationRequired(_, let url) = error {
                                    self.registrationURL = url
                                    self.showRegistrationAlert = true
                                } else {
                                    let errMsg = error.localizedDescription.lowercased()
                                    if errMsg.contains("not found") || errMsg.contains("no account") {
                                        self.errorMessage = "No restaurant account found. Please register first."
                                    } else if errMsg.contains("not approved") || errMsg.contains("pending") {
                                        self.errorMessage = "Your restaurant account is pending approval."
                                    } else {
                                        self.errorMessage = "Unable to sign in with Apple. Please try again."
                                    }
                                }
                            }
                        }
                    }

                case .failure(let error):
                    self.isLoading = false
                    let nsError = error as NSError
                    #if DEBUG
                    logger.debug("DEBUG APPLE: ERROR from Apple SDK - domain: \(nsError.domain), code: \(nsError.code), description: \(error.localizedDescription)")
                    #endif

                    if nsError.code != ASAuthorizationError.canceled.rawValue {
                        self.errorMessage = "Apple Sign-In could not be completed. Please try again."
                    } else {
                        #if DEBUG
                        logger.debug("DEBUG APPLE: User cancelled sign-in")
                        #endif
                    }
                }
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
                    logger.debug("P2P Login successful: \(response.user.fullName)")
                    #endif
                    isLoggedIn = true
                case .failure(let error):
                    // Show user-friendly error message
                    if let apiError = error as? P2PAPIError {
                        switch apiError {
                        case .registrationRequired(_, let url):
                            self.registrationURL = url
                            self.showRegistrationAlert = true
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
                        default:
                            errorMessage = "Login failed. Please try again."
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
            logger.info("[LoginView] ERROR: Could not load CLIENT_ID from GoogleService-Info.plist")
            #endif
            // Return empty string - will fail gracefully in googleLogin()
            return ""
        }
        return clientID
    }

    func googleLogin() {
        #if DEBUG
        logger.debug("DEBUG GOOGLE: ========== STARTING GOOGLE SIGN-IN ==========")
        #endif

        guard !googleClientID.isEmpty else {
            #if DEBUG
            logger.debug("DEBUG GOOGLE: FAILED - Google Client ID is empty")
            #endif
            errorMessage = "Google Sign-In not configured. Please contact support."
            return
        }
        #if DEBUG
        logger.debug("DEBUG GOOGLE: Client ID loaded: \(googleClientID.prefix(30))...")
        #endif

        let config = GIDConfiguration(clientID: googleClientID)
        GIDSignIn.sharedInstance.configuration = config
        #if DEBUG
        logger.debug("DEBUG GOOGLE: GIDConfiguration set")
        #endif

        guard let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
              let rootViewController = windowScene.windows.first?.rootViewController else {
            #if DEBUG
            logger.debug("DEBUG GOOGLE: FAILED - Unable to get root view controller")
            #endif
            errorMessage = "Unable to get root view controller"
            return
        }
        #if DEBUG
        logger.debug("DEBUG GOOGLE: Got rootViewController, presenting Google Sign-In...")
        #endif

        isLoading = true
        errorMessage = ""

        GIDSignIn.sharedInstance.signIn(withPresenting: rootViewController) { [self] result, error in
            #if DEBUG
            logger.debug("DEBUG GOOGLE: Sign-in callback received")
            #endif

            if let error = error {
                let nsError = error as NSError
                #if DEBUG
                logger.debug("DEBUG GOOGLE: ERROR from Google SDK - domain: \(nsError.domain), code: \(nsError.code), description: \(error.localizedDescription)")
                #endif

                DispatchQueue.main.async {
                    if nsError.domain == "com.google.GIDSignIn" && nsError.code == -5 {
                        #if DEBUG
                        logger.debug("DEBUG GOOGLE: User cancelled sign-in")
                        #endif
                        self.isLoading = false
                        return
                    }
                    self.isLoading = false
                    let errMsg = error.localizedDescription.lowercased()
                    if errMsg.contains("network") || errMsg.contains("connection") {
                        self.errorMessage = "Unable to connect. Please check your internet connection."
                    } else {
                        self.errorMessage = "Google Sign-In could not be completed. Please try again."
                    }
                }
                return
            }

            guard let user = result?.user else {
                #if DEBUG
                logger.debug("DEBUG GOOGLE: FAILED - No user in result")
                #endif
                DispatchQueue.main.async {
                    self.isLoading = false
                    self.errorMessage = "Failed to get user info from Google"
                }
                return
            }
            #if DEBUG
            logger.debug("DEBUG GOOGLE: Got Google user object")
            #endif

            guard let googleEmail = user.profile?.email, !googleEmail.isEmpty else {
                #if DEBUG
                logger.debug("DEBUG GOOGLE: FAILED - No email from Google profile")
                #endif
                DispatchQueue.main.async {
                    self.isLoading = false
                    self.errorMessage = "Unable to retrieve email from Google account"
                }
                return
            }

            let googleName = user.profile?.name ?? "My Restaurant"
            let googleUserId = user.userID ?? ""
            #if DEBUG
            logger.debug("DEBUG GOOGLE: Got user info - email: \(googleEmail), name: \(googleName), userId: \(googleUserId.prefix(10))...")
            #endif

            // Use proper OAuth endpoint - handles both login and registration
            #if DEBUG
            logger.debug("DEBUG GOOGLE: Calling P2P backend vendorGoogleAuth...")
            #endif
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
                        logger.debug("DEBUG GOOGLE: SUCCESS from backend!")
                        logger.debug("DEBUG GOOGLE: vendorId: \(response.user.vendorId ?? -1)")
                        logger.debug("DEBUG GOOGLE: fullName: \(response.user.fullName)")
                        logger.debug("DEBUG GOOGLE: email: \(response.user.email)")
                        logger.debug("DEBUG GOOGLE: Setting isLoggedIn = true")
                        #endif
                        self.isLoggedIn = true
                    case .failure(let error):
                        #if DEBUG
                        logger.debug("DEBUG GOOGLE: FAILED from backend - error: \(error)")
                        #endif
                        if let apiError = error as? P2PAPIError {
                            switch apiError {
                            case .registrationRequired(_, let url):
                                self.registrationURL = url
                                self.showRegistrationAlert = true
                            case .serverError(let message):
                                #if DEBUG
                                logger.debug("DEBUG GOOGLE: Server error message: \(message)")
                                #endif
                                self.errorMessage = message
                            case .decodingError:
                                #if DEBUG
                                logger.debug("DEBUG GOOGLE: Decoding error - response format mismatch")
                                #endif
                                self.errorMessage = "Google sign-in failed. Please try again."
                            case .noData:
                                #if DEBUG
                                logger.debug("DEBUG GOOGLE: No data received from server")
                                #endif
                                self.errorMessage = "Google sign-in failed. Please try again."
                            default:
                                #if DEBUG
                                logger.debug("DEBUG GOOGLE: Other API error: \(apiError)")
                                #endif
                                self.errorMessage = "Google sign-in failed. Please try again."
                            }
                        } else {
                            #if DEBUG
                            logger.debug("DEBUG GOOGLE: Non-API error: \(error.localizedDescription)")
                            #endif
                            let errMsg = error.localizedDescription.lowercased()
                            if errMsg.contains("not found") || errMsg.contains("no account") {
                                self.errorMessage = "No restaurant account found. Please register first."
                            } else {
                                self.errorMessage = "Unable to sign in. Please try again."
                            }
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
                        .accessibilityLabel("Back to login")
                        .accessibilityHint("Returns to the login screen")
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
                    .accessibilityLabel("Send password reset email")
                    .accessibilityHint("Sends instructions to reset your password")
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
                    .accessibilityLabel("Close")
                    .accessibilityHint("Dismisses this screen")
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
                    .accessibilityLabel("Create account")
                    .accessibilityHint("Registers your restaurant on Dollor AI")
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
                    .accessibilityLabel("Close")
                    .accessibilityHint("Dismisses this screen")
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
                    logger.debug("Registration successful: \(response.user.fullName)")
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
