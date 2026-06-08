import SwiftUI
import EatFairShared

/// quick-375: post-delivery celebration / receipt screen.
/// Shown after the proof photo successfully uploads, before the driver
/// drops back to the Available Orders list. Mirrors the customer's
/// OrderDeliveredCelebrationView so all three apps acknowledge the moment.
struct DeliverySuccessSheet: View {
    @ObservedObject var viewModel: DeliveryViewModel
    @State private var showContent = false

    private var order: Order? { viewModel.lastCompletedOrder }
    private var earnings: Double {
        guard let o = order else { return 0 }
        return o.deliveryFee + o.priorityFee + o.tip
    }

    var body: some View {
        VStack(spacing: 0) {
            ScrollView {
                VStack(spacing: 28) {
                    // ============== CELEBRATION HERO ==============
                    VStack(spacing: 18) {
                        ZStack {
                            Circle()
                                .fill(Theme.statusActive)
                                .frame(width: 96, height: 96)
                                .scaleEffect(showContent ? 1 : 0)
                            Image(systemName: "checkmark")
                                .font(.system(size: 46, weight: .bold))
                                .foregroundColor(.white)
                                .scaleEffect(showContent ? 1 : 0)
                        }
                        .animation(.spring(response: 0.5, dampingFraction: 0.6).delay(0.15), value: showContent)

                        VStack(spacing: 6) {
                            Text("Delivery Complete!")
                                .font(.title.bold())
                                .foregroundColor(Theme.statusActive)
                            Text("Great work")
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                        }
                        .opacity(showContent ? 1 : 0)
                        .animation(.easeOut(duration: 0.4).delay(0.35), value: showContent)
                    }
                    .padding(.top, 30)

                    // ============== EARNINGS HERO ==============
                    VStack(spacing: 8) {
                        Text("YOU EARNED")
                            .font(.caption.weight(.semibold))
                            .tracking(1.2)
                            .foregroundColor(.white.opacity(0.9))
                        Text("$\(String(format: "%.2f", earnings))")
                            .font(.system(size: 54, weight: .heavy, design: .rounded))
                            .foregroundColor(.white)
                        if let o = order, o.tip > 0 {
                            Label("includes $\(String(format: "%.2f", o.tip)) tip", systemImage: "heart.fill")
                                .font(.caption.weight(.medium))
                                .foregroundColor(.white.opacity(0.9))
                                .padding(.top, 2)
                        }
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 24)
                    .background(LinearGradient(colors: [Theme.statusActive, Theme.brandOrange],
                                                startPoint: .topLeading, endPoint: .bottomTrailing))
                    .cornerRadius(20)
                    .padding(.horizontal)
                    .opacity(showContent ? 1 : 0)
                    .offset(y: showContent ? 0 : 20)
                    .animation(.easeOut(duration: 0.4).delay(0.5), value: showContent)

                    // ============== BREAKDOWN ==============
                    if let o = order {
                        VStack(spacing: 0) {
                            EarningsRow(label: "Delivery fee", value: o.deliveryFee)
                            if o.priorityFee > 0 {
                                Divider().padding(.horizontal)
                                EarningsRow(label: "Priority bonus", value: o.priorityFee)
                            }
                            if o.tip > 0 {
                                Divider().padding(.horizontal)
                                EarningsRow(label: "Customer tip", value: o.tip, accent: Theme.statusActive)
                            }
                        }
                        .background(Theme.cardBackground)
                        .cornerRadius(14)
                        .padding(.horizontal)
                        .opacity(showContent ? 1 : 0)
                        .animation(.easeOut(duration: 0.4).delay(0.6), value: showContent)
                    }

                    // ============== ORDER + PHOTO ==============
                    if let o = order {
                        HStack(alignment: .top, spacing: 14) {
                            if let img = viewModel.lastCompletedProofImage {
                                Image(uiImage: img)
                                    .resizable()
                                    .scaledToFill()
                                    .frame(width: 72, height: 72)
                                    .clipShape(RoundedRectangle(cornerRadius: 10))
                            } else {
                                RoundedRectangle(cornerRadius: 10)
                                    .fill(Color.gray.opacity(0.15))
                                    .frame(width: 72, height: 72)
                                    .overlay(Image(systemName: "photo").foregroundColor(.gray))
                            }
                            VStack(alignment: .leading, spacing: 4) {
                                Text("Order #\(o.orderId)").font(.subheadline.weight(.semibold))
                                Text(o.restaurant.name).font(.caption).foregroundColor(.secondary)
                                Text("Delivered to \(o.customerName)").font(.caption).foregroundColor(.secondary)
                            }
                            Spacer()
                        }
                        .padding()
                        .background(Theme.cardBackground)
                        .cornerRadius(14)
                        .padding(.horizontal)
                        .opacity(showContent ? 1 : 0)
                        .animation(.easeOut(duration: 0.4).delay(0.7), value: showContent)
                    }

                    // ============== RECEIPT NOTE ==============
                    HStack(spacing: 8) {
                        Image(systemName: "envelope.fill").foregroundColor(Theme.statusActive)
                        Text("Earnings receipt emailed to you")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    .opacity(showContent ? 1 : 0)
                    .animation(.easeOut(duration: 0.4).delay(0.8), value: showContent)

                    Spacer(minLength: 8)
                }
            }

            // ============== DONE ==============
            Button(action: { viewModel.dismissDeliverySuccess() }) {
                Text("Back to Available Orders")
                    .font(.headline)
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 16)
                    .background(Theme.brandRed)
                    .cornerRadius(14)
            }
            .padding()
            .background(Theme.cardBackground.shadow(color: .black.opacity(0.05), radius: 8, x: 0, y: -4))
            .accessibilityLabel("Done — return to available orders")
        }
        .background(Theme.backgroundGrey.ignoresSafeArea())
        .onAppear { showContent = true }
        .interactiveDismissDisabled(true)
    }
}

private struct EarningsRow: View {
    let label: String
    let value: Double
    var accent: Color = Theme.textPrimary
    var body: some View {
        HStack {
            Text(label).foregroundColor(.secondary)
            Spacer()
            Text("$\(String(format: "%.2f", value))")
                .fontWeight(.semibold)
                .foregroundColor(accent)
        }
        .padding(.horizontal)
        .padding(.vertical, 12)
    }
}
