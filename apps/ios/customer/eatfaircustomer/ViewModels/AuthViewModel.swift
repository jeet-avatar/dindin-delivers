import SwiftUI
import Combine
import GoogleSignIn
import EatFairShared
import AuthenticationServices
import CryptoKit

/// Customer Authentication ViewModel
/// Uses Google Sign-In SDK directly + P2P backend (no Firebase)
class AuthViewModel: NSObject, ObservableObject {
    @Published var isAuthenticated: Bool = false
    @Published var isLoading: Bool = false
    @Published var errorMessage: String?
    @Published var customerName: String = ""
    @Published var customerEmail: String = ""

    // Password Reset State
    @Published var showForgotPassword: Bool = false
    @Published var showResetCodeEntry: Bool = false
    @Published var resetEmail: String = ""
    @Published var resetCode: String = ""
    @Published var newPassword: String = ""
    @Published var passwordResetSuccess: Bool = false
    @Published var passwordResetMessage: String = ""

    private let p2pService = P2PAPIService.shared

    // Google Client ID from GoogleService-Info.plist
    private let googleClientID = "107524350806-ign58n65jrc4i0ab8audp3qgp24b37if.apps.googleusercontent.com"

    // Apple Sign-In nonce for security
    private var currentNonce: String?

    override init() {
        super.init()
        // Check if already logged in via P2P
        if p2pService.isCustomerLoggedIn {
            self.isAuthenticated = true
        }
    }

    /// Email/password login via P2P backend
    func login(email: String, password: String) {
        isLoading = true
        errorMessage = nil

        p2pService.customerLogin(email: email, password: password) { [weak self] result in
            DispatchQueue.main.async {
                self?.isLoading = false
                switch result {
                case .success(let response):
                    self?.customerName = response.fullName
                    self?.customerEmail = response.email
                    self?.isAuthenticated = true
                case .failure(let error):
                    self?.errorMessage = error.localizedDescription
                }
            }
        }
    }

    /// Register new customer
    func register(email: String, password: String, fullName: String, phone: String) {
        isLoading = true
        errorMessage = nil

        p2pService.customerRegister(email: email, password: password, fullName: fullName, phone: phone) { [weak self] result in
            DispatchQueue.main.async {
                self?.isLoading = false
                switch result {
                case .success(let response):
                    self?.customerName = response.fullName
                    self?.customerEmail = response.email
                    self?.isAuthenticated = true
                case .failure(let error):
                    self?.errorMessage = error.localizedDescription
                }
            }
        }
    }

    /// Helper to find topmost view controller
    private func getTopViewController() -> UIViewController? {
        guard let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
              let window = windowScene.windows.first(where: { $0.isKeyWindow }) ?? windowScene.windows.first,
              var topController = window.rootViewController else {
            return nil
        }

        while let presentedViewController = topController.presentedViewController {
            topController = presentedViewController
        }

        return topController
    }

    /// Google Sign-In → P2P backend (no Firebase Auth)
    func signInWithGoogle() {
        #if DEBUG
        print("AuthViewModel: signInWithGoogle() called")
        #endif
        let config = GIDConfiguration(clientID: googleClientID)
        GIDSignIn.sharedInstance.configuration = config

        guard let topViewController = getTopViewController() else {
            #if DEBUG
            print("AuthViewModel: ERROR - Unable to get top view controller")
            #endif
            errorMessage = "Unable to get view controller for sign-in"
            return
        }

        isLoading = true
        errorMessage = nil

        GIDSignIn.sharedInstance.signIn(withPresenting: topViewController) { [weak self] result, error in
            guard let self = self else { return }

            if let error = error {
                #if DEBUG
                print("AuthViewModel: Google Sign-In error: \(error.localizedDescription)")
                #endif
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
            let googleName = user.profile?.name ?? ""
            let googleUserId = user.userID ?? ""

            // Use the dedicated Google OAuth endpoint - handles both login and registration
            self.p2pService.customerGoogleAuth(
                email: googleEmail,
                name: googleName,
                googleId: googleUserId
            ) { result in
                DispatchQueue.main.async {
                    self.isLoading = false
                    switch result {
                    case .success(let response):
                        self.customerName = response.fullName
                        self.customerEmail = response.email
                        self.isAuthenticated = true
                    case .failure(let error):
                        self.errorMessage = error.localizedDescription
                    }
                }
            }
        }
    }

    func logout() {
        GIDSignIn.sharedInstance.signOut()
        p2pService.customerLogout()
        isAuthenticated = false
        customerName = ""
        customerEmail = ""
    }

    // MARK: - Password Reset

    /// Request password reset - sends code to email
    func requestPasswordReset(email: String) {
        isLoading = true
        errorMessage = nil
        resetEmail = email

        p2pService.requestPasswordReset(email: email) { [weak self] result in
            DispatchQueue.main.async {
                self?.isLoading = false
                switch result {
                case .success(let response):
                    self?.passwordResetMessage = response.message
                    self?.showResetCodeEntry = true
                    self?.showForgotPassword = false
                case .failure(let error):
                    self?.errorMessage = error.localizedDescription
                }
            }
        }
    }

    /// Confirm password reset with code and new password
    func confirmPasswordReset() {
        guard !resetCode.isEmpty, !newPassword.isEmpty else {
            errorMessage = "Please enter the reset code and new password"
            return
        }

        isLoading = true
        errorMessage = nil

        p2pService.confirmPasswordReset(email: resetEmail, code: resetCode, newPassword: newPassword) { [weak self] result in
            DispatchQueue.main.async {
                self?.isLoading = false
                switch result {
                case .success(let response):
                    self?.passwordResetSuccess = true
                    self?.passwordResetMessage = response.message
                    self?.showResetCodeEntry = false
                    // Clear reset fields
                    self?.resetCode = ""
                    self?.newPassword = ""
                case .failure(let error):
                    self?.errorMessage = error.localizedDescription
                }
            }
        }
    }

    /// Reset the password reset flow state
    func resetPasswordResetState() {
        showForgotPassword = false
        showResetCodeEntry = false
        resetEmail = ""
        resetCode = ""
        newPassword = ""
        passwordResetSuccess = false
        passwordResetMessage = ""
        errorMessage = nil
    }

    // MARK: - Apple Sign-In

    /// Generate random nonce for Apple Sign-In security
    private func randomNonceString(length: Int = 32) -> String {
        precondition(length > 0)
        var randomBytes = [UInt8](repeating: 0, count: length)
        let errorCode = SecRandomCopyBytes(kSecRandomDefault, randomBytes.count, &randomBytes)
        if errorCode != errSecSuccess {
            fatalError("Unable to generate nonce. SecRandomCopyBytes failed with OSStatus \(errorCode)")
        }
        let charset: [Character] = Array("0123456789ABCDEFGHIJKLMNOPQRSTUVXYZabcdefghijklmnopqrstuvwxyz-._")
        let nonce = randomBytes.map { byte in charset[Int(byte) % charset.count] }
        return String(nonce)
    }

    /// SHA256 hash of the nonce
    private func sha256(_ input: String) -> String {
        let inputData = Data(input.utf8)
        let hashedData = SHA256.hash(data: inputData)
        let hashString = hashedData.compactMap { String(format: "%02x", $0) }.joined()
        return hashString
    }

    /// Start Apple Sign-In flow
    func signInWithApple() {
        isLoading = true
        errorMessage = nil

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
}

// MARK: - ASAuthorizationControllerDelegate
extension AuthViewModel: ASAuthorizationControllerDelegate {
    func authorizationController(controller: ASAuthorizationController, didCompleteWithAuthorization authorization: ASAuthorization) {
        guard let appleIDCredential = authorization.credential as? ASAuthorizationAppleIDCredential else {
            DispatchQueue.main.async {
                self.isLoading = false
                self.errorMessage = "Unable to get Apple ID credential"
            }
            return
        }

        guard let _ = currentNonce else {
            DispatchQueue.main.async {
                self.isLoading = false
                self.errorMessage = "Invalid login state. Please try again."
            }
            return
        }

        // Extract user info
        let appleUserId = appleIDCredential.user
        let appleEmail = appleIDCredential.email ?? ""
        let fullName = [appleIDCredential.fullName?.givenName, appleIDCredential.fullName?.familyName]
            .compactMap { $0 }
            .joined(separator: " ")

        // Call P2P backend for Apple auth
        p2pService.customerAppleAuth(
            email: appleEmail,
            name: fullName.isEmpty ? "Apple User" : fullName,
            appleId: appleUserId
        ) { [weak self] result in
            DispatchQueue.main.async {
                self?.isLoading = false
                switch result {
                case .success(let response):
                    self?.customerName = response.fullName
                    self?.customerEmail = response.email
                    self?.isAuthenticated = true
                case .failure(let error):
                    self?.errorMessage = error.localizedDescription
                }
            }
        }
    }

    func authorizationController(controller: ASAuthorizationController, didCompleteWithError error: Error) {
        DispatchQueue.main.async {
            self.isLoading = false
            // Don't show error if user cancelled
            if (error as NSError).code != ASAuthorizationError.canceled.rawValue {
                self.errorMessage = error.localizedDescription
            }
        }
    }
}

// MARK: - ASAuthorizationControllerPresentationContextProviding
extension AuthViewModel: ASAuthorizationControllerPresentationContextProviding {
    func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
        guard let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
              let window = windowScene.windows.first(where: { $0.isKeyWindow }) ?? windowScene.windows.first else {
            fatalError("Unable to find window for Apple Sign-In presentation")
        }
        return window
    }
}
