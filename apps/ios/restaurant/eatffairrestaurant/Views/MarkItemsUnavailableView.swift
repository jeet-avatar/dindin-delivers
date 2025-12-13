import SwiftUI
import EatFairShared

/// View for restaurant to mark specific order items as unavailable
/// Part of the partial order flow - allows restaurants to indicate stock issues
struct MarkItemsUnavailableView: View {
    let order: Order
    let onDismiss: () -> Void
    let onSuccess: () -> Void

    @State private var selectedItems: Set<String> = []
    @State private var unavailabilityReasons: [String: String] = [:]
    @State private var restaurantNote: String = ""
    @State private var isProcessing = false
    @State private var errorMessage: String?
    @State private var showConfirmation = false

    private let reasons = [
        "out_of_stock": "Out of Stock",
        "ingredient_unavailable": "Ingredient Unavailable",
        "equipment_issue": "Equipment Issue",
        "too_busy": "Kitchen Too Busy",
        "other": "Other"
    ]

    var body: some View {
        NavigationView {
            ZStack {
                Color(.systemGroupedBackground)
                    .ignoresSafeArea()

                ScrollView {
                    VStack(spacing: 20) {
                        // Header Info
                        headerSection

                        // Order Items to Select
                        itemsSection

                        // Note to Customer
                        noteSection

                        // Action Buttons
                        actionSection
                    }
                    .padding()
                }
            }
            .navigationTitle("Mark Unavailable")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") {
                        onDismiss()
                    }
                }
            }
            .alert("Confirm Unavailable Items", isPresented: $showConfirmation) {
                Button("Cancel", role: .cancel) { }
                Button("Notify Customer", role: .destructive) {
                    submitUnavailableItems()
                }
            } message: {
                Text("The customer will be notified and given 10 minutes to accept the modified order or request a full refund. Are you sure?")
            }
        }
    }

    // MARK: - Subviews

    private var headerSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Image(systemName: "exclamationmark.triangle.fill")
                    .foregroundColor(.orange)
                    .font(.title2)

                VStack(alignment: .leading) {
                    Text("Select Unavailable Items")
                        .font(.headline)
                    Text("Tap items you cannot fulfill")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                Spacer()
            }

            Text("Order #\(order.id?.prefix(8).uppercased() ?? "----")")
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .padding()
        .background(Color.orange.opacity(0.1))
        .cornerRadius(12)
    }

    private var itemsSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("ORDER ITEMS")
                .font(.caption)
                .fontWeight(.bold)
                .foregroundColor(.secondary)

            ForEach(Array(order.items.enumerated()), id: \.element.id) { index, item in
                ItemSelectionRow(
                    item: item,
                    itemIndex: index,
                    isSelected: selectedItems.contains(item.id ?? "\(index)"),
                    selectedReason: unavailabilityReasons[item.id ?? "\(index)"] ?? "out_of_stock",
                    reasons: reasons,
                    onToggle: {
                        toggleItem(item, index: index)
                    },
                    onReasonChange: { reason in
                        unavailabilityReasons[item.id ?? "\(index)"] = reason
                    }
                )
            }
        }
    }

    private var noteSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("NOTE TO CUSTOMER (Optional)")
                .font(.caption)
                .fontWeight(.bold)
                .foregroundColor(.secondary)

            TextField("e.g., Sorry, we ran out of this ingredient today", text: $restaurantNote, axis: .vertical)
                .lineLimit(2...4)
                .textFieldStyle(.roundedBorder)
        }
    }

    private var actionSection: some View {
        VStack(spacing: 12) {
            if let error = errorMessage {
                Text(error)
                    .font(.caption)
                    .foregroundColor(.red)
                    .multilineTextAlignment(.center)
            }

            // Summary
            if !selectedItems.isEmpty {
                HStack {
                    Text("\(selectedItems.count) item(s) marked unavailable")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                    Spacer()
                }
            }

            Button {
                showConfirmation = true
            } label: {
                HStack {
                    if isProcessing {
                        ProgressView()
                            .tint(.white)
                    }
                    Text("Notify Customer")
                        .fontWeight(.semibold)
                }
                .frame(maxWidth: .infinity)
                .padding()
                .background(selectedItems.isEmpty ? Color.gray : Color.orange)
                .foregroundColor(.white)
                .cornerRadius(12)
            }
            .disabled(selectedItems.isEmpty || isProcessing)

            Button {
                onDismiss()
            } label: {
                Text("Accept Full Order Instead")
                    .fontWeight(.medium)
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color(.secondarySystemGroupedBackground))
                    .foregroundColor(.green)
                    .cornerRadius(12)
            }
            .disabled(isProcessing)
        }
    }

    // MARK: - Helper Functions

    private func toggleItem(_ item: OrderItem, index: Int) {
        let itemId = item.id ?? "\(index)"
        if selectedItems.contains(itemId) {
            selectedItems.remove(itemId)
            unavailabilityReasons.removeValue(forKey: itemId)
        } else {
            selectedItems.insert(itemId)
            if unavailabilityReasons[itemId] == nil {
                unavailabilityReasons[itemId] = "out_of_stock"
            }
        }
    }

    private func submitUnavailableItems() {
        guard !selectedItems.isEmpty else { return }

        isProcessing = true
        errorMessage = nil

        // Build unavailable items array
        var unavailableItems: [[String: Any]] = []

        for (index, item) in order.items.enumerated() {
            let itemId = item.id ?? "\(index)"
            if selectedItems.contains(itemId) {
                unavailableItems.append([
                    "item_index": index,
                    "menu_item_id": Int(item.menuItemId) ?? 0,
                    "name": item.name,
                    "quantity": item.quantity,
                    "price": item.price,
                    "reason": unavailabilityReasons[itemId] ?? "out_of_stock"
                ])
            }
        }

        // Get order ID as Int (extract from string if needed)
        let orderId = Int(order.id?.replacingOccurrences(of: "EF-", with: "").prefix(8) ?? "0") ?? 0

        P2PAPIService.shared.markItemsUnavailable(
            orderId: orderId,
            unavailableItems: unavailableItems,
            restaurantNote: restaurantNote.isEmpty ? nil : restaurantNote
        ) { result in
            isProcessing = false
            switch result {
            case .success(let response):
                if response.success {
                    onSuccess()
                } else {
                    errorMessage = response.message ?? "Failed to mark items unavailable"
                }
            case .failure(let error):
                errorMessage = error.localizedDescription
            }
        }
    }
}

// MARK: - Item Selection Row

struct ItemSelectionRow: View {
    let item: OrderItem
    let itemIndex: Int
    let isSelected: Bool
    let selectedReason: String
    let reasons: [String: String]
    let onToggle: () -> Void
    let onReasonChange: (String) -> Void

    var body: some View {
        VStack(spacing: 8) {
            Button(action: onToggle) {
                HStack {
                    // Checkbox
                    Image(systemName: isSelected ? "checkmark.circle.fill" : "circle")
                        .foregroundColor(isSelected ? .red : .gray)
                        .font(.title2)

                    // Item Details
                    VStack(alignment: .leading, spacing: 2) {
                        Text("\(item.quantity)x \(item.name)")
                            .font(.body)
                            .foregroundColor(isSelected ? .secondary : .primary)
                            .strikethrough(isSelected)

                        if let options = item.options, !options.isEmpty {
                            Text(options.joined(separator: ", "))
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                    }

                    Spacer()

                    // Price
                    Text("$\(item.price * Double(item.quantity), specifier: "%.2f")")
                        .font(.subheadline)
                        .foregroundColor(isSelected ? .red : .primary)
                        .strikethrough(isSelected)
                }
                .padding()
                .background(isSelected ? Color.red.opacity(0.1) : Color(.secondarySystemGroupedBackground))
                .cornerRadius(10)
            }
            .buttonStyle(.plain)

            // Reason Picker (shown when selected)
            if isSelected {
                Picker("Reason", selection: Binding(
                    get: { selectedReason },
                    set: { onReasonChange($0) }
                )) {
                    ForEach(Array(reasons.keys.sorted()), id: \.self) { key in
                        Text(reasons[key] ?? key).tag(key)
                    }
                }
                .pickerStyle(.segmented)
                .padding(.horizontal)
            }
        }
    }
}

// Preview removed - Order model is complex and requires many fields
