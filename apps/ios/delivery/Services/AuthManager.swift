import Foundation
import FirebaseAuth
import Combine

class AuthManager: ObservableObject {
    @Published var user: User?
    private var handle: AuthStateDidChangeListenerHandle?
    
    init() {
        handle = Auth.auth().addStateDidChangeListener { [weak self] auth, user in
            self?.user = user
        }
    }
    
    deinit {
        if let handle = handle {
            Auth.auth().removeStateDidChangeListener(handle)
        }
    }
}
