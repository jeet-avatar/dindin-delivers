import SwiftUI
import EatFairShared

/// RiderChatView - Chat with rider during a ride
/// Matches web app Messages.tsx functionality for driver-rider communication
struct RiderChatView: View {
    let rideRequestId: Int
    let riderName: String

    @Environment(\.dismiss) private var dismiss
    @StateObject private var chatManager = ChatManager.shared
    @State private var messageText = ""
    @State private var messages: [ChatMessage] = []
    @State private var isLoading = true
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
                    } else if messages.isEmpty {
                        emptyStateView
                    } else {
                        ForEach(messages) { message in
                            // Use existing MessageBubble from ChatView.swift
                            MessageBubble(message: message)
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
                Image(systemName: "paperplane.fill")
                    .font(.title3)
                    .foregroundColor(.white)
                    .frame(width: 44, height: 44)
                    .background(messageText.isEmpty ? Color.gray : Color.blue)
                    .clipShape(Circle())
            }
            .disabled(messageText.isEmpty)
        }
        .padding()
        .background(Theme.cardBackground)
    }

    // MARK: - Actions

    private func loadMessages() {
        isLoading = true

        // Load messages for this ride using conversationId
        let conversationId = "ride_\(rideRequestId)"

        // Use existing ChatManager to load messages
        chatManager.fetchMessages(for: conversationId)

        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
            isLoading = false
            // Messages will be loaded via ChatManager's published properties
            messages = chatManager.messages
        }
    }

    private func sendMessage(_ text: String) {
        guard !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return }

        let conversationId = "ride_\(rideRequestId)"

        // Use existing ChatManager's sendMessage method
        chatManager.sendMessage(text: text, to: conversationId)
        messageText = ""
        isInputFocused = false

        // Refresh messages after short delay
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
            messages = chatManager.messages
        }
    }

    private func callRider() {
        // Placeholder - would get rider phone from request
        guard let url = URL(string: "tel://") else { return }
        UIApplication.shared.open(url)
    }

    @State private var pollingTimer: Timer?

    private func startPolling() {
        // Poll for new messages every 3 seconds
        pollingTimer = Timer.scheduledTimer(withTimeInterval: 3, repeats: true) { _ in
            messages = chatManager.messages
        }
    }

    private func stopPolling() {
        pollingTimer?.invalidate()
        pollingTimer = nil
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
