import SwiftUI
import CoreLocation
import MapKit
import EatFairShared
import FirebaseFirestore
import StripePaymentSheet
import Stripe

struct CheckoutView: View {
    @EnvironmentObject var cartViewModel: CartViewModel
    @EnvironmentObject var addressViewModel: AddressViewModel
    
    // @State private var selectedAddressId: String? // Removed, using ViewModel's
    @State private var selectedPaymentMethod = "Cash on Delivery"
    @State private var showingSuccess = false
    @State private var showLocationPicker = false // Add state
    @State private var promotionCode = ""
    @State private var discount: Double = 0.0
    @State private var appliedPromoCode: String?
    
    // Stripe State
    @State private var paymentSheet: PaymentSheet?
    @State private var paymentResult: PaymentSheetResult?
    @State private var isLoadingPayment = false
    @State private var stripePaymentReady = false
    @State private var errorMessage: String?
    @State private var showingError = false

    // ACH Payment State
    @State private var achDiscount: Double = 0.50  // $0.50 discount for ACH

    @State private var correctedCoordinates: CLLocationCoordinate2D?

    // Fee Transparency State
    @State private var showFeeBreakdown = false
    @State private var driverTip: Double = 3.0  // Default $3 tip
    @State private var estimatedDistance: Double = 3.0  // Default 3 miles

    // MARK: - Computed Fee Properties (Full Transparency)

    /// Food subtotal - 100% goes to restaurant
    private var foodSubtotal: Double {
        cartViewModel.items.reduce(0.0) { result, item in
            result + (item.price * Double(item.quantity))
        }
    }

    /// Delivery fee - 100% goes to driver
    private var deliveryFee: Double {
        let baseFee = AppConfig.shared.baseDeliveryFee
        let extraMiles = max(0, estimatedDistance - 2.0)
        let distanceCharge = extraMiles * AppConfig.shared.perMileDeliveryFee
        return min(baseFee + distanceCharge, AppConfig.shared.maxDeliveryFee)
    }

    /// California state tax (7.25%)
    private var stateTax: Double {
        (foodSubtotal + deliveryFee) * 0.0725
    }

    /// City tax (1.25%)
    private var cityTax: Double {
        (foodSubtotal + deliveryFee) * 0.0125
    }

    /// Special district tax (1.0%)
    private var districtTax: Double {
        (foodSubtotal + deliveryFee) * 0.01
    }

    /// Total tax
    private var totalTax: Double {
        stateTax + cityTax + districtTax
    }

    /// Platform fee - FLAT $1 for food delivery (per restaurant)
    /// Note: Rideshare uses tiered pricing, but food is always $1 flat
    private var platformFee: Double {
        AppConfig.shared.getCustomerDeliveryFee(orderSubtotal: foodSubtotal)
    }

    /// Platform fee description for display
    private var platformFeeTierDescription: String {
        AppConfig.shared.getFoodFeeDescription()
    }

    /// Small order fee (orders under threshold from AppConfig)
    private var smallOrderFee: Double {
        foodSubtotal < AppConfig.shared.smallOrderThreshold ? AppConfig.shared.smallOrderFee : 0.0
    }

    /// Payment processing fee (Stripe: 2.9% + $0.30) - passed through at cost
    private var processingFee: Double {
        let subtotalBeforeProcessing = foodSubtotal + deliveryFee + totalTax + platformFee + smallOrderFee + driverTip
        return (subtotalBeforeProcessing * 0.029) + 0.30
    }

    /// Calculate grand total with all fees
    private func calculateGrandTotal() -> Double {
        let totalDiscount = discount + (selectedPaymentMethod == "ACH" ? achDiscount : 0)
        return foodSubtotal + deliveryFee + totalTax + platformFee + smallOrderFee + processingFee + driverTip - totalDiscount
    }
    
    var body: some View {
        ZStack {
            Theme.brandGrey.edgesIgnoringSafeArea(.all)
            
            VStack {
                ScrollView {
                    VStack(spacing: 20) {
                        // 1. Delivery Address Section
                        VStack(alignment: .leading, spacing: 10) {
                            Text("DELIVERY ADDRESS")
                                .font(.caption)
                                .fontWeight(.bold)
                                .foregroundColor(Theme.textGrey)
                            
                            if let address = addressViewModel.selectedAddress {
                                VStack(alignment: .leading, spacing: 0) {
                                    // Map Snippet
                                    let displayCoords = correctedCoordinates ?? CLLocationCoordinate2D(latitude: address.latitude, longitude: address.longitude)
                                    
                                    Map(position: .constant(.region(MKCoordinateRegion(
                                        center: displayCoords,
                                        span: MKCoordinateSpan(latitudeDelta: 0.005, longitudeDelta: 0.005)
                                    )))) {
                                    }
                                    .frame(height: 120)
                                    .cornerRadius(8)
                                    .disabled(true)
                                    .padding(.bottom, 8)
                                    
                                    HStack {
                                        Image(systemName: "mappin.circle.fill")
                                            .foregroundColor(Theme.brandOrange)
                                            .font(.title2)
                                        
                                        VStack(alignment: .leading) {
                                            Text(address.locationName)
                                                .font(.headline)
                                            Text("\(address.street), \(address.city)")
                                                .font(.subheadline)
                                                .foregroundColor(.gray)
                                        }
                                        
                                        Spacer()
                                        
                                        // Edit/Change Button
                                        Button(action: {
                                            showLocationPicker = true
                                        }) {
                                            Text("Change")
                                                .fontWeight(.bold)
                                                .foregroundColor(Theme.brandGreen)
                                        }
                                        .sheet(isPresented: $showLocationPicker) {
                                            LocationPickerView(viewModel: addressViewModel, isPresented: $showLocationPicker)
                                        }
                                    }
                                }
                                .padding()
                                .background(Color.white)
                                .cornerRadius(12)
                                .onAppear {
                                    validateCoordinates(for: address)
                                }
                                .onChange(of: address.id) {
                                    validateCoordinates(for: address)
                                }
                            } else {
                                NavigationLink(destination: AddAddressView(viewModel: addressViewModel)) {
                                    HStack {
                                        Image(systemName: "plus.circle.fill")
                                        Text("Add Delivery Address")
                                    }
                                    .padding()
                                    .frame(maxWidth: .infinity)
                                    .background(Color.white)
                                    .cornerRadius(12)
                                }
                            }
                        }
                        .padding()
                        
                        // 2. Payment Method Section
                        VStack(alignment: .leading, spacing: 10) {
                            Text("PAYMENT METHOD")
                                .font(.caption)
                                .fontWeight(.bold)
                                .foregroundColor(Theme.textGrey)

                            VStack(spacing: 0) {
                                PaymentOptionRow(title: "Cash on Delivery", icon: "banknote.fill", isSelected: selectedPaymentMethod == "Cash on Delivery")
                                    .onTapGesture { selectedPaymentMethod = "Cash on Delivery" }
                                Divider()
                                PaymentOptionRow(title: "Credit/Debit Card", icon: "creditcard.fill", isSelected: selectedPaymentMethod == "Card")
                                    .onTapGesture {
                                        selectedPaymentMethod = "Card"
                                    }
                                Divider()
                                // ACH Bank Payment - Lower fees, $0.50 discount
                                HStack {
                                    Image(systemName: "building.columns.fill")
                                        .foregroundColor(Theme.brandBlack)
                                        .frame(width: 30)
                                    VStack(alignment: .leading, spacing: 2) {
                                        Text("Bank Account (ACH)")
                                            .foregroundColor(Theme.brandBlack)
                                        Text("Save $0.50 on fees")
                                            .font(.caption2)
                                            .foregroundColor(.green)
                                    }
                                    Spacer()
                                    if selectedPaymentMethod == "ACH" {
                                        Image(systemName: "checkmark.circle.fill")
                                            .foregroundColor(Theme.brandGreen)
                                    } else {
                                        Image(systemName: "circle")
                                            .foregroundColor(.gray)
                                    }
                                }
                                .padding()
                                .onTapGesture {
                                    selectedPaymentMethod = "ACH"
                                }
                            }
                            .background(Color.white)
                            .cornerRadius(12)
                        }
                        .padding(.horizontal)
                        
                        // NEW: Promotion Code Section
                        VStack(alignment: .leading, spacing: 10) {
                            Text("PROMOTION CODE")
                                .font(.caption)
                                .fontWeight(.bold)
                                .foregroundColor(Theme.textGrey)
                            
                            HStack {
                                TextField("Enter code", text: $promotionCode)
                                    .textInputAutocapitalization(.characters)
                                    .padding()
                                    .background(Color(.systemGray6))
                                    .cornerRadius(8)
                                
                                Button("Apply") {
                                    applyPromotion()
                                }
                                .padding(.horizontal)
                                .padding(.vertical, 12)
                                .background(promotionCode.isEmpty ? Color.gray : Theme.brandGreen)
                                .foregroundColor(.white)
                                .cornerRadius(8)
                                .disabled(promotionCode.isEmpty)
                            }
                            .padding()
                            .background(Color.white)
                            .cornerRadius(12)
                            
                            if discount > 0 {
                                HStack {
                                    Image(systemName: "tag.fill")
                                        .foregroundColor(.green)
                                    Text("Code '\(appliedPromoCode ?? "")' applied!")
                                        .foregroundColor(.green)
                                        .font(.caption)
                                    Spacer()
                                    Text("-$\(String(format: "%.2f", discount))")
                                        .foregroundColor(.green)
                                        .fontWeight(.bold)
                                }
                                .padding(.horizontal)
                            }
                        }
                        .padding(.horizontal)
                        
                        // 3. Order Summary - FULL FEE TRANSPARENCY
                        VStack(alignment: .leading, spacing: 10) {
                            HStack {
                                Text("ORDER SUMMARY")
                                    .font(.caption)
                                    .fontWeight(.bold)
                                    .foregroundColor(Theme.textGrey)
                                Spacer()
                                // Fee transparency info button
                                Button(action: { showFeeBreakdown = true }) {
                                    HStack(spacing: 2) {
                                        Image(systemName: "info.circle")
                                        Text("Fee Details")
                                    }
                                    .font(.caption2)
                                    .foregroundColor(Theme.brandGreen)
                                }
                            }

                            VStack(spacing: 8) {
                                // Food Items Section
                                VStack(alignment: .leading, spacing: 4) {
                                    HStack {
                                        Text("Food Items")
                                            .font(.subheadline)
                                            .fontWeight(.semibold)
                                        Spacer()
                                        Text("100% → Restaurant")
                                            .font(.caption2)
                                            .foregroundColor(.green)
                                    }
                                    ForEach(Array(cartViewModel.items.enumerated()), id: \.offset) { index, item in
                                        HStack {
                                            Text("  \(item.quantity)x \(item.name)")
                                                .font(.caption)
                                                .foregroundColor(Theme.textGrey)
                                            Spacer()
                                            Text("$\(String(format: "%.2f", item.price * Double(item.quantity)))")
                                                .font(.caption)
                                        }
                                    }
                                    HStack {
                                        Text("  Subtotal")
                                            .font(.caption)
                                            .fontWeight(.medium)
                                        Spacer()
                                        Text("$\(String(format: "%.2f", foodSubtotal))")
                                            .font(.caption)
                                            .fontWeight(.medium)
                                    }
                                }

                                Divider()

                                // Delivery Fee Section
                                VStack(alignment: .leading, spacing: 4) {
                                    HStack {
                                        Text("Delivery")
                                            .font(.subheadline)
                                            .fontWeight(.semibold)
                                        Spacer()
                                        Text("100% → Driver")
                                            .font(.caption2)
                                            .foregroundColor(.green)
                                    }
                                    HStack {
                                        Text("  Base delivery fee")
                                            .font(.caption)
                                            .foregroundColor(Theme.textGrey)
                                        Spacer()
                                        Text("$\(String(format: "%.2f", AppConfig.shared.baseDeliveryFee))")
                                            .font(.caption)
                                    }
                                    HStack {
                                        Text("  Distance (\(String(format: "%.1f", estimatedDistance)) mi)")
                                            .font(.caption)
                                            .foregroundColor(Theme.textGrey)
                                        Spacer()
                                        Text("$\(String(format: "%.2f", max(0, (estimatedDistance - 2.0) * AppConfig.shared.perMileDeliveryFee)))")
                                            .font(.caption)
                                    }
                                }

                                Divider()

                                // Taxes Section - Itemized
                                VStack(alignment: .leading, spacing: 4) {
                                    HStack {
                                        Text("Taxes")
                                            .font(.subheadline)
                                            .fontWeight(.semibold)
                                        Spacer()
                                        Text("→ Government")
                                            .font(.caption2)
                                            .foregroundColor(.blue)
                                    }
                                    HStack {
                                        Text("  CA State Tax (7.25%)")
                                            .font(.caption)
                                            .foregroundColor(Theme.textGrey)
                                        Spacer()
                                        Text("$\(String(format: "%.2f", stateTax))")
                                            .font(.caption)
                                    }
                                    HStack {
                                        Text("  City Tax (1.25%)")
                                            .font(.caption)
                                            .foregroundColor(Theme.textGrey)
                                        Spacer()
                                        Text("$\(String(format: "%.2f", cityTax))")
                                            .font(.caption)
                                    }
                                    HStack {
                                        Text("  District Tax (1.0%)")
                                            .font(.caption)
                                            .foregroundColor(Theme.textGrey)
                                        Spacer()
                                        Text("$\(String(format: "%.2f", districtTax))")
                                            .font(.caption)
                                    }
                                }

                                Divider()

                                // Fees Section - Transparent
                                VStack(alignment: .leading, spacing: 4) {
                                    HStack {
                                        Text("Fees")
                                            .font(.subheadline)
                                            .fontWeight(.semibold)
                                        Spacer()
                                    }
                                    HStack {
                                        HStack(spacing: 4) {
                                            Image(systemName: "app.connected.to.app.below.fill")
                                                .font(.caption2)
                                            VStack(alignment: .leading, spacing: 2) {
                                                Text("Platform Fee")
                                                    .font(.caption)
                                                Text(platformFeeTierDescription)
                                                    .font(.caption2)
                                                    .foregroundColor(.orange)
                                            }
                                        }
                                        .foregroundColor(Theme.textGrey)
                                        Spacer()
                                        VStack(alignment: .trailing) {
                                            Text("$\(String(format: "%.2f", platformFee))")
                                                .font(.caption)
                                            Text("→ Dollor.ai")
                                                .font(.caption2)
                                                .foregroundColor(.orange)
                                        }
                                    }
                                    HStack {
                                        HStack(spacing: 4) {
                                            Image(systemName: "creditcard")
                                                .font(.caption2)
                                            Text("Processing (2.9% + $0.30)")
                                                .font(.caption)
                                        }
                                        .foregroundColor(Theme.textGrey)
                                        Spacer()
                                        VStack(alignment: .trailing) {
                                            Text("$\(String(format: "%.2f", processingFee))")
                                                .font(.caption)
                                            Text("→ Stripe")
                                                .font(.caption2)
                                                .foregroundColor(.purple)
                                        }
                                    }
                                    if foodSubtotal < AppConfig.shared.smallOrderThreshold {
                                        HStack {
                                            Text("  Small order fee")
                                                .font(.caption)
                                                .foregroundColor(Theme.textGrey)
                                            Spacer()
                                            Text("$\(String(format: "%.2f", AppConfig.shared.smallOrderFee))")
                                                .font(.caption)
                                        }
                                    }
                                }

                                // Discounts
                                if discount > 0 || selectedPaymentMethod == "ACH" {
                                    Divider()
                                    VStack(alignment: .leading, spacing: 4) {
                                        Text("Discounts")
                                            .font(.subheadline)
                                            .fontWeight(.semibold)
                                            .foregroundColor(.green)
                                        if discount > 0 {
                                            HStack {
                                                HStack(spacing: 4) {
                                                    Image(systemName: "tag.fill")
                                                        .font(.caption2)
                                                    Text("Promo: \(appliedPromoCode ?? "")")
                                                        .font(.caption)
                                                }
                                                .foregroundColor(.green)
                                                Spacer()
                                                Text("-$\(String(format: "%.2f", discount))")
                                                    .font(.caption)
                                                    .foregroundColor(.green)
                                            }
                                        }
                                        if selectedPaymentMethod == "ACH" {
                                            HStack {
                                                HStack(spacing: 4) {
                                                    Image(systemName: "building.columns.fill")
                                                        .font(.caption2)
                                                    Text("ACH Bank Discount")
                                                        .font(.caption)
                                                }
                                                .foregroundColor(.green)
                                                Spacer()
                                                Text("-$\(String(format: "%.2f", achDiscount))")
                                                    .font(.caption)
                                                    .foregroundColor(.green)
                                            }
                                        }
                                    }
                                }

                                // Driver Tip
                                Divider()
                                VStack(alignment: .leading, spacing: 4) {
                                    HStack {
                                        Text("Driver Tip")
                                            .font(.subheadline)
                                            .fontWeight(.semibold)
                                        Spacer()
                                        Text("100% → Driver")
                                            .font(.caption2)
                                            .foregroundColor(.green)
                                    }
                                    HStack(spacing: 8) {
                                        ForEach([0.0, 2.0, 3.0, 5.0], id: \.self) { tip in
                                            Button(action: { driverTip = tip }) {
                                                Text(tip == 0 ? "No tip" : "$\(Int(tip))")
                                                    .font(.caption)
                                                    .padding(.horizontal, 12)
                                                    .padding(.vertical, 6)
                                                    .background(driverTip == tip ? Theme.brandGreen : Color.gray.opacity(0.2))
                                                    .foregroundColor(driverTip == tip ? .white : Theme.brandBlack)
                                                    .cornerRadius(16)
                                            }
                                        }
                                    }
                                }

                                // Grand Total
                                Divider().padding(.vertical, 4)
                                let _ = discount + (selectedPaymentMethod == "ACH" ? achDiscount : 0)
                                let grandTotal = calculateGrandTotal()
                                HStack {
                                    Text("TOTAL")
                                        .fontWeight(.bold)
                                    Spacer()
                                    Text("$\(String(format: "%.2f", max(0, grandTotal)))")
                                        .font(.title3)
                                        .fontWeight(.bold)
                                        .foregroundColor(Theme.brandGreen)
                                }

                                // Money Flow Summary
                                VStack(alignment: .leading, spacing: 4) {
                                    Divider()
                                    Text("WHERE YOUR MONEY GOES")
                                        .font(.caption2)
                                        .fontWeight(.bold)
                                        .foregroundColor(Theme.textGrey)
                                        .padding(.top, 4)

                                    HStack(spacing: 4) {
                                        MoneyFlowChip(label: "Restaurant", amount: foodSubtotal, color: .green)
                                        MoneyFlowChip(label: "Driver", amount: deliveryFee + driverTip, color: .blue)
                                        MoneyFlowChip(label: "Tax", amount: totalTax, color: .gray)
                                    }
                                    HStack(spacing: 4) {
                                        MoneyFlowChip(label: "Dollor.ai", amount: platformFee, color: .orange)
                                        MoneyFlowChip(label: "Stripe", amount: processingFee, color: .purple)
                                    }
                                }
                            }
                            .padding()
                            .background(Color.white)
                            .cornerRadius(12)
                        }
                        .padding(.horizontal)
                    }
                }
                
                // Bottom Bar
                VStack {
                    Spacer()
                    if selectedPaymentMethod == "Card" {
                        // Stripe PaymentSheet Button
                        if let paymentSheet = paymentSheet {
                            PaymentSheet.PaymentButton(
                                paymentSheet: paymentSheet,
                                onCompletion: onPaymentCompletion
                            ) {
                                HStack {
                                    if isLoadingPayment {
                                        ProgressView()
                                            .tint(.white)
                                    }
                                    Text("Pay with Card • $\(String(format: "%.2f", max(0, cartViewModel.total - discount)))")
                                        .font(.headline)
                                        .foregroundColor(.white)
                                }
                                .frame(maxWidth: .infinity)
                                .padding()
                                .background(Theme.brandGreen)
                                .cornerRadius(12)
                                .shadow(radius: 5)
                            }
                            .padding()
                            .padding(.bottom, 20)
                            .disabled(addressViewModel.selectedAddress == nil)
                        } else {
                            // Loading state while preparing payment sheet
                            Button(action: {
                                preparePaymentSheet()
                            }) {
                                HStack {
                                    if isLoadingPayment {
                                        ProgressView()
                                            .tint(.white)
                                    }
                                    Text(isLoadingPayment ? "Preparing Payment..." : "Setup Card Payment • $\(String(format: "%.2f", max(0, cartViewModel.total - discount)))")
                                        .font(.headline)
                                        .foregroundColor(.white)
                                }
                                .frame(maxWidth: .infinity)
                                .padding()
                                .background(isLoadingPayment ? Color.gray : Theme.brandGreen)
                                .cornerRadius(12)
                                .shadow(radius: 5)
                            }
                            .padding()
                            .padding(.bottom, 20)
                            .disabled(addressViewModel.selectedAddress == nil || isLoadingPayment)
                        }
                    } else if selectedPaymentMethod == "ACH" {
                        // ACH Bank Payment - Uses Stripe Financial Connections
                        Button(action: {
                            initiateACHPayment()
                        }) {
                            HStack {
                                if isLoadingPayment {
                                    ProgressView()
                                        .tint(.white)
                                }
                                Image(systemName: "building.columns.fill")
                                let achTotal = max(0, cartViewModel.total - discount - achDiscount)
                                Text(isLoadingPayment ? "Processing..." : "Pay with Bank • $\(String(format: "%.2f", achTotal))")
                                    .font(.headline)
                                    .foregroundColor(.white)
                            }
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(isLoadingPayment ? Color.gray : Color.blue)
                            .cornerRadius(12)
                            .shadow(radius: 5)
                        }
                        .padding()
                        .padding(.bottom, 20)
                        .disabled(addressViewModel.selectedAddress == nil || isLoadingPayment)
                    } else {
                        // Cash on Delivery - Direct order placement
                        Button(action: {
                            placeOrder()
                        }) {
                            Text("Confirm Order (Cash) • $\(String(format: "%.2f", max(0, cartViewModel.total - discount)))")
                                .font(.headline)
                                .foregroundColor(.white)
                                .frame(maxWidth: .infinity)
                                .padding()
                                .background(Theme.brandGreen)
                                .cornerRadius(12)
                                .shadow(radius: 5)
                        }
                        .padding()
                        .padding(.bottom, 20)
                        .disabled(addressViewModel.selectedAddress == nil)
                    }
                }
            }
        }
        .navigationDestination(isPresented: $showingSuccess) {
            OrderSuccessView()
        }
        // Mock payment alert removed for production - Stripe is properly integrated
        .alert(isPresented: $showingError) {
            Alert(title: Text("Error"), message: Text(errorMessage ?? "Unknown error"), dismissButton: .default(Text("OK")))
        }
        // Fee transparency detail sheet
        .sheet(isPresented: $showFeeBreakdown) {
            FeeBreakdownDetailView()
        }
        .navigationTitle("Checkout")
        .onAppear {
            addressViewModel.fetchAddresses()
        }
        .onChange(of: selectedPaymentMethod) { _, newValue in
            if newValue == "Card" && paymentSheet == nil && !isLoadingPayment {
                preparePaymentSheet()
            }
        }
    }
    
    func validateCoordinates(for address: Address) {
        // Check if coordinates are suspiciously close to the hardcoded SF values (37.7749, -122.4194)
        // AND the city is NOT San Francisco.
        let isSuspiciouslySF = abs(address.latitude - 37.7749) < 0.01 && abs(address.longitude - (-122.4194)) < 0.01
        let isActuallySF = address.city.lowercased().contains("san francisco")
        
        if isSuspiciouslySF && !isActuallySF {
            #if DEBUG
            print("[Checkout] Detected incorrect SF coordinates for \(address.city). Geocoding...")
            #endif
            let geocoder = CLGeocoder()
            let addressString = "\(address.street), \(address.city), \(address.state) \(address.zipCode)"

            geocoder.geocodeAddressString(addressString) { placemarks, error in
                if let location = placemarks?.first?.location {
                    #if DEBUG
                    print("[Checkout] Corrected coordinates: \(location.coordinate)")
                    #endif
                    self.correctedCoordinates = location.coordinate
                }
            }
        } else {
            self.correctedCoordinates = nil
        }
    }
    
    func applyPromotion() {
        guard let restaurant = cartViewModel.restaurant else { return }
        
        let db = FirebaseFirestore.Firestore.firestore()
        db.collection("promotions")
            .whereField("code", isEqualTo: promotionCode.uppercased())
            .whereField("restaurantId", isEqualTo: restaurant.id ?? "")
            .whereField("isActive", isEqualTo: true)
            .getDocuments { snapshot, error in
                guard let document = snapshot?.documents.first,
                      let promotion = try? document.data(as: Promotion.self) else {
                    errorMessage = "Invalid promo code"
                    showingError = true
                    return
                }
                
                let subtotal = cartViewModel.total
                
                // Validate minimum order
                if subtotal < promotion.minimumOrder {
                    errorMessage = "Minimum order of $\(String(format: "%.2f", promotion.minimumOrder)) required"
                    showingError = true
                    return
                }
                
                // Calculate discount
                if promotion.discountType == "percentage" {
                    let percentDiscount = subtotal * (promotion.discountValue / 100.0)
                    if let maxDiscount = promotion.maxDiscount {
                        discount = min(percentDiscount, maxDiscount)
                    } else {
                        discount = percentDiscount
                    }
                } else {
                    discount = promotion.discountValue
                }
                
                appliedPromoCode = promotionCode.uppercased()
            }
    }
    
    func preparePaymentSheet() {
        guard selectedPaymentMethod == "Card" else { return }

        isLoadingPayment = true
        let finalTotal = cartViewModel.total - discount

        PaymentService.shared.fetchPaymentSheetKeys(amount: max(0, finalTotal)) { result in
            DispatchQueue.main.async {
                self.isLoadingPayment = false
                switch result {
                case .success(let keys):
                    STPAPIClient.shared.publishableKey = keys.publishableKey

                    var configuration = PaymentSheet.Configuration()
                    configuration.merchantDisplayName = "Dollor"
                    if let customerId = keys.customer, let ephemeralKey = keys.ephemeralKey {
                        configuration.customer = .init(id: customerId, ephemeralKeySecret: ephemeralKey)
                    }
                    configuration.allowsDelayedPaymentMethods = false

                    self.paymentSheet = PaymentSheet(paymentIntentClientSecret: keys.paymentIntent, configuration: configuration)
                    self.stripePaymentReady = true

                case .failure(let error):
                    self.errorMessage = "Failed to initialize payment: \(error.localizedDescription)"
                    self.showingError = true
                }
            }
        }
    }

    func onPaymentCompletion(result: PaymentSheetResult) {
        self.paymentResult = result
        switch result {
        case .completed:
            placeOrder()
        case .canceled:
            break
        case .failed(let error):
            errorMessage = "Payment failed: \(error.localizedDescription)"
            showingError = true
        }
    }

    /// Initiate ACH bank payment using Stripe Financial Connections
    func initiateACHPayment() {
        isLoadingPayment = true
        let finalTotal = cartViewModel.total - discount - achDiscount
        let amountCents = Int(max(0, finalTotal) * 100)

        // Get customer email for the payment (stored in UserDefaults - non-sensitive)
        let customerEmail = UserDefaults.standard.string(forKey: "p2p_customer_email") ?? UserDefaults.standard.string(forKey: "customer_email") ?? ""

        ACHPaymentService.shared.presentACHPaymentSheet(
            amountCents: amountCents,
            customerEmail: customerEmail
        ) { [self] result in
            isLoadingPayment = false
            switch result {
            case .success:
                // ACH payment successful, place the order
                placeOrder()
            case .failure(let error):
                if case ACHPaymentService.PaymentError.canceled = error {
                    // User canceled, not an error
                } else {
                    errorMessage = "Bank payment failed: \(error.localizedDescription)"
                    showingError = true
                }
            }
        }
    }

    func placeOrder() {
        guard let address = addressViewModel.selectedAddress else {
            errorMessage = "Please select a delivery address"
            showingError = true
            return
        }
        
        // Helper to proceed with order placement
        func proceed(lat: Double, long: Double) {
            let deliveryAddress = DeliveryAddress(
                fullAddress: "\(address.street), \(address.unit.isEmpty ? "" : address.unit + ", ")\(address.city), \(address.state) \(address.zipCode)",
                street: address.street,
                city: address.city,
                state: address.state,
                zipCode: address.zipCode,
                latitude: lat,
                longitude: long,
                landmark: address.instructions
            )
            
            cartViewModel.placeOrder(deliveryAddress: deliveryAddress) { success, error in
                if success {
                    showingSuccess = true
                } else {
                    errorMessage = error ?? "Failed to place order. Check console for details."
                    showingError = true
                }
            }
        }
        
        // Use corrected coordinates if available, otherwise use address coordinates
        if let corrected = correctedCoordinates {
            proceed(lat: corrected.latitude, long: corrected.longitude)
        } else if address.latitude != 0 && address.longitude != 0 {
            proceed(lat: address.latitude, long: address.longitude)
        } else {
            // Geocode now
            let geocoder = CLGeocoder()
            let addressString = "\(address.street), \(address.city), \(address.state) \(address.zipCode)"

            geocoder.geocodeAddressString(addressString) { placemarks, error in
                if let location = placemarks?.first?.location {
                    proceed(lat: location.coordinate.latitude, long: location.coordinate.longitude)
                } else {
                    self.errorMessage = "Could not verify address location. Please check your address details."
                    self.showingError = true
                }
            }
        }
    }
}

struct AddressSelectionCard: View {
    let address: Address
    let isSelected: Bool
    
    var body: some View {
        VStack(alignment: .leading, spacing: 5) {
            HStack {
                Image(systemName: address.locationName == "Work" ? "briefcase.fill" : "house.fill")
                    .foregroundColor(isSelected ? .white : Theme.brandOrange)
                Text(address.locationName)
                    .fontWeight(.bold)
                    .foregroundColor(isSelected ? .white : Theme.brandBlack)
            }
            Text("\(address.street)")
                .font(.caption)
                .foregroundColor(isSelected ? .white.opacity(0.8) : Theme.textGrey)
            Text("\(address.city), \(address.state) \(address.zipCode)")
                .font(.caption)
                .foregroundColor(isSelected ? .white.opacity(0.8) : Theme.textGrey)
        }
        .padding()
        .frame(width: 150, height: 100)
        .background(isSelected ? Theme.brandGreen : Color.white)
        .cornerRadius(12)
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(isSelected ? Color.clear : Color.gray.opacity(0.2), lineWidth: 1)
        )
        .shadow(color: Color.black.opacity(0.05), radius: 5, x: 0, y: 2)
    }
}

struct PaymentOptionRow: View {
    let title: String
    let icon: String
    let isSelected: Bool

    var body: some View {
        HStack {
            Image(systemName: icon)
                .foregroundColor(Theme.brandBlack)
                .frame(width: 30)
            Text(title)
                .foregroundColor(Theme.brandBlack)
            Spacer()
            if isSelected {
                Image(systemName: "checkmark.circle.fill")
                    .foregroundColor(Theme.brandGreen)
            } else {
                Image(systemName: "circle")
                    .foregroundColor(.gray)
            }
        }
        .padding()
    }
}

// MARK: - Money Flow Chip (Fee Transparency)
/// Visual chip showing where customer's money goes
struct MoneyFlowChip: View {
    let label: String
    let amount: Double
    let color: Color

    var body: some View {
        VStack(spacing: 2) {
            Text(label)
                .font(.caption2)
                .foregroundColor(.white)
            Text("$\(String(format: "%.2f", amount))")
                .font(.caption)
                .fontWeight(.bold)
                .foregroundColor(.white)
        }
        .padding(.horizontal, 8)
        .padding(.vertical, 6)
        .background(color.opacity(0.8))
        .cornerRadius(8)
    }
}

// MARK: - Fee Breakdown Detail View
/// Full explanation of all fees for customer education
struct FeeBreakdownDetailView: View {
    @Environment(\.dismiss) var dismiss

    var body: some View {
        NavigationView {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    // Header
                    VStack(alignment: .center, spacing: 8) {
                        Image(systemName: "chart.pie.fill")
                            .font(.largeTitle)
                            .foregroundColor(Theme.brandGreen)
                        Text("Fee Transparency")
                            .font(.title2)
                            .fontWeight(.bold)
                        Text("Every penny accounted for")
                            .font(.subheadline)
                            .foregroundColor(.gray)
                    }
                    .frame(maxWidth: .infinity)
                    .padding()

                    // Food Cost
                    FeeExplanationCard(
                        icon: "fork.knife",
                        title: "Food Cost",
                        recipient: "100% to Restaurant",
                        recipientColor: .green,
                        explanation: "The full menu price goes directly to the restaurant. We charge restaurants ZERO commission - unlike DoorDash (25%) or Uber Eats (30%)."
                    )

                    // Delivery Fee
                    FeeExplanationCard(
                        icon: "car.fill",
                        title: "Delivery Fee",
                        recipient: "100% to Driver",
                        recipientColor: .blue,
                        explanation: "Base $\(String(format: "%.2f", AppConfig.shared.baseDeliveryFee)) + $\(String(format: "%.2f", AppConfig.shared.perMileDeliveryFee))/mile after 2 miles. This entire amount goes to your driver for picking up and delivering your food."
                    )

                    // Driver Tip
                    FeeExplanationCard(
                        icon: "heart.fill",
                        title: "Driver Tip",
                        recipient: "100% to Driver",
                        recipientColor: .green,
                        explanation: "We NEVER take a cut of tips. 100% of what you tip goes directly to your driver - every single penny."
                    )

                    // Taxes
                    FeeExplanationCard(
                        icon: "building.columns.fill",
                        title: "Taxes",
                        recipient: "Government",
                        recipientColor: .gray,
                        explanation: "Sales taxes are required by law and vary by location. In California: State (7.25%) + City (1.25%) + District (1%). We itemize every tax so you know exactly what goes where."
                    )

                    // Platform Fee - FLAT $1 for food
                    FeeExplanationCard(
                        icon: "app.connected.to.app.below.fill",
                        title: "Platform Fee ($\(String(format: "%.0f", AppConfig.shared.foodCustomerFee)))",
                        recipient: "Dollor.ai",
                        recipientColor: .orange,
                        explanation: "This is how we make money - a simple flat $\(String(format: "%.0f", AppConfig.shared.foodCustomerFee)) matchmaking fee per restaurant.\n\nNo hidden fees, no inflated prices. Competitors charge 15-30% commission!"
                    )

                    // Processing Fee
                    FeeExplanationCard(
                        icon: "creditcard.fill",
                        title: "Processing Fee (2.9% + $0.30)",
                        recipient: "Stripe",
                        recipientColor: .purple,
                        explanation: "Payment processing costs charged by Stripe. We pass this through at exact cost with ZERO markup. This is the industry standard rate."
                    )

                    // Our Promise
                    VStack(alignment: .leading, spacing: 12) {
                        Text("OUR TRANSPARENCY PROMISE")
                            .font(.caption)
                            .fontWeight(.bold)
                            .foregroundColor(Theme.textGrey)

                        VStack(alignment: .leading, spacing: 8) {
                            PromiseRow(icon: "checkmark.circle.fill", text: "No hidden fees in menu prices")
                            PromiseRow(icon: "checkmark.circle.fill", text: "100% of tips go to drivers")
                            PromiseRow(icon: "checkmark.circle.fill", text: "$\(String(format: "%.0f", AppConfig.shared.foodRestaurantFee)) flat fee to restaurants (vs 30% competitors)")
                            PromiseRow(icon: "checkmark.circle.fill", text: "Simple $\(String(format: "%.0f", AppConfig.shared.foodCustomerFee)) platform fee per restaurant")
                            PromiseRow(icon: "checkmark.circle.fill", text: "All fees clearly itemized")
                        }
                        .padding()
                        .background(Color.green.opacity(0.1))
                        .cornerRadius(12)
                    }
                    .padding(.horizontal)
                }
                .padding(.bottom, 40)
            }
            .navigationTitle("How Fees Work")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") { dismiss() }
                }
            }
        }
    }
}

struct FeeExplanationCard: View {
    let icon: String
    let title: String
    let recipient: String
    let recipientColor: Color
    let explanation: String

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Image(systemName: icon)
                    .foregroundColor(Theme.brandOrange)
                Text(title)
                    .fontWeight(.semibold)
                Spacer()
                Text(recipient)
                    .font(.caption)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(recipientColor.opacity(0.2))
                    .foregroundColor(recipientColor)
                    .cornerRadius(12)
            }
            Text(explanation)
                .font(.caption)
                .foregroundColor(.gray)
        }
        .padding()
        .background(Color.white)
        .cornerRadius(12)
        .shadow(color: Color.black.opacity(0.05), radius: 5, x: 0, y: 2)
        .padding(.horizontal)
    }
}

struct PromiseRow: View {
    let icon: String
    let text: String

    var body: some View {
        HStack {
            Image(systemName: icon)
                .foregroundColor(.green)
            Text(text)
                .font(.subheadline)
        }
    }
}
