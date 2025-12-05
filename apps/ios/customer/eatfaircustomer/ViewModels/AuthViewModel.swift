import SwiftUI
import Combine
import GoogleSignIn
import EatFairShared

/// Customer Authentication ViewModel
/// Uses Google Sign-In SDK directly + P2P backend (no Firebase)
class AuthViewModel: ObservableObject {
    @Published var isAuthenticated: Bool = false
    @Published var isLoading: Bool = false
    @Published var errorMessage: String?
    @Published var customerName: String = ""
    @Published var customerEmail: String = ""

    private let p2pService = P2PAPIService.shared

    // Google Client ID from GoogleService-Info.plist
    private let googleClientID = "107524350806-ign58n65jrc4i0ab8audp3qgp24b37if.apps.googleusercontent.com"

    init() {
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
        print("AuthViewModel: signInWithGoogle() called")
        let config = GIDConfiguration(clientID: googleClientID)
        GIDSignIn.sharedInstance.configuration = config
        print("AuthViewModel: Google client ID configured: \(googleClientID)")

        guard let topViewController = getTopViewController() else {
            print("AuthViewModel: ERROR - Unable to get top view controller")
            errorMessage = "Unable to get view controller for sign-in"
            return
        }

        print("AuthViewModel: Got top view controller: \(type(of: topViewController)), starting Google Sign-In...")

        isLoading = true
        errorMessage = nil

        GIDSignIn.sharedInstance.signIn(withPresenting: topViewController) { [weak self] result, error in
            print("AuthViewModel: Google Sign-In callback received")
            guard let self = self else { return }

            if let error = error {
                print("AuthViewModel: Google Sign-In error: \(error.localizedDescription)")
                DispatchQueue.main.async {
                    self.isLoading = false
                    self.errorMessage = error.localizedDescription
                }
                return
            }

            guard let user = result?.user else {
                print("AuthViewModel: ERROR - No user in Google Sign-In result")
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

            print("AuthViewModel: Got Google user - email: \(googleEmail), name: \(googleName)")

            // Use the dedicated Google OAuth endpoint - handles both login and registration
            print("AuthViewModel: Calling P2P backend for Google auth...")
            self.p2pService.customerGoogleAuth(
                email: googleEmail,
                name: googleName,
                googleId: googleUserId
            ) { result in
                DispatchQueue.main.async {
                    self.isLoading = false
                    switch result {
                    case .success(let response):
                        print("AuthViewModel: P2P Google auth SUCCESS - name: \(response.fullName), email: \(response.email)")
                        self.customerName = response.fullName
                        self.customerEmail = response.email
                        self.isAuthenticated = true
                    case .failure(let error):
                        print("AuthViewModel: P2P Google auth FAILED - \(error.localizedDescription)")
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
}
