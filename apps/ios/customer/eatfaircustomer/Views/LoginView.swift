import SwiftUI

struct LoginView: View {
    @ObservedObject var authViewModel: AuthViewModel
    @State private var email = ""
    @State private var password = ""
    
    var body: some View {
        ZStack {
            // Background
            Theme.brandGrey.edgesIgnoringSafeArea(.all)
            
            VStack(spacing: 25) {
                Spacer()
                
                // Header
                VStack(spacing: 10) {
                    Image(systemName: "fork.knife.circle.fill") // Placeholder Logo
                        .resizable()
                        .aspectRatio(contentMode: .fit)
                        .frame(width: 80, height: 80)
                        .foregroundColor(Theme.brandOrange)
                    
                    Text("EatFair")
                        .font(.system(size: 40, weight: .bold, design: .rounded))
                        .foregroundColor(Theme.brandBlack)
                    
                    Text("Food Delivery")
                        .font(.subheadline)
                        .foregroundColor(Theme.textGrey)
                }
                .padding(.bottom, 30)
                
                // Input Fields
                VStack(spacing: 15) {
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
                
                // Login Button
                Button(action: {
                    authViewModel.login(email: email, password: password)
                }) {
                    Text("Login")
                        .font(.headline)
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Theme.brandOrange)
                        .cornerRadius(12)
                        .shadow(color: Theme.brandOrange.opacity(0.3), radius: 10, x: 0, y: 5)
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
                    Text("Don't have an account?")
                        .foregroundColor(Theme.textGrey)
                    Button(action: {}) {
                        Text("Sign Up")
                            .fontWeight(.bold)
                            .foregroundColor(Theme.brandOrange)
                    }
                }
                .padding(.bottom, 30)
            }
        }
    }
}
