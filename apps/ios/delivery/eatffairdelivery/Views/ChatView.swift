import SwiftUI
import MapKit

// MARK: - Chat View
struct ChatView: View {
    let conversationId: String
    let customerName: String
    let orderId: String
    var customerPhone: String? = nil

    @StateObject private var chatManager = ChatManager.shared
    @StateObject private var voiceAssistant = VoiceAssistantManager.shared
    @StateObject private var locationManager = LocationManager.shared
    @State private var messageText = ""
    @State private var showQuickResponses = false
    @State private var showLocationShare = false
    @FocusState private var isMessageFieldFocused: Bool

    var body: some View {
        VStack(spacing: 0) {
            // Messages List
            ScrollViewReader { proxy in
                ScrollView {
                    LazyVStack(spacing: 12) {
                        ForEach(chatManager.messages) { message in
                            MessageBubble(message: message)
                                .id(message.id)
                        }
                    }
                    .padding()
                }
                .onChange(of: chatManager.messages.count) { _, _ in
                    if let lastMessage = chatManager.messages.last {
                        withAnimation {
                            proxy.scrollTo(lastMessage.id, anchor: .bottom)
                        }
                    }
                }
            }

            // Quick Responses Bar
            if showQuickResponses {
                QuickResponsesBar(onSelect: { response in
                    chatManager.sendQuickResponse(response, to: conversationId)
                    showQuickResponses = false
                })
            }

            // Input Bar
            ChatInputBar(
                messageText: $messageText,
                showQuickResponses: $showQuickResponses,
                isVoiceListening: voiceAssistant.isListening,
                onSend: sendMessage,
                onVoice: toggleVoice,
                onLocation: { showLocationShare = true }
            )
            .focused($isMessageFieldFocused)
        }
        .navigationTitle(customerName)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                HStack(spacing: 12) {
                    // Voice Assistant Button
                    Button(action: { voiceAssistant.startListening() }) {
                        Image(systemName: voiceAssistant.isListening ? "waveform.circle.fill" : "speaker.wave.2.fill")
                            .foregroundColor(voiceAssistant.isListening ? .green : Theme.brandRed)
                            .font(.title3)
                    }

                    // Call Button
                    Button(action: callCustomer) {
                        Image(systemName: "phone.fill")
                            .foregroundColor(Theme.brandRed)
                    }
                }
            }
        }
        .onAppear {
            chatManager.fetchMessages(for: conversationId)
        }
        .sheet(isPresented: $showLocationShare) {
            ShareLocationSheet(
                onShare: {
                    if let coord = locationManager.currentCoordinate {
                        chatManager.sendLocation(
                            latitude: coord.latitude,
                            longitude: coord.longitude,
                            to: conversationId
                        )
                    }
                    showLocationShare = false
                }
            )
            .presentationDetents([.medium])
        }
    }

    private func sendMessage() {
        guard !messageText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return }
        chatManager.sendMessage(text: messageText, to: conversationId)
        messageText = ""
    }

    private func toggleVoice() {
        if voiceAssistant.isListening {
            voiceAssistant.stopListening()
            // Use transcribed text as message
            if !voiceAssistant.transcribedText.isEmpty {
                messageText = voiceAssistant.transcribedText
            }
        } else {
            voiceAssistant.startListening()
        }
    }

    private func callCustomer() {
        guard let phone = customerPhone, !phone.isEmpty else {
            voiceAssistant.speak("Customer phone number not available")
            return
        }
        let cleanPhone = phone.replacingOccurrences(of: " ", with: "")
            .replacingOccurrences(of: "-", with: "")
            .replacingOccurrences(of: "(", with: "")
            .replacingOccurrences(of: ")", with: "")
        if let url = URL(string: "tel://\(cleanPhone)") {
            UIApplication.shared.open(url)
        }
    }
}

// MARK: - Message Bubble
struct MessageBubble: View {
    let message: ChatMessage

    var body: some View {
        HStack {
            if message.isFromDriver { Spacer(minLength: 60) }

            VStack(alignment: message.isFromDriver ? .trailing : .leading, spacing: 4) {
                // Message Content
                if message.isSystem {
                    systemMessageView
                } else if message.type == "location" {
                    locationMessageView
                } else if message.type == "voice" {
                    voiceMessageView
                } else {
                    textMessageView
                }

                // Timestamp
                Text(message.messageDate, style: .time)
                    .font(.caption2)
                    .foregroundColor(Theme.textGrey)
            }

            if !message.isFromDriver && !message.isSystem { Spacer(minLength: 60) }
        }
    }

    private var textMessageView: some View {
        Text(message.text ?? "")
            .font(.body)
            .foregroundColor(message.isFromDriver ? .white : Theme.textPrimary)
            .padding(.horizontal, 16)
            .padding(.vertical, 10)
            .background(message.isFromDriver ? Theme.brandRed : Theme.cardBackground)
            .cornerRadius(20)
            .shadow(color: .black.opacity(0.05), radius: 2, x: 0, y: 1)
    }

    private var systemMessageView: some View {
        Text(message.text ?? "")
            .font(.caption)
            .foregroundColor(Theme.textGrey)
            .padding(.horizontal, 12)
            .padding(.vertical, 6)
            .background(Theme.backgroundGrey)
            .cornerRadius(12)
    }

    private var locationMessageView: some View {
        VStack(spacing: 0) {
            if let lat = message.latitude, let lon = message.longitude {
                Map(position: .constant(.region(MKCoordinateRegion(
                    center: CLLocationCoordinate2D(latitude: lat, longitude: lon),
                    span: MKCoordinateSpan(latitudeDelta: 0.01, longitudeDelta: 0.01)
                )))) {
                    Marker("Location", coordinate: CLLocationCoordinate2D(latitude: lat, longitude: lon))
                }
                .frame(width: 200, height: 120)
                .cornerRadius(12)
                .disabled(true)

                HStack {
                    Image(systemName: "location.fill")
                    Text("Shared Location")
                }
                .font(.caption)
                .foregroundColor(message.isFromDriver ? .white : Theme.textPrimary)
                .padding(8)
                .frame(width: 200)
                .background(message.isFromDriver ? Theme.brandRed : Theme.cardBackground)
                .cornerRadius(12, corners: [.bottomLeft, .bottomRight])
            }
        }
    }

    private var voiceMessageView: some View {
        HStack(spacing: 12) {
            Image(systemName: "play.circle.fill")
                .font(.title2)
                .foregroundColor(message.isFromDriver ? .white : Theme.brandRed)

            VStack(alignment: .leading, spacing: 2) {
                // Audio waveform placeholder
                HStack(spacing: 2) {
                    ForEach(0..<20, id: \.self) { _ in
                        RoundedRectangle(cornerRadius: 1)
                            .fill(message.isFromDriver ? Color.white.opacity(0.7) : Theme.brandRed.opacity(0.5))
                            .frame(width: 3, height: CGFloat.random(in: 8...24))
                    }
                }

                Text("\(message.duration ?? 0)s")
                    .font(.caption2)
                    .foregroundColor(message.isFromDriver ? .white.opacity(0.7) : Theme.textGrey)
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 10)
        .background(message.isFromDriver ? Theme.brandRed : Theme.cardBackground)
        .cornerRadius(20)
    }
}

// MARK: - Chat Input Bar
struct ChatInputBar: View {
    @Binding var messageText: String
    @Binding var showQuickResponses: Bool
    let isVoiceListening: Bool
    let onSend: () -> Void
    let onVoice: () -> Void
    let onLocation: () -> Void

    var body: some View {
        VStack(spacing: 0) {
            Divider()

            HStack(spacing: 12) {
                // Quick Responses Toggle
                Button(action: { showQuickResponses.toggle() }) {
                    Image(systemName: "bolt.fill")
                        .foregroundColor(showQuickResponses ? Theme.brandRed : Theme.textGrey)
                }

                // Location Share
                Button(action: onLocation) {
                    Image(systemName: "location.fill")
                        .foregroundColor(Theme.textGrey)
                }

                // Text Field
                HStack {
                    TextField("Type a message...", text: $messageText)
                        .textFieldStyle(.plain)

                    if messageText.isEmpty {
                        // Voice Input
                        Button(action: onVoice) {
                            Image(systemName: isVoiceListening ? "waveform" : "mic.fill")
                                .foregroundColor(isVoiceListening ? .green : Theme.textGrey)
                        }
                    }
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 10)
                .background(Theme.backgroundGrey)
                .cornerRadius(20)

                // Send Button
                Button(action: onSend) {
                    Image(systemName: "arrow.up.circle.fill")
                        .font(.title2)
                        .foregroundColor(messageText.isEmpty ? Theme.textGrey : Theme.brandRed)
                }
                .disabled(messageText.isEmpty)
            }
            .padding()
        }
        .background(Theme.cardBackground)
    }
}

// MARK: - Quick Responses Bar
struct QuickResponsesBar: View {
    let onSelect: (QuickResponse) -> Void

    var body: some View {
        VStack(spacing: 0) {
            Divider()

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    ForEach(QuickResponse.allCases, id: \.rawValue) { response in
                        Button(action: { onSelect(response) }) {
                            HStack(spacing: 6) {
                                Image(systemName: response.icon)
                                    .font(.caption)
                                Text(response.message)
                                    .font(.caption)
                                    .lineLimit(1)
                            }
                            .padding(.horizontal, 12)
                            .padding(.vertical, 8)
                            .background(Theme.brandRed.opacity(0.1))
                            .foregroundColor(Theme.brandRed)
                            .cornerRadius(16)
                        }
                    }
                }
                .padding(.horizontal)
                .padding(.vertical, 8)
            }
            .background(Theme.cardBackground)
        }
    }
}

// MARK: - Share Location Sheet
struct ShareLocationSheet: View {
    @StateObject private var locationManager = LocationManager.shared
    let onShare: () -> Void

    var body: some View {
        VStack(spacing: 20) {
            // Header
            HStack {
                Text("Share Your Location")
                    .font(.headline)
                Spacer()
            }
            .padding()

            // Map Preview
            if let coord = locationManager.currentCoordinate {
                Map(position: .constant(.region(MKCoordinateRegion(
                    center: coord,
                    span: MKCoordinateSpan(latitudeDelta: 0.01, longitudeDelta: 0.01)
                )))) {
                    Annotation("You", coordinate: coord) {
                        Image(systemName: "car.fill")
                            .foregroundColor(.white)
                            .padding(8)
                            .background(Theme.brandRed)
                            .clipShape(Circle())
                    }
                }
                .frame(height: 200)
                .cornerRadius(12)
                .padding(.horizontal)
            } else {
                VStack {
                    ProgressView()
                    Text("Getting location...")
                        .foregroundColor(Theme.textGrey)
                }
                .frame(height: 200)
            }

            // Share Button
            Button(action: onShare) {
                HStack {
                    Image(systemName: "location.fill")
                    Text("Share Current Location")
                }
                .font(.headline)
                .foregroundColor(.white)
                .frame(maxWidth: .infinity)
                .padding()
                .background(Theme.brandRed)
                .cornerRadius(12)
            }
            .padding(.horizontal)
            .disabled(locationManager.currentCoordinate == nil)

            Spacer()
        }
    }
}

// MARK: - Conversations List View
struct ConversationsListView: View {
    @StateObject private var chatManager = ChatManager.shared

    var body: some View {
        NavigationView {
            Group {
                if chatManager.conversations.isEmpty {
                    EmptyConversationsView()
                } else {
                    List(chatManager.conversations) { conversation in
                        NavigationLink(destination: ChatView(
                            conversationId: conversation.id ?? "",
                            customerName: conversation.customerName,
                            orderId: conversation.orderId
                        )) {
                            ConversationRow(conversation: conversation)
                        }
                    }
                    .listStyle(.plain)
                }
            }
            .navigationTitle("Messages")
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    if chatManager.unreadCount > 0 {
                        Text("\(chatManager.unreadCount) unread")
                            .font(.caption)
                            .foregroundColor(.white)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 4)
                            .background(Theme.brandRed)
                            .cornerRadius(12)
                    }
                }
            }
        }
        .onAppear {
            chatManager.fetchConversations()
        }
    }
}

struct ConversationRow: View {
    let conversation: Conversation

    var body: some View {
        HStack(spacing: 12) {
            // Avatar
            ZStack {
                Circle()
                    .fill(Theme.brandRed.opacity(0.1))
                    .frame(width: 50, height: 50)

                Text(String(conversation.customerName.prefix(1)).uppercased())
                    .font(.title3)
                    .fontWeight(.semibold)
                    .foregroundColor(Theme.brandRed)
            }

            // Content
            VStack(alignment: .leading, spacing: 4) {
                HStack {
                    Text(conversation.customerName)
                        .font(.headline)
                        .foregroundColor(Theme.textPrimary)

                    Spacer()

                    Text(conversation.lastMessageDate, style: .time)
                        .font(.caption)
                        .foregroundColor(Theme.textGrey)
                }

                HStack {
                    Text(conversation.restaurantName)
                        .font(.caption)
                        .foregroundColor(Theme.brandRed)

                    Text("•")
                        .foregroundColor(Theme.textGrey)

                    Text(conversation.lastMessage)
                        .font(.subheadline)
                        .foregroundColor(Theme.textSecondary)
                        .lineLimit(1)

                    Spacer()

                    if conversation.unreadCountDriver > 0 {
                        Text("\(conversation.unreadCountDriver)")
                            .font(.caption)
                            .foregroundColor(.white)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 2)
                            .background(Theme.brandRed)
                            .cornerRadius(10)
                    }
                }
            }
        }
        .padding(.vertical, 4)
    }
}

struct EmptyConversationsView: View {
    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: "message.fill")
                .font(.system(size: 60))
                .foregroundColor(Theme.textGrey)

            Text("No Messages Yet")
                .font(.title2)
                .fontWeight(.semibold)

            Text("When you accept deliveries, you can chat\ndirectly with customers here")
                .font(.subheadline)
                .foregroundColor(Theme.textSecondary)
                .multilineTextAlignment(.center)
        }
        .padding()
    }
}

// Note: cornerRadius(_:corners:) extension is defined in MyDeliveriesView.swift

#Preview {
    ConversationsListView()
}
