import Foundation
import os

private let logger = Logger(subsystem: "com.dollorai.shared", category: "NegotiationService")
import Combine

/// Dollor.ai Negotiation Service
/// Real-time price negotiation between independent drivers and customers
/// MATCHMAKING PLATFORM - Platform suggests prices, parties negotiate freely
public class NegotiationService: ObservableObject {
    public static let shared = NegotiationService()

    // MARK: - Configuration
    private var baseURL: String {
        return AppConfig.shared.negotiationServiceURL
    }

    @Published public var isLoading = false
    @Published public var error: String?
    @Published public var activeNegotiation: Negotiation?

    private var cancellables = Set<AnyCancellable>()
    private var webSocket: URLSessionWebSocketTask?

    private init() {}

    // MARK: - Negotiation Models

    public enum NegotiationType: String, Codable {
        case rideshare = "rideshare"
        case foodDelivery = "food_delivery"
    }

    public enum NegotiationStatus: String, Codable {
        case pending = "pending"
        case customerCountered = "customer_countered"
        case driverCountered = "driver_countered"
        case accepted = "accepted"
        case rejected = "rejected"
        case expired = "expired"
        case cancelled = "cancelled"
    }

    public struct Negotiation: Codable, Identifiable {
        public let id: String
        public let negotiationType: NegotiationType
        public let rideId: String?
        public let orderId: String?
        public let customerId: String
        public let driverId: String?
        public let pickupLat: Double
        public let pickupLng: Double
        public let dropoffLat: Double
        public let dropoffLng: Double
        public let distanceMiles: Double
        public let estimatedMinutes: Int
        public let platformSuggestedPrice: Double
        public let currentPrice: Double
        public let customerOffer: Double?
        public let driverAsk: Double?
        public let platformFee: Double
        public let status: NegotiationStatus
        public let expiresAt: String
        public let createdAt: String

        enum CodingKeys: String, CodingKey {
            case id = "negotiation_id"
            case negotiationType = "negotiation_type"
            case rideId = "ride_id"
            case orderId = "order_id"
            case customerId = "customer_id"
            case driverId = "driver_id"
            case pickupLat = "pickup_lat"
            case pickupLng = "pickup_lng"
            case dropoffLat = "dropoff_lat"
            case dropoffLng = "dropoff_lng"
            case distanceMiles = "distance_miles"
            case estimatedMinutes = "estimated_minutes"
            case platformSuggestedPrice = "platform_suggested_price"
            case currentPrice = "current_price"
            case customerOffer = "customer_offer"
            case driverAsk = "driver_ask"
            case platformFee = "platform_fee"
            case status
            case expiresAt = "expires_at"
            case createdAt = "created_at"
        }
    }

    public struct QuickOfferOption: Identifiable {
        public let id = UUID()
        public let percentage: Int
        public let amount: Double
        public let label: String

        public init(percentage: Int, basePrice: Double) {
            self.percentage = percentage
            self.amount = basePrice * Double(percentage) / 100.0
            self.label = "\(percentage)%"
        }
    }

    // MARK: - Create Negotiation

    /// Start a new negotiation for a ride or delivery
    public func createNegotiation(
        type: NegotiationType,
        customerId: String,
        pickupLat: Double,
        pickupLng: Double,
        dropoffLat: Double,
        dropoffLng: Double,
        distanceMiles: Double,
        estimatedMinutes: Int,
        rideId: String? = nil,
        orderId: String? = nil,
        completion: @escaping (Result<Negotiation, Error>) -> Void
    ) {
        guard let url = URL(string: "\(baseURL)/api/negotiations") else {
            completion(.failure(NegotiationError.invalidURL))
            return
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let body: [String: Any] = [
            "negotiation_type": type.rawValue,
            "customer_id": customerId,
            "pickup_lat": pickupLat,
            "pickup_lng": pickupLng,
            "dropoff_lat": dropoffLat,
            "dropoff_lng": dropoffLng,
            "distance_miles": distanceMiles,
            "estimated_minutes": estimatedMinutes,
            "ride_id": rideId as Any,
            "order_id": orderId as Any
        ]

        request.httpBody = try? JSONSerialization.data(withJSONObject: body)

        isLoading = true
        URLSession.shared.dataTask(with: request) { [weak self] data, response, error in
            DispatchQueue.main.async {
                self?.isLoading = false

                if let error = error {
                    self?.error = error.localizedDescription
                    completion(.failure(error))
                    return
                }

                guard let data = data else {
                    completion(.failure(NegotiationError.noData))
                    return
                }

                do {
                    let negotiation = try JSONDecoder().decode(Negotiation.self, from: data)
                    self?.activeNegotiation = negotiation
                    completion(.success(negotiation))
                } catch {
                    self?.error = "Failed to decode negotiation: \(error.localizedDescription)"
                    completion(.failure(error))
                }
            }
        }.resume()
    }

    // MARK: - Customer Counter Offer

    /// Customer makes a counter offer
    public func customerCounterOffer(
        negotiationId: String,
        customerId: String,
        offerAmount: Double,
        completion: @escaping (Result<Negotiation, Error>) -> Void
    ) {
        guard let url = URL(string: "\(baseURL)/api/negotiations/\(negotiationId)/customer-offer") else {
            completion(.failure(NegotiationError.invalidURL))
            return
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let body: [String: Any] = [
            "customer_id": customerId,
            "offer_amount": offerAmount
        ]

        request.httpBody = try? JSONSerialization.data(withJSONObject: body)

        performRequest(request, completion: completion)
    }

    // MARK: - Driver Counter Offer

    /// Driver makes a counter offer
    public func driverCounterOffer(
        negotiationId: String,
        driverId: String,
        askAmount: Double,
        completion: @escaping (Result<Negotiation, Error>) -> Void
    ) {
        guard let url = URL(string: "\(baseURL)/api/negotiations/\(negotiationId)/driver-offer") else {
            completion(.failure(NegotiationError.invalidURL))
            return
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let body: [String: Any] = [
            "driver_id": driverId,
            "ask_amount": askAmount
        ]

        request.httpBody = try? JSONSerialization.data(withJSONObject: body)

        performRequest(request, completion: completion)
    }

    // MARK: - Accept Negotiation

    /// Accept the current negotiation price
    public func acceptNegotiation(
        negotiationId: String,
        participantType: String,  // "customer" or "driver"
        participantId: String,
        completion: @escaping (Result<Negotiation, Error>) -> Void
    ) {
        guard let url = URL(string: "\(baseURL)/api/negotiations/\(negotiationId)/accept") else {
            completion(.failure(NegotiationError.invalidURL))
            return
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let body: [String: Any] = [
            "participant_type": participantType,
            "participant_id": participantId
        ]

        request.httpBody = try? JSONSerialization.data(withJSONObject: body)

        performRequest(request, completion: completion)
    }

    // MARK: - Quick Offer Options

    /// Get quick offer options (60%, 70%, 80%, 90% of suggested price)
    public func getQuickOfferOptions(suggestedPrice: Double) -> [QuickOfferOption] {
        return [60, 70, 80, 90].map { percentage in
            QuickOfferOption(percentage: percentage, basePrice: suggestedPrice)
        }
    }

    // MARK: - WebSocket Connection

    /// Connect to real-time negotiation updates
    public func connectWebSocket(negotiationId: String, participantType: String, participantId: String) {
        let wsURLString = baseURL.replacingOccurrences(of: "https://", with: "wss://")
            .replacingOccurrences(of: "http://", with: "ws://")
        guard let url = URL(string: "\(wsURLString)/ws/negotiation/\(negotiationId)?participant_type=\(participantType)&participant_id=\(participantId)") else {
            return
        }

        let session = URLSession(configuration: .default)
        webSocket = session.webSocketTask(with: url)
        webSocket?.resume()

        receiveMessage()
    }

    private func receiveMessage() {
        webSocket?.receive { [weak self] result in
            switch result {
            case .success(let message):
                switch message {
                case .string(let text):
                    if let data = text.data(using: .utf8),
                       let negotiation = try? JSONDecoder().decode(Negotiation.self, from: data) {
                        DispatchQueue.main.async {
                            self?.activeNegotiation = negotiation
                        }
                    }
                case .data(let data):
                    if let negotiation = try? JSONDecoder().decode(Negotiation.self, from: data) {
                        DispatchQueue.main.async {
                            self?.activeNegotiation = negotiation
                        }
                    }
                @unknown default:
                    break
                }
                self?.receiveMessage()
            case .failure(let error):
                #if DEBUG
                logger.info("[NegotiationService] WebSocket error: \(error)")
                #endif
            }
        }
    }

    /// Disconnect WebSocket
    public func disconnectWebSocket() {
        webSocket?.cancel(with: .goingAway, reason: nil)
        webSocket = nil
    }

    // MARK: - Helper Methods

    private func performRequest(_ request: URLRequest, completion: @escaping (Result<Negotiation, Error>) -> Void) {
        isLoading = true
        URLSession.shared.dataTask(with: request) { [weak self] data, response, error in
            DispatchQueue.main.async {
                self?.isLoading = false

                if let error = error {
                    self?.error = error.localizedDescription
                    completion(.failure(error))
                    return
                }

                guard let data = data else {
                    completion(.failure(NegotiationError.noData))
                    return
                }

                do {
                    let negotiation = try JSONDecoder().decode(Negotiation.self, from: data)
                    self?.activeNegotiation = negotiation
                    completion(.success(negotiation))
                } catch {
                    self?.error = "Failed to decode response: \(error.localizedDescription)"
                    completion(.failure(error))
                }
            }
        }.resume()
    }

    // MARK: - Platform Fee Calculation

    /// Calculate tiered platform fee for rideshare
    public func calculatePlatformFee(fareAmount: Double) -> Double {
        return AppConfig.shared.calculateRidesharePlatformFee(fareAmount: fareAmount)
    }

    /// Get platform fee description
    public func getPlatformFeeDescription(fareAmount: Double) -> String {
        let fee = calculatePlatformFee(fareAmount: fareAmount)
        return String(format: "$%.0f Platform Fee", fee)
    }
}

// MARK: - Error Types

public enum NegotiationError: LocalizedError {
    case invalidURL
    case noData
    case negotiationExpired
    case notAuthorized

    public var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "Invalid URL"
        case .noData:
            return "No data received"
        case .negotiationExpired:
            return "Negotiation has expired"
        case .notAuthorized:
            return "Not authorized to perform this action"
        }
    }
}
