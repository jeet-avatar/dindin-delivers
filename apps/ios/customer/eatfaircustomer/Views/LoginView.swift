import SwiftUI
import AuthenticationServices
import EatFairShared

// Brand Colors matching ChatGPT/Claude style
private let primaryGreen = Color(hex: "10A37F")
private let darkGreen = Color(hex: "0D8A6A")
private let textPrimary = Color(hex: "202123")
private let textSecondary = Color(hex: "6E6E80")
private let borderColor = Color(hex: "C5C5D2")
private let backgroundGrey = Color(hex: "F7F7F8")

struct LoginView: View {
    @ObservedObject var authViewModel: AuthViewModel
    @State private var email = ""
    @State private var password = ""
    @State private var isSignUp = false
    @State private var fullName = ""
    @State private var phone = ""

    var body: some View {
        ZStack {
            Color.white.edgesIgnoringSafeArea(.all)

            ScrollView {
                VStack(spacing: 0) {
                    Spacer().frame(height: 60)

                    // Logo Section
                    Circle()
                        .fill(primaryGreen)
                        .frame(width: 48, height: 48)
                        .overlay(
                            Text("$")
                                .font(.system(size: 24, weight: .bold))
                                .foregroundColor(.white)
                        )

                    Text("Dollor.ai")
                        .font(.system(size: 24, weight: .semibold))
                        .foregroundColor(textPrimary)
                        .padding(.top, 12)

                    Spacer().frame(height: 32)

                    // Header
                    Text(isSignUp ? "Create your account" : "Welcome back")
                        .font(.system(size: 28, weight: .semibold))
                        .foregroundColor(textPrimary)

                    Text(isSignUp ? "Start riding with just $1 platform fee" : "Log in to continue to Dollor.ai")
                        .font(.system(size: 15))
                        .foregroundColor(textSecondary)
                        .padding(.top, 8)

                    Spacer().frame(height: 28)

                    // Social Login Buttons
                    VStack(spacing: 12) {
                        // Apple Sign In Button (Black)
                        Button(action: {
                            authViewModel.signInWithApple()
                        }) {
                            HStack(spacing: 12) {
                                if authViewModel.isLoading {
                                    ProgressView()
                                        .progressViewStyle(CircularProgressViewStyle(tint: .white))
                                } else {
                                    Image(systemName: "apple.logo")
                                        .font(.system(size: 18))
                                    Text("Continue with Apple")
                                        .font(.system(size: 16, weight: .medium))
                                }
                            }
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .frame(height: 52)
                            .background(Color.black)
                            .cornerRadius(6)
                        }
                        .disabled(authViewModel.isLoading)

                        // Google Sign In Button (White with border)
                        Button(action: {
                            authViewModel.signInWithGoogle()
                        }) {
                            HStack(spacing: 12) {
                                if authViewModel.isLoading {
                                    ProgressView()
                                        .progressViewStyle(CircularProgressViewStyle())
                                } else {
                                    Text("G")
                                        .font(.system(size: 18, weight: .bold))
                                        .foregroundColor(Color(hex: "DB4437"))
                                    Text("Continue with Google")
                                        .font(.system(size: 16, weight: .medium))
                                        .foregroundColor(textPrimary)
                                }
                            }
                            .frame(maxWidth: .infinity)
                            .frame(height: 52)
                            .background(Color.white)
                            .overlay(
                                RoundedRectangle(cornerRadius: 6)
                                    .stroke(borderColor, lineWidth: 1)
                            )
                            .cornerRadius(6)
                        }
                        .disabled(authViewModel.isLoading)
                    }
                    .padding(.horizontal, 24)

                    // Divider with "or"
                    HStack {
                        Rectangle()
                            .fill(borderColor)
                            .frame(height: 1)
                        Text("or")
                            .font(.system(size: 13))
                            .foregroundColor(textSecondary)
                            .padding(.horizontal, 16)
                        Rectangle()
                            .fill(borderColor)
                            .frame(height: 1)
                    }
                    .padding(.horizontal, 24)
                    .padding(.vertical, 20)

                    // Input Fields
                    VStack(spacing: 16) {
                        if isSignUp {
                            AuthTextField(
                                text: $fullName,
                                placeholder: "Full name",
                                icon: "person",
                                keyboardType: .default
                            )

                            AuthTextField(
                                text: $phone,
                                placeholder: "Phone number",
                                icon: "phone",
                                keyboardType: .phonePad
                            )
                        }

                        AuthTextField(
                            text: $email,
                            placeholder: "Email address",
                            icon: "envelope",
                            keyboardType: .emailAddress
                        )
                        .autocapitalization(.none)

                        AuthSecureField(
                            text: $password,
                            placeholder: "Password"
                        )
                    }
                    .padding(.horizontal, 24)

                    // Forgot Password Link (only show on login)
                    if !isSignUp {
                        HStack {
                            Spacer()
                            Button(action: {
                                authViewModel.showForgotPassword = true
                            }) {
                                Text("Forgot password?")
                                    .font(.system(size: 14, weight: .medium))
                                    .foregroundColor(primaryGreen)
                            }
                        }
                        .padding(.horizontal, 24)
                        .padding(.top, 4)
                    }

                    // Login/Sign Up Button
                    Button(action: {
                        if isSignUp {
                            authViewModel.register(email: email, password: password, fullName: fullName, phone: phone)
                        } else {
                            authViewModel.login(email: email, password: password)
                        }
                    }) {
                        if authViewModel.isLoading {
                            ProgressView()
                                .progressViewStyle(CircularProgressViewStyle(tint: .white))
                        } else {
                            Text(isSignUp ? "Create account" : "Continue")
                                .font(.system(size: 16, weight: .semibold))
                        }
                    }
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .frame(height: 52)
                    .background(primaryGreen)
                    .cornerRadius(6)
                    .padding(.horizontal, 24)
                    .padding(.top, isSignUp ? 24 : 16)
                    .disabled(authViewModel.isLoading)

                    // Error Message
                    if let errorMessage = authViewModel.errorMessage {
                        Text(errorMessage)
                            .font(.system(size: 14))
                            .foregroundColor(Color(hex: "EF4444"))
                            .multilineTextAlignment(.center)
                            .padding(.horizontal, 24)
                            .padding(.top, 12)
                    }

                    // Success Message
                    if authViewModel.passwordResetSuccess {
                        Text("Password reset successful! You can now login.")
                            .font(.system(size: 14))
                            .foregroundColor(.green)
                            .multilineTextAlignment(.center)
                            .padding(.horizontal, 24)
                            .padding(.top, 12)
                    }

                    // Toggle Login/Sign Up
                    HStack(spacing: 4) {
                        Text(isSignUp ? "Already have an account?" : "Don't have an account?")
                            .font(.system(size: 14))
                            .foregroundColor(textSecondary)
                        Button(action: {
                            withAnimation {
                                isSignUp.toggle()
                                authViewModel.errorMessage = nil
                            }
                        }) {
                            Text(isSignUp ? "Log in" : "Sign up")
                                .font(.system(size: 14, weight: .semibold))
                                .foregroundColor(primaryGreen)
                        }
                    }
                    .padding(.top, 24)

                    // Fee Info Badge
                    HStack(spacing: 12) {
                        Circle()
                            .fill(primaryGreen)
                            .frame(width: 32, height: 32)
                            .overlay(
                                Text("$1")
                                    .font(.system(size: 12, weight: .bold))
                                    .foregroundColor(.white)
                            )
                        Text("flat platform fee. 100% tips go to drivers.")
                            .font(.system(size: 13))
                            .foregroundColor(textSecondary)
                    }
                    .padding(.horizontal, 16)
                    .padding(.vertical, 12)
                    .background(backgroundGrey)
                    .cornerRadius(8)
                    .padding(.horizontal, 24)
                    .padding(.top, 32)

                    // Footer Links
                    HStack(spacing: 8) {
                        Text("Terms of Use")
                            .font(.system(size: 13))
                            .foregroundColor(textSecondary)
                        Text("·")
                            .font(.system(size: 13))
                            .foregroundColor(borderColor)
                        Text("Privacy Policy")
                            .font(.system(size: 13))
                            .foregroundColor(textSecondary)
                    }
                    .padding(.top, 32)
                    .padding(.bottom, 24)
                }
            }
        }
        // Forgot Password Sheet
        .sheet(isPresented: $authViewModel.showForgotPassword) {
            ForgotPasswordView(authViewModel: authViewModel)
        }
        // Reset Code Entry Sheet
        .sheet(isPresented: $authViewModel.showResetCodeEntry) {
            ResetCodeEntryView(authViewModel: authViewModel)
        }
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
                .foregroundColor(textSecondary)
                .frame(width: 20)

            TextField(placeholder, text: $text)
                .font(.system(size: 16))
                .foregroundColor(textPrimary)
                .keyboardType(keyboardType)
        }
        .padding(.horizontal, 16)
        .frame(height: 52)
        .background(Color.white)
        .overlay(
            RoundedRectangle(cornerRadius: 6)
                .stroke(borderColor, lineWidth: 1)
        )
        .cornerRadius(6)
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
                .foregroundColor(textSecondary)
                .frame(width: 20)

            SecureField(placeholder, text: $text)
                .font(.system(size: 16))
                .foregroundColor(textPrimary)
        }
        .padding(.horizontal, 16)
        .frame(height: 52)
        .background(Color.white)
        .overlay(
            RoundedRectangle(cornerRadius: 6)
                .stroke(borderColor, lineWidth: 1)
        )
        .cornerRadius(6)
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
                Color.white.edgesIgnoringSafeArea(.all)

                VStack(spacing: 24) {
                    Text("Reset Password")
                        .font(.system(size: 24, weight: .semibold))
                        .foregroundColor(textPrimary)
                        .padding(.top, 30)

                    Text("Enter your email address and we'll send you a code to reset your password.")
                        .font(.system(size: 15))
                        .foregroundColor(textSecondary)
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
                            .foregroundColor(Color(hex: "EF4444"))
                            .padding(.horizontal, 24)
                    }

                    Button(action: {
                        authViewModel.requestPasswordReset(email: resetEmail)
                    }) {
                        if authViewModel.isLoading {
                            ProgressView()
                                .progressViewStyle(CircularProgressViewStyle(tint: .white))
                        } else {
                            Text("Send Reset Code")
                                .font(.system(size: 16, weight: .semibold))
                        }
                    }
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .frame(height: 52)
                    .background(primaryGreen)
                    .cornerRadius(6)
                    .padding(.horizontal, 24)
                    .disabled(authViewModel.isLoading || resetEmail.isEmpty)

                    Spacer()
                }
            }
            .navigationBarItems(trailing: Button("Cancel") {
                authViewModel.resetPasswordResetState()
                dismiss()
            }
            .foregroundColor(primaryGreen))
        }
    }
}

// MARK: - Reset Code Entry View
struct ResetCodeEntryView: View {
    @ObservedObject var authViewModel: AuthViewModel
    @Environment(\.dismiss) var dismiss

    var body: some View {
        NavigationView {
            ZStack {
                Color.white.edgesIgnoringSafeArea(.all)

                VStack(spacing: 24) {
                    Text("Enter Reset Code")
                        .font(.system(size: 24, weight: .semibold))
                        .foregroundColor(textPrimary)
                        .padding(.top, 30)

                    Text("We sent a code to \(authViewModel.resetEmail). Enter it below along with your new password.")
                        .font(.system(size: 15))
                        .foregroundColor(textSecondary)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 24)

                    AuthTextField(
                        text: $authViewModel.resetCode,
                        placeholder: "Reset Code",
                        icon: "number",
                        keyboardType: .numberPad
                    )
                    .padding(.horizontal, 24)

                    AuthSecureField(
                        text: $authViewModel.newPassword,
                        placeholder: "New Password"
                    )
                    .padding(.horizontal, 24)

                    if let errorMessage = authViewModel.errorMessage {
                        Text(errorMessage)
                            .font(.system(size: 14))
                            .foregroundColor(Color(hex: "EF4444"))
                            .padding(.horizontal, 24)
                    }

                    Button(action: {
                        authViewModel.confirmPasswordReset()
                    }) {
                        if authViewModel.isLoading {
                            ProgressView()
                                .progressViewStyle(CircularProgressViewStyle(tint: .white))
                        } else {
                            Text("Reset Password")
                                .font(.system(size: 16, weight: .semibold))
                        }
                    }
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .frame(height: 52)
                    .background(primaryGreen)
                    .cornerRadius(6)
                    .padding(.horizontal, 24)
                    .disabled(authViewModel.isLoading || authViewModel.resetCode.isEmpty || authViewModel.newPassword.isEmpty)

                    Spacer()
                }
            }
            .navigationBarItems(trailing: Button("Cancel") {
                authViewModel.resetPasswordResetState()
                dismiss()
            }
            .foregroundColor(primaryGreen))
            .onChange(of: authViewModel.passwordResetSuccess) { oldValue, newValue in
                if newValue {
                    dismiss()
                }
            }
        }
    }
}
