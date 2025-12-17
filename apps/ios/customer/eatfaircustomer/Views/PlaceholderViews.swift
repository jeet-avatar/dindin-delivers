import SwiftUI
import EatFairShared

struct NotificationsView: View {
    @AppStorage("notifications_order_updates") private var orderUpdates = true
    @AppStorage("notifications_promotions") private var promotions = false
    @AppStorage("notifications_delivery_updates") private var deliveryUpdates = true
    @AppStorage("notifications_special_offers") private var specialOffers = false
    @State private var showPermissionAlert = false

    var body: some View {
        Form {
            Section(header: Text("Order Notifications")) {
                Toggle("Order Updates", isOn: $orderUpdates)
                Toggle("Delivery Status", isOn: $deliveryUpdates)
            }

            Section(header: Text("Marketing")) {
                Toggle("Promotions & Offers", isOn: $promotions)
                Toggle("Special Deals", isOn: $specialOffers)
            }

            Section {
                Button(action: openNotificationSettings) {
                    HStack {
                        Image(systemName: "gear")
                        Text("System Notification Settings")
                        Spacer()
                        Image(systemName: "arrow.up.right")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
            }

            Section(footer: Text("Your preferences are saved automatically and synced across devices.")) {
                EmptyView()
            }
        }
        .navigationTitle("Notifications")
        .onAppear {
            checkNotificationPermission()
        }
        .alert("Notifications Disabled", isPresented: $showPermissionAlert) {
            Button("Settings") { openNotificationSettings() }
            Button("Cancel", role: .cancel) { }
        } message: {
            Text("Please enable notifications in Settings to receive order updates.")
        }
    }

    private func checkNotificationPermission() {
        UNUserNotificationCenter.current().getNotificationSettings { settings in
            if settings.authorizationStatus == .denied {
                DispatchQueue.main.async {
                    showPermissionAlert = true
                }
            }
        }
    }

    private func openNotificationSettings() {
        if let url = URL(string: UIApplication.openSettingsURLString) {
            UIApplication.shared.open(url)
        }
    }
}

// Note: Main HelpSupportView is now in HelpSupportView.swift
struct LegacyHelpSupportView: View {
    private var config: AppConfig { AppConfig.shared }

    var body: some View {
        List {
            Section(header: Text("Common Questions")) {
                NavigationLink("How to place an order?", destination: FAQDetailView(
                    title: "How to place an order?",
                    content: "1. Browse restaurants and select one\n2. Browse the menu and add items to your cart\n3. Review your cart and proceed to checkout\n4. Add delivery address and payment method\n5. Place your order and track it in real-time!"
                ))
                NavigationLink("Where is my order?", destination: FAQDetailView(
                    title: "Where is my order?",
                    content: "Go to the 'Orders' tab to see all your orders and track their status in real-time. You'll receive push notifications when your order status changes.\n\nYou can also tap on any active order to see the driver's real-time location on a map."
                ))
                NavigationLink("Multi-restaurant orders", destination: FAQDetailView(
                    title: "Multi-Restaurant Orders",
                    content: "Dollor lets you order from up to 3 restaurants in a single delivery!\n\nHow it works:\n1. Add items from your first restaurant\n2. Continue browsing and add from other restaurants\n3. One driver picks up from all locations\n4. Pay a small fee per additional restaurant\n\nPerfect for groups with different cravings!"
                ))
                NavigationLink("Payment issues", destination: FAQDetailView(
                    title: "Payment Issues",
                    content: "If you're experiencing payment issues:\n\n1. Make sure your card details are correct\n2. Check if your card has sufficient funds\n3. Try a different payment method (Apple Pay, etc.)\n\nIf the issue persists, please contact our support team."
                ))
                NavigationLink("Refund policy", destination: FAQDetailView(
                    title: "Refund Policy",
                    content: "We want you to be completely satisfied with your order. If there's an issue:\n\n• Missing items - Full refund for missing items\n• Wrong order - We'll replace it or refund\n• Quality issues - Contact us within 1 hour of delivery\n\nRefunds are typically processed within 3-5 business days."
                ))
                NavigationLink("Scheduled deliveries", destination: FAQDetailView(
                    title: "Scheduled Deliveries",
                    content: "Plan ahead and schedule your delivery for later!\n\n1. Add items to your cart\n2. In checkout, tap 'Schedule for Later'\n3. Select your preferred date and time slot\n4. Complete your order\n\nScheduled orders can be placed up to 7 days in advance."
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

            Section(header: Text("Legal")) {
                Button(action: {
                    if let url = URL(string: config.termsOfServiceUrl) {
                        UIApplication.shared.open(url)
                    }
                }) {
                    HStack {
                        Image(systemName: "doc.text.fill")
                            .foregroundColor(.gray)
                        Text("Terms of Service")
                            .foregroundColor(.primary)
                        Spacer()
                        Image(systemName: "arrow.up.right")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }

                Button(action: {
                    if let url = URL(string: config.privacyPolicyUrl) {
                        UIApplication.shared.open(url)
                    }
                }) {
                    HStack {
                        Image(systemName: "hand.raised.fill")
                            .foregroundColor(.gray)
                        Text("Privacy Policy")
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
