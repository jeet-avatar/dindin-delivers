import SwiftUI
import FirebaseFirestore
import FirebaseAuth
import Combine

/// ChatManager handles real-time messaging between drivers and customers
/// Enables direct communication for coordination, tips negotiation, and multi-stop deliveries
class ChatManager: ObservableObject {
    static let shared = ChatManager()

    // MARK: - Published Properties
    @Published var conversations: [Conversation] = []
    @Published var activeConversation: Conversation?
    @Published var messages: [ChatMessage] = []
    @Published var unreadCount = 0
    @Published var isLoading = false
    @Published var errorMessage: String?

    // MARK: - Private Properties
    private let db = Firestore.firestore()
    private var conversationsListener: ListenerRegistration?
    private var messagesListener: ListenerRegistration?
    private var cancellables = Set<AnyCancellable>()

    init() {
        setupAuthListener()
    }

    deinit {
        removeListeners()
    }

    private func setupAuthListener() {
        Auth.auth().addStateDidChangeListener { [weak self] _, user in
            if user != nil {
                self?.fetchConversations()
            } else {
                self?.removeListeners()
                self?.conversations = []
                self?.messages = []
            }
        }
    }

    private func removeListeners() {
        conversationsListener?.remove()
        messagesListener?.remove()
    }

    // MARK: - Fetch Conversations
    func fetchConversations() {
        guard let uid = Auth.auth().currentUser?.uid else { return }

        conversationsListener?.remove()

        conversationsListener = db.collection("conversations")
            .whereField("driverId", isEqualTo: uid)
            .order(by: "lastMessageAt", descending: true)
            .addSnapshotListener { [weak self] snapshot, error in
                guard let documents = snapshot?.documents else { return }

                DispatchQueue.main.async {
                    self?.conversations = documents.compactMap { doc -> Conversation? in
                        try? doc.data(as: Conversation.self)
                    }

                    // Calculate unread count
                    self?.unreadCount = self?.conversations.reduce(0) { total, conv in
                        total + conv.unreadCountDriver
                    } ?? 0
                }
            }
    }

    // MARK: - Fetch Messages for Conversation
    func fetchMessages(for conversationId: String) {
        messagesListener?.remove()

        messagesListener = db.collection("conversations")
            .document(conversationId)
            .collection("messages")
            .order(by: "timestamp", descending: false)
            .addSnapshotListener { [weak self] snapshot, error in
                guard let documents = snapshot?.documents else { return }

                DispatchQueue.main.async {
                    self?.messages = documents.compactMap { doc -> ChatMessage? in
                        try? doc.data(as: ChatMessage.self)
                    }
                }
            }

        // Mark messages as read
        markConversationAsRead(conversationId)
    }

    // MARK: - Send Message
    func sendMessage(text: String, to conversationId: String) {
        guard let uid = Auth.auth().currentUser?.uid else { return }

        let messageData: [String: Any] = [
            "senderId": uid,
            "senderType": "driver",
            "text": text,
            "timestamp": Int64(Date().timeIntervalSince1970 * 1000),
            "isRead": false
        ]

        // Add message to subcollection
        db.collection("conversations")
            .document(conversationId)
            .collection("messages")
            .addDocument(data: messageData)

        // Update conversation with last message
        db.collection("conversations").document(conversationId).updateData([
            "lastMessage": text,
            "lastMessageAt": Int64(Date().timeIntervalSince1970 * 1000),
            "lastMessageSender": "driver",
            "unreadCountCustomer": FieldValue.increment(Int64(1))
        ])
    }

    // MARK: - Send Voice Message
    func sendVoiceMessage(audioUrl: String, duration: Int, to conversationId: String) {
        guard let uid = Auth.auth().currentUser?.uid else { return }

        let messageData: [String: Any] = [
            "senderId": uid,
            "senderType": "driver",
            "type": "voice",
            "audioUrl": audioUrl,
            "duration": duration,
            "timestamp": Int64(Date().timeIntervalSince1970 * 1000),
            "isRead": false
        ]

        db.collection("conversations")
            .document(conversationId)
            .collection("messages")
            .addDocument(data: messageData)

        db.collection("conversations").document(conversationId).updateData([
            "lastMessage": "Voice message",
            "lastMessageAt": Int64(Date().timeIntervalSince1970 * 1000),
            "lastMessageSender": "driver",
            "unreadCountCustomer": FieldValue.increment(Int64(1))
        ])
    }

    // MARK: - Send Location
    func sendLocation(latitude: Double, longitude: Double, to conversationId: String) {
        guard let uid = Auth.auth().currentUser?.uid else { return }

        let messageData: [String: Any] = [
            "senderId": uid,
            "senderType": "driver",
            "type": "location",
            "latitude": latitude,
            "longitude": longitude,
            "timestamp": Int64(Date().timeIntervalSince1970 * 1000),
            "isRead": false
        ]

        db.collection("conversations")
            .document(conversationId)
            .collection("messages")
            .addDocument(data: messageData)

        db.collection("conversations").document(conversationId).updateData([
            "lastMessage": "Shared location",
            "lastMessageAt": Int64(Date().timeIntervalSince1970 * 1000),
            "lastMessageSender": "driver",
            "unreadCountCustomer": FieldValue.increment(Int64(1))
        ])
    }

    // MARK: - Create Conversation for Order
    func createConversation(for orderId: String, customerId: String, customerName: String, restaurantName: String) async -> String? {
        guard let uid = Auth.auth().currentUser?.uid else { return nil }

        // Check if conversation already exists
        let existingQuery = try? await db.collection("conversations")
            .whereField("orderId", isEqualTo: orderId)
            .getDocuments()

        if let existingDoc = existingQuery?.documents.first {
            return existingDoc.documentID
        }

        // Fetch driver name
        let driverDoc = try? await db.collection("drivers").document(uid).getDocument()
        let driverName = driverDoc?.data()?["name"] as? String ?? "Driver"

        // Create new conversation
        let conversationData: [String: Any] = [
            "orderId": orderId,
            "driverId": uid,
            "driverName": driverName,
            "customerId": customerId,
            "customerName": customerName,
            "restaurantName": restaurantName,
            "createdAt": Int64(Date().timeIntervalSince1970 * 1000),
            "lastMessageAt": Int64(Date().timeIntervalSince1970 * 1000),
            "lastMessage": "Chat started",
            "lastMessageSender": "system",
            "unreadCountDriver": 0,
            "unreadCountCustomer": 0,
            "isActive": true
        ]

        do {
            let docRef = try await db.collection("conversations").addDocument(data: conversationData)

            // Send initial system message
            let systemMessage: [String: Any] = [
                "senderId": "system",
                "senderType": "system",
                "text": "Chat started for order from \(restaurantName)",
                "timestamp": Int64(Date().timeIntervalSince1970 * 1000),
                "isRead": true
            ]
            try await docRef.collection("messages").addDocument(data: systemMessage)

            return docRef.documentID
        } catch {
            DispatchQueue.main.async {
                self.errorMessage = error.localizedDescription
            }
            return nil
        }
    }

    // MARK: - Mark as Read
    func markConversationAsRead(_ conversationId: String) {
        db.collection("conversations").document(conversationId).updateData([
            "unreadCountDriver": 0
        ])

        // Mark all messages as read
        db.collection("conversations")
            .document(conversationId)
            .collection("messages")
            .whereField("senderType", isEqualTo: "customer")
            .whereField("isRead", isEqualTo: false)
            .getDocuments { snapshot, _ in
                snapshot?.documents.forEach { doc in
                    doc.reference.updateData(["isRead": true])
                }
            }
    }

    // MARK: - Send Quick Response
    func sendQuickResponse(_ response: QuickResponse, to conversationId: String) {
        sendMessage(text: response.message, to: conversationId)
    }

    // MARK: - End Conversation
    func endConversation(_ conversationId: String) {
        db.collection("conversations").document(conversationId).updateData([
            "isActive": false,
            "endedAt": Int64(Date().timeIntervalSince1970 * 1000)
        ])
    }
}

// MARK: - Models

struct Conversation: Identifiable, Codable {
    @DocumentID var id: String?
    let orderId: String
    let driverId: String
    let driverName: String
    let customerId: String
    let customerName: String
    let restaurantName: String
    let createdAt: Int64
    var lastMessageAt: Int64
    var lastMessage: String
    var lastMessageSender: String
    var unreadCountDriver: Int
    var unreadCountCustomer: Int
    var isActive: Bool

    var lastMessageDate: Date {
        Date(timeIntervalSince1970: TimeInterval(lastMessageAt / 1000))
    }
}

struct ChatMessage: Identifiable, Codable {
    @DocumentID var id: String?
    let senderId: String
    let senderType: String // "driver", "customer", "system"
    var text: String?
    var type: String? // "text", "voice", "location", "image"
    var audioUrl: String?
    var duration: Int?
    var latitude: Double?
    var longitude: Double?
    var imageUrl: String?
    let timestamp: Int64
    var isRead: Bool

    var messageDate: Date {
        Date(timeIntervalSince1970: TimeInterval(timestamp / 1000))
    }

    var isFromDriver: Bool {
        senderType == "driver"
    }

    var isSystem: Bool {
        senderType == "system"
    }
}

// MARK: - Quick Responses
enum QuickResponse: String, CaseIterable {
    case onMyWay = "on_my_way"
    case arrivedPickup = "arrived_pickup"
    case gotFood = "got_food"
    case arrivedDelivery = "arrived_delivery"
    case cantFind = "cant_find"
    case runningLate = "running_late"
    case thanks = "thanks"

    var message: String {
        switch self {
        case .onMyWay: return "On my way to pick up your order!"
        case .arrivedPickup: return "I've arrived at the restaurant"
        case .gotFood: return "Got your food! Heading to you now"
        case .arrivedDelivery: return "I'm at your location"
        case .cantFind: return "Having trouble finding the address. Can you provide more details?"
        case .runningLate: return "Running a bit late due to traffic. Will be there soon!"
        case .thanks: return "Thank you!"
        }
    }

    var icon: String {
        switch self {
        case .onMyWay: return "car.fill"
        case .arrivedPickup: return "building.2.fill"
        case .gotFood: return "bag.fill"
        case .arrivedDelivery: return "mappin.circle.fill"
        case .cantFind: return "questionmark.circle.fill"
        case .runningLate: return "clock.fill"
        case .thanks: return "hand.thumbsup.fill"
        }
    }
}
