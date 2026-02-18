import Foundation
import os

private let logger = Logger(subsystem: "ai.dollor.shared", category: "WebSocket")

/// Dollor.ai WebSocket Manager
/// Manages a persistent WebSocket connection to the P2P backend for real-time events:
/// ride bids, status updates, driver location, ETA, chat messages, and payment updates.
///
/// Usage:
///   WebSocketManager.shared.onNewBid = { data in print(data) }
///   WebSocketManager.shared.connect(clientType: "customer", entityId: 42)
///   WebSocketManager.shared.subscribe(topic: "ride:123")
///
/// The backend WebSocket endpoint is: wss://api.dollor.ai/ws/{clientType}_{entityId}
/// Messages use JSON with an "action" field for client->server and a "type" field for server->client.
public class WebSocketManager: NSObject, ObservableObject, URLSessionWebSocketDelegate {

    // MARK: - Singleton

    public static let shared = WebSocketManager()

    // MARK: - Published Properties

    @Published public private(set) var isConnected: Bool = false
    @Published public var lastError: String?

    // MARK: - Event Handlers

    /// Called when a new bid is received for a ride request.
    /// Payload typically includes: bid_id, ride_id, driver_id, fare, etc.
    public var onNewBid: (([String: Any]) -> Void)?

    /// Called when a ride's status changes (e.g., accepted, driver_en_route, arrived, in_progress, completed).
    public var onRideStatusUpdate: (([String: Any]) -> Void)?

    /// Called with driver location updates during an active ride.
    /// Payload typically includes: latitude, longitude, heading, speed.
    public var onDriverLocation: (([String: Any]) -> Void)?

    /// Called when ETA is recalculated.
    /// Payload typically includes: eta_minutes, distance_miles.
    public var onETAUpdate: (([String: Any]) -> Void)?

    /// Called when a new chat message arrives.
    public var onChatMessage: (([String: Any]) -> Void)?

    /// Called when a bid response is received (accepted, rejected, countered).
    public var onBidResponse: (([String: Any]) -> Void)?

    /// Called when payment status changes (succeeded, failed, refunded).
    public var onPaymentUpdate: (([String: Any]) -> Void)?

    // MARK: - Private Properties

    private static var baseWebSocketURL: String {
        let httpBase = AppConfig.shared.p2pAPIBaseURL
        let wsBase = httpBase
            .replacingOccurrences(of: "https://", with: "wss://")
            .replacingOccurrences(of: "http://", with: "ws://")
        return "\(wsBase)/ws/"
    }
    private static let pingInterval: TimeInterval = 30.0
    private static let initialReconnectDelay: TimeInterval = 1.0
    private static let maxReconnectDelay: TimeInterval = 30.0

    private var webSocketTask: URLSessionWebSocketTask?
    private var urlSession: URLSession?
    private var pingTimer: Timer?
    private var reconnectTimer: Timer?
    private var reconnectDelay: TimeInterval = WebSocketManager.initialReconnectDelay
    private var shouldReconnect: Bool = false
    private var currentClientType: String?
    private var currentEntityId: Int?
    private let topicQueue = DispatchQueue(label: "ai.dollor.websocket.topics")
    private var _subscribedTopics: Set<String> = []
    private var subscribedTopics: Set<String> {
        get { topicQueue.sync { _subscribedTopics } }
        set { topicQueue.sync { _subscribedTopics = newValue } }
    }
    private let receiveQueue = DispatchQueue(label: "ai.dollor.websocket.receive")
    private var _isReceiving: Bool = false
    private var isReceiving: Bool {
        get { receiveQueue.sync { _isReceiving } }
        set { receiveQueue.sync { _isReceiving = newValue } }
    }

    // MARK: - Initialization

    private override init() {
        super.init()
    }

    // MARK: - Public Methods

    /// Connect to the WebSocket server.
    /// - Parameters:
    ///   - clientType: The type of client connecting (e.g., "customer", "driver").
    ///   - entityId: The entity ID for the client (customer_id or driver_id).
    public func connect(clientType: String, entityId: Int) {
        // If already connected with the same parameters, skip
        if isConnected,
           currentClientType == clientType,
           currentEntityId == entityId {
            logger.info("Already connected as \(clientType)_\(entityId)")
            return
        }

        // Disconnect any existing connection first
        disconnectInternal(shouldAttemptReconnect: false)

        currentClientType = clientType
        currentEntityId = entityId
        shouldReconnect = true

        let urlString = "\(WebSocketManager.baseWebSocketURL)\(clientType)_\(entityId)"
        guard let url = URL(string: urlString) else {
            logger.error("Invalid WebSocket URL: \(urlString)")
            DispatchQueue.main.async {
                self.lastError = "Invalid WebSocket URL"
            }
            return
        }

        logger.info("Connecting to WebSocket: \(urlString)")

        let configuration = URLSessionConfiguration.default
        configuration.waitsForConnectivity = true
        urlSession = URLSession(
            configuration: configuration,
            delegate: self,
            delegateQueue: nil
        )

        webSocketTask = urlSession?.webSocketTask(with: url)
        webSocketTask?.resume()

        // Start the receive loop
        receiveMessage()
    }

    /// Disconnect from the WebSocket server cleanly.
    public func disconnect() {
        logger.info("Disconnect requested by caller")
        disconnectInternal(shouldAttemptReconnect: false)
    }

    /// Subscribe to a topic (e.g., "ride:123", "order:456").
    /// - Parameter topic: The topic string to subscribe to.
    public func subscribe(topic: String) {
        topicQueue.sync { _subscribedTopics.insert(topic) }

        guard isConnected else {
            logger.warning("Not connected — will subscribe to '\(topic)' on reconnect")
            return
        }

        let message: [String: Any] = [
            "action": "subscribe",
            "topic": topic
        ]
        sendJSON(message)
        logger.info("Subscribing to topic: \(topic)")
    }

    /// Unsubscribe from a topic.
    /// - Parameter topic: The topic string to unsubscribe from.
    public func unsubscribe(topic: String) {
        topicQueue.sync { _subscribedTopics.remove(topic) }

        guard isConnected else {
            return
        }

        let message: [String: Any] = [
            "action": "unsubscribe",
            "topic": topic
        ]
        sendJSON(message)
        logger.info("Unsubscribing from topic: \(topic)")
    }

    // MARK: - URLSessionWebSocketDelegate

    public func urlSession(
        _ session: URLSession,
        webSocketTask: URLSessionWebSocketTask,
        didOpenWithProtocol protocol: String?
    ) {
        logger.info("WebSocket connection opened")
        reconnectDelay = WebSocketManager.initialReconnectDelay

        DispatchQueue.main.async {
            self.isConnected = true
            self.lastError = nil
        }

        // Re-subscribe to any topics that were active before reconnect
        let topics = topicQueue.sync { _subscribedTopics }
        for topic in topics {
            let message: [String: Any] = [
                "action": "subscribe",
                "topic": topic
            ]
            sendJSON(message)
            logger.info("Re-subscribing to topic: \(topic)")
        }

        // Start keep-alive pings
        startPingTimer()
    }

    public func urlSession(
        _ session: URLSession,
        webSocketTask: URLSessionWebSocketTask,
        didCloseWith closeCode: URLSessionWebSocketTask.CloseCode,
        reason: Data?
    ) {
        let reasonString: String
        if let reason = reason, let text = String(data: reason, encoding: .utf8) {
            reasonString = text
        } else {
            reasonString = "No reason provided"
        }
        logger.info("WebSocket closed with code \(closeCode.rawValue): \(reasonString)")

        DispatchQueue.main.async {
            self.isConnected = false
        }

        stopPingTimer()

        if shouldReconnect {
            scheduleReconnect()
        }
    }

    public func urlSession(
        _ session: URLSession,
        task: URLSessionTask,
        didCompleteWithError error: Error?
    ) {
        if let error = error {
            let nsError = error as NSError
            // Don't log cancellation errors (normal during disconnect)
            if nsError.code != NSURLErrorCancelled {
                logger.error("WebSocket error: \(error.localizedDescription)")
                DispatchQueue.main.async {
                    self.lastError = error.localizedDescription
                    self.isConnected = false
                }
            } else {
                DispatchQueue.main.async {
                    self.isConnected = false
                }
            }
        }

        stopPingTimer()

        if shouldReconnect {
            scheduleReconnect()
        }
    }

    // MARK: - Private: Receive Loop

    private func receiveMessage() {
        guard !isReceiving else { return }
        isReceiving = true

        webSocketTask?.receive { [weak self] result in
            guard let self = self else { return }
            self.isReceiving = false

            switch result {
            case .success(let message):
                switch message {
                case .string(let text):
                    self.handleTextMessage(text)
                case .data(let data):
                    if let text = String(data: data, encoding: .utf8) {
                        self.handleTextMessage(text)
                    } else {
                        logger.warning("Received binary data that could not be decoded as UTF-8")
                    }
                @unknown default:
                    logger.warning("Received unknown WebSocket message type")
                }

                // Continue listening for next message
                self.receiveMessage()

            case .failure(let error):
                let nsError = error as NSError
                if nsError.code != NSURLErrorCancelled {
                    logger.error("WebSocket receive error: \(error.localizedDescription)")
                    DispatchQueue.main.async {
                        self.lastError = error.localizedDescription
                        self.isConnected = false
                    }
                }
                // Do not call receiveMessage() again here — reconnect logic handles it
            }
        }
    }

    private func handleTextMessage(_ text: String) {
        guard let data = text.data(using: .utf8),
              let json = try? JSONSerialization.jsonObject(with: data, options: []) as? [String: Any] else {
            logger.warning("Received non-JSON message: \(text.prefix(200))")
            return
        }

        guard let type = json["type"] as? String else {
            logger.warning("Received JSON without 'type' field: \(text.prefix(200))")
            return
        }

        logger.info("Received event type: \(type)")

        switch type {
        case "connected":
            logger.info("Server acknowledged connection")

        case "subscribed":
            let topic = json["topic"] as? String ?? "unknown"
            logger.info("Server confirmed subscription to: \(topic)")

        case "new_bid":
            DispatchQueue.main.async { self.onNewBid?(json) }

        case "ride_status_update":
            DispatchQueue.main.async { self.onRideStatusUpdate?(json) }

        case "driver_location_update":
            DispatchQueue.main.async { self.onDriverLocation?(json) }

        case "eta_update":
            DispatchQueue.main.async { self.onETAUpdate?(json) }

        case "chat_message":
            DispatchQueue.main.async { self.onChatMessage?(json) }

        case "bid_response":
            DispatchQueue.main.async { self.onBidResponse?(json) }

        case "payment_update":
            DispatchQueue.main.async { self.onPaymentUpdate?(json) }

        default:
            logger.info("Unhandled event type: \(type)")
        }
    }

    // MARK: - Private: Send

    private func sendJSON(_ dictionary: [String: Any]) {
        guard let data = try? JSONSerialization.data(withJSONObject: dictionary, options: []),
              let text = String(data: data, encoding: .utf8) else {
            logger.error("Failed to serialize JSON for sending")
            return
        }

        let message = URLSessionWebSocketTask.Message.string(text)
        webSocketTask?.send(message) { error in
            if let error = error {
                logger.error("WebSocket send error: \(error.localizedDescription)")
            }
        }
    }

    // MARK: - Private: Keep-Alive Ping

    private func startPingTimer() {
        stopPingTimer()
        DispatchQueue.main.async {
            self.pingTimer = Timer.scheduledTimer(
                withTimeInterval: WebSocketManager.pingInterval,
                repeats: true
            ) { [weak self] _ in
                self?.sendPing()
            }
        }
    }

    private func stopPingTimer() {
        DispatchQueue.main.async {
            self.pingTimer?.invalidate()
            self.pingTimer = nil
        }
    }

    private func sendPing() {
        webSocketTask?.sendPing { [weak self] error in
            if let error = error {
                logger.error("Ping failed: \(error.localizedDescription)")
                DispatchQueue.main.async {
                    self?.isConnected = false
                    self?.lastError = "Ping failed: \(error.localizedDescription)"
                }
            } else {
                logger.debug("Ping sent successfully")
            }
        }
    }

    // MARK: - Private: Reconnect with Exponential Backoff

    private func scheduleReconnect() {
        guard shouldReconnect,
              let clientType = currentClientType,
              let entityId = currentEntityId else {
            return
        }

        logger.info("Scheduling reconnect in \(self.reconnectDelay, format: .fixed(precision: 1))s")

        DispatchQueue.main.async {
            self.reconnectTimer?.invalidate()
            self.reconnectTimer = Timer.scheduledTimer(
                withTimeInterval: self.reconnectDelay,
                repeats: false
            ) { [weak self] _ in
                guard let self = self, self.shouldReconnect else { return }
                logger.info("Attempting reconnect...")
                self.connectInternal(clientType: clientType, entityId: entityId)
            }
        }

        // Exponential backoff: double the delay, capped at max
        reconnectDelay = min(reconnectDelay * 2.0, WebSocketManager.maxReconnectDelay)
    }

    private func connectInternal(clientType: String, entityId: Int) {
        let urlString = "\(WebSocketManager.baseWebSocketURL)\(clientType)_\(entityId)"
        guard let url = URL(string: urlString) else {
            logger.error("Invalid WebSocket URL on reconnect: \(urlString)")
            return
        }

        // Invalidate old session to prevent leak
        webSocketTask?.cancel(with: .goingAway, reason: nil)
        webSocketTask = nil
        urlSession?.invalidateAndCancel()
        urlSession = nil

        let configuration = URLSessionConfiguration.default
        configuration.waitsForConnectivity = true
        urlSession = URLSession(
            configuration: configuration,
            delegate: self,
            delegateQueue: nil
        )

        webSocketTask = urlSession?.webSocketTask(with: url)
        webSocketTask?.resume()

        receiveMessage()
    }

    // MARK: - Private: Disconnect

    private func disconnectInternal(shouldAttemptReconnect: Bool) {
        shouldReconnect = shouldAttemptReconnect
        isReceiving = false

        stopPingTimer()

        DispatchQueue.main.async {
            self.reconnectTimer?.invalidate()
            self.reconnectTimer = nil
        }

        webSocketTask?.cancel(with: .goingAway, reason: "Client disconnect".data(using: .utf8))
        webSocketTask = nil

        urlSession?.invalidateAndCancel()
        urlSession = nil

        if !shouldAttemptReconnect {
            currentClientType = nil
            currentEntityId = nil
            topicQueue.sync { _subscribedTopics.removeAll() }
            reconnectDelay = WebSocketManager.initialReconnectDelay
        }

        DispatchQueue.main.async {
            self.isConnected = false
        }
    }
}
