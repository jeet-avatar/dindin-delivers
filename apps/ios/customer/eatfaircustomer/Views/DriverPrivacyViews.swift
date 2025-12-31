import SwiftUI
import EatFairShared

/// Driver Privacy Views - Uber Eats style transparency screens
/// Shows what information is shared with drivers to protect customer privacy
/// Matches Android's DriverPrivacyScreens.kt for platform parity

// MARK: - What Drivers See Page
struct WhatDriversSeePage: View {
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        ZStack {
            Theme.brandGrey.edgesIgnoringSafeArea(.all)

            ScrollView {
                VStack(spacing: 25) {
                    // Header
                    VStack(spacing: 15) {
                        ZStack {
                            Circle()
                                .fill(Theme.brandOrange.opacity(0.15))
                                .frame(width: 80, height: 80)

                            Image(systemName: "eye.fill")
                                .font(.system(size: 36))
                                .foregroundColor(Theme.brandOrange)
                        }

                        Text("What Drivers See")
                            .font(.title)
                            .fontWeight(.bold)
                            .foregroundColor(Theme.brandBlack)

                        Text("We only share what's necessary for your delivery")
                            .font(.subheadline)
                            .foregroundColor(Theme.textGrey)
                            .multilineTextAlignment(.center)
                            .padding(.horizontal, 40)
                    }
                    .padding(.top, 30)

                    // What Drivers CAN See Section
                    VStack(alignment: .leading, spacing: 0) {
                        Text("DRIVERS CAN SEE")
                            .font(.caption)
                            .fontWeight(.bold)
                            .foregroundColor(Theme.textGrey)
                            .padding(.leading, 20)
                            .padding(.bottom, 10)

                        VStack(spacing: 0) {
                            PrivacyInfoRow(
                                icon: "person.fill",
                                title: "Your First Name Only",
                                subtitle: "Last name is hidden",
                                iconColor: Theme.brandGreen
                            )
                            Divider().padding(.leading, 60)
                            PrivacyInfoRow(
                                icon: "phone.fill",
                                title: "Masked Phone Number",
                                subtitle: "Calls route through anonymous relay",
                                iconColor: Theme.brandGreen
                            )
                            Divider().padding(.leading, 60)
                            PrivacyInfoRow(
                                icon: "mappin.circle.fill",
                                title: "Delivery Address",
                                subtitle: "Only during active delivery",
                                iconColor: Theme.brandGreen
                            )
                            Divider().padding(.leading, 60)
                            PrivacyInfoRow(
                                icon: "bag.fill",
                                title: "Order Details",
                                subtitle: "Items being delivered",
                                iconColor: Theme.brandGreen
                            )
                            Divider().padding(.leading, 60)
                            PrivacyInfoRow(
                                icon: "doc.text.fill",
                                title: "Delivery Instructions",
                                subtitle: "Any notes you provide",
                                iconColor: Theme.brandGreen
                            )
                        }
                        .background(Color.white)
                        .cornerRadius(12)
                        .shadow(color: Color.black.opacity(0.05), radius: 5, x: 0, y: 2)
                    }
                    .padding(.horizontal)

                    // What Drivers CANNOT See Section
                    VStack(alignment: .leading, spacing: 0) {
                        Text("DRIVERS CANNOT SEE")
                            .font(.caption)
                            .fontWeight(.bold)
                            .foregroundColor(Theme.textGrey)
                            .padding(.leading, 20)
                            .padding(.bottom, 10)

                        VStack(spacing: 0) {
                            PrivacyInfoRow(
                                icon: "person.text.rectangle.fill",
                                title: "Your Full Name",
                                subtitle: "Last name stays private",
                                iconColor: Color.red.opacity(0.8)
                            )
                            Divider().padding(.leading, 60)
                            PrivacyInfoRow(
                                icon: "phone.badge.plus",
                                title: "Real Phone Number",
                                subtitle: "Always masked for safety",
                                iconColor: Color.red.opacity(0.8)
                            )
                            Divider().padding(.leading, 60)
                            PrivacyInfoRow(
                                icon: "envelope.fill",
                                title: "Email Address",
                                subtitle: "Never shared with drivers",
                                iconColor: Color.red.opacity(0.8)
                            )
                            Divider().padding(.leading, 60)
                            PrivacyInfoRow(
                                icon: "creditcard.fill",
                                title: "Payment Information",
                                subtitle: "Securely processed by Stripe",
                                iconColor: Color.red.opacity(0.8)
                            )
                            Divider().padding(.leading, 60)
                            PrivacyInfoRow(
                                icon: "clock.fill",
                                title: "Order History",
                                subtitle: "Past orders stay private",
                                iconColor: Color.red.opacity(0.8)
                            )
                        }
                        .background(Color.white)
                        .cornerRadius(12)
                        .shadow(color: Color.black.opacity(0.05), radius: 5, x: 0, y: 2)
                    }
                    .padding(.horizontal)

                    Spacer().frame(height: 30)
                }
            }
        }
        .navigationTitle("What Drivers See")
        .navigationBarTitleDisplayMode(.inline)
    }
}

// MARK: - Your Privacy Page
struct YourPrivacyPage: View {
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        ZStack {
            Theme.brandGrey.edgesIgnoringSafeArea(.all)

            ScrollView {
                VStack(spacing: 25) {
                    // Header
                    VStack(spacing: 15) {
                        ZStack {
                            Circle()
                                .fill(Theme.brandBlue.opacity(0.15))
                                .frame(width: 80, height: 80)

                            Image(systemName: "lock.shield.fill")
                                .font(.system(size: 36))
                                .foregroundColor(Theme.brandBlue)
                        }

                        Text("Your Privacy")
                            .font(.title)
                            .fontWeight(.bold)
                            .foregroundColor(Theme.brandBlack)

                        Text("How we protect your personal information")
                            .font(.subheadline)
                            .foregroundColor(Theme.textGrey)
                            .multilineTextAlignment(.center)
                            .padding(.horizontal, 40)
                    }
                    .padding(.top, 30)

                    // Privacy Protections Section
                    VStack(alignment: .leading, spacing: 0) {
                        Text("PRIVACY PROTECTIONS")
                            .font(.caption)
                            .fontWeight(.bold)
                            .foregroundColor(Theme.textGrey)
                            .padding(.leading, 20)
                            .padding(.bottom, 10)

                        VStack(spacing: 0) {
                            PrivacyFeatureRow(
                                icon: "phone.arrow.right.fill",
                                title: "Anonymous Phone Relay",
                                description: "Your real number is never shared. All calls go through a secure relay system."
                            )
                            Divider().padding(.leading, 60)
                            PrivacyFeatureRow(
                                icon: "location.slash.fill",
                                title: "Address Protection",
                                description: "Drivers only see your address during active deliveries. It's hidden before and after."
                            )
                            Divider().padding(.leading, 60)
                            PrivacyFeatureRow(
                                icon: "key.fill",
                                title: "Encrypted Data",
                                description: "All your personal information is encrypted using industry-standard TLS/SSL."
                            )
                            Divider().padding(.leading, 60)
                            PrivacyFeatureRow(
                                icon: "trash.slash.fill",
                                title: "Data Deletion Rights",
                                description: "You can delete your account and all associated data at any time from Settings."
                            )
                        }
                        .background(Color.white)
                        .cornerRadius(12)
                        .shadow(color: Color.black.opacity(0.05), radius: 5, x: 0, y: 2)
                    }
                    .padding(.horizontal)

                    // California Privacy Rights Section
                    VStack(alignment: .leading, spacing: 0) {
                        Text("CALIFORNIA PRIVACY RIGHTS (CCPA)")
                            .font(.caption)
                            .fontWeight(.bold)
                            .foregroundColor(Theme.textGrey)
                            .padding(.leading, 20)
                            .padding(.bottom, 10)

                        VStack(spacing: 0) {
                            PrivacyRightRow(icon: "doc.text.magnifyingglass", title: "Right to Know", description: "Request what data we collect")
                            Divider().padding(.leading, 60)
                            PrivacyRightRow(icon: "trash.fill", title: "Right to Delete", description: "Request deletion of your data")
                            Divider().padding(.leading, 60)
                            PrivacyRightRow(icon: "hand.raised.slash.fill", title: "Right to Opt-Out", description: "We don't sell your data")
                            Divider().padding(.leading, 60)
                            PrivacyRightRow(icon: "equal.circle.fill", title: "Non-Discrimination", description: "Equal service for all choices")
                        }
                        .background(Color.white)
                        .cornerRadius(12)
                        .shadow(color: Color.black.opacity(0.05), radius: 5, x: 0, y: 2)
                    }
                    .padding(.horizontal)

                    // Contact Section
                    VStack(alignment: .leading, spacing: 0) {
                        Text("QUESTIONS?")
                            .font(.caption)
                            .fontWeight(.bold)
                            .foregroundColor(Theme.textGrey)
                            .padding(.leading, 20)
                            .padding(.bottom, 10)

                        HStack {
                            Image(systemName: "envelope.fill")
                                .foregroundColor(Theme.brandOrange)
                                .font(.title3)
                                .frame(width: 30)

                            VStack(alignment: .leading, spacing: 2) {
                                Text("Contact Privacy Team")
                                    .font(.body)
                                    .foregroundColor(Theme.brandBlack)
                                Text("privacy@dollor.ai")
                                    .font(.caption)
                                    .foregroundColor(Theme.textGrey)
                            }

                            Spacer()
                        }
                        .padding()
                        .background(Color.white)
                        .cornerRadius(12)
                        .shadow(color: Color.black.opacity(0.05), radius: 5, x: 0, y: 2)
                    }
                    .padding(.horizontal)

                    Spacer().frame(height: 30)
                }
            }
        }
        .navigationTitle("Your Privacy")
        .navigationBarTitleDisplayMode(.inline)
    }
}

// MARK: - Safety Features Page
struct SafetyFeaturesPage: View {
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        ZStack {
            Theme.brandGrey.edgesIgnoringSafeArea(.all)

            ScrollView {
                VStack(spacing: 25) {
                    // Header
                    VStack(spacing: 15) {
                        ZStack {
                            Circle()
                                .fill(Theme.brandGreen.opacity(0.15))
                                .frame(width: 80, height: 80)

                            Image(systemName: "checkmark.shield.fill")
                                .font(.system(size: 36))
                                .foregroundColor(Theme.brandGreen)
                        }

                        Text("Safety Features")
                            .font(.title)
                            .fontWeight(.bold)
                            .foregroundColor(Theme.brandBlack)

                        Text("Your safety is our top priority")
                            .font(.subheadline)
                            .foregroundColor(Theme.textGrey)
                            .multilineTextAlignment(.center)
                            .padding(.horizontal, 40)
                    }
                    .padding(.top, 30)

                    // Safety Features Section
                    VStack(alignment: .leading, spacing: 0) {
                        Text("SAFETY MEASURES")
                            .font(.caption)
                            .fontWeight(.bold)
                            .foregroundColor(Theme.textGrey)
                            .padding(.leading, 20)
                            .padding(.bottom, 10)

                        VStack(spacing: 0) {
                            SafetyFeatureRow(
                                icon: "person.badge.shield.checkmark.fill",
                                title: "Verified Drivers",
                                description: "All drivers undergo background checks and identity verification.",
                                iconColor: Theme.brandGreen
                            )
                            Divider().padding(.leading, 60)
                            SafetyFeatureRow(
                                icon: "location.fill.viewfinder",
                                title: "Real-Time GPS Tracking",
                                description: "Track your delivery or ride live on the map with accurate ETA.",
                                iconColor: Theme.brandBlue
                            )
                            Divider().padding(.leading, 60)
                            SafetyFeatureRow(
                                icon: "square.and.arrow.up.fill",
                                title: "Share Trip Status",
                                description: "Share your live trip details with friends and family.",
                                iconColor: Theme.brandOrange
                            )
                            Divider().padding(.leading, 60)
                            SafetyFeatureRow(
                                icon: "star.fill",
                                title: "Two-Way Ratings",
                                description: "Both customers and drivers rate each other for accountability.",
                                iconColor: Theme.gold
                            )
                        }
                        .background(Color.white)
                        .cornerRadius(12)
                        .shadow(color: Color.black.opacity(0.05), radius: 5, x: 0, y: 2)
                    }
                    .padding(.horizontal)

                    // Emergency Support Section
                    VStack(alignment: .leading, spacing: 0) {
                        Text("EMERGENCY SUPPORT")
                            .font(.caption)
                            .fontWeight(.bold)
                            .foregroundColor(Theme.textGrey)
                            .padding(.leading, 20)
                            .padding(.bottom, 10)

                        VStack(spacing: 0) {
                            SafetyFeatureRow(
                                icon: "phone.fill",
                                title: "24/7 Support Line",
                                description: "Our support team is available around the clock.",
                                iconColor: Theme.brandGreen
                            )
                            Divider().padding(.leading, 60)
                            SafetyFeatureRow(
                                icon: "exclamationmark.triangle.fill",
                                title: "In-App Emergency Button",
                                description: "Quick access to emergency services during active trips.",
                                iconColor: Color.red
                            )
                            Divider().padding(.leading, 60)
                            SafetyFeatureRow(
                                icon: "text.bubble.fill",
                                title: "Report Issues",
                                description: "Report safety concerns directly through the app.",
                                iconColor: Theme.brandOrange
                            )
                        }
                        .background(Color.white)
                        .cornerRadius(12)
                        .shadow(color: Color.black.opacity(0.05), radius: 5, x: 0, y: 2)
                    }
                    .padding(.horizontal)

                    // Trust Badge Section
                    VStack(spacing: 12) {
                        HStack {
                            Image(systemName: "building.columns.fill")
                                .foregroundColor(Theme.brandBlue)
                            Text("Compliant with US Transportation Regulations")
                                .font(.caption)
                                .foregroundColor(Theme.textGrey)
                        }

                        HStack {
                            Image(systemName: "lock.shield.fill")
                                .foregroundColor(Theme.brandGreen)
                            Text("SOC 2 Type II Certified")
                                .font(.caption)
                                .foregroundColor(Theme.textGrey)
                        }
                    }
                    .padding()
                    .frame(maxWidth: .infinity)
                    .background(Theme.brandGrey)
                    .cornerRadius(12)
                    .padding(.horizontal)

                    Spacer().frame(height: 30)
                }
            }
        }
        .navigationTitle("Safety Features")
        .navigationBarTitleDisplayMode(.inline)
    }
}

// MARK: - Helper Views

struct PrivacyInfoRow: View {
    let icon: String
    let title: String
    let subtitle: String
    let iconColor: Color

    var body: some View {
        HStack(alignment: .center, spacing: 15) {
            Image(systemName: icon)
                .foregroundColor(iconColor)
                .font(.title3)
                .frame(width: 30)

            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.body)
                    .foregroundColor(Theme.brandBlack)
                Text(subtitle)
                    .font(.caption)
                    .foregroundColor(Theme.textGrey)
            }

            Spacer()
        }
        .padding()
    }
}

struct PrivacyFeatureRow: View {
    let icon: String
    let title: String
    let description: String

    var body: some View {
        HStack(alignment: .top, spacing: 15) {
            Image(systemName: icon)
                .foregroundColor(Theme.brandBlue)
                .font(.title3)
                .frame(width: 30)

            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.body)
                    .fontWeight(.medium)
                    .foregroundColor(Theme.brandBlack)
                Text(description)
                    .font(.caption)
                    .foregroundColor(Theme.textGrey)
                    .fixedSize(horizontal: false, vertical: true)
            }

            Spacer()
        }
        .padding()
    }
}

struct PrivacyRightRow: View {
    let icon: String
    let title: String
    let description: String

    var body: some View {
        HStack(alignment: .center, spacing: 15) {
            Image(systemName: icon)
                .foregroundColor(Theme.brandOrange)
                .font(.title3)
                .frame(width: 30)

            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.body)
                    .foregroundColor(Theme.brandBlack)
                Text(description)
                    .font(.caption)
                    .foregroundColor(Theme.textGrey)
            }

            Spacer()
        }
        .padding()
    }
}

struct SafetyFeatureRow: View {
    let icon: String
    let title: String
    let description: String
    let iconColor: Color

    var body: some View {
        HStack(alignment: .top, spacing: 15) {
            Image(systemName: icon)
                .foregroundColor(iconColor)
                .font(.title3)
                .frame(width: 30)

            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.body)
                    .fontWeight(.medium)
                    .foregroundColor(Theme.brandBlack)
                Text(description)
                    .font(.caption)
                    .foregroundColor(Theme.textGrey)
                    .fixedSize(horizontal: false, vertical: true)
            }

            Spacer()
        }
        .padding()
    }
}

// MARK: - Previews
#Preview("What Drivers See") {
    NavigationView {
        WhatDriversSeePage()
    }
}

#Preview("Your Privacy") {
    NavigationView {
        YourPrivacyPage()
    }
}

#Preview("Safety Features") {
    NavigationView {
        SafetyFeaturesPage()
    }
}
