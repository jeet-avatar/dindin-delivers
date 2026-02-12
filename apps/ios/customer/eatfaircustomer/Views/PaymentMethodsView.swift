import os

private let logger = Logger(subsystem: "com.dollorai.customer", category: "PaymentMethodsView")

import SwiftUI
import Combine
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
                Section("Card Details") {
                    TextField("Card Number", text: $cardNumber)
                        .keyboardType(.numberPad)
                        .onChange(of: cardNumber) { _, newValue in
                            cardNumber = formatCardNumber(newValue)
                        }

                    HStack {
                        TextField("MM/YY", text: $expiryDate)
                            .keyboardType(.numberPad)
                            .onChange(of: expiryDate) { _, newValue in
                                expiryDate = formatExpiryDate(newValue)
                            }

                        SecureField("CVV", text: $cvv)
                            .keyboardType(.numberPad)
                    }

                    TextField("Cardholder Name", text: $cardholderName)
                        .textContentType(.name)
                        .autocapitalization(.words)
                }

                Section {
                    HStack {
                        Image(systemName: "lock.shield.fill")
                            .foregroundColor(.green)
                        Text("Your card information is securely processed by Stripe")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }

                if let error = errorMessage {
                    Section {
                        Text(error)
                            .foregroundColor(.red)
                            .font(.caption)
                    }
                }

                Section {
                    Button(action: addCard) {
                        HStack {
                            Spacer()
                            if isProcessing {
                                ProgressView()
                                    .progressViewStyle(CircularProgressViewStyle(tint: .white))
                            } else {
                                Text("Add Card")
                                    .fontWeight(.semibold)
                            }
                            Spacer()
                        }
                    }
                    .listRowBackground(isValidCard ? Color.green : Color.gray)
                    .foregroundColor(.white)
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
        let cleanedNumber = cardNumber.replacingOccurrences(of: " ", with: "")
        return cleanedNumber.count >= 15 &&
            expiryDate.count >= 5 &&
            cvv.count >= 3 &&
            !cardholderName.isEmpty
    }

    private func formatCardNumber(_ input: String) -> String {
        let cleaned = input.filter { $0.isNumber }
        var formatted = ""
        for (index, char) in cleaned.prefix(16).enumerated() {
            if index > 0 && index % 4 == 0 {
                formatted += " "
            }
            formatted.append(char)
        }
        return formatted
    }

    private func formatExpiryDate(_ input: String) -> String {
        let cleaned = input.filter { $0.isNumber }
        if cleaned.count >= 2 {
            let month = String(cleaned.prefix(2))
            let year = String(cleaned.dropFirst(2).prefix(2))
            return year.isEmpty ? month : "\(month)/\(year)"
        }
        return cleaned
    }

    private func addCard() {
        guard let customerId = customerId else {
            errorMessage = "Please log in to add a card"
            return
        }

        isProcessing = true
        errorMessage = nil

        // Parse card details
        let cleanedNumber = cardNumber.replacingOccurrences(of: " ", with: "")
        let expiryParts = expiryDate.split(separator: "/")
        let expMonth = Int(expiryParts.first ?? "01") ?? 1
        let expYear = Int(expiryParts.last ?? "25") ?? 25

        // Create card via backend (which creates Stripe SetupIntent)
        apiService.createCard(
            customerId: customerId,
            cardNumber: cleanedNumber,
            expMonth: expMonth,
            expYear: 2000 + expYear,
            cvc: cvv,
            cardholderName: cardholderName
        ) { [self] result in
            DispatchQueue.main.async {
                self.isProcessing = false

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
