import Foundation

struct PaymentSheetKeys: Decodable, Sendable {
    let paymentIntent: String
    let ephemeralKey: String
    let customer: String
    let publishableKey: String
}

class PaymentService {
    static let shared = PaymentService()
    
    func fetchPaymentSheetKeys(completion: @escaping (Result<PaymentSheetKeys, Error>) -> Void) {
        guard let url = URL(string: "https://stripe-mobile-payment-sheet.glitch.me/checkout") else {
            completion(.failure(NSError(domain: "Invalid URL", code: 0, userInfo: nil)))
            return
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let body: [String: Any] = ["currency": "usd"]
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
