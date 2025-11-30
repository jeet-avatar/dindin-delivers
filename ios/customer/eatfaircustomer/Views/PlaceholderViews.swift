import SwiftUI
import EatFairShared

struct NotificationsView: View {
    @State private var orderUpdates = true
    @State private var promotions = false

    var body: some View {
        Form {
            Section(header: Text("Push Notifications")) {
                Toggle("Order Updates", isOn: $orderUpdates)
                Toggle("Promotions & Offers", isOn: $promotions)
            }
        }
        .navigationTitle("Notifications")
    }
}

struct HelpSupportView: View {
    private var config: AppConfig { AppConfig.shared }

    var body: some View {
        List {
            Section(header: Text("FAQ")) {
                NavigationLink("How to place an order?", destination: FAQDetailView(
                    title: "How to place an order?",
                    content: "1. Browse restaurants and select one\n2. Browse the menu and add items to your cart\n3. Review your cart and proceed to checkout\n4. Add delivery address and payment method\n5. Place your order and track it in real-time!"
                ))
                NavigationLink("Where is my order?", destination: FAQDetailView(
                    title: "Where is my order?",
                    content: "Go to the 'Orders' tab to see all your orders and track their status in real-time. You'll receive push notifications when your order status changes."
                ))
                NavigationLink("Payment issues", destination: FAQDetailView(
                    title: "Payment Issues",
                    content: "If you're experiencing payment issues:\n\n1. Make sure your card details are correct\n2. Check if your card has sufficient funds\n3. Try a different payment method\n\nIf the issue persists, please contact our support team."
                ))
                NavigationLink("Refund policy", destination: FAQDetailView(
                    title: "Refund Policy",
                    content: "We want you to be completely satisfied with your order. If there's an issue:\n\n• Missing items - Full refund for missing items\n• Wrong order - We'll replace it or refund\n• Quality issues - Contact us within 1 hour of delivery\n\nRefunds are typically processed within 3-5 business days."
                ))
            }

            Section(header: Text("Contact Us")) {
                Button(action: {
                    if let url = URL(string: "mailto:\(config.supportEmail)") {
                        UIApplication.shared.open(url)
                    }
                }) {
                    HStack {
                        Image(systemName: "envelope.fill")
                            .foregroundColor(.blue)
                        Text(config.supportEmail)
                            .foregroundColor(.primary)
                        Spacer()
                        Image(systemName: "arrow.up.right")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }

                Button(action: {
                    let phone = config.supportPhone.replacingOccurrences(of: "-", with: "")
                    if let url = URL(string: "tel:\(phone)") {
                        UIApplication.shared.open(url)
                    }
                }) {
                    HStack {
                        Image(systemName: "phone.fill")
                            .foregroundColor(.green)
                        Text(config.supportPhone)
                            .foregroundColor(.primary)
                        Spacer()
                        Image(systemName: "arrow.up.right")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }

                Button(action: {
                    if let url = URL(string: config.supportUrl) {
                        UIApplication.shared.open(url)
                    }
                }) {
                    HStack {
                        Image(systemName: "globe")
                            .foregroundColor(.orange)
                        Text("Visit Help Center")
                            .foregroundColor(.primary)
                        Spacer()
                        Image(systemName: "arrow.up.right")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
            }
        }
        .navigationTitle("Help & Support")
    }
}

// MARK: - FAQ Detail View
struct FAQDetailView: View {
    let title: String
    let content: String

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                Text(content)
                    .font(.body)
                    .foregroundColor(.primary)

                Spacer()

                // Contact support card
                VStack(alignment: .leading, spacing: 8) {
                    Text("Still need help?")
                        .font(.headline)

                    Text("Contact our support team and we'll get back to you within 24 hours.")
                        .font(.subheadline)
                        .foregroundColor(.secondary)

                    Button(action: {
                        if let url = URL(string: "mailto:\(AppConfig.shared.supportEmail)") {
                            UIApplication.shared.open(url)
                        }
                    }) {
                        HStack {
                            Image(systemName: "envelope.fill")
                            Text("Contact Support")
                        }
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color.blue)
                        .foregroundColor(.white)
                        .cornerRadius(10)
                    }
                }
                .padding()
                .background(Color(.systemGray6))
                .cornerRadius(12)
            }
            .padding()
        }
        .navigationTitle(title)
        .navigationBarTitleDisplayMode(.inline)
    }
}
