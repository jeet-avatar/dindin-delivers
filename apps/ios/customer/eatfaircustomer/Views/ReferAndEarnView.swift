import SwiftUI
import EatFairShared

/// ReferAndEarnView - Referral program screen
/// Matches Android's ReferAndEarnScreen for platform parity
struct ReferAndEarnView: View {
    @State private var referralCode = ""
    @State private var referralStats = ReferralStats()
    @State private var isLoading = true
    @State private var showShareSheet = false
    @State private var copiedToClipboard = false

    struct ReferralStats {
        var totalReferrals: Int = 0
        var pendingCredits: Double = 0
        var earnedCredits: Double = 0
    }

    var body: some View {
        ZStack {
            Theme.brandGrey.edgesIgnoringSafeArea(.all)

            ScrollView {
                VStack(spacing: 25) {
                    // Header Card
                    VStack(spacing: 15) {
                        Image(systemName: "gift.fill")
                            .font(.system(size: 60))
                            .foregroundColor(Theme.brandOrange)

                        Text("Refer Friends, Earn Rewards")
                            .font(.title2)
                            .fontWeight(.bold)
                            .foregroundColor(Theme.brandBlack)

                        Text("Share Dollor.ai with friends and both of you earn credits!")
                            .font(.subheadline)
                            .foregroundColor(Theme.textGrey)
                            .multilineTextAlignment(.center)
                            .padding(.horizontal)
                    }
                    .padding(.vertical, 30)
                    .frame(maxWidth: .infinity)
                    .background(Color.white)
                    .cornerRadius(16)
                    .shadow(color: Color.black.opacity(0.05), radius: 10, x: 0, y: 5)
                    .padding(.horizontal)

                    // Referral Code Card
                    VStack(spacing: 15) {
                        Text("YOUR REFERRAL CODE")
                            .font(.caption)
                            .fontWeight(.bold)
                            .foregroundColor(Theme.textGrey)

                        HStack {
                            Text(referralCode.isEmpty ? "LOADING..." : referralCode)
                                .font(.system(size: 24, weight: .bold, design: .monospaced))
                                .foregroundColor(Theme.brandOrange)

                            Spacer()

                            Button(action: copyCode) {
                                Image(systemName: copiedToClipboard ? "checkmark" : "doc.on.doc")
                                    .foregroundColor(copiedToClipboard ? .green : Theme.brandOrange)
                                    .font(.title3)
                            }
                        }
                        .padding()
                        .background(Theme.brandOrange.opacity(0.1))
                        .cornerRadius(12)

                        // Share Buttons
                        HStack(spacing: 15) {
                            Button(action: { showShareSheet = true }) {
                                HStack {
                                    Image(systemName: "square.and.arrow.up")
                                    Text("Share")
                                }
                                .font(.headline)
                                .foregroundColor(.white)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 14)
                                .background(Theme.brandOrange)
                                .cornerRadius(10)
                            }

                            Button(action: copyCode) {
                                HStack {
                                    Image(systemName: "doc.on.doc")
                                    Text("Copy")
                                }
                                .font(.headline)
                                .foregroundColor(Theme.brandOrange)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 14)
                                .background(Color.white)
                                .cornerRadius(10)
                                .overlay(
                                    RoundedRectangle(cornerRadius: 10)
                                        .stroke(Theme.brandOrange, lineWidth: 2)
                                )
                            }
                        }
                    }
                    .padding(20)
                    .background(Color.white)
                    .cornerRadius(16)
                    .shadow(color: Color.black.opacity(0.05), radius: 10, x: 0, y: 5)
                    .padding(.horizontal)

                    // Stats Cards
                    HStack(spacing: 15) {
                        StatCard(
                            icon: "person.2.fill",
                            value: "\(referralStats.totalReferrals)",
                            label: "Referrals"
                        )

                        StatCard(
                            icon: "clock.fill",
                            value: String(format: "$%.2f", referralStats.pendingCredits),
                            label: "Pending"
                        )

                        StatCard(
                            icon: "checkmark.circle.fill",
                            value: String(format: "$%.2f", referralStats.earnedCredits),
                            label: "Earned"
                        )
                    }
                    .padding(.horizontal)

                    // How It Works Section
                    VStack(alignment: .leading, spacing: 15) {
                        Text("HOW IT WORKS")
                            .font(.caption)
                            .fontWeight(.bold)
                            .foregroundColor(Theme.textGrey)

                        VStack(spacing: 0) {
                            HowItWorksRow(
                                step: "1",
                                title: "Share Your Code",
                                description: "Send your unique code to friends",
                                isLast: false
                            )

                            HowItWorksRow(
                                step: "2",
                                title: "Friend Signs Up",
                                description: "They create an account with your code",
                                isLast: false
                            )

                            HowItWorksRow(
                                step: "3",
                                title: "Friend Orders",
                                description: "They place their first order",
                                isLast: false
                            )

                            HowItWorksRow(
                                step: "4",
                                title: "Both Earn Credits",
                                description: "You both get $5 in credits!",
                                isLast: true
                            )
                        }
                        .background(Color.white)
                        .cornerRadius(12)
                    }
                    .padding(.horizontal)

                    // Terms
                    Text("Referral credits expire 90 days after issue. Terms apply.")
                        .font(.caption)
                        .foregroundColor(Theme.textGrey)
                        .padding(.horizontal)
                        .padding(.bottom, 30)
                }
                .padding(.top, 20)
            }
        }
        .navigationTitle("Refer & Earn")
        .navigationBarTitleDisplayMode(.inline)
        .onAppear {
            loadReferralData()
        }
        .sheet(isPresented: $showShareSheet) {
            ShareSheet(items: [
                "Join me on Dollor.ai! Use my code \(referralCode) to get $5 off your first order. Download now: \(AppConstants.appDownloadURL)"
            ])
        }
    }

    private func loadReferralData() {
        // Generate or fetch referral code
        if let customerId = UserDefaults.standard.string(forKey: "p2p_customer_id") {
            referralCode = "DOLLOR\(customerId.prefix(4).uppercased())"
        } else {
            referralCode = "DOLLOR\(String(format: "%04d", Int.random(in: 1000...9999)))"
        }

        // Simulate loading stats (in production, fetch from API)
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
            isLoading = false
            referralStats = ReferralStats(
                totalReferrals: Int.random(in: 0...5),
                pendingCredits: Double.random(in: 0...15),
                earnedCredits: Double.random(in: 0...25)
            )
        }
    }

    private func copyCode() {
        UIPasteboard.general.string = referralCode
        copiedToClipboard = true

        // Reset after 2 seconds
        DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
            copiedToClipboard = false
        }
    }
}

// MARK: - Stat Card Component
struct StatCard: View {
    let icon: String
    let value: String
    let label: String

    var body: some View {
        VStack(spacing: 8) {
            Image(systemName: icon)
                .font(.title2)
                .foregroundColor(Theme.brandOrange)

            Text(value)
                .font(.title3)
                .fontWeight(.bold)
                .foregroundColor(Theme.brandBlack)

            Text(label)
                .font(.caption)
                .foregroundColor(Theme.textGrey)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 20)
        .background(Color.white)
        .cornerRadius(12)
        .shadow(color: Color.black.opacity(0.05), radius: 5, x: 0, y: 2)
    }
}

// MARK: - How It Works Row
struct HowItWorksRow: View {
    let step: String
    let title: String
    let description: String
    let isLast: Bool

    var body: some View {
        HStack(alignment: .top, spacing: 15) {
            // Step indicator
            VStack {
                ZStack {
                    Circle()
                        .fill(Theme.brandOrange)
                        .frame(width: 30, height: 30)

                    Text(step)
                        .font(.caption)
                        .fontWeight(.bold)
                        .foregroundColor(.white)
                }

                if !isLast {
                    Rectangle()
                        .fill(Theme.brandOrange.opacity(0.3))
                        .frame(width: 2, height: 30)
                }
            }

            // Content
            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.subheadline)
                    .fontWeight(.semibold)
                    .foregroundColor(Theme.brandBlack)

                Text(description)
                    .font(.caption)
                    .foregroundColor(Theme.textGrey)
            }
            .padding(.bottom, isLast ? 0 : 10)

            Spacer()
        }
        .padding(.horizontal)
        .padding(.vertical, 10)
    }
}

// MARK: - Share Sheet
struct ShareSheet: UIViewControllerRepresentable {
    let items: [Any]

    func makeUIViewController(context: Context) -> UIActivityViewController {
        UIActivityViewController(activityItems: items, applicationActivities: nil)
    }

    func updateUIViewController(_ uiViewController: UIActivityViewController, context: Context) {}
}

#Preview {
    NavigationView {
        ReferAndEarnView()
    }
}
