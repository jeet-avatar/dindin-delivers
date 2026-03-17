import SwiftUI
import EatFairShared

// MARK: - Compliance & Safety Screen (TNC)
struct ComplianceView: View {
    let driverId: Int
    @StateObject private var viewModel: ComplianceViewModel

    init(driverId: Int) {
        self.driverId = driverId
        _viewModel = StateObject(wrappedValue: ComplianceViewModel(driverId: driverId))
    }

    var body: some View {
        ScrollView {
            if viewModel.isLoading {
                ProgressView("Loading compliance status...")
                    .padding(.top, 40)
            } else {
                VStack(spacing: 16) {
                    backgroundCheckSection
                    vehicleInspectionSection
                    accessibilitySection
                }
                .padding()
            }
        }
        .navigationTitle("Compliance & Safety")
        .onAppear { viewModel.loadAll() }
        .alert("Inspection Submitted", isPresented: $viewModel.showInspectionSuccess) {
            Button("OK") { viewModel.showInspectionForm = false }
        } message: {
            Text("Your vehicle inspection has been recorded.")
        }
    }

    // MARK: - Background Check
    @ViewBuilder
    private var backgroundCheckSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Label("Background Check", systemImage: "person.badge.shield.checkmark")
                .font(.headline)
            HStack {
                statusBadge(viewModel.bgCheckStatus)
                Spacer()
                if let date = viewModel.bgCheckDate {
                    Text("Checked: \(String(date.prefix(10)))")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
            Text("Background checks are initiated by Dollor.ai administration.")
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(12)
    }

    // MARK: - Vehicle Inspection
    @ViewBuilder
    private var vehicleInspectionSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Label("Vehicle Inspection", systemImage: "car.badge.gearshape")
                .font(.headline)
            HStack {
                statusBadge(viewModel.inspectionStatus)
                Spacer()
                if let days = viewModel.inspectionDaysRemaining {
                    Text(days >= 0 ? "\(days) days remaining" : "Overdue by \(abs(days)) days")
                        .font(.caption)
                        .foregroundColor(days <= 30 ? .orange : .secondary)
                }
            }
            if let nextDue = viewModel.inspectionNextDue {
                Text("Next due: \(nextDue)")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            Button(action: { viewModel.showInspectionForm = true }) {
                Label("Submit Inspection", systemImage: "doc.badge.plus")
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(.bordered)
            .sheet(isPresented: $viewModel.showInspectionForm) {
                inspectionFormSheet
            }
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(12)
    }

    @ViewBuilder
    private var inspectionFormSheet: some View {
        NavigationView {
            Form {
                DatePicker("Inspection Date", selection: $viewModel.inspectionDate, in: ...Date(), displayedComponents: .date)
                TextField("Facility Name *", text: $viewModel.facilityName)
                TextField("BAR License Number", text: $viewModel.barLicense)
                TextField("Mileage at Inspection", text: $viewModel.mileage)
                    .keyboardType(.numberPad)
                TextField("Document URL *", text: $viewModel.documentUrl)
                    .keyboardType(.URL)
                    .autocorrectionDisabled()
                    .textInputAutocapitalization(.never)

                if let error = viewModel.errorMessage {
                    Text(error).foregroundColor(.red).font(.caption)
                }

                Button(action: { viewModel.submitInspection() }) {
                    if viewModel.isSubmittingInspection {
                        ProgressView()
                    } else {
                        Text("Submit")
                    }
                }
                .disabled(viewModel.facilityName.isEmpty || viewModel.documentUrl.isEmpty || viewModel.isSubmittingInspection)
            }
            .navigationTitle("Submit Inspection")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") { viewModel.showInspectionForm = false }
                }
            }
        }
    }

    // MARK: - Accessibility Capability
    @ViewBuilder
    private var accessibilitySection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Label("Accessibility Capability", systemImage: "figure.roll")
                .font(.headline)

            Toggle("My vehicle is wheelchair accessible", isOn: $viewModel.accessibilityCapable)
                .tint(.blue)
                .onChange(of: viewModel.accessibilityCapable) { _ in
                    viewModel.saveAccessibility()
                }

            if viewModel.accessibilityCapable {
                VStack(alignment: .leading, spacing: 8) {
                    Toggle("Wheelchair ramp/lift", isOn: $viewModel.wheelchairAccessible)
                        .font(.subheadline).tint(.blue)
                        .onChange(of: viewModel.wheelchairAccessible) { _ in viewModel.saveAccessibility() }
                    Toggle("Service animal friendly", isOn: $viewModel.serviceAnimalFriendly)
                        .font(.subheadline).tint(.blue)
                        .onChange(of: viewModel.serviceAnimalFriendly) { _ in viewModel.saveAccessibility() }
                    Toggle("Extra trunk space for mobility aids", isOn: $viewModel.mobilityStorage)
                        .font(.subheadline).tint(.blue)
                        .onChange(of: viewModel.mobilityStorage) { _ in viewModel.saveAccessibility() }
                }
                .padding(.leading, 4)
            }

            if viewModel.isSaving {
                HStack {
                    ProgressView().scaleEffect(0.7)
                    Text("Saving...").font(.caption).foregroundColor(.secondary)
                }
            }
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(12)
    }

    // MARK: - Helpers
    @ViewBuilder
    private func statusBadge(_ status: String) -> some View {
        let (color, icon, text): (Color, String, String) = {
            switch status {
            case "passed", "valid": return (.green, "checkmark.circle.fill", status.capitalized)
            case "pending": return (.yellow, "clock.fill", "Pending")
            case "expired": return (.red, "xmark.circle.fill", "Expired")
            case "failed": return (.red, "xmark.circle.fill", "Failed")
            default: return (.gray, "questionmark.circle", "Not Started")
            }
        }()
        Label(text, systemImage: icon)
            .font(.subheadline.weight(.medium))
            .foregroundColor(color)
    }
}

// MARK: - ViewModel
class ComplianceViewModel: ObservableObject {
    @Published var bgCheckStatus = "not_started"
    @Published var bgCheckDate: String?
    @Published var inspectionStatus = "missing"
    @Published var inspectionNextDue: String?
    @Published var inspectionDaysRemaining: Int?
    @Published var accessibilityCapable = false
    @Published var wheelchairAccessible = false
    @Published var serviceAnimalFriendly = false
    @Published var mobilityStorage = false
    @Published var isLoading = true
    @Published var isSaving = false
    @Published var showInspectionForm = false
    @Published var showInspectionSuccess = false
    @Published var isSubmittingInspection = false
    @Published var errorMessage: String?
    @Published var inspectionDate = Date()
    @Published var facilityName = ""
    @Published var barLicense = ""
    @Published var mileage = ""
    @Published var documentUrl = ""

    private let driverId: Int

    init(driverId: Int) {
        self.driverId = driverId
    }

    func loadAll() {
        isLoading = true
        let group = DispatchGroup()

        group.enter()
        P2PAPIService.shared.getBackgroundCheckStatus(driverId: driverId) { [weak self] result in
            self?.bgCheckStatus = result?["status"] as? String ?? "not_started"
            self?.bgCheckDate = result?["checked_at"] as? String
            group.leave()
        }

        group.enter()
        P2PAPIService.shared.getVehicleInspectionStatus(driverId: driverId) { [weak self] result in
            self?.inspectionStatus = result?["status"] as? String ?? "missing"
            self?.inspectionNextDue = result?["next_due_date"] as? String
            self?.inspectionDaysRemaining = result?["days_until_due"] as? Int
            group.leave()
        }

        group.enter()
        P2PAPIService.shared.getDriverAccessibility { [weak self] result in
            self?.accessibilityCapable = result?["accessibility_capable"] as? Bool ?? false
            if let features = result?["accessibility_features"] as? [String: Bool] {
                self?.wheelchairAccessible = features["wheelchair"] ?? false
                self?.serviceAnimalFriendly = features["service_animal"] ?? false
                self?.mobilityStorage = features["mobility_storage"] ?? false
            }
            group.leave()
        }

        group.notify(queue: .main) { [weak self] in
            self?.isLoading = false
        }
    }

    func saveAccessibility() {
        isSaving = true
        let features: [String: Bool] = [
            "wheelchair": wheelchairAccessible,
            "service_animal": serviceAnimalFriendly,
            "mobility_storage": mobilityStorage,
        ]
        P2PAPIService.shared.updateDriverAccessibility(capable: accessibilityCapable, features: features) { [weak self] _ in
            self?.isSaving = false
        }
    }

    func submitInspection() {
        isSubmittingInspection = true
        errorMessage = nil
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"

        P2PAPIService.shared.submitVehicleInspection(
            driverId: driverId,
            inspectionDate: formatter.string(from: inspectionDate),
            facilityName: facilityName,
            barLicense: barLicense.isEmpty ? nil : barLicense,
            mileage: Int(mileage),
            documentUrl: documentUrl
        ) { [weak self] success in
            self?.isSubmittingInspection = false
            if success {
                self?.showInspectionSuccess = true
                self?.loadAll()
            } else {
                self?.errorMessage = "Failed to submit inspection"
            }
        }
    }
}
