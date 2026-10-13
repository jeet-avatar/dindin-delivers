import os

private let logger = Logger(subsystem: "com.dollorai.customer", category: "PaymentMethodsView")

import SwiftUI
import Combine
import Stripe
import EatFairShared

struct PaymentMethodsView: View {
    @StateObject private var viewModel = PaymentMethodsViewModel()
    @State private var showAddCard = false
    @State private var cardToDelete: StripeCard?
    @State private var showDeleteConfirmation = false

    var body: some View {
        ZStack {
            Theme.brandGrey.edgesIgnoringSafeArea(.all)

            VStack(spacing: 20) {
                if viewModel.isLoading {
                    ProgressView("Loading cards...")
                        .padding()
                } else if viewModel.savedCards.isEmpty {
                    // Empty state
                    VStack(spacing: 16) {
                        Image(systemName: "creditcard")
                            .font(.system(size: 50))
                            .foregroundColor(.gray)
                        Text("No saved cards")
                            .font(.headline)
                            .foregroundColor(.gray)
                        Text("Add a card to make checkout faster")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                    }
                    .padding(.top, 60)
                } else {
                    // Card List
                    ScrollView {
                        VStack(spacing: 15) {
                            ForEach(viewModel.savedCards) { card in
                                PaymentCardRow(
                                    icon: card.brand.icon,
                                    title: "\(card.brand.displayName) •••• \(card.last4)",
                                    subtitle: "Expires \(card.expiryMonth)/\(card.expiryYear)",
                                    isDefault: card.isDefault,
                                    onDelete: {
                                        cardToDelete = card
                                        showDeleteConfirmation = true
                                    },
                                    onSetDefault: {
                                        viewModel.setDefaultCard(card)
                                    }
                                )
                            }

                            // Cash option
                            PaymentCardRow(
                                icon: "banknote.fill",
                                title: "Cash on Delivery",
                                subtitle: "Pay when you receive your order",
                                isDefault: false,
                                onDelete: nil,
                                onSetDefault: nil
                            )
                        }
                        .padding()
                    }
                }

                Spacer()

                Button(action: {
                    showAddCard = true
                }) {
                    Text("Add Payment Method")
                        .fontWeight(.bold)
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Theme.brandBlack)
                        .cornerRadius(12)
                        .padding(.horizontal)
                }
                .padding(.bottom, 30)
            }
        }
        .navigationTitle("Payment Methods")
        .sheet(isPresented: $showAddCard) {
            StripeAddCardView(onCardAdded: { card in
                viewModel.savedCards.append(card)
                showAddCard = false
            })
        }
        .onAppear {
            viewModel.loadSavedCards()
        }
        .alert("Error", isPresented: .constant(viewModel.errorMessage != nil)) {
            Button("OK") { viewModel.errorMessage = nil }
        } message: {
            Text(viewModel.errorMessage ?? "")
        }
        .alert("Remove Card?", isPresented: $showDeleteConfirmation) {
            Button("Cancel", role: .cancel) {
                cardToDelete = nil
            }
            Button("Remove", role: .destructive) {
                if let card = cardToDelete {
                    viewModel.deleteCard(card)
                }
                cardToDelete = nil
            }
        } message: {
            if let card = cardToDelete {
                Text("Are you sure you want to remove \(card.brand.displayName) •••• \(card.last4)?")
            } else {
                Text("Are you sure you want to remove this card?")
            }
        }
    }
}

// MARK: - View Model for Payment Methods
class PaymentMethodsViewModel: ObservableObject {
    @Published var savedCards: [StripeCard] = []
    @Published var isLoading = false
    @Published var errorMessage: String?

    private let apiService = P2PAPIService.shared

    private var customerId: Int? {
        let id = UserDefaults.standard.integer(forKey: "p2p_customer_id")
        return id > 0 ? id : nil
    }

    deinit {
        // Clean up any resources if needed
    }

    func loadSavedCards() {
        guard let customerId = customerId else {
            savedCards = []
            return
        }

        isLoading = true

        apiService.fetchSavedCards(customerId: customerId) { [weak self] result in
            DispatchQueue.main.async {
                self?.isLoading = false

                switch result {
                case .success(let cards):
                    self?.savedCards = cards
                case .failure(let error):
                    #if DEBUG
                    logger.info("[PaymentMethods] Failed to load cards: \(error)")
                    #endif
                    self?.savedCards = []
                }
            }
        }
    }

    func deleteCard(_ card: StripeCard) {
        guard let customerId = customerId else { return }

        isLoading = true

        apiService.deleteCard(customerId: customerId, cardId: card.id) { [weak self] result in
            DispatchQueue.main.async {
                self?.isLoading = false

                switch result {
                case .success:
                    self?.savedCards.removeAll { $0.id == card.id }
                case .failure(let error):
                    let errMsg = error.localizedDescription.lowercased()
                    if errMsg.contains("default") || errMsg.contains("primary") {
                        self?.errorMessage = "Cannot delete default card. Set another card as default first."
                    } else {
                        self?.errorMessage = "Unable to delete card. Please try again."
                    }
                }
            }
        }
    }

    func setDefaultCard(_ card: StripeCard) {
        guard let customerId = customerId else { return }

        apiService.setDefaultCard(customerId: customerId, cardId: card.id) { [weak self] result in
            DispatchQueue.main.async {
                switch result {
                case .success:
                    // Update local state
                    for i in 0..<(self?.savedCards.count ?? 0) {
                        self?.savedCards[i].isDefault = (self?.savedCards[i].id == card.id)
                    }
                case .failure(let error):
                    let errMsg = error.localizedDescription.lowercased()
                    if errMsg.contains("expired") {
                        self?.errorMessage = "This card has expired. Please add a new card."
                    } else {
                        self?.errorMessage = "Unable to set default card. Please try again."
                    }
                }
            }
        }
    }
}

// MARK: - Payment Card Row
struct PaymentCardRow: View {
    let icon: String
    let title: String
    let subtitle: String
    let isDefault: Bool
    let onDelete: (() -> Void)?
    let onSetDefault: (() -> Void)?

    var body: some View {
        HStack(spacing: 15) {
            Image(systemName: icon)
                .font(.title2)
                .foregroundColor(Theme.brandBlack)
                .frame(width: 40)

            VStack(alignment: .leading) {
                HStack {
                    Text(title)
                        .font(.headline)
                    if isDefault {
                        Text("Default")
                            .font(.caption2)
                            .padding(.horizontal, 6)
                            .padding(.vertical, 2)
                            .background(Color.green.opacity(0.2))
                            .foregroundColor(.green)
                            .cornerRadius(4)
                    }
                }
                Text(subtitle)
                    .font(.caption)
                    .foregroundColor(.gray)
            }

            Spacer()

            if onDelete != nil || onSetDefault != nil {
                Menu {
                    if let setDefault = onSetDefault, !isDefault {
                        Button(action: setDefault) {
                            Label("Set as Default", systemImage: "checkmark.circle")
                        }
                    }
                    if let delete = onDelete {
                        Button(role: .destructive, action: delete) {
                            Label("Remove Card", systemImage: "trash")
                        }
                    }
                } label: {
                    Image(systemName: "ellipsis")
                        .foregroundColor(.gray)
                        .padding(8)
                }
            } else {
                Image(systemName: "chevron.right")
                    .foregroundColor(.gray)
                    .font(.caption)
            }
        }
        .padding()
        .background(Color.white)
        .cornerRadius(12)
        .shadow(color: Color.black.opacity(0.05), radius: 5, x: 0, y: 2)
    }
}

// MARK: - Stripe Add Card View (Uses SetupIntent)
struct StripeAddCardView: View {
    @Environment(\.dismiss) private var dismiss
    let onCardAdded: (StripeCard) -> Void

    @State private var cardNumber = ""
    @State private var expiryDate = ""
    @State private var cvv = ""
    @State private var cardholderName = ""
    @State private var isProcessing = false
    @State private var errorMessage: String?

    private let apiService = P2PAPIService.shared

    private var customerId: Int? {
        let id = UserDefaults.standard.integer(forKey: "p2p_customer_id")
        return id > 0 ? id : nil
    }

    var body: some View {
        NavigationStack {
            Form {
                if StripeApplePayHandler.canMakeApplePayPayments {
                    Section {
                        Button(action: payWithApplePay) {
                            HStack {
                                Spacer()
                                if isProcessingApplePay {
                                    ProgressView().progressViewStyle(CircularProgressViewStyle(tint: .white))
                                } else {
                                    Image(systemName: "apple.logo")
                                    Text("Set Up with Apple Pay").fontWeight(.semibold)
                                }
                                Spacer()
                            }
                        }
                        .listRowBackground(Color.black)
                        .foregroundColor(.white)
                        .disabled(isProcessing)
                    }

                    Section {
                        HStack {
                            Rectangle().fill(Theme.lxHairline).frame(height: 1)
                            Text("OR").font(.caption).foregroundColor(Theme.lxTextMuted)
                            Rectangle().fill(Theme.lxHairline).frame(height: 1)
                        }
                    }
                    .listRowBackground(Theme.lxBg)
                }

                Section("Card Details") {
                    FoundingCardField(params: $cardParams)
                        .frame(height: 44)
                }
                .listRowBackground(Theme.lxSurface)

                Section {
                    HStack {
                        Image(systemName: "lock.shield.fill")
                            .foregroundColor(Theme.lxSuccess)
                        Text("Your card is sent directly to Stripe — it never touches our servers")
                            .font(.caption)
                            .foregroundColor(Theme.lxTextSecondary)
                    }
                }
                .listRowBackground(Theme.lxSurface)

                if let error = errorMessage {
                    Section {
                        Text(error)
                            .foregroundColor(Theme.lxError)
                            .font(.caption)
                    }
                    .listRowBackground(Theme.lxSurface)
                }

                Section {
                    Button(action: addCard) {
                        HStack {
                            Spacer()
                            if isProcessingCard {
                                ProgressView()
                                    .progressViewStyle(CircularProgressViewStyle(tint: .white))
                            } else {
                                Text("Add Card")
                                    .fontWeight(.bold)
                            }
                            Spacer()
                        }
                    }
                    .listRowBackground(cardParams != nil ? Theme.lxOrange : Theme.lxSurface2)
                    .foregroundColor(.white)
                    .disabled(cardParams == nil || isProcessing)
                }
            }
            .scrollContentBackground(.hidden)
            .background(Theme.lxBg.ignoresSafeArea())
            .navigationTitle("Add Payment Method")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") { dismiss() }
                        .foregroundColor(Theme.lxOrange)
                }
            }
        }
        .preferredColorScheme(.dark)
    }

    private func addCard() {
        guard let customerId = customerId, let params = cardParams else {
            errorMessage = "Please log in to add a card"
            return
        }

        isProcessingCard = true
        errorMessage = nil

        STPAPIClient.shared.createPaymentMethod(with: params) { paymentMethod, error in
            if let error = error {
                DispatchQueue.main.async {
                    self.isProcessingCard = false
                    self.errorMessage = error.localizedDescription
                }
                return
            }
            guard let paymentMethod = paymentMethod else {
                DispatchQueue.main.async {
                    self.isProcessingCard = false
                    self.errorMessage = "Could not process your card. Please try again."
                }
                return
            }
            apiService.attachPaymentMethod(customerId: customerId, paymentMethodId: paymentMethod.stripeId) { result in
                DispatchQueue.main.async {
                    self.isProcessingCard = false
                    switch result {
                    case .success(let card):
                        self.onCardAdded(card)
                    case .failure(let error):
                        let errMsg = error.localizedDescription.lowercased()
                        if errMsg.contains("invalid") || errMsg.contains("declined") {
                            self.errorMessage = "Card was declined. Please check card details."
                        } else if errMsg.contains("duplicate") || errMsg.contains("exists") {
                            self.errorMessage = "This card is already saved."
                        } else {
                            self.errorMessage = "Unable to add card. Please try again."
                        }
                    }
                }
            }
        }
    }

    private func payWithApplePay() {
        guard let customerId = customerId else {
            errorMessage = "Please log in to continue"
            return
        }

        isProcessingApplePay = true
        errorMessage = nil

        apiService.createSetupIntent(customerId: customerId) { result in
            switch result {
            case .failure(let error):
                DispatchQueue.main.async {
                    self.isProcessingApplePay = false
                    self.errorMessage = error.localizedDescription
                }
            case .success(let setup):
                if !setup.publishableKey.isEmpty {
                    STPAPIClient.shared.publishableKey = setup.publishableKey
                }
                let request = StripeApplePayHandler.makePaymentRequest(
                    summaryItemLabel: "Dollor.ai — Save Payment Method"
                )
                StripeApplePayHandler.shared.handleApplePay(request: request, clientSecret: setup.clientSecret) { success, error in
                    DispatchQueue.main.async {
                        self.isProcessingApplePay = false
                        if success {
                            // Stripe already attached the resulting payment method to this
                            // customer (the SetupIntent carries `customer`); fetch it as the
                            // newly-added card so the UI can show it immediately.
                            self.apiService.fetchSavedCards(customerId: customerId) { cardsResult in
                                if case .success(let cards) = cardsResult, let newest = cards.last {
                                    self.onCardAdded(newest)
                                } else {
                                    self.dismiss()
                                }
                            }
                        } else if let error = error {
                            let nsError = error as NSError
                            // Code 2 is STPApplePayContext's user-cancelled case — not a real error.
                            if nsError.code != 2 {
                                self.errorMessage = error.localizedDescription
                            }
                        }
                    }
                }
            }
        }
    }
}
