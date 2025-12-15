//
//  CreatePromotionView.swift
//  eatffairrestaurant
//
//  Created by EatFair
//  Form to create new promotions
//

import SwiftUI
import EatFairShared

struct CreatePromotionView: View {
    @Environment(\.dismiss) var dismiss
    @ObservedObject var viewModel: PromotionsViewModel
    
    let restaurantId: String
    
    @State private var code = ""
    @State private var title = ""
    @State private var description = ""
    @State private var discountType = "percentage"
    @State private var discountValue = ""
    @State private var maxDiscount = ""
    @State private var minimumOrder = ""
    @State private var applicableOn = "subtotal"
    @State private var maxUsagePerUser = ""
    @State private var totalUsageLimit = ""
    @State private var startDate = Date()
    @State private var endDate = Date().addingTimeInterval(30 * 24 * 60 * 60) // 30 days
    @State private var isActive = true
    
    @State private var showingAlert = false
    @State private var alertMessage = ""
    
    var body: some View {
        NavigationView {
            Form {
                // Basic Info
                Section("Basic Information") {
                    TextField("Code (e.g., SAVE20)", text: $code)
                        .textInputAutocapitalization(.characters)
                    
                    TextField("Title", text: $title)
                    
                    TextField("Description", text: $description, axis: .vertical)
                        .lineLimit(3...5)
                }
                
                // Discount Settings
                Section("Discount Details") {
                    Picker("Type", selection: $discountType) {
                        Text("Percentage").tag("percentage")
                        Text("Fixed Amount").tag("fixed")
                    }
                    
                    HStack {
                        if discountType == "percentage" {
                            TextField("Value (e.g., 20)", text: $discountValue)
                                .keyboardType(.decimalPad)
                            Text("%")
                        } else {
                            Text("$")
                            TextField("Value (e.g., 5.00)", text: $discountValue)
                                .keyboardType(.decimalPad)
                        }
                    }
                    
                    if discountType == "percentage" {
                        HStack {
                            Text("$")
                            TextField("Max Discount (optional)", text: $maxDiscount)
                                .keyboardType(.decimalPad)
                        }
                    }
                }
                
                // Conditions
                Section("Conditions") {
                    HStack {
                        Text("$")
                        TextField("Minimum Order", text: $minimumOrder)
                            .keyboardType(.decimalPad)
                    }
                    
                    Picker("Apply To", selection: $applicableOn) {
                        Text("Subtotal").tag("subtotal")
                        Text("Delivery Fee").tag("delivery")
                        Text("Total").tag("total")
                    }
                }
                
                // Usage Limits
                Section("Usage Limits") {
                    HStack {
                        TextField("Max per user (optional)", text: $maxUsagePerUser)
                            .keyboardType(.numberPad)
                        Text("uses")
                    }
                    
                    HStack {
                        TextField("Total limit (optional)", text: $totalUsageLimit)
                            .keyboardType(.numberPad)
                        Text("uses")
                    }
                }
                
                // Validity Period
                Section("Validity Period") {
                    DatePicker("Start Date", selection: $startDate, displayedComponents: .date)
                    DatePicker("End Date", selection: $endDate, displayedComponents: .date)
                }
                
                // Status
                Section {
                    Toggle("Active", isOn: $isActive)
                }
            }
            .navigationTitle("Create Promotion")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
                
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Create") {
                        createPromotion()
                    }
                    .disabled(!isFormValid)
                }
            }
            .alert("Error", isPresented: $showingAlert) {
                Button("OK", role: .cancel) {}
            } message: {
                Text(alertMessage)
            }
        }
    }
    
    private var isFormValid: Bool {
        !code.isEmpty && !title.isEmpty && !discountValue.isEmpty && !minimumOrder.isEmpty
    }
    
    private func createPromotion() {
        guard let discountVal = Double(discountValue),
              let minOrder = Double(minimumOrder) else {
            alertMessage = "Please enter valid numbers"
            showingAlert = true
            return
        }
        
        let promotion = Promotion(
            id: UUID().uuidString,
            restaurantId: restaurantId,
            code: code.uppercased(),
            title: title,
            description: description,
            discountType: discountType,
            discountValue: discountVal,
            maxDiscount: Double(maxDiscount),
            minimumOrder: minOrder,
            applicableOn: applicableOn,
            maxUsagePerUser: Int(maxUsagePerUser) ?? 1,
            totalUsageLimit: totalUsageLimit.isEmpty ? nil : Int(totalUsageLimit),
            startDate: Int64(startDate.timeIntervalSince1970 * 1000),
            endDate: Int64(endDate.timeIntervalSince1970 * 1000),
            isActive: isActive,
            usageCount: 0
        )
        
        viewModel.createPromotion(promotion) { success in
            if success {
                dismiss()
            } else {
                alertMessage = "Failed to create promotion"
                showingAlert = true
            }
        }
    }
}
