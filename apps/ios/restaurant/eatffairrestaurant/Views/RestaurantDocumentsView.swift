import SwiftUI
import Combine
import PhotosUI
import EatFairShared
import os

private let logger = Logger(subsystem: "com.dollorai.restaurant", category: "RestaurantDocumentsView")

/// Restaurant Documents Management - Self-service document upload for P2P verification
/// Uses P2P Backend API for document storage (saves to PostgreSQL database)
struct RestaurantDocumentsView: View {
    @StateObject private var viewModel = RestaurantDocumentsViewModel()
    @State private var selectedSection: DocumentSection?

    /// Document types aligned with ZIP registration form and backend API
    /// Required for vendor approval: food_license, health_permit, w9_form, insurance
    enum DocumentSection: String, CaseIterable {
        case foodLicense = "Food Service License"
        case healthPermit = "Health Department Permit"
        case businessLicenseW9 = "Business License / W-9"
        case liabilityInsurance = "Liability Insurance"
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    // Progress Header
                    documentProgressHeader

                    // Status Banner
                    if !viewModel.approvalStatus.isEmpty {
                        statusBanner(status: viewModel.approvalStatus)
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
        VStack(spacing: 16) {
            HStack(spacing: 16) {
                // Circular progress ring
                ZStack {
                    Circle()
                        .stroke(Color(.systemGray4), lineWidth: 6)
                        .frame(width: 64, height: 64)
                    Circle()
                        .trim(from: 0, to: Double(viewModel.completionPercentage) / 100.0)
                        .stroke(progressColor, style: StrokeStyle(lineWidth: 6, lineCap: .round))
                        .frame(width: 64, height: 64)
                        .rotationEffect(.degrees(-90))
                    Text("\(viewModel.completionPercentage)%")
                        .font(.system(.headline, design: .rounded).bold())
                        .foregroundColor(progressColor)
                }

                VStack(alignment: .leading, spacing: 4) {
                    Text("Document Verification")
                        .font(.headline)
                    Text("\(viewModel.uploadedCount) of \(viewModel.requiredCount) documents uploaded")
                        .font(.subheadline)
                        .foregroundColor(.secondary)

                    if viewModel.hasPendingDocuments {
                        HStack(spacing: 4) {
                            Image(systemName: "clock.fill")
                                .font(.caption2)
                            Text("Under review")
                                .font(.caption)
                        }
                        .foregroundColor(.blue)
                    }
                }
                Spacer()
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(16)
        .shadow(color: .black.opacity(0.05), radius: 6, y: 2)
        .padding(.horizontal)
    }

    private var progressColor: Color {
        let percentage = viewModel.completionPercentage
        if percentage < 50 { return .red }
        if percentage < 100 { return .orange }
        return .green
    }

    // MARK: - Status Banner

    private func statusBanner(status: String) -> some View {
        HStack(spacing: 12) {
            Image(systemName: statusIcon(for: status))
                .font(.title3)
                .frame(width: 36, height: 36)
                .background(statusColor(for: status).opacity(0.2))
                .clipShape(Circle())
            VStack(alignment: .leading, spacing: 2) {
                Text(statusTitle(for: status))
                    .font(.subheadline.bold())
                Text(statusText(for: status))
                    .font(.caption)
                    .opacity(0.85)
            }
            Spacer()
        }
        .padding()
        .background(statusColor(for: status).opacity(0.1))
        .foregroundColor(statusColor(for: status))
        .cornerRadius(12)
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(statusColor(for: status).opacity(0.3), lineWidth: 1)
        )
        .padding(.horizontal)
    }

    private func statusTitle(for status: String) -> String {
        switch status {
        case "approved": return "Verified"
        case "pending": return "Under Review"
        case "rejected": return "Action Required"
        default: return "Incomplete"
        }
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
            HStack(spacing: 14) {
                // Icon
                ZStack {
                    RoundedRectangle(cornerRadius: 12)
                        .fill(iconColor(for: section).opacity(0.12))
                        .frame(width: 48, height: 48)
                    Image(systemName: iconName(for: section))
                        .font(.title3)
                        .foregroundColor(iconColor(for: section))
                }

                // Title & Status badge
                VStack(alignment: .leading, spacing: 6) {
                    Text(section.rawValue)
                        .font(.subheadline.weight(.semibold))
                        .foregroundColor(.primary)

                    // Status badge pill
                    HStack(spacing: 4) {
                        Image(systemName: documentStatusIcon(for: section))
                            .font(.caption2)
                        Text(documentStatus(for: section))
                            .font(.caption2.weight(.medium))
                    }
                    .foregroundColor(documentStatusColor(for: section))
                    .padding(.horizontal, 8)
                    .padding(.vertical, 3)
                    .background(documentStatusColor(for: section).opacity(0.1))
                    .cornerRadius(6)
                }

                Spacer()

                // Chevron or checkmark
                if isDocumentVerified(for: section) {
                    Image(systemName: "checkmark.seal.fill")
                        .foregroundColor(.green)
                        .font(.title3)
                } else if isDocumentComplete(for: section) {
                    Image(systemName: "clock.fill")
                        .foregroundColor(.orange)
                        .font(.title3)
                } else {
                    Image(systemName: "chevron.right")
                        .foregroundColor(.secondary)
                }
            }
            .padding(14)
            .background(Color(.systemBackground))
            .cornerRadius(14)
            .shadow(color: .black.opacity(0.05), radius: 4, y: 2)
        }
        .buttonStyle(.plain)
    }

    private func iconName(for section: DocumentSection) -> String {
        switch section {
        case .foodLicense: return "fork.knife"
        case .healthPermit: return "cross.case.fill"
        case .businessLicenseW9: return "doc.text.fill"
        case .liabilityInsurance: return "shield.fill"
        }
    }

    private func iconColor(for section: DocumentSection) -> Color {
        switch section {
        case .foodLicense: return .orange
        case .healthPermit: return .green
        case .businessLicenseW9: return .blue
        case .liabilityInsurance: return .teal
        }
    }

    private func documentStatus(for section: DocumentSection) -> String {
        let docType = documentTypeKey(for: section)
        if let doc = viewModel.documents.first(where: { $0.documentType == docType }) {
            switch doc.status {
            case "approved": return "Verified ✓"
            case "pending": return "Uploaded - Pending Review"
            case "rejected": return "Rejected - Please Re-upload"
            default: return "Uploaded"
            }
        }
        return "Required"
    }

    private func documentStatusColor(for section: DocumentSection) -> Color {
        let status = documentStatus(for: section)
        if status.contains("Verified") { return .green }
        if status.contains("Pending") || status.contains("Uploaded") { return .orange }
        if status.contains("Rejected") { return .red }
        return .secondary
    }

    private func isDocumentComplete(for section: DocumentSection) -> Bool {
        let docType = documentTypeKey(for: section)
        return viewModel.documents.contains(where: { $0.documentType == docType })
    }

    private func isDocumentVerified(for section: DocumentSection) -> Bool {
        let docType = documentTypeKey(for: section)
        return viewModel.documents.contains(where: { $0.documentType == docType && $0.status == "approved" })
    }

    private func documentStatusIcon(for section: DocumentSection) -> String {
        let docType = documentTypeKey(for: section)
        if let doc = viewModel.documents.first(where: { $0.documentType == docType }) {
            switch doc.status {
            case "approved": return "checkmark.seal.fill"
            case "pending": return "clock.fill"
            case "rejected": return "xmark.circle.fill"
            default: return "doc.fill"
            }
        }
        return "doc.badge.plus"
    }

    /// Maps UI sections to backend API document type keys
    /// These must match the field_mapping in main_new.py
    private func documentTypeKey(for section: DocumentSection) -> String {
        switch section {
        case .foodLicense: return "food_license"
        case .healthPermit: return "health_permit"
        case .businessLicenseW9: return "w9_form"
        case .liabilityInsurance: return "liability_insurance"
        }
    }

    // MARK: - Submit Button

    private var submitForReviewButton: some View {
        Button {
            viewModel.submitForReview()
        } label: {
            HStack(spacing: 8) {
                if viewModel.isSubmitting {
                    ProgressView()
                        .tint(.white)
                } else {
                    Image(systemName: "paperplane.fill")
                        .font(.headline)
                }
                Text(viewModel.isSubmitting ? "Submitting..." : "Submit for Review")
                    .fontWeight(.semibold)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 16)
            .background(
                LinearGradient(
                    colors: [RestaurantTheme.brandOrange, RestaurantTheme.brandOrangeLight],
                    startPoint: .leading,
                    endPoint: .trailing
                )
            )
            .foregroundColor(.white)
            .cornerRadius(14)
            .shadow(color: RestaurantTheme.brandOrange.opacity(0.3), radius: 8, y: 4)
        }
        .padding(.horizontal)
        .disabled(viewModel.isSubmitting)
    }

    // MARK: - Detail Sheet

    @ViewBuilder
    private func documentDetailSheet(for section: DocumentSection) -> some View {
        NavigationStack {
            DocumentUploadFormView(
                viewModel: viewModel,
                documentType: documentTypeKey(for: section),
                title: section.rawValue
            )
        }
    }
}

// MARK: - Document Section Extension

extension RestaurantDocumentsView.DocumentSection: Identifiable {
    var id: String { rawValue }
}

// MARK: - Document Upload Form

struct DocumentUploadFormView: View {
    @ObservedObject var viewModel: RestaurantDocumentsViewModel
    let documentType: String
    let title: String
    @Environment(\.dismiss) var dismiss

    @State private var selectedImage: UIImage?
    @State private var selectedPhotoItem: PhotosPickerItem?
    @State private var isUploading = false
    @State private var uploadError: String?
    @State private var uploadSuccess = false

    private var existingDoc: P2PVendorDocument? {
        viewModel.documents.first(where: { $0.documentType == documentType })
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 24) {
                headerSection
                existingDocSection
                photoSection
                messagesSection
                uploadButtonSection
                infoFooter
            }
        }
        .background(Color(.systemGroupedBackground))
        .navigationTitle(title)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .cancellationAction) {
                Button("Cancel") { dismiss() }
            }
        }
    }

    private var headerSection: some View {
        VStack(spacing: 8) {
            ZStack {
                Circle()
                    .fill(Color.blue.opacity(0.1))
                    .frame(width: 72, height: 72)
                Image(systemName: documentIcon)
                    .font(.system(size: 32))
                    .foregroundColor(.blue)
            }
            Text(title)
                .font(.title3.bold())
            Text(documentDescription)
                .font(.subheadline)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
        }
        .padding(.top, 8)
    }

    @ViewBuilder
    private var existingDocSection: some View {
        if let doc = existingDoc {
            let isApproved = doc.status == "approved"
            HStack(spacing: 12) {
                Image(systemName: isApproved ? "checkmark.circle.fill" : "clock.fill")
                    .foregroundColor(isApproved ? .green : .orange)
                    .font(.title3)
                VStack(alignment: .leading, spacing: 2) {
                    Text(isApproved ? "Document Verified" : "Under Review")
                        .font(.subheadline.weight(.semibold))
                    if let fileName = doc.fileName {
                        Text(fileName)
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
                Spacer()
            }
            .padding()
            .background(isApproved ? Color.green.opacity(0.08) : Color.orange.opacity(0.08))
            .cornerRadius(12)
            .padding(.horizontal)
        }
    }

    private var photoSection: some View {
        VStack(spacing: 16) {
            photoPreview

            PhotosPicker(selection: $selectedPhotoItem, matching: .images) {
                HStack(spacing: 8) {
                    Image(systemName: "photo.badge.plus")
                    Text(selectedImage == nil && existingDoc == nil ? "Select Document Photo" : "Change Photo")
                }
                .font(.subheadline.weight(.medium))
                .frame(maxWidth: .infinity)
                .padding(.vertical, 14)
                .background(Color(.systemGray6))
                .foregroundColor(.primary)
                .cornerRadius(12)
            }
            .onChange(of: selectedPhotoItem) { _, newValue in
                Task {
                    if let data = try? await newValue?.loadTransferable(type: Data.self),
                       let image = UIImage(data: data) {
                        await MainActor.run {
                            selectedImage = image
                            uploadError = nil
                            uploadSuccess = false
                        }
                    }
                }
            }
        }
        .padding(.horizontal)
    }

    @ViewBuilder
    private var photoPreview: some View {
        if let image = selectedImage {
            Image(uiImage: image)
                .resizable()
                .scaledToFit()
                .frame(maxHeight: 280)
                .cornerRadius(16)
                .shadow(color: .black.opacity(0.1), radius: 8, y: 4)
        } else if let doc = existingDoc,
                  let fileUrlString = doc.fileUrl,
                  let url = URL(string: fileUrlString) {
            AsyncImage(url: url) { phase in
                switch phase {
                case .success(let loadedImage):
                    loadedImage
                        .resizable()
                        .scaledToFit()
                        .frame(maxHeight: 280)
                        .cornerRadius(16)
                case .failure:
                    documentPlaceholder
                case .empty:
                    ProgressView()
                        .frame(height: 200)
                @unknown default:
                    documentPlaceholder
                }
            }
        } else {
            documentPlaceholder
        }
    }

    @ViewBuilder
    private var messagesSection: some View {
        if let error = uploadError {
            statusBanner(text: error, icon: "exclamationmark.triangle.fill", color: .red)
        }
        if uploadSuccess {
            statusBanner(text: "Document uploaded successfully!", icon: "checkmark.circle.fill", color: .green)
        }
    }

    private func statusBanner(text: String, icon: String, color: Color) -> some View {
        HStack(spacing: 8) {
            Image(systemName: icon)
                .foregroundColor(color)
            Text(text)
                .font(.subheadline)
                .foregroundColor(color)
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(color.opacity(0.08))
        .cornerRadius(10)
        .padding(.horizontal)
    }

    private var uploadButtonSection: some View {
        let canUpload = selectedImage != nil && !isUploading
        let buttonText = isUploading ? "Uploading..." : (existingDoc != nil ? "Replace Document" : "Upload Document")
        return Button {
            uploadDocument()
        } label: {
            HStack(spacing: 8) {
                if isUploading {
                    ProgressView()
                        .tint(.white)
                } else {
                    Image(systemName: "arrow.up.doc.fill")
                }
                Text(buttonText)
                    .fontWeight(.semibold)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 16)
            .background(canUpload ? Color.blue : Color(.systemGray4))
            .foregroundColor(.white)
            .cornerRadius(14)
        }
        .disabled(!canUpload)
        .padding(.horizontal)
    }

    private var infoFooter: some View {
        VStack(spacing: 8) {
            Label("Accepted: JPG, PNG, PDF (max 10 MB)", systemImage: "info.circle")
            Label("Securely stored and encrypted", systemImage: "lock.shield")
        }
        .font(.caption)
        .foregroundColor(.secondary)
        .padding(.bottom, 24)
    }

    private var documentPlaceholder: some View {
        VStack(spacing: 16) {
            Image(systemName: "doc.badge.plus")
                .font(.system(size: 48))
                .foregroundColor(Color(.systemGray3))
            Text("No document uploaded yet")
                .font(.subheadline)
                .foregroundColor(.secondary)
            Text("Take a photo or select from your library")
                .font(.caption)
                .foregroundColor(Color(.systemGray2))
        }
        .frame(maxWidth: .infinity)
        .frame(height: 220)
        .background(Color(.systemGray6))
        .cornerRadius(16)
    }

    private var documentIcon: String {
        switch documentType {
        case "food_license": return "fork.knife"
        case "health_permit": return "cross.case.fill"
        case "w9_form": return "doc.text.fill"
        case "liability_insurance": return "shield.fill"
        default: return "doc.fill"
        }
    }

    private var documentDescription: String {
        switch documentType {
        case "food_license": return "Your state or local food service operating license"
        case "health_permit": return "Health department inspection permit"
        case "w9_form": return "IRS Form W-9 for tax reporting"
        case "liability_insurance": return "General liability insurance certificate"
        default: return "Upload your document"
        }
    }

    private func uploadDocument() {
        guard let image = selectedImage,
              let imageData = image.jpegData(compressionQuality: 0.8) else {
            uploadError = "Please select an image"
            return
        }

        isUploading = true
        uploadError = nil
        uploadSuccess = false

        viewModel.uploadDocument(imageData: imageData, documentType: documentType) { success in
            isUploading = false
            if success {
                uploadSuccess = true
                DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) {
                    dismiss()
                }
            } else {
                uploadError = "Upload failed. Please try again."
            }
        }
    }
}

// MARK: - ViewModel using P2P Backend API

class RestaurantDocumentsViewModel: ObservableObject {
    @Published var documents: [P2PVendorDocument] = []
    @Published var isLoading = false
    @Published var isSubmitting = false
    @Published var errorMessage: String?

    private let p2pAPI = P2PAPIService.shared

    /// Required document types for vendor approval (must match backend ZIP requirements)
    /// These 4 documents are required before admin can approve vendor
    private let requiredDocumentTypes = ["food_license", "health_permit", "w9_form", "liability_insurance"]

    var vendorId: Int? {
        p2pAPI.currentVendorId
    }

    var completionPercentage: Int {
        let uploadedRequired = requiredDocumentTypes.filter { docType in
            documents.contains(where: { $0.documentType == docType })
        }
        return requiredDocumentTypes.isEmpty ? 0 : (uploadedRequired.count * 100) / requiredDocumentTypes.count
    }

    var uploadedCount: Int {
        requiredDocumentTypes.filter { docType in
            documents.contains(where: { $0.documentType == docType })
        }.count
    }

    var requiredCount: Int {
        requiredDocumentTypes.count
    }

    var hasPendingDocuments: Bool {
        documents.contains(where: { $0.status == "pending" })
    }

    var approvalStatus: String {
        if documents.isEmpty { return "" }
        if documents.allSatisfy({ $0.status == "approved" }) { return "approved" }
        if documents.contains(where: { $0.status == "rejected" }) { return "rejected" }
        if documents.contains(where: { $0.status == "pending" }) { return "pending" }
        return ""
    }

    var canSubmit: Bool {
        // All 4 required documents must be uploaded before submitting for review
        completionPercentage == 100 && !hasPendingDocuments
    }

    func fetchDocuments() {
        guard let vendorId = vendorId else {
            #if DEBUG
            logger.debug("RestaurantDocumentsViewModel: No vendor ID available")
            #endif
            return
        }

        isLoading = true
        errorMessage = nil

        p2pAPI.getVendorDocuments(vendorId: vendorId) { [weak self] result in
            DispatchQueue.main.async {
                self?.isLoading = false
                switch result {
                case .success(let docs):
                    self?.documents = docs
                    #if DEBUG
                    logger.debug("RestaurantDocumentsViewModel: Fetched \(docs.count) documents")
                    #endif
                case .failure(let error):
                    let errMsg = error.localizedDescription.lowercased()
                    if errMsg.contains("network") || errMsg.contains("connection") {
                        self?.errorMessage = "Unable to connect. Please check your internet connection."
                    } else {
                        self?.errorMessage = "Unable to load documents. Please try again."
                    }
                    #if DEBUG
                    logger.debug("RestaurantDocumentsViewModel: Error fetching documents: \(error)")
                    #endif
                }
            }
        }
    }

    func uploadDocument(imageData: Data, documentType: String, completion: @escaping (Bool) -> Void) {
        guard let vendorId = vendorId else {
            #if DEBUG
            logger.debug("RestaurantDocumentsViewModel: No vendor ID for upload")
            #endif
            completion(false)
            return
        }

        #if DEBUG
        logger.debug("RestaurantDocumentsViewModel: Uploading \(documentType) for vendor \(vendorId)")
        #endif

        p2pAPI.uploadVendorDocument(vendorId: vendorId, imageData: imageData, documentType: documentType) { [weak self] result in
            DispatchQueue.main.async {
                switch result {
                case .success(let response):
                    #if DEBUG
                    logger.debug("RestaurantDocumentsViewModel: Upload successful - \(response.message)")
                    #endif
                    self?.fetchDocuments() // Refresh documents list
                    completion(true)
                case .failure(let error):
                    #if DEBUG
                    logger.debug("RestaurantDocumentsViewModel: Upload failed - \(error)")
                    #endif
                    let errMsg = error.localizedDescription.lowercased()
                    if errMsg.contains("size") || errMsg.contains("large") {
                        self?.errorMessage = "File is too large. Please use an image under 10MB."
                    } else if errMsg.contains("format") || errMsg.contains("type") {
                        self?.errorMessage = "Invalid file format. Please use JPG, PNG, or PDF."
                    } else {
                        self?.errorMessage = "Unable to upload document. Please try again."
                    }
                    completion(false)
                }
            }
        }
    }

    func submitForReview() {
        guard vendorId != nil else { return }
        isSubmitting = true

        // Documents are automatically submitted for review when uploaded
        // This function just refreshes the documents list
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) { [weak self] in
            self?.isSubmitting = false
            #if DEBUG
            logger.debug("RestaurantDocumentsViewModel: Submitted for review")
            #endif
            self?.fetchDocuments()
        }
    }
}

#Preview {
    RestaurantDocumentsView()
}
