import Foundation
import Combine

/// Dollor.ai Call Service
/// Privacy-protected phone calls between independent drivers and customers
/// MATCHMAKING PLATFORM - Masks real phone numbers for privacy
public class CallService: ObservableObject {
    public static let shared = CallService()

    // MARK: - Configuration
    private var baseURL: String {
        return AppConfig.shared.callServiceURL
    }

    @Published public var isLoading = false
    @Published public var error: String?
    @Published public var activeSession: CallSession?

    private var cancellables = Set<AnyCancellable>()

    private init() {}

    // MARK: - Call Models

    public enum CallStatus: String, Codable {
        case initiated = "initiated"
        case ringing = "ringing"
        case inProgress = "in_progress"
        case completed = "completed"
        case failed = "failed"
        case noAnswer = "no_answer"
        case busy = "busy"
        case cancelled = "cancelled"
    }

    public enum ParticipantType: String, Codable {
        case customer = "customer"
        case driver = "driver"
    }

    public struct CallSession: Codable, Identifiable {
        public let id: String
        public let rideId: String?
        public let orderId: String?
        public let customerId: String
        public let driverId: String?
        public let maskedNumberForCustomer: String?
        public let maskedNumberForDriver: String?
        public let isActive: Bool
        public let expiresAt: String?
        public let privacyNotice: String

        enum CodingKeys: String, CodingKey {
            case id = "session_id"
            case rideId = "ride_id"
            case orderId = "order_id"
            case customerId = "customer_id"
            case driverId = "driver_id"
            case maskedNumberForCustomer = "masked_number_for_customer"
            case maskedNumberForDriver = "masked_number_for_driver"
            case isActive = "is_active"
            case expiresAt = "expires_at"
            case privacyNotice = "privacy_notice"
        }
    }

    public struct CallLog: Codable, Identifiable {
        public let id: String
        public let callerType: String
        public let status: CallStatus
        public let durationSeconds: Int?
        public let startedAt: String
        public let endedAt: String?

        enum CodingKeys: String, CodingKey {
            case id = "call_id"
            case callerType = "caller_type"
            case status
            case durationSeconds = "duration_seconds"
            case startedAt = "started_at"
            case endedAt = "ended_at"
        }
    }

    // MARK: - Create Call Session

    /// Create a phone masking session for a ride/delivery
    public func createCallSession(
        customerId: String,
        customerPhone: String,
        rideId: String? = nil,
        orderId: String? = nil,
        driverId: String? = nil,
        driverPhone: String? = nil,
        completion: @escaping (Result<CallSession, Error>) -> Void
    ) {
        guard let url = URL(string: "\(baseURL)/api/call/sessions") else {
            completion(.failure(CallError.invalidURL))
            return
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        var body: [String: Any] = [
            "customer_id": customerId,
            "customer_phone": customerPhone
        ]
        if let rideId = rideId { body["ride_id"] = rideId }
        if let orderId = orderId { body["order_id"] = orderId }
        if let driverId = driverId { body["driver_id"] = driverId }
        if let driverPhone = driverPhone { body["driver_phone"] = driverPhone }

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
                    completion(.failure(CallError.noData))
                    return
                }

                do {
                    let session = try JSONDecoder().decode(CallSession.self, from: data)
                    self?.activeSession = session
                    completion(.success(session))
                } catch {
                    self?.error = "Failed to decode session: \(error.localizedDescription)"
                    completion(.failure(error))
                }
            }
        }.resume()
    }

    // MARK: - Update Session (Add Driver)

    /// Add driver to an existing call session
    public func updateCallSession(
        sessionId: String,
        driverId: String,
        driverPhone: String,
        completion: @escaping (Result<CallSession, Error>) -> Void
    ) {
        guard let url = URL(string: "\(baseURL)/api/call/sessions/\(sessionId)") else {
            completion(.failure(CallError.invalidURL))
            return
        }

        var request = URLRequest(url: url)
        request.httpMethod = "PUT"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let body: [String: Any] = [
            "driver_id": driverId,
            "driver_phone": driverPhone
        ]

        request.httpBody = try? JSONSerialization.data(withJSONObject: body)

        performSessionRequest(request, completion: completion)
    }

    // MARK: - Get Masked Number

    /// Get the masked phone number to call the other party
    /// Customer gets driver's masked number, driver gets customer's masked number
    public func getMaskedNumber(
        sessionId: String,
        callerType: ParticipantType,
        completion: @escaping (Result<MaskedNumberResponse, Error>) -> Void
    ) {
        guard let url = URL(string: "\(baseURL)/api/call/masked-number?session_id=\(sessionId)&caller_type=\(callerType.rawValue)") else {
            completion(.failure(CallError.invalidURL))
            return
        }

        isLoading = true
        URLSession.shared.dataTask(with: url) { [weak self] data, response, error in
            DispatchQueue.main.async {
                self?.isLoading = false

                if let error = error {
                    self?.error = error.localizedDescription
                    completion(.failure(error))
                    return
                }

                guard let data = data else {
                    completion(.failure(CallError.noData))
                    return
                }

                do {
                    let response = try JSONDecoder().decode(MaskedNumberResponse.self, from: data)
                    completion(.success(response))
                } catch {
                    self?.error = "Failed to decode response: \(error.localizedDescription)"
                    completion(.failure(error))
                }
            }
        }.resume()
    }

    public struct MaskedNumberResponse: Codable {
        public let sessionId: String
        public let callerType: String
        public let maskedNumber: String
        public let recipient: String
        public let expiresAt: String?
        public let privacyNotice: String

        enum CodingKeys: String, CodingKey {
            case sessionId = "session_id"
            case callerType = "caller_type"
            case maskedNumber = "masked_number"
            case recipient
            case expiresAt = "expires_at"
            case privacyNotice = "privacy_notice"
        }
    }

    // MARK: - Initiate Call

    /// Log when a call is initiated (for tracking)
    public func initiateCall(
        sessionId: String,
        callerType: ParticipantType,
        callerId: String,
        completion: @escaping (Result<InitiateCallResponse, Error>) -> Void
    ) {
        guard let url = URL(string: "\(baseURL)/api/call/initiate") else {
            completion(.failure(CallError.invalidURL))
            return
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let body: [String: Any] = [
            "session_id": sessionId,
            "caller_type": callerType.rawValue,
            "caller_id": callerId
        ]

        request.httpBody = try? JSONSerialization.data(withJSONObject: body)

        URLSession.shared.dataTask(with: request) { [weak self] data, response, error in
            DispatchQueue.main.async {
                if let error = error {
                    self?.error = error.localizedDescription
                    completion(.failure(error))
                    return
                }

                guard let data = data else {
                    completion(.failure(CallError.noData))
                    return
                }

                do {
                    let response = try JSONDecoder().decode(InitiateCallResponse.self, from: data)
                    completion(.success(response))
                } catch {
                    self?.error = "Failed to decode response: \(error.localizedDescription)"
                    completion(.failure(error))
                }
            }
        }.resume()
    }

    public struct InitiateCallResponse: Codable {
        public let callId: String
        public let status: String
        public let message: String

        enum CodingKeys: String, CodingKey {
            case callId = "call_id"
            case status
            case message
        }
    }

    // MARK: - Get Call Logs

    /// Get call history for a session
    public func getCallLogs(
        sessionId: String,
        completion: @escaping (Result<[CallLog], Error>) -> Void
    ) {
        guard let url = URL(string: "\(baseURL)/api/call/logs/\(sessionId)") else {
            completion(.failure(CallError.invalidURL))
            return
        }

        isLoading = true
        URLSession.shared.dataTask(with: url) { [weak self] data, response, error in
            DispatchQueue.main.async {
                self?.isLoading = false

                if let error = error {
                    self?.error = error.localizedDescription
                    completion(.failure(error))
                    return
                }

                guard let data = data else {
                    completion(.failure(CallError.noData))
                    return
                }

                do {
                    struct CallLogsResponse: Codable {
                        let sessionId: String
                        let calls: [CallLog]

                        enum CodingKeys: String, CodingKey {
                            case sessionId = "session_id"
                            case calls
                        }
                    }
                    let response = try JSONDecoder().decode(CallLogsResponse.self, from: data)
                    completion(.success(response.calls))
                } catch {
                    self?.error = "Failed to decode call logs: \(error.localizedDescription)"
                    completion(.failure(error))
                }
            }
        }.resume()
    }

    // MARK: - End Call Session

    /// End a call session (ride/delivery completed)
    public func endCallSession(
        sessionId: String,
        completion: @escaping (Result<Void, Error>) -> Void
    ) {
        guard let url = URL(string: "\(baseURL)/api/call/sessions/\(sessionId)") else {
            completion(.failure(CallError.invalidURL))
            return
        }

        var request = URLRequest(url: url)
        request.httpMethod = "DELETE"

        URLSession.shared.dataTask(with: request) { data, response, error in
            DispatchQueue.main.async {
                if let error = error {
                    completion(.failure(error))
                    return
                }
                completion(.success(()))
            }
        }.resume()
    }

    // MARK: - Make Phone Call

    /// Open the phone app to call the masked number
    public func callMaskedNumber(_ maskedNumber: String) {
        let cleanNumber = maskedNumber.replacingOccurrences(of: " ", with: "")
            .replacingOccurrences(of: "-", with: "")
            .replacingOccurrences(of: "(", with: "")
            .replacingOccurrences(of: ")", with: "")

        if let url = URL(string: "tel://\(cleanNumber)") {
            #if os(iOS)
            DispatchQueue.main.async {
                if UIApplication.shared.canOpenURL(url) {
                    UIApplication.shared.open(url)
                }
            }
            #endif
        }
    }

    // MARK: - Helper Methods

    private func performSessionRequest(_ request: URLRequest, completion: @escaping (Result<CallSession, Error>) -> Void) {
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
                    completion(.failure(CallError.noData))
                    return
                }

                do {
                    let session = try JSONDecoder().decode(CallSession.self, from: data)
                    self?.activeSession = session
                    completion(.success(session))
                } catch {
                    self?.error = "Failed to decode session: \(error.localizedDescription)"
                    completion(.failure(error))
                }
            }
        }.resume()
    }
}

// MARK: - Error Types

public enum CallError: LocalizedError {
    case invalidURL
    case noData
    case sessionExpired
    case notAuthorized

    public var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "Invalid URL"
        case .noData:
            return "No data received"
        case .sessionExpired:
            return "Call session has expired"
        case .notAuthorized:
            return "Not authorized to access this session"
        }
    }
}

#if os(iOS)
import UIKit
#endif
