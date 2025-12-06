import SwiftUI
import PassKit
import CoreLocation
import MapKit
import EatFairShared
import FirebaseFirestore
import FirebaseAuth
import StripePaymentSheet
import Stripe

// MARK: - Multi-Restaurant Checkout View
struct MultiRestaurantCheckoutView: View {
    @ObservedObject var cartVM: MultiRestaurantCartViewModel
    @EnvironmentObject var addressViewModel: AddressViewModel
    @Environment(\.dismiss) private var dismiss

    // MARK: - Dummy Payment Mode (for testing)
    // Uses centralized config from AppConfig which defaults to false in production
    private var useDummyPayments: Bool {
        AppConfig.shared.isDummyPaymentMode
    }

    // State
    @State private var selectedPaymentMethod: PaymentMethodType = .applePay
    @State private var selectedTipPercentage: Double = 20
    @State private var customTip: String = ""
    @State private var useCustomTip = false
    @State private var promotionCode = ""
    @State private var discount: Double = 0.0
    @State private var appliedPromoCode: String?
    @State private var deliveryInstructions = ""

    // UI State
    @State private var showLocationPicker = false
    @State private var showAddCard = false
    @State private var isProcessing = false
    @State private var errorMessage: String?
    @State private var showError = false

    // Apple Pay
    @State private var canMakePayments = PKPaymentAuthorizationController.canMakePayments()

    // Saved cards (mock data for now - in production fetch from backend)
    @State private var savedCards: [SavedCard] = []
    @State private var selectedCardId: String?

    // Stripe PaymentSheet
    @State private var stripePaymentSheet: PaymentSheet?
    @State private var stripePaymentReady = false
    @State private var isLoadingStripe = false

    private var currentTip: Double {
        if useCustomTip, let tip = Double(customTip) {
            return tip
        }
        return cartVM.subtotal * (selectedTipPercentage / 100)
    }

    private var finalTotal: Double {
        cartVM.total(withTip: currentTip) - discount
    }

    var body: some View {
        NavigationStack {
            ZStack {
                Color(.systemGray6).ignoresSafeArea()

                VStack(spacing: 0) {
                    ScrollView {
                        VStack(spacing: 16) {
                            // Order Summary Header
                            orderSummaryHeader

                            // Delivery Address
                            deliveryAddressSection

                            // Delivery Instructions
                            deliveryInstructionsSection

                            // Payment Method
                            paymentMethodSection

                            // Tip Selection
                            tipSelectionSection

                            // Promo Code
                            promoCodeSection

                            // Price Breakdown
                            priceBreakdownSection
                        }
                        .padding()
                    }

                    // Bottom Pay Button
                    payButton
                }
            }
            .navigationTitle("Checkout")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") { dismiss() }
                }
            }
            .sheet(isPresented: $showLocationPicker) {
                LocationPickerView(viewModel: addressViewModel, isPresented: $showLocationPicker)
            }
            .sheet(isPresented: $showAddCard) {
                AddCardView(onCardAdded: { card in
                    savedCards.append(card)
                    selectedCardId = card.id
                    showAddCard = false
                })
            }
            .alert("Error", isPresented: $showError) {
                Button("OK", role: .cancel) { }
            } message: {
                Text(errorMessage ?? "Something went wrong")
            }
            .onAppear {
                addressViewModel.fetchAddresses()
                loadSavedCards()
            }
        }
    }

    // MARK: - Order Summary Header
    private var orderSummaryHeader: some View {
        VStack(spacing: 12) {
            // Restaurant badges
            HStack(spacing: -8) {
                ForEach(Array(cartVM.orderedRestaurants.prefix(3).enumerated()), id: \.element.id) { index, restaurant in
                    ZStack {
                        Circle()
                            .fill(Color.white)
                            .frame(width: 44, height: 44)
                            .shadow(radius: 2)

                        Circle()
                            .fill(colors[index % colors.count].opacity(0.2))
                            .frame(width: 40, height: 40)

                        Text(String(restaurant.name.prefix(1)))
                            .font(.headline)
                            .foregroundColor(colors[index % colors.count])
                    }
                }
            }

            Text("\(cartVM.totalItemCount) items from \(cartVM.restaurantCount) restaurant\(cartVM.restaurantCount > 1 ? "s" : "")")
                .font(.subheadline)
                .foregroundColor(.secondary)

            if cartVM.restaurantCount > 1 {
                HStack(spacing: 4) {
                    Image(systemName: "star.fill")
                        .font(.caption)
                        .foregroundColor(.orange)
                    Text("Multi-Restaurant Order")
                        .font(.caption)
                        .fontWeight(.medium)
                        .foregroundColor(.orange)
                }
                .padding(.horizontal, 12)
                .padding(.vertical, 6)
                .background(Color.orange.opacity(0.1))
                .cornerRadius(12)
            }
        }
        .padding()
        .frame(maxWidth: .infinity)
        .background(Color.white)
        .cornerRadius(16)
    }

    private let colors: [Color] = [.blue, .green, .orange, .purple, .red]

    // MARK: - Delivery Address Section
    private var deliveryAddressSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: "location.fill")
                    .foregroundColor(.green)
                Text("Delivery Address")
                    .font(.headline)
                Spacer()
            }

            if let address = addressViewModel.selectedAddress {
                HStack(alignment: .top, spacing: 12) {
                    Image(systemName: "mappin.circle.fill")
                        .foregroundColor(.red)
                        .font(.title2)

                    VStack(alignment: .leading, spacing: 4) {
                        Text(address.locationName)
                            .font(.subheadline)
                            .fontWeight(.semibold)

                        Text("\(address.street), \(address.city)")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }

                    Spacer()

                    Button("Change") {
                        showLocationPicker = true
                    }
                    .font(.subheadline)
                    .foregroundColor(.green)
                }
            } else {
                Button(action: { showLocationPicker = true }) {
                    HStack {
                        Image(systemName: "plus.circle.fill")
                            .foregroundColor(.green)
                        Text("Add Delivery Address")
                            .foregroundColor(.primary)
                        Spacer()
                        Image(systemName: "chevron.right")
                            .foregroundColor(.secondary)
                    }
                }
            }
        }
        .padding()
        .background(Color.white)
        .cornerRadius(16)
    }

    // MARK: - Delivery Instructions Section
    private var deliveryInstructionsSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: "text.bubble")
                    .foregroundColor(.blue)
                Text("Delivery Instructions")
                    .font(.headline)
                Spacer()
            }

            TextField("Leave at door, call when arrived, etc.", text: $deliveryInstructions, axis: .vertical)
                .lineLimit(2...4)
                .padding()
                .background(Color(.systemGray6))
                .cornerRadius(12)
        }
        .padding()
        .background(Color.white)
        .cornerRadius(16)
    }

    // MARK: - Payment Method Section
    private var paymentMethodSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: "creditcard.fill")
                    .foregroundColor(.purple)
                Text("Payment Method")
                    .font(.headline)
                Spacer()
            }

            VStack(spacing: 8) {
                // Apple Pay - Always show in dummy mode, otherwise check canMakePayments
                if useDummyPayments || canMakePayments {
                    PaymentMethodRow(
                        icon: "apple.logo",
                        title: "Apple Pay",
                        subtitle: useDummyPayments ? "Test Mode - Simulated Payment" : "Pay with Face ID or Touch ID",
                        isSelected: selectedPaymentMethod == .applePay
                    ) {
                        selectedPaymentMethod = .applePay
                    }
                }

                // Saved Cards
                ForEach(savedCards) { card in
                    PaymentMethodRow(
                        icon: card.brand.icon,
                        title: "\(card.brand.displayName) •••• \(card.last4)",
                        subtitle: "Expires \(card.expiryMonth)/\(card.expiryYear)",
                        isSelected: selectedPaymentMethod == .savedCard && selectedCardId == card.id
                    ) {
                        selectedPaymentMethod = .savedCard
                        selectedCardId = card.id
                    }
                }

                // Stripe PaymentSheet - Real card payment (not dummy mode)
                if !useDummyPayments {
                    PaymentMethodRow(
                        icon: "creditcard.fill",
                        title: "Pay with Card (Stripe)",
                        subtitle: "Secure checkout with any card",
                        isSelected: selectedPaymentMethod == .stripeCard
                    ) {
                        selectedPaymentMethod = .stripeCard
                        if stripePaymentSheet == nil && !isLoadingStripe {
                            prepareStripePaymentSheet()
                        }
                    }
                }

                // Add New Card
                Button(action: { showAddCard = true }) {
                    HStack {
                        Image(systemName: "plus.circle.fill")
                            .foregroundColor(.green)
                        Text("Add New Card")
                            .foregroundColor(.primary)
                        Spacer()
                        Image(systemName: "chevron.right")
                            .foregroundColor(.secondary)
                    }
                    .padding()
                    .background(Color(.systemGray6))
                    .cornerRadius(12)
                }

                // Cash on Delivery
                PaymentMethodRow(
                    icon: "banknote",
                    title: "Cash on Delivery",
                    subtitle: "Pay when your order arrives",
                    isSelected: selectedPaymentMethod == .cash
                ) {
                    selectedPaymentMethod = .cash
                }
            }
        }
        .padding()
        .background(Color.white)
        .cornerRadius(16)
    }

    // MARK: - Tip Selection Section
    private var tipSelectionSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: "heart.fill")
                    .foregroundColor(.red)
                Text("Tip Your Driver")
                    .font(.headline)

                Spacer()

                if cartVM.restaurantCount > 1 {
                    Text("Multi-stop!")
                        .font(.caption)
                        .foregroundColor(.orange)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(Color.orange.opacity(0.1))
                        .cornerRadius(8)
                }
            }

            Text("100% goes to your driver")
                .font(.caption)
                .foregroundColor(.secondary)

            HStack(spacing: 8) {
                ForEach(cartVM.tipPercentages, id: \.self) { percentage in
                    CheckoutTipButton(
                        percentage: percentage,
                        amount: cartVM.subtotal * (percentage / 100),
                        isSelected: !useCustomTip && selectedTipPercentage == percentage
                    ) {
                        useCustomTip = false
                        selectedTipPercentage = percentage
                    }
                }

                // Custom
                Button(action: { useCustomTip.toggle() }) {
                    VStack(spacing: 2) {
                        Text("Other")
                            .font(.caption2)
                        if useCustomTip {
                            TextField("$0", text: $customTip)
                                .keyboardType(.decimalPad)
                                .multilineTextAlignment(.center)
                                .font(.caption)
                                .fontWeight(.bold)
                                .frame(width: 40)
                        } else {
                            Text("$...")
                                .font(.caption)
                                .fontWeight(.bold)
                        }
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 10)
                    .background(useCustomTip ? Color.green.opacity(0.2) : Color(.systemGray6))
                    .cornerRadius(10)
                    .overlay(
                        RoundedRectangle(cornerRadius: 10)
                            .stroke(useCustomTip ? Color.green : Color.clear, lineWidth: 2)
                    )
                }
                .foregroundColor(useCustomTip ? .green : .primary)
            }
        }
        .padding()
        .background(Color.white)
        .cornerRadius(16)
    }

    // MARK: - Promo Code Section
    private var promoCodeSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: "tag.fill")
                    .foregroundColor(.green)
                Text("Promo Code")
                    .font(.headline)
                Spacer()
            }

            HStack {
                TextField("Enter code", text: $promotionCode)
                    .textInputAutocapitalization(.characters)
                    .padding()
                    .background(Color(.systemGray6))
                    .cornerRadius(10)

                Button("Apply") {
                    applyPromoCode()
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 12)
                .background(promotionCode.isEmpty ? Color.gray : Color.green)
                .foregroundColor(.white)
                .cornerRadius(10)
                .disabled(promotionCode.isEmpty)
            }

            if discount > 0, let code = appliedPromoCode {
                HStack {
                    Image(systemName: "checkmark.circle.fill")
                        .foregroundColor(.green)
                    Text("'\(code)' applied!")
                        .font(.caption)
                        .foregroundColor(.green)
                    Spacer()
                    Text("-$\(String(format: "%.2f", discount))")
                        .fontWeight(.bold)
                        .foregroundColor(.green)
                }
                .padding(.horizontal)
            }
        }
        .padding()
        .background(Color.white)
        .cornerRadius(16)
    }

    // MARK: - Price Breakdown Section
    private var priceBreakdownSection: some View {
        VStack(spacing: 12) {
            HStack {
                Image(systemName: "receipt")
                    .foregroundColor(.blue)
                Text("Order Total")
                    .font(.headline)
                Spacer()
            }

            VStack(spacing: 8) {
                PriceRow(label: "Subtotal", value: cartVM.subtotal)
                PriceRow(label: "Platform Fee", value: cartVM.platformFee)
                PriceRow(label: "Delivery Fee", value: cartVM.deliveryFee)
                PriceRow(label: "Tax", value: cartVM.tax)
                PriceRow(label: "Tip", value: currentTip)

                if discount > 0 {
                    HStack {
                        Text("Discount")
                            .foregroundColor(.green)
                        Spacer()
                        Text("-$\(String(format: "%.2f", discount))")
                            .foregroundColor(.green)
                    }
                    .font(.subheadline)
                }

                Divider()

                HStack {
                    Text("Total")
                        .font(.headline)
                    Spacer()
                    Text("$\(String(format: "%.2f", max(0, finalTotal)))")
                        .font(.title2)
                        .fontWeight(.bold)
                        .foregroundColor(.green)
                }
            }
        }
        .padding()
        .background(Color.white)
        .cornerRadius(16)
    }

    // MARK: - Pay Button
    private var payButton: some View {
        VStack(spacing: 0) {
            Divider()

            Button(action: processPayment) {
                HStack {
                    if isProcessing {
                        ProgressView()
                            .tint(.white)
                    } else {
                        if selectedPaymentMethod == .applePay {
                            Image(systemName: "apple.logo")
                        }
                        Text(payButtonTitle)
                            .fontWeight(.bold)
                    }

                    Spacer()

                    Text("$\(String(format: "%.2f", max(0, finalTotal)))")
                        .fontWeight(.bold)
                }
                .foregroundColor(.white)
                .padding()
                .background(isValidOrder ? Color.green : Color.gray)
                .cornerRadius(14)
            }
            .disabled(!isValidOrder || isProcessing)
            .padding()
        }
        .background(Color.white)
    }

    private var payButtonTitle: String {
        switch selectedPaymentMethod {
        case .applePay:
            return "Pay with Apple Pay"
        case .savedCard:
            return "Pay with Card"
        case .stripeCard:
            return "Pay with Card"
        case .cash:
            return "Place Order (Cash)"
        }
    }

    private var isValidOrder: Bool {
        addressViewModel.selectedAddress != nil && !cartVM.items.isEmpty
    }

    // MARK: - Actions

    private func loadSavedCards() {
        // DUMMY MODE: Load test cards for development
        if useDummyPayments {
            savedCards = [
                SavedCard(
                    id: "test_visa_1",
                    last4: "4242",
                    brand: .visa,
                    expiryMonth: 12,
                    expiryYear: 2027
                ),
                SavedCard(
                    id: "test_mc_1",
                    last4: "5555",
                    brand: .mastercard,
                    expiryMonth: 6,
                    expiryYear: 2026
                )
            ]
            return
        }

        // PRODUCTION MODE: Fetch from Firebase or backend
        savedCards = []
    }

    private func applyPromoCode() {
        // Simple promo code validation
        let code = promotionCode.uppercased()

        // Mock promo codes for testing
        switch code {
        case "WELCOME10":
            discount = cartVM.subtotal * 0.10
            appliedPromoCode = code
        case "SAVE5":
            discount = 5.0
            appliedPromoCode = code
        default:
            errorMessage = "Invalid promo code"
            showError = true
        }
    }

    private func processPayment() {
        guard isValidOrder else { return }

        isProcessing = true

        switch selectedPaymentMethod {
        case .applePay:
            processApplePay()
        case .savedCard:
            processCardPayment()
        case .stripeCard:
            processStripePayment()
        case .cash:
            placeOrder()
        }
    }

    private func processApplePay() {
        // DUMMY MODE: Skip actual Apple Pay and simulate success
        if useDummyPayments {
            // Simulate payment processing delay
            DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) {
                // Dummy payment always succeeds
                self.placeOrder()
            }
            return
        }

        // PRODUCTION MODE: Real Apple Pay integration
        let request = PKPaymentRequest()
        request.merchantIdentifier = "merchant.com.eatfair.customer"
        request.supportedNetworks = [.visa, .masterCard, .amex, .discover]
        request.merchantCapabilities = .threeDSecure
        request.countryCode = "US"
        request.currencyCode = "USD"

        // Build payment items
        var paymentItems: [PKPaymentSummaryItem] = []

        paymentItems.append(PKPaymentSummaryItem(label: "Subtotal", amount: NSDecimalNumber(value: cartVM.subtotal)))
        paymentItems.append(PKPaymentSummaryItem(label: "Delivery & Fees", amount: NSDecimalNumber(value: cartVM.platformFee + cartVM.deliveryFee)))
        paymentItems.append(PKPaymentSummaryItem(label: "Tax", amount: NSDecimalNumber(value: cartVM.tax)))
        paymentItems.append(PKPaymentSummaryItem(label: "Tip", amount: NSDecimalNumber(value: currentTip)))

        if discount > 0 {
            paymentItems.append(PKPaymentSummaryItem(label: "Discount", amount: NSDecimalNumber(value: -discount)))
        }

        paymentItems.append(PKPaymentSummaryItem(label: "EatFair", amount: NSDecimalNumber(value: finalTotal), type: .final))

        request.paymentSummaryItems = paymentItems

        let controller = PKPaymentAuthorizationController(paymentRequest: request)
        controller.delegate = ApplePayDelegate.shared
        ApplePayDelegate.shared.onCompletion = { success in
            DispatchQueue.main.async {
                if success {
                    self.placeOrder()
                } else {
                    self.isProcessing = false
                }
            }
        }

        controller.present { presented in
            if !presented {
                DispatchQueue.main.async {
                    self.errorMessage = "Could not present Apple Pay"
                    self.showError = true
                    self.isProcessing = false
                }
            }
        }
    }

    private func processCardPayment() {
        // DUMMY MODE: Simulate card payment success
        // In production, this would charge the saved card via Stripe
        DispatchQueue.main.asyncAfter(deadline: .now() + 1) {
            self.placeOrder()
        }
    }

    // MARK: - Stripe PaymentSheet Integration
    private func prepareStripePaymentSheet() {
        isLoadingStripe = true

        PaymentService.shared.fetchPaymentSheetKeys(amount: finalTotal) { result in
            DispatchQueue.main.async {
                self.isLoadingStripe = false
                switch result {
                case .success(let keys):
                    STPAPIClient.shared.publishableKey = keys.publishableKey

                    var configuration = PaymentSheet.Configuration()
                    configuration.merchantDisplayName = "EatFair"
                    configuration.customer = .init(id: keys.customer, ephemeralKeySecret: keys.ephemeralKey)
                    configuration.allowsDelayedPaymentMethods = false

                    self.stripePaymentSheet = PaymentSheet(paymentIntentClientSecret: keys.paymentIntent, configuration: configuration)
                    self.stripePaymentReady = true

                case .failure(let error):
                    print("Failed to load Stripe payment sheet: \(error)")
                    self.errorMessage = "Failed to initialize payment: \(error.localizedDescription)"
                    self.showError = true
                }
            }
        }
    }

    private func onStripePaymentCompletion(result: PaymentSheetResult) {
        switch result {
        case .completed:
            placeOrder()
        case .canceled:
            isProcessing = false
            print("Stripe payment canceled")
        case .failed(let error):
            isProcessing = false
            errorMessage = "Payment failed: \(error.localizedDescription)"
            showError = true
        }
    }

    private func processStripePayment() {
        // Stripe PaymentSheet is handled via PaymentSheet.PaymentButton
        // This is a fallback for manual trigger if needed
        isProcessing = true
        if stripePaymentSheet == nil {
            prepareStripePaymentSheet()
        }
    }

    private func placeOrder() {
        guard let address = addressViewModel.selectedAddress else {
            errorMessage = "Please select a delivery address"
            showError = true
            isProcessing = false
            return
        }

        // DUMMY MODE: Simulate order placement without requiring login or Firestore
        if useDummyPayments {
            // Simulate a brief delay for order processing
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
                // Log the order details for debugging
                print("=== DUMMY ORDER PLACED ===")
                print("Items: \(self.cartVM.totalItemCount)")
                print("Subtotal: $\(String(format: "%.2f", self.cartVM.subtotal))")
                print("Delivery Fee: $\(String(format: "%.2f", self.cartVM.deliveryFee))")
                print("Tax: $\(String(format: "%.2f", self.cartVM.tax))")
                print("Tip: $\(String(format: "%.2f", self.currentTip))")
                print("Total: $\(String(format: "%.2f", self.finalTotal))")
                print("Delivery Address: \(address.street), \(address.city)")
                print("Restaurants: \(self.cartVM.orderedRestaurants.map { $0.name }.joined(separator: ", "))")
                print("==========================")

                // Signal order placed - MainAppView will show success screen
                self.isProcessing = false
                self.cartVM.orderPlaced = true
            }
            return
        }

        // PRODUCTION MODE: Real order placement via Firebase
        let deliveryAddress = DeliveryAddress(
            fullAddress: "\(address.street), \(address.city), \(address.state) \(address.zipCode)",
            street: address.street,
            city: address.city,
            state: address.state,
            zipCode: address.zipCode,
            latitude: address.latitude,
            longitude: address.longitude,
            landmark: deliveryInstructions.isEmpty ? address.instructions : deliveryInstructions
        )

        cartVM.placeOrder(
            deliveryAddress: deliveryAddress,
            deliveryInstructions: deliveryInstructions,
            tip: currentTip,
            tipPercentage: useCustomTip ? nil : selectedTipPercentage
        ) { result in
            DispatchQueue.main.async {
                isProcessing = false

                switch result {
                case .success:
                    // Signal order placed - MainAppView will show success screen
                    cartVM.orderPlaced = true
                case .failure(let error):
                    errorMessage = error.localizedDescription
                    showError = true
                }
            }
        }
    }
}

// MARK: - Apple Pay Delegate
class ApplePayDelegate: NSObject, PKPaymentAuthorizationControllerDelegate {
    static let shared = ApplePayDelegate()
    var onCompletion: ((Bool) -> Void)?

    func paymentAuthorizationController(_ controller: PKPaymentAuthorizationController, didAuthorizePayment payment: PKPayment, handler completion: @escaping (PKPaymentAuthorizationResult) -> Void) {
        // In production, send payment.token to your server for processing
        // For now, simulate success
        completion(PKPaymentAuthorizationResult(status: .success, errors: nil))
        onCompletion?(true)
    }

    func paymentAuthorizationControllerDidFinish(_ controller: PKPaymentAuthorizationController) {
        controller.dismiss {
            // Payment sheet dismissed
        }
    }
}

// MARK: - Supporting Types
enum PaymentMethodType {
    case applePay
    case savedCard
    case stripeCard  // Real Stripe PaymentSheet
    case cash
}

struct SavedCard: Identifiable, Codable {
    let id: String
    let last4: String
    let brand: CardBrand
    let expiryMonth: Int
    let expiryYear: Int

    enum CardBrand: String, Codable {
        case visa, mastercard, amex, discover, unknown

        var displayName: String {
            switch self {
            case .visa: return "Visa"
            case .mastercard: return "Mastercard"
            case .amex: return "Amex"
            case .discover: return "Discover"
            case .unknown: return "Card"
            }
        }

        var icon: String {
            switch self {
            case .visa: return "creditcard.fill"
            case .mastercard: return "creditcard.fill"
            case .amex: return "creditcard.fill"
            case .discover: return "creditcard.fill"
            case .unknown: return "creditcard.fill"
            }
        }
    }
}

// MARK: - Supporting Views
struct PaymentMethodRow: View {
    let icon: String
    let title: String
    let subtitle: String
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 12) {
                Image(systemName: icon)
                    .font(.title2)
                    .foregroundColor(isSelected ? .green : .gray)
                    .frame(width: 32)

                VStack(alignment: .leading, spacing: 2) {
                    Text(title)
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .foregroundColor(.primary)
                    Text(subtitle)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }

                Spacer()

                Image(systemName: isSelected ? "checkmark.circle.fill" : "circle")
                    .foregroundColor(isSelected ? .green : .gray)
            }
            .padding()
            .background(isSelected ? Color.green.opacity(0.1) : Color(.systemGray6))
            .cornerRadius(12)
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(isSelected ? Color.green : Color.clear, lineWidth: 2)
            )
        }
    }
}

struct CheckoutTipButton: View {
    let percentage: Double
    let amount: Double
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(spacing: 2) {
                Text("\(Int(percentage))%")
                    .font(.caption2)
                Text("$\(String(format: "%.0f", amount))")
                    .font(.caption)
                    .fontWeight(.bold)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 10)
            .background(isSelected ? Color.green.opacity(0.2) : Color(.systemGray6))
            .cornerRadius(10)
            .overlay(
                RoundedRectangle(cornerRadius: 10)
                    .stroke(isSelected ? Color.green : Color.clear, lineWidth: 2)
            )
        }
        .foregroundColor(isSelected ? .green : .primary)
    }
}

struct PriceRow: View {
    let label: String
    let value: Double

    var body: some View {
        HStack {
            Text(label)
                .foregroundColor(.secondary)
            Spacer()
            Text("$\(String(format: "%.2f", value))")
        }
        .font(.subheadline)
    }
}

// MARK: - Add Card View
struct AddCardView: View {
    @Environment(\.dismiss) private var dismiss
    let onCardAdded: (SavedCard) -> Void

    @State private var cardNumber = ""
    @State private var expiryDate = ""
    @State private var cvv = ""
    @State private var cardholderName = ""
    @State private var saveCard = true
    @State private var isProcessing = false

    var body: some View {
        NavigationStack {
            Form {
                Section("Card Details") {
                    TextField("Card Number", text: $cardNumber)
                        .keyboardType(.numberPad)

                    HStack {
                        TextField("MM/YY", text: $expiryDate)
                            .keyboardType(.numberPad)

                        SecureField("CVV", text: $cvv)
                            .keyboardType(.numberPad)
                    }

                    TextField("Cardholder Name", text: $cardholderName)
                        .textContentType(.name)
                }

                Section {
                    Toggle("Save card for future orders", isOn: $saveCard)
                }

                Section {
                    Button(action: addCard) {
                        if isProcessing {
                            ProgressView()
                        } else {
                            Text("Add Card")
                        }
                    }
                    .frame(maxWidth: .infinity)
                    .disabled(!isValidCard || isProcessing)
                }
            }
            .navigationTitle("Add Card")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") { dismiss() }
                }
            }
        }
    }

    private var isValidCard: Bool {
        cardNumber.count >= 15 &&
        expiryDate.count >= 4 &&
        cvv.count >= 3 &&
        !cardholderName.isEmpty
    }

    private func addCard() {
        isProcessing = true

        // Simulate card tokenization
        DispatchQueue.main.asyncAfter(deadline: .now() + 1) {
            let last4 = String(cardNumber.suffix(4))
            let brand = detectCardBrand(cardNumber)

            // Parse expiry
            let parts = expiryDate.split(separator: "/")
            let month = Int(parts.first ?? "01") ?? 1
            let year = Int(parts.last ?? "25") ?? 25

            let card = SavedCard(
                id: UUID().uuidString,
                last4: last4,
                brand: brand,
                expiryMonth: month,
                expiryYear: 2000 + year
            )

            onCardAdded(card)
        }
    }

    private func detectCardBrand(_ number: String) -> SavedCard.CardBrand {
        let cleaned = number.replacingOccurrences(of: " ", with: "")

        if cleaned.hasPrefix("4") {
            return .visa
        } else if cleaned.hasPrefix("5") {
            return .mastercard
        } else if cleaned.hasPrefix("34") || cleaned.hasPrefix("37") {
            return .amex
        } else if cleaned.hasPrefix("6") {
            return .discover
        }
        return .unknown
    }
}

// MARK: - Preview
#if DEBUG
#Preview {
    MultiRestaurantCheckoutView(cartVM: .preview)
        .environmentObject(AddressViewModel())
}
#endif
