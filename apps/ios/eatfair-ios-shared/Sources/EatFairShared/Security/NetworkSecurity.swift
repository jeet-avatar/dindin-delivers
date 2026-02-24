import Foundation
import Security
import CryptoKit
import os
#if canImport(UIKit)
import UIKit
#endif

private let networkSecurityLogger = Logger(subsystem: "ai.dollor.shared", category: "NetworkSecurity")

/// Network security manager with SSL pinning and secure API communication
public final class NetworkSecurity: NSObject {
    public static let shared = NetworkSecurity()

    // MARK: - SSL Certificate Pins
    // These are SHA-256 hashes of the public keys for dollor.ai certificates
    // Update these when certificates are renewed
    private let pinnedDomains: [String: Set<String>] = [
        "dollor.ai": [
            // Leaf certificate (CN=dollor.ai) - renewed by AWS Certificate Manager
            "WggyjbYa6k0khD7aafEMGmJ/GO1ltJ6KpFx+zHLoCQQ=",
            // Intermediate CA (Amazon RSA 2048 M04) - stable across renewals
            "G9LNNAql897egYsabashkzUCTEJkWBzgoEtk8X/678c=",
            // Root CA (Amazon Root CA 1) - very stable, rarely changes
            "++MBgDH5WGvL9Bcn5Be30cRcL0f5O+NyoXuWtQdX1aI=",
        ],
        "api.dollor.ai": [
            // Same certificate chain as dollor.ai (ACM wildcard/SAN cert)
            "WggyjbYa6k0khD7aafEMGmJ/GO1ltJ6KpFx+zHLoCQQ=",
            "G9LNNAql897egYsabashkzUCTEJkWBzgoEtk8X/678c=",
            "++MBgDH5WGvL9Bcn5Be30cRcL0f5O+NyoXuWtQdX1aI=",
        ],
        // NOTE: api.stripe.com is NOT pinned. Stripe SDK handles its own certificate
        // validation and rotates certificates frequently. Pinning third-party certs is
        // fragile and caused a stale pin issue (old hash: JbQbUG5J... no longer valid).
        //
        // NOTE: CloudFront staging domain (d34u5ixl0bulv4.cloudfront.net) is intentionally
        // NOT pinned. CloudFront rotates TLS certificates frequently and uses a shared
        // certificate pool across AWS infrastructure. Pinning would cause app breakage.
        // Staging is not used by end users, so this is acceptable risk.
    ]

    // Domains that require SSL pinning (only our own domains)
    private let securedDomains: Set<String> = [
        "dollor.ai",
        "api.dollor.ai",
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
            networkSecurityLogger.debug("No certificate pins configured for: \(domain)")
            return true
        }

        // Get the server's certificate chain
        guard let certificateChain = SecTrustCopyCertificateChain(serverTrust) as? [SecCertificate],
              !certificateChain.isEmpty else {
            networkSecurityLogger.error("No certificates in chain for: \(domain)")
            return false
        }

        // Check each certificate in the chain against our pins
        var observedHashes: [String] = []
        for certificate in certificateChain {
            if let publicKeyHash = getPublicKeyHash(from: certificate) {
                observedHashes.append(publicKeyHash)
                if pins.contains(publicKeyHash) {
                    return true
                }
            }
        }

        // Log detailed diagnostic info for pin failures (always, not just DEBUG)
        networkSecurityLogger.error("SSL pinning FAILED for: \(domain)")
        networkSecurityLogger.error("Expected one of: \(pins.sorted().joined(separator: ", "))")
        networkSecurityLogger.error("Observed hashes: \(observedHashes.joined(separator: ", "))")
        networkSecurityLogger.error("Certificate chain length: \(certificateChain.count)")

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
                networkSecurityLogger.error("SSL Pinning FAILED - Rejecting connection to: \(domain)")
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

    /// Check jailbreak status and log warning if detected
    /// - Returns: True if device is jailbroken
    @discardableResult
    func checkJailbreakStatus() -> Bool {
        let jailbroken = isDeviceJailbroken()
        if jailbroken {
            networkSecurityLogger.warning("Jailbreak detected! Sensitive features may be restricted.")
        }
        return jailbroken
    }

    /// Whether sensitive features (payments, token storage) should be restricted.
    /// Returns true on jailbroken devices. Call on app launch and before sensitive operations.
    func shouldRestrictFeatures() -> Bool {
        return isDeviceJailbroken()
    }

    /// User-facing warning message for jailbroken devices.
    /// Display this in a UIAlertController on app launch when shouldRestrictFeatures() returns true.
    func jailbreakWarningMessage() -> String {
        return "This device appears to be jailbroken. For your security, some features such as payments and account management may be restricted. We recommend using a non-jailbroken device for the best experience."
    }
}
