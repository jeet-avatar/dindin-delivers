import SwiftUI
import AuthenticationServices
import EatFairShared

// MARK: - Dollor Luxury Theme (black + orange)
// Orange is the brand accent (matches the orange smiley ID stickers on driver cars).
private let lxBlack        = Color(hex: "0B0B0D")   // page canvas
private let lxSurface      = Color(hex: "17171A")   // inputs / cards
private let lxSurface2     = Color(hex: "202024")   // elevated
private let lxHairline     = Color(hex: "2A2A2E")   // borders / dividers
private let lxOrange       = Color(hex: "FF7A1A")   // primary accent
private let lxOrangeBright = Color(hex: "FF9A3D")   // gradient top / highlight
private let lxOrangeDeep   = Color(hex: "E85D04")   // pressed
private let lxText         = Color.white            // primary text
private let lxTextSecondary = Color(hex: "A1A1AA")  // secondary text
private let lxTextMuted    = Color(hex: "6E6E78")   // muted / placeholders
private let lxError        = Color(hex: "FF453A")
private let lxSuccess      = Color(hex: "30D158")

struct LoginView: View {
    @ObservedObject var authViewModel: AuthViewModel
    @State private var email = ""
    @State private var password = ""
    @State private var isSignUp = false
    @State private var fullName = ""
    @State private var phone = ""
    @State private var emailError: String?

    var body: some View {
        ZStack {
            lxBlack.ignoresSafeArea()

            // Subtle orange glow at the top for depth
            RadialGradient(
                colors: [lxOrange.opacity(0.18), Color.clear],
                center: .top, startRadius: 0, endRadius: 420
            )
            .ignoresSafeArea()
            .allowsHitTesting(false)

            ScrollView(showsIndicators: false) {
                VStack(spacing: 0) {
                    Spacer().frame(height: 56)
                    brandMark
                    Spacer().frame(height: 30)
                    header
                    Spacer().frame(height: 28)
                    socialButtons
                    orDivider
                    inputFields
                    forgotPassword
                    primaryButton
                    messages
                    toggleAuth
                    trustLine
                    #if DEBUG
                    demoButton
                    #endif
                    footerLinks
                }
            }
        }
        .preferredColorScheme(.dark)
        .sheet(isPresented: $authViewModel.showForgotPassword) {
            ForgotPasswordView(authViewModel: authViewModel)
        }
        .sheet(isPresented: $authViewModel.showResetCodeEntry) {
            ResetCodeEntryView(authViewModel: authViewModel)
        }
    }

    // MARK: Brand mark (orange smiley + wordmark)
    private var brandMark: some View {
        VStack(spacing: 14) {
            ZStack {
                RoundedRectangle(cornerRadius: 22, style: .continuous)
                    .fill(LinearGradient(colors: [lxOrangeBright, lxOrange],
                                         startPoint: .topLeading, endPoint: .bottomTrailing))
                    .frame(width: 74, height: 74)
                    .shadow(color: lxOrange.opacity(0.5), radius: 20, y: 8)
                Image(systemName: "face.smiling.fill")
                    .font(.system(size: 40, weight: .medium))
                    .foregroundColor(lxBlack)
            }
            HStack(spacing: 0) {
                Text("Dollor").foregroundColor(lxText)
                Text(".ai").foregroundColor(lxOrange)
            }
            .font(.system(size: 26, weight: .bold))
            .tracking(0.5)
        }
    }

    // MARK: Header
    private var header: some View {
        VStack(spacing: 8) {
            Text(isSignUp ? "Create your account" : "Welcome back")
                .font(.system(size: 30, weight: .bold))
                .foregroundColor(lxText)
            Text(isSignUp ? "Ride for a flat $1 platform fee." : "Sign in to continue")
                .font(.system(size: 15))
                .foregroundColor(lxTextSecondary)
        }
    }

    // MARK: Social login
    private var socialButtons: some View {
        VStack(spacing: 12) {
            // Apple (white button is the HIG variant on dark backgrounds)
            Button(action: { authViewModel.signInWithApple() }) {
                HStack(spacing: 10) {
                    if authViewModel.isLoading {
                        ProgressView().tint(.black)
                    } else {
                        Image(systemName: "apple.logo").font(.system(size: 18))
                        Text("Continue with Apple").font(.system(size: 16, weight: .semibold))
                    }
                }
                .foregroundColor(.black)
                .frame(maxWidth: .infinity)
                .frame(height: 54)
                .background(Color.white)
                .cornerRadius(14)
            }
            .disabled(authViewModel.isLoading)
            .accessibilityLabel("Sign in with Apple")
            .accessibilityHint("Uses your Apple ID to sign in securely")

            // Google (dark surface + brand-blue G)
            Button(action: { authViewModel.signInWithGoogle() }) {
                HStack(spacing: 10) {
                    if authViewModel.isLoading {
                        ProgressView().tint(.white)
                    } else {
                        Text("G")
                            .font(.system(size: 18, weight: .bold))
                            .foregroundColor(Color(hex: "4285F4"))
                        Text("Continue with Google")
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundColor(lxText)
                    }
                }
                .frame(maxWidth: .infinity)
                .frame(height: 54)
                .background(lxSurface)
                .overlay(RoundedRectangle(cornerRadius: 14).stroke(lxHairline, lineWidth: 1))
                .cornerRadius(14)
            }
            .disabled(authViewModel.isLoading)
            .accessibilityLabel("Sign in with Google")
            .accessibilityHint("Uses your Google account to sign in")
        }
        .padding(.horizontal, 24)
    }

    // MARK: "or" divider
    private var orDivider: some View {
        HStack {
            Rectangle().fill(lxHairline).frame(height: 1)
            Text("or")
                .font(.system(size: 13))
                .foregroundColor(lxTextMuted)
                .padding(.horizontal, 14)
            Rectangle().fill(lxHairline).frame(height: 1)
        }
        .padding(.horizontal, 24)
        .padding(.vertical, 22)
    }

    // MARK: Inputs
    private var inputFields: some View {
        VStack(spacing: 14) {
            if isSignUp {
                AuthTextField(text: $fullName, placeholder: "Full name",
                              icon: "person", keyboardType: .default)
                AuthTextField(text: $phone, placeholder: "Phone number",
                              icon: "phone", keyboardType: .phonePad)
            }

            VStack(alignment: .leading, spacing: 6) {
                AuthTextField(text: $email, placeholder: "Email address",
                              icon: "envelope", keyboardType: .emailAddress)
                    .autocapitalization(.none)
                    .onChange(of: email) { emailError = nil }

                if let error = emailError {
                    Text(error)
                        .font(.system(size: 12))
                        .foregroundColor(lxError)
                        .padding(.leading, 4)
                }
            }

            AuthSecureField(text: $password, placeholder: "Password")
        }
        .padding(.horizontal, 24)
    }

    // MARK: Forgot password
    @ViewBuilder private var forgotPassword: some View {
        if !isSignUp {
            HStack {
                Spacer()
                Button(action: { authViewModel.showForgotPassword = true }) {
                    Text("Forgot password?")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundColor(lxOrange)
                }
                .accessibilityLabel("Forgot password")
                .accessibilityHint("Opens password reset form")
            }
            .padding(.horizontal, 24)
            .padding(.top, 10)
        }
    }

    // MARK: Primary CTA
    private var primaryButton: some View {
        Button(action: {
            let validation = EmailValidator.validate(email)
            guard validation.isValid else {
                emailError = validation.errorMessage
                return
            }
            if isSignUp {
                authViewModel.register(email: email, password: password, fullName: fullName, phone: phone)
            } else {
                authViewModel.login(email: email, password: password)
            }
        }) {
            Group {
                if authViewModel.isLoading {
                    ProgressView().tint(.white)
                } else {
                    Text(isSignUp ? "Create account" : "Continue")
                        .font(.system(size: 16, weight: .bold))
                }
            }
            .foregroundColor(.white)
            .frame(maxWidth: .infinity)
            .frame(height: 54)
            .background(
                LinearGradient(colors: [lxOrangeBright, lxOrange],
                               startPoint: .top, endPoint: .bottom)
            )
            .cornerRadius(14)
            .shadow(color: lxOrange.opacity(0.45), radius: 16, y: 8)
        }
        .padding(.horizontal, 24)
        .padding(.top, isSignUp ? 22 : 18)
        .disabled(authViewModel.isLoading)
        .accessibilityLabel(isSignUp ? "Create account" : "Continue to sign in")
        .accessibilityHint(isSignUp ? "Creates your new account" : "Signs in with your email and password")
    }

    // MARK: Error / success messages
    @ViewBuilder private var messages: some View {
        if let errorMessage = authViewModel.errorMessage {
            Text(errorMessage)
                .font(.system(size: 14))
                .foregroundColor(lxError)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 24)
                .padding(.top, 14)
        }
        if authViewModel.passwordResetSuccess {
            Text("Password reset successful! You can now log in.")
                .font(.system(size: 14))
                .foregroundColor(lxSuccess)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 24)
                .padding(.top, 14)
        }
    }

    // MARK: Toggle login / sign up
    private var toggleAuth: some View {
        HStack(spacing: 5) {
            Text(isSignUp ? "Already have an account?" : "Don't have an account?")
                .font(.system(size: 14))
                .foregroundColor(lxTextSecondary)
            Button(action: {
                withAnimation {
                    isSignUp.toggle()
                    authViewModel.errorMessage = nil
                }
            }) {
                Text(isSignUp ? "Log in" : "Sign up")
                    .font(.system(size: 14, weight: .bold))
                    .foregroundColor(lxOrange)
            }
            .accessibilityLabel(isSignUp ? "Switch to log in" : "Switch to sign up")
            .accessibilityHint(isSignUp ? "Shows the login form" : "Shows the registration form")
        }
        .padding(.top, 24)
    }

    // MARK: Trust line (replaces the bubbly $1 badge)
    private var trustLine: some View {
        HStack(spacing: 10) {
            Image(systemName: "checkmark.seal.fill")
                .font(.system(size: 15))
                .foregroundColor(lxOrange)
            Text("Flat $1 platform fee · 100% of tips go to drivers")
                .font(.system(size: 13, weight: .medium))
                .foregroundColor(lxTextSecondary)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .frame(maxWidth: .infinity)
        .background(lxSurface)
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(lxHairline, lineWidth: 1))
        .cornerRadius(12)
        .padding(.horizontal, 24)
        .padding(.top, 28)
    }

    // MARK: Demo login (DEBUG only)
    #if DEBUG
    private var demoButton: some View {
        Button(action: {
            email = "demo.customer@dollor.ai"
            password = "DemoCustomer2025!"
            authViewModel.login(email: email, password: password)
        }) {
            HStack(spacing: 8) {
                Image(systemName: "play.circle").font(.system(size: 15))
                Text("Demo Login (Testing)").font(.system(size: 14, weight: .medium))
            }
            .foregroundColor(lxTextSecondary)
            .frame(maxWidth: .infinity)
            .frame(height: 46)
            .overlay(RoundedRectangle(cornerRadius: 12).stroke(lxHairline, lineWidth: 1))
        }
        .padding(.horizontal, 24)
        .padding(.top, 14)
        .accessibilityLabel("Demo login for testing")
        .accessibilityHint("Signs in with demo account credentials")
    }
    #endif

    // MARK: Footer links
    private var footerLinks: some View {
        HStack(spacing: 8) {
            Link("Terms of Use", destination: URL(string: AppConstants.termsOfServiceURL)!)
                .foregroundColor(lxTextSecondary)
            Text("·").foregroundColor(lxTextMuted)
            Link("Privacy Policy", destination: URL(string: AppConstants.privacyPolicyURL)!)
                .foregroundColor(lxTextSecondary)
        }
        .font(.system(size: 13))
        .padding(.top, 18)
        .padding(.bottom, 28)
    }
}

// MARK: - Auth Text Field Component
struct AuthTextField: View {
    @Binding var text: String
    let placeholder: String
    let icon: String
    var keyboardType: UIKeyboardType = .default

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .font(.system(size: 16))
                .foregroundColor(lxTextMuted)
                .frame(width: 20)

            TextField("", text: $text, prompt: Text(placeholder).foregroundColor(lxTextMuted))
                .font(.system(size: 16))
                .foregroundColor(lxText)
                .keyboardType(keyboardType)
        }
        .padding(.horizontal, 16)
        .frame(height: 54)
        .background(lxSurface)
        .overlay(RoundedRectangle(cornerRadius: 14).stroke(lxHairline, lineWidth: 1))
        .cornerRadius(14)
    }
}

// MARK: - Auth Secure Field Component
struct AuthSecureField: View {
    @Binding var text: String
    let placeholder: String

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: "lock")
                .font(.system(size: 16))
                .foregroundColor(lxTextMuted)
                .frame(width: 20)

            SecureField("", text: $text, prompt: Text(placeholder).foregroundColor(lxTextMuted))
                .font(.system(size: 16))
                .foregroundColor(lxText)
        }
        .padding(.horizontal, 16)
        .frame(height: 54)
        .background(lxSurface)
        .overlay(RoundedRectangle(cornerRadius: 14).stroke(lxHairline, lineWidth: 1))
        .cornerRadius(14)
    }
}

// MARK: - Color Extension for Hex
extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 3: // RGB (12-bit)
            (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6: // RGB (24-bit)
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8: // ARGB (32-bit)
            (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            (a, r, g, b) = (1, 1, 1, 0)
        }
        self.init(
            .sRGB,
            red: Double(r) / 255,
            green: Double(g) / 255,
            blue:  Double(b) / 255,
            opacity: Double(a) / 255
        )
    }
}

// MARK: - Forgot Password View
struct ForgotPasswordView: View {
    @ObservedObject var authViewModel: AuthViewModel
    @State private var resetEmail = ""
    @Environment(\.dismiss) var dismiss

    var body: some View {
        NavigationView {
            ZStack {
                lxBlack.ignoresSafeArea()

                VStack(spacing: 24) {
                    Text("Reset password")
                        .font(.system(size: 24, weight: .bold))
                        .foregroundColor(lxText)
                        .padding(.top, 30)

                    Text("Enter your email address and we'll send you a code to reset your password.")
                        .font(.system(size: 15))
                        .foregroundColor(lxTextSecondary)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 24)

                    AuthTextField(
                        text: $resetEmail,
                        placeholder: "Email address",
                        icon: "envelope",
                        keyboardType: .emailAddress
                    )
                    .autocapitalization(.none)
                    .padding(.horizontal, 24)

                    if let errorMessage = authViewModel.errorMessage {
                        Text(errorMessage)
                            .font(.system(size: 14))
                            .foregroundColor(lxError)
                            .padding(.horizontal, 24)
                    }

                    Button(action: {
                        authViewModel.requestPasswordReset(email: resetEmail)
                    }) {
                        Group {
                            if authViewModel.isLoading {
                                ProgressView().tint(.white)
                            } else {
                                Text("Send reset code")
                                    .font(.system(size: 16, weight: .bold))
                            }
                        }
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .frame(height: 54)
                        .background(LinearGradient(colors: [lxOrangeBright, lxOrange],
                                                   startPoint: .top, endPoint: .bottom))
                        .cornerRadius(14)
                        .shadow(color: lxOrange.opacity(0.4), radius: 14, y: 6)
                    }
                    .padding(.horizontal, 24)
                    .disabled(authViewModel.isLoading || resetEmail.isEmpty)
                    .accessibilityLabel("Send password reset code")
                    .accessibilityHint("Sends a reset code to your email address")

                    Spacer()
                }
            }
            .navigationBarItems(trailing: Button("Cancel") {
                authViewModel.resetPasswordResetState()
                dismiss()
            }
            .foregroundColor(lxOrange)
            .accessibilityLabel("Cancel password reset"))
        }
        .preferredColorScheme(.dark)
    }
}

// MARK: - Reset Code Entry View
struct ResetCodeEntryView: View {
    @ObservedObject var authViewModel: AuthViewModel
    @Environment(\.dismiss) var dismiss

    var body: some View {
        NavigationView {
            ZStack {
                lxBlack.ignoresSafeArea()

                VStack(spacing: 24) {
                    Text("Enter reset code")
                        .font(.system(size: 24, weight: .bold))
                        .foregroundColor(lxText)
                        .padding(.top, 30)

                    Text("We sent a code to \(authViewModel.resetEmail). Enter it below along with your new password.")
                        .font(.system(size: 15))
                        .foregroundColor(lxTextSecondary)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 24)

                    AuthTextField(
                        text: $authViewModel.resetCode,
                        placeholder: "Reset code",
                        icon: "number",
                        keyboardType: .numberPad
                    )
                    .padding(.horizontal, 24)

                    AuthSecureField(
                        text: $authViewModel.newPassword,
                        placeholder: "New password"
                    )
                    .padding(.horizontal, 24)

                    if let errorMessage = authViewModel.errorMessage {
                        Text(errorMessage)
                            .font(.system(size: 14))
                            .foregroundColor(lxError)
                            .padding(.horizontal, 24)
                    }

                    Button(action: {
                        authViewModel.confirmPasswordReset()
                    }) {
                        Group {
                            if authViewModel.isLoading {
                                ProgressView().tint(.white)
                            } else {
                                Text("Reset password")
                                    .font(.system(size: 16, weight: .bold))
                            }
                        }
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .frame(height: 54)
                        .background(LinearGradient(colors: [lxOrangeBright, lxOrange],
                                                   startPoint: .top, endPoint: .bottom))
                        .cornerRadius(14)
                        .shadow(color: lxOrange.opacity(0.4), radius: 14, y: 6)
                    }
                    .padding(.horizontal, 24)
                    .disabled(authViewModel.isLoading || authViewModel.resetCode.isEmpty || authViewModel.newPassword.isEmpty)
                    .accessibilityLabel("Reset password")
                    .accessibilityHint("Confirms your new password using the reset code")

                    Spacer()
                }
            }
            .navigationBarItems(trailing: Button("Cancel") {
                authViewModel.resetPasswordResetState()
                dismiss()
            }
            .foregroundColor(lxOrange)
            .accessibilityLabel("Cancel reset code entry"))
            .onChange(of: authViewModel.passwordResetSuccess) { oldValue, newValue in
                if newValue {
                    dismiss()
                }
            }
        }
        .preferredColorScheme(.dark)
    }
}
