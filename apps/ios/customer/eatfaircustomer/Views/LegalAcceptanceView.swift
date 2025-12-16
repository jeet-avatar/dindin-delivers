import SwiftUI
import EatFairShared

/// LegalAcceptanceView - Terms and Privacy acceptance screen
/// Matches Android's LegalAcceptanceScreen for platform parity
/// Required for app store compliance
struct LegalAcceptanceView: View {
    @Binding var hasAcceptedTerms: Bool
    @State private var acceptedTerms = false
    @State private var acceptedPrivacy = false
    @State private var showTerms = false
    @State private var showPrivacy = false

    var canContinue: Bool {
        acceptedTerms && acceptedPrivacy
    }

    var body: some View {
        ZStack {
            Theme.brandGrey.edgesIgnoringSafeArea(.all)

            VStack(spacing: 30) {
                Spacer()

                // Header
                VStack(spacing: 15) {
                    Image(systemName: "doc.text.fill")
                        .font(.system(size: 60))
                        .foregroundColor(Theme.brandOrange)

                    Text("Almost There!")
                        .font(.title)
                        .fontWeight(.bold)
                        .foregroundColor(Theme.brandBlack)

                    Text("Please review and accept our terms to continue")
                        .font(.subheadline)
                        .foregroundColor(Theme.textGrey)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 40)
                }

                Spacer()

                // Acceptance Cards
                VStack(spacing: 16) {
                    // Terms of Service
                    AcceptanceCard(
                        title: "Terms of Service",
                        description: "Rules for using Dollor.ai platform",
                        isAccepted: $acceptedTerms,
                        onReadMore: { showTerms = true }
                    )

                    // Privacy Policy
                    AcceptanceCard(
                        title: "Privacy Policy",
                        description: "How we handle your data",
                        isAccepted: $acceptedPrivacy,
                        onReadMore: { showPrivacy = true }
                    )
                }
                .padding(.horizontal, 20)

                Spacer()

                // Continue Button
                VStack(spacing: 12) {
                    Button(action: {
                        // Save acceptance to UserDefaults
                        UserDefaults.standard.set(true, forKey: "legal_terms_accepted")
                        UserDefaults.standard.set(Date(), forKey: "legal_acceptance_date")
                        hasAcceptedTerms = true
                    }) {
                        Text("Continue")
                            .font(.headline)
                            .fontWeight(.bold)
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 16)
                            .background(canContinue ? Theme.brandOrange : Color.gray)
                            .cornerRadius(12)
                    }
                    .disabled(!canContinue)

                    Text("By continuing, you agree to our terms and privacy policy")
                        .font(.caption)
                        .foregroundColor(Theme.textGrey)
                        .multilineTextAlignment(.center)
                }
                .padding(.horizontal, 20)
                .padding(.bottom, 40)
            }
        }
        .sheet(isPresented: $showTerms) {
            LegalDocumentSheet(
                title: "Terms of Service",
                content: termsContent,
                onAccept: {
                    acceptedTerms = true
                    showTerms = false
                }
            )
        }
        .sheet(isPresented: $showPrivacy) {
            LegalDocumentSheet(
                title: "Privacy Policy",
                content: privacyContent,
                onAccept: {
                    acceptedPrivacy = true
                    showPrivacy = false
                }
            )
        }
    }

    // MARK: - Terms Content
    private var termsContent: String {
        """
        TERMS OF SERVICE

        Last Updated: December 2024

        1. ACCEPTANCE OF TERMS
        By accessing and using Dollor.ai ("Platform"), you accept and agree to be bound by these Terms of Service.

        2. PLATFORM DESCRIPTION
        Dollor.ai is a matchmaking platform that connects:
        • Customers with local restaurants for food delivery
        • Customers with independent delivery drivers
        • Riders with independent rideshare drivers

        3. INDEPENDENT CONTRACTOR RELATIONSHIP
        All drivers on our platform are independent contractors, not employees of Dollor.ai. The platform facilitates connections but does not employ, direct, or control drivers.

        4. USER RESPONSIBILITIES
        Users agree to:
        • Provide accurate account information
        • Maintain account security
        • Use the platform lawfully
        • Treat all parties respectfully

        5. PLATFORM FEES
        Dollor.ai charges transparent platform fees:
        • Food Delivery: $1 flat platform fee per order
        • Rideshare: Tiered fees ($1/$2/$3 based on fare amount)

        100% of tips go directly to drivers.

        6. PAYMENT PROCESSING
        Payments are processed securely through Stripe. Users agree to Stripe's terms of service.

        7. LIMITATION OF LIABILITY
        As a matchmaking platform, Dollor.ai:
        • Facilitates connections but does not control service quality
        • Is not liable for actions of independent drivers
        • Is not responsible for restaurant food quality

        8. MODIFICATIONS
        We may modify these terms at any time. Continued use constitutes acceptance.

        9. GOVERNING LAW
        These terms are governed by the laws of the state where Dollor.ai is registered.

        10. CONTACT
        For questions: support@dollor.ai
        """
    }

    // MARK: - Privacy Content
    private var privacyContent: String {
        """
        PRIVACY POLICY

        Last Updated: December 2024

        1. INFORMATION WE COLLECT
        We collect information you provide:
        • Account details (name, email, phone)
        • Delivery addresses
        • Payment information (via Stripe)
        • Location data (for delivery)
        • Order history

        2. HOW WE USE INFORMATION
        Your information is used to:
        • Process and deliver orders
        • Connect you with drivers
        • Improve our services
        • Send order updates
        • Process payments

        3. INFORMATION SHARING
        We share limited information with:
        • Restaurants (for order fulfillment)
        • Drivers (for delivery/pickup)
        • Payment processors (Stripe)
        • As required by law

        We NEVER sell your personal information.

        4. DATA SECURITY
        We protect your data using:
        • Encrypted transmission (TLS/SSL)
        • Secure payment processing
        • Regular security audits
        • Access controls

        5. YOUR RIGHTS
        You have the right to:
        • Access your data
        • Request data deletion
        • Opt out of marketing
        • Update your information

        6. DATA RETENTION
        We retain data as long as your account is active or as needed to provide services.

        7. CHILDREN'S PRIVACY
        Our services are not intended for users under 18.

        8. CHANGES TO POLICY
        We may update this policy. We'll notify you of significant changes.

        9. CONTACT
        Privacy questions: privacy@dollor.ai
        """
    }
}

// MARK: - Acceptance Card
struct AcceptanceCard: View {
    let title: String
    let description: String
    @Binding var isAccepted: Bool
    let onReadMore: () -> Void

    var body: some View {
        HStack(spacing: 15) {
            // Checkbox
            Button(action: { isAccepted.toggle() }) {
                Image(systemName: isAccepted ? "checkmark.square.fill" : "square")
                    .font(.title2)
                    .foregroundColor(isAccepted ? Theme.brandOrange : Theme.textGrey)
            }

            // Content
            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.headline)
                    .foregroundColor(Theme.brandBlack)

                Text(description)
                    .font(.caption)
                    .foregroundColor(Theme.textGrey)
            }

            Spacer()

            // Read More Button
            Button(action: onReadMore) {
                Text("Read")
                    .font(.caption)
                    .fontWeight(.semibold)
                    .foregroundColor(Theme.brandOrange)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 6)
                    .background(Theme.brandOrange.opacity(0.1))
                    .cornerRadius(8)
            }
        }
        .padding()
        .background(Color.white)
        .cornerRadius(12)
        .shadow(color: Color.black.opacity(0.05), radius: 5, x: 0, y: 2)
    }
}

// MARK: - Legal Document Sheet
struct LegalDocumentSheet: View {
    @Environment(\.dismiss) private var dismiss
    let title: String
    let content: String
    let onAccept: () -> Void

    var body: some View {
        NavigationView {
            ScrollView {
                Text(content)
                    .font(.body)
                    .foregroundColor(Theme.brandBlack)
                    .padding()
            }
            .navigationTitle(title)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Close") { dismiss() }
                }

                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Accept") {
                        onAccept()
                    }
                    .fontWeight(.bold)
                }
            }
        }
    }
}

#Preview {
    LegalAcceptanceView(hasAcceptedTerms: .constant(false))
}
