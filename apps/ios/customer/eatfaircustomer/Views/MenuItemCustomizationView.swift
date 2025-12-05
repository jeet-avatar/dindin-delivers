import SwiftUI
import EatFairShared

struct MenuItemCustomizationView: View {
    let item: MenuItem
    let restaurant: Restaurant
    @ObservedObject var multiCartViewModel: MultiRestaurantCartViewModel
    @Binding var isPresented: Bool

    @State private var quantity = 1
    @State private var specialInstructions = ""
    @State private var selectedOptions: [String: Set<String>] = [:] // customizationName -> selected options
    @State private var showCartFullError = false

    // Customizations are now fetched from the P2P backend dynamically
    // No more hardcoded fallbacks - each menu item has its own customizations
    private var customizations: [MenuItemCustomization] {
        item.customizations ?? []
    }

    // Check if item has any customizations
    private var hasCustomizations: Bool {
        !customizations.isEmpty
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 0) {
                    // Item Header
                    itemHeader

                    // Customizations
                    VStack(spacing: 16) {
                        ForEach(customizations) { customization in
                            CustomizationSection(
                                customization: customization,
                                selectedOptions: Binding(
                                    get: { selectedOptions[customization.name] ?? [] },
                                    set: { selectedOptions[customization.name] = $0 }
                                )
                            )
                        }

                        // Special Instructions
                        specialInstructionsSection

                        // Quantity
                        quantitySection
                    }
                    .padding()
                }
            }
            .background(Color(.systemGray6))
            .safeAreaInset(edge: .bottom) {
                addToCartButton
            }
            .navigationTitle("Customize")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button(action: { isPresented = false }) {
                        Image(systemName: "xmark")
                            .foregroundColor(.primary)
                    }
                }
            }
        }
        .onAppear {
            initializeDefaultSelections()
        }
        .alert("Cart Full", isPresented: $showCartFullError) {
            Button("OK", role: .cancel) { }
        } message: {
            Text("You can order from up to 3 restaurants. Remove items from another restaurant first.")
        }
    }

    // MARK: - Item Header
    private var itemHeader: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Image placeholder
            ZStack {
                Rectangle()
                    .fill(Color.gray.opacity(0.2))
                    .frame(height: 200)

                Image(systemName: "fork.knife")
                    .font(.system(size: 50))
                    .foregroundColor(.gray)
            }

            VStack(alignment: .leading, spacing: 8) {
                Text(item.name)
                    .font(.title2)
                    .fontWeight(.bold)

                Text(item.description)
                    .font(.subheadline)
                    .foregroundColor(.secondary)

                HStack {
                    Text("$\(String(format: "%.2f", item.price))")
                        .font(.title3)
                        .fontWeight(.semibold)
                        .foregroundColor(Theme.brandGreen)

                    if let prepTime = item.preparationTime {
                        Text("•")
                            .foregroundColor(.gray)
                        HStack(spacing: 4) {
                            Image(systemName: "clock")
                            Text("\(prepTime) min")
                        }
                        .font(.caption)
                        .foregroundColor(.secondary)
                    }
                }
            }
            .padding()
        }
        .background(Color.white)
    }

    // MARK: - Special Instructions
    private var specialInstructionsSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Image(systemName: "pencil.and.ellipsis.rectangle")
                    .foregroundColor(.secondary)
                Text("Special Instructions")
                    .font(.headline)
            }

            TextEditor(text: $specialInstructions)
                .frame(height: 80)
                .padding(8)
                .background(Color.white)
                .cornerRadius(8)
                .overlay(
                    Group {
                        if specialInstructions.isEmpty {
                            Text("Add notes (allergies, preferences, etc.)")
                                .foregroundColor(.gray.opacity(0.5))
                                .padding(12)
                        }
                    },
                    alignment: .topLeading
                )

            Text("The restaurant will try their best to accommodate your request")
                .font(.caption2)
                .foregroundColor(.secondary)
        }
        .padding()
        .background(Color.white)
        .cornerRadius(12)
    }

    // MARK: - Quantity Section
    private var quantitySection: some View {
        HStack {
            Text("Quantity")
                .font(.headline)

            Spacer()

            HStack(spacing: 0) {
                Button(action: { if quantity > 1 { quantity -= 1 } }) {
                    Image(systemName: "minus")
                        .font(.headline)
                        .foregroundColor(quantity > 1 ? Theme.brandGreen : .gray)
                        .frame(width: 44, height: 44)
                        .background(Color(.systemGray6))
                }

                Text("\(quantity)")
                    .font(.headline)
                    .frame(width: 44)

                Button(action: { quantity += 1 }) {
                    Image(systemName: "plus")
                        .font(.headline)
                        .foregroundColor(Theme.brandGreen)
                        .frame(width: 44, height: 44)
                        .background(Color(.systemGray6))
                }
            }
            .cornerRadius(8)
        }
        .padding()
        .background(Color.white)
        .cornerRadius(12)
    }

    // MARK: - Add to Cart Button
    private var addToCartButton: some View {
        VStack(spacing: 0) {
            Divider()

            Button(action: addToCart) {
                HStack {
                    Text("Add \(quantity) to Cart")
                        .fontWeight(.bold)

                    Spacer()

                    Text("$\(String(format: "%.2f", totalPrice))")
                        .fontWeight(.bold)
                }
                .foregroundColor(.white)
                .padding()
                .background(canAddToCart ? Theme.brandGreen : Color.gray)
                .cornerRadius(12)
            }
            .disabled(!canAddToCart)
            .padding()
        }
        .background(Color.white)
    }

    // MARK: - Computed Properties
    private var additionalPrice: Double {
        var total = 0.0
        for (customizationName, options) in selectedOptions {
            if let customization = customizations.first(where: { $0.name == customizationName }) {
                for optionName in options {
                    if let option = customization.options.first(where: { $0.name == optionName }) {
                        total += option.price
                    }
                }
            }
        }
        return total
    }

    private var totalPrice: Double {
        (item.price + additionalPrice) * Double(quantity)
    }

    private var canAddToCart: Bool {
        // Check all required customizations are selected
        for customization in customizations where customization.required {
            let selected = selectedOptions[customization.name] ?? []
            if selected.isEmpty {
                return false
            }
        }
        return true
    }

    // MARK: - Actions
    private func initializeDefaultSelections() {
        for customization in customizations {
            var defaults: Set<String> = []
            for option in customization.options where option.isDefault == true {
                defaults.insert(option.name)
            }
            if !defaults.isEmpty {
                selectedOptions[customization.name] = defaults
            }
        }
    }

    private func addToCart() {
        var newItem = item

        // Build selected customizations
        var selectedCustomizations: [SelectedCustomization] = []
        for (customizationName, options) in selectedOptions {
            if !options.isEmpty {
                var additionalPrice = 0.0
                if let customization = customizations.first(where: { $0.name == customizationName }) {
                    for optionName in options {
                        if let option = customization.options.first(where: { $0.name == optionName }) {
                            additionalPrice += option.price
                        }
                    }
                }
                selectedCustomizations.append(SelectedCustomization(
                    customizationName: customizationName,
                    selectedOptions: Array(options),
                    additionalPrice: additionalPrice
                ))
            }
        }
        newItem.selectedCustomizations = selectedCustomizations

        // Add to cart (quantity times)
        for _ in 0..<quantity {
            let success = multiCartViewModel.addToCart(item: newItem, from: restaurant)
            if !success {
                showCartFullError = true
                return
            }
        }

        isPresented = false
    }
}

// MARK: - Customization Section
struct CustomizationSection: View {
    let customization: MenuItemCustomization
    @Binding var selectedOptions: Set<String>

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Header
            HStack {
                Text(customization.name)
                    .font(.headline)

                if customization.required {
                    Text("Required")
                        .font(.caption)
                        .foregroundColor(.white)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 2)
                        .background(Color.red)
                        .cornerRadius(4)
                }

                Spacer()

                if customization.type == .multiple, let max = customization.maxSelections {
                    Text("Select up to \(max)")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }

            // Options
            VStack(spacing: 8) {
                ForEach(customization.options) { option in
                    CustomizationOptionRow(
                        option: option,
                        isSelected: selectedOptions.contains(option.name),
                        customizationType: customization.type
                    ) {
                        toggleOption(option)
                    }
                }
            }
        }
        .padding()
        .background(Color.white)
        .cornerRadius(12)
    }

    private func toggleOption(_ option: CustomizationOption) {
        if customization.type == .single {
            // Single selection - replace
            selectedOptions = [option.name]
        } else {
            // Multiple selection - toggle
            if selectedOptions.contains(option.name) {
                selectedOptions.remove(option.name)
            } else {
                if let max = customization.maxSelections, selectedOptions.count >= max {
                    // At max - don't add
                    return
                }
                selectedOptions.insert(option.name)
            }
        }
    }
}

// MARK: - Customization Option Row
struct CustomizationOptionRow: View {
    let option: CustomizationOption
    let isSelected: Bool
    let customizationType: MenuItemCustomization.CustomizationType
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack {
                // Selection indicator
                if customizationType == .single {
                    Image(systemName: isSelected ? "circle.inset.filled" : "circle")
                        .foregroundColor(isSelected ? Theme.brandGreen : .gray)
                } else {
                    Image(systemName: isSelected ? "checkmark.square.fill" : "square")
                        .foregroundColor(isSelected ? Theme.brandGreen : .gray)
                }

                Text(option.name)
                    .foregroundColor(.primary)

                Spacer()

                if option.price > 0 {
                    Text("+$\(String(format: "%.2f", option.price))")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
            }
            .padding(.vertical, 8)
            .padding(.horizontal, 12)
            .background(isSelected ? Theme.brandGreen.opacity(0.1) : Color.clear)
            .cornerRadius(8)
        }
    }
}
