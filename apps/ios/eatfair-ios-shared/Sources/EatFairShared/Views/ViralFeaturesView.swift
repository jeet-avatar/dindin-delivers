import SwiftUI

// MARK: - Referral Hub View

public struct ReferralHubView: View {
    @StateObject private var viewModel = ReferralViewModel()
    @State private var showShareSheet = false

    public init() {}

    public var body: some View {
        ScrollView {
            VStack(spacing: 24) {
                // Hero Section
                heroSection

                // Your Referral Code
                referralCodeSection

                // Stats
                statsSection

                // How It Works
                howItWorksSection

                // Share Options
                shareOptionsSection

                // Leaderboard Teaser
                leaderboardSection
            }
            .padding()
        }
        .navigationTitle("Refer & Earn")
        .onAppear {
            viewModel.loadReferralData()
        }
        .sheet(isPresented: $showShareSheet) {
            if let url = URL(string: viewModel.referralLink) {
                ShareSheet(items: [viewModel.shareMessage, url])
            }
        }
    }

    // MARK: - Hero Section

    private var heroSection: some View {
        VStack(spacing: 16) {
            Image(systemName: "gift.fill")
                .font(.system(size: 60))
                .foregroundColor(.purple)

            Text("Give $10, Get $10")
                .font(.title)
                .fontWeight(.bold)

            Text("Share Dollor.ai with friends and you both win!")
                .font(.subheadline)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
        }
        .padding(.vertical, 20)
    }

    // MARK: - Referral Code Section

    private var referralCodeSection: some View {
        VStack(spacing: 12) {
            Text("Your Code")
                .font(.caption)
                .foregroundColor(.secondary)

            HStack(spacing: 12) {
                Text(viewModel.referralCode)
                    .font(.system(size: 28, weight: .bold, design: .monospaced))
                    .tracking(4)

                Button(action: { viewModel.copyCode() }) {
                    Image(systemName: viewModel.codeCopied ? "checkmark" : "doc.on.doc")
                        .foregroundColor(viewModel.codeCopied ? .green : .accentColor)
                }
            }
            .padding()
            .background(Color(.systemGray6))
            .cornerRadius(12)

            if viewModel.codeCopied {
                Text("Copied!")
                    .font(.caption)
                    .foregroundColor(.green)
            }
        }
    }

    // MARK: - Stats Section

    private var statsSection: some View {
        HStack(spacing: 20) {
            StatCard(
                value: "\(viewModel.totalReferrals)",
                label: "Friends Invited",
                icon: "person.2.fill",
                color: .blue
            )

            StatCard(
                value: "$\(Int(viewModel.totalEarnings))",
                label: "Earned",
                icon: "dollarsign.circle.fill",
                color: .green
            )

            StatCard(
                value: "\(viewModel.pendingReferrals)",
                label: "Pending",
                icon: "clock.fill",
                color: .orange
            )
        }
    }

    // MARK: - How It Works

    private var howItWorksSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("How It Works")
                .font(.headline)

            HowItWorksStep(
                number: 1,
                title: "Share Your Code",
                description: "Send your unique code to friends",
                icon: "square.and.arrow.up"
            )

            HowItWorksStep(
                number: 2,
                title: "Friend Orders",
                description: "They get $10 off their first order",
                icon: "bag.fill"
            )

            HowItWorksStep(
                number: 3,
                title: "You Earn $10",
                description: "Credit added automatically",
                icon: "dollarsign.circle.fill"
            )
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(12)
    }

    // MARK: - Share Options

    private var shareOptionsSection: some View {
        VStack(spacing: 12) {
            // Main share button
            Button(action: { showShareSheet = true }) {
                HStack {
                    Image(systemName: "square.and.arrow.up")
                    Text("Share with Friends")
                }
                .frame(maxWidth: .infinity)
                .padding()
                .background(Color.purple)
                .foregroundColor(.white)
                .cornerRadius(12)
            }

            // Quick share options
            HStack(spacing: 12) {
                QuickShareButton(
                    icon: "message.fill",
                    label: "iMessage",
                    color: .green,
                    action: { viewModel.shareVia(.imessage) }
                )

                QuickShareButton(
                    icon: "envelope.fill",
                    label: "Email",
                    color: .blue,
                    action: { viewModel.shareVia(.email) }
                )

                QuickShareButton(
                    icon: "link",
                    label: "Copy Link",
                    color: .gray,
                    action: { viewModel.copyLink() }
                )
            }
        }
    }

    // MARK: - Leaderboard Section

    private var leaderboardSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: "trophy.fill")
                    .foregroundColor(.yellow)
                Text("Top Referrers This Month")
                    .font(.headline)
            }

            ForEach(viewModel.leaderboard.prefix(3), id: \.name) { entry in
                HStack {
                    Text(entry.rank == 1 ? "1" : entry.rank == 2 ? "2" : "3")
                        .font(.headline)
                        .foregroundColor(entry.rank == 1 ? .yellow : .secondary)
                        .frame(width: 24)

                    Text(entry.name)
                        .font(.subheadline)

                    Spacer()

                    Text("\(entry.referrals) referrals")
                        .font(.caption)
                        .foregroundColor(.secondary)

                    Text("$\(entry.earnings)")
                        .font(.subheadline)
                        .fontWeight(.semibold)
                        .foregroundColor(.green)
                }
                .padding(.vertical, 4)
            }

            Text("You're #\(viewModel.userRank) with \(viewModel.totalReferrals) referrals")
                .font(.caption)
                .foregroundColor(.secondary)
                .padding(.top, 4)
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(12)
    }
}

// MARK: - Group Order View

public struct GroupOrderView: View {
    @StateObject private var viewModel = GroupOrderViewModel()
    @State private var groupName = ""
    @State private var showShareSheet = false

    let restaurantId: String
    let restaurantName: String

    public init(restaurantId: String, restaurantName: String) {
        self.restaurantId = restaurantId
        self.restaurantName = restaurantName
    }

    public var body: some View {
        VStack(spacing: 24) {
            // Header
            VStack(spacing: 8) {
                Image(systemName: "person.3.fill")
                    .font(.system(size: 50))
                    .foregroundColor(.orange)

                Text("Start a Group Order")
                    .font(.title2)
                    .fontWeight(.bold)

                Text("Order together from \(restaurantName)")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
            }
            .padding(.top, 20)

            // Benefits
            VStack(alignment: .leading, spacing: 12) {
                BenefitRow(
                    icon: "percent",
                    color: .green,
                    title: "You get 10% off",
                    description: "As the host, your portion is discounted"
                )

                BenefitRow(
                    icon: "person.2.fill",
                    color: .blue,
                    title: "Friends add their items",
                    description: "Everyone pays individually"
                )

                BenefitRow(
                    icon: "clock.fill",
                    color: .orange,
                    title: "One delivery",
                    description: "All orders arrive together"
                )
            }
            .padding()
            .background(Color(.systemGray6))
            .cornerRadius(12)

            // Group name input
            VStack(alignment: .leading, spacing: 8) {
                Text("Group Name (optional)")
                    .font(.caption)
                    .foregroundColor(.secondary)

                TextField("e.g., Office Lunch, Game Day", text: $groupName)
                    .textFieldStyle(.roundedBorder)
            }

            Spacer()

            // Create button
            Button(action: { createGroupOrder() }) {
                HStack {
                    if viewModel.isCreating {
                        ProgressView()
                            .tint(.white)
                    } else {
                        Image(systemName: "plus.circle.fill")
                        Text("Create Group Order")
                    }
                }
                .frame(maxWidth: .infinity)
                .padding()
                .background(Color.orange)
                .foregroundColor(.white)
                .cornerRadius(12)
            }
            .disabled(viewModel.isCreating)
        }
        .padding()
        .navigationTitle("Group Order")
        .sheet(isPresented: $viewModel.showCreated) {
            GroupOrderCreatedView(
                groupId: viewModel.groupId,
                joinLink: viewModel.joinLink,
                shareMessage: viewModel.shareMessage
            )
        }
    }

    private func createGroupOrder() {
        viewModel.createGroupOrder(
            restaurantId: restaurantId,
            groupName: groupName.isEmpty ? "\(restaurantName) Group Order" : groupName
        )
    }
}

// MARK: - Group Order Created View

struct GroupOrderCreatedView: View {
    let groupId: String
    let joinLink: String
    let shareMessage: String

    @Environment(\.dismiss) private var dismiss
    @State private var linkCopied = false

    var body: some View {
        NavigationView {
            VStack(spacing: 24) {
                // Success icon
                Image(systemName: "checkmark.circle.fill")
                    .font(.system(size: 80))
                    .foregroundColor(.green)

                VStack(spacing: 8) {
                    Text("Group Order Created!")
                        .font(.title2)
                        .fontWeight(.bold)

                    Text("Share the link with friends")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }

                // Join link
                VStack(spacing: 8) {
                    Text(joinLink)
                        .font(.caption)
                        .foregroundColor(.secondary)
                        .lineLimit(1)
                        .truncationMode(.middle)
                        .padding()
                        .frame(maxWidth: .infinity)
                        .background(Color(.systemGray6))
                        .cornerRadius(8)

                    Button(action: copyLink) {
                        HStack {
                            Image(systemName: linkCopied ? "checkmark" : "doc.on.doc")
                            Text(linkCopied ? "Copied!" : "Copy Link")
                        }
                    }
                }

                // Share buttons
                VStack(spacing: 12) {
                    ShareLinkButton(
                        icon: "message.fill",
                        label: "Share via iMessage",
                        color: .green,
                        message: shareMessage
                    )

                    ShareLinkButton(
                        icon: "paperplane.fill",
                        label: "Share via WhatsApp",
                        color: Color(red: 0.07, green: 0.54, blue: 0.44),
                        message: shareMessage
                    )
                }

                Spacer()

                // Timer
                HStack {
                    Image(systemName: "clock.fill")
                        .foregroundColor(.orange)
                    Text("Group order expires in 2 hours")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }

                Button("Done") {
                    dismiss()
                }
                .frame(maxWidth: .infinity)
                .padding()
                .background(Color.accentColor)
                .foregroundColor(.white)
                .cornerRadius(12)
            }
            .padding()
            .navigationTitle("Share Group Order")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") { dismiss() }
                }
            }
        }
    }

    private func copyLink() {
        UIPasteboard.general.string = joinLink
        linkCopied = true
        DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
            linkCopied = false
        }
    }
}

// MARK: - Supporting Views

struct StatCard: View {
    let value: String
    let label: String
    let icon: String
    let color: Color

    var body: some View {
        VStack(spacing: 8) {
            Image(systemName: icon)
                .font(.title2)
                .foregroundColor(color)

            Text(value)
                .font(.title2)
                .fontWeight(.bold)

            Text(label)
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(12)
    }
}

struct HowItWorksStep: View {
    let number: Int
    let title: String
    let description: String
    let icon: String

    var body: some View {
        HStack(spacing: 12) {
            ZStack {
                Circle()
                    .fill(Color.purple)
                    .frame(width: 32, height: 32)
                Text("\(number)")
                    .font(.caption)
                    .fontWeight(.bold)
                    .foregroundColor(.white)
            }

            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.subheadline)
                    .fontWeight(.medium)
                Text(description)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }

            Spacer()

            Image(systemName: icon)
                .foregroundColor(.purple)
        }
    }
}

struct QuickShareButton: View {
    let icon: String
    let label: String
    let color: Color
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(spacing: 4) {
                Image(systemName: icon)
                    .font(.title3)
                Text(label)
                    .font(.caption2)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 12)
            .background(color.opacity(0.1))
            .foregroundColor(color)
            .cornerRadius(10)
        }
    }
}

struct BenefitRow: View {
    let icon: String
    let color: Color
    let title: String
    let description: String

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .font(.title3)
                .foregroundColor(color)
                .frame(width: 32)

            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.subheadline)
                    .fontWeight(.medium)
                Text(description)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
        }
    }
}

struct ShareLinkButton: View {
    let icon: String
    let label: String
    let color: Color
    let message: String

    var body: some View {
        Button(action: share) {
            HStack {
                Image(systemName: icon)
                Text(label)
            }
            .frame(maxWidth: .infinity)
            .padding()
            .background(color)
            .foregroundColor(.white)
            .cornerRadius(12)
        }
    }

    private func share() {
        // Would open share sheet with specific app
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

// MARK: - View Models

@MainActor
class ReferralViewModel: ObservableObject {
    @Published var referralCode = "DLR8X7K9"
    @Published var referralLink = "https://dollor.ai/r/DLR8X7K9"
    @Published var shareMessage = "Get $10 off your first Dollor.ai order! Use code DLR8X7K9 or click: https://dollor.ai/r/DLR8X7K9"
    @Published var totalReferrals = 0
    @Published var totalEarnings = 0.0
    @Published var pendingReferrals = 0
    @Published var userRank = 0
    @Published var codeCopied = false
    @Published var leaderboard: [LeaderboardEntry] = []

    struct LeaderboardEntry {
        let rank: Int
        let name: String
        let referrals: Int
        let earnings: Int
    }

    func loadReferralData() {
        // Would load from API
        totalReferrals = 7
        totalEarnings = 70.0
        pendingReferrals = 2
        userRank = 42

        leaderboard = [
            LeaderboardEntry(rank: 1, name: "Sarah M.", referrals: 47, earnings: 470),
            LeaderboardEntry(rank: 2, name: "Mike T.", referrals: 38, earnings: 380),
            LeaderboardEntry(rank: 3, name: "Jessica L.", referrals: 31, earnings: 310)
        ]
    }

    func copyCode() {
        UIPasteboard.general.string = referralCode
        codeCopied = true
        DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
            self.codeCopied = false
        }
    }

    func copyLink() {
        UIPasteboard.general.string = referralLink
    }

    enum ShareMethod {
        case imessage, email
    }

    func shareVia(_ method: ShareMethod) {
        // Would open specific sharing app
    }
}

@MainActor
class GroupOrderViewModel: ObservableObject {
    @Published var isCreating = false
    @Published var showCreated = false
    @Published var groupId = ""
    @Published var joinLink = ""
    @Published var shareMessage = ""

    func createGroupOrder(restaurantId: String, groupName: String) {
        isCreating = true

        Task {
            do {
                // Would call API
                try await Task.sleep(nanoseconds: 1_000_000_000)

                groupId = "GRP-ABC123"
                joinLink = "https://dollor.ai/group/GRP-ABC123"
                shareMessage = "Join my Dollor.ai group order! Add your items: \(joinLink)"

                showCreated = true
                isCreating = false
            } catch {
                isCreating = false
            }
        }
    }
}

// MARK: - Previews

#Preview("Referral Hub") {
    NavigationView {
        ReferralHubView()
    }
}

#Preview("Group Order") {
    NavigationView {
        GroupOrderView(restaurantId: "rst_123", restaurantName: "Tony's Pizza")
    }
}
