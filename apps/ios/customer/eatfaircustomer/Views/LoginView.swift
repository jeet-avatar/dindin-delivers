import SwiftUI
import AuthenticationServices
import EatFairShared

struct LoginView: View {
    @ObservedObject var authViewModel: AuthViewModel
    @State private var email = ""
    @State private var password = ""
    @State private var isSignUp = false
    @State private var fullName = ""
    @State private var phone = ""

    var body: some View {
        ZStack {
            // Background
            Theme.brandGrey.edgesIgnoringSafeArea(.all)
            
            VStack(spacing: 25) {
                Spacer()
                
                // Header
                VStack(spacing: 10) {
                    ZStack {
                        Circle()
                            .fill(Theme.brandGreen.opacity(0.15))
                            .frame(width: 100, height: 100)

                        Text("$")
                            .font(.system(size: 50, weight: .bold))
                            .foregroundColor(Theme.brandGreen)
                    }

                    Text("Dollor AI Service")
                        .font(.system(size: 32, weight: .bold, design: .rounded))
                        .foregroundColor(Theme.brandBlack)

                    Text("$ online store")
                        .font(.subheadline)
                        .foregroundColor(Theme.textGrey)
                }
                .padding(.bottom, isSignUp ? 15 : 30)
                
                // Input Fields
                VStack(spacing: 15) {
                    if isSignUp {
                        TextField("Full Name", text: $fullName)
                            .padding()
                            .background(Color.white)
                            .cornerRadius(12)
                            .shadow(color: Color.black.opacity(0.05), radius: 5, x: 0, y: 2)
                            .autocapitalization(.words)

                        TextField("Phone Number", text: $phone)
                            .padding()
                            .background(Color.white)
                            .cornerRadius(12)
                            .shadow(color: Color.black.opacity(0.05), radius: 5, x: 0, y: 2)
                            .keyboardType(.phonePad)
                    }

                    TextField("Email", text: $email)
                        .padding()
                        .background(Color.white)
                        .cornerRadius(12)
                        .shadow(color: Color.black.opacity(0.05), radius: 5, x: 0, y: 2)
                        .autocapitalization(.none)
                        .keyboardType(.emailAddress)

                    SecureField("Password", text: $password)
                        .padding()
                        .background(Color.white)
                        .cornerRadius(12)
                        .shadow(color: Color.black.opacity(0.05), radius: 5, x: 0, y: 2)
                }
                .padding(.horizontal, 30)
                
                // Login/Sign Up Button
                Button(action: {
                    if isSignUp {
                        authViewModel.register(email: email, password: password, fullName: fullName, phone: phone)
                    } else {
                        authViewModel.login(email: email, password: password)
                    }
                }) {
                    Text(isSignUp ? "Sign Up" : "Login")
                        .font(.headline)
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Theme.brandGreen)
                        .cornerRadius(12)
                        .shadow(color: Theme.brandGreen.opacity(0.3), radius: 10, x: 0, y: 5)
                }
                .padding(.horizontal, 30)
                .padding(.top, 10)
                
                // Apple Sign In Button (Required by App Store)
                Button(action: {
                    authViewModel.signInWithApple()
                }) {
                    HStack {
                        if authViewModel.isLoading {
                            ProgressView()
                                .progressViewStyle(CircularProgressViewStyle(tint: .white))
                        } else {
                            Image(systemName: "apple.logo")
                                .font(.title2)
                            Text("Sign in with Apple")
                                .font(.headline)
                        }
                    }
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .frame(height: 50)
                    .background(Color.black)
                    .cornerRadius(12)
                }
                .padding(.horizontal, 30)
                .disabled(authViewModel.isLoading)

                // Google Sign In Button
                Button(action: {
                    authViewModel.signInWithGoogle()
                }) {
                    HStack {
                        if authViewModel.isLoading {
                            ProgressView()
                                .progressViewStyle(CircularProgressViewStyle())
                        } else {
                            Image(systemName: "g.circle.fill") // Placeholder for Google Icon
                                .foregroundColor(.red)
                            Text("Sign in with Google")
                                .font(.headline)
                                .foregroundColor(Theme.brandBlack)
                        }
                    }
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color.white)
                    .cornerRadius(12)
                    .shadow(color: Color.black.opacity(0.05), radius: 5, x: 0, y: 2)
                }
                .padding(.horizontal, 30)
                .disabled(authViewModel.isLoading)

                // Forgot Password Link (only show on login)
                if !isSignUp {
                    Button(action: {
                        authViewModel.showForgotPassword = true
                    }) {
                        Text("Forgot Password?")
                            .font(.caption)
                            .foregroundColor(Theme.brandGreen)
                    }
                    .padding(.top, 5)
                }

                // Error Message
                if let errorMessage = authViewModel.errorMessage {
                    Text(errorMessage)
                        .font(.caption)
                        .foregroundColor(.red)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 30)
                        .padding(.top, 10)
                }

                // Success Message
                if authViewModel.passwordResetSuccess {
                    Text("Password reset successful! You can now login.")
                        .font(.caption)
                        .foregroundColor(.green)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 30)
                        .padding(.top, 10)
                }

                Spacer()
                
                // Footer
                HStack {
                    Text(isSignUp ? "Already have an account?" : "Don't have an account?")
                        .foregroundColor(Theme.textGrey)
                    Button(action: {
                        withAnimation {
                            isSignUp.toggle()
                            authViewModel.errorMessage = nil
                        }
                    }) {
                        Text(isSignUp ? "Login" : "Sign Up")
                            .fontWeight(.bold)
                            .foregroundColor(Theme.brandGreen)
                    }
                }
                .padding(.bottom, 30)
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

// MARK: - Forgot Password View
struct ForgotPasswordView: View {
    @ObservedObject var authViewModel: AuthViewModel
    @State private var resetEmail = ""
    @Environment(\.dismiss) var dismiss

    var body: some View {
        NavigationView {
            VStack(spacing: 25) {
                Text("Reset Password")
                    .font(.title2)
                    .fontWeight(.bold)
                    .padding(.top, 30)

                Text("Enter your email address and we'll send you a code to reset your password.")
                    .font(.subheadline)
                    .foregroundColor(Theme.textGrey)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 30)

                TextField("Email", text: $resetEmail)
                    .padding()
                    .background(Color.white)
                    .cornerRadius(12)
                    .shadow(color: Color.black.opacity(0.05), radius: 5, x: 0, y: 2)
                    .autocapitalization(.none)
                    .keyboardType(.emailAddress)
                    .padding(.horizontal, 30)

                if let errorMessage = authViewModel.errorMessage {
                    Text(errorMessage)
                        .font(.caption)
                        .foregroundColor(.red)
                        .padding(.horizontal, 30)
                }

                Button(action: {
                    authViewModel.requestPasswordReset(email: resetEmail)
                }) {
                    if authViewModel.isLoading {
                        ProgressView()
                            .progressViewStyle(CircularProgressViewStyle(tint: .white))
                    } else {
                        Text("Send Reset Code")
                    }
                }
                .font(.headline)
                .foregroundColor(.white)
                .frame(maxWidth: .infinity)
                .padding()
                .background(Theme.brandGreen)
                .cornerRadius(12)
                .padding(.horizontal, 30)
                .disabled(authViewModel.isLoading || resetEmail.isEmpty)

                Spacer()
            }
            .background(Theme.brandGrey.edgesIgnoringSafeArea(.all))
            .navigationBarItems(trailing: Button("Cancel") {
                authViewModel.resetPasswordResetState()
                dismiss()
            })
        }
    }
}

// MARK: - Reset Code Entry View
struct ResetCodeEntryView: View {
    @ObservedObject var authViewModel: AuthViewModel
    @Environment(\.dismiss) var dismiss

    var body: some View {
        NavigationView {
            VStack(spacing: 25) {
                Text("Enter Reset Code")
                    .font(.title2)
                    .fontWeight(.bold)
                    .padding(.top, 30)

                Text("We sent a code to \(authViewModel.resetEmail). Enter it below along with your new password.")
                    .font(.subheadline)
                    .foregroundColor(Theme.textGrey)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 30)

                TextField("Reset Code", text: $authViewModel.resetCode)
                    .padding()
                    .background(Color.white)
                    .cornerRadius(12)
                    .shadow(color: Color.black.opacity(0.05), radius: 5, x: 0, y: 2)
                    .keyboardType(.numberPad)
                    .padding(.horizontal, 30)

                SecureField("New Password", text: $authViewModel.newPassword)
                    .padding()
                    .background(Color.white)
                    .cornerRadius(12)
                    .shadow(color: Color.black.opacity(0.05), radius: 5, x: 0, y: 2)
                    .padding(.horizontal, 30)

                if let errorMessage = authViewModel.errorMessage {
                    Text(errorMessage)
                        .font(.caption)
                        .foregroundColor(.red)
                        .padding(.horizontal, 30)
                }

                Button(action: {
                    authViewModel.confirmPasswordReset()
                }) {
                    if authViewModel.isLoading {
                        ProgressView()
                            .progressViewStyle(CircularProgressViewStyle(tint: .white))
                    } else {
                        Text("Reset Password")
                    }
                }
                .font(.headline)
                .foregroundColor(.white)
                .frame(maxWidth: .infinity)
                .padding()
                .background(Theme.brandGreen)
                .cornerRadius(12)
                .padding(.horizontal, 30)
                .disabled(authViewModel.isLoading || authViewModel.resetCode.isEmpty || authViewModel.newPassword.isEmpty)

                Spacer()
            }
            .background(Theme.brandGrey.edgesIgnoringSafeArea(.all))
            .navigationBarItems(trailing: Button("Cancel") {
                authViewModel.resetPasswordResetState()
                dismiss()
            })
            .onChange(of: authViewModel.passwordResetSuccess) { oldValue, newValue in
                if newValue {
                    dismiss()
                }
            }
        }
    }
}
