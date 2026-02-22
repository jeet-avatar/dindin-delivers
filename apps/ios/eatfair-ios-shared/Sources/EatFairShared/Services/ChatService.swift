import Foundation
import Combine
import os

private let logger = Logger(subsystem: "com.dollorai.shared", category: "ChatService")

/// Dollor.ai Chat Service
// TODO: [CRITICAL] API mismatch — Double URL prefix (chatServiceURL includes /api/chat, then paths add /api/chat again). Also path structure differs from backend (/api/chat/send vs /api/chat/conversations/{id}/messages). All 6 endpoints will 404.
/// Real-time messaging between independent drivers and customers
/// MATCHMAKING PLATFORM - Facilitates communication, does not monitor content
public class ChatService: ObservableObject {
    public static let shared = ChatService()

    // MARK: - Configuration
    private var baseURL: String {
        return AppConfig.shared.chatServiceURL
    }

    @Published public var isLoading = false
    @Published public var error: String?
    @Published public var messages: [ChatMessage] = []
    @Published public var activeConversation: Conversation?

    private var cancellables = Set<AnyCancellable>()
    private var webSocket: URLSessionWebSocketTask?

    private init() {}

    // MARK: - Chat Models

    public enum MessageType: String, Codable {
        case text = "text"
        case location = "location"
        case quickReply = "quick_reply"
        case system = "system"
    }

    public struct ChatMessage: Codable, Identifiable {
        public let id: String
        public let conversationId: String
        public let senderId: String
        public let senderType: String
        public let messageType: MessageType
        public let content: String
        public let locationLat: Double?
        public let locationLng: Double?
        public let isRead: Bool
        public let createdAt: String

        enum CodingKeys: String, CodingKey {
            case id = "message_id"
            case conversationId = "conversation_id"
            case senderId = "sender_id"
            case senderType = "sender_type"
            case messageType = "message_type"
            case content
            case locationLat = "location_lat"
            case locationLng = "location_lng"
            case isRead = "is_read"
            case createdAt = "created_at"
        }
    }

    public struct Conversation: Codable, Identifiable {
        public let id: String
        public let rideId: String?
        public let orderId: String?
        public let customerId: String
        public let driverId: String?
        public let isActive: Bool
        public let lastMessageAt: String?
        public let createdAt: String

        enum CodingKeys: String, CodingKey {
            case id = "conversation_id"
            case rideId = "ride_id"
            case orderId = "order_id"
            case customerId = "customer_id"
            case driverId = "driver_id"
            case isActive = "is_active"
            case lastMessageAt = "last_message_at"
            case createdAt = "created_at"
        }
    }

    public struct QuickReply: Identifiable {
        public let id = UUID()
        public let text: String
        public let category: String
    }

    // MARK: - Quick Replies

    public static let customerQuickReplies: [QuickReply] = [
        QuickReply(text: "I'm at the pickup location", category: "location"),
        QuickReply(text: "Running a few minutes late", category: "timing"),
        QuickReply(text: "Can you call me?", category: "contact"),
        QuickReply(text: "Thank you!", category: "gratitude")
    ]

    public static let driverQuickReplies: [QuickReply] = [
        QuickReply(text: "On my way!", category: "status"),
        QuickReply(text: "I've arrived", category: "location"),
        QuickReply(text: "Can you share your location?", category: "location"),
        QuickReply(text: "I'll wait here", category: "status")
    ]

    // MARK: - Create Conversation

    /// Start a new conversation for a ride or delivery
    public func createConversation(
        customerId: String,
        driverId: String? = nil,
        rideId: String? = nil,
        orderId: String? = nil,
        completion: @escaping (Result<Conversation, Error>) -> Void
    ) {
        guard let url = URL(string: "\(baseURL)/api/chat/conversations") else {
            completion(.failure(ChatError.invalidURL))
            return
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        var body: [String: Any] = ["customer_id": customerId]
        if let driverId = driverId { body["driver_id"] = driverId }
        if let rideId = rideId { body["ride_id"] = rideId }
        if let orderId = orderId { body["order_id"] = orderId }

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
                    completion(.failure(ChatError.noData))
                    return
                }

                do {
                    let conversation = try JSONDecoder().decode(Conversation.self, from: data)
                    self?.activeConversation = conversation
                    completion(.success(conversation))
                } catch {
                    self?.error = "Failed to decode conversation: \(error.localizedDescription)"
                    completion(.failure(error))
                }
            }
        }.resume()
    }

    // MARK: - Send Message

    /// Send a text message
    public func sendMessage(
        conversationId: String,
        senderId: String,
        senderType: String,
        content: String,
        completion: @escaping (Result<ChatMessage, Error>) -> Void
    ) {
        guard let url = URL(string: "\(baseURL)/api/chat/conversations/\(conversationId)/messages") else {
            completion(.failure(ChatError.invalidURL))
            return
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let body: [String: Any] = [
            "sender_id": senderId,
            "sender_type": senderType,
            "message_type": "text",
            "content": content
        ]

        request.httpBody = try? JSONSerialization.data(withJSONObject: body)

        performMessageRequest(request, completion: completion)
    }

    // MARK: - Send Location

    /// Share current location
    public func sendLocation(
        conversationId: String,
        senderId: String,
        senderType: String,
        latitude: Double,
        longitude: Double,
        completion: @escaping (Result<ChatMessage, Error>) -> Void
    ) {
        guard let url = URL(string: "\(baseURL)/api/chat/conversations/\(conversationId)/messages") else {
            completion(.failure(ChatError.invalidURL))
            return
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let body: [String: Any] = [
            "sender_id": senderId,
            "sender_type": senderType,
            "message_type": "location",
            "content": "Shared location",
            "location_lat": latitude,
            "location_lng": longitude
        ]

        request.httpBody = try? JSONSerialization.data(withJSONObject: body)

        performMessageRequest(request, completion: completion)
    }

    // MARK: - Fetch Messages

    /// Get message history for a conversation
    public func fetchMessages(
        conversationId: String,
        limit: Int = 50,
        offset: Int = 0,
        completion: @escaping (Result<[ChatMessage], Error>) -> Void
    ) {
        guard let url = URL(string: "\(baseURL)/api/chat/conversations/\(conversationId)/messages?limit=\(limit)&offset=\(offset)") else {
            completion(.failure(ChatError.invalidURL))
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
                    completion(.failure(ChatError.noData))
                    return
                }

                do {
                    struct MessagesResponse: Codable {
                        let messages: [ChatMessage]
                    }
                    let response = try JSONDecoder().decode(MessagesResponse.self, from: data)
                    self?.messages = response.messages
                    completion(.success(response.messages))
                } catch {
                    self?.error = "Failed to decode messages: \(error.localizedDescription)"
                    completion(.failure(error))
                }
            }
        }.resume()
    }

    // MARK: - Mark as Read

    /// Mark messages as read
    public func markAsRead(
        conversationId: String,
        readerId: String,
        completion: @escaping (Result<Void, Error>) -> Void
    ) {
        guard let url = URL(string: "\(baseURL)/api/chat/conversations/\(conversationId)/read") else {
            completion(.failure(ChatError.invalidURL))
            return
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let body: [String: Any] = ["reader_id": readerId]
        request.httpBody = try? JSONSerialization.data(withJSONObject: body)

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

    // MARK: - WebSocket Connection

    /// Connect to real-time chat updates
    public func connectWebSocket(conversationId: String, participantType: String, participantId: String) {
        let wsURLString = baseURL.replacingOccurrences(of: "https://", with: "wss://")
            .replacingOccurrences(of: "http://", with: "ws://")
        guard let url = URL(string: "\(wsURLString)/ws/chat/\(conversationId)?participant_type=\(participantType)&participant_id=\(participantId)") else {
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
                       let chatMessage = try? JSONDecoder().decode(ChatMessage.self, from: data) {
                        DispatchQueue.main.async {
                            self?.messages.append(chatMessage)
                        }
                    }
                case .data(let data):
                    if let chatMessage = try? JSONDecoder().decode(ChatMessage.self, from: data) {
                        DispatchQueue.main.async {
                            self?.messages.append(chatMessage)
                        }
                    }
                @unknown default:
                    break
                }
                self?.receiveMessage()
            case .failure(let error):
                #if DEBUG
                logger.info("[ChatService] WebSocket error: \(error)")
                #endif
            }
        }
    }

    /// Send message via WebSocket
    public func sendWebSocketMessage(content: String) {
        let messageDict: [String: Any] = [
            "type": "message",
            "content": content
        ]
        if let data = try? JSONSerialization.data(withJSONObject: messageDict),
           let jsonString = String(data: data, encoding: .utf8) {
            webSocket?.send(.string(jsonString)) { error in
                if let error = error {
                    #if DEBUG
                    logger.info("[ChatService] WebSocket send error: \(error)")
                    #endif
                }
            }
        }
    }

    /// Disconnect WebSocket
    public func disconnectWebSocket() {
        webSocket?.cancel(with: .goingAway, reason: nil)
        webSocket = nil
    }

    // MARK: - Helper Methods

    private func performMessageRequest(_ request: URLRequest, completion: @escaping (Result<ChatMessage, Error>) -> Void) {
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
                    completion(.failure(ChatError.noData))
                    return
                }

                do {
                    let message = try JSONDecoder().decode(ChatMessage.self, from: data)
                    self?.messages.append(message)
                    completion(.success(message))
                } catch {
                    self?.error = "Failed to decode message: \(error.localizedDescription)"
                    completion(.failure(error))
                }
            }
        }.resume()
    }
}

// MARK: - Error Types

public enum ChatError: LocalizedError {
    case invalidURL
    case noData
    case conversationNotFound
    case notAuthorized

    public var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "Invalid URL"
        case .noData:
            return "No data received"
        case .conversationNotFound:
            return "Conversation not found"
        case .notAuthorized:
            return "Not authorized to access this conversation"
        }
    }
}
