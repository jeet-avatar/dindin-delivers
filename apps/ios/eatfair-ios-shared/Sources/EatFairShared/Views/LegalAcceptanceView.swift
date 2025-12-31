import SwiftUI

// MARK: - Legal Document Type
public enum LegalDocumentType: String, CaseIterable {
    case customerTOS = "customer_tos"
    case restaurantTOS = "restaurant_tos"
    case driverAgreement = "driver_agreement"
    case tripBoardTOS = "trip_board_tos"
    case privacyPolicy = "privacy_policy"

    public var displayName: String {
        switch self {
        case .customerTOS: return "Customer Terms of Service"
        case .restaurantTOS: return "Restaurant Terms of Service"
        case .driverAgreement: return "Driver Independent Contractor Agreement"
        case .tripBoardTOS: return "Trip Board Terms of Service"
        case .privacyPolicy: return "Privacy Policy"
        }
    }

    public var icon: String {
        switch self {
        case .customerTOS: return "person.circle"
        case .restaurantTOS: return "storefront"
        case .driverAgreement: return "car.circle"
        case .tripBoardTOS: return "car.2"
        case .privacyPolicy: return "lock.shield"
        }
    }
}

// MARK: - Legal Acceptance View
public struct LegalAcceptanceView: View {
    @Environment(\.dismiss) private var dismiss
    @State private var document: LegalDocument?
    @State private var isLoading = true
    @State private var error: String?
    @State private var hasAccepted = false
    @State private var isSubmitting = false

    public let documentType: LegalDocumentType
    public let onAccept: (() -> Void)?

    public init(documentType: LegalDocumentType, onAccept: (() -> Void)? = nil) {
        self.documentType = documentType
        self.onAccept = onAccept
    }

    public var body: some View {
        NavigationView {
            Group {
                if isLoading {
                    loadingView
                } else if let error = error {
                    errorView(error)
                } else if let doc = document {
                    documentView(doc)
                }
            }
            .navigationTitle(documentType.displayName)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
            }
        }
        .onAppear {
            loadDocument()
        }
    }

    private var loadingView: some View {
        VStack(spacing: 16) {
            ProgressView()
            Text("Loading legal document...")
                .foregroundColor(.secondary)
        }
    }

    private func errorView(_ message: String) -> some View {
        VStack(spacing: 16) {
            Image(systemName: "exclamationmark.triangle")
                .font(.largeTitle)
                .foregroundColor(.orange)
            Text("Unable to load document")
                .font(.headline)
            Text(message)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
            Button("Retry") {
                loadDocument()
            }
            .buttonStyle(.borderedProminent)
        }
        .padding()
    }

    private func documentView(_ doc: LegalDocument) -> some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                // Header
                VStack(spacing: 12) {
                    Image(systemName: documentType.icon)
                        .font(.system(size: 50))
                        .foregroundColor(.accentColor)

                    Text(doc.title)
                        .font(.title2)
                        .fontWeight(.bold)
                        .multilineTextAlignment(.center)

                    Text("Version \(doc.version) • \(doc.lastUpdated)")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical)

                // Key Points Summary
                if !doc.keyPoints.isEmpty {
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Key Points")
                            .font(.headline)

                        ForEach(doc.keyPoints, id: \.self) { point in
                            HStack(alignment: .top, spacing: 8) {
                                Image(systemName: "checkmark.circle.fill")
                                    .foregroundColor(.green)
                                Text(point)
                                    .font(.subheadline)
                            }
                        }
                    }
                    .padding()
                    .background(Color(.systemGray6))
                    .cornerRadius(12)
                }

                // Full Content
                VStack(alignment: .leading, spacing: 12) {
                    Text("Full Terms")
                        .font(.headline)

                    Text(doc.content)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                .padding()
                .background(Color(.systemGray6))
                .cornerRadius(12)

                // Acceptance Toggle
                if doc.acceptanceRequired {
                    Toggle(isOn: $hasAccepted) {
                        VStack(alignment: .leading, spacing: 4) {
                            Text("I have read and agree to these terms")
                                .fontWeight(.semibold)
                            Text("By accepting, you agree to all terms and conditions above.")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                    }
                    .toggleStyle(SwitchToggleStyle(tint: .accentColor))
                    .padding()
                    .background(Color(.systemGray6))
                    .cornerRadius(12)

                    // Accept Button
                    Button(action: acceptTerms) {
                        if isSubmitting {
                            ProgressView()
                                .tint(.white)
                        } else {
                            Text("Accept & Continue")
                                .fontWeight(.semibold)
                        }
                    }
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(hasAccepted ? Color.accentColor : Color.gray)
                    .foregroundColor(.white)
                    .cornerRadius(12)
                    .disabled(!hasAccepted || isSubmitting)
                }
            }
            .padding()
        }
    }

    private func loadDocument() {
        isLoading = true
        error = nil

        let completion: (Result<LegalDocument, Error>) -> Void = { result in
            DispatchQueue.main.async {
                isLoading = false
                switch result {
                case .success(let doc):
                    self.document = doc
                case .failure(let err):
                    self.error = err.localizedDescription
                }
            }
        }

        switch documentType {
        case .customerTOS:
            LegalService.shared.getCustomerTOS(completion: completion)
        case .restaurantTOS:
            LegalService.shared.getRestaurantTOS(completion: completion)
        case .driverAgreement:
            LegalService.shared.getDriverAgreement(completion: completion)
        case .tripBoardTOS:
            LegalService.shared.getTripBoardTOS(completion: completion)
        case .privacyPolicy:
            LegalService.shared.getPrivacyPolicy(completion: completion)
        }
    }

    private func acceptTerms() {
        guard let doc = document else { return }
        isSubmitting = true

        // Record acceptance locally
        switch documentType {
        case .customerTOS:
            LegalService.shared.recordCustomerTOSAcceptance(version: doc.version)
        case .restaurantTOS:
            LegalService.shared.recordRestaurantTOSAcceptance(version: doc.version)
        case .driverAgreement:
            LegalService.shared.recordDriverAgreementAcceptance(version: doc.version)
        case .tripBoardTOS:
            LegalService.shared.recordTripBoardTOSAcceptance(version: doc.version)
        case .privacyPolicy:
            LegalService.shared.recordPrivacyPolicyAcceptance(version: doc.version)
        }

        isSubmitting = false
        onAccept?()
        dismiss()
    }
}

// MARK: - Multi-Document Acceptance View (Onboarding)
public struct OnboardingLegalAcceptanceView: View {
    @Environment(\.dismiss) private var dismiss
    @State private var acceptedDocuments: Set<LegalDocumentType> = []
    @State private var showDocument: LegalDocumentType?

    public let requiredDocuments: [LegalDocumentType]
    public let onComplete: (() -> Void)?

    public init(requiredDocuments: [LegalDocumentType], onComplete: (() -> Void)? = nil) {
        self.requiredDocuments = requiredDocuments
        self.onComplete = onComplete
    }

    private var allAccepted: Bool {
        requiredDocuments.allSatisfy { acceptedDocuments.contains($0) }
    }

    public var body: some View {
        NavigationView {
            VStack(spacing: 24) {
                // Header
                VStack(spacing: 12) {
                    Image(systemName: "doc.text.magnifyingglass")
                        .font(.system(size: 60))
                        .foregroundColor(.accentColor)

                    Text("Review Our Terms")
                        .font(.title)
                        .fontWeight(.bold)

                    Text("Please review and accept the following documents to continue")
                        .foregroundColor(.secondary)
                        .multilineTextAlignment(.center)
                }
                .padding(.top)

                // Documents List
                VStack(spacing: 12) {
                    ForEach(requiredDocuments, id: \.rawValue) { docType in
                        documentRow(docType)
                    }
                }
                .padding(.horizontal)

                Spacer()

                // Continue Button
                Button(action: complete) {
                    Text("Continue")
                        .fontWeight(.semibold)
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(allAccepted ? Color.accentColor : Color.gray)
                        .foregroundColor(.white)
                        .cornerRadius(12)
                }
                .disabled(!allAccepted)
                .padding()
            }
            .navigationBarTitleDisplayMode(.inline)
            .sheet(item: $showDocument) { docType in
                LegalAcceptanceView(documentType: docType) {
                    acceptedDocuments.insert(docType)
                }
            }
        }
    }

    private func documentRow(_ docType: LegalDocumentType) -> some View {
        Button {
            showDocument = docType
        } label: {
            HStack {
                Image(systemName: docType.icon)
                    .font(.title2)
                    .foregroundColor(.accentColor)
                    .frame(width: 40)

                VStack(alignment: .leading, spacing: 2) {
                    Text(docType.displayName)
                        .font(.headline)
                        .foregroundColor(.primary)

                    Text(acceptedDocuments.contains(docType) ? "Accepted" : "Tap to review")
                        .font(.caption)
                        .foregroundColor(acceptedDocuments.contains(docType) ? .green : .secondary)
                }

                Spacer()

                if acceptedDocuments.contains(docType) {
                    Image(systemName: "checkmark.circle.fill")
                        .foregroundColor(.green)
                } else {
                    Image(systemName: "chevron.right")
                        .foregroundColor(.secondary)
                }
            }
            .padding()
            .background(Color(.systemGray6))
            .cornerRadius(12)
        }
    }

    private func complete() {
        onComplete?()
        dismiss()
    }
}

// Make LegalDocumentType Identifiable for sheet presentation
extension LegalDocumentType: Identifiable {
    public var id: String { rawValue }
}

#Preview("Single Document") {
    LegalAcceptanceView(documentType: .customerTOS)
}

#Preview("Onboarding") {
    OnboardingLegalAcceptanceView(
        requiredDocuments: [.customerTOS, .privacyPolicy]
    )
}
