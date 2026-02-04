import SwiftUI
import Combine
import EatFairShared
import os

private let logger = Logger(subsystem: "com.dollorai.restaurant", category: "KOTSettings")

/// KOT (Kitchen Order Ticket) / POS Integration Settings
/// Allows restaurants to configure automatic order printing to Square, Clover, or Toast POS systems
struct KOTSettingsView: View {
    @StateObject private var viewModel = KOTSettingsViewModel()
    @Environment(\.dismiss) var dismiss

    var body: some View {
        NavigationStack {
            Form {
                // Status Section
                Section {
                    HStack {
                        VStack(alignment: .leading, spacing: 4) {
                            Text("Kitchen Printing")
                                .font(.headline)
                            Text(viewModel.statusDescription)
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                        Spacer()
                        Circle()
                            .fill(viewModel.isEnabled ? Color.green : Color.gray)
                            .frame(width: 12, height: 12)
                    }
                } header: {
                    Text("Status")
                } footer: {
                    Text("When enabled, orders are automatically sent to your POS system for kitchen printing when you accept them.")
                }

                // POS Selection
                Section("Select Your POS System") {
                    ForEach(POSType.allCases, id: \.self) { pos in
                        Button(action: { viewModel.selectedPOS = pos }) {
                            HStack {
                                Image(systemName: pos.icon)
                                    .font(.title2)
                                    .foregroundColor(pos.color)
                                    .frame(width: 40)

                                VStack(alignment: .leading, spacing: 2) {
                                    Text(pos.displayName)
                                        .font(.headline)
                                        .foregroundColor(.primary)
                                    Text(pos.description)
                                        .font(.caption)
                                        .foregroundColor(.secondary)
                                }

                                Spacer()

                                if viewModel.selectedPOS == pos {
                                    Image(systemName: "checkmark.circle.fill")
                                        .foregroundColor(.green)
                                }

                                if pos == .toast {
                                    Text("Soon")
                                        .font(.caption2)
                                        .padding(.horizontal, 8)
                                        .padding(.vertical, 4)
                                        .background(Color.orange.opacity(0.2))
                                        .foregroundColor(.orange)
                                        .cornerRadius(4)
                                }
                            }
                            .padding(.vertical, 4)
                        }
                        .disabled(pos == .toast)
                    }
                }

                // Configuration Section (shown when POS is selected)
                if viewModel.selectedPOS != .none {
                    Section(viewModel.selectedPOS.configTitle) {
                        switch viewModel.selectedPOS {
                        case .square:
                            SquareConfigFields(viewModel: viewModel)
                        case .clover:
                            CloverConfigFields(viewModel: viewModel)
                        case .toast:
                            ToastConfigFields()
                        case .none:
                            EmptyView()
                        }
                    }

                    // Options
                    Section("Options") {
                        Toggle(isOn: $viewModel.autoPrint) {
                            VStack(alignment: .leading, spacing: 2) {
                                Text("Auto-Print on Accept")
                                Text("Print KOT automatically when you accept an order")
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }
                        }
                        .tint(.green)
                    }

                    // Test Section
                    Section {
                        Button(action: { viewModel.testConnection() }) {
                            HStack {
                                if viewModel.isTesting {
                                    ProgressView()
                                        .progressViewStyle(CircularProgressViewStyle())
                                } else {
                                    Image(systemName: "printer.fill")
                                }
                                Text(viewModel.isTesting ? "Sending Test..." : "Send Test Print")
                            }
                            .frame(maxWidth: .infinity)
                        }
                        .disabled(viewModel.isTesting || !viewModel.canTest)
                    } footer: {
                        Text("This will send a test order ticket to your POS system. Check your kitchen printer or POS display.")
                    }
                }

                // Save Button
                Section {
                    Button(action: { viewModel.saveSettings() }) {
                        HStack {
                            Spacer()
                            if viewModel.isSaving {
                                ProgressView()
                                    .progressViewStyle(CircularProgressViewStyle(tint: .white))
                            } else {
                                Text("Save Settings")
                                    .fontWeight(.semibold)
                            }
                            Spacer()
                        }
                        .foregroundColor(.white)
                        .padding()
                        .background(viewModel.canSave ? Color.green : Color.gray)
                        .cornerRadius(10)
                    }
                    .disabled(!viewModel.canSave || viewModel.isSaving)
                    .listRowBackground(Color.clear)
                    .listRowInsets(EdgeInsets())
                }

                // Help Section
                Section("Need Help?") {
                    NavigationLink {
                        KOTHelpView(posType: viewModel.selectedPOS)
                    } label: {
                        Label("Setup Guide", systemImage: "questionmark.circle")
                    }

                    Link(destination: URL(string: "mailto:support@dollor.ai?subject=KOT%20Integration%20Help")!) {
                        Label("Contact Support", systemImage: "envelope")
                    }
                }
            }
            .navigationTitle("Kitchen Printing")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") { dismiss() }
                }
            }
            .alert("Success", isPresented: $viewModel.showSuccessAlert) {
                Button("OK") { }
            } message: {
                Text(viewModel.successMessage)
            }
            .alert("Error", isPresented: $viewModel.showErrorAlert) {
                Button("OK") { }
            } message: {
                Text(viewModel.errorMessage)
            }
            .onAppear {
                viewModel.loadSettings()
            }
        }
    }
}

// MARK: - POS Type Enum
enum POSType: String, CaseIterable {
    case none = "none"
    case square = "square"
    case clover = "clover"
    case toast = "toast"

    var displayName: String {
        switch self {
        case .none: return "No POS Integration"
        case .square: return "Square"
        case .clover: return "Clover"
        case .toast: return "Toast"
        }
    }

    var description: String {
        switch self {
        case .none: return "Orders will not be sent to any POS system"
        case .square: return "Popular for small to medium restaurants"
        case .clover: return "Full-featured restaurant POS"
        case .toast: return "Restaurant-focused POS (Partner API required)"
        }
    }

    var icon: String {
        switch self {
        case .none: return "xmark.circle"
        case .square: return "square.fill"
        case .clover: return "leaf.fill"
        case .toast: return "flame.fill"
        }
    }

    var color: Color {
        switch self {
        case .none: return .gray
        case .square: return .blue
        case .clover: return .green
        case .toast: return .orange
        }
    }

    var configTitle: String {
        switch self {
        case .none: return ""
        case .square: return "Square Configuration"
        case .clover: return "Clover Configuration"
        case .toast: return "Toast Configuration"
        }
    }
}

// MARK: - Square Config Fields
struct SquareConfigFields: View {
    @ObservedObject var viewModel: KOTSettingsViewModel

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            VStack(alignment: .leading, spacing: 4) {
                Text("Access Token")
                    .font(.caption)
                    .foregroundColor(.secondary)
                SecureField("sq0atp-XXXXX...", text: $viewModel.squareAccessToken)
                    .textFieldStyle(RoundedBorderTextFieldStyle())
                    .autocapitalization(.none)
                    .autocorrectionDisabled()
            }

            VStack(alignment: .leading, spacing: 4) {
                Text("Location ID")
                    .font(.caption)
                    .foregroundColor(.secondary)
                TextField("LXXXXXXXXX", text: $viewModel.squareLocationId)
                    .textFieldStyle(RoundedBorderTextFieldStyle())
                    .autocapitalization(.allCharacters)
                    .autocorrectionDisabled()
            }

            Text("Find these in your Square Developer Dashboard under API Access")
                .font(.caption2)
                .foregroundColor(.secondary)
        }
    }
}

// MARK: - Clover Config Fields
struct CloverConfigFields: View {
    @ObservedObject var viewModel: KOTSettingsViewModel

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            VStack(alignment: .leading, spacing: 4) {
                Text("API Token")
                    .font(.caption)
                    .foregroundColor(.secondary)
                SecureField("Your Clover API Token", text: $viewModel.cloverApiToken)
                    .textFieldStyle(RoundedBorderTextFieldStyle())
                    .autocapitalization(.none)
                    .autocorrectionDisabled()
            }

            VStack(alignment: .leading, spacing: 4) {
                Text("Merchant ID")
                    .font(.caption)
                    .foregroundColor(.secondary)
                TextField("Your Merchant ID", text: $viewModel.cloverMerchantId)
                    .textFieldStyle(RoundedBorderTextFieldStyle())
                    .autocapitalization(.allCharacters)
                    .autocorrectionDisabled()
            }

            Text("Find these in your Clover Dashboard under Account & Setup > API Tokens")
                .font(.caption2)
                .foregroundColor(.secondary)
        }
    }
}

// MARK: - Toast Config Fields (Coming Soon)
struct ToastConfigFields: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: "clock.fill")
                    .foregroundColor(.orange)
                Text("Coming Soon")
                    .fontWeight(.semibold)
            }

            Text("Toast integration requires partner API certification. We're working on getting certified.")
                .font(.caption)
                .foregroundColor(.secondary)

            Text("Contact support@dollor.ai if you need Toast integration urgently.")
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .padding()
        .background(Color.orange.opacity(0.1))
        .cornerRadius(8)
    }
}

// MARK: - KOT Settings ViewModel
class KOTSettingsViewModel: ObservableObject {
    @Published var selectedPOS: POSType = .none
    @Published var isEnabled: Bool = false
    @Published var autoPrint: Bool = true

    // Square
    @Published var squareAccessToken: String = ""
    @Published var squareLocationId: String = ""

    // Clover
    @Published var cloverApiToken: String = ""
    @Published var cloverMerchantId: String = ""

    // State
    @Published var isSaving: Bool = false
    @Published var isTesting: Bool = false
    @Published var showSuccessAlert: Bool = false
    @Published var showErrorAlert: Bool = false
    @Published var successMessage: String = ""
    @Published var errorMessage: String = ""

    private let p2pAPI = P2PAPIService.shared

    var statusDescription: String {
        if !isEnabled || selectedPOS == .none {
            return "Not configured"
        }
        return "Connected to \(selectedPOS.displayName)"
    }

    var canTest: Bool {
        switch selectedPOS {
        case .none: return false
        case .square: return !squareAccessToken.isEmpty && !squareLocationId.isEmpty
        case .clover: return !cloverApiToken.isEmpty && !cloverMerchantId.isEmpty
        case .toast: return false
        }
    }

    var canSave: Bool {
        if selectedPOS == .none {
            return true // Can save "disabled" state
        }
        return canTest
    }

    func loadSettings() {
        guard let vendorId = p2pAPI.currentVendorId else { return }

        p2pAPI.getKOTConfig(vendorId: vendorId) { [weak self] result in
            DispatchQueue.main.async {
                switch result {
                case .success(let config):
                    self?.selectedPOS = POSType(rawValue: config.integrationType) ?? .none
                    self?.isEnabled = config.enabled
                    self?.autoPrint = config.autoPrint
                    self?.squareLocationId = config.locationId ?? ""
                    self?.cloverMerchantId = config.merchantId ?? ""
                    // API keys are not returned for security
                case .failure(let error):
                    logger.debug("Failed to load KOT config: \(error)")
                }
            }
        }
    }

    func saveSettings() {
        guard let vendorId = p2pAPI.currentVendorId else {
            errorMessage = "Not logged in. Please log out and log back in."
            showErrorAlert = true
            return
        }

        isSaving = true

        var config = KOTConfigUpdate(
            integrationType: selectedPOS.rawValue,
            enabled: selectedPOS != .none,
            autoPrint: autoPrint
        )

        switch selectedPOS {
        case .square:
            config.apiKey = squareAccessToken
            config.locationId = squareLocationId
        case .clover:
            config.apiKey = cloverApiToken
            config.merchantId = cloverMerchantId
        default:
            break
        }

        p2pAPI.updateKOTConfig(vendorId: vendorId, config: config) { [weak self] result in
            DispatchQueue.main.async {
                self?.isSaving = false

                switch result {
                case .success:
                    self?.isEnabled = self?.selectedPOS != .none
                    self?.successMessage = "Kitchen printing settings saved successfully!"
                    self?.showSuccessAlert = true
                case .failure(let error):
                    self?.errorMessage = "Failed to save settings: \(error.localizedDescription)"
                    self?.showErrorAlert = true
                }
            }
        }
    }

    func testConnection() {
        guard let vendorId = p2pAPI.currentVendorId else { return }

        isTesting = true

        p2pAPI.testKOTConnection(vendorId: vendorId) { [weak self] result in
            DispatchQueue.main.async {
                self?.isTesting = false

                switch result {
                case .success(let response):
                    if response.success {
                        self?.successMessage = "Test order sent! Check your \(self?.selectedPOS.displayName ?? "POS") for the test ticket."
                        self?.showSuccessAlert = true
                    } else {
                        self?.errorMessage = response.error ?? "Test failed. Please check your credentials."
                        self?.showErrorAlert = true
                    }
                case .failure(let error):
                    self?.errorMessage = "Test failed: \(error.localizedDescription)"
                    self?.showErrorAlert = true
                }
            }
        }
    }
}

// Note: KOTConfigResponse, KOTConfigUpdate, and KOTTestResponse are defined in P2PAPIService.swift

// MARK: - Help View
struct KOTHelpView: View {
    let posType: POSType

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                // Header
                HStack {
                    Image(systemName: posType.icon)
                        .font(.largeTitle)
                        .foregroundColor(posType.color)
                    Text("\(posType.displayName) Setup Guide")
                        .font(.title2)
                        .fontWeight(.bold)
                }
                .padding(.bottom)

                switch posType {
                case .square:
                    SquareHelpContent()
                case .clover:
                    CloverHelpContent()
                case .toast:
                    ToastHelpContent()
                case .none:
                    Text("Select a POS system to see setup instructions.")
                        .foregroundColor(.secondary)
                }

                Spacer()
            }
            .padding()
        }
        .navigationTitle("Setup Guide")
        .navigationBarTitleDisplayMode(.inline)
    }
}

struct SquareHelpContent: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            HelpStep(number: 1, title: "Go to Square Developer Dashboard", description: "Visit developer.squareup.com and sign in with your Square account")

            HelpStep(number: 2, title: "Create an Application", description: "Click 'Create Application' and give it a name like 'Dollor Kitchen Printer'")

            HelpStep(number: 3, title: "Get Your Access Token", description: "Go to Credentials > Production > Access Token. Copy this token.")

            HelpStep(number: 4, title: "Get Your Location ID", description: "Go to Locations and copy the Location ID for your restaurant.")

            HelpStep(number: 5, title: "Configure Printing", description: "In Square Dashboard, go to Devices > Printers and ensure your kitchen printer is set up.")

            Divider()

            Text("Note: New orders from Dollor will appear in your Square Orders list and can be sent to your kitchen printer automatically.")
                .font(.caption)
                .foregroundColor(.secondary)
        }
    }
}

struct CloverHelpContent: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            HelpStep(number: 1, title: "Log into Clover Dashboard", description: "Go to clover.com and sign in to your merchant account")

            HelpStep(number: 2, title: "Navigate to API Tokens", description: "Go to Account & Setup > API Tokens")

            HelpStep(number: 3, title: "Create a Token", description: "Click 'Create Token' and select permissions for Orders and Inventory")

            HelpStep(number: 4, title: "Copy Your Merchant ID", description: "Your Merchant ID is shown at the top of the dashboard")

            HelpStep(number: 5, title: "Set Up Kitchen Printing", description: "On your Clover device, configure the printer settings in Settings > Printers")

            Divider()

            Text("Note: Orders will appear on your Clover device and can trigger kitchen prints based on your Clover settings.")
                .font(.caption)
                .foregroundColor(.secondary)
        }
    }
}

struct ToastHelpContent: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack {
                Image(systemName: "clock.fill")
                    .foregroundColor(.orange)
                Text("Coming Soon")
                    .font(.headline)
            }

            Text("Toast integration requires partner API certification from Toast. We are currently in the process of getting certified.")
                .foregroundColor(.secondary)

            Text("If you urgently need Toast integration, please contact us at support@dollor.ai and we'll prioritize your request.")
                .foregroundColor(.secondary)
        }
    }
}

struct HelpStep: View {
    let number: Int
    let title: String
    let description: String

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            ZStack {
                Circle()
                    .fill(Color.green)
                    .frame(width: 28, height: 28)
                Text("\(number)")
                    .font(.caption)
                    .fontWeight(.bold)
                    .foregroundColor(.white)
            }

            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.subheadline)
                    .fontWeight(.semibold)
                Text(description)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
        }
    }
}

#Preview {
    KOTSettingsView()
}
