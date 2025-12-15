import SwiftUI
import Combine
import PhotosUI
import FirebaseAuth
import FirebaseFirestore
import FirebaseStorage
import EatFairShared

/// Restaurant Documents Management - Self-service document upload for P2P verification
struct RestaurantDocumentsView: View {
    @StateObject private var viewModel = RestaurantDocumentsViewModel()
    @State private var selectedSection: DocumentSection?

    enum DocumentSection: String, CaseIterable {
        case businessLicense = "Business License"
        case taxId = "Tax ID (EIN)"
        case foodHandler = "Food Handler Certificate"
        case healthPermit = "Health Permit"
        case bankAccount = "Bank Account"
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    // Progress Header
                    documentProgressHeader

                    // Status Banner
                    if let status = viewModel.documents?.approvalStatus {
                        statusBanner(status: status)
                    }

                    // Document Sections
                    VStack(spacing: 16) {
                        ForEach(DocumentSection.allCases, id: \.self) { section in
                            documentCard(for: section)
                        }
                    }
                    .padding(.horizontal)

                    // Submit Button
                    if viewModel.canSubmit {
                        submitForReviewButton
                    }

                    Spacer(minLength: 100)
                }
            }
            .navigationTitle("Business Documents")
            .navigationBarTitleDisplayMode(.large)
            .sheet(item: $selectedSection) { section in
                documentDetailSheet(for: section)
            }
            .onAppear {
                viewModel.fetchDocuments()
            }
            .overlay {
                if viewModel.isLoading {
                    ProgressView("Loading...")
                        .padding()
                        .background(.ultraThinMaterial)
                        .cornerRadius(10)
                }
            }
        }
    }

    // MARK: - Progress Header

    private var documentProgressHeader: some View {
        VStack(spacing: 12) {
            HStack {
                Text("Document Verification")
                    .font(.headline)
                Spacer()
                Text("\(viewModel.documents?.completionPercentage ?? 0)% Complete")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
            }

            ProgressView(value: Double(viewModel.documents?.completionPercentage ?? 0), total: 100)
                .tint(progressColor)

            if viewModel.documents?.hasExpiringDocuments == true {
                HStack {
                    Image(systemName: "exclamationmark.triangle.fill")
                        .foregroundColor(.orange)
                    Text("Some documents are expiring soon")
                        .font(.caption)
                        .foregroundColor(.orange)
                    Spacer()
                }
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(color: .black.opacity(0.05), radius: 5)
        .padding(.horizontal)
    }

    private var progressColor: Color {
        let percentage = viewModel.documents?.completionPercentage ?? 0
        if percentage < 50 { return .red }
        if percentage < 100 { return .orange }
        return .green
    }

    // MARK: - Status Banner

    private func statusBanner(status: String) -> some View {
        HStack {
            Image(systemName: statusIcon(for: status))
            Text(statusText(for: status))
                .font(.subheadline)
                .fontWeight(.medium)
            Spacer()
        }
        .padding()
        .background(statusColor(for: status).opacity(0.15))
        .foregroundColor(statusColor(for: status))
        .cornerRadius(10)
        .padding(.horizontal)
    }

    private func statusIcon(for status: String) -> String {
        switch status {
        case "approved": return "checkmark.seal.fill"
        case "pending": return "clock.fill"
        case "rejected": return "xmark.circle.fill"
        default: return "doc.badge.ellipsis"
        }
    }

    private func statusText(for status: String) -> String {
        switch status {
        case "approved": return "Your documents have been verified"
        case "pending": return "Documents are under review"
        case "rejected": return "Documents need attention - see notes below"
        default: return "Complete all documents to get verified"
        }
    }

    private func statusColor(for status: String) -> Color {
        switch status {
        case "approved": return .green
        case "pending": return .blue
        case "rejected": return .red
        default: return .gray
        }
    }

    // MARK: - Document Card

    private func documentCard(for section: DocumentSection) -> some View {
        Button {
            selectedSection = section
        } label: {
            HStack(spacing: 16) {
                // Icon
                ZStack {
                    Circle()
                        .fill(iconColor(for: section).opacity(0.15))
                        .frame(width: 50, height: 50)
                    Image(systemName: iconName(for: section))
                        .font(.title2)
                        .foregroundColor(iconColor(for: section))
                }

                // Title & Status
                VStack(alignment: .leading, spacing: 4) {
                    Text(section.rawValue)
                        .font(.headline)
                        .foregroundColor(.primary)

                    Text(documentStatus(for: section))
                        .font(.caption)
                        .foregroundColor(documentStatusColor(for: section))
                }

                Spacer()

                // Chevron or checkmark
                if isDocumentComplete(for: section) {
                    Image(systemName: "checkmark.circle.fill")
                        .foregroundColor(.green)
                        .font(.title2)
                } else {
                    Image(systemName: "chevron.right")
                        .foregroundColor(.secondary)
                }
            }
            .padding()
            .background(Color(.systemBackground))
            .cornerRadius(12)
            .shadow(color: .black.opacity(0.05), radius: 5)
        }
        .buttonStyle(.plain)
    }

    private func iconName(for section: DocumentSection) -> String {
        switch section {
        case .businessLicense: return "building.2.fill"
        case .taxId: return "doc.text.fill"
        case .foodHandler: return "fork.knife"
        case .healthPermit: return "cross.case.fill"
        case .bankAccount: return "banknote.fill"
        }
    }

    private func iconColor(for section: DocumentSection) -> Color {
        switch section {
        case .businessLicense: return .blue
        case .taxId: return .purple
        case .foodHandler: return .orange
        case .healthPermit: return .green
        case .bankAccount: return .teal
        }
    }

    private func documentStatus(for section: DocumentSection) -> String {
        let docs = viewModel.documents
        switch section {
        case .businessLicense:
            if let bl = docs?.businessLicense {
                if bl.isVerified { return "Verified ✓" }
                if bl.imageUrl != nil { return "Uploaded - Pending Review" }
            }
            return "Required"
        case .taxId:
            if let tax = docs?.taxIdentification {
                if tax.isVerified { return "Verified ✓" }
                if !tax.ein.isEmpty { return "Submitted - Pending Review" }
            }
            return "Required"
        case .foodHandler:
            if let fh = docs?.foodHandlerCertificate {
                if fh.isVerified { return "Verified ✓" }
                if fh.imageUrl != nil { return "Uploaded - Pending Review" }
            }
            return "Required"
        case .healthPermit:
            if let hp = docs?.healthPermit {
                if hp.isVerified { return "Verified ✓" }
                if hp.imageUrl != nil { return "Uploaded - Pending Review" }
            }
            return "Required"
        case .bankAccount:
            if let bank = docs?.bankAccount {
                if bank.isVerified { return "Verified ✓" }
                if !bank.accountNumber4.isEmpty { return "Added - Pending Verification" }
            }
            return "Required for Payouts"
        }
    }

    private func documentStatusColor(for section: DocumentSection) -> Color {
        let status = documentStatus(for: section)
        if status.contains("Verified") { return .green }
        if status.contains("Pending") { return .orange }
        return .secondary
    }

    private func isDocumentComplete(for section: DocumentSection) -> Bool {
        let docs = viewModel.documents
        switch section {
        case .businessLicense: return docs?.businessLicense?.imageUrl != nil
        case .taxId: return docs?.taxIdentification?.ein.isEmpty == false
        case .foodHandler: return docs?.foodHandlerCertificate?.imageUrl != nil
        case .healthPermit: return docs?.healthPermit?.imageUrl != nil
        case .bankAccount: return docs?.bankAccount?.accountNumber4.isEmpty == false
        }
    }

    // MARK: - Submit Button

    private var submitForReviewButton: some View {
        Button {
            viewModel.submitForReview()
        } label: {
            HStack {
                Image(systemName: "paperplane.fill")
                Text("Submit for Review")
            }
            .frame(maxWidth: .infinity)
            .padding()
            .background(Color.blue)
            .foregroundColor(.white)
            .cornerRadius(12)
        }
        .padding(.horizontal)
        .disabled(viewModel.isSubmitting)
    }

    // MARK: - Detail Sheet

    @ViewBuilder
    private func documentDetailSheet(for section: DocumentSection) -> some View {
        NavigationStack {
            switch section {
            case .businessLicense:
                BusinessLicenseFormView(viewModel: viewModel)
            case .taxId:
                TaxIdFormView(viewModel: viewModel)
            case .foodHandler:
                FoodHandlerFormView(viewModel: viewModel)
            case .healthPermit:
                HealthPermitFormView(viewModel: viewModel)
            case .bankAccount:
                BankAccountFormView(viewModel: viewModel)
            }
        }
    }
}

// MARK: - Document Section Extension

extension RestaurantDocumentsView.DocumentSection: Identifiable {
    var id: String { rawValue }
}

// MARK: - Business License Form

struct BusinessLicenseFormView: View {
    @ObservedObject var viewModel: RestaurantDocumentsViewModel
    @Environment(\.dismiss) var dismiss

    @State private var licenseNumber = ""
    @State private var businessName = ""
    @State private var issuingAuthority = ""
    @State private var expirationDate = Date().addingTimeInterval(365*24*60*60)
    @State private var selectedImage: UIImage?
    @State private var selectedPhotoItem: PhotosPickerItem?
    @State private var isUploading = false

    var body: some View {
        Form {
            Section("License Details") {
                TextField("License Number", text: $licenseNumber)
                TextField("Business Name", text: $businessName)
                TextField("Issuing Authority (City/County)", text: $issuingAuthority)
                DatePicker("Expiration Date", selection: $expirationDate, displayedComponents: .date)
            }

            Section("License Document") {
                VStack(alignment: .center, spacing: 12) {
                    if let image = selectedImage {
                        Image(uiImage: image)
                            .resizable()
                            .scaledToFit()
                            .frame(maxHeight: 200)
                            .cornerRadius(8)
                    } else if let existingUrl = viewModel.documents?.businessLicense?.imageUrl,
                              let url = URL(string: existingUrl) {
                        AsyncImage(url: url) { image in
                            image.resizable().scaledToFit()
                        } placeholder: {
                            ProgressView()
                        }
                        .frame(maxHeight: 200)
                        .cornerRadius(8)
                    } else {
                        documentPlaceholder
                    }

                    PhotosPicker(selection: $selectedPhotoItem, matching: .images) {
                        Label("Upload License Photo", systemImage: "doc.badge.plus")
                    }
                    .onChange(of: selectedPhotoItem) { _, newValue in
                        Task {
                            if let data = try? await newValue?.loadTransferable(type: Data.self),
                               let image = UIImage(data: data) {
                                await MainActor.run { selectedImage = image }
                            }
                        }
                    }
                }
                .frame(maxWidth: .infinity)
            }

            Section {
                Button {
                    saveBusinessLicense()
                } label: {
                    if isUploading {
                        ProgressView()
                    } else {
                        Text("Save")
                    }
                }
                .frame(maxWidth: .infinity)
                .disabled(licenseNumber.isEmpty || businessName.isEmpty || isUploading)
            }
        }
        .navigationTitle("Business License")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .cancellationAction) {
                Button("Cancel") { dismiss() }
            }
        }
        .onAppear {
            if let bl = viewModel.documents?.businessLicense {
                licenseNumber = bl.licenseNumber
                businessName = bl.businessName
                issuingAuthority = bl.issuingAuthority
                expirationDate = Date(timeIntervalSince1970: TimeInterval(bl.expirationDate / 1000))
            }
        }
    }

    private var documentPlaceholder: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 8)
                .fill(Color(.systemGray5))
                .frame(height: 150)
            VStack {
                Image(systemName: "doc.badge.plus")
                    .font(.largeTitle)
                    .foregroundColor(.secondary)
                Text("Tap to upload")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
        }
    }

    private func saveBusinessLicense() {
        isUploading = true

        let license = BusinessLicense(
            licenseNumber: licenseNumber,
            businessName: businessName,
            issuingAuthority: issuingAuthority,
            issueDate: Int64(Date().timeIntervalSince1970 * 1000),
            expirationDate: Int64(expirationDate.timeIntervalSince1970 * 1000),
            imageUrl: viewModel.documents?.businessLicense?.imageUrl,
            isVerified: false
        )

        if let image = selectedImage {
            viewModel.uploadDocument(image: image, type: "business_license") { url in
                var updatedLicense = license
                updatedLicense.imageUrl = url
                viewModel.saveBusinessLicense(updatedLicense)
                isUploading = false
                dismiss()
            }
        } else {
            viewModel.saveBusinessLicense(license)
            isUploading = false
            dismiss()
        }
    }
}

// MARK: - Tax ID Form

struct TaxIdFormView: View {
    @ObservedObject var viewModel: RestaurantDocumentsViewModel
    @Environment(\.dismiss) var dismiss

    @State private var ein = ""
    @State private var businessType = "llc"
    @State private var selectedImage: UIImage?
    @State private var selectedPhotoItem: PhotosPickerItem?
    @State private var isUploading = false

    let businessTypes = [
        ("sole_proprietor", "Sole Proprietor"),
        ("llc", "LLC"),
        ("corporation", "Corporation"),
        ("partnership", "Partnership")
    ]

    var body: some View {
        Form {
            Section("Tax Information") {
                TextField("EIN (XX-XXXXXXX)", text: $ein)
                    .keyboardType(.numberPad)

                Picker("Business Type", selection: $businessType) {
                    ForEach(businessTypes, id: \.0) { type in
                        Text(type.1).tag(type.0)
                    }
                }
            }

            Section("W-9 Form (Optional)") {
                VStack(alignment: .center, spacing: 12) {
                    if let image = selectedImage {
                        Image(uiImage: image)
                            .resizable()
                            .scaledToFit()
                            .frame(maxHeight: 200)
                            .cornerRadius(8)
                    }

                    PhotosPicker(selection: $selectedPhotoItem, matching: .images) {
                        Label("Upload W-9", systemImage: "doc.badge.plus")
                    }
                    .onChange(of: selectedPhotoItem) { _, newValue in
                        Task {
                            if let data = try? await newValue?.loadTransferable(type: Data.self),
                               let image = UIImage(data: data) {
                                await MainActor.run { selectedImage = image }
                            }
                        }
                    }
                }
                .frame(maxWidth: .infinity)
            }

            Section {
                Button {
                    saveTaxId()
                } label: {
                    if isUploading {
                        ProgressView()
                    } else {
                        Text("Save")
                    }
                }
                .frame(maxWidth: .infinity)
                .disabled(ein.isEmpty || isUploading)
            }
        }
        .navigationTitle("Tax ID (EIN)")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .cancellationAction) {
                Button("Cancel") { dismiss() }
            }
        }
        .onAppear {
            if let tax = viewModel.documents?.taxIdentification {
                ein = tax.ein
                businessType = tax.businessType
            }
        }
    }

    private func saveTaxId() {
        isUploading = true
        let ein4 = String(ein.suffix(4))

        let taxId = TaxIdentification(
            ein: ein,
            ein4: ein4,
            businessType: businessType,
            w9ImageUrl: viewModel.documents?.taxIdentification?.w9ImageUrl,
            isVerified: false
        )

        if let image = selectedImage {
            viewModel.uploadDocument(image: image, type: "w9_form") { url in
                var updatedTax = taxId
                updatedTax.w9ImageUrl = url
                viewModel.saveTaxIdentification(updatedTax)
                isUploading = false
                dismiss()
            }
        } else {
            viewModel.saveTaxIdentification(taxId)
            isUploading = false
            dismiss()
        }
    }
}

// MARK: - Food Handler Form

struct FoodHandlerFormView: View {
    @ObservedObject var viewModel: RestaurantDocumentsViewModel
    @Environment(\.dismiss) var dismiss

    @State private var certificateNumber = ""
    @State private var holderName = ""
    @State private var issuingOrganization = ""
    @State private var expirationDate = Date().addingTimeInterval(2*365*24*60*60)
    @State private var selectedImage: UIImage?
    @State private var selectedPhotoItem: PhotosPickerItem?
    @State private var isUploading = false

    var body: some View {
        Form {
            Section("Certificate Details") {
                TextField("Certificate Number", text: $certificateNumber)
                TextField("Certificate Holder Name", text: $holderName)
                TextField("Issuing Organization (ServSafe, etc.)", text: $issuingOrganization)
                DatePicker("Expiration Date", selection: $expirationDate, displayedComponents: .date)
            }

            Section("Certificate Photo") {
                VStack(alignment: .center, spacing: 12) {
                    if let image = selectedImage {
                        Image(uiImage: image)
                            .resizable()
                            .scaledToFit()
                            .frame(maxHeight: 200)
                            .cornerRadius(8)
                    } else if let existingUrl = viewModel.documents?.foodHandlerCertificate?.imageUrl,
                              let url = URL(string: existingUrl) {
                        AsyncImage(url: url) { image in
                            image.resizable().scaledToFit()
                        } placeholder: {
                            ProgressView()
                        }
                        .frame(maxHeight: 200)
                        .cornerRadius(8)
                    }

                    PhotosPicker(selection: $selectedPhotoItem, matching: .images) {
                        Label("Upload Certificate", systemImage: "doc.badge.plus")
                    }
                    .onChange(of: selectedPhotoItem) { _, newValue in
                        Task {
                            if let data = try? await newValue?.loadTransferable(type: Data.self),
                               let image = UIImage(data: data) {
                                await MainActor.run { selectedImage = image }
                            }
                        }
                    }
                }
                .frame(maxWidth: .infinity)
            }

            Section {
                Button {
                    saveFoodHandler()
                } label: {
                    if isUploading {
                        ProgressView()
                    } else {
                        Text("Save")
                    }
                }
                .frame(maxWidth: .infinity)
                .disabled(certificateNumber.isEmpty || holderName.isEmpty || isUploading)
            }
        }
        .navigationTitle("Food Handler Certificate")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .cancellationAction) {
                Button("Cancel") { dismiss() }
            }
        }
        .onAppear {
            if let fh = viewModel.documents?.foodHandlerCertificate {
                certificateNumber = fh.certificateNumber
                holderName = fh.holderName
                issuingOrganization = fh.issuingOrganization
                expirationDate = Date(timeIntervalSince1970: TimeInterval(fh.expirationDate / 1000))
            }
        }
    }

    private func saveFoodHandler() {
        isUploading = true

        let cert = FoodHandlerCertificate(
            certificateNumber: certificateNumber,
            holderName: holderName,
            issuingOrganization: issuingOrganization,
            issueDate: Int64(Date().timeIntervalSince1970 * 1000),
            expirationDate: Int64(expirationDate.timeIntervalSince1970 * 1000),
            imageUrl: viewModel.documents?.foodHandlerCertificate?.imageUrl,
            isVerified: false
        )

        if let image = selectedImage {
            viewModel.uploadDocument(image: image, type: "food_handler") { url in
                var updatedCert = cert
                updatedCert.imageUrl = url
                viewModel.saveFoodHandlerCertificate(updatedCert)
                isUploading = false
                dismiss()
            }
        } else {
            viewModel.saveFoodHandlerCertificate(cert)
            isUploading = false
            dismiss()
        }
    }
}

// MARK: - Health Permit Form

struct HealthPermitFormView: View {
    @ObservedObject var viewModel: RestaurantDocumentsViewModel
    @Environment(\.dismiss) var dismiss

    @State private var permitNumber = ""
    @State private var issuingDepartment = ""
    @State private var expirationDate = Date().addingTimeInterval(365*24*60*60)
    @State private var selectedImage: UIImage?
    @State private var selectedPhotoItem: PhotosPickerItem?
    @State private var isUploading = false

    var body: some View {
        Form {
            Section("Permit Details") {
                TextField("Permit Number", text: $permitNumber)
                TextField("Health Department", text: $issuingDepartment)
                DatePicker("Expiration Date", selection: $expirationDate, displayedComponents: .date)
            }

            Section("Permit Photo") {
                VStack(alignment: .center, spacing: 12) {
                    if let image = selectedImage {
                        Image(uiImage: image)
                            .resizable()
                            .scaledToFit()
                            .frame(maxHeight: 200)
                            .cornerRadius(8)
                    } else if let existingUrl = viewModel.documents?.healthPermit?.imageUrl,
                              let url = URL(string: existingUrl) {
                        AsyncImage(url: url) { image in
                            image.resizable().scaledToFit()
                        } placeholder: {
                            ProgressView()
                        }
                        .frame(maxHeight: 200)
                        .cornerRadius(8)
                    }

                    PhotosPicker(selection: $selectedPhotoItem, matching: .images) {
                        Label("Upload Permit", systemImage: "doc.badge.plus")
                    }
                    .onChange(of: selectedPhotoItem) { _, newValue in
                        Task {
                            if let data = try? await newValue?.loadTransferable(type: Data.self),
                               let image = UIImage(data: data) {
                                await MainActor.run { selectedImage = image }
                            }
                        }
                    }
                }
                .frame(maxWidth: .infinity)
            }

            Section {
                Button {
                    saveHealthPermit()
                } label: {
                    if isUploading {
                        ProgressView()
                    } else {
                        Text("Save")
                    }
                }
                .frame(maxWidth: .infinity)
                .disabled(permitNumber.isEmpty || issuingDepartment.isEmpty || isUploading)
            }
        }
        .navigationTitle("Health Permit")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .cancellationAction) {
                Button("Cancel") { dismiss() }
            }
        }
        .onAppear {
            if let hp = viewModel.documents?.healthPermit {
                permitNumber = hp.permitNumber
                issuingDepartment = hp.issuingDepartment
                expirationDate = Date(timeIntervalSince1970: TimeInterval(hp.expirationDate / 1000))
            }
        }
    }

    private func saveHealthPermit() {
        isUploading = true

        let permit = HealthPermit(
            permitNumber: permitNumber,
            issuingDepartment: issuingDepartment,
            issueDate: Int64(Date().timeIntervalSince1970 * 1000),
            expirationDate: Int64(expirationDate.timeIntervalSince1970 * 1000),
            imageUrl: viewModel.documents?.healthPermit?.imageUrl,
            isVerified: false
        )

        if let image = selectedImage {
            viewModel.uploadDocument(image: image, type: "health_permit") { url in
                var updatedPermit = permit
                updatedPermit.imageUrl = url
                viewModel.saveHealthPermit(updatedPermit)
                isUploading = false
                dismiss()
            }
        } else {
            viewModel.saveHealthPermit(permit)
            isUploading = false
            dismiss()
        }
    }
}

// MARK: - Bank Account Form

struct BankAccountFormView: View {
    @ObservedObject var viewModel: RestaurantDocumentsViewModel
    @Environment(\.dismiss) var dismiss

    @State private var bankName = ""
    @State private var accountHolderName = ""
    @State private var accountType = "checking"
    @State private var routingNumber = ""
    @State private var accountNumber = ""
    @State private var confirmAccountNumber = ""
    @State private var isSaving = false

    var body: some View {
        Form {
            Section("Bank Details") {
                TextField("Bank Name", text: $bankName)
                TextField("Account Holder Name", text: $accountHolderName)

                Picker("Account Type", selection: $accountType) {
                    Text("Checking").tag("checking")
                    Text("Savings").tag("savings")
                }
            }

            Section("Account Information") {
                TextField("Routing Number (9 digits)", text: $routingNumber)
                    .keyboardType(.numberPad)
                SecureField("Account Number", text: $accountNumber)
                    .keyboardType(.numberPad)
                SecureField("Confirm Account Number", text: $confirmAccountNumber)
                    .keyboardType(.numberPad)
            }

            Section {
                HStack {
                    Image(systemName: "lock.shield.fill")
                        .foregroundColor(.green)
                    Text("Your banking information is encrypted and secure")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }

            Section {
                Button {
                    saveBankAccount()
                } label: {
                    if isSaving {
                        ProgressView()
                    } else {
                        Text("Save Bank Account")
                    }
                }
                .frame(maxWidth: .infinity)
                .disabled(!isFormValid || isSaving)
            }
        }
        .navigationTitle("Bank Account")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .cancellationAction) {
                Button("Cancel") { dismiss() }
            }
        }
        .onAppear {
            if let bank = viewModel.documents?.bankAccount {
                bankName = bank.bankName
                accountHolderName = bank.accountHolderName
                accountType = bank.accountType
            }
        }
    }

    private var isFormValid: Bool {
        !bankName.isEmpty &&
        !accountHolderName.isEmpty &&
        routingNumber.count == 9 &&
        !accountNumber.isEmpty &&
        accountNumber == confirmAccountNumber
    }

    private func saveBankAccount() {
        isSaving = true
        let account4 = String(accountNumber.suffix(4))

        let bankAccount = RestaurantBankAccount(
            bankName: bankName,
            accountHolderName: accountHolderName,
            accountType: accountType,
            routingNumber: String(routingNumber.prefix(4)) + "•••••",
            accountNumber4: account4,
            isVerified: false
        )

        viewModel.saveBankAccount(bankAccount)
        isSaving = false
        dismiss()
    }
}

// MARK: - ViewModel

class RestaurantDocumentsViewModel: ObservableObject {
    @Published var documents: RestaurantDocuments?
    @Published var isLoading = false
    @Published var isSubmitting = false

    private let db = Firestore.firestore()
    private let storage = Storage.storage()

    var restaurantId: String? {
        Auth.auth().currentUser?.uid
    }

    var canSubmit: Bool {
        guard let docs = documents else { return false }
        return docs.completionPercentage >= 75 && docs.approvalStatus != "pending"
    }

    func fetchDocuments() {
        guard let restaurantId = restaurantId else { return }
        isLoading = true

        db.collection("restaurants").document(restaurantId).getDocument { [weak self] snapshot, error in
            DispatchQueue.main.async {
                self?.isLoading = false

                guard let data = snapshot?.data(),
                      let docsData = data["documents"] as? [String: Any] else {
                    self?.documents = RestaurantDocuments()
                    return
                }

                // Decode documents from Firestore data
                if let jsonData = try? JSONSerialization.data(withJSONObject: docsData),
                   let docs = try? JSONDecoder().decode(RestaurantDocuments.self, from: jsonData) {
                    self?.documents = docs
                } else {
                    self?.documents = RestaurantDocuments()
                }
            }
        }
    }

    func uploadDocument(image: UIImage, type: String, completion: @escaping (String?) -> Void) {
        guard let restaurantId = restaurantId,
              let imageData = image.jpegData(compressionQuality: 0.7) else {
            completion(nil)
            return
        }

        let filename = "\(type)_\(UUID().uuidString).jpg"
        let storageRef = storage.reference()
            .child("restaurants")
            .child(restaurantId)
            .child("documents")
            .child(filename)

        let metadata = StorageMetadata()
        metadata.contentType = "image/jpeg"

        storageRef.putData(imageData, metadata: metadata) { _, error in
            if error != nil {
                completion(nil)
                return
            }

            storageRef.downloadURL { url, error in
                completion(url?.absoluteString)
            }
        }
    }

    func saveBusinessLicense(_ license: BusinessLicense) {
        updateDocumentField("businessLicense", data: license)
    }

    func saveTaxIdentification(_ taxId: TaxIdentification) {
        updateDocumentField("taxIdentification", data: taxId)
    }

    func saveFoodHandlerCertificate(_ cert: FoodHandlerCertificate) {
        updateDocumentField("foodHandlerCertificate", data: cert)
    }

    func saveHealthPermit(_ permit: HealthPermit) {
        updateDocumentField("healthPermit", data: permit)
    }

    func saveBankAccount(_ account: RestaurantBankAccount) {
        updateDocumentField("bankAccount", data: account)
    }

    private func updateDocumentField<T: Encodable>(_ field: String, data: T) {
        guard let restaurantId = restaurantId else { return }

        do {
            let jsonData = try JSONEncoder().encode(data)
            if let dict = try JSONSerialization.jsonObject(with: jsonData) as? [String: Any] {
                db.collection("restaurants").document(restaurantId).updateData([
                    "documents.\(field)": dict,
                    "documents.approvalStatus": "incomplete"
                ]) { [weak self] error in
                    if error == nil {
                        self?.fetchDocuments()
                    }
                }
            }
        } catch {
            // Silently fail - encoding errors are rare
        }
    }

    func submitForReview() {
        guard let restaurantId = restaurantId else { return }
        isSubmitting = true

        db.collection("restaurants").document(restaurantId).updateData([
            "documents.approvalStatus": "pending",
            "documents.submittedAt": Int64(Date().timeIntervalSince1970 * 1000)
        ]) { [weak self] error in
            DispatchQueue.main.async {
                self?.isSubmitting = false
                if error == nil {
                    self?.fetchDocuments()
                }
            }
        }
    }
}

#Preview {
    RestaurantDocumentsView()
}
