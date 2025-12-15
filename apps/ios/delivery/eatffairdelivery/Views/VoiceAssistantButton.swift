import SwiftUI

// MARK: - Voice Assistant Floating Button
/// Floating speaker button that provides hands-free assistance to drivers
/// Can be placed on any view to enable voice commands
struct VoiceAssistantButton: View {
    @StateObject private var voiceAssistant = VoiceAssistantManager.shared
    @State private var isExpanded = false
    @State private var showHelpSheet = false

    var body: some View {
        VStack(alignment: .trailing, spacing: 12) {
            // Transcribed Text Bubble
            if voiceAssistant.isListening || !voiceAssistant.transcribedText.isEmpty {
                TranscriptionBubble(
                    text: voiceAssistant.transcribedText,
                    isListening: voiceAssistant.isListening
                )
                .transition(.opacity.combined(with: .scale))
            }

            // Expanded Menu
            if isExpanded {
                VStack(spacing: 8) {
                    QuickActionButton(icon: "questionmark.circle.fill", label: "Help") {
                        voiceAssistant.speak(VoiceAssistantManager.VoiceCommand.help.confirmationMessage)
                    }

                    QuickActionButton(icon: "dollarsign.circle.fill", label: "Earnings") {
                        NotificationCenter.default.post(
                            name: .voiceCommandRecognized,
                            object: nil,
                            userInfo: ["command": VoiceAssistantManager.VoiceCommand.checkEarnings]
                        )
                    }

                    QuickActionButton(icon: "message.fill", label: "Messages") {
                        voiceAssistant.speak("Opening messages")
                        NotificationCenter.default.post(
                            name: .voiceCommandRecognized,
                            object: nil,
                            userInfo: ["command": VoiceAssistantManager.VoiceCommand.readMessages]
                        )
                    }
                }
                .transition(.opacity.combined(with: .move(edge: .bottom)))
            }

            // Main Button
            Button(action: {
                if voiceAssistant.isListening {
                    voiceAssistant.stopListening()
                } else {
                    withAnimation(.spring(response: 0.3)) {
                        isExpanded.toggle()
                    }
                    if isExpanded {
                        // Start listening after short delay
                        DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
                            voiceAssistant.startListening()
                        }
                    }
                }
            }) {
                ZStack {
                    // Pulsing background when listening
                    if voiceAssistant.isListening {
                        Circle()
                            .fill(Theme.brandRed.opacity(0.3))
                            .frame(width: 70, height: 70)
                            .scaleEffect(voiceAssistant.isListening ? 1.3 : 1.0)
                            .animation(.easeInOut(duration: 0.8).repeatForever(autoreverses: true), value: voiceAssistant.isListening)
                    }

                    // Main button
                    Circle()
                        .fill(voiceAssistant.isListening ? Color.green : Theme.brandRed)
                        .frame(width: 60, height: 60)
                        .shadow(color: .black.opacity(0.2), radius: 8, x: 0, y: 4)

                    // Icon
                    Image(systemName: voiceAssistant.isListening ? "waveform" : "speaker.wave.2.fill")
                        .font(.title2)
                        .foregroundColor(.white)
                        .symbolEffect(.variableColor, isActive: voiceAssistant.isListening)
                }
            }
            .gesture(
                LongPressGesture(minimumDuration: 0.5)
                    .onEnded { _ in
                        showHelpSheet = true
                    }
            )
        }
        .padding()
        .animation(.spring(response: 0.3), value: isExpanded)
        .animation(.spring(response: 0.3), value: voiceAssistant.isListening)
        .sheet(isPresented: $showHelpSheet) {
            VoiceCommandsHelpSheet()
                .presentationDetents([.medium, .large])
        }
    }
}

// MARK: - Transcription Bubble
struct TranscriptionBubble: View {
    let text: String
    let isListening: Bool

    var body: some View {
        HStack(spacing: 8) {
            if isListening {
                // Listening indicator
                HStack(spacing: 3) {
                    ForEach(0..<3, id: \.self) { index in
                        Circle()
                            .fill(Color.green)
                            .frame(width: 6, height: 6)
                            .scaleEffect(isListening ? 1.0 : 0.5)
                            .animation(
                                .easeInOut(duration: 0.4)
                                    .repeatForever()
                                    .delay(Double(index) * 0.15),
                                value: isListening
                            )
                    }
                }
            }

            Text(text.isEmpty ? "Listening..." : text)
                .font(.subheadline)
                .foregroundColor(Theme.textPrimary)
                .lineLimit(2)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .background(Theme.cardBackground)
        .cornerRadius(20)
        .shadow(color: .black.opacity(0.1), radius: 4, x: 0, y: 2)
        .frame(maxWidth: 250, alignment: .trailing)
    }
}

// MARK: - Quick Action Button
struct QuickActionButton: View {
    let icon: String
    let label: String
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 8) {
                Image(systemName: icon)
                Text(label)
                    .fontWeight(.medium)
            }
            .font(.subheadline)
            .foregroundColor(.white)
            .padding(.horizontal, 16)
            .padding(.vertical, 10)
            .background(Theme.brandRed.opacity(0.9))
            .cornerRadius(20)
            .shadow(color: .black.opacity(0.15), radius: 4, x: 0, y: 2)
        }
    }
}

// MARK: - Voice Commands Help Sheet
struct VoiceCommandsHelpSheet: View {
    @Environment(\.dismiss) private var dismiss
    @StateObject private var voiceAssistant = VoiceAssistantManager.shared

    var body: some View {
        NavigationView {
            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    // Header
                    VStack(alignment: .leading, spacing: 8) {
                        HStack {
                            Image(systemName: "speaker.wave.2.fill")
                                .font(.largeTitle)
                                .foregroundColor(Theme.brandRed)

                            Text("Voice Assistant")
                                .font(.largeTitle)
                                .fontWeight(.bold)
                        }

                        Text("Hands-free control while you drive. Just tap the speaker button and say a command.")
                            .font(.body)
                            .foregroundColor(Theme.textSecondary)
                    }
                    .padding(.horizontal)

                    // Commands List
                    VStack(alignment: .leading, spacing: 16) {
                        Text("Available Commands")
                            .font(.headline)
                            .padding(.horizontal)

                        ForEach(VoiceAssistantManager.VoiceCommand.allCases, id: \.rawValue) { command in
                            CommandRow(command: command)
                        }
                    }

                    // Tips Section
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Tips")
                            .font(.headline)
                            .padding(.horizontal)

                        TipRow(icon: "hand.tap.fill", text: "Tap the button once to start listening")
                        TipRow(icon: "hand.point.up.left.fill", text: "Long press for this help menu")
                        TipRow(icon: "car.fill", text: "Works while navigating - stay safe!")
                        TipRow(icon: "message.fill", text: "Dictate messages to customers hands-free")
                    }

                    Spacer(minLength: 40)
                }
                .padding(.vertical)
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") {
                        dismiss()
                    }
                    .foregroundColor(Theme.brandRed)
                }
            }
        }
    }
}

struct CommandRow: View {
    let command: VoiceAssistantManager.VoiceCommand
    @StateObject private var voiceAssistant = VoiceAssistantManager.shared

    var commandIcon: String {
        switch command {
        case .navigateToPickup, .navigateToDropoff: return "location.fill"
        case .markDelivered: return "checkmark.circle.fill"
        case .callCustomer: return "phone.fill"
        case .sendMessage, .readMessages: return "message.fill"
        case .acceptOrder: return "hand.thumbsup.fill"
        case .declineOrder: return "hand.thumbsdown.fill"
        case .goOnline, .goOffline: return "power"
        case .checkEarnings: return "dollarsign.circle.fill"
        case .help: return "questionmark.circle.fill"
        }
    }

    var body: some View {
        Button(action: {
            voiceAssistant.speak(command.confirmationMessage)
        }) {
            HStack(spacing: 16) {
                Image(systemName: commandIcon)
                    .font(.title3)
                    .foregroundColor(Theme.brandRed)
                    .frame(width: 30)

                VStack(alignment: .leading, spacing: 2) {
                    Text("\"\(command.rawValue)\"")
                        .font(.subheadline)
                        .fontWeight(.semibold)
                        .foregroundColor(Theme.textPrimary)

                    Text(command.confirmationMessage)
                        .font(.caption)
                        .foregroundColor(Theme.textSecondary)
                        .lineLimit(2)
                }

                Spacer()

                Image(systemName: "speaker.wave.1.fill")
                    .foregroundColor(Theme.textGrey)
                    .font(.caption)
            }
            .padding()
            .background(Theme.cardBackground)
            .cornerRadius(12)
        }
        .padding(.horizontal)
    }
}

struct TipRow: View {
    let icon: String
    let text: String

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .foregroundColor(Theme.statusInfo)
                .frame(width: 24)

            Text(text)
                .font(.subheadline)
                .foregroundColor(Theme.textSecondary)
        }
        .padding(.horizontal)
    }
}

// MARK: - Voice Assistant Overlay
/// Full-screen overlay when voice assistant is actively listening
struct VoiceAssistantOverlay: View {
    @StateObject private var voiceAssistant = VoiceAssistantManager.shared
    @Binding var isPresented: Bool

    var body: some View {
        if isPresented && voiceAssistant.isListening {
            ZStack {
                // Background
                Color.black.opacity(0.7)
                    .ignoresSafeArea()
                    .onTapGesture {
                        voiceAssistant.stopListening()
                        isPresented = false
                    }

                // Content
                VStack(spacing: 32) {
                    // Animated Waveform
                    HStack(spacing: 4) {
                        ForEach(0..<12, id: \.self) { index in
                            RoundedRectangle(cornerRadius: 2)
                                .fill(Color.white)
                                .frame(width: 4, height: CGFloat.random(in: 20...60))
                                .animation(
                                    .easeInOut(duration: 0.3)
                                        .repeatForever()
                                        .delay(Double(index) * 0.05),
                                    value: voiceAssistant.isListening
                                )
                        }
                    }
                    .frame(height: 60)

                    // Transcription
                    Text(voiceAssistant.transcribedText.isEmpty ? "Listening..." : voiceAssistant.transcribedText)
                        .font(.title2)
                        .fontWeight(.medium)
                        .foregroundColor(.white)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 32)

                    // Cancel Button
                    Button(action: {
                        voiceAssistant.stopListening()
                        isPresented = false
                    }) {
                        Text("Cancel")
                            .font(.headline)
                            .foregroundColor(.white)
                            .padding(.horizontal, 32)
                            .padding(.vertical, 12)
                            .background(Color.white.opacity(0.2))
                            .cornerRadius(24)
                    }
                }
            }
            .transition(.opacity)
        }
    }
}

#Preview {
    ZStack {
        Color.gray.opacity(0.2).ignoresSafeArea()

        VStack {
            Spacer()
            HStack {
                Spacer()
                VoiceAssistantButton()
            }
        }
    }
}
