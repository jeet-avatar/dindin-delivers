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
    @State private var showMockPaymentAlert = false
    @State private var stripePaymentReady = false
    @State private var errorMessage: String?
    @State private var showingError = false
    
    @State private var correctedCoordinates: CLLocationCoordinate2D?
    
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
                        
                        // 3. Order Summary
                        VStack(alignment: .leading, spacing: 10) {
                            Text("ORDER SUMMARY")
                                .font(.caption)
                                .fontWeight(.bold)
                                .foregroundColor(Theme.textGrey)
                            
                            VStack(spacing: 10) {
                                ForEach(cartViewModel.items) { item in
                                    HStack {
                                        Text(item.name)
                                            .foregroundColor(Theme.textGrey)
                                        Spacer()
                                        Text("$\(String(format: "%.2f", item.price))")
                                    }
                                }
                                
                                if discount > 0 {
                                    HStack {
                                        Text("Discount")
                                            .foregroundColor(.green)
                                        Spacer()
                                        Text("-$\(String(format: "%.2f", discount))")
                                            .foregroundColor(.green)
                                    }
                                }
                                
                                let finalTotal = cartViewModel.total - discount
                                Divider()
                                HStack {
                                    Text("Total")
                                        .fontWeight(.bold)
                                    Spacer()
                                    Text("$\(String(format: "%.2f", max(0, finalTotal)))")
                                        .fontWeight(.bold)
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
                    } else {
                        // Cash on Delivery - Direct order placement
                        Button(action: {
                            print("Confirm Order Tapped - Cash on Delivery")
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
        .alert(isPresented: $showMockPaymentAlert) {
            Alert(
                title: Text("Mock Payment"),
                message: Text("Stripe is not linked yet. Simulating successful payment."),
                primaryButton: .default(Text("Pay"), action: {
                    placeOrder()
                }),
                secondaryButton: .cancel()
            )
        }
        .alert(isPresented: $showingError) {
            Alert(title: Text("Error"), message: Text(errorMessage ?? "Unknown error"), dismissButton: .default(Text("OK")))
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
            print("Detected incorrect SF coordinates for \(address.city). Geocoding...")
            let geocoder = CLGeocoder()
            let addressString = "\(address.street), \(address.city), \(address.state) \(address.zipCode)"
            
            geocoder.geocodeAddressString(addressString) { placemarks, error in
                if let location = placemarks?.first?.location {
                    print("Corrected coordinates: \(location.coordinate)")
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
                    configuration.merchantDisplayName = "EatFair"
                    configuration.customer = .init(id: keys.customer, ephemeralKeySecret: keys.ephemeralKey)
                    configuration.allowsDelayedPaymentMethods = false

                    self.paymentSheet = PaymentSheet(paymentIntentClientSecret: keys.paymentIntent, configuration: configuration)
                    self.stripePaymentReady = true

                case .failure(let error):
                    print("Failed to load payment sheet: \(error)")
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
            print("Payment canceled")
        case .failed(let error):
            print("Payment failed: \(error)")
            errorMessage = "Payment failed: \(error.localizedDescription)"
            showingError = true
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
            print("Coordinates missing, geocoding at checkout...")
            let geocoder = CLGeocoder()
            let addressString = "\(address.street), \(address.city), \(address.state) \(address.zipCode)"
            
            geocoder.geocodeAddressString(addressString) { placemarks, error in
                if let location = placemarks?.first?.location {
                    print("Geocoded at checkout: \(location.coordinate)")
                    proceed(lat: location.coordinate.latitude, long: location.coordinate.longitude)
                } else {
                    print("Geocoding failed at checkout: \(error?.localizedDescription ?? "Unknown")")
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
