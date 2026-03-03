import SwiftUI
import EatFairShared

/**
 * Help & Support View
 * Matches Android HelpSupportScreen for platform parity
 * Provides FAQ, contact options, and support resources
 */

struct HelpSupportView: View {
    @Environment(\.dismiss) private var dismiss
    @State private var searchQuery = ""
    @State private var selectedCategory: FAQCategory = .all
    @State private var expandedFAQs: Set<String> = []
    @State private var showLiveChat = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 24) {
                    // Search Bar
                    searchBar

                    // Contact Us Section
                    contactUsSection

                    // FAQ Categories
                    faqCategoriesSection

                    // FAQ List
                    faqListSection

                    // Still Need Help Card
                    stillNeedHelpCard
                }
                .padding(.horizontal, 16)
                .padding(.bottom, 32)
            }
            .background(Color(UIColor.systemGroupedBackground))
            .navigationTitle("Help & Support")
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") {
                        dismiss()
                    }
                }
            }
            .sheet(isPresented: $showLiveChat) {
                LiveChatView()
            }
        }
    }

    // MARK: - Search Bar
    private var searchBar: some View {
        HStack {
            Image(systemName: "magnifyingglass")
                .foregroundColor(.gray)

            TextField("Search for help...", text: $searchQuery)
                .textFieldStyle(.plain)

            if !searchQuery.isEmpty {
                Button {
                    searchQuery = ""
                } label: {
                    Image(systemName: "xmark.circle.fill")
                        .foregroundColor(.gray)
                }
            }
        }
        .padding(12)
        .background(Color.white)
        .cornerRadius(12)
        .shadow(color: .black.opacity(0.05), radius: 5, y: 2)
    }

    // MARK: - Contact Us Section
    private var contactUsSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Contact Us")
                .font(.headline)
                .foregroundColor(.primary)

            HStack(spacing: 12) {
                ContactOptionCard(
                    icon: "message.fill",
                    title: "Live Chat",
                    subtitle: "Chat with us",
                    color: Color(hex: "4CAF50")
                ) {
                    showLiveChat = true
                }

                ContactOptionCard(
                    icon: "envelope.fill",
                    title: "Email",
                    subtitle: "support@dollor.ai",
                    color: Color(hex: "2196F3")
                ) {
                    openEmail()
                }

                ContactOptionCard(
                    icon: "phone.fill",
                    title: "Phone",
                    subtitle: "Call us",
                    color: Color(hex: "FF6B35")
                ) {
                    openPhone()
                }
            }
        }
    }

    // MARK: - FAQ Categories
    private var faqCategoriesSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("FAQ Categories")
                .font(.headline)
                .foregroundColor(.primary)

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    ForEach(FAQCategory.allCases, id: \.self) { category in
                        FAQCategoryChip(
                            category: category,
                            isSelected: selectedCategory == category
                        ) {
                            selectedCategory = category
                        }
                    }
                }
            }
        }
    }

    // MARK: - FAQ List
    private var faqListSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Frequently Asked Questions")
                .font(.headline)
                .foregroundColor(.primary)

            VStack(spacing: 8) {
                ForEach(filteredFAQs) { faq in
                    FAQItemView(
                        faq: faq,
                        isExpanded: expandedFAQs.contains(faq.id)
                    ) {
                        withAnimation(.easeInOut(duration: 0.2)) {
                            if expandedFAQs.contains(faq.id) {
                                expandedFAQs.remove(faq.id)
                            } else {
                                expandedFAQs.insert(faq.id)
                            }
                        }
                    }
                }
            }
        }
    }

    // MARK: - Still Need Help Card
    private var stillNeedHelpCard: some View {
        VStack(spacing: 12) {
            Image(systemName: "questionmark.circle.fill")
                .font(.system(size: 40))
                .foregroundColor(Color(hex: "FF6B35"))

            Text("Still need help?")
                .font(.headline)

            Text("Our support team is available 24/7 to assist you with any questions or concerns.")
                .font(.subheadline)
                .foregroundColor(.gray)
                .multilineTextAlignment(.center)

            Button {
                openEmail()
            } label: {
                Text("Contact Support")
                    .fontWeight(.semibold)
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 14)
                    .background(Color(hex: "FF6B35"))
                    .cornerRadius(12)
            }
        }
        .padding(20)
        .background(Color.white)
        .cornerRadius(16)
        .shadow(color: .black.opacity(0.05), radius: 5, y: 2)
    }

    // MARK: - Filtered FAQs
    private var filteredFAQs: [FAQItem] {
        let categoryFiltered = selectedCategory == .all
            ? allFAQs
            : allFAQs.filter { $0.category == selectedCategory }

        if searchQuery.isEmpty {
            return categoryFiltered
        }

        return categoryFiltered.filter {
            $0.question.localizedCaseInsensitiveContains(searchQuery) ||
            $0.answer.localizedCaseInsensitiveContains(searchQuery)
        }
    }

    // MARK: - Actions
    private func openEmail() {
        if let url = URL(string: "mailto:support@dollor.ai") {
            UIApplication.shared.open(url)
        }
    }

    private func openPhone() {
        let phone = AppConfig.shared.supportPhone.replacingOccurrences(of: "-", with: "")
        if let url = URL(string: "tel:\(phone)") {
            UIApplication.shared.open(url)
        }
    }
}

// MARK: - FAQ Category
enum FAQCategory: String, CaseIterable {
    case all = "All"
    case orders = "Orders"
    case payments = "Payments"
    case account = "Account"
    case delivery = "Delivery"

    var icon: String {
        switch self {
        case .all: return "square.grid.2x2"
        case .orders: return "bag"
        case .payments: return "creditcard"
        case .account: return "person"
        case .delivery: return "car"
        }
    }
}

// MARK: - FAQ Item
struct FAQItem: Identifiable {
    let id: String
    let question: String
    let answer: String
    let category: FAQCategory
}

// MARK: - All FAQs Data
private let allFAQs: [FAQItem] = [
    FAQItem(
        id: "1",
        question: "How do I track my order?",
        answer: "You can track your order in real-time from the Orders tab. Once your order is confirmed, you'll see a map showing your driver's location and estimated arrival time.",
        category: .orders
    ),
    FAQItem(
        id: "2",
        question: "What are the platform fees?",
        answer: "We charge a flat $1 matchmaking fee per order for food delivery. For rideshare, it's $1 per party for fares up to $35, $2 for fares $35-$70, and $3 for fares over $70. 100% of tips go directly to drivers.",
        category: .payments
    ),
    FAQItem(
        id: "3",
        question: "How do I change my delivery address?",
        answer: "Go to your Profile, then tap 'Saved Addresses'. You can add, edit, or delete addresses. Set your preferred address as default for faster checkout.",
        category: .account
    ),
    FAQItem(
        id: "4",
        question: "Can I cancel my order?",
        answer: "You can cancel your order before it's picked up by the driver. Go to your active order and tap 'Cancel Order'. Cancellation fees may apply depending on the order status.",
        category: .orders
    ),
    FAQItem(
        id: "5",
        question: "How do I add a payment method?",
        answer: "Go to Profile > Payment Methods > Add Card. We accept all major credit and debit cards. You can also link your bank account for ACH payments with a $0.50 discount.",
        category: .payments
    ),
    FAQItem(
        id: "6",
        question: "What if my order is wrong or missing items?",
        answer: "Contact our support team immediately through the app or call us. We'll work with the restaurant to resolve the issue and may provide a refund or credit.",
        category: .orders
    ),
    FAQItem(
        id: "7",
        question: "How do I tip my driver?",
        answer: "You can add a tip during checkout or after delivery. 100% of your tip goes directly to the driver - we never take a cut!",
        category: .delivery
    ),
    FAQItem(
        id: "8",
        question: "How do I delete my account?",
        answer: "Go to Profile > Settings > Delete Account. This action is permanent and will remove all your data including order history and saved addresses.",
        category: .account
    ),
    FAQItem(
        id: "9",
        question: "Why is my delivery taking longer than expected?",
        answer: "Delivery times can vary due to traffic, weather, or high demand. You can track your driver in real-time and contact them through the app if needed.",
        category: .delivery
    ),
    FAQItem(
        id: "10",
        question: "How does the referral program work?",
        answer: "Share your unique referral code with friends. When they place their first order, you both get $5 credit! Go to Profile > Refer & Earn to get your code.",
        category: .account
    )
]

// MARK: - Contact Option Card
struct ContactOptionCard: View {
    let icon: String
    let title: String
    let subtitle: String
    let color: Color
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(spacing: 8) {
                Image(systemName: icon)
                    .font(.system(size: 24))
                    .foregroundColor(color)

                Text(title)
                    .font(.caption)
                    .fontWeight(.medium)
                    .foregroundColor(.primary)

                Text(subtitle)
                    .font(.caption2)
                    .foregroundColor(.gray)
                    .lineLimit(1)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 16)
            .background(Color.white)
            .cornerRadius(12)
            .shadow(color: .black.opacity(0.05), radius: 5, y: 2)
        }
    }
}

// MARK: - FAQ Category Chip
struct FAQCategoryChip: View {
    let category: FAQCategory
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 6) {
                Image(systemName: category.icon)
                    .font(.caption)
                Text(category.rawValue)
                    .font(.subheadline)
                    .fontWeight(.medium)
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 8)
            .background(isSelected ? Color(hex: "FF6B35") : Color.white)
            .foregroundColor(isSelected ? .white : .primary)
            .cornerRadius(20)
            .overlay(
                RoundedRectangle(cornerRadius: 20)
                    .stroke(isSelected ? Color.clear : Color.gray.opacity(0.3), lineWidth: 1)
            )
        }
    }
}

// MARK: - FAQ Item View
struct FAQItemView: View {
    let faq: FAQItem
    let isExpanded: Bool
    let onTap: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Button(action: onTap) {
                HStack {
                    Text(faq.question)
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .foregroundColor(.primary)
                        .multilineTextAlignment(.leading)

                    Spacer()

                    Image(systemName: isExpanded ? "chevron.up" : "chevron.down")
                        .font(.caption)
                        .foregroundColor(.gray)
                }
                .padding(16)
            }

            if isExpanded {
                Text(faq.answer)
                    .font(.subheadline)
                    .foregroundColor(.gray)
                    .padding(.horizontal, 16)
                    .padding(.bottom, 16)
            }
        }
        .background(Color.white)
        .cornerRadius(12)
        .shadow(color: .black.opacity(0.03), radius: 3, y: 1)
    }
}

// Note: Color extension with init(hex:) is in EatFairShared/Theme.swift

#Preview {
    HelpSupportView()
}
