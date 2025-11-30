import SwiftUI
import FirebaseAuth
import FirebaseFirestore
import FirebaseCore
import GoogleSignIn

struct LoginView: View {
    @State private var email = ""
    @State private var password = ""
    @State private var errorMessage = ""
    @State private var isLoading = false
    @Binding var isLoggedIn: Bool
    
    var body: some View {
        NavigationView {
            VStack(spacing: 20) {
                Image(systemName: "fork.knife.circle.fill")
                    .resizable()
                    .scaledToFit()
                    .frame(width: 100, height: 100)
                    .foregroundColor(.orange)
                    .padding(.bottom, 20)
                
                Text("Restaurant Partner")
                    .font(.largeTitle)
                    .fontWeight(.bold)
                
                TextField("Email", text: $email)
                    .textFieldStyle(RoundedBorderTextFieldStyle())
                    .autocapitalization(.none)
                    .keyboardType(.emailAddress)
                
                SecureField("Password", text: $password)
                    .textFieldStyle(RoundedBorderTextFieldStyle())
                
                if !errorMessage.isEmpty {
                    Text(errorMessage)
                        .foregroundColor(.red)
                        .font(.caption)
                }
                
                Button(action: login) {
                    if isLoading {
                        ProgressView()
                            .progressViewStyle(CircularProgressViewStyle(tint: .white))
                    } else {
                        Text("Log In")
                            .fontWeight(.bold)
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(Color.orange)
                            .cornerRadius(10)
                    }
                }
                .disabled(isLoading)
                
                // Google Sign-In Button
                Button(action: googleLogin) {
                    HStack {
                        Image(systemName: "globe") // Placeholder for Google Logo
                        Text("Sign in with Google")
                            .fontWeight(.semibold)
                    }
                    .foregroundColor(.black)
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color.white)
                    .cornerRadius(10)
                    .overlay(
                        RoundedRectangle(cornerRadius: 10)
                            .stroke(Color.gray, lineWidth: 1)
                    )
                }
                .disabled(isLoading)
                
                Button(action: signUp) {
                    Text("Create Account")
                        .fontWeight(.semibold)
                        .foregroundColor(.orange)
                }
                .padding(.top)
                
                Spacer()
            }
            .padding()
            .navigationBarHidden(true)
        }
    }
    
    func login() {
        guard !email.isEmpty, !password.isEmpty else {
            errorMessage = "Please fill in all fields"
            return
        }
        
        isLoading = true
        errorMessage = ""
        
        Auth.auth().signIn(withEmail: email, password: password) { result, error in
            isLoading = false
            if let error = error {
                errorMessage = error.localizedDescription
            } else {
                isLoggedIn = true
            }
        }
    }
    
    func googleLogin() {
        guard let clientID = FirebaseApp.app()?.options.clientID else { return }
        let config = GIDConfiguration(clientID: clientID)
        GIDSignIn.sharedInstance.configuration = config
        
        guard let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
              let rootViewController = windowScene.windows.first?.rootViewController else { return }
        
        isLoading = true
        GIDSignIn.sharedInstance.signIn(withPresenting: rootViewController) { result, error in
            if let error = error {
                isLoading = false
                errorMessage = error.localizedDescription
                return
            }
            
            guard let user = result?.user,
                  let idToken = user.idToken?.tokenString else {
                isLoading = false
                return
            }
            
            let credential = GoogleAuthProvider.credential(withIDToken: idToken,
                                                           accessToken: user.accessToken.tokenString)
            
            Auth.auth().signIn(with: credential) { result, error in
                isLoading = false
                if let error = error {
                    errorMessage = error.localizedDescription
                } else {
                    if let uid = result?.user.uid {
                        // Check if restaurant exists, if not create
                        let db = Firestore.firestore()
                        db.collection("restaurants").document(uid).getDocument { doc, error in
                            if let doc = doc, !doc.exists {
                                createRestaurantProfile(uid: uid)
                            }
                        }
                    }
                    isLoggedIn = true
                }
            }
        }
    }
    
    func signUp() {
        guard !email.isEmpty, !password.isEmpty else {
            errorMessage = "Please fill in all fields"
            return
        }
        
        isLoading = true
        errorMessage = ""
        
        Auth.auth().createUser(withEmail: email, password: password) { result, error in
            isLoading = false
            if let error = error {
                errorMessage = error.localizedDescription
            } else {
                if let uid = result?.user.uid {
                    createRestaurantProfile(uid: uid)
                }
                isLoggedIn = true
            }
        }
    }
    
    func createRestaurantProfile(uid: String) {
        let db = Firestore.firestore()
        let newRestaurant: [String: Any] = [
            "name": "New Restaurant",
            "ownerId": uid,
            "isAvailable": true,
            "rating": 5.0
        ]
        db.collection("restaurants").document(uid).setData(newRestaurant)
    }
}
