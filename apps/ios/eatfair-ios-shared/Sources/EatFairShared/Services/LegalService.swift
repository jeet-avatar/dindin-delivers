import Foundation

// MARK: - Legal Document Models

public struct LegalDocument: Codable {
    public let title: String
    public let version: String
    public let lastUpdated: String
    public let content: String
    public let acceptanceRequired: Bool
    public let keyPoints: [String]
    public let documentHash: String

    enum CodingKeys: String, CodingKey {
        case title
        case version
        case lastUpdated = "last_updated"
        case content
        case acceptanceRequired = "acceptance_required"
        case keyPoints = "key_points"
        case documentHash = "document_hash"
    }

    public init(title: String, version: String, lastUpdated: String, content: String, acceptanceRequired: Bool, keyPoints: [String], documentHash: String) {
        self.title = title
        self.version = version
        self.lastUpdated = lastUpdated
        self.content = content
        self.acceptanceRequired = acceptanceRequired
        self.keyPoints = keyPoints
        self.documentHash = documentHash
    }
}

public struct LegalAcceptance: Codable {
    public let userEmail: String
    public let documentType: String
    public let version: String
    public let accepted: Bool
    public let timestamp: String
    
    public init(userEmail: String, documentType: String, version: String, accepted: Bool) {
        self.userEmail = userEmail
        self.documentType = documentType
        self.version = version
        self.accepted = accepted
        self.timestamp = ISO8601DateFormatter().string(from: Date())
    }
}

public struct LegalSummary: Codable {
    public let platformName: String
    public let company: String
    public let jurisdiction: String
    public let lastUpdated: String
    public let version: String
    public let services: Services
    public let keyLegalPositions: [LegalPosition]
    public let regulatoryCompliance: RegulatoryCompliance
    
    enum CodingKeys: String, CodingKey {
        case platformName = "platform_name"
        case company
        case jurisdiction
        case lastUpdated = "last_updated"
        case version
        case services
        case keyLegalPositions = "key_legal_positions"
        case regulatoryCompliance = "regulatory_compliance"
    }
    
    public struct Services: Codable {
        public let foodDelivery: ServiceInfo?
        public let tripBoard: TripBoardInfo?
        
        enum CodingKeys: String, CodingKey {
            case foodDelivery = "food_delivery"
            case tripBoard = "trip_board"
        }
    }
    
    public struct ServiceInfo: Codable {
        public let description: String
        public let legalModel: String
        
        enum CodingKeys: String, CodingKey {
            case description
            case legalModel = "legal_model"
        }
    }
    
    public struct TripBoardInfo: Codable {
        public let description: String
        public let legalModel: String
        public let isTnc: Bool
        public let isRideshare: Bool
        public let isBulletinBoard: Bool
        
        enum CodingKeys: String, CodingKey {
            case description
            case legalModel = "legal_model"
            case isTnc = "is_tnc"
            case isRideshare = "is_rideshare"
            case isBulletinBoard = "is_bulletin_board"
        }
    }
    
    public struct LegalPosition: Codable {
        public let topic: String
        public let position: String
        public let supportingFactors: [String]
        
        enum CodingKeys: String, CodingKey {
            case topic
            case position
            case supportingFactors = "supporting_factors"
        }
    }
    
    public struct RegulatoryCompliance: Codable {
        public let californiaAb5: String
        public let ccpa: String
        public let section230Cda: String
        public let pciDss: String
        public let appleAppStore: String
        
        enum CodingKeys: String, CodingKey {
            case californiaAb5 = "california_ab5"
            case ccpa
            case section230Cda = "section_230_cda"
            case pciDss = "pci_dss"
            case appleAppStore = "apple_app_store"
        }
    }
}

// MARK: - Zero Liability Order Models

public struct ZeroLiabilityOrderItem: Codable {
    public let menuItemId: Int
    public let name: String
    public let quantity: Int
    public let price: Double
    public let notes: String?

    enum CodingKeys: String, CodingKey {
        case menuItemId = "menu_item_id"
        case name
        case quantity
        case price
        case notes
    }
}

public struct ZeroLiabilityOrder: Codable {
    public let orderId: String
    public let status: String
    public let createdAt: String
    public let customerName: String
    public let customerPhone: String
    public let deliveryAddress: String
    public let restaurantId: Int
    public let restaurantName: String
    public let items: [ZeroLiabilityOrderItem]
    public let subtotal: Double
    public let platformFeeCustomer: Double
    public let platformFeeRestaurant: Double
    public let deliveryFee: Double
    public let confirmations: OrderConfirmations
    public let disclaimer: String

    enum CodingKeys: String, CodingKey {
        case orderId = "order_id"
        case status
        case createdAt = "created_at"
        case customerName = "customer_name"
        case customerPhone = "customer_phone"
        case deliveryAddress = "delivery_address"
        case restaurantId = "restaurant_id"
        case restaurantName = "restaurant_name"
        case items
        case subtotal
        case platformFeeCustomer = "platform_fee_customer"
        case platformFeeRestaurant = "platform_fee_restaurant"
        case deliveryFee = "delivery_fee"
        case confirmations
        case disclaimer
    }
}

public struct OrderConfirmations: Codable {
    public var customerPlatformFeePaid: Bool
    public var restaurantPlatformFeePaid: Bool
    public var restaurantPaymentConfirmed: Bool
    public var restaurantPaymentConfirmedAt: String?
    public var restaurantPaymentAmount: Double?
    public var driverAssigned: Bool
    public var driverEmail: String?
    public var driverPickedUp: Bool
    public var driverPickedUpAt: String?
    public var driverDelivered: Bool
    public var driverDeliveredAt: String?
    public var customerConfirmedDelivery: Bool
    public var customerConfirmedAt: String?
    public var driverPaymentConfirmed: Bool
    public var driverPaymentConfirmedAt: String?
    public var driverPaymentAmount: Double?
    
    enum CodingKeys: String, CodingKey {
        case customerPlatformFeePaid = "customer_platform_fee_paid"
        case restaurantPlatformFeePaid = "restaurant_platform_fee_paid"
        case restaurantPaymentConfirmed = "restaurant_payment_confirmed"
        case restaurantPaymentConfirmedAt = "restaurant_payment_confirmed_at"
        case restaurantPaymentAmount = "restaurant_payment_amount"
        case driverAssigned = "driver_assigned"
        case driverEmail = "driver_email"
        case driverPickedUp = "driver_picked_up"
        case driverPickedUpAt = "driver_picked_up_at"
        case driverDelivered = "driver_delivered"
        case driverDeliveredAt = "driver_delivered_at"
        case customerConfirmedDelivery = "customer_confirmed_delivery"
        case customerConfirmedAt = "customer_confirmed_at"
        case driverPaymentConfirmed = "driver_payment_confirmed"
        case driverPaymentConfirmedAt = "driver_payment_confirmed_at"
        case driverPaymentAmount = "driver_payment_amount"
    }
}

// MARK: - Legal Service

public class LegalService {
    public static let shared = LegalService()
    
    private let baseURL: String
    private let session: URLSession
    
    // UserDefaults keys for tracking acceptance
    private let customerTOSAcceptedKey = "legal_customer_tos_accepted"
    private let restaurantTOSAcceptedKey = "legal_restaurant_tos_accepted"
    private let driverAgreementAcceptedKey = "legal_driver_agreement_accepted"
    private let tripBoardTOSAcceptedKey = "legal_trip_board_tos_accepted"
    private let privacyPolicyAcceptedKey = "legal_privacy_policy_accepted"
    private let acceptedVersionKey = "legal_accepted_version"
    
    private init() {
        self.baseURL = AppConfig.shared.p2pAPIBaseURL
        self.session = URLSession.shared
    }
    
    // MARK: - Check if Legal Docs Accepted
    
    public func hasAcceptedCustomerTOS() -> Bool {
        return UserDefaults.standard.bool(forKey: customerTOSAcceptedKey)
    }
    
    public func hasAcceptedRestaurantTOS() -> Bool {
        return UserDefaults.standard.bool(forKey: restaurantTOSAcceptedKey)
    }
    
    public func hasAcceptedDriverAgreement() -> Bool {
        return UserDefaults.standard.bool(forKey: driverAgreementAcceptedKey)
    }
    
    public func hasAcceptedTripBoardTOS() -> Bool {
        return UserDefaults.standard.bool(forKey: tripBoardTOSAcceptedKey)
    }
    
    public func hasAcceptedPrivacyPolicy() -> Bool {
        return UserDefaults.standard.bool(forKey: privacyPolicyAcceptedKey)
    }
    
    // MARK: - Record Acceptance
    
    public func recordCustomerTOSAcceptance(version: String) {
        UserDefaults.standard.set(true, forKey: customerTOSAcceptedKey)
        UserDefaults.standard.set(version, forKey: "\(customerTOSAcceptedKey)_version")
        UserDefaults.standard.set(Date().timeIntervalSince1970, forKey: "\(customerTOSAcceptedKey)_timestamp")
    }
    
    public func recordRestaurantTOSAcceptance(version: String) {
        UserDefaults.standard.set(true, forKey: restaurantTOSAcceptedKey)
        UserDefaults.standard.set(version, forKey: "\(restaurantTOSAcceptedKey)_version")
        UserDefaults.standard.set(Date().timeIntervalSince1970, forKey: "\(restaurantTOSAcceptedKey)_timestamp")
    }
    
    public func recordDriverAgreementAcceptance(version: String) {
        UserDefaults.standard.set(true, forKey: driverAgreementAcceptedKey)
        UserDefaults.standard.set(version, forKey: "\(driverAgreementAcceptedKey)_version")
        UserDefaults.standard.set(Date().timeIntervalSince1970, forKey: "\(driverAgreementAcceptedKey)_timestamp")
    }
    
    public func recordTripBoardTOSAcceptance(version: String) {
        UserDefaults.standard.set(true, forKey: tripBoardTOSAcceptedKey)
        UserDefaults.standard.set(version, forKey: "\(tripBoardTOSAcceptedKey)_version")
        UserDefaults.standard.set(Date().timeIntervalSince1970, forKey: "\(tripBoardTOSAcceptedKey)_timestamp")
    }
    
    public func recordPrivacyPolicyAcceptance(version: String) {
        UserDefaults.standard.set(true, forKey: privacyPolicyAcceptedKey)
        UserDefaults.standard.set(version, forKey: "\(privacyPolicyAcceptedKey)_version")
        UserDefaults.standard.set(Date().timeIntervalSince1970, forKey: "\(privacyPolicyAcceptedKey)_timestamp")
    }
    
    // MARK: - Fetch Legal Documents
    
    public func getCustomerTOS(completion: @escaping (Result<LegalDocument, Error>) -> Void) {
        fetchLegalDocument(endpoint: "/api/legal/tos", completion: completion)
    }

    public func getRestaurantTOS(completion: @escaping (Result<LegalDocument, Error>) -> Void) {
        fetchLegalDocument(endpoint: "/api/legal/tos", completion: completion)
    }

    public func getDriverAgreement(completion: @escaping (Result<LegalDocument, Error>) -> Void) {
        fetchLegalDocument(endpoint: "/api/legal/tos", completion: completion)
    }

    public func getTripBoardTOS(completion: @escaping (Result<LegalDocument, Error>) -> Void) {
        fetchLegalDocument(endpoint: "/api/legal/tos", completion: completion)
    }

    public func getPrivacyPolicy(completion: @escaping (Result<LegalDocument, Error>) -> Void) {
        fetchLegalDocument(endpoint: "/api/legal/privacy-policy", completion: completion)
    }

    // TODO: [MEDIUM] API mismatch — /api/legal/tiered-pricing does not exist in backend
    public func getTieredPricingDisclosure(completion: @escaping (Result<[String: Any], Error>) -> Void) {
        guard let url = URL(string: "\(baseURL)/api/legal/tiered-pricing") else {
            completion(.failure(NSError(domain: "LegalService", code: -3, userInfo: [NSLocalizedDescriptionKey: "Invalid URL"])))
            return
        }

        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        session.dataTask(with: request) { data, response, error in
            if let error = error {
                completion(.failure(error))
                return
            }

            // Validate HTTP status code
            if let httpResponse = response as? HTTPURLResponse {
                guard (200...299).contains(httpResponse.statusCode) else {
                    completion(.failure(NSError(domain: "LegalService", code: httpResponse.statusCode, userInfo: [NSLocalizedDescriptionKey: "HTTP error: \(httpResponse.statusCode)"])))
                    return
                }
            }

            guard let data = data else {
                completion(.failure(NSError(domain: "LegalService", code: -1, userInfo: [NSLocalizedDescriptionKey: "No data"])))
                return
            }

            do {
                if let json = try JSONSerialization.jsonObject(with: data) as? [String: Any] {
                    completion(.success(json))
                } else {
                    completion(.failure(NSError(domain: "LegalService", code: -2, userInfo: [NSLocalizedDescriptionKey: "Invalid JSON"])))
                }
            } catch {
                completion(.failure(error))
            }
        }.resume()
    }

    // TODO: [MEDIUM] API mismatch — /api/platform-legal/summary does not exist in backend
    public func getLegalSummary(completion: @escaping (Result<LegalSummary, Error>) -> Void) {
        guard let url = URL(string: "\(baseURL)/api/platform-legal/summary") else {
            completion(.failure(NSError(domain: "LegalService", code: -3, userInfo: [NSLocalizedDescriptionKey: "Invalid URL"])))
            return
        }

        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        session.dataTask(with: request) { data, response, error in
            if let error = error {
                completion(.failure(error))
                return
            }

            // Validate HTTP status code
            if let httpResponse = response as? HTTPURLResponse {
                guard (200...299).contains(httpResponse.statusCode) else {
                    completion(.failure(NSError(domain: "LegalService", code: httpResponse.statusCode, userInfo: [NSLocalizedDescriptionKey: "HTTP error: \(httpResponse.statusCode)"])))
                    return
                }
            }

            guard let data = data else {
                completion(.failure(NSError(domain: "LegalService", code: -1, userInfo: [NSLocalizedDescriptionKey: "No data"])))
                return
            }

            do {
                let summary = try JSONDecoder().decode(LegalSummary.self, from: data)
                completion(.success(summary))
            } catch {
                completion(.failure(error))
            }
        }.resume()
    }

    private func fetchLegalDocument(endpoint: String, completion: @escaping (Result<LegalDocument, Error>) -> Void) {
        guard let url = URL(string: "\(baseURL)\(endpoint)") else {
            completion(.failure(NSError(domain: "LegalService", code: -3, userInfo: [NSLocalizedDescriptionKey: "Invalid URL"])))
            return
        }

        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        session.dataTask(with: request) { data, response, error in
            if let error = error {
                completion(.failure(error))
                return
            }

            // Validate HTTP status code
            if let httpResponse = response as? HTTPURLResponse {
                guard (200...299).contains(httpResponse.statusCode) else {
                    completion(.failure(NSError(domain: "LegalService", code: httpResponse.statusCode, userInfo: [NSLocalizedDescriptionKey: "HTTP error: \(httpResponse.statusCode)"])))
                    return
                }
            }

            guard let data = data else {
                completion(.failure(NSError(domain: "LegalService", code: -1, userInfo: [NSLocalizedDescriptionKey: "No data"])))
                return
            }

            // Try to decode as LegalDocument first
            if let document = try? JSONDecoder().decode(LegalDocument.self, from: data) {
                completion(.success(document))
                return
            }

            // Fallback: parse backend response format and construct LegalDocument
            do {
                if let json = try JSONSerialization.jsonObject(with: data) as? [String: Any] {
                    let version = json["version"] as? String ?? "1.0"
                    let lastUpdated = json["last_updated"] as? String ?? ""
                    let webUrl = json["url"] as? String ?? ""

                    // Extract key points from summary or other fields
                    var keyPoints: [String] = []
                    if let summary = json["summary"] as? [String: Any],
                       let points = summary["key_points"] as? [String] {
                        keyPoints = points
                    } else if let rights = json["user_rights"] as? [String] {
                        keyPoints = rights
                    }

                    // Determine title based on endpoint
                    let title = endpoint.contains("privacy") ? "Privacy Policy" : "Terms of Service"

                    // Build content from available data
                    var content = "Please review our \(title) at: \(webUrl)\n\n"
                    if let summary = json["summary"] as? [String: Any] {
                        if let serviceType = summary["service_type"] as? String {
                            content += "Service Type: \(serviceType)\n\n"
                        }
                    }
                    if !keyPoints.isEmpty {
                        content += "Key Points:\n"
                        for point in keyPoints {
                            content += "• \(point)\n"
                        }
                    }

                    let document = LegalDocument(
                        title: title,
                        version: version,
                        lastUpdated: lastUpdated,
                        content: content,
                        acceptanceRequired: true,
                        keyPoints: keyPoints,
                        documentHash: version
                    )
                    completion(.success(document))
                } else {
                    completion(.failure(NSError(domain: "LegalService", code: -2, userInfo: [NSLocalizedDescriptionKey: "Invalid response format"])))
                }
            } catch {
                completion(.failure(error))
            }
        }.resume()
    }

    // MARK: - Zero Liability Order API

    // TODO: [MEDIUM] API mismatch — /api/orders/v2/legal/zero-liability-model does not exist. No /api/orders/v2/ routes in backend.
    public func getZeroLiabilityModel(completion: @escaping (Result<[String: Any], Error>) -> Void) {
        guard let url = URL(string: "\(baseURL)/api/orders/v2/legal/zero-liability-model") else {
            completion(.failure(NSError(domain: "LegalService", code: -3, userInfo: [NSLocalizedDescriptionKey: "Invalid URL"])))
            return
        }

        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        session.dataTask(with: request) { data, response, error in
            if let error = error {
                completion(.failure(error))
                return
            }

            // Validate HTTP status code
            if let httpResponse = response as? HTTPURLResponse {
                guard (200...299).contains(httpResponse.statusCode) else {
                    completion(.failure(NSError(domain: "LegalService", code: httpResponse.statusCode, userInfo: [NSLocalizedDescriptionKey: "HTTP error: \(httpResponse.statusCode)"])))
                    return
                }
            }

            guard let data = data else {
                completion(.failure(NSError(domain: "LegalService", code: -1, userInfo: [NSLocalizedDescriptionKey: "No data"])))
                return
            }

            do {
                if let json = try JSONSerialization.jsonObject(with: data) as? [String: Any] {
                    completion(.success(json))
                } else {
                    completion(.failure(NSError(domain: "LegalService", code: -2, userInfo: [NSLocalizedDescriptionKey: "Invalid JSON"])))
                }
            } catch {
                completion(.failure(error))
            }
        }.resume()
    }

    // MARK: - Order Confirmations
    
    // TODO: [MEDIUM] API mismatch — /api/orders/v2/restaurant/confirm-payment does not exist in backend
    public func confirmRestaurantPayment(orderId: String, restaurantEmail: String, amount: Double, paymentMethod: String, completion: @escaping (Result<[String: Any], Error>) -> Void) {
        guard let url = URL(string: "\(baseURL)/api/orders/v2/restaurant/confirm-payment") else {
            completion(.failure(NSError(domain: "LegalService", code: -3, userInfo: [NSLocalizedDescriptionKey: "Invalid URL"])))
            return
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let body: [String: Any] = [
            "order_id": orderId,
            "restaurant_email": restaurantEmail,
            "amount_received": amount,
            "payment_method": paymentMethod
        ]
        
        request.httpBody = try? JSONSerialization.data(withJSONObject: body)
        
        performRequest(request, completion: completion)
    }
    
    // TODO: [MEDIUM] API mismatch — /api/orders/v2/customer/confirm-delivery does not exist in backend
    public func confirmCustomerDelivery(orderId: String, customerEmail: String, rating: Int? = nil, feedback: String? = nil, completion: @escaping (Result<[String: Any], Error>) -> Void) {
        guard let url = URL(string: "\(baseURL)/api/orders/v2/customer/confirm-delivery") else {
            completion(.failure(NSError(domain: "LegalService", code: -3, userInfo: [NSLocalizedDescriptionKey: "Invalid URL"])))
            return
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        var body: [String: Any] = [
            "order_id": orderId,
            "customer_email": customerEmail
        ]
        if let rating = rating { body["rating"] = rating }
        if let feedback = feedback { body["feedback"] = feedback }
        
        request.httpBody = try? JSONSerialization.data(withJSONObject: body)
        
        performRequest(request, completion: completion)
    }
    
    // TODO: [MEDIUM] API mismatch — /api/orders/v2/driver/confirm-payment does not exist in backend
    public func confirmDriverPayment(orderId: String, driverEmail: String, amount: Double, paymentMethod: String, completion: @escaping (Result<[String: Any], Error>) -> Void) {
        guard let url = URL(string: "\(baseURL)/api/orders/v2/driver/confirm-payment") else {
            completion(.failure(NSError(domain: "LegalService", code: -3, userInfo: [NSLocalizedDescriptionKey: "Invalid URL"])))
            return
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let body: [String: Any] = [
            "order_id": orderId,
            "driver_email": driverEmail,
            "amount_received": amount,
            "payment_method": paymentMethod
        ]
        
        request.httpBody = try? JSONSerialization.data(withJSONObject: body)
        
        performRequest(request, completion: completion)
    }
    
    private func performRequest(_ request: URLRequest, completion: @escaping (Result<[String: Any], Error>) -> Void) {
        session.dataTask(with: request) { data, response, error in
            if let error = error {
                completion(.failure(error))
                return
            }

            // Validate HTTP status code
            if let httpResponse = response as? HTTPURLResponse {
                guard (200...299).contains(httpResponse.statusCode) else {
                    completion(.failure(NSError(domain: "LegalService", code: httpResponse.statusCode, userInfo: [NSLocalizedDescriptionKey: "HTTP error: \(httpResponse.statusCode)"])))
                    return
                }
            }

            guard let data = data else {
                completion(.failure(NSError(domain: "LegalService", code: -1, userInfo: [NSLocalizedDescriptionKey: "No data"])))
                return
            }

            do {
                if let json = try JSONSerialization.jsonObject(with: data) as? [String: Any] {
                    completion(.success(json))
                } else {
                    completion(.failure(NSError(domain: "LegalService", code: -2, userInfo: [NSLocalizedDescriptionKey: "Invalid JSON"])))
                }
            } catch {
                completion(.failure(error))
            }
        }.resume()
    }
}
