import Foundation
import UIKit
import EatFairShared
import PassKit
import Stripe

/// Response model for Payment Sheet (full Stripe integration with saved cards)
/// Matches Android PaymentIntentResponse
struct PaymentSheetKeys: Decodable, Sendable {
    let paymentIntent: String
    let ephemeralKey: String?  // Optional - only returned when customer has saved payment methods
    let customer: String?      // Optional - customer ID in Stripe
    let publishableKey: String

    // Alternative field names from API
    enum CodingKeys: String, CodingKey {
        case paymentIntent
        case clientSecret
        case ephemeralKey
        case customer
        case publishableKey
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        // Try paymentIntent first, fallback to clientSecret
        if let intent = try? container.decode(String.self, forKey: .paymentIntent) {
            paymentIntent = intent
        } else if let secret = try? container.decode(String.self, forKey: .clientSecret) {
            paymentIntent = secret
        } else {
            throw DecodingError.keyNotFound(CodingKeys.paymentIntent, .init(codingPath: [], debugDescription: "Missing paymentIntent or clientSecret"))
        }
        ephemeralKey = try container.decodeIfPresent(String.self, forKey: .ephemeralKey)
        customer = try container.decodeIfPresent(String.self, forKey: .customer)
        publishableKey = try container.decode(String.self, forKey: .publishableKey)
    }

    /// Check if this response has all keys needed for Payment Sheet with saved cards
    var hasFullPaymentSheetKeys: Bool {
        ephemeralKey != nil && customer != nil
    }
}

/// Simple response for Apple Pay (just needs client secret)
struct PaymentIntentData: Decodable, Sendable {
    let clientSecret: String
    let publishableKey: String

    // Alternative field names from API
    enum CodingKeys: String, CodingKey {
        case clientSecret
        case paymentIntent
        case publishableKey
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        // Try clientSecret first, fallback to paymentIntent
        if let secret = try? container.decode(String.self, forKey: .clientSecret) {
            clientSecret = secret
        } else if let intent = try? container.decode(String.self, forKey: .paymentIntent) {
            clientSecret = intent
        } else {
            throw DecodingError.keyNotFound(CodingKeys.clientSecret, .init(codingPath: [], debugDescription: "Missing clientSecret or paymentIntent"))
        }
        publishableKey = try container.decode(String.self, forKey: .publishableKey)
    }

    /// Convenience initializer for manual creation
    init(clientSecret: String, publishableKey: String) {
        self.clientSecret = clientSecret
        self.publishableKey = publishableKey
    }
}

class PaymentService {
    static let shared = PaymentService()

    /// Payment endpoint - uses P2P backend in production, demo in debug
    private var paymentEndpoint: String {
        #if DEBUG
        // Demo endpoint for testing - replace with P2P backend endpoint for production
        return "\(AppConfig.shared.p2pAPIBaseURL)/api/payments/create-intent"
        #else
        return "\(AppConfig.shared.p2pAPIBaseURL)/api/payments/create-intent"
        #endif
    }

    /// Create a PaymentIntent for Apple Pay (simple endpoint - just returns clientSecret and publishableKey)
    func createPaymentIntent(amount: Double, completion: @escaping (Result<PaymentIntentData, Error>) -> Void) {
        guard let url = URL(string: paymentEndpoint) else {
            completion(.failure(NSError(domain: "Invalid URL", code: 0, userInfo: nil)))
            return
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        // Add auth token if available (use SecureStorage first, fallback to UserDefaults)
        if let token = SecureStorage.shared.customerAccessToken {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        } else if let token = UserDefaults.standard.string(forKey: UserDefaultsKeys.customerAccessToken) {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        let body: [String: Any] = [
            "amount": Int(amount * 100), // Convert to cents
            "currency": "usd"
        ]
        request.httpBody = try? JSONSerialization.data(withJSONObject: body)

        URLSession.shared.dataTask(with: request) { data, response, error in
            Task { @MainActor in
                if let error = error {
                    completion(.failure(error))
                    return
                }

                guard let data = data else {
                    completion(.failure(NSError(domain: "No data", code: 0, userInfo: nil)))
                    return
                }

                do {
                    let intentData = try JSONDecoder().decode(PaymentIntentData.self, from: data)
                    completion(.success(intentData))
                } catch {
                    // Try to decode as PaymentSheetKeys (backwards compatibility)
                    if let keys = try? JSONDecoder().decode(PaymentSheetKeys.self, from: data) {
                        let intentData = PaymentIntentData(
                            clientSecret: keys.paymentIntent,
                            publishableKey: keys.publishableKey
                        )
                        completion(.success(intentData))
                    } else {
                        completion(.failure(error))
                    }
                }
            }
        }.resume()
    }

    func fetchPaymentSheetKeys(amount: Double = 0, orderId: String? = nil, completion: @escaping (Result<PaymentSheetKeys, Error>) -> Void) {
        guard let url = URL(string: paymentEndpoint) else {
            completion(.failure(NSError(domain: "Invalid URL", code: 0, userInfo: nil)))
            return
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        // Add auth token if available (use SecureStorage first, fallback to UserDefaults)
        if let token = SecureStorage.shared.customerAccessToken {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        } else if let token = UserDefaults.standard.string(forKey: UserDefaultsKeys.customerAccessToken) {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        var body: [String: Any] = ["currency": "usd"]
        if amount > 0 {
            body["amount"] = Int(amount * 100) // Convert to cents
        }
        if let orderId = orderId {
            body["order_id"] = orderId
        }
        request.httpBody = try? JSONSerialization.data(withJSONObject: body)

        URLSession.shared.dataTask(with: request) { data, response, error in
            Task { @MainActor in
                if let error = error {
                    completion(.failure(error))
                    return
                }

                guard let data = data else {
                    completion(.failure(NSError(domain: "No data", code: 0, userInfo: nil)))
                    return
                }

                do {
                    let keys = try JSONDecoder().decode(PaymentSheetKeys.self, from: data)
                    completion(.success(keys))
                } catch {
                    completion(.failure(error))
                }
            }
        }.resume()
    }
}

// MARK: - Stripe Apple Pay Handler
/// Handles Stripe's Apple Pay integration using STPApplePayContext
/// Thread-safe implementation to prevent race conditions in concurrent payment attempts
class StripeApplePayHandler: NSObject {
    static let shared = StripeApplePayHandler()

    /// Lock for thread-safe access to payment state
    private let paymentLock = NSLock()
    private var completionHandler: ((Bool, Error?) -> Void)?
    private var clientSecret: String?
    private var isPaymentInProgress = false

    /// Present Apple Pay sheet and handle payment through Stripe
    /// Thread-safe - prevents concurrent payment attempts
    func handleApplePay(
        request: PKPaymentRequest,
        clientSecret: String,
        completion: @escaping (Bool, Error?) -> Void
    ) {
        paymentLock.lock()

        // Prevent concurrent payment attempts
        guard !isPaymentInProgress else {
            paymentLock.unlock()
            completion(false, NSError(domain: "ApplePay", code: -3, userInfo: [NSLocalizedDescriptionKey: "Payment already in progress. Please wait."]))
            return
        }

        isPaymentInProgress = true
        self.completionHandler = completion
        self.clientSecret = clientSecret
        paymentLock.unlock()

        // Create Stripe Apple Pay context
        guard let applePayContext = STPApplePayContext(paymentRequest: request, delegate: self) else {
            resetPaymentState()
            completion(false, NSError(domain: "ApplePay", code: -1, userInfo: [NSLocalizedDescriptionKey: "Failed to create Apple Pay context. Please ensure Apple Pay is properly configured."]))
            return
        }

        // Present the Apple Pay sheet using the newer API
        DispatchQueue.main.async {
            applePayContext.presentApplePay()
        }
    }

    /// Reset payment state after completion or cancellation
    private func resetPaymentState() {
        paymentLock.lock()
        isPaymentInProgress = false
        completionHandler = nil
        clientSecret = nil
        paymentLock.unlock()
    }
}

// MARK: - STPApplePayContextDelegate
extension StripeApplePayHandler: STPApplePayContextDelegate {
    func applePayContext(
        _ context: STPApplePayContext,
        didCreatePaymentMethod paymentMethod: STPPaymentMethod,
        paymentInformation: PKPayment,
        completion: @escaping STPIntentClientSecretCompletionBlock
    ) {
        // Return the client secret to Stripe to complete the payment
        guard let clientSecret = self.clientSecret else {
            completion(nil, NSError(domain: "ApplePay", code: -1, userInfo: [NSLocalizedDescriptionKey: "Missing client secret"]))
            return
        }
        completion(clientSecret, nil)
    }

    func applePayContext(
        _ context: STPApplePayContext,
        didCompleteWith status: STPPaymentStatus,
        error: Error?
    ) {
        // Capture completion handler before resetting state
        let handler = completionHandler

        switch status {
        case .success:
            resetPaymentState()
            handler?(true, nil)
        case .error:
            // Create a more descriptive error if the original is unclear
            let displayError = error ?? NSError(
                domain: "ApplePay",
                code: -1,
                userInfo: [NSLocalizedDescriptionKey: "Payment failed. Please try again or use a different payment method."]
            )
            resetPaymentState()
            handler?(false, displayError)
        case .userCancellation:
            resetPaymentState()
            handler?(false, nil)
        @unknown default:
            resetPaymentState()
            handler?(false, NSError(
                domain: "ApplePay",
                code: -2,
                userInfo: [NSLocalizedDescriptionKey: "An unexpected error occurred with Apple Pay."]
            ))
        }
    }
}
