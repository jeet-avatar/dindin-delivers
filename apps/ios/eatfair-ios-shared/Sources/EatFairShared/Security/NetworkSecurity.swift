import Foundation
import Security
import CryptoKit
#if canImport(UIKit)
import UIKit
#endif

/// Network security manager with SSL pinning and secure API communication
public final class NetworkSecurity: NSObject {
    public static let shared = NetworkSecurity()

    // MARK: - SSL Certificate Pins
    // These are SHA-256 hashes of the public keys for dollor.ai certificates
    // Update these when certificates are renewed
    private let pinnedDomains: [String: Set<String>] = [
        "dollor.ai": [
            // Certificate pinning disabled - using ATS for security
            // Enable pinning in future by generating pins with:
            // openssl x509 -in cert.pem -pubkey -noout | openssl pkey -pubin -outform der | openssl dgst -sha256 -binary | base64
        ],
        "api.dollor.ai": [
            // Certificate pinning disabled - using ATS for security
        ],
        "api.stripe.com": [
            // Stripe certificate pins - these are public and stable
            "JbQbUG5JMJUoI6brnx0x3vZF6jilxsapbXGVfjhN8Fg=",
        ],
    ]

    // Domains that require SSL pinning
    private let securedDomains: Set<String> = [
        "dollor.ai",
        "api.dollor.ai",
        "api.stripe.com",
    ]

    private override init() {
        super.init()
    }

    // MARK: - Secure URL Session

    /// Create a secure URLSession with SSL pinning
    /// - Parameter delegate: Optional additional delegate
    /// - Returns: Configured URLSession with security settings
    public func createSecureSession(additionalDelegate: URLSessionDelegate? = nil) -> URLSession {
        let configuration = URLSessionConfiguration.default

        // Security settings
        configuration.tlsMinimumSupportedProtocolVersion = .TLSv12
        configuration.httpShouldSetCookies = false
        configuration.httpCookieAcceptPolicy = .never
        configuration.urlCache = nil  // Disable caching for sensitive requests
        configuration.requestCachePolicy = .reloadIgnoringLocalCacheData

        // Timeouts
        configuration.timeoutIntervalForRequest = 30
        configuration.timeoutIntervalForResource = 60

        return URLSession(
            configuration: configuration,
            delegate: self,
            delegateQueue: nil
        )
    }

    // MARK: - Certificate Validation

    /// Validate server trust for SSL pinning
    private func validateServerTrust(_ serverTrust: SecTrust, for domain: String) -> Bool {
        // Get the domain's pinned keys
        let normalizedDomain = domain.lowercased()
        var pinnedKeys: Set<String>?

        for (pinnedDomain, keys) in pinnedDomains {
            if normalizedDomain == pinnedDomain || normalizedDomain.hasSuffix(".\(pinnedDomain)") {
                pinnedKeys = keys
                break
            }
        }

        // If no pins configured for this domain, allow (but log warning)
        guard let pins = pinnedKeys, !pins.isEmpty else {
            #if DEBUG
            print("[NetworkSecurity] No certificate pins configured for: \(domain)")
            #endif
            return true
        }

        // Get the server's certificate chain
        guard let certificateChain = SecTrustCopyCertificateChain(serverTrust) as? [SecCertificate],
              !certificateChain.isEmpty else {
            #if DEBUG
            print("[NetworkSecurity] No certificates in chain for: \(domain)")
            #endif
            return false
        }

        // Check each certificate in the chain against our pins
        for certificate in certificateChain {
            if let publicKeyHash = getPublicKeyHash(from: certificate) {
                if pins.contains(publicKeyHash) {
                    return true
                }
            }
        }

        #if DEBUG
        print("[NetworkSecurity] Certificate pinning FAILED for: \(domain)")
        print("[NetworkSecurity] Expected pins: \(pins)")
        #endif

        return false
    }

    /// Extract SHA-256 hash of public key from certificate
    private func getPublicKeyHash(from certificate: SecCertificate) -> String? {
        guard let publicKey = SecCertificateCopyKey(certificate) else {
            return nil
        }

        var error: Unmanaged<CFError>?
        guard let publicKeyData = SecKeyCopyExternalRepresentation(publicKey, &error) as Data? else {
            return nil
        }

        // SHA-256 hash of the public key
        let hash = SHA256.hash(data: publicKeyData)
        return Data(hash).base64EncodedString()
    }

    // MARK: - Request Security

    /// Add security headers to a request
    public func secureRequest(_ request: inout URLRequest) {
        // Add security headers
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("application/json", forHTTPHeaderField: "Accept")

        // Add request ID for tracing
        let requestId = UUID().uuidString.prefix(16)
        request.setValue(String(requestId), forHTTPHeaderField: "X-Request-ID")

        // Add timestamp to prevent replay attacks
        let timestamp = String(Int(Date().timeIntervalSince1970))
        request.setValue(timestamp, forHTTPHeaderField: "X-Request-Timestamp")

        // Add app version for debugging
        if let version = Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String {
            request.setValue(version, forHTTPHeaderField: "X-App-Version")
        }

        // Add platform identifier
        request.setValue("ios", forHTTPHeaderField: "X-Platform")
    }

    /// Add authentication header to request
    public func addAuthHeader(to request: inout URLRequest, token: String) {
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
    }
}

// MARK: - URLSessionDelegate for SSL Pinning

extension NetworkSecurity: URLSessionDelegate {

    public func urlSession(
        _ session: URLSession,
        didReceive challenge: URLAuthenticationChallenge,
        completionHandler: @escaping (URLSession.AuthChallengeDisposition, URLCredential?) -> Void
    ) {
        // Only handle server trust challenges
        guard challenge.protectionSpace.authenticationMethod == NSURLAuthenticationMethodServerTrust,
              let serverTrust = challenge.protectionSpace.serverTrust else {
            completionHandler(.performDefaultHandling, nil)
            return
        }

        let domain = challenge.protectionSpace.host

        // Check if this domain requires pinning
        let requiresPinning = securedDomains.contains(where: {
            domain == $0 || domain.hasSuffix(".\($0)")
        })

        if requiresPinning {
            // Validate SSL pinning
            if validateServerTrust(serverTrust, for: domain) {
                let credential = URLCredential(trust: serverTrust)
                completionHandler(.useCredential, credential)
            } else {
                // SSL pinning failed - reject connection
                #if DEBUG
                print("[NetworkSecurity] SSL Pinning FAILED - Rejecting connection to: \(domain)")
                #endif
                completionHandler(.cancelAuthenticationChallenge, nil)
            }
        } else {
            // Domain doesn't require pinning, use default handling
            completionHandler(.performDefaultHandling, nil)
        }
    }
}

// MARK: - Secure API Client

public extension NetworkSecurity {

    /// Make a secure API request
    func request(
        url: URL,
        method: String = "GET",
        body: Data? = nil,
        token: String? = nil,
        completion: @escaping (Result<Data, Error>) -> Void
    ) {
        var request = URLRequest(url: url)
        request.httpMethod = method
        request.httpBody = body

        // Add security headers
        secureRequest(&request)

        // Add auth if provided
        if let token = token {
            addAuthHeader(to: &request, token: token)
        }

        // Use secure session
        let session = createSecureSession()
        let task = session.dataTask(with: request) { data, response, error in
            if let error = error {
                completion(.failure(error))
                return
            }

            guard let httpResponse = response as? HTTPURLResponse else {
                completion(.failure(NetworkError.invalidResponse))
                return
            }

            // Check for error status codes
            guard (200...299).contains(httpResponse.statusCode) else {
                completion(.failure(NetworkError.httpError(httpResponse.statusCode)))
                return
            }

            guard let data = data else {
                completion(.failure(NetworkError.noData))
                return
            }

            completion(.success(data))
        }

        task.resume()
    }

    enum NetworkError: Error, LocalizedError {
        case invalidResponse
        case httpError(Int)
        case noData
        case sslPinningFailed

        public var errorDescription: String? {
            switch self {
            case .invalidResponse:
                return "Invalid server response"
            case .httpError(let code):
                return "HTTP error: \(code)"
            case .noData:
                return "No data received"
            case .sslPinningFailed:
                return "Security verification failed"
            }
        }
    }
}

// MARK: - Jailbreak Detection

public extension NetworkSecurity {

    /// Check if device appears to be jailbroken
    /// - Returns: True if jailbreak indicators are detected
    func isDeviceJailbroken() -> Bool {
        #if targetEnvironment(simulator)
        return false
        #else

        // Check for common jailbreak files
        let jailbreakPaths = [
            "/Applications/Cydia.app",
            "/Library/MobileSubstrate/MobileSubstrate.dylib",
            "/bin/bash",
            "/usr/sbin/sshd",
            "/etc/apt",
            "/private/var/lib/apt/",
            "/usr/bin/ssh",
            "/private/var/stash",
            "/private/var/lib/cydia",
            "/private/var/tmp/cydia.log",
            "/Applications/RockApp.app",
            "/Applications/Icy.app",
            "/Applications/WinterBoard.app",
            "/Applications/SBSettings.app",
            "/Applications/blackra1n.app",
            "/private/var/mobile/Library/SBSettings/Themes",
        ]

        for path in jailbreakPaths {
            if FileManager.default.fileExists(atPath: path) {
                return true
            }
        }

        // Check if we can write outside sandbox
        let testPath = "/private/jailbreak_test_\(UUID().uuidString)"
        do {
            try "test".write(toFile: testPath, atomically: true, encoding: .utf8)
            try FileManager.default.removeItem(atPath: testPath)
            return true  // If we could write, device is jailbroken
        } catch {
            // Expected behavior on non-jailbroken device
        }

        // Check if we can open Cydia URL
        #if canImport(UIKit)
        if let url = URL(string: "cydia://package/com.example.package") {
            if UIApplication.shared.canOpenURL(url) {
                return true
            }
        }
        #endif

        return false
        #endif
    }

    /// Show jailbreak warning if detected
    func checkJailbreakStatus() {
        if isDeviceJailbroken() {
            #if DEBUG
            print("[NetworkSecurity] WARNING: Jailbreak detected!")
            #endif
            // In production, you might want to:
            // 1. Show a warning to the user
            // 2. Disable certain sensitive features
            // 3. Log to your analytics
        }
    }
}
