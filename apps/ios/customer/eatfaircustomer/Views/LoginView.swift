import SwiftUI

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

                // Error Message
                if let errorMessage = authViewModel.errorMessage {
                    Text(errorMessage)
                        .font(.caption)
                        .foregroundColor(.red)
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
    }
}
