import SwiftUI
import EatFairShared

// MARK: - Terms and Conditions View
struct TermsAndConditionsView: View {
    @Environment(\.dismiss) private var dismiss
    @State private var hasAccepted = false
    @State private var showFullTerms = false
    @State private var isLoading = false

    private let p2pService = P2PAPIService.shared
    let onAccept: (() -> Void)?

    init(onAccept: (() -> Void)? = nil) {
        self.onAccept = onAccept
    }

    var body: some View {
        NavigationView {
            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    // Header
                    TermsHeader()

                    // Platform Fee Highlight
                    PlatformFeeCard()

                    // Key Benefits
                    KeyBenefitsSection()

                    // How It Works
                    HowItWorksSection()

                    // Driver Rights
                    DriverRightsSection()

                    // Customer Direct Order
                    DirectOrderSection()

                    // Privacy & Data
                    PrivacySection()

                    // Full Terms Link
                    Button(action: { showFullTerms = true }) {
                        HStack {
                            Image(systemName: "doc.text.fill")
                            Text("Read Full Terms & Conditions")
                            Spacer()
                            Image(systemName: "chevron.right")
                        }
                        .foregroundColor(Theme.brandRed)
                        .padding()
                        .background(Theme.brandRed.opacity(0.1))
                        .cornerRadius(12)
                    }
                    .padding(.horizontal)

                    // Accept Toggle
                    Toggle(isOn: $hasAccepted) {
                        VStack(alignment: .leading, spacing: 4) {
                            Text("I accept the Terms & Conditions")
                                .fontWeight(.semibold)
                            Text("By accepting, you agree to our platform policies, $1 fee structure, and driver guidelines.")
                                .font(.caption)
                                .foregroundColor(Theme.textSecondary)
                        }
                    }
                    .toggleStyle(SwitchToggleStyle(tint: Theme.brandRed))
                    .padding()
                    .background(Theme.cardBackground)
                    .cornerRadius(12)
                    .shadow(color: .black.opacity(0.05), radius: 4)
                    .padding(.horizontal)

                    // Accept Button
                    Button(action: acceptTerms) {
                        if isLoading {
                            ProgressView()
                                .tint(.white)
                        } else {
                            Text("Accept & Continue")
                                .fontWeight(.semibold)
                        }
                    }
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(hasAccepted ? Theme.brandRed : Theme.textGrey)
                    .foregroundColor(.white)
                    .cornerRadius(12)
                    .padding(.horizontal)
                    .disabled(!hasAccepted || isLoading)

                    // Version
                    Text("Terms Version \(AppConstants.termsVersion) • Last Updated: December 2024")
                        .font(.caption)
                        .foregroundColor(Theme.textGrey)
                        .frame(maxWidth: .infinity)
                        .padding(.bottom, 24)
                }
            }
            .background(Theme.backgroundGrey.ignoresSafeArea())
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") {
                        dismiss()
                    }
                    .foregroundColor(Theme.textGrey)
                }
            }
            .sheet(isPresented: $showFullTerms) {
                FullTermsView()
            }
        }
    }

    private func acceptTerms() {
        // Check if driver is logged in via P2P
        guard p2pService.isDriverLoggedIn else { return }

        isLoading = true

        // Store terms acceptance locally (P2P backend doesn't have terms endpoint yet)
        // Key must match what DriverDashboardView checks
        UserDefaults.standard.set(true, forKey: "p2p_driver_terms_accepted")
        UserDefaults.standard.set(Int64(Date().timeIntervalSince1970 * 1000), forKey: "p2p_driver_terms_accepted_at")
        UserDefaults.standard.set(AppConstants.termsVersion, forKey: UserDefaultsKeys.driverTermsVersion)

        isLoading = false
        onAccept?()
        dismiss()
    }
}

// MARK: - Terms Header
struct TermsHeader: View {
    var body: some View {
        VStack(spacing: 16) {
            // Smiling dollar sign logo
            ZStack {
                Circle()
                    .fill(Theme.brandRed.opacity(0.15))
                    .frame(width: 100, height: 100)

                Text("$")
                    .font(.system(size: 50, weight: .bold))
                    .foregroundColor(Theme.brandRed)
            }

            Text("Dollor AI Service")
                .font(.largeTitle)
                .fontWeight(.bold)

            Text("$ online store")
                .font(.headline)
                .foregroundColor(Theme.brandRed)

            Text("Driver Terms & Conditions")
                .font(.title3)
                .foregroundColor(Theme.textSecondary)

            Text("A peer-to-peer matchmaking platform connecting independent drivers with riders and delivery requests.")
                .font(.subheadline)
                .foregroundColor(Theme.textSecondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal)

            // Independent Contractor Badge
            HStack(spacing: 6) {
                Image(systemName: "person.badge.shield.checkmark")
                    .foregroundColor(Theme.brandRed)
                Text("You are an Independent Contractor")
                    .font(.caption)
                    .fontWeight(.semibold)
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 6)
            .background(Theme.brandRed.opacity(0.1))
            .cornerRadius(20)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 24)
    }
}

// MARK: - Connection Fee Card (P2P Matchmaking)
struct PlatformFeeCard: View {
    private let config = AppConfig.shared

    var body: some View {
        VStack(spacing: 16) {
            HStack {
                Image(systemName: "link.circle.fill")
                    .font(.title)
                    .foregroundColor(Theme.statusActive)

                VStack(alignment: .leading, spacing: 4) {
                    Text("Connection Fee Structure")
                        .font(.headline)
                    Text("Matchmaking service fees only")
                        .font(.caption)
                        .foregroundColor(Theme.textSecondary)
                }

                Spacer()
            }

            Divider()

            // Fee Structure - P2P matchmaking model
            VStack(spacing: 12) {
                FeeRow(
                    title: "Customer Connection Fee",
                    amount: String(format: "$%.2f", config.serviceFee),
                    description: "For using our matchmaking service"
                )

                FeeRow(
                    title: "Restaurant Connection Fee",
                    amount: String(format: "$%.2f", config.restaurantPlatformFee),
                    description: "For receiving order connections"
                )

                FeeRow(
                    title: "Driver Connection Fee",
                    amount: "$0.00",
                    description: "No fees on your earnings!"
                )
            }

            // Highlight Box - Independent contractor emphasis
            VStack(spacing: 8) {
                HStack(spacing: 12) {
                    Image(systemName: "star.fill")
                        .foregroundColor(.yellow)

                    Text("Keep 100% of what you earn")
                        .font(.subheadline)
                        .fontWeight(.semibold)
                        .foregroundColor(Theme.textPrimary)
                }

                Text("You're an independent contractor - set your own prices for rideshare")
                    .font(.caption)
                    .foregroundColor(Theme.textSecondary)
            }
            .padding()
            .frame(maxWidth: .infinity)
            .background(Theme.statusActive.opacity(0.1))
            .cornerRadius(12)
        }
        .padding()
        .background(Theme.cardBackground)
        .cornerRadius(16)
        .shadow(color: .black.opacity(0.05), radius: 8)
        .padding(.horizontal)
    }
}

struct FeeRow: View {
    let title: String
    let amount: String
    let description: String

    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.subheadline)
                    .fontWeight(.medium)
                Text(description)
                    .font(.caption)
                    .foregroundColor(Theme.textSecondary)
            }

            Spacer()

            Text(amount)
                .font(.title3)
                .fontWeight(.bold)
                .foregroundColor(amount == "$0.00" ? Theme.statusActive : Theme.textPrimary)
        }
    }
}

// MARK: - Key Benefits Section
struct KeyBenefitsSection: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            SectionHeader(icon: "star.circle.fill", title: "What Makes Us Different")

            VStack(spacing: 12) {
                BenefitRow(
                    icon: "message.fill",
                    title: "Direct Customer Chat",
                    description: "Communicate directly with customers for better coordination and tips"
                )

                BenefitRow(
                    icon: "cart.fill.badge.plus",
                    title: "Multi-Stop Deliveries",
                    description: "Pick up from multiple restaurants on one trip - negotiate better tips"
                )

                BenefitRow(
                    icon: "hand.raised.fill",
                    title: "Independent Contractor Freedom",
                    description: "Set your own schedule, prices, and negotiate directly with riders"
                )

                BenefitRow(
                    icon: "speaker.wave.2.fill",
                    title: "Voice Assistant",
                    description: "Hands-free operation while driving - stay safe, stay productive"
                )

                BenefitRow(
                    icon: "banknote.fill",
                    title: "Transparent Earnings",
                    description: "No hidden fees, no percentage cuts - what you earn is yours"
                )
            }
        }
        .padding(.horizontal)
    }
}

struct BenefitRow: View {
    let icon: String
    let title: String
    let description: String

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            Image(systemName: icon)
                .font(.title3)
                .foregroundColor(Theme.brandRed)
                .frame(width: 30)

            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.subheadline)
                    .fontWeight(.semibold)
                Text(description)
                    .font(.caption)
                    .foregroundColor(Theme.textSecondary)
            }

            Spacer()
        }
        .padding()
        .background(Theme.cardBackground)
        .cornerRadius(12)
    }
}

// MARK: - How It Works Section
struct HowItWorksSection: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            SectionHeader(icon: "gearshape.fill", title: "How Earnings Work")

            VStack(spacing: 0) {
                StepRow(
                    number: 1,
                    title: "Customer Places Order",
                    description: "Customer pays $1 platform fee + food cost + delivery fee + tip",
                    isLast: false
                )

                StepRow(
                    number: 2,
                    title: "Restaurant Prepares Food",
                    description: "Restaurant pays $1 platform fee per order",
                    isLast: false
                )

                StepRow(
                    number: 3,
                    title: "You Deliver",
                    description: "You receive full delivery fee + full tip (zero platform cut!)",
                    isLast: false
                )

                StepRow(
                    number: 4,
                    title: "Bonus: Direct Orders",
                    description: "Customers can order directly through you - earn points & higher tips",
                    isLast: true
                )
            }
            .padding()
            .background(Theme.cardBackground)
            .cornerRadius(16)
        }
        .padding(.horizontal)
    }
}

struct StepRow: View {
    let number: Int
    let title: String
    let description: String
    let isLast: Bool

    var body: some View {
        HStack(alignment: .top, spacing: 16) {
            // Number Circle with Line
            VStack(spacing: 0) {
                ZStack {
                    Circle()
                        .fill(Theme.brandRed)
                        .frame(width: 32, height: 32)

                    Text("\(number)")
                        .font(.headline)
                        .foregroundColor(.white)
                }

                if !isLast {
                    Rectangle()
                        .fill(Theme.brandRed.opacity(0.3))
                        .frame(width: 2)
                        .frame(maxHeight: .infinity)
                }
            }
            .frame(width: 32)

            // Content
            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.subheadline)
                    .fontWeight(.semibold)

                Text(description)
                    .font(.caption)
                    .foregroundColor(Theme.textSecondary)
            }
            .padding(.bottom, isLast ? 0 : 24)

            Spacer()
        }
    }
}

// MARK: - Independent Contractor Rights Section
struct DriverRightsSection: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            SectionHeader(icon: "shield.fill", title: "Your Rights as an Independent Contractor")

            VStack(alignment: .leading, spacing: 12) {
                RightItem(text: "Accept or decline any request without penalty")
                RightItem(text: "Set your own schedule - work when you want")
                RightItem(text: "Set your own prices for rideshare trips")
                RightItem(text: "Negotiate directly with riders and customers")
                RightItem(text: "Use multiple platforms - no exclusivity required")
                RightItem(text: "Keep 100% of your earnings (no percentage cuts)")
                RightItem(text: "Operate your own independent business")
                RightItem(text: "24/7 platform support")
            }
            .padding()
            .background(Theme.cardBackground)
            .cornerRadius(16)
        }
        .padding(.horizontal)
    }
}

struct RightItem: View {
    let text: String

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: "checkmark.circle.fill")
                .foregroundColor(Theme.statusActive)

            Text(text)
                .font(.subheadline)
                .foregroundColor(Theme.textPrimary)

            Spacer()
        }
    }
}

// MARK: - Direct Order Section
struct DirectOrderSection: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            SectionHeader(icon: "person.2.fill", title: "Direct Customer Orders")

            VStack(alignment: .leading, spacing: 16) {
                Text("The Game Changer")
                    .font(.headline)
                    .foregroundColor(Theme.brandRed)

                Text("Customers can contact you directly through chat to place orders. This gives you:")
                    .font(.subheadline)
                    .foregroundColor(Theme.textSecondary)

                VStack(spacing: 8) {
                    DirectBenefitRow(icon: "plus.circle.fill", text: "Higher tips from satisfied customers")
                    DirectBenefitRow(icon: "plus.circle.fill", text: "Multiple restaurant pickups on one trip")
                    DirectBenefitRow(icon: "plus.circle.fill", text: "Points toward driver rewards")
                    DirectBenefitRow(icon: "plus.circle.fill", text: "Build your own customer base")
                    DirectBenefitRow(icon: "plus.circle.fill", text: "Flexibility to negotiate delivery terms")
                }

                // Example Scenario
                VStack(alignment: .leading, spacing: 8) {
                    Text("Example Scenario:")
                        .font(.caption)
                        .fontWeight(.semibold)
                        .foregroundColor(Theme.textGrey)

                    Text("\"Hey driver, can you stop at Chipotle on the way? I'll add $5 extra tip\"")
                        .font(.subheadline)
                        .italic()
                        .foregroundColor(Theme.textSecondary)
                        .padding()
                        .background(Theme.backgroundGrey)
                        .cornerRadius(8)

                    Text("You have the freedom to accept multi-stop requests and earn more!")
                        .font(.caption)
                        .foregroundColor(Theme.statusActive)
                }
            }
            .padding()
            .background(Theme.cardBackground)
            .cornerRadius(16)
        }
        .padding(.horizontal)
    }
}

struct DirectBenefitRow: View {
    let icon: String
    let text: String

    var body: some View {
        HStack(spacing: 8) {
            Image(systemName: icon)
                .foregroundColor(Theme.statusActive)
                .font(.caption)

            Text(text)
                .font(.subheadline)
        }
    }
}

// MARK: - Privacy Section
struct PrivacySection: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            SectionHeader(icon: "lock.fill", title: "Privacy & Data")

            VStack(alignment: .leading, spacing: 12) {
                PrivacyItem(
                    title: "Location Data",
                    description: "Used only during active deliveries for customer tracking. Never sold."
                )

                PrivacyItem(
                    title: "Personal Information",
                    description: "Stored securely. Only shared with customers for delivery purposes."
                )

                PrivacyItem(
                    title: "Earnings Data",
                    description: "Your earnings history is private and only visible to you."
                )

                PrivacyItem(
                    title: "Chat History",
                    description: "Messages stored securely. Reviewed only for support or disputes."
                )
            }
            .padding()
            .background(Theme.cardBackground)
            .cornerRadius(16)
        }
        .padding(.horizontal)
    }
}

struct PrivacyItem: View {
    let title: String
    let description: String

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack {
                Image(systemName: "checkmark.shield.fill")
                    .foregroundColor(Theme.statusInfo)
                    .font(.caption)

                Text(title)
                    .font(.subheadline)
                    .fontWeight(.semibold)
            }

            Text(description)
                .font(.caption)
                .foregroundColor(Theme.textSecondary)
                .padding(.leading, 24)
        }
    }
}

// MARK: - Section Header
struct SectionHeader: View {
    let icon: String
    let title: String

    var body: some View {
        HStack(spacing: 8) {
            Image(systemName: icon)
                .foregroundColor(Theme.brandRed)

            Text(title)
                .font(.title3)
                .fontWeight(.bold)
        }
    }
}

// MARK: - Full Terms View
struct FullTermsView: View {
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationView {
            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    Group {
                        TermsSection(title: "1. Introduction & Legal Status") {
                            Text("""
                            Welcome to Dollor AI Service ("Platform", "we", "us", "our"). These Terms and Conditions ("Terms") govern your use of our peer-to-peer matchmaking platform.

                            IMPORTANT LEGAL NOTICE: Dollor AI Service is a MATCHMAKING PLATFORM that connects riders with independent drivers. We do NOT provide transportation services. We are NOT a Transportation Network Company (TNC). All transportation arrangements are directly between you (the driver) and the rider.

                            By accessing or using Dollor AI Service as a driver, you agree to be bound by these Terms and acknowledge your status as an INDEPENDENT CONTRACTOR. If you disagree with any part of the terms, you may not access the service.
                            """)
                        }

                        TermsSection(title: "2. Connection Fee Structure") {
                            Text("""
                            Dollor AI Service operates on a transparent, flat-fee model for our MATCHMAKING service:

                            CONNECTION FEES (for use of our matching platform):
                            • Customer Connection Fee: $1.00 per connection
                            • Restaurant Connection Fee: $1.00 per connection
                            • Driver Connection Fee: $0.00 (zero)

                            As an INDEPENDENT DRIVER, you retain 100% of:
                            - Payments negotiated directly with riders
                            - All tips provided by customers
                            - Any additional compensation agreed upon with riders

                            IMPORTANT: Dollor AI Service charges a connection fee for matching you with riders. We do NOT take a percentage of your earnings. You set your own prices and negotiate directly with riders.
                            """)
                        }

                        TermsSection(title: "3. Independent Contractor Status") {
                            Text("""
                            As an INDEPENDENT CONTRACTOR using Dollor AI Service, you acknowledge:

                            • You are NOT an employee of Dollor AI Service
                            • You operate your own independent transportation business
                            • You set your own schedule and working hours
                            • You may accept or decline any ride request without penalty
                            • You are responsible for your own taxes, insurance, and vehicle expenses
                            • You may use other platforms simultaneously
                            • Transportation services are provided by YOU, not by Dollor AI Service

                            ELIGIBILITY REQUIREMENTS:
                            • Be at least 18 years of age
                            • Possess a valid driver's license
                            • Have access to a reliable, legally registered vehicle
                            • Maintain valid auto insurance meeting your state's requirements
                            • Complete identity verification
                            • Have a smartphone capable of running the Dollor AI Service app
                            """)
                        }

                        TermsSection(title: "4. Driver Responsibilities") {
                            Text("""
                            As a Dollor AI Service driver, you agree to:

                            • Deliver orders in a timely and professional manner
                            • Maintain the quality and safety of food during transport
                            • Communicate professionally with customers and restaurants
                            • Follow all applicable traffic laws and regulations
                            • Keep your vehicle clean and in good working condition
                            • Update your availability status accurately
                            • Report any issues or incidents promptly
                            """)
                        }

                        TermsSection(title: "5. Direct Customer Communication") {
                            Text("""
                            Dollor AI Service encourages direct communication between drivers and customers through our in-app chat feature. This includes:

                            • Coordinating delivery details
                            • Providing delivery updates
                            • Negotiating additional services (multi-stop pickups)
                            • Discussing tip arrangements

                            Guidelines for direct communication:
                            • Maintain professional conduct at all times
                            • Do not share personal contact information outside the platform
                            • Report any inappropriate behavior immediately
                            • Respect customer privacy and preferences
                            """)
                        }

                        TermsSection(title: "6. Multi-Stop Deliveries") {
                            Text("""
                            Drivers may accept multi-stop delivery requests from customers, including:

                            • Picking up from multiple restaurants on a single trip
                            • Making additional stops as negotiated with the customer
                            • Setting appropriate compensation for additional services

                            Conditions:
                            • All parties must agree to multi-stop arrangements
                            • Food quality and safety must be maintained
                            • Reasonable time expectations must be communicated
                            • Additional compensation should be agreed upon in advance
                            """)
                        }

                        TermsSection(title: "7. Earnings and Payments") {
                            Text("""
                            As an INDEPENDENT CONTRACTOR, your earnings are:

                            RIDESHARE (P2P Matchmaking):
                            • YOU set your own prices for rides
                            • Riders make offers which you can accept, decline, or counter
                            • All negotiated payments go directly to you
                            • Dollor AI Service only charges a $1 connection fee
                            • Tips are 100% yours

                            FOOD DELIVERY:
                            • Base delivery fee (100% to you)
                            • Distance-based compensation (100% to you)
                            • Customer tips (100% to you)

                            Payment Schedule:
                            • Earnings are calculated in real-time
                            • Weekly automatic deposits to your linked bank account
                            • Instant cashout available for a small fee
                            • Detailed earnings reports available in the app
                            """)
                        }

                        TermsSection(title: "8. Voice Assistant Feature") {
                            Text("""
                            Dollor AI Service provides a hands-free voice assistant for driver safety:

                            • Accept or decline orders by voice
                            • Get navigation directions
                            • Send quick messages to customers
                            • Check earnings
                            • Mark deliveries as complete

                            Important: Always prioritize safe driving. Use voice features responsibly.
                            """)
                        }

                        TermsSection(title: "9. Tax & Legal Compliance") {
                            Text("""
                            INDEPENDENT CONTRACTOR TAX OBLIGATIONS:

                            As an independent contractor, YOU are responsible for:
                            • Reporting all earnings to the IRS and state tax authorities
                            • Paying self-employment taxes (Social Security & Medicare)
                            • Making quarterly estimated tax payments if required
                            • Maintaining records of all business expenses
                            • Filing appropriate tax returns (Schedule C, etc.)

                            Dollor AI Service will provide:
                            • Form 1099-NEC for earnings over $600/year
                            • Year-end earnings summary for your records
                            • Transaction history available anytime in the app

                            DEDUCTIBLE EXPENSES (consult your tax advisor):
                            • Mileage or actual vehicle expenses
                            • Phone and data plan (business portion)
                            • Vehicle maintenance and repairs
                            • Insurance premiums (business portion)
                            • Supplies and equipment

                            LEGAL COMPLIANCE:
                            • You are responsible for complying with all local, state, and federal laws
                            • You must maintain appropriate insurance coverage
                            • Vehicle registration and licensing requirements are your responsibility
                            • Dollor AI Service does not provide legal, tax, or insurance advice
                            """)
                        }

                        TermsSection(title: "10. Termination") {
                            Text("""
                            Either party may terminate this agreement at any time. Dollor AI Service may suspend or terminate your account for:

                            • Violation of these Terms
                            • Fraudulent activity
                            • Unsafe driving practices
                            • Poor customer ratings
                            • Illegal activity
                            • Harassment or inappropriate conduct

                            Upon termination, any pending earnings will be paid according to our standard payment schedule.
                            """)
                        }

                        TermsSection(title: "11. Contact & Legal Information") {
                            Text("""
                            For questions about these Terms, please contact us:

                            Platform Support: support@dollor.ai
                            Website: www.dollor.ai
                            Privacy Policy: www.dollor.ai/privacy
                            Terms of Service: www.dollor.ai/terms

                            LEGAL NOTICE:
                            Dollor AI Service is a peer-to-peer matchmaking platform.
                            We do NOT provide transportation services.
                            Drivers using our platform are independent contractors.

                            Effective Date: December 9, 2024
                            Version: 2.0 (P2P Matchmaking Model)
                            """)
                        }
                    }
                }
                .padding()
            }
            .navigationTitle("Full Terms & Conditions")
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

struct TermsSection<Content: View>: View {
    let title: String
    @ViewBuilder let content: Content

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(title)
                .font(.headline)
                .foregroundColor(Theme.brandRed)

            content
                .font(.subheadline)
                .foregroundColor(Theme.textSecondary)
        }
    }
}

#Preview {
    TermsAndConditionsView()
}
