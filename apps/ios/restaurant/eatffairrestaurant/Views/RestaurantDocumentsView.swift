import SwiftUI
import Combine
import PhotosUI
import EatFairShared

/// Restaurant Documents Management - Self-service document upload for P2P verification
/// Uses P2P Backend API for document storage (saves to PostgreSQL database)
struct RestaurantDocumentsView: View {
    @StateObject private var viewModel = RestaurantDocumentsViewModel()
    @State private var selectedSection: DocumentSection?

    enum DocumentSection: String, CaseIterable {
        case businessLicense = "Business License"
        case taxId = "Tax ID (W-9 Form)"
        case foodHandler = "Food Handler Certificate"
        case healthPermit = "Health Permit"
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
        VStack(spacing: 12) {
            HStack {
                Text("Document Verification")
                    .font(.headline)
                Spacer()
                Text("\(viewModel.completionPercentage)% Complete")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
            }

            ProgressView(value: Double(viewModel.completionPercentage), total: 100)
                .tint(progressColor)

            if viewModel.hasPendingDocuments {
                HStack {
                    Image(systemName: "clock.fill")
                        .foregroundColor(.blue)
                    Text("Documents are under review")
                        .font(.caption)
                        .foregroundColor(.blue)
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
        let percentage = viewModel.completionPercentage
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
        case .liabilityInsurance: return "shield.fill"
        }
    }

    private func iconColor(for section: DocumentSection) -> Color {
        switch section {
        case .businessLicense: return .blue
        case .taxId: return .purple
        case .foodHandler: return .orange
        case .healthPermit: return .green
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

    private func documentTypeKey(for section: DocumentSection) -> String {
        switch section {
        case .businessLicense: return "business_license"
        case .taxId: return "w9_form"
        case .foodHandler: return "food_handler"
        case .healthPermit: return "health_permit"
        case .liabilityInsurance: return "liability_insurance"
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

// MARK: - Unified Document Upload Form

struct DocumentUploadFormView: View {
    @ObservedObject var viewModel: RestaurantDocumentsViewModel
    let documentType: String
    let title: String
    @Environment(\.dismiss) var dismiss

    @State private var selectedImage: UIImage?
    @State private var selectedPhotoItem: PhotosPickerItem?
    @State private var isUploading = false
    @State private var uploadError: String?

    var body: some View {
        Form {
            Section("Document Photo") {
                VStack(alignment: .center, spacing: 16) {
                    if let image = selectedImage {
                        Image(uiImage: image)
                            .resizable()
                            .scaledToFit()
                            .frame(maxHeight: 250)
                            .cornerRadius(12)
                    } else if let existingDoc = viewModel.documents.first(where: { $0.documentType == documentType }),
                              let url = URL(string: existingDoc.fileUrl) {
                        AsyncImage(url: url) { phase in
                            switch phase {
                            case .success(let image):
                                image
                                    .resizable()
                                    .scaledToFit()
                            case .failure:
                                documentPlaceholder
                            case .empty:
                                ProgressView()
                            @unknown default:
                                documentPlaceholder
                            }
                        }
                        .frame(maxHeight: 250)
                        .cornerRadius(12)
                    } else {
                        documentPlaceholder
                    }

                    PhotosPicker(selection: $selectedPhotoItem, matching: .images) {
                        Label(selectedImage == nil ? "Select Photo" : "Change Photo", systemImage: "photo.badge.plus")
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(Color.blue.opacity(0.1))
                            .foregroundColor(.blue)
                            .cornerRadius(10)
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
                .padding(.vertical, 8)
            }

            if let error = uploadError {
                Section {
                    HStack {
                        Image(systemName: "exclamationmark.triangle.fill")
                            .foregroundColor(.red)
                        Text(error)
                            .foregroundColor(.red)
                            .font(.caption)
                    }
                }
            }

            Section {
                Button {
                    uploadDocument()
                } label: {
                    HStack {
                        if isUploading {
                            ProgressView()
                                .padding(.trailing, 8)
                        }
                        Text(isUploading ? "Uploading..." : "Upload Document")
                    }
                    .frame(maxWidth: .infinity)
                }
                .disabled(selectedImage == nil || isUploading)
            }

            Section {
                VStack(alignment: .leading, spacing: 8) {
                    Label("Accepted formats: JPG, PNG, PDF", systemImage: "info.circle")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    Label("Documents are saved to your vendor profile", systemImage: "lock.shield")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
        }
        .navigationTitle(title)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .cancellationAction) {
                Button("Cancel") { dismiss() }
            }
        }
    }

    private var documentPlaceholder: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 12)
                .fill(Color(.systemGray5))
                .frame(height: 200)
            VStack(spacing: 12) {
                Image(systemName: "doc.badge.plus")
                    .font(.system(size: 48))
                    .foregroundColor(.secondary)
                Text("Tap to select a photo")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
            }
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

        viewModel.uploadDocument(imageData: imageData, documentType: documentType) { success in
            isUploading = false
            if success {
                dismiss()
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

    /// Required document types for vendor approval
    private let requiredDocumentTypes = ["w9_form", "health_permit", "food_handler", "liability_insurance", "business_license"]

    var vendorId: Int? {
        p2pAPI.currentVendorId
    }

    var completionPercentage: Int {
        let uploadedRequired = requiredDocumentTypes.filter { docType in
            documents.contains(where: { $0.documentType == docType })
        }
        return requiredDocumentTypes.isEmpty ? 0 : (uploadedRequired.count * 100) / requiredDocumentTypes.count
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
        completionPercentage >= 80 && !hasPendingDocuments
    }

    func fetchDocuments() {
        guard let vendorId = vendorId else {
            print("RestaurantDocumentsViewModel: No vendor ID available")
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
                    print("RestaurantDocumentsViewModel: Fetched \(docs.count) documents")
                case .failure(let error):
                    self?.errorMessage = error.localizedDescription
                    print("RestaurantDocumentsViewModel: Error fetching documents: \(error)")
                }
            }
        }
    }

    func uploadDocument(imageData: Data, documentType: String, completion: @escaping (Bool) -> Void) {
        guard let vendorId = vendorId else {
            print("RestaurantDocumentsViewModel: No vendor ID for upload")
            completion(false)
            return
        }

        print("RestaurantDocumentsViewModel: Uploading \(documentType) for vendor \(vendorId)")

        p2pAPI.uploadVendorDocument(vendorId: vendorId, imageData: imageData, documentType: documentType) { [weak self] result in
            DispatchQueue.main.async {
                switch result {
                case .success(let response):
                    print("RestaurantDocumentsViewModel: Upload successful - \(response.message)")
                    self?.fetchDocuments() // Refresh documents list
                    completion(true)
                case .failure(let error):
                    print("RestaurantDocumentsViewModel: Upload failed - \(error)")
                    self?.errorMessage = error.localizedDescription
                    completion(false)
                }
            }
        }
    }

    func submitForReview() {
        guard let vendorId = vendorId else { return }
        isSubmitting = true

        // Update vendor status to request review
        p2pAPI.updateVendorStatus(vendorId: vendorId, status: "in_review") { [weak self] result in
            DispatchQueue.main.async {
                self?.isSubmitting = false
                switch result {
                case .success:
                    print("RestaurantDocumentsViewModel: Submitted for review")
                    self?.fetchDocuments()
                case .failure(let error):
                    self?.errorMessage = error.localizedDescription
                    print("RestaurantDocumentsViewModel: Submit failed - \(error)")
                }
            }
        }
    }
}

#Preview {
    RestaurantDocumentsView()
}
