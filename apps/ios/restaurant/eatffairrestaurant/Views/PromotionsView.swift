import SwiftUI
import EatFairShared
import os

private let logger = Logger(subsystem: "com.dollorai.restaurant", category: "PromotionsView")

// MARK: - Main Promotions View

/// Full promotions management: list, create, edit, delete, toggle, AI suggestions, quick-create
struct PromotionsView: View {
    @StateObject private var viewModel = PromotionsViewModel()
    @State private var showCreateSheet = false
    @State private var editingPromotion: P2PPromotion?
    @State private var showDeleteAlert = false
    @State private var promotionToDelete: P2PPromotion?
    @State private var showSuggestionsSection = true

    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                // Stats Summary Bar
                statsSummaryBar

                // Filter Tabs
                filterTabs

                // Quick Create Templates
                quickCreateSection

                // AI Suggestions (collapsible)
                aiSuggestionsSection

                // Promotions List
                if viewModel.isLoading && viewModel.promotions.isEmpty {
                    loadingView
                } else if viewModel.filteredPromotions.isEmpty {
                    emptyStateView
                } else {
                    promotionsList
                }
            }
            .padding(.horizontal, 16)
            .padding(.bottom, 80)
        }
        .background(Color(.systemGroupedBackground))
        .refreshable {
            viewModel.fetchPromotions()
        }
        .navigationTitle("Promotions")
        .navigationBarTitleDisplayMode(.large)
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                Button(action: { showCreateSheet = true }) {
                    Image(systemName: "plus.circle.fill")
                        .font(.title3)
                        .foregroundColor(RestaurantTheme.brandOrange)
                }
            }
        }
        .sheet(isPresented: $showCreateSheet) {
            CreatePromotionSheet(viewModel: viewModel, editingPromotion: nil)
        }
        .sheet(item: $editingPromotion) { promo in
            CreatePromotionSheet(viewModel: viewModel, editingPromotion: promo)
        }
        .alert("Error", isPresented: $viewModel.showError) {
            Button("OK", role: .cancel) {}
        } message: {
            Text(viewModel.error ?? "An unknown error occurred.")
        }
        .alert("Success", isPresented: $viewModel.showSuccess) {
            Button("OK", role: .cancel) {}
        } message: {
            Text(viewModel.successMessage ?? "")
        }
        .alert("Delete Promotion?", isPresented: $showDeleteAlert) {
            Button("Cancel", role: .cancel) {}
            Button("Delete", role: .destructive) {
                if let promo = promotionToDelete {
                    viewModel.deletePromotion(id: promo.id)
                }
            }
        } message: {
            if let promo = promotionToDelete {
                Text("Are you sure you want to delete \"\(promo.name)\" (\(promo.promotionCode))? This cannot be undone.")
            }
        }
        .onAppear {
            viewModel.fetchPromotions()
            viewModel.fetchSuggestions()
            viewModel.fetchAnalytics()
        }
    }

    // MARK: - Stats Summary Bar

    private var statsSummaryBar: some View {
        HStack(spacing: 0) {
            statItem(
                value: "\(viewModel.promotions.count)",
                label: "Total",
                icon: "tag.fill"
            )
            Divider().frame(height: 40)
            statItem(
                value: "\(viewModel.activeCount)",
                label: "Active",
                icon: "checkmark.circle.fill"
            )
            Divider().frame(height: 40)
            statItem(
                value: "\(viewModel.totalRedemptions)",
                label: "Redeemed",
                icon: "arrow.triangle.2.circlepath"
            )
        }
        .padding(.vertical, 12)
        .background(
            LinearGradient(
                colors: [RestaurantTheme.brandOrange, RestaurantTheme.brandOrangeLight],
                startPoint: .leading,
                endPoint: .trailing
            )
        )
        .cornerRadius(RestaurantTheme.cornerRadiusLarge)
        .shadow(color: RestaurantTheme.brandOrange.opacity(0.3), radius: 8, y: 4)
    }

    private func statItem(value: String, label: String, icon: String) -> some View {
        VStack(spacing: 4) {
            HStack(spacing: 4) {
                Image(systemName: icon)
                    .font(.caption)
                Text(value)
                    .font(.title2.bold())
            }
            Text(label)
                .font(.caption)
                .opacity(0.85)
        }
        .foregroundColor(.white)
        .frame(maxWidth: .infinity)
    }

    // MARK: - Filter Tabs

    private var filterTabs: some View {
        Picker("Filter", selection: $viewModel.filterTab) {
            ForEach(PromotionFilter.allCases, id: \.self) { filter in
                Text(filter.rawValue).tag(filter)
            }
        }
        .pickerStyle(.segmented)
    }

    // MARK: - Quick Create Section

    private var quickCreateSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Quick Create")
                .font(.headline)
                .foregroundColor(.primary)

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 10) {
                    quickCreateButton(type: "happy_hour", label: "Happy Hour", icon: "clock.fill", color: .purple)
                    quickCreateButton(type: "lunch_special", label: "Lunch Special", icon: "sun.max.fill", color: .orange)
                    quickCreateButton(type: "first_order", label: "First Order", icon: "star.fill", color: .yellow)
                    quickCreateButton(type: "free_delivery", label: "Free Delivery", icon: "bicycle", color: .green)
                    quickCreateButton(type: "weekend", label: "Weekend Deal", icon: "calendar", color: .blue)
                }
            }
        }
        .padding(12)
        .background(Color(.systemBackground))
        .cornerRadius(RestaurantTheme.cornerRadiusMedium)
    }

    private func quickCreateButton(type: String, label: String, icon: String, color: Color) -> some View {
        Button(action: {
            viewModel.quickCreate(type: type)
        }) {
            VStack(spacing: 6) {
                Image(systemName: icon)
                    .font(.title3)
                    .foregroundColor(color)
                    .frame(width: 44, height: 44)
                    .background(color.opacity(0.15))
                    .clipShape(Circle())
                Text(label)
                    .font(.caption2)
                    .foregroundColor(.primary)
                    .lineLimit(1)
            }
            .frame(width: 80)
        }
        .disabled(viewModel.isLoading)
    }

    // MARK: - AI Suggestions Section

    private var aiSuggestionsSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Button(action: { withAnimation { showSuggestionsSection.toggle() } }) {
                HStack {
                    Image(systemName: "brain.head.profile")
                        .foregroundColor(RestaurantTheme.brandOrange)
                    Text("AI Suggestions")
                        .font(.headline)
                        .foregroundColor(.primary)
                    Spacer()
                    Image(systemName: showSuggestionsSection ? "chevron.up" : "chevron.down")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }

            if showSuggestionsSection {
                if viewModel.suggestions.isEmpty {
                    HStack {
                        Spacer()
                        VStack(spacing: 4) {
                            Image(systemName: "sparkles")
                                .font(.title3)
                                .foregroundColor(.secondary)
                            Text("No suggestions available yet")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                        Spacer()
                    }
                    .padding(.vertical, 12)
                } else {
                    ForEach(viewModel.suggestions) { suggestion in
                        SuggestionCard(
                            suggestion: suggestion,
                            onUse: {
                                editingPromotion = nil
                                showCreateSheet = true
                            }
                        )
                    }
                }
            }
        }
        .padding(12)
        .background(Color(.systemBackground))
        .cornerRadius(RestaurantTheme.cornerRadiusMedium)
    }

    // MARK: - Promotions List

    private var promotionsList: some View {
        LazyVStack(spacing: 12) {
            ForEach(viewModel.filteredPromotions) { promo in
                PromotionCard(
                    promotion: promo,
                    onToggle: { viewModel.togglePromotion(promo) },
                    onEdit: { editingPromotion = promo },
                    onDelete: {
                        promotionToDelete = promo
                        showDeleteAlert = true
                    }
                )
            }
        }
    }

    // MARK: - Empty State

    private var emptyStateView: some View {
        VStack(spacing: 16) {
            Image(systemName: "tag.slash")
                .font(.system(size: 48))
                .foregroundColor(.secondary)
            Text(emptyStateMessage)
                .font(.headline)
                .foregroundColor(.secondary)
            Text("Create your first promotion to attract more customers!")
                .font(.subheadline)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
            Button(action: { showCreateSheet = true }) {
                Label("Create Promotion", systemImage: "plus")
                    .fontWeight(.semibold)
                    .foregroundColor(.white)
                    .padding(.horizontal, 24)
                    .padding(.vertical, 12)
                    .background(RestaurantTheme.brandOrange)
                    .cornerRadius(RestaurantTheme.cornerRadiusMedium)
            }
        }
        .padding(.vertical, 40)
    }

    private var emptyStateMessage: String {
        switch viewModel.filterTab {
        case .all: return "No promotions yet"
        case .active: return "No active promotions"
        case .inactive: return "No inactive promotions"
        }
    }

    // MARK: - Loading View

    private var loadingView: some View {
        VStack(spacing: 12) {
            ProgressView()
                .tint(RestaurantTheme.brandOrange)
            Text("Loading promotions...")
                .font(.subheadline)
                .foregroundColor(.secondary)
        }
        .padding(.vertical, 40)
    }
}

// MARK: - Promotion Card

struct PromotionCard: View {
    let promotion: P2PPromotion
    let onToggle: () -> Void
    let onEdit: () -> Void
    let onDelete: () -> Void

    @State private var showCode = false

    private var isActive: Bool {
        promotion.status.lowercased() == "active"
    }

    var body: some View {
        VStack(spacing: 0) {
            // Header with gradient
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text(promotion.promotionCode)
                        .font(.title3.bold())
                        .foregroundColor(.white)
                    Text(promotion.name)
                        .font(.subheadline)
                        .foregroundColor(.white.opacity(0.9))
                }
                Spacer()
                Text(discountBadge)
                    .font(.headline.bold())
                    .foregroundColor(.white)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 6)
                    .background(Color.white.opacity(0.2))
                    .cornerRadius(8)
            }
            .padding(16)
            .background(
                LinearGradient(
                    colors: isActive
                        ? [RestaurantTheme.brandOrange, RestaurantTheme.brandOrangeLight]
                        : [Color.gray, Color.gray.opacity(0.7)],
                    startPoint: .leading,
                    endPoint: .trailing
                )
            )

            // Details
            VStack(alignment: .leading, spacing: 12) {
                if let description = promotion.description, !description.isEmpty {
                    Text(description)
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }

                // Usage count
                HStack {
                    Label("Uses", systemImage: "person.2.fill")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    Spacer()
                    Text("\(promotion.usageCount ?? 0)")
                        .font(.caption.bold())
                }

                // Date range
                HStack {
                    Label(dateRangeText, systemImage: "calendar")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    Spacer()
                    if let minOrder = promotion.minOrderAmount, minOrder > 0 {
                        Text("Min. $\(Int(minOrder))")
                            .font(.caption.bold())
                            .foregroundColor(RestaurantTheme.brandOrange)
                    }
                }

                // Status badge
                HStack {
                    statusBadge
                    Spacer()
                }

                Divider()

                // Action buttons
                HStack(spacing: 12) {
                    // Delete
                    Button(action: onDelete) {
                        Image(systemName: "trash")
                            .font(.subheadline)
                            .foregroundColor(RestaurantTheme.brandRed)
                    }

                    Spacer()

                    // Toggle (Pause/Activate)
                    Button(action: onToggle) {
                        HStack(spacing: 4) {
                            Image(systemName: isActive ? "pause.fill" : "play.fill")
                                .font(.caption)
                            Text(isActive ? "Pause" : "Activate")
                                .font(.caption.bold())
                        }
                        .foregroundColor(isActive ? RestaurantTheme.brandOrange : RestaurantTheme.brandGreen)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 6)
                        .overlay(
                            RoundedRectangle(cornerRadius: 8)
                                .stroke(isActive ? RestaurantTheme.brandOrange : RestaurantTheme.brandGreen, lineWidth: 1)
                        )
                    }

                    // Edit
                    Button(action: onEdit) {
                        HStack(spacing: 4) {
                            Image(systemName: "pencil")
                                .font(.caption)
                            Text("Edit")
                                .font(.caption.bold())
                        }
                        .foregroundColor(.white)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 6)
                        .background(RestaurantTheme.brandOrange)
                        .cornerRadius(8)
                    }
                }
            }
            .padding(16)
        }
        .background(Color(.systemBackground))
        .cornerRadius(RestaurantTheme.cornerRadiusLarge)
        .shadow(color: Color.black.opacity(0.05), radius: 4, y: 2)
    }

    private var discountBadge: String {
        switch promotion.type.lowercased() {
        case "percentage":
            return "\(Int(promotion.value))% OFF"
        case "flat_amount", "flat", "fixed":
            return "$\(Int(promotion.value)) OFF"
        case "free_delivery":
            return "FREE DELIVERY"
        default:
            return "\(Int(promotion.value))% OFF"
        }
    }

    private var dateRangeText: String {
        guard let start = promotion.startDate else { return "No dates set" }
        let startFormatted = formatShortDate(start)
        if let end = promotion.endDate {
            return "\(startFormatted) - \(formatShortDate(end))"
        }
        return "Started \(startFormatted)"
    }

    private var statusBadge: some View {
        HStack(spacing: 4) {
            Circle()
                .fill(isActive ? RestaurantTheme.brandGreen : Color.gray)
                .frame(width: 8, height: 8)
            Text(promotion.status.capitalized)
                .font(.caption2.bold())
                .foregroundColor(isActive ? RestaurantTheme.brandGreen : .gray)
        }
        .padding(.horizontal, 8)
        .padding(.vertical, 4)
        .background(isActive ? RestaurantTheme.brandGreen.opacity(0.1) : Color.gray.opacity(0.1))
        .cornerRadius(6)
    }

    private func formatShortDate(_ isoDate: String) -> String {
        let datePart = String(isoDate.prefix(10))
        let parts = datePart.split(separator: "-")
        guard parts.count == 3 else { return isoDate }
        let monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
        guard let monthIndex = Int(parts[1]), monthIndex >= 1, monthIndex <= 12 else { return isoDate }
        let month = monthNames[monthIndex - 1]
        let day = Int(parts[2]) ?? 0
        return "\(month) \(day)"
    }
}

// MARK: - AI Suggestion Card

struct SuggestionCard: View {
    let suggestion: P2PPromotionSuggestion
    let onUse: () -> Void

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: iconForType(suggestion.suggestionType))
                .font(.title3)
                .foregroundColor(RestaurantTheme.brandOrange)
                .frame(width: 40, height: 40)
                .background(RestaurantTheme.brandOrange.opacity(0.1))
                .clipShape(Circle())

            VStack(alignment: .leading, spacing: 4) {
                Text(suggestion.name)
                    .font(.subheadline.bold())
                Text(suggestion.description)
                    .font(.caption)
                    .foregroundColor(.secondary)
                    .lineLimit(2)
                if let impact = suggestion.expectedImpact {
                    Text(impact)
                        .font(.caption2)
                        .foregroundColor(RestaurantTheme.brandGreen)
                }
            }

            Spacer()

            Button("Use") {
                onUse()
            }
            .font(.caption.bold())
            .foregroundColor(.white)
            .padding(.horizontal, 12)
            .padding(.vertical, 6)
            .background(RestaurantTheme.brandOrange)
            .cornerRadius(8)
        }
        .padding(10)
        .background(RestaurantTheme.brandOrange.opacity(0.05))
        .cornerRadius(10)
    }

    private func iconForType(_ type: String) -> String {
        switch type.lowercased() {
        case "happy_hour": return "clock.fill"
        case "lunch_special": return "sun.max.fill"
        case "first_order": return "star.fill"
        case "free_delivery": return "bicycle"
        case "weekend": return "calendar"
        default: return "tag.fill"
        }
    }
}

// MARK: - Create / Edit Promotion Sheet

struct CreatePromotionSheet: View {
    @ObservedObject var viewModel: PromotionsViewModel
    let editingPromotion: P2PPromotion?
    @Environment(\.dismiss) private var dismiss

    // Form state
    @State private var promoCode = ""
    @State private var title = ""
    @State private var promoDescription = ""
    @State private var discountType = "percentage"
    @State private var discountValue = ""
    @State private var minOrderAmount = ""
    @State private var maxDiscount = ""
    @State private var usageLimit = ""
    @State private var startDate = Date()
    @State private var endDate = Date().addingTimeInterval(7 * 24 * 60 * 60) // 1 week
    @State private var hasEndDate = false

    private let discountTypes = [
        ("percentage", "Percentage"),
        ("flat_amount", "Flat Amount"),
        ("free_delivery", "Free Delivery")
    ]

    private var isEditing: Bool { editingPromotion != nil }

    private var isFormValid: Bool {
        !promoCode.isEmpty && !title.isEmpty &&
        (discountType == "free_delivery" || (Double(discountValue) ?? 0) > 0)
    }

    var body: some View {
        NavigationStack {
            Form {
                // Basic Info
                Section("Basic Information") {
                    TextField("Promo Code", text: $promoCode)
                        .textInputAutocapitalization(.characters)
                        .autocorrectionDisabled()
                    TextField("Title", text: $title)
                    TextField("Description (optional)", text: $promoDescription, axis: .vertical)
                        .lineLimit(2...4)
                }

                // Discount Type
                Section("Discount") {
                    Picker("Discount Type", selection: $discountType) {
                        ForEach(discountTypes, id: \.0) { type in
                            Text(type.1).tag(type.0)
                        }
                    }
                    .pickerStyle(.segmented)

                    if discountType != "free_delivery" {
                        HStack {
                            Text(discountType == "percentage" ? "%" : "$")
                                .foregroundColor(.secondary)
                            TextField(
                                discountType == "percentage" ? "e.g., 20" : "e.g., 5.00",
                                text: $discountValue
                            )
                            .keyboardType(.decimalPad)
                        }
                    }
                }

                // Restrictions
                Section("Restrictions") {
                    HStack {
                        Text("$")
                            .foregroundColor(.secondary)
                        TextField("Min. order amount (optional)", text: $minOrderAmount)
                            .keyboardType(.decimalPad)
                    }

                    if discountType == "percentage" {
                        HStack {
                            Text("$")
                                .foregroundColor(.secondary)
                            TextField("Max discount cap (optional)", text: $maxDiscount)
                                .keyboardType(.decimalPad)
                        }
                    }

                    TextField("Usage limit (optional)", text: $usageLimit)
                        .keyboardType(.numberPad)
                }

                // Duration
                Section("Duration") {
                    DatePicker("Start Date", selection: $startDate, displayedComponents: .date)

                    Toggle("Set End Date", isOn: $hasEndDate)
                        .tint(RestaurantTheme.brandOrange)

                    if hasEndDate {
                        DatePicker("End Date", selection: $endDate, in: startDate..., displayedComponents: .date)
                    }
                }

                // Preview
                Section("Preview") {
                    VStack(alignment: .leading, spacing: 8) {
                        Text(promoCode.isEmpty ? "PROMO_CODE" : promoCode)
                            .font(.title3.bold())
                        Text(title.isEmpty ? "Promotion Title" : title)
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                        Text(previewDiscountText)
                            .font(.subheadline.bold())
                            .foregroundColor(RestaurantTheme.brandOrange)
                    }
                    .padding(.vertical, 4)
                }

                // Save Button
                Section {
                    Button(action: savePromotion) {
                        HStack {
                            Spacer()
                            if viewModel.isLoading {
                                ProgressView()
                                    .tint(.white)
                            } else {
                                Image(systemName: isEditing ? "checkmark" : "plus.circle.fill")
                                Text(isEditing ? "Update Promotion" : "Create Promotion")
                                    .fontWeight(.semibold)
                            }
                            Spacer()
                        }
                        .foregroundColor(.white)
                        .padding(.vertical, 8)
                        .listRowBackground(
                            isFormValid ? RestaurantTheme.brandOrange : Color.gray
                        )
                    }
                    .disabled(!isFormValid || viewModel.isLoading)
                }
            }
            .navigationTitle(isEditing ? "Edit Promotion" : "Create Promotion")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") { dismiss() }
                }
            }
            .onAppear {
                if let promo = editingPromotion {
                    prefillFromPromotion(promo)
                }
            }
            .onChange(of: viewModel.showSuccess) { _, newValue in
                if newValue { dismiss() }
            }
        }
    }

    // MARK: - Preview Text

    private var previewDiscountText: String {
        switch discountType {
        case "percentage":
            let pct = discountValue.isEmpty ? "0" : discountValue
            var text = "\(pct)% off"
            if !minOrderAmount.isEmpty {
                text += " on orders $\(minOrderAmount)+"
            }
            return text
        case "flat_amount":
            let amt = discountValue.isEmpty ? "0" : discountValue
            var text = "$\(amt) off"
            if !minOrderAmount.isEmpty {
                text += " on orders $\(minOrderAmount)+"
            }
            return text
        case "free_delivery":
            var text = "Free delivery"
            if !minOrderAmount.isEmpty {
                text += " on orders $\(minOrderAmount)+"
            }
            return text
        default:
            return ""
        }
    }

    // MARK: - Save

    private func savePromotion() {
        let dateFormatter = ISO8601DateFormatter()
        dateFormatter.formatOptions = [.withFullDate]

        if isEditing, let promo = editingPromotion {
            // Update existing promotion
            var updates: [String: Any] = [
                "name": title,
                "type": discountType,
                "value": Double(discountValue) ?? 0
            ]
            if !promoDescription.isEmpty {
                updates["description"] = promoDescription
            }
            if let minOrder = Double(minOrderAmount) {
                updates["min_order_amount"] = minOrder
            }
            if let maxDisc = Double(maxDiscount) {
                updates["max_discount"] = maxDisc
            }
            if let limit = Int(usageLimit) {
                updates["usage_limit"] = limit
            }
            updates["start_date"] = dateFormatter.string(from: startDate)
            if hasEndDate {
                updates["end_date"] = dateFormatter.string(from: endDate)
            }
            viewModel.updatePromotion(id: promo.id, updates: updates)
        } else {
            // Create new promotion
            let data = P2PPromotionCreate(
                name: title,
                description: promoDescription.isEmpty ? nil : promoDescription,
                type: discountType,
                value: Double(discountValue) ?? 0,
                maxDiscount: Double(maxDiscount),
                minOrderAmount: Double(minOrderAmount),
                startDate: dateFormatter.string(from: startDate),
                endDate: hasEndDate ? dateFormatter.string(from: endDate) : nil,
                usageLimit: Int(usageLimit)
            )
            viewModel.createPromotion(data)
        }
    }

    // MARK: - Prefill for Edit

    private func prefillFromPromotion(_ promo: P2PPromotion) {
        promoCode = promo.promotionCode
        title = promo.name
        promoDescription = promo.description ?? ""
        discountType = promo.type.lowercased()
        discountValue = "\(promo.value)"
        if let minOrder = promo.minOrderAmount {
            minOrderAmount = "\(minOrder)"
        }
        if let maxDisc = promo.maxDiscount {
            maxDiscount = "\(maxDisc)"
        }
        if let start = promo.startDate {
            let formatter = ISO8601DateFormatter()
            formatter.formatOptions = [.withFullDate]
            if let date = formatter.date(from: String(start.prefix(10))) {
                startDate = date
            }
        }
        if let end = promo.endDate {
            hasEndDate = true
            let formatter = ISO8601DateFormatter()
            formatter.formatOptions = [.withFullDate]
            if let date = formatter.date(from: String(end.prefix(10))) {
                endDate = date
            }
        }
    }
}
