import Foundation
import UIKit
import EatFairShared
import PassKit
import Stripe

struct PaymentSheetKeys: Decodable, Sendable {
    let paymentIntent: String
    let ephemeralKey: String
    let customer: String
    let publishableKey: String
}

struct PaymentIntentData: Decodable, Sendable {
    let clientSecret: String
    let publishableKey: String
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
class StripeApplePayHandler: NSObject {
    static let shared = StripeApplePayHandler()

    private var completionHandler: ((Bool, Error?) -> Void)?
    private var clientSecret: String?

    /// Present Apple Pay sheet and handle payment through Stripe
    func handleApplePay(
        request: PKPaymentRequest,
        clientSecret: String,
        completion: @escaping (Bool, Error?) -> Void
    ) {
        self.completionHandler = completion
        self.clientSecret = clientSecret

        // Create Stripe Apple Pay context
        guard let applePayContext = STPApplePayContext(paymentRequest: request, delegate: self) else {
            completion(false, NSError(domain: "ApplePay", code: -1, userInfo: [NSLocalizedDescriptionKey: "Failed to create Apple Pay context. Please ensure Apple Pay is properly configured."]))
            return
        }

        // Present the Apple Pay sheet using the newer API
        DispatchQueue.main.async {
            applePayContext.presentApplePay()
        }
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
        switch status {
        case .success:
            completionHandler?(true, nil)
        case .error:
            // Create a more descriptive error if the original is unclear
            let displayError = error ?? NSError(
                domain: "ApplePay",
                code: -1,
                userInfo: [NSLocalizedDescriptionKey: "Payment failed. Please try again or use a different payment method."]
            )
            completionHandler?(false, displayError)
        case .userCancellation:
            completionHandler?(false, nil)
        @unknown default:
            completionHandler?(false, NSError(
                domain: "ApplePay",
                code: -2,
                userInfo: [NSLocalizedDescriptionKey: "An unexpected error occurred with Apple Pay."]
            ))
        }

        // Clean up
        completionHandler = nil
        clientSecret = nil
    }
}
