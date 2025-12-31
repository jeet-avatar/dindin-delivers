import SwiftUI

/// WelcomeView - Initial onboarding screen before login
/// Matches Android's WelcomeScreen for platform parity
struct WelcomeView: View {
    @Binding var showLogin: Bool
    @State private var animateWelcome = false

    var body: some View {
        ZStack {
            // Background gradient
            LinearGradient(
                gradient: Gradient(colors: [Theme.brandOrange, Theme.brandOrange.opacity(0.8), Theme.brandGreen.opacity(0.3)]),
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .edgesIgnoringSafeArea(.all)

            VStack(spacing: 40) {
                Spacer()

                // Logo and App Name
                VStack(spacing: 20) {
                    Image(systemName: "car.side.fill")
                        .resizable()
                        .scaledToFit()
                        .frame(width: 120, height: 80)
                        .foregroundColor(.white)
                        .scaleEffect(animateWelcome ? 1.0 : 0.5)
                        .opacity(animateWelcome ? 1.0 : 0.0)
                        .animation(.spring(response: 0.8, dampingFraction: 0.6), value: animateWelcome)

                    Text("Dollor.ai")
                        .font(.system(size: 48, weight: .bold))
                        .foregroundColor(.white)
                        .offset(y: animateWelcome ? 0 : 20)
                        .opacity(animateWelcome ? 1.0 : 0.0)
                        .animation(.easeOut(duration: 0.6).delay(0.3), value: animateWelcome)

                    Text("Your Local Rideshare & Delivery Marketplace")
                        .font(.headline)
                        .foregroundColor(.white.opacity(0.9))
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 40)
                        .offset(y: animateWelcome ? 0 : 20)
                        .opacity(animateWelcome ? 1.0 : 0.0)
                        .animation(.easeOut(duration: 0.6).delay(0.5), value: animateWelcome)
                }

                Spacer()

                // Features List
                VStack(alignment: .leading, spacing: 20) {
                    FeatureRow(icon: "fork.knife", title: "Food Delivery", subtitle: "Order from local restaurants")
                    FeatureRow(icon: "car.fill", title: "Rideshare", subtitle: "Connect with local drivers")
                    FeatureRow(icon: "dollarsign.circle.fill", title: "Fair Prices", subtitle: "Transparent $1-$3 platform fees")
                }
                .padding(.horizontal, 40)
                .offset(y: animateWelcome ? 0 : 30)
                .opacity(animateWelcome ? 1.0 : 0.0)
                .animation(.easeOut(duration: 0.6).delay(0.7), value: animateWelcome)

                Spacer()

                // Action Buttons
                VStack(spacing: 16) {
                    Button(action: {
                        withAnimation {
                            showLogin = true
                        }
                    }) {
                        Text("Get Started")
                            .font(.headline)
                            .fontWeight(.bold)
                            .foregroundColor(Theme.brandOrange)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 18)
                            .background(Color.white)
                            .cornerRadius(12)
                            .shadow(color: Color.black.opacity(0.2), radius: 8, x: 0, y: 4)
                    }

                    Button(action: {
                        withAnimation {
                            showLogin = true
                        }
                    }) {
                        Text("I already have an account")
                            .font(.subheadline)
                            .foregroundColor(.white)
                    }
                }
                .padding(.horizontal, 30)
                .padding(.bottom, 50)
                .offset(y: animateWelcome ? 0 : 50)
                .opacity(animateWelcome ? 1.0 : 0.0)
                .animation(.easeOut(duration: 0.6).delay(0.9), value: animateWelcome)
            }
        }
        .onAppear {
            animateWelcome = true
        }
    }
}

// MARK: - Feature Row Component
private struct FeatureRow: View {
    let icon: String
    let title: String
    let subtitle: String

    var body: some View {
        HStack(spacing: 16) {
            Image(systemName: icon)
                .font(.title2)
                .foregroundColor(.white)
                .frame(width: 40, height: 40)
                .background(Color.white.opacity(0.2))
                .cornerRadius(10)

            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.headline)
                    .foregroundColor(.white)
                Text(subtitle)
                    .font(.caption)
                    .foregroundColor(.white.opacity(0.8))
            }
        }
    }
}

#Preview {
    WelcomeView(showLogin: .constant(false))
}
