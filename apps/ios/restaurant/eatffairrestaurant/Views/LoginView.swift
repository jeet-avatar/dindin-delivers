import SwiftUI
import GoogleSignIn
import EatFairShared

struct LoginView: View {
    @State private var email = ""
    @State private var password = ""
    @State private var errorMessage = ""
    @State private var successMessage = ""
    @State private var isLoading = false
    @State private var showForgotPassword = false
    @State private var showSignUp = false
    @Binding var isLoggedIn: Bool

    private let p2pAPI = P2PAPIService.shared

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
                SignUpView(isPresented: $showSignUp, isLoggedIn: $isLoggedIn)
            }
        }
    }

    func login() {
        guard !email.isEmpty, !password.isEmpty else {
            errorMessage = "Please fill in all fields"
            return
        }

        isLoading = true
        errorMessage = ""
        successMessage = ""

        // Use P2P backend for vendor login
        p2pAPI.vendorLogin(email: email, password: password) { result in
            DispatchQueue.main.async {
                isLoading = false
                switch result {
                case .success(let response):
                    print("P2P Login successful: \(response.user.fullName)")
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
                        }
                    } else {
                        errorMessage = "Login failed. Please check your credentials."
                    }
                }
            }
        }
    }

    // Google Client ID from GoogleService-Info.plist
    private let googleClientID = "107524350806-ign58n65jrc4i0ab8audp3qgp24b37if.apps.googleusercontent.com"

    func googleLogin() {
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
            let googleEmail = user.profile?.email ?? ""
            let googleName = user.profile?.name ?? "My Restaurant"
            let googleUserId = user.userID ?? ""

            // Use Google info to login/register with P2P backend
            // Password is derived from Google user ID (user can't login with password directly)
            let derivedPassword = "google_oauth_\(googleUserId)"

            // Try login first
            self.p2pAPI.vendorLogin(email: googleEmail, password: derivedPassword) { result in
                switch result {
                case .success(let response):
                    DispatchQueue.main.async {
                        self.isLoading = false
                        print("Google Sign-In: Vendor login successful - \(response.user.fullName)")
                        self.isLoggedIn = true
                    }
                case .failure:
                    // User doesn't exist, register them as a new vendor
                    self.p2pAPI.vendorRegister(
                        email: googleEmail,
                        password: derivedPassword,
                        restaurantName: googleName
                    ) { regResult in
                        DispatchQueue.main.async {
                            self.isLoading = false
                            switch regResult {
                            case .success(let response):
                                print("Google Sign-In: Vendor registration successful - \(response.user.fullName)")
                                self.isLoggedIn = true
                            case .failure(let error):
                                if let apiError = error as? P2PAPIError {
                                    switch apiError {
                                    case .serverError(let message):
                                        self.errorMessage = message
                                    default:
                                        self.errorMessage = "Failed to create vendor account"
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

        // Use P2P backend for password reset
        p2pAPI.requestPasswordReset(email: email) { result in
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
        password.count >= 8
    }

    func signUp() {
        // Validate
        guard !email.isEmpty, !password.isEmpty, !restaurantName.isEmpty else {
            errorMessage = "Please fill in all fields"
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
                    print("Registration successful: \(response.user.fullName)")
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
