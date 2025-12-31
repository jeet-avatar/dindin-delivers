import SwiftUI

// MARK: - Payment Breakdown Model

public struct PaymentBreakdown: Codable {
    public let subtotal: Double
    public let tax: Double
    public let taxRate: Double
    public let deliveryFee: Double
    public let deliveryDistanceMiles: Double
    public let platformFee: Double
    public let suggestedTips: [Double]
    public let selectedTip: Double
    public let totalToRestaurant: Double
    public let totalToDriver: Double
    public let totalToPlatform: Double
    public let grandTotal: Double
    public let customerPaysNow: Double
    public let customerPaysRestaurant: Double
    public let restaurantPaysDriver: Double
    public let restaurantPaysPlatform: Double

    enum CodingKeys: String, CodingKey {
        case subtotal
        case tax
        case taxRate = "tax_rate"
        case deliveryFee = "delivery_fee"
        case deliveryDistanceMiles = "delivery_distance_miles"
        case platformFee = "platform_fee"
        case suggestedTips = "suggested_tips"
        case selectedTip = "selected_tip"
        case totalToRestaurant = "total_to_restaurant"
        case totalToDriver = "total_to_driver"
        case totalToPlatform = "total_to_platform"
        case grandTotal = "grand_total"
        case customerPaysNow = "customer_pays_now"
        case customerPaysRestaurant = "customer_pays_restaurant"
        case restaurantPaysDriver = "restaurant_pays_driver"
        case restaurantPaysPlatform = "restaurant_pays_platform"
    }

    public init(
        subtotal: Double,
        tax: Double,
        taxRate: Double,
        deliveryFee: Double,
        deliveryDistanceMiles: Double,
        platformFee: Double,
        suggestedTips: [Double],
        selectedTip: Double,
        totalToRestaurant: Double,
        totalToDriver: Double,
        totalToPlatform: Double,
        grandTotal: Double,
        customerPaysNow: Double,
        customerPaysRestaurant: Double,
        restaurantPaysDriver: Double,
        restaurantPaysPlatform: Double
    ) {
        self.subtotal = subtotal
        self.tax = tax
        self.taxRate = taxRate
        self.deliveryFee = deliveryFee
        self.deliveryDistanceMiles = deliveryDistanceMiles
        self.platformFee = platformFee
        self.suggestedTips = suggestedTips
        self.selectedTip = selectedTip
        self.totalToRestaurant = totalToRestaurant
        self.totalToDriver = totalToDriver
        self.totalToPlatform = totalToPlatform
        self.grandTotal = grandTotal
        self.customerPaysNow = customerPaysNow
        self.customerPaysRestaurant = customerPaysRestaurant
        self.restaurantPaysDriver = restaurantPaysDriver
        self.restaurantPaysPlatform = restaurantPaysPlatform
    }
}

// MARK: - Payment Breakdown View

public struct PaymentBreakdownView: View {
    public let breakdown: PaymentBreakdown
    @Binding public var selectedTip: Double
    public let onPlaceOrder: () -> Void

    public init(breakdown: PaymentBreakdown, selectedTip: Binding<Double>, onPlaceOrder: @escaping () -> Void) {
        self.breakdown = breakdown
        self._selectedTip = selectedTip
        self.onPlaceOrder = onPlaceOrder
    }

    public var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                // Header
                headerSection

                // Order Summary
                orderSummarySection

                // Tip Selection
                tipSelectionSection

                // Payment Flow Explanation
                paymentFlowSection

                // Total Summary
                totalSummarySection

                // Place Order Button
                placeOrderButton
            }
            .padding()
        }
    }

    private var headerSection: some View {
        VStack(spacing: 8) {
            Image(systemName: "doc.text.fill")
                .font(.system(size: 40))
                .foregroundColor(.accentColor)

            Text("Payment Breakdown")
                .font(.title2)
                .fontWeight(.bold)

            Text("See exactly where your money goes")
                .font(.subheadline)
                .foregroundColor(.secondary)
        }
        .padding(.vertical)
    }

    private var orderSummarySection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Order Summary")
                .font(.headline)

            VStack(spacing: 8) {
                PaymentRow(label: "Subtotal", amount: breakdown.subtotal)
                PaymentRow(label: "Tax (\(Int(breakdown.taxRate * 100))%)", amount: breakdown.tax)
                PaymentRow(label: "Delivery Fee (\(String(format: "%.1f", breakdown.deliveryDistanceMiles)) mi)", amount: breakdown.deliveryFee)
            }

            Divider()

            PaymentRow(label: "Food + Tax", amount: breakdown.totalToRestaurant, bold: true)
                .foregroundColor(.primary)
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(12)
    }

    private var tipSelectionSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("Tip for Driver")
                    .font(.headline)
                Spacer()
                Text("100% goes to driver")
                    .font(.caption)
                    .foregroundColor(.green)
            }

            HStack(spacing: 8) {
                ForEach(Array(breakdown.suggestedTips.enumerated()), id: \.offset) { index, tip in
                    TipButton(
                        amount: tip,
                        percentage: [15, 18, 20, 25][index],
                        isSelected: selectedTip == tip,
                        action: { selectedTip = tip }
                    )
                }
            }

            HStack {
                Text("Custom:")
                    .font(.subheadline)
                TextField("$0.00", value: $selectedTip, format: .currency(code: "USD"))
                    .textFieldStyle(.roundedBorder)
                    .frame(width: 100)
                    .keyboardType(.decimalPad)
            }
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(12)
    }

    private var paymentFlowSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("How Payments Work")
                .font(.headline)

            // Step 1: Platform Fee
            PaymentFlowStep(
                step: 1,
                title: "Platform Fee",
                from: "You",
                to: "Dollor.ai",
                amount: breakdown.platformFee,
                method: "Card (Now)",
                color: .blue,
                description: "Charged when you place order"
            )

            // Step 2: Pay Restaurant
            PaymentFlowStep(
                step: 2,
                title: "Food + Tax",
                from: "You",
                to: "Restaurant",
                amount: breakdown.totalToRestaurant,
                method: "Apple Pay / Venmo / Cash",
                color: .orange,
                description: "Pay restaurant directly at delivery"
            )

            // Step 3: Tip (if any)
            if selectedTip > 0 {
                PaymentFlowStep(
                    step: 3,
                    title: "Tip",
                    from: "You",
                    to: "Driver",
                    amount: selectedTip,
                    method: "Cash / Venmo",
                    color: .green,
                    description: "Driver keeps 100%"
                )
            }
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(12)
    }

    private var totalSummarySection: some View {
        VStack(spacing: 12) {
            Text("Your Total")
                .font(.headline)

            VStack(spacing: 8) {
                HStack {
                    Text("Platform Fee (charged now)")
                    Spacer()
                    Text(String(format: "$%.2f", breakdown.platformFee))
                        .fontWeight(.semibold)
                        .foregroundColor(.blue)
                }

                HStack {
                    Text("Food + Tax (pay at delivery)")
                    Spacer()
                    Text(String(format: "$%.2f", breakdown.totalToRestaurant))
                        .fontWeight(.semibold)
                        .foregroundColor(.orange)
                }

                HStack {
                    Text("Delivery Fee (included)")
                    Spacer()
                    Text(String(format: "$%.2f", breakdown.deliveryFee))
                        .fontWeight(.semibold)
                }

                if selectedTip > 0 {
                    HStack {
                        Text("Tip (100% to driver)")
                        Spacer()
                        Text(String(format: "$%.2f", selectedTip))
                            .fontWeight(.semibold)
                            .foregroundColor(.green)
                    }
                }

                Divider()

                HStack {
                    Text("Total")
                        .font(.title3)
                        .fontWeight(.bold)
                    Spacer()
                    Text(String(format: "$%.2f", breakdown.grandTotal + (selectedTip - breakdown.selectedTip)))
                        .font(.title3)
                        .fontWeight(.bold)
                }
            }

            // Driver earnings highlight
            HStack {
                Image(systemName: "car.fill")
                    .foregroundColor(.green)
                Text("Driver earns: \(String(format: "$%.2f", breakdown.deliveryFee + selectedTip)) (Dollor.ai takes $0)")
                    .font(.caption)
                    .foregroundColor(.green)
            }
            .padding(8)
            .background(Color.green.opacity(0.1))
            .cornerRadius(8)
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(12)
    }

    private var placeOrderButton: some View {
        VStack(spacing: 8) {
            Button(action: onPlaceOrder) {
                HStack {
                    Text("Place Order")
                        .fontWeight(.semibold)
                    Text("(\(String(format: "$%.2f", breakdown.platformFee)) now)")
                        .fontWeight(.regular)
                }
                .frame(maxWidth: .infinity)
                .padding()
                .background(Color.accentColor)
                .foregroundColor(.white)
                .cornerRadius(12)
            }

            Text("You'll pay \(String(format: "$%.2f", breakdown.totalToRestaurant)) to restaurant at delivery")
                .font(.caption)
                .foregroundColor(.secondary)
        }
    }
}

// MARK: - Supporting Views

struct PaymentRow: View {
    let label: String
    let amount: Double
    var bold: Bool = false

    var body: some View {
        HStack {
            Text(label)
                .fontWeight(bold ? .semibold : .regular)
            Spacer()
            Text(String(format: "$%.2f", amount))
                .fontWeight(bold ? .semibold : .regular)
        }
        .font(.subheadline)
    }
}

struct TipButton: View {
    let amount: Double
    let percentage: Int
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(spacing: 4) {
                Text("\(percentage)%")
                    .font(.caption)
                    .fontWeight(.semibold)
                Text(String(format: "$%.2f", amount))
                    .font(.caption2)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 8)
            .background(isSelected ? Color.accentColor : Color(.systemGray5))
            .foregroundColor(isSelected ? .white : .primary)
            .cornerRadius(8)
        }
    }
}

struct PaymentFlowStep: View {
    let step: Int
    let title: String
    let from: String
    let to: String
    let amount: Double
    let method: String
    let color: Color
    let description: String

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            // Step number
            ZStack {
                Circle()
                    .fill(color)
                    .frame(width: 28, height: 28)
                Text("\(step)")
                    .font(.caption)
                    .fontWeight(.bold)
                    .foregroundColor(.white)
            }

            VStack(alignment: .leading, spacing: 4) {
                HStack {
                    Text(title)
                        .font(.subheadline)
                        .fontWeight(.semibold)
                    Spacer()
                    Text(String(format: "$%.2f", amount))
                        .font(.subheadline)
                        .fontWeight(.bold)
                        .foregroundColor(color)
                }

                HStack {
                    Text(from)
                        .font(.caption)
                        .foregroundColor(.secondary)
                    Image(systemName: "arrow.right")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                    Text(to)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }

                Text(method)
                    .font(.caption)
                    .padding(.horizontal, 6)
                    .padding(.vertical, 2)
                    .background(color.opacity(0.2))
                    .cornerRadius(4)

                Text(description)
                    .font(.caption2)
                    .foregroundColor(.secondary)
            }
        }
    }
}

// MARK: - Payment Terms View

public struct PaymentTermsView: View {
    @Environment(\.dismiss) private var dismiss

    public init() {}

    public var body: some View {
        NavigationView {
            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    // Platform Fee Section
                    TermsCard(
                        icon: "dollarsign.circle.fill",
                        iconColor: .blue,
                        title: "Platform Fees",
                        content: [
                            ("Customer", "$1.00 per order", "Charged at order placement"),
                            ("Restaurant", "$1.00 per order", "Charged when payment confirmed"),
                            ("Driver", "$0.00", "Drivers keep 100% of earnings")
                        ]
                    )

                    // Direct Payments Section
                    TermsCard(
                        icon: "arrow.left.arrow.right.circle.fill",
                        iconColor: .orange,
                        title: "Direct Payments",
                        content: [
                            ("Food + Tax", "Customer → Restaurant", "Via Apple Pay, Venmo, Zelle, or Cash"),
                            ("Delivery Fee", "Restaurant → Driver", "Via Venmo, Zelle, or Cash"),
                            ("Tips", "Customer → Driver", "100% goes to driver")
                        ]
                    )

                    // Delivery Fees Section
                    TermsCard(
                        icon: "car.fill",
                        iconColor: .green,
                        title: "Delivery Fees",
                        content: [
                            ("Base Fee", "$2.99", "First 2 miles"),
                            ("Per Mile", "$0.50", "After first 2 miles"),
                            ("Maximum", "$9.99", "Capped for fairness"),
                            ("Free Delivery", "$25+ orders", "Orders over $25")
                        ]
                    )

                    // Legal Disclaimer
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Legal Notice")
                            .font(.headline)

                        Text("""
                        Dollor.ai is a marketplace facilitator that connects customers with restaurants and delivery drivers. We do NOT process food or delivery payments.

                        All food payments flow directly from Customer to Restaurant.
                        All delivery payments flow directly from Restaurant to Driver.

                        Platform fee is for access to the marketplace only.
                        """)
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    .padding()
                    .background(Color(.systemGray6))
                    .cornerRadius(12)
                }
                .padding()
            }
            .navigationTitle("Payment Terms")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") { dismiss() }
                }
            }
        }
    }
}

struct TermsCard: View {
    let icon: String
    let iconColor: Color
    let title: String
    let content: [(String, String, String)]

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: icon)
                    .foregroundColor(iconColor)
                Text(title)
                    .font(.headline)
            }

            ForEach(content, id: \.0) { item in
                HStack {
                    VStack(alignment: .leading) {
                        Text(item.0)
                            .font(.subheadline)
                            .fontWeight(.medium)
                        Text(item.2)
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    Spacer()
                    Text(item.1)
                        .font(.subheadline)
                        .fontWeight(.semibold)
                        .foregroundColor(iconColor)
                }
            }
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(12)
    }
}

#Preview("Payment Breakdown") {
    PaymentBreakdownView(
        breakdown: PaymentBreakdown(
            subtotal: 35.00,
            tax: 3.06,
            taxRate: 0.0875,
            deliveryFee: 4.49,
            deliveryDistanceMiles: 3.0,
            platformFee: 1.00,
            suggestedTips: [5.25, 6.30, 7.00, 8.75],
            selectedTip: 6.30,
            totalToRestaurant: 38.06,
            totalToDriver: 10.79,
            totalToPlatform: 2.00,
            grandTotal: 49.85,
            customerPaysNow: 1.00,
            customerPaysRestaurant: 38.06,
            restaurantPaysDriver: 10.79,
            restaurantPaysPlatform: 1.00
        ),
        selectedTip: .constant(6.30),
        onPlaceOrder: {}
    )
}

#Preview("Payment Terms") {
    PaymentTermsView()
}
