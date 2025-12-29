import SwiftUI
import EatFairShared

/// RiderChatView - Chat with rider during a ride
/// Uses REST API (matches Android) - no Firebase dependency
/// Endpoint: /api/p2p/ride-requests/{id}/chat (api.dollor.ai)
struct RiderChatView: View {
    let rideRequestId: Int
    let riderName: String

    @Environment(\.dismiss) private var dismiss
    @State private var messageText = ""
    @State private var messages: [RideChatMessage] = []
    @State private var isLoading = true
    @State private var isSending = false
    @State private var errorMessage: String?
    @FocusState private var isInputFocused: Bool

    private let quickMessages = [
        "I'm on my way!",
        "I've arrived",
        "I'm outside",
        "Running a few minutes late",
        "Please come to the pickup point"
    ]

    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                // Messages List
                messagesScrollView

                // Quick Messages
                quickMessagesBar

                // Input Bar
                inputBar
            }
            .background(Theme.backgroundGrey.ignoresSafeArea())
            .navigationTitle(riderName)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Close") {
                        dismiss()
                    }
                }

                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(action: callRider) {
                        Image(systemName: "phone.fill")
                            .foregroundColor(.green)
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
                            RideChatBubble(message: message, isDriver: true)
                                .id(message.id)
                        }
                    }
                }
                .padding()
            }
            .onChange(of: messages.count) { _, _ in
                // Scroll to bottom when new message arrives
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
                .foregroundColor(Theme.textSecondary)

            Text(error)
                .font(.subheadline)
                .foregroundColor(Theme.textGrey)
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
                .foregroundColor(Theme.textGrey)

            Text("No messages yet")
                .font(.headline)
                .foregroundColor(Theme.textSecondary)

            Text("Send a message to let \(riderName) know you're on the way!")
                .font(.subheadline)
                .foregroundColor(Theme.textGrey)
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
        .background(Theme.cardBackground)
    }

    // MARK: - Input Bar

    private var inputBar: some View {
        HStack(spacing: 12) {
            TextField("Type a message...", text: $messageText)
                .textFieldStyle(.plain)
                .padding(.horizontal, 16)
                .padding(.vertical, 12)
                .background(Theme.lightGrey)
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
        .background(Theme.cardBackground)
    }

    // MARK: - Actions

    private func loadMessages() {
        isLoading = true
        errorMessage = nil

        // Use REST API to fetch chat messages (matches Android)
        P2PAPIService.shared.fetchRideChatMessages(rideRequestId: rideRequestId) { result in
            isLoading = false
            switch result {
            case .success(let fetchedMessages):
                messages = fetchedMessages.sorted { $0.id < $1.id }
                errorMessage = nil
            case .failure(let error):
                #if DEBUG
                print("[RiderChatView] Failed to load messages: \(error)")
                #endif
                errorMessage = "Failed to load messages"
            }
        }
    }

    private func sendMessage(_ text: String) {
        guard !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return }

        isSending = true
        let trimmedText = text.trimmingCharacters(in: .whitespacesAndNewlines)

        // Use REST API to send message (matches Android)
        P2PAPIService.shared.sendRideChatMessage(
            rideRequestId: rideRequestId,
            message: trimmedText,
            senderType: "driver"
        ) { result in
            isSending = false
            switch result {
            case .success(let newMessage):
                messages.append(newMessage)
                messageText = ""
                isInputFocused = false
            case .failure(let error):
                #if DEBUG
                print("[RiderChatView] Failed to send message: \(error)")
                #endif
                // Keep message text so user can retry
            }
        }
    }

    private func callRider() {
        // Placeholder - would get rider phone from request
        guard let url = URL(string: "tel://") else { return }
        UIApplication.shared.open(url)
    }

    @State private var pollingTimer: Timer?

    private func startPolling() {
        // Poll for new messages every 3 seconds using REST API
        pollingTimer = Timer.scheduledTimer(withTimeInterval: 3, repeats: true) { _ in
            P2PAPIService.shared.fetchRideChatMessages(rideRequestId: rideRequestId) { result in
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

// MARK: - Ride Chat Bubble (for RideChatMessage)

private struct RideChatBubble: View {
    let message: RideChatMessage
    let isDriver: Bool // true if this view is in driver app

    private var isFromMe: Bool {
        // In driver app, messages from driver are "from me"
        return isDriver ? message.isFromDriver : !message.isFromDriver
    }

    var body: some View {
        HStack {
            if isFromMe { Spacer() }

            VStack(alignment: isFromMe ? .trailing : .leading, spacing: 4) {
                Text(message.message)
                    .padding(.horizontal, 16)
                    .padding(.vertical, 10)
                    .background(isFromMe ? Color.blue : Theme.lightGrey)
                    .foregroundColor(isFromMe ? .white : Theme.textPrimary)
                    .cornerRadius(18)

                Text(formatTime(message.createdAt))
                    .font(.caption2)
                    .foregroundColor(Theme.textGrey)
            }

            if !isFromMe { Spacer() }
        }
    }

    private func formatTime(_ isoString: String) -> String {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]

        if let date = formatter.date(from: isoString) {
            let displayFormatter = DateFormatter()
            displayFormatter.timeStyle = .short
            return displayFormatter.string(from: date)
        }

        // Try without fractional seconds
        formatter.formatOptions = [.withInternetDateTime]
        if let date = formatter.date(from: isoString) {
            let displayFormatter = DateFormatter()
            displayFormatter.timeStyle = .short
            return displayFormatter.string(from: date)
        }

        return ""
    }
}

// MARK: - Preview

#if DEBUG
struct RiderChatView_Previews: PreviewProvider {
    static var previews: some View {
        RiderChatView(rideRequestId: 1, riderName: "John")
    }
}
#endif
