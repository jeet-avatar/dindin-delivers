import SwiftUI
import FirebaseAuth
import FirebaseFirestore
import GoogleSignIn
import GoogleSignInSwift
import FirebaseCore

struct DriverLoginView: View {
    @State private var email = ""
    @State private var password = ""
    @State private var errorMessage = ""
    @State private var isLoading = false
    @State private var isSignUp = false
    
    var body: some View {
        VStack(spacing: 20) {
            Image(systemName: "bicycle.circle.fill")
                .resizable()
                .frame(width: 100, height: 100)
                .foregroundColor(Theme.brandGreen)
                .padding(.bottom, 40)
            
            Text("Driver Login")
                .font(.largeTitle)
                .fontWeight(.bold)
                .foregroundColor(Theme.brandBlack)
            
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
            
            Button(action: handleAction) {
                if isLoading {
                    ProgressView()
                        .progressViewStyle(CircularProgressViewStyle(tint: .white))
                } else {
                    Text(isSignUp ? "Sign Up" : "Login")
                        .fontWeight(.bold)
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Theme.brandGreen)
                        .cornerRadius(10)
                }
            }
            .disabled(isLoading)
            
            Button(action: { isSignUp.toggle() }) {
                Text(isSignUp ? "Already have an account? Login" : "Don't have an account? Sign Up")
                    .foregroundColor(Theme.brandGreen)
            }
            
            HStack {
                VStack { Divider() }
                Text("OR")
                    .foregroundColor(.gray)
                    .font(.caption)
                VStack { Divider() }
            }
            .padding(.vertical)
            
            GoogleSignInButton(action: handleGoogleLogin)
            
            Spacer()
        }
        .padding()
    }
    
    func handleGoogleLogin() {
        guard let clientID = FirebaseApp.app()?.options.clientID else { return }
        let config = GIDConfiguration(clientID: clientID)
        GIDSignIn.sharedInstance.configuration = config
        
        guard let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
              let rootViewController = windowScene.windows.first?.rootViewController else { return }
        
        GIDSignIn.sharedInstance.signIn(withPresenting: rootViewController) { result, error in
            if let error = error {
                self.errorMessage = error.localizedDescription
                return
            }
            
            guard let user = result?.user,
                  let idToken = user.idToken?.tokenString else { return }
            
            let credential = GoogleAuthProvider.credential(withIDToken: idToken,
                                                         accessToken: user.accessToken.tokenString)
            
            Auth.auth().signIn(with: credential) { result, error in
                if let error = error {
                    self.errorMessage = error.localizedDescription
                    return
                }
                
                // Check if driver profile exists, if not create it
                checkAndCreateDriverProfile()
            }
        }
    }
    
    func checkAndCreateDriverProfile() {
        guard let uid = Auth.auth().currentUser?.uid else { return }
        let db = Firestore.firestore()
        
        db.collection("users").document(uid).getDocument { snapshot, error in
            if let snapshot = snapshot, !snapshot.exists {
                // Create new driver profile
                let driverData: [String: Any] = [
                    "email": Auth.auth().currentUser?.email ?? "",
                    "role": "driver",
                    "createdAt": FieldValue.serverTimestamp(),
                    "isOnline": true
                ]
                db.collection("users").document(uid).setData(driverData)
            }
        }
    }
    
    func handleAction() {
        guard !email.isEmpty, !password.isEmpty else {
            errorMessage = "Please fill in all fields"
            return
        }
        
        isLoading = true
        errorMessage = ""
        
        if isSignUp {
            Auth.auth().createUser(withEmail: email, password: password) { result, error in
                isLoading = false
                if let error = error {
                    errorMessage = error.localizedDescription
                } else {
                    // Success, create driver profile in Firestore if needed
                    createDriverProfile()
                }
            }
        } else {
            Auth.auth().signIn(withEmail: email, password: password) { result, error in
                isLoading = false
                if let error = error {
                    errorMessage = error.localizedDescription
                }
            }
        }
    }
    
    func createDriverProfile() {
        guard let uid = Auth.auth().currentUser?.uid else { return }
        let db = Firestore.firestore()
        let driverData: [String: Any] = [
            "email": email,
            "role": "driver",
            "createdAt": FieldValue.serverTimestamp(),
            "isOnline": true
        ]
        
        db.collection("users").document(uid).setData(driverData) { error in
            if let error = error {
                print("Error creating driver profile: \(error)")
            }
        }
    }
}
