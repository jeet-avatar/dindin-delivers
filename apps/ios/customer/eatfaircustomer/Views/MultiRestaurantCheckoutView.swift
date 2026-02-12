import os

private let logger = Logger(subsystem: "com.dollorai.customer", category: "MultiRestaurantCheckoutView")

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
    var scheduledDate: Date?
    @EnvironmentObject var addressViewModel: AddressViewModel
    @Environment(\.dismiss) private var dismiss

    // MARK: - Dummy Payment Mode (DEBUG ONLY)
    // This property only exists in DEBUG builds - completely removed from Release
    #if DEBUG
    private var useDummyPayments: Bool {
        AppConfig.shared.isDummyPaymentMode
    }
    #endif

    // State
    @State private var selectedPaymentMethod: PaymentMethodType = .applePay
    @State private var selectedTipPercentage: Double = 20
    @State private var customTip: String = ""
    @State private var useCustomTip = false
    @State private var promotionCode = ""
    @State private var discount: Double = 0.0
    @State private var appliedPromoCode: String?
    @State private var appliedPromoName: String?  // Promo name (e.g., "Buy One Get One Free")
    @State private var deliveryInstructions = ""

    // UI State
    @State private var showLocationPicker = false
    @State private var showAddCard = false
    @State private var isProcessing = false
    @State private var errorMessage: String?
    @State private var showError = false
    @State private var showFeeBreakdown = false

    // Apple Pay
    @State private var canMakePayments = PKPaymentAuthorizationController.canMakePayments()

    // Saved cards - fetch from Stripe backend
    @State private var savedCards: [StripeCard] = []
    @State private var selectedCardId: String?
    @State private var isLoadingCards = false

    // Stripe PaymentSheet
    @State private var stripePaymentSheet: PaymentSheet?
    @State private var stripePaymentReady = false
    @State private var isLoadingStripe = false
    @State private var showStripePaymentSheet = false

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

                            // Promo Code (moved up for visibility)
                            promoCodeSection

                            // Delivery Address
                            deliveryAddressSection

                            // Delivery Instructions
                            deliveryInstructionsSection

                            // Payment Method
                            paymentMethodSection

                            // Tip Selection
                            tipSelectionSection

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
                        .accessibilityLabel("Cancel checkout")
                        .accessibilityHint("Returns to your cart without placing order")
                }
            }
            .sheet(isPresented: $showLocationPicker) {
                LocationPickerView(viewModel: addressViewModel, isPresented: $showLocationPicker)
            }
            .sheet(isPresented: $showAddCard) {
                StripeAddCardView(onCardAdded: { card in
                    savedCards.append(card)
                    selectedCardId = card.id
                    showAddCard = false
                })
            }
            .sheet(isPresented: $showFeeBreakdown) {
                FeeBreakdownDetailView()
            }
            .onChange(of: showStripePaymentSheet) { _, shouldShow in
                if shouldShow, let sheet = stripePaymentSheet {
                    // Get the topmost view controller to present from
                    if let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
                       let rootVC = windowScene.windows.first?.rootViewController {
                        var topVC = rootVC
                        while let presented = topVC.presentedViewController {
                            topVC = presented
                        }
                        sheet.present(from: topVC) { result in
                            showStripePaymentSheet = false
                            onStripePaymentCompletion(result: result)
                        }
                    }
                }
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
                    .accessibilityLabel("Change delivery address")
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
                .accessibilityLabel("Add delivery address")
                .accessibilityHint("Opens address selection to add a new delivery address")
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
                // Apple Pay - Show if device supports payments (dummy mode only in DEBUG)
                #if DEBUG
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
                #else
                if canMakePayments {
                    PaymentMethodRow(
                        icon: "apple.logo",
                        title: "Apple Pay",
                        subtitle: "Pay with Face ID or Touch ID",
                        isSelected: selectedPaymentMethod == .applePay
                    ) {
                        selectedPaymentMethod = .applePay
                    }
                }
                #endif

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

                // Stripe PaymentSheet - Real card payment (always show in Release)
                #if DEBUG
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
                #else
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
                #endif

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
                .accessibilityLabel("Add new payment card")
                .accessibilityHint("Opens form to add a new credit or debit card")

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
                .accessibilityLabel("Apply promo code")
                .accessibilityHint("Applies the entered promotional code to your order")
            }

            if discount > 0, let code = appliedPromoCode {
                VStack(spacing: 4) {
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
                    // Show promo name (e.g., "Buy One Get One Free")
                    if let promoName = appliedPromoName {
                        HStack {
                            Image(systemName: "tag.fill")
                                .foregroundColor(.orange)
                                .font(.caption2)
                            Text(promoName)
                                .font(.caption)
                                .foregroundColor(.orange)
                                .fontWeight(.medium)
                            Spacer()
                        }
                    }
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
            // Header with fee info button
            HStack {
                Image(systemName: "receipt")
                    .foregroundColor(.blue)
                Text("Order Total")
                    .font(.headline)
                Spacer()
                Button(action: { showFeeBreakdown = true }) {
                    HStack(spacing: 2) {
                        Image(systemName: "info.circle")
                        Text("Fee Details")
                    }
                    .font(.caption2)
                    .foregroundColor(.green)
                }
                .accessibilityLabel("View fee details")
                .accessibilityHint("Shows breakdown of all fees in your order")
            }

            VStack(spacing: 8) {
                // Food subtotal with recipient indicator
                HStack {
                    Text("Food Subtotal")
                        .font(.subheadline)
                    Spacer()
                    VStack(alignment: .trailing, spacing: 2) {
                        Text("$\(String(format: "%.2f", cartVM.subtotal))")
                            .font(.subheadline)
                        Text("100% → Restaurant")
                            .font(.caption2)
                            .foregroundColor(.green)
                    }
                }

                // Platform fee with recipient
                HStack {
                    Text("Platform Fee")
                        .font(.subheadline)
                    Spacer()
                    VStack(alignment: .trailing, spacing: 2) {
                        Text("$\(String(format: "%.2f", cartVM.platformFee))")
                            .font(.subheadline)
                        Text("→ Dollor.ai")
                            .font(.caption2)
                            .foregroundColor(.orange)
                    }
                }

                // Delivery with recipient
                HStack {
                    Text("Delivery Fee")
                        .font(.subheadline)
                    Spacer()
                    VStack(alignment: .trailing, spacing: 2) {
                        Text("$\(String(format: "%.2f", cartVM.deliveryFee))")
                            .font(.subheadline)
                        Text("100% → Driver")
                            .font(.caption2)
                            .foregroundColor(.blue)
                    }
                }

                // Tax with recipient
                HStack {
                    Text("Tax (8.5%)")
                        .font(.subheadline)
                    Spacer()
                    VStack(alignment: .trailing, spacing: 2) {
                        Text("$\(String(format: "%.2f", cartVM.tax))")
                            .font(.subheadline)
                        Text("→ Government")
                            .font(.caption2)
                            .foregroundColor(.gray)
                    }
                }

                // Tip with recipient
                HStack {
                    Text("Driver Tip")
                        .font(.subheadline)
                    Spacer()
                    VStack(alignment: .trailing, spacing: 2) {
                        Text("$\(String(format: "%.2f", currentTip))")
                            .font(.subheadline)
                        Text("100% → Driver")
                            .font(.caption2)
                            .foregroundColor(.green)
                    }
                }

                // Processing fee
                let processingFee = (cartVM.subtotal + cartVM.deliveryFee + cartVM.tax + cartVM.platformFee + currentTip) * 0.029 + 0.30
                HStack {
                    Text("Processing (2.9%+$0.30)")
                        .font(.caption)
                        .foregroundColor(.gray)
                    Spacer()
                    VStack(alignment: .trailing, spacing: 2) {
                        Text("$\(String(format: "%.2f", processingFee))")
                            .font(.caption)
                            .foregroundColor(.gray)
                        Text("→ Stripe")
                            .font(.caption2)
                            .foregroundColor(.purple)
                    }
                }

                // Restaurant Contribution - TRANSPARENCY (not charged to customer)
                Divider().padding(.vertical, 4)
                VStack(alignment: .leading, spacing: 4) {
                    HStack {
                        Text("Restaurant Contribution")
                            .font(.subheadline)
                            .fontWeight(.semibold)
                        Spacer()
                        Text("Not in your total")
                            .font(.caption2)
                            .foregroundColor(.secondary)
                    }
                    HStack {
                        HStack(spacing: 4) {
                            Image(systemName: "storefront")
                                .font(.caption2)
                            VStack(alignment: .leading, spacing: 2) {
                                Text("Restaurant Platform Fee")
                                    .font(.caption)
                                Text("$1 per restaurant • Deducted from payout")
                                    .font(.caption2)
                                    .foregroundColor(.secondary)
                            }
                        }
                        .foregroundColor(.gray)
                        Spacer()
                        VStack(alignment: .trailing) {
                            Text("$\(String(format: "%.2f", Double(cartVM.restaurantCount) * 1.0))")
                                .font(.caption)
                            Text("→ Dollor.ai")
                                .font(.caption2)
                                .foregroundColor(.orange)
                        }
                    }

                    // Explicit $1+$1=$2 summary
                    HStack {
                        Spacer()
                        Text("Dollor earns $2 total per restaurant: $1 from you + $1 from restaurant")
                            .font(.caption2)
                            .foregroundColor(.secondary)
                            .italic()
                        Spacer()
                    }
                    .padding(.top, 4)
                }

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

                // Money flow visual
                VStack(alignment: .leading, spacing: 4) {
                    Divider()
                    Text("WHERE YOUR MONEY GOES")
                        .font(.caption2)
                        .fontWeight(.bold)
                        .foregroundColor(.gray)
                        .padding(.top, 4)

                    HStack(spacing: 4) {
                        MoneyFlowChip(label: "Restaurant", amount: cartVM.subtotal, color: .green)
                        MoneyFlowChip(label: "Driver", amount: cartVM.deliveryFee + currentTip, color: .blue)
                        MoneyFlowChip(label: "Tax", amount: cartVM.tax, color: .gray)
                    }
                    HStack(spacing: 4) {
                        MoneyFlowChip(label: "Dollor.ai", amount: cartVM.platformFee, color: .orange)
                        MoneyFlowChip(label: "Stripe", amount: processingFee, color: .purple)
                    }
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
            .accessibilityLabel("\(payButtonTitle) for \(String(format: "$%.2f", max(0, finalTotal)))")
            .accessibilityHint("Completes your order and processes payment")
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
        // Get customer ID from session
        let customerId = UserDefaults.standard.integer(forKey: "p2p_customer_id")
        guard customerId > 0 else {
            savedCards = []
            return
        }

        isLoadingCards = true

        P2PAPIService.shared.fetchSavedCards(customerId: customerId) { result in
            DispatchQueue.main.async {
                self.isLoadingCards = false

                switch result {
                case .success(let cards):
                    self.savedCards = cards
                    // Auto-select default card if available
                    if let defaultCard = cards.first(where: { $0.isDefault }) {
                        self.selectedCardId = defaultCard.id
                    }
                case .failure(let error):
                    #if DEBUG
                    logger.info("[Checkout] Failed to load cards: \(error)")
                    #endif
                    self.savedCards = []
                }
            }
        }
    }

    private func applyPromoCode() {
        guard !promotionCode.isEmpty else { return }

        isProcessing = true
        let code = promotionCode.uppercased()
        let customerId = UserDefaults.standard.integer(forKey: "p2p_customer_id")

        P2PAPIService.shared.validatePromoCode(
            promoCode: code,
            orderTotal: cartVM.subtotal,
            customerId: customerId > 0 ? customerId : nil
        ) { result in
            DispatchQueue.main.async {
                isProcessing = false

                switch result {
                case .success(let response):
                    discount = response.discountAmount
                    appliedPromoCode = response.promotionCode
                    appliedPromoName = response.promotionName
                    // Save promo name to cart VM for success screen
                    cartVM.lastOrderPromoName = response.promotionName
                case .failure(let error):
                    let errorMsg = (error as? P2PAPIError)?.localizedDescription ?? error.localizedDescription
                    errorMessage = errorMsg.contains("Invalid") || errorMsg.contains("not active") ? errorMsg : "Invalid or expired promo code"
                    showError = true
                }
            }
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
        #if DEBUG
        // DUMMY MODE: Skip actual Apple Pay and simulate success (DEBUG only)
        if useDummyPayments {
            // Simulate payment processing delay
            DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) {
                // Dummy payment always succeeds
                self.placeOrder()
            }
            return
        }
        #endif

        // PRODUCTION MODE: Stripe Apple Pay integration
        // First, get a PaymentIntent from backend
        PaymentService.shared.createPaymentIntent(amount: finalTotal) { result in
            DispatchQueue.main.async {
                switch result {
                case .success(let paymentIntentData):
                    #if DEBUG
                    logger.info("[ApplePay] PaymentIntent received successfully")
                    logger.info("[ApplePay] Publishable key prefix: \(String(paymentIntentData.publishableKey.prefix(20)))...")
                    logger.info("[ApplePay] Client secret prefix: \(String(paymentIntentData.clientSecret.prefix(20)))...")
                    #endif

                    // Set the publishable key
                    STPAPIClient.shared.publishableKey = paymentIntentData.publishableKey

                    // Create payment request for Apple Pay
                    let request = StripeAPI.paymentRequest(
                        withMerchantIdentifier: "merchant.com.dolloraiai",
                        country: "US",
                        currency: "USD"
                    )

                    // Required: Set supported payment networks
                    request.supportedNetworks = [.visa, .masterCard, .amex, .discover]
                    request.merchantCapabilities = [.capability3DS, .capabilityCredit, .capabilityDebit]

                    // Helper to round Double to 2 decimal places for Apple Pay
                    func roundedAmount(_ value: Double) -> NSDecimalNumber {
                        let rounded = (value * 100).rounded() / 100
                        return NSDecimalNumber(value: rounded)
                    }

                    // Build payment items
                    var paymentItems: [PKPaymentSummaryItem] = []
                    paymentItems.append(PKPaymentSummaryItem(label: "Subtotal", amount: roundedAmount(self.cartVM.subtotal)))
                    paymentItems.append(PKPaymentSummaryItem(label: "Delivery & Fees", amount: roundedAmount(self.cartVM.platformFee + self.cartVM.deliveryFee)))
                    paymentItems.append(PKPaymentSummaryItem(label: "Tax", amount: roundedAmount(self.cartVM.tax)))
                    paymentItems.append(PKPaymentSummaryItem(label: "Tip", amount: roundedAmount(self.currentTip)))

                    if self.discount > 0 {
                        paymentItems.append(PKPaymentSummaryItem(label: "Discount", amount: roundedAmount(-self.discount)))
                    }

                    paymentItems.append(PKPaymentSummaryItem(label: "Dollor", amount: roundedAmount(self.finalTotal), type: .final))
                    request.paymentSummaryItems = paymentItems

                    // Check if Apple Pay is available
                    #if DEBUG
                    logger.info("[ApplePay] Checking canSubmitPaymentRequest...")
                    logger.info("[ApplePay] Merchant ID: merchant.com.dolloraiai")
                    logger.info("[ApplePay] Supported networks: \(request.supportedNetworks)")
                    logger.info("[ApplePay] Total amount: \(self.finalTotal)")
                    #endif

                    guard StripeAPI.canSubmitPaymentRequest(request) else {
                        #if DEBUG
                        logger.info("[ApplePay] ERROR: canSubmitPaymentRequest returned false")
                        logger.info("[ApplePay] PKPaymentAuthorizationController.canMakePayments: \(PKPaymentAuthorizationController.canMakePayments())")
                        #endif
                        self.isProcessing = false
                        self.errorMessage = "Apple Pay is not available on this device. Please ensure you have a card added to your Wallet."
                        self.showError = true
                        return
                    }

                    #if DEBUG
                    logger.info("[ApplePay] canSubmitPaymentRequest passed, presenting Apple Pay sheet...")
                    #endif

                    // Create Stripe Apple Pay context
                    StripeApplePayHandler.shared.handleApplePay(
                        request: request,
                        clientSecret: paymentIntentData.clientSecret
                    ) { success, error in
                        DispatchQueue.main.async {
                            #if DEBUG
                            logger.info("[ApplePay] Payment result - success: \(success), error: \(String(describing: error))")
                            #endif
                            if success {
                                self.placeOrder()
                            } else {
                                self.isProcessing = false
                                if let error = error {
                                    #if DEBUG
                                    logger.info("[ApplePay] ERROR: \(error.localizedDescription)")
                                    #endif
                                    let errMsg = error.localizedDescription.lowercased()
                                    if errMsg.contains("cancelled") || errMsg.contains("canceled") {
                                        self.errorMessage = nil
                                    } else if errMsg.contains("declined") {
                                        self.errorMessage = "Payment declined. Please check your card or try another method."
                                    } else {
                                        self.errorMessage = "Apple Pay could not be completed. Please try again."
                                    }
                                }
                                self.showError = self.errorMessage != nil
                            }
                        }
                    }

                case .failure(let error):
                    #if DEBUG
                    logger.info("[ApplePay] PaymentIntent creation failed: \(error.localizedDescription)")
                    #endif
                    self.isProcessing = false
                    let errMsg = error.localizedDescription.lowercased()
                    if errMsg.contains("network") || errMsg.contains("connection") {
                        self.errorMessage = "Unable to connect. Please check your internet connection."
                    } else {
                        self.errorMessage = "Unable to initialize payment. Please try again."
                    }
                    self.showError = true
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
                    // Check for demo mode (App Store review) - skip Stripe and place order directly
                    if keys.isDemoPayment {
                        logger.info("[Checkout] Demo account detected - bypassing Stripe payment")
                        self.stripePaymentReady = true
                        // If we're processing, skip payment and place order directly
                        if self.isProcessing {
                            self.placeOrder()
                        }
                        return
                    }

                    STPAPIClient.shared.publishableKey = keys.publishableKey

                    var configuration = PaymentSheet.Configuration()
                    configuration.merchantDisplayName = "Dollor"
                    if let customerId = keys.customer, let ephemeralKey = keys.ephemeralKey {
                        configuration.customer = .init(id: customerId, ephemeralKeySecret: ephemeralKey)
                    }
                    configuration.allowsDelayedPaymentMethods = false

                    // Enable Apple Pay
                    configuration.applePay = .init(
                        merchantId: "merchant.com.dolloraiai",
                        merchantCountryCode: "US"
                    )

                    self.stripePaymentSheet = PaymentSheet(paymentIntentClientSecret: keys.paymentIntent, configuration: configuration)
                    self.stripePaymentReady = true

                    // If we're processing, present the sheet now that it's ready
                    if self.isProcessing {
                        self.showStripePaymentSheet = true
                    }

                case .failure(let error):
                    let errMsg = error.localizedDescription.lowercased()
                    if errMsg.contains("network") || errMsg.contains("connection") {
                        self.errorMessage = "Unable to connect. Please check your internet connection."
                    } else {
                        self.errorMessage = "Unable to initialize payment. Please try again."
                    }
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
        case .failed(let error):
            isProcessing = false
            let errMsg = error.localizedDescription.lowercased()
            if errMsg.contains("declined") || errMsg.contains("insufficient") {
                errorMessage = "Payment declined. Please check your card or try another method."
            } else if errMsg.contains("expired") {
                errorMessage = "Card has expired. Please update your payment method."
            } else {
                errorMessage = "Payment could not be completed. Please try again."
            }
            showError = true
        }
    }

    private func processStripePayment() {
        isProcessing = true

        if stripePaymentSheet != nil && stripePaymentReady {
            // PaymentSheet is ready, present it
            showStripePaymentSheet = true
        } else if !isLoadingStripe {
            // Prepare the payment sheet first, then present when ready
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

        #if DEBUG
        // DUMMY MODE: Simulate order placement without requiring login or Firestore (DEBUG only)
        if useDummyPayments {
            // Simulate a brief delay for order processing
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
                logger.debug("=== DUMMY ORDER PLACED ===")
                logger.debug("Items: \(self.cartVM.totalItemCount)")
                logger.debug("Subtotal: $\(String(format: "%.2f", self.cartVM.subtotal))")
                logger.debug("Total: $\(String(format: "%.2f", self.finalTotal))")
                logger.debug("==========================")

                // Signal order placed - MainAppView will handle sheet dismissal and success screen
                self.isProcessing = false
                self.cartVM.orderPlaced = true
            }
            return
        }
        #endif

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
            tipPercentage: useCustomTip ? nil : selectedTipPercentage,
            scheduledFor: scheduledDate,
            promoCode: appliedPromoCode
        ) { result in
            DispatchQueue.main.async {
                isProcessing = false

                switch result {
                case .success:
                    #if DEBUG
                    logger.info("[OrderFlow] ✅ Backend order placed successfully")
                    logger.info("[OrderFlow] Setting orderPlaced = true")
                    #endif
                    // Signal order placed - MainAppView will handle sheet dismissal and success screen
                    cartVM.orderPlaced = true
                case .failure(let error):
                    #if DEBUG
                    logger.info("[OrderFlow] ❌ Backend order failed: \(error.localizedDescription)")
                    #endif
                    let errMsg = error.localizedDescription.lowercased()
                    if errMsg.contains("closed") || errMsg.contains("unavailable") {
                        errorMessage = "Restaurant is currently closed. Please try again later."
                    } else if errMsg.contains("out of stock") || errMsg.contains("unavailable") {
                        errorMessage = "Some items are no longer available. Please update your cart."
                    } else {
                        errorMessage = "Unable to place order. Please try again."
                    }
                    showError = true
                }
            }
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

// Note: SavedCard is now replaced with StripeCard from EatFairShared

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
                Text("$\(String(format: "%.2f", amount))")
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

// MARK: - Add Card View (uses StripeAddCardView from PaymentMethodsView)
// AddCardView is now StripeAddCardView which uses real Stripe integration

// MARK: - Money Flow Chip
struct MoneyFlowChip: View {
    let label: String
    let amount: Double
    let color: Color

    var body: some View {
        VStack(spacing: 2) {
            Text(label)
                .font(.caption2)
                .foregroundColor(.secondary)
            Text("$\(String(format: "%.2f", amount))")
                .font(.caption)
                .fontWeight(.medium)
                .foregroundColor(color)
        }
        .padding(.horizontal, 8)
        .padding(.vertical, 4)
        .background(color.opacity(0.1))
        .cornerRadius(8)
    }
}

// MARK: - Fee Breakdown Detail View
struct FeeBreakdownDetailView: View {
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationView {
            List {
                Section(header: Text("How Your Payment is Distributed")) {
                    FeeRow(title: "Restaurant", description: "Food cost goes directly to the restaurant", icon: "fork.knife", color: .green)
                    FeeRow(title: "Driver", description: "Delivery fee + tips go 100% to your driver", icon: "car.fill", color: .blue)
                    FeeRow(title: "Tax", description: "Sales tax collected for your state", icon: "percent", color: .gray)
                    FeeRow(title: "Platform Fee", description: "$1 matchmaking fee to Dollor.ai", icon: "app.fill", color: .orange)
                    FeeRow(title: "Processing", description: "Card processing fee (Stripe)", icon: "creditcard.fill", color: .purple)
                }

                Section(header: Text("Our Promise")) {
                    Text("Dollor.ai only charges a flat $1 matchmaking fee. Drivers keep 100% of delivery fees and tips. No hidden charges.")
                        .font(.footnote)
                        .foregroundColor(.secondary)
                }
            }
            .navigationTitle("Fee Breakdown")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") { dismiss() }
                        .accessibilityLabel("Close fee breakdown")
                }
            }
        }
    }
}

// MARK: - Fee Row
private struct FeeRow: View {
    let title: String
    let description: String
    let icon: String
    let color: Color

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .foregroundColor(color)
                .frame(width: 24)
            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.subheadline)
                    .fontWeight(.medium)
                Text(description)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
        }
        .padding(.vertical, 4)
    }
}

// MARK: - Preview
#if DEBUG
#Preview {
    MultiRestaurantCheckoutView(cartVM: .preview, scheduledDate: nil)
        .environmentObject(AddressViewModel())
}
#endif
