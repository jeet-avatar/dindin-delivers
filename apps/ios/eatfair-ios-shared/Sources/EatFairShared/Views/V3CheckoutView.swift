import SwiftUI
import PassKit

// MARK: - V3 Checkout View (Frictionless One-Click)

public struct V3CheckoutView: View {
    @StateObject private var viewModel: V3CheckoutViewModel
    @Environment(\.dismiss) private var dismiss

    public init(
        items: [V3OrderItem],
        restaurantId: String,
        restaurantName: String,
        restaurantStripeAccount: String,
        deliveryAddress: String,
        deliveryLat: Double,
        deliveryLng: Double,
        customerEmail: String,
        customerName: String,
        customerPhone: String
    ) {
        _viewModel = StateObject(wrappedValue: V3CheckoutViewModel(
            items: items,
            restaurantId: restaurantId,
            restaurantName: restaurantName,
            restaurantStripeAccount: restaurantStripeAccount,
            deliveryAddress: deliveryAddress,
            deliveryLat: deliveryLat,
            deliveryLng: deliveryLng,
            customerEmail: customerEmail,
            customerName: customerName,
            customerPhone: customerPhone
        ))
    }

    public var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 20) {
                    // Order Items Summary
                    orderSummarySection

                    // Delivery Address
                    deliverySection

                    // Tip Selection
                    tipSection

                    // Promo Code
                    promoSection

                    // Price Breakdown with Transparency
                    priceBreakdownSection

                    // Who Gets What (Transparency)
                    transparencySection

                    // Place Order Button
                    placeOrderSection
                }
                .padding()
            }
            .navigationTitle("Checkout")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") { dismiss() }
                }
            }
            .alert("Order Error", isPresented: $viewModel.showError) {
                Button("OK", role: .cancel) { }
            } message: {
                Text(viewModel.errorMessage)
            }
            .sheet(isPresented: $viewModel.showOrderSuccess) {
                V3OrderSuccessView(
                    orderId: viewModel.orderId,
                    estimatedDelivery: viewModel.estimatedDelivery,
                    onDismiss: { dismiss() }
                )
            }
        }
    }

    // MARK: - Order Summary

    private var orderSummarySection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: "bag.fill")
                    .foregroundColor(.accentColor)
                Text("Your Order")
                    .font(.headline)
                Spacer()
                Text(viewModel.restaurantName)
                    .font(.subheadline)
                    .foregroundColor(.secondary)
            }

            ForEach(viewModel.items, id: \.name) { item in
                HStack {
                    Text("\(item.quantity)x")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                        .frame(width: 30, alignment: .leading)
                    Text(item.name)
                        .font(.subheadline)
                    Spacer()
                    Text(String(format: "$%.2f", item.price * Double(item.quantity)))
                        .font(.subheadline)
                }
            }
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(12)
    }

    // MARK: - Delivery Section

    private var deliverySection: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Image(systemName: "location.fill")
                    .foregroundColor(.green)
                Text("Delivery Address")
                    .font(.headline)
            }

            Text(viewModel.deliveryAddress)
                .font(.subheadline)
                .foregroundColor(.secondary)

            HStack {
                Image(systemName: "clock.fill")
                    .foregroundColor(.orange)
                    .font(.caption)
                Text("Est. 30-40 min")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(.systemGray6))
        .cornerRadius(12)
    }

    // MARK: - Tip Section

    private var tipSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: "heart.fill")
                    .foregroundColor(.pink)
                Text("Tip Your Driver")
                    .font(.headline)
                Spacer()
                Text("100% goes to driver")
                    .font(.caption)
                    .foregroundColor(.green)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(Color.green.opacity(0.1))
                    .cornerRadius(8)
            }

            HStack(spacing: 10) {
                ForEach(viewModel.tipOptions, id: \.self) { tip in
                    TipOptionButton(
                        amount: tip,
                        percentage: viewModel.tipPercentage(for: tip),
                        isSelected: viewModel.selectedTip == tip,
                        action: { viewModel.selectedTip = tip }
                    )
                }
            }

            // Custom tip input
            HStack {
                Text("Custom:")
                    .font(.caption)
                    .foregroundColor(.secondary)
                TextField("$0.00", value: $viewModel.selectedTip, format: .currency(code: "USD"))
                    .textFieldStyle(.roundedBorder)
                    .keyboardType(.decimalPad)
                    .frame(width: 100)
            }
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(12)
    }

    // MARK: - Promo Section

    private var promoSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Image(systemName: "tag.fill")
                    .foregroundColor(.purple)
                Text("Promo Code")
                    .font(.headline)
            }

            HStack {
                TextField("Enter code", text: $viewModel.promoCode)
                    .textFieldStyle(.roundedBorder)
                    .textInputAutocapitalization(.characters)

                Button("Apply") {
                    viewModel.applyPromoCode()
                }
                .buttonStyle(.borderedProminent)
                .disabled(viewModel.promoCode.isEmpty)
            }

            if viewModel.promoApplied {
                HStack {
                    Image(systemName: "checkmark.circle.fill")
                        .foregroundColor(.green)
                    Text("Promo applied: -$\(String(format: "%.2f", viewModel.promoDiscount))")
                        .font(.caption)
                        .foregroundColor(.green)
                }
            }
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(12)
    }

    // MARK: - Price Breakdown

    private var priceBreakdownSection: some View {
        VStack(spacing: 12) {
            HStack {
                Text("Subtotal")
                Spacer()
                Text(String(format: "$%.2f", viewModel.pricing.subtotal))
            }
            .font(.subheadline)

            HStack {
                Text("Tax")
                Spacer()
                Text(String(format: "$%.2f", viewModel.pricing.tax))
            }
            .font(.subheadline)
            .foregroundColor(.secondary)

            HStack {
                HStack(spacing: 4) {
                    Text("Delivery")
                    if viewModel.pricing.isFreeDelivery {
                        Text("FREE")
                            .font(.caption)
                            .fontWeight(.bold)
                            .foregroundColor(.white)
                            .padding(.horizontal, 6)
                            .padding(.vertical, 2)
                            .background(Color.green)
                            .cornerRadius(4)
                    }
                }
                Spacer()
                if viewModel.pricing.isFreeDelivery {
                    Text("$0.00")
                        .strikethrough()
                        .foregroundColor(.secondary)
                } else {
                    Text(String(format: "$%.2f", viewModel.pricing.deliveryFee))
                }
            }
            .font(.subheadline)

            HStack {
                Text("Service Fee")
                Spacer()
                Text(String(format: "$%.2f", viewModel.pricing.serviceFee))
            }
            .font(.subheadline)
            .foregroundColor(.secondary)

            if viewModel.selectedTip > 0 {
                HStack {
                    Text("Tip")
                    Spacer()
                    Text(String(format: "$%.2f", viewModel.selectedTip))
                }
                .font(.subheadline)
                .foregroundColor(.green)
            }

            if viewModel.promoDiscount > 0 {
                HStack {
                    Text("Discount")
                    Spacer()
                    Text(String(format: "-$%.2f", viewModel.promoDiscount))
                }
                .font(.subheadline)
                .foregroundColor(.green)
            }

            Divider()

            HStack {
                Text("Total")
                    .font(.title3)
                    .fontWeight(.bold)
                Spacer()
                Text(String(format: "$%.2f", viewModel.pricing.total))
                    .font(.title3)
                    .fontWeight(.bold)
            }
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(12)
    }

    // MARK: - Transparency Section

    private var transparencySection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: "eye.fill")
                    .foregroundColor(.blue)
                Text("Where Your Money Goes")
                    .font(.headline)
            }

            VStack(spacing: 8) {
                TransparencyRow(
                    icon: "storefront.fill",
                    color: .orange,
                    label: "Restaurant gets",
                    amount: viewModel.pricing.restaurantReceives
                )

                TransparencyRow(
                    icon: "car.fill",
                    color: .green,
                    label: "Driver gets (100%)",
                    amount: viewModel.pricing.driverReceives
                )

                TransparencyRow(
                    icon: "building.2.fill",
                    color: .blue,
                    label: "Dollor.ai gets",
                    amount: viewModel.pricing.platformReceives
                )
            }

            // Zero driver fee highlight
            HStack {
                Image(systemName: "checkmark.shield.fill")
                    .foregroundColor(.green)
                Text("Dollor.ai takes $0 from drivers")
                    .font(.caption)
                    .foregroundColor(.green)
            }
            .padding(8)
            .frame(maxWidth: .infinity)
            .background(Color.green.opacity(0.1))
            .cornerRadius(8)
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(12)
    }

    // MARK: - Place Order Section

    private var placeOrderSection: some View {
        VStack(spacing: 12) {
            // Apple Pay Button
            Button(action: { viewModel.placeOrder(paymentMethod: .applePay) }) {
                HStack {
                    Image(systemName: "applelogo")
                    Text("Pay with Apple Pay")
                }
                .frame(maxWidth: .infinity)
                .padding()
                .background(Color.black)
                .foregroundColor(.white)
                .cornerRadius(12)
            }
            .disabled(viewModel.isProcessing)

            // Card Payment Button
            Button(action: { viewModel.placeOrder(paymentMethod: .card) }) {
                HStack {
                    if viewModel.isProcessing {
                        ProgressView()
                            .tint(.white)
                    } else {
                        Image(systemName: "creditcard.fill")
                        Text("Pay $\(String(format: "%.2f", viewModel.pricing.total))")
                    }
                }
                .frame(maxWidth: .infinity)
                .padding()
                .background(Color.accentColor)
                .foregroundColor(.white)
                .cornerRadius(12)
            }
            .disabled(viewModel.isProcessing)

            // Security note
            HStack {
                Image(systemName: "lock.shield.fill")
                    .foregroundColor(.secondary)
                Text("Secure payment powered by Stripe")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
        }
    }
}

// MARK: - Supporting Views

struct TipOptionButton: View {
    let amount: Double
    let percentage: Int
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(spacing: 2) {
                Text("\(percentage)%")
                    .font(.caption)
                    .fontWeight(.semibold)
                Text(String(format: "$%.2f", amount))
                    .font(.caption2)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 10)
            .background(isSelected ? Color.accentColor : Color(.systemGray5))
            .foregroundColor(isSelected ? .white : .primary)
            .cornerRadius(10)
        }
    }
}

struct TransparencyRow: View {
    let icon: String
    let color: Color
    let label: String
    let amount: Double

    var body: some View {
        HStack {
            Image(systemName: icon)
                .foregroundColor(color)
                .frame(width: 24)
            Text(label)
                .font(.subheadline)
            Spacer()
            Text(String(format: "$%.2f", amount))
                .font(.subheadline)
                .fontWeight(.semibold)
                .foregroundColor(color)
        }
    }
}

// MARK: - View Model

@MainActor
public class V3CheckoutViewModel: ObservableObject {
    // Input
    let items: [V3OrderItem]
    let restaurantId: String
    let restaurantName: String
    let restaurantStripeAccount: String
    let deliveryAddress: String
    let deliveryLat: Double
    let deliveryLng: Double
    let customerEmail: String
    let customerName: String
    let customerPhone: String

    // State
    @Published var selectedTip: Double = 0
    @Published var promoCode: String = ""
    @Published var promoApplied: Bool = false
    @Published var promoDiscount: Double = 0
    @Published var isProcessing: Bool = false
    @Published var showError: Bool = false
    @Published var errorMessage: String = ""
    @Published var showOrderSuccess: Bool = false
    @Published var orderId: String = ""
    @Published var estimatedDelivery: String = ""

    let tipOptions: [Double]

    var pricing: V3PricingBreakdown {
        V3PricingCalculator.calculate(
            items: items,
            distanceMiles: 3.0,  // Would calculate from coordinates
            tip: selectedTip,
            promoDiscount: promoDiscount
        )
    }

    init(
        items: [V3OrderItem],
        restaurantId: String,
        restaurantName: String,
        restaurantStripeAccount: String,
        deliveryAddress: String,
        deliveryLat: Double,
        deliveryLng: Double,
        customerEmail: String,
        customerName: String,
        customerPhone: String
    ) {
        self.items = items
        self.restaurantId = restaurantId
        self.restaurantName = restaurantName
        self.restaurantStripeAccount = restaurantStripeAccount
        self.deliveryAddress = deliveryAddress
        self.deliveryLat = deliveryLat
        self.deliveryLng = deliveryLng
        self.customerEmail = customerEmail
        self.customerName = customerName
        self.customerPhone = customerPhone

        // Calculate tip options based on subtotal
        let subtotal = items.reduce(0) { $0 + ($1.price * Double($1.quantity)) }
        self.tipOptions = [
            (subtotal * 0.15).rounded(toPlaces: 2),
            (subtotal * 0.18).rounded(toPlaces: 2),
            (subtotal * 0.20).rounded(toPlaces: 2),
            (subtotal * 0.25).rounded(toPlaces: 2)
        ]
        self.selectedTip = tipOptions[1]  // Default to 18%
    }

    func tipPercentage(for amount: Double) -> Int {
        let subtotal = items.reduce(0) { $0 + ($1.price * Double($1.quantity)) }
        guard subtotal > 0 else { return 0 }
        return Int((amount / subtotal * 100).rounded())
    }

    func applyPromoCode() {
        // Simulate promo validation
        let validPromos = ["FIRST10": 10.0, "DOLLAR1": 5.0, "VIRAL20": pricing.subtotal * 0.20]
        if let discount = validPromos[promoCode.uppercased()] {
            promoDiscount = min(discount, 15.0)  // Max $15 discount
            promoApplied = true
        }
    }

    enum PaymentMethod {
        case applePay
        case card
    }

    func placeOrder(paymentMethod: PaymentMethod) {
        isProcessing = true

        Task {
            do {
                let request = V3CreateOrderRequest(
                    customerEmail: customerEmail,
                    customerName: customerName,
                    customerPhone: customerPhone,
                    restaurantId: restaurantId,
                    restaurantStripeAccount: restaurantStripeAccount,
                    items: items,
                    deliveryAddress: deliveryAddress,
                    deliveryLat: deliveryLat,
                    deliveryLng: deliveryLng,
                    tipAmount: selectedTip,
                    promoCode: promoApplied ? promoCode : nil
                )

                let response = try await DollorV3Service.shared.createOrder(request)

                // In production: Use Stripe SDK to confirm payment with paymentIntentClientSecret
                // For now, simulate success
                orderId = response.orderId
                estimatedDelivery = response.estimatedDelivery
                showOrderSuccess = true
                isProcessing = false

            } catch {
                errorMessage = error.localizedDescription
                showError = true
                isProcessing = false
            }
        }
    }
}

// MARK: - Order Success View

public struct V3OrderSuccessView: View {
    let orderId: String
    let estimatedDelivery: String
    let onDismiss: () -> Void

    @State private var showShareSheet = false
    @State private var referralCode = ""

    public var body: some View {
        VStack(spacing: 24) {
            // Success Animation
            ZStack {
                Circle()
                    .fill(Color.green.opacity(0.1))
                    .frame(width: 120, height: 120)

                Image(systemName: "checkmark.circle.fill")
                    .font(.system(size: 80))
                    .foregroundColor(.green)
            }
            .padding(.top, 40)

            VStack(spacing: 8) {
                Text("Order Placed!")
                    .font(.title)
                    .fontWeight(.bold)

                Text("Order #\(orderId)")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
            }

            // Estimated delivery
            VStack(spacing: 4) {
                Text("Estimated Delivery")
                    .font(.caption)
                    .foregroundColor(.secondary)
                Text(estimatedDelivery)
                    .font(.title2)
                    .fontWeight(.semibold)
            }
            .padding()
            .frame(maxWidth: .infinity)
            .background(Color(.systemGray6))
            .cornerRadius(12)

            // AI handling note
            HStack {
                Image(systemName: "cpu.fill")
                    .foregroundColor(.purple)
                Text("AI is coordinating your order")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }

            Spacer()

            // Viral sharing section
            VStack(spacing: 16) {
                Text("Share & Earn $10")
                    .font(.headline)

                Text("Give friends $10 off their first order.\nYou get $10 when they order!")
                    .font(.caption)
                    .foregroundColor(.secondary)
                    .multilineTextAlignment(.center)

                Button(action: { shareReferral() }) {
                    HStack {
                        Image(systemName: "square.and.arrow.up")
                        Text("Share Your Code")
                    }
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color.purple)
                    .foregroundColor(.white)
                    .cornerRadius(12)
                }
            }
            .padding()
            .background(Color.purple.opacity(0.1))
            .cornerRadius(16)

            // Track Order Button
            Button(action: onDismiss) {
                Text("Track Order")
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color.accentColor)
                    .foregroundColor(.white)
                    .cornerRadius(12)
            }
        }
        .padding()
    }

    private func shareReferral() {
        // Get referral code and share
        showShareSheet = true
    }
}

// MARK: - Previews

#Preview("V3 Checkout") {
    V3CheckoutView(
        items: [
            V3OrderItem(name: "Margherita Pizza", quantity: 1, price: 15.99),
            V3OrderItem(name: "Caesar Salad", quantity: 1, price: 8.99),
            V3OrderItem(name: "Garlic Bread", quantity: 2, price: 4.99)
        ],
        restaurantId: "rst_test123",
        restaurantName: "Tony's Pizza",
        restaurantStripeAccount: "acct_test123",
        deliveryAddress: "123 Main St, San Francisco, CA 94102",
        deliveryLat: 37.7749,
        deliveryLng: -122.4194,
        customerEmail: "test@example.com",
        customerName: "John Doe",
        customerPhone: "+14155551234"
    )
}

#Preview("Order Success") {
    V3OrderSuccessView(
        orderId: "DLR-ABC12345",
        estimatedDelivery: "30-40 min",
        onDismiss: {}
    )
}
