import SwiftUI

// MARK: - Order Confirmation Status
public enum ConfirmationStep: String {
    case platformFeePaid = "Platform Fee Paid"
    case orderPlaced = "Order Placed"
    case paymentConfirmed = "Payment Confirmed by Restaurant"
    case preparing = "Preparing"
    case readyForPickup = "Ready for Pickup"
    case driverAssigned = "Driver Assigned"
    case pickedUp = "Picked Up"
    case delivered = "Delivered"
    case customerConfirmed = "Customer Confirmed Delivery"
    case driverPaid = "Driver Paid"
    case completed = "Completed"
}

// MARK: - Restaurant Payment Confirmation View
public struct RestaurantPaymentConfirmationView: View {
    @Environment(\.dismiss) private var dismiss
    @State private var amountReceived: String = ""
    @State private var selectedPaymentMethod: PaymentMethodOption = .applePay
    @State private var isSubmitting = false
    @State private var showSuccess = false
    @State private var error: String?

    public let orderId: String
    public let restaurantEmail: String
    public let expectedAmount: Double
    public let onConfirm: (() -> Void)?

    public init(orderId: String, restaurantEmail: String, expectedAmount: Double, onConfirm: (() -> Void)? = nil) {
        self.orderId = orderId
        self.restaurantEmail = restaurantEmail
        self.expectedAmount = expectedAmount
        self.onConfirm = onConfirm
    }

    public var body: some View {
        NavigationView {
            if showSuccess {
                successView
            } else {
                formView
            }
        }
    }

    private var formView: some View {
        Form {
            Section {
                VStack(spacing: 12) {
                    Image(systemName: "dollarsign.circle.fill")
                        .font(.system(size: 60))
                        .foregroundColor(.green)

                    Text("Confirm Customer Payment")
                        .font(.title2)
                        .fontWeight(.bold)

                    Text("Order #\(String(orderId.prefix(8)))")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical)
            }

            Section(header: Text("Payment Details")) {
                HStack {
                    Text("Expected Amount")
                    Spacer()
                    Text(String(format: "$%.2f", expectedAmount))
                        .fontWeight(.bold)
                        .foregroundColor(.green)
                }

                HStack {
                    Text("Amount Received")
                    Spacer()
                    TextField("0.00", text: $amountReceived)
                        .keyboardType(.decimalPad)
                        .multilineTextAlignment(.trailing)
                        .frame(width: 100)
                }

                Picker("Payment Method", selection: $selectedPaymentMethod) {
                    ForEach(PaymentMethodOption.allCases, id: \.self) { method in
                        HStack {
                            Image(systemName: method.icon)
                            Text(method.displayName)
                        }
                        .tag(method)
                    }
                }
            }

            Section(header: Text("Disclaimer")) {
                Text("By confirming, you acknowledge that you have received the payment directly from the customer. Dollor.ai does not process or hold these funds.")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }

            if let error = error {
                Section {
                    Text(error)
                        .foregroundColor(.red)
                }
            }

            Section {
                Button(action: confirmPayment) {
                    if isSubmitting {
                        ProgressView()
                            .frame(maxWidth: .infinity)
                    } else {
                        Text("Confirm Payment Received")
                            .fontWeight(.semibold)
                            .frame(maxWidth: .infinity)
                    }
                }
                .disabled(isSubmitting || amountReceived.isEmpty)
            }
        }
        .navigationTitle("Confirm Payment")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .navigationBarLeading) {
                Button("Cancel") { dismiss() }
            }
        }
    }

    private var successView: some View {
        VStack(spacing: 24) {
            Image(systemName: "checkmark.circle.fill")
                .font(.system(size: 80))
                .foregroundColor(.green)

            Text("Payment Confirmed!")
                .font(.title)
                .fontWeight(.bold)

            VStack(spacing: 8) {
                Text("Amount: \(String(format: "$%.2f", Double(amountReceived) ?? 0))")
                Text("Method: \(selectedPaymentMethod.displayName)")
            }
            .foregroundColor(.secondary)

            Text("The order will now be prepared.")
                .padding(.top)

            Button("Done") {
                onConfirm?()
                dismiss()
            }
            .buttonStyle(.borderedProminent)
        }
        .padding()
        .navigationBarBackButtonHidden()
    }

    private func confirmPayment() {
        guard let amount = Double(amountReceived) else {
            error = "Please enter a valid amount"
            return
        }

        isSubmitting = true
        error = nil

        LegalService.shared.confirmRestaurantPayment(
            orderId: orderId,
            restaurantEmail: restaurantEmail,
            amount: amount,
            paymentMethod: selectedPaymentMethod.rawValue
        ) { result in
            DispatchQueue.main.async {
                isSubmitting = false
                switch result {
                case .success:
                    showSuccess = true
                case .failure(let err):
                    error = err.localizedDescription
                }
            }
        }
    }
}

// MARK: - Customer Delivery Confirmation View
public struct CustomerDeliveryConfirmationView: View {
    @Environment(\.dismiss) private var dismiss
    @State private var rating: Int = 5
    @State private var feedback: String = ""
    @State private var isSubmitting = false
    @State private var showSuccess = false
    @State private var error: String?

    public let orderId: String
    public let customerEmail: String
    public let onConfirm: (() -> Void)?

    public init(orderId: String, customerEmail: String, onConfirm: (() -> Void)? = nil) {
        self.orderId = orderId
        self.customerEmail = customerEmail
        self.onConfirm = onConfirm
    }

    public var body: some View {
        NavigationView {
            if showSuccess {
                successView
            } else {
                formView
            }
        }
    }

    private var formView: some View {
        Form {
            Section {
                VStack(spacing: 12) {
                    Image(systemName: "bag.fill.badge.checkmark")
                        .font(.system(size: 60))
                        .foregroundColor(.green)

                    Text("Confirm Delivery")
                        .font(.title2)
                        .fontWeight(.bold)

                    Text("Order #\(String(orderId.prefix(8)))")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical)
            }

            Section(header: Text("Rate Your Experience")) {
                HStack(spacing: 12) {
                    ForEach(1...5, id: \.self) { star in
                        Button {
                            rating = star
                        } label: {
                            Image(systemName: star <= rating ? "star.fill" : "star")
                                .font(.title)
                                .foregroundColor(star <= rating ? .yellow : .gray)
                        }
                    }
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical)
            }

            Section(header: Text("Feedback (Optional)")) {
                TextEditor(text: $feedback)
                    .frame(height: 100)
            }

            Section(header: Text("Important")) {
                VStack(alignment: .leading, spacing: 8) {
                    Label("Food received in good condition", systemImage: "checkmark.circle")
                    Label("Driver was professional", systemImage: "checkmark.circle")
                    Label("Order was complete", systemImage: "checkmark.circle")
                }
                .font(.subheadline)
                .foregroundColor(.secondary)
            }

            if let error = error {
                Section {
                    Text(error)
                        .foregroundColor(.red)
                }
            }

            Section {
                Button(action: confirmDelivery) {
                    if isSubmitting {
                        ProgressView()
                            .frame(maxWidth: .infinity)
                    } else {
                        Text("Confirm Delivery Received")
                            .fontWeight(.semibold)
                            .frame(maxWidth: .infinity)
                    }
                }
                .disabled(isSubmitting)
            }
        }
        .navigationTitle("Confirm Delivery")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .navigationBarLeading) {
                Button("Cancel") { dismiss() }
            }
        }
    }

    private var successView: some View {
        VStack(spacing: 24) {
            Image(systemName: "checkmark.circle.fill")
                .font(.system(size: 80))
                .foregroundColor(.green)

            Text("Delivery Confirmed!")
                .font(.title)
                .fontWeight(.bold)

            Text("Thank you for using Dollor.ai")
                .foregroundColor(.secondary)

            if rating >= 4 {
                Text("We're glad you had a great experience!")
                    .multilineTextAlignment(.center)
            }

            Button("Done") {
                onConfirm?()
                dismiss()
            }
            .buttonStyle(.borderedProminent)
        }
        .padding()
        .navigationBarBackButtonHidden()
    }

    private func confirmDelivery() {
        isSubmitting = true
        error = nil

        LegalService.shared.confirmCustomerDelivery(
            orderId: orderId,
            customerEmail: customerEmail,
            rating: rating,
            feedback: feedback.isEmpty ? nil : feedback
        ) { result in
            DispatchQueue.main.async {
                isSubmitting = false
                switch result {
                case .success:
                    showSuccess = true
                case .failure(let err):
                    error = err.localizedDescription
                }
            }
        }
    }
}

// MARK: - Driver Payment Confirmation View
public struct DriverPaymentConfirmationView: View {
    @Environment(\.dismiss) private var dismiss
    @State private var amountReceived: String = ""
    @State private var selectedPaymentMethod: PaymentMethodOption = .venmo
    @State private var isSubmitting = false
    @State private var showSuccess = false
    @State private var error: String?

    public let orderId: String
    public let driverEmail: String
    public let expectedAmount: Double
    public let onConfirm: (() -> Void)?

    public init(orderId: String, driverEmail: String, expectedAmount: Double, onConfirm: (() -> Void)? = nil) {
        self.orderId = orderId
        self.driverEmail = driverEmail
        self.expectedAmount = expectedAmount
        self.onConfirm = onConfirm
    }

    public var body: some View {
        NavigationView {
            if showSuccess {
                successView
            } else {
                formView
            }
        }
    }

    private var formView: some View {
        Form {
            Section {
                VStack(spacing: 12) {
                    Image(systemName: "banknote.fill")
                        .font(.system(size: 60))
                        .foregroundColor(.green)

                    Text("Confirm Your Payment")
                        .font(.title2)
                        .fontWeight(.bold)

                    Text("Order #\(String(orderId.prefix(8)))")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical)
            }

            Section(header: Text("Payment from Restaurant")) {
                HStack {
                    Text("Expected Amount")
                    Spacer()
                    Text(String(format: "$%.2f", expectedAmount))
                        .fontWeight(.bold)
                        .foregroundColor(.green)
                }

                HStack {
                    Text("Amount Received")
                    Spacer()
                    TextField("0.00", text: $amountReceived)
                        .keyboardType(.decimalPad)
                        .multilineTextAlignment(.trailing)
                        .frame(width: 100)
                }

                Picker("Payment Method", selection: $selectedPaymentMethod) {
                    ForEach(PaymentMethodOption.allCases, id: \.self) { method in
                        HStack {
                            Image(systemName: method.icon)
                            Text(method.displayName)
                        }
                        .tag(method)
                    }
                }
            }

            Section(header: Text("Reminder")) {
                VStack(alignment: .leading, spacing: 8) {
                    Text("You should receive payment from the restaurant for:")
                        .font(.subheadline)
                    Text("- Delivery fee")
                    Text("- Any tips from the customer")
                }
                .font(.caption)
                .foregroundColor(.secondary)
            }

            Section(header: Text("Zero Platform Fee")) {
                HStack {
                    Image(systemName: "gift.fill")
                        .foregroundColor(.green)
                    Text("Dollor.ai charges $0 to drivers - keep 100% of your earnings!")
                        .font(.caption)
                        .foregroundColor(.green)
                }
            }

            if let error = error {
                Section {
                    Text(error)
                        .foregroundColor(.red)
                }
            }

            Section {
                Button(action: confirmPayment) {
                    if isSubmitting {
                        ProgressView()
                            .frame(maxWidth: .infinity)
                    } else {
                        Text("Confirm Payment Received")
                            .fontWeight(.semibold)
                            .frame(maxWidth: .infinity)
                    }
                }
                .disabled(isSubmitting || amountReceived.isEmpty)
            }
        }
        .navigationTitle("Confirm Payment")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .navigationBarLeading) {
                Button("Cancel") { dismiss() }
            }
        }
    }

    private var successView: some View {
        VStack(spacing: 24) {
            Image(systemName: "checkmark.circle.fill")
                .font(.system(size: 80))
                .foregroundColor(.green)

            Text("Payment Confirmed!")
                .font(.title)
                .fontWeight(.bold)

            VStack(spacing: 8) {
                Text("Amount: \(String(format: "$%.2f", Double(amountReceived) ?? 0))")
                Text("Method: \(selectedPaymentMethod.displayName)")
            }
            .foregroundColor(.secondary)

            Text("This order is now complete!")
                .padding(.top)

            Button("Done") {
                onConfirm?()
                dismiss()
            }
            .buttonStyle(.borderedProminent)
        }
        .padding()
        .navigationBarBackButtonHidden()
    }

    private func confirmPayment() {
        guard let amount = Double(amountReceived) else {
            error = "Please enter a valid amount"
            return
        }

        isSubmitting = true
        error = nil

        LegalService.shared.confirmDriverPayment(
            orderId: orderId,
            driverEmail: driverEmail,
            amount: amount,
            paymentMethod: selectedPaymentMethod.rawValue
        ) { result in
            DispatchQueue.main.async {
                isSubmitting = false
                switch result {
                case .success:
                    showSuccess = true
                case .failure(let err):
                    error = err.localizedDescription
                }
            }
        }
    }
}

// MARK: - Payment Method Options
public enum PaymentMethodOption: String, CaseIterable {
    case applePay = "apple_pay"
    case venmo = "venmo"
    case zelle = "zelle"
    case cash = "cash"
    case paypal = "paypal"
    case cardDirect = "card_direct"
    case other = "other"

    public var displayName: String {
        switch self {
        case .applePay: return "Apple Pay"
        case .venmo: return "Venmo"
        case .zelle: return "Zelle"
        case .cash: return "Cash"
        case .paypal: return "PayPal"
        case .cardDirect: return "Card (Direct)"
        case .other: return "Other"
        }
    }

    public var icon: String {
        switch self {
        case .applePay: return "applelogo"
        case .venmo: return "v.circle.fill"
        case .zelle: return "z.circle.fill"
        case .cash: return "banknote"
        case .paypal: return "p.circle.fill"
        case .cardDirect: return "creditcard"
        case .other: return "ellipsis.circle"
        }
    }
}

// MARK: - Order Status Timeline View
public struct OrderStatusTimelineView: View {
    public let confirmations: OrderConfirmations
    public let currentStatus: String

    public init(confirmations: OrderConfirmations, currentStatus: String) {
        self.confirmations = confirmations
        self.currentStatus = currentStatus
    }

    private var steps: [(String, Bool, String?)] {
        [
            ("Platform Fee Paid", confirmations.customerPlatformFeePaid, nil),
            ("Payment Confirmed", confirmations.restaurantPaymentConfirmed, confirmations.restaurantPaymentConfirmedAt),
            ("Driver Assigned", confirmations.driverAssigned, nil),
            ("Picked Up", confirmations.driverPickedUp, confirmations.driverPickedUpAt),
            ("Delivered", confirmations.driverDelivered, confirmations.driverDeliveredAt),
            ("Customer Confirmed", confirmations.customerConfirmedDelivery, confirmations.customerConfirmedAt),
            ("Driver Paid", confirmations.driverPaymentConfirmed, confirmations.driverPaymentConfirmedAt)
        ]
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            ForEach(Array(steps.enumerated()), id: \.offset) { index, step in
                HStack(alignment: .top, spacing: 12) {
                    // Status indicator
                    VStack(spacing: 0) {
                        Circle()
                            .fill(step.1 ? Color.green : Color.gray.opacity(0.3))
                            .frame(width: 24, height: 24)
                            .overlay(
                                Image(systemName: step.1 ? "checkmark" : "circle")
                                    .font(.caption2)
                                    .foregroundColor(.white)
                            )

                        if index < steps.count - 1 {
                            Rectangle()
                                .fill(step.1 ? Color.green : Color.gray.opacity(0.3))
                                .frame(width: 2, height: 30)
                        }
                    }

                    // Content
                    VStack(alignment: .leading, spacing: 2) {
                        Text(step.0)
                            .font(.subheadline)
                            .fontWeight(step.1 ? .semibold : .regular)
                            .foregroundColor(step.1 ? .primary : .secondary)

                        if let timestamp = step.2 {
                            Text(timestamp)
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                    }
                    .padding(.bottom, index < steps.count - 1 ? 12 : 0)

                    Spacer()
                }
            }
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(12)
    }
}

#Preview("Restaurant Confirmation") {
    RestaurantPaymentConfirmationView(
        orderId: "ord_12345678",
        restaurantEmail: "restaurant@example.com",
        expectedAmount: 45.99
    )
}

#Preview("Customer Confirmation") {
    CustomerDeliveryConfirmationView(
        orderId: "ord_12345678",
        customerEmail: "customer@example.com"
    )
}

#Preview("Driver Confirmation") {
    DriverPaymentConfirmationView(
        orderId: "ord_12345678",
        driverEmail: "driver@example.com",
        expectedAmount: 8.50
    )
}
