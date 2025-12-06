import Foundation
import EatFairShared

struct PaymentSheetKeys: Decodable, Sendable {
    let paymentIntent: String
    let ephemeralKey: String
    let customer: String
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

    func fetchPaymentSheetKeys(amount: Double = 0, orderId: String? = nil, completion: @escaping (Result<PaymentSheetKeys, Error>) -> Void) {
        guard let url = URL(string: paymentEndpoint) else {
            completion(.failure(NSError(domain: "Invalid URL", code: 0, userInfo: nil)))
            return
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        // Add auth token if available
        if let token = UserDefaults.standard.string(forKey: UserDefaultsKeys.customerAccessToken) {
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
