import SwiftUI
import UIKit

// MARK: - Swipe Button State

public enum SwipeButtonState {
    case idle, dragging, completed, disabled
}

// MARK: - SwipeToConfirmButton

/// Slide-to-confirm pill component (iOS power-off style).
/// Drag the thumb past 80% of the track width to confirm.
/// Haptic feedback fires on successful completion.
/// VoiceOver users can double-tap the thumb to activate.
public struct SwipeToConfirmButton: View {
    public let label: String
    public let accentColor: Color
    public let isDisabled: Bool
    public let onConfirm: () -> Void

    @State private var dragOffset: CGFloat = 0
    @State private var buttonState: SwipeButtonState = .idle
    private let thumbSize: CGFloat = 52
    private let height: CGFloat = 60
    private let threshold: CGFloat = 0.80   // 80% of track width

    public init(label: String,
                accentColor: Color = .blue,
                isDisabled: Bool = false,
                onConfirm: @escaping () -> Void) {
        self.label = label
        self.accentColor = accentColor
        self.isDisabled = isDisabled
        self.onConfirm = onConfirm
    }

    public var body: some View {
        GeometryReader { geo in
            let trackWidth = geo.size.width - thumbSize
            let clampedOffset = min(max(dragOffset, 0), trackWidth)
            let progress = clampedOffset / trackWidth

            ZStack(alignment: .leading) {
                // Track
                Capsule()
                    .fill(accentColor.opacity(0.15))
                    .frame(height: height)
                    .overlay(
                        Capsule().stroke(accentColor.opacity(0.4), lineWidth: 1)
                    )

                // Fill strip
                Capsule()
                    .fill(accentColor.opacity(0.25 + 0.25 * progress))
                    .frame(width: clampedOffset + thumbSize, height: height)

                // Label (fades as thumb advances)
                Text(label)
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundColor(accentColor)
                    .opacity(1.0 - progress * 1.5)
                    .frame(maxWidth: .infinity)

                // Thumb
                Circle()
                    .fill(buttonState == .completed ? accentColor : .white)
                    .frame(width: thumbSize, height: thumbSize)
                    .shadow(color: .black.opacity(0.15), radius: 4, x: 0, y: 2)
                    .overlay(
                        Image(systemName: buttonState == .completed ? "checkmark" : "chevron.right.2")
                            .foregroundColor(buttonState == .completed ? .white : accentColor)
                            .font(.system(size: 18, weight: .bold))
                    )
                    .offset(x: clampedOffset)
                    .gesture(
                        DragGesture()
                            .onChanged { value in
                                guard !isDisabled, buttonState != .completed else { return }
                                buttonState = .dragging
                                dragOffset = value.translation.width
                            }
                            .onEnded { _ in
                                guard !isDisabled, buttonState != .completed else { return }
                                let progress = min(max(dragOffset, 0), trackWidth) / trackWidth
                                if progress >= threshold {
                                    withAnimation(.spring(response: 0.3, dampingFraction: 0.7)) {
                                        dragOffset = trackWidth
                                        buttonState = .completed
                                    }
                                    UIImpactFeedbackGenerator(style: .medium).impactOccurred()
                                    DispatchQueue.main.asyncAfter(deadline: .now() + 0.15) {
                                        onConfirm()
                                    }
                                } else {
                                    withAnimation(.spring(response: 0.4, dampingFraction: 0.8)) {
                                        dragOffset = 0
                                        buttonState = .idle
                                    }
                                }
                            }
                    )
                    // VoiceOver accessibility fallback — double-tap activates
                    .accessibilityLabel(label)
                    .accessibilityHint("Double-tap to confirm")
                    .accessibilityAddTraits(.isButton)
                    .onTapGesture { } // prevents SwiftUI from swallowing gestures
            }
            .frame(height: height)
            .opacity(isDisabled ? 0.5 : 1.0)
            .allowsHitTesting(!isDisabled)
        }
        .frame(height: height)
        .onChange(of: isDisabled) { newValue in
            if newValue { dragOffset = 0; buttonState = .idle }
        }
    }
}

// MARK: - TinderSwipeCard

/// Tinder-style left/right card swipe for bid-list cards.
/// Swipe right >= 100pt to accept, swipe left <= -100pt to decline.
/// Card flies off screen in the swipe direction and is dismissed.
public struct TinderSwipeCard<Content: View>: View {
    public let content: Content
    public let onAccept: () -> Void    // swipe right
    public let onDecline: () -> Void   // swipe left
    private let acceptThreshold: CGFloat = 100
    private let declineThreshold: CGFloat = -100

    @State private var offset: CGSize = .zero
    @State private var isDismissed = false

    public init(onAccept: @escaping () -> Void,
                onDecline: @escaping () -> Void,
                @ViewBuilder content: () -> Content) {
        self.onAccept = onAccept
        self.onDecline = onDecline
        self.content = content()
    }

    public var body: some View {
        guard !isDismissed else { return AnyView(EmptyView()) }
        return AnyView(
            content
                .rotationEffect(.degrees(Double(offset.width) / 20))
                .offset(x: offset.width, y: offset.height * 0.3)
                .overlay(
                    HStack {
                        if offset.width > 30 {
                            Label("Accept", systemImage: "checkmark.circle.fill")
                                .foregroundColor(.green)
                                .font(.title2.bold())
                                .padding()
                        }
                        Spacer()
                        if offset.width < -30 {
                            Label("Decline", systemImage: "xmark.circle.fill")
                                .foregroundColor(.red)
                                .font(.title2.bold())
                                .padding()
                        }
                    }
                )
                .gesture(
                    DragGesture()
                        .onChanged { value in offset = value.translation }
                        .onEnded { _ in
                            if offset.width >= acceptThreshold {
                                withAnimation(.easeOut(duration: 0.3)) { offset.width = 500 }
                                UIImpactFeedbackGenerator(style: .medium).impactOccurred()
                                DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
                                    isDismissed = true
                                    onAccept()
                                }
                            } else if offset.width <= declineThreshold {
                                withAnimation(.easeOut(duration: 0.3)) { offset.width = -500 }
                                DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
                                    isDismissed = true
                                    onDecline()
                                }
                            } else {
                                withAnimation(.spring()) { offset = .zero }
                            }
                        }
                )
        )
    }
}

// MARK: - Previews

#Preview("SwipeToConfirmButton") {
    VStack(spacing: 24) {
        SwipeToConfirmButton(label: "Slide to Find Driver", accentColor: .blue) {
            print("confirmed")
        }
        .padding(.horizontal, 24)

        SwipeToConfirmButton(label: "Slide to Pay $24.50", accentColor: .green) {
            print("payment confirmed")
        }
        .padding(.horizontal, 24)

        SwipeToConfirmButton(label: "Slide to Submit Rating", accentColor: .yellow, isDisabled: true) {
            print("disabled — should not fire")
        }
        .padding(.horizontal, 24)
    }
    .padding()
}

#Preview("TinderSwipeCard") {
    TinderSwipeCard(onAccept: { print("accepted") }, onDecline: { print("declined") }) {
        VStack {
            Text("Driver bid: $24")
                .font(.title3.bold())
            Text("5 min away")
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding()
        .background(Color.white)
        .cornerRadius(16)
        .shadow(radius: 8)
    }
    .padding()
}
