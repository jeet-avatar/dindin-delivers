import os

private let logger = Logger(subsystem: "com.dollorai.customer", category: "DriverChatView")

import SwiftUI
import Combine
import EatFairShared

struct DriverChatView: View {
    let orderId: String
    let driverName: String
    let driverPhone: String?

    @StateObject private var viewModel: ChatViewModel
    @Environment(\.dismiss) var dismiss
    @FocusState private var isInputFocused: Bool

    init(orderId: String, driverName: String, driverPhone: String? = nil) {
        self.orderId = orderId
        self.driverName = driverName
        self.driverPhone = driverPhone
        _viewModel = StateObject(wrappedValue: ChatViewModel(orderId: orderId))
    }

    var body: some View {
        VStack(spacing: 0) {
            // Header
            chatHeader

            Divider()

            // Messages
            messagesView

            // Input
            messageInput
        }
        .navigationBarHidden(true)
        .onAppear {
            viewModel.startListening()
        }
        .onDisappear {
            viewModel.stopListening()
        }
    }

    // MARK: - Chat Header
    private var chatHeader: some View {
        HStack(spacing: 12) {
            Button(action: { dismiss() }) {
                Image(systemName: "chevron.left")
                    .font(.title2)
                    .foregroundColor(.primary)
            }

            // Driver avatar
            ZStack {
                Circle()
                    .fill(Theme.brandGreen)
                    .frame(width: 44, height: 44)

                Text(String(driverName.prefix(1)).uppercased())
                    .font(.headline)
                    .fontWeight(.bold)
                    .foregroundColor(.white)

                // Online indicator
                Circle()
                    .fill(Color.green)
                    .frame(width: 12, height: 12)
                    .overlay(
                        Circle()
                            .stroke(Color.white, lineWidth: 2)
                    )
                    .offset(x: 16, y: 16)
            }

            VStack(alignment: .leading, spacing: 2) {
                Text(driverName)
                    .font(.headline)
                Text("Your Driver")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }

            Spacer()

            // Call button
            if let phone = driverPhone {
                Button(action: { callDriver(phone: phone) }) {
                    Image(systemName: "phone.fill")
                        .font(.title3)
                        .foregroundColor(.white)
                        .frame(width: 40, height: 40)
                        .background(Theme.brandGreen)
                        .clipShape(Circle())
                }
            }
        }
        .padding()
        .background(Color.white)
    }

    // MARK: - Messages View
    private var messagesView: some View {
        ScrollViewReader { proxy in
            ScrollView {
                LazyVStack(spacing: 12) {
                    // Quick Actions
                    quickActionsSection

                    // Messages
                    ForEach(viewModel.messages) { message in
                        MessageBubble(message: message, isFromCustomer: message.senderId == viewModel.currentUserId)
                            .id(message.id)
                    }
                }
                .padding()
            }
            .onChange(of: viewModel.messages.count) {
                if let lastMessage = viewModel.messages.last {
                    withAnimation {
                        proxy.scrollTo(lastMessage.id, anchor: .bottom)
                    }
                }
            }
        }
        .background(Color(.systemGray6))
    }

    // MARK: - Quick Actions
    private var quickActionsSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Quick Messages")
                .font(.caption)
                .foregroundColor(.secondary)

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    QuickMessageButton(text: "I'm outside", action: { sendQuickMessage("I'm outside waiting") })
                    QuickMessageButton(text: "Leave at door", action: { sendQuickMessage("Please leave it at the door") })
                    QuickMessageButton(text: "Call when here", action: { sendQuickMessage("Please call me when you arrive") })
                    QuickMessageButton(text: "Thanks!", action: { sendQuickMessage("Thank you! 🙏") })
                }
            }
        }
        .padding()
        .background(Color.white)
        .cornerRadius(12)
    }

    // MARK: - Message Input
    private var messageInput: some View {
        HStack(spacing: 12) {
            // Text field
            HStack {
                TextField("Message your driver...", text: $viewModel.newMessage)
                    .textFieldStyle(.plain)
                    .focused($isInputFocused)

                if !viewModel.newMessage.isEmpty {
                    Button(action: { viewModel.newMessage = "" }) {
                        Image(systemName: "xmark.circle.fill")
                            .foregroundColor(.gray)
                    }
                }
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
            .background(Color(.systemGray6))
            .cornerRadius(24)

            // Send button
            Button(action: sendMessage) {
                Image(systemName: "arrow.up.circle.fill")
                    .font(.system(size: 36))
                    .foregroundColor(viewModel.newMessage.isEmpty ? .gray : Theme.brandGreen)
            }
            .disabled(viewModel.newMessage.isEmpty)
        }
        .padding()
        .background(Color.white)
    }

    // MARK: - Actions
    private func sendMessage() {
        viewModel.sendMessage()
    }

    private func sendQuickMessage(_ text: String) {
        viewModel.newMessage = text
        viewModel.sendMessage()
    }

    private func callDriver(phone: String) {
        if let url = URL(string: "tel://\(phone)") {
            UIApplication.shared.open(url)
        }
    }
}

// MARK: - Message Bubble
struct MessageBubble: View {
    let message: ChatMessage
    let isFromCustomer: Bool

    var body: some View {
        HStack {
            if isFromCustomer { Spacer(minLength: 60) }

            VStack(alignment: isFromCustomer ? .trailing : .leading, spacing: 4) {
                Text(message.text)
                    .font(.subheadline)
                    .foregroundColor(isFromCustomer ? .white : .primary)
                    .padding(.horizontal, 16)
                    .padding(.vertical, 10)
                    .background(isFromCustomer ? Theme.brandGreen : Color.white)
                    .cornerRadius(20)

                Text(message.timestamp, style: .time)
                    .font(.caption2)
                    .foregroundColor(.secondary)
            }

            if !isFromCustomer { Spacer(minLength: 60) }
        }
    }
}

// MARK: - Quick Message Button
struct QuickMessageButton: View {
    let text: String
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(text)
                .font(.caption)
                .foregroundColor(Theme.brandGreen)
                .padding(.horizontal, 12)
                .padding(.vertical, 8)
                .background(Theme.brandGreen.opacity(0.1))
                .cornerRadius(16)
        }
    }
}

// MARK: - Chat Message Model
struct ChatMessage: Identifiable, Codable {
    var id: String
    var orderId: String
    var senderId: String
    var senderName: String
    var senderType: String // "customer" or "driver"
    var text: String
    var timestamp: Date
    var isRead: Bool

    init(id: String = UUID().uuidString, orderId: String, senderId: String, senderName: String, senderType: String, text: String, timestamp: Date = Date(), isRead: Bool = false) {
        self.id = id
        self.orderId = orderId
        self.senderId = senderId
        self.senderName = senderName
        self.senderType = senderType
        self.text = text
        self.timestamp = timestamp
        self.isRead = isRead
    }
}

// MARK: - Chat ViewModel
class ChatViewModel: ObservableObject {
    @Published var messages: [ChatMessage] = []
    @Published var newMessage = ""
    @Published var isLoading = false
    @Published var errorMessage: String?

    let orderId: String
    var currentUserId: String {
        if let customerId = P2PAPIService.shared.currentCustomerId {
            return String(customerId)
        }
        return "customer"
    }
    var currentUserName: String {
        UserDefaults.standard.string(forKey: "customer_name") ?? "Customer"
    }

    private let p2pService = P2PAPIService.shared
    private var pollTimer: Timer?

    init(orderId: String) {
        self.orderId = orderId
    }

    func startListening() {
        // Fetch initial messages
        fetchMessages()

        // Start polling every 3 seconds
        pollTimer = Timer.scheduledTimer(withTimeInterval: 3.0, repeats: true) { [weak self] _ in
            self?.fetchMessages()
        }
    }

    func stopListening() {
        pollTimer?.invalidate()
        pollTimer = nil
    }

    func fetchMessages() {
        guard let orderIdInt = Int(orderId) else { return }

        p2pService.fetchChatMessages(orderId: orderIdInt) { [weak self] result in
            switch result {
            case .success(let response):
                let newMessages = response.messages.map { p2pMessage in
                    ChatMessage(
                        id: p2pMessage.id,
                        orderId: self?.orderId ?? "",
                        senderId: p2pMessage.senderType == "customer" ? (self?.currentUserId ?? "") : "driver",
                        senderName: p2pMessage.senderType == "customer" ? (self?.currentUserName ?? "Customer") : "Driver",
                        senderType: p2pMessage.senderType,
                        text: p2pMessage.message,
                        timestamp: ISO8601DateFormatter().date(from: p2pMessage.timestamp) ?? Date(),
                        isRead: true
                    )
                }
                DispatchQueue.main.async {
                    self?.messages = newMessages
                }
            case .failure(let error):
                #if DEBUG
                logger.info("[DriverChat] Fetch messages failed: \(error)")
                #endif
            }
        }
    }

    func sendMessage() {
        guard !newMessage.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return }
        guard let orderIdInt = Int(orderId) else { return }

        let messageText = newMessage.trimmingCharacters(in: .whitespacesAndNewlines)
        isLoading = true

        p2pService.sendChatMessage(
            orderId: orderIdInt,
            message: messageText,
            senderType: "customer"
        ) { [weak self] result in
            DispatchQueue.main.async {
                self?.isLoading = false
                switch result {
                case .success:
                    self?.newMessage = ""
                    self?.fetchMessages()
                case .failure(let error):
                    self?.errorMessage = "Message could not be sent. Please try again."
                    #if DEBUG
                    logger.info("[DriverChat] Send message failed: \(error)")
                    #endif
                }
            }
        }
    }

    deinit {
        pollTimer?.invalidate()
    }
}
