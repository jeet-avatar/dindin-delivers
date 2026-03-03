import SwiftUI
import EatFairShared
import os

private let logger = Logger(subsystem: "com.dollorai.customer", category: "OrderChatView")

/// OrderChatView - Chat with delivery driver during a food order (Customer side)
/// Uses REST API: /api/customer/orders/{order_id}/chat
/// Pattern: cloned from DriverChatView (rideshare chat) with order-specific quick messages
struct OrderChatView: View {
    let orderId: Int
    let driverName: String
    let driverPhone: String?

    @Environment(\.dismiss) private var dismiss
    @State private var messageText = ""
    @State private var messages: [OrderChatMessage] = []
    @State private var isLoading = true
    @State private var isSending = false
    @State private var errorMessage: String?
    @FocusState private var isInputFocused: Bool
    @State private var pollingTimer: Timer?

    private let quickMessages = [
        "Where is my order?",
        "How long will it take?",
        "I'm at the door",
        "Please leave at the door",
        "Can you call me?",
        "Thank you!"
    ]

    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                messagesScrollView
                quickMessagesBar
                inputBar
            }
            .background(Color(UIColor.systemGroupedBackground).ignoresSafeArea())
            .navigationTitle(driverName)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Close") {
                        dismiss()
                    }
                }

                ToolbarItem(placement: .navigationBarTrailing) {
                    if let phone = driverPhone, !phone.isEmpty {
                        Button(action: callDriver) {
                            Image(systemName: "phone.fill")
                                .foregroundColor(.green)
                        }
                    }
                }
            }
            .onAppear {
                loadMessages()
                startPolling()
            }
            .onDisappear {
                stopPolling()
            }
        }
    }

    // MARK: - Messages Scroll View

    private var messagesScrollView: some View {
        ScrollViewReader { proxy in
            ScrollView {
                LazyVStack(spacing: 12) {
                    if isLoading {
                        ProgressView()
                            .padding(.top, 40)
                    } else if let error = errorMessage {
                        errorStateView(error)
                    } else if messages.isEmpty {
                        emptyStateView
                    } else {
                        ForEach(messages) { message in
                            OrderChatBubbleCustomer(message: message)
                                .id(message.id)
                        }
                    }
                }
                .padding()
            }
            .onChange(of: messages.count) { _, _ in
                if let lastMessage = messages.last {
                    withAnimation {
                        proxy.scrollTo(lastMessage.id, anchor: .bottom)
                    }
                }
            }
        }
    }

    // MARK: - Error State

    private func errorStateView(_ error: String) -> some View {
        VStack(spacing: 16) {
            Image(systemName: "exclamationmark.triangle.fill")
                .font(.system(size: 50))
                .foregroundColor(.orange)

            Text("Connection Error")
                .font(.headline)
                .foregroundColor(.secondary)

            Text(error)
                .font(.subheadline)
                .foregroundColor(.gray)
                .multilineTextAlignment(.center)

            Button("Retry") {
                loadMessages()
            }
            .buttonStyle(.borderedProminent)
        }
        .padding(.top, 60)
    }

    // MARK: - Empty State

    private var emptyStateView: some View {
        VStack(spacing: 16) {
            Image(systemName: "message.badge.filled.fill")
                .font(.system(size: 50))
                .foregroundColor(.gray)

            Text("No messages yet")
                .font(.headline)
                .foregroundColor(.secondary)

            Text("Send a message to your driver!")
                .font(.subheadline)
                .foregroundColor(.gray)
                .multilineTextAlignment(.center)
        }
        .padding(.top, 60)
    }

    // MARK: - Quick Messages Bar

    private var quickMessagesBar: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(quickMessages, id: \.self) { message in
                    Button(action: { sendMessage(message) }) {
                        Text(message)
                            .font(.caption)
                            .foregroundColor(.blue)
                            .padding(.horizontal, 12)
                            .padding(.vertical, 8)
                            .background(Color.blue.opacity(0.1))
                            .cornerRadius(16)
                    }
                }
            }
            .padding(.horizontal)
            .padding(.vertical, 8)
        }
        .background(Color(UIColor.secondarySystemGroupedBackground))
    }

    // MARK: - Input Bar

    private var inputBar: some View {
        HStack(spacing: 12) {
            TextField("Type a message...", text: $messageText)
                .textFieldStyle(.plain)
                .padding(.horizontal, 16)
                .padding(.vertical, 12)
                .background(Color(UIColor.tertiarySystemGroupedBackground))
                .cornerRadius(24)
                .focused($isInputFocused)

            Button(action: { sendMessage(messageText) }) {
                if isSending {
                    ProgressView()
                        .frame(width: 44, height: 44)
                } else {
                    Image(systemName: "paperplane.fill")
                        .font(.title3)
                        .foregroundColor(.white)
                        .frame(width: 44, height: 44)
                        .background(messageText.isEmpty ? Color.gray : Color.blue)
                        .clipShape(Circle())
                }
            }
            .disabled(messageText.isEmpty || isSending)
        }
        .padding()
        .background(Color(UIColor.secondarySystemGroupedBackground))
    }

    // MARK: - Actions

    private func loadMessages() {
        isLoading = true
        errorMessage = nil

        P2PAPIService.shared.fetchOrderChatMessages(orderId: orderId) { result in
            isLoading = false
            switch result {
            case .success(let fetchedMessages):
                messages = fetchedMessages.sorted { $0.id < $1.id }
                errorMessage = nil
            case .failure(let error):
                logger.info("[OrderChatView] Failed to load messages: \(error)")
                errorMessage = "Failed to load messages"
            }
        }
    }

    private func sendMessage(_ text: String) {
        guard !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return }

        isSending = true
        let trimmedText = text.trimmingCharacters(in: .whitespacesAndNewlines)

        P2PAPIService.shared.sendOrderChatMessage(
            orderId: orderId,
            message: trimmedText,
            senderType: "customer"
        ) { result in
            isSending = false
            switch result {
            case .success:
                messageText = ""
                isInputFocused = false
                // Refresh messages to pick up the sent message
                loadMessages()
            case .failure(let error):
                logger.info("[OrderChatView] Failed to send message: \(error)")
            }
        }
    }

    private func callDriver() {
        guard let phone = driverPhone, !phone.isEmpty else { return }
        let cleanPhone = phone.replacingOccurrences(of: "[^0-9+]", with: "", options: .regularExpression)
        guard let url = URL(string: "tel://\(cleanPhone)") else { return }
        UIApplication.shared.open(url)
    }

    private func startPolling() {
        pollingTimer = Timer.scheduledTimer(withTimeInterval: 3, repeats: true) { _ in
            P2PAPIService.shared.fetchOrderChatMessages(orderId: orderId) { result in
                if case .success(let fetchedMessages) = result {
                    let sortedMessages = fetchedMessages.sorted { $0.id < $1.id }
                    if sortedMessages.count != messages.count {
                        messages = sortedMessages
                    }
                }
            }
        }
    }

    private func stopPolling() {
        pollingTimer?.invalidate()
        pollingTimer = nil
    }
}

// MARK: - Chat Bubble (Customer perspective for order chat)

private struct OrderChatBubbleCustomer: View {
    let message: OrderChatMessage

    // In customer app, customer messages are "from me"
    private var isFromMe: Bool {
        !message.isFromDriver
    }

    var body: some View {
        HStack {
            if isFromMe { Spacer() }

            VStack(alignment: isFromMe ? .trailing : .leading, spacing: 4) {
                Text(message.message)
                    .padding(.horizontal, 16)
                    .padding(.vertical, 10)
                    .background(isFromMe ? Color.blue : Color(UIColor.tertiarySystemGroupedBackground))
                    .foregroundColor(isFromMe ? .white : .primary)
                    .cornerRadius(18)

                Text(formatTime(message.createdAt))
                    .font(.caption2)
                    .foregroundColor(.gray)
            }

            if !isFromMe { Spacer() }
        }
    }

    private func formatTime(_ isoString: String?) -> String {
        guard let isoString = isoString else { return "" }

        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]

        if let date = formatter.date(from: isoString) {
            let displayFormatter = DateFormatter()
            displayFormatter.timeStyle = .short
            return displayFormatter.string(from: date)
        }

        formatter.formatOptions = [.withInternetDateTime]
        if let date = formatter.date(from: isoString) {
            let displayFormatter = DateFormatter()
            displayFormatter.timeStyle = .short
            return displayFormatter.string(from: date)
        }

        return ""
    }
}
