//
//  TipDriverView.swift
//  eatfaircustomer
//
//  Created by EatFair
//  Tip selection view with preset percentages and custom amount
//

import SwiftUI
import Combine
import FirebaseFirestore
import EatFairShared

struct TipDriverView: View {
    @Environment(\.dismiss) var dismiss
    @StateObject private var viewModel: TipDriverViewModel
    
    let order: Order
    
    init(order: Order) {
        self.order = order
        self._viewModel = StateObject(wrappedValue: TipDriverViewModel(order: order))
    }
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 24) {
                    // Header
                    VStack(spacing: 12) {
                        Image(systemName: "heart.circle.fill")
                            .resizable()
                            .frame(width: 60, height: 60)
                            .foregroundColor(.pink)
                        
                        Text("Add Tip for \(order.driverName ?? "Driver")")
                            .font(.title2)
                            .fontWeight(.bold)
                        
                        Text("100% of your tip goes to your driver")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                    }
                    .padding(.top)
                    
                    // Order Total
                    HStack {
                        Text("Order Total")
                        Spacer()
                        Text("$\(String(format: "%.2f", order.total))")
                            .fontWeight(.bold)
                    }
                    .padding()
                    .background(Color(.systemGray6))
                    .cornerRadius(8)
                    
                    // Preset Tips
                    VStack(spacing: 12) {
                        Text("Select Tip")
                            .font(.headline)
                            .frame(maxWidth: .infinity, alignment: .leading)
                        
                        LazyVGrid(columns: [
                            GridItem(.flexible()),
                            GridItem(.flexible())
                        ], spacing: 12) {
                            ForEach(viewModel.suggestedTips, id: \.percentage) { suggestion in
                                TipButton(
                                    percentage: suggestion.percentage,
                                    amount: suggestion.amount,
                                    isSelected: viewModel.selectedPercentage == suggestion.percentage && !viewModel.isCustomAmount
                                ) {
                                    viewModel.selectPresetTip(percentage: suggestion.percentage, amount: suggestion.amount)
                                }
                            }
                        }
                    }
                    
                    // Custom Amount
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Custom Amount")
                            .font(.headline)
                        
                        HStack {
                            Text("$")
                                .font(.title2)
                                .foregroundColor(.secondary)
                            
                            TextField("0.00", text: $viewModel.customAmount)
                                .keyboardType(.decimalPad)
                                .font(.title2)
                                .onChange(of: viewModel.customAmount) {
                                    viewModel.isCustomAmount = true
                                    viewModel.selectedPercentage = nil
                                }
                        }
                        .padding()
                        .background(Color(.systemGray6))
                        .cornerRadius(8)
                        .overlay(
                            RoundedRectangle(cornerRadius: 8)
                                .stroke(viewModel.isCustomAmount ? Color.blue : Color.clear, lineWidth: 2)
                        )
                    }
                    
                    // No Tip Option
                    Button {
                        viewModel.selectNoTip()
                    } label: {
                        Text("No Tip")
                            .foregroundColor(.secondary)
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(Color(.systemGray6))
                            .cornerRadius(8)
                    }
                    
                    Divider()
                    
                    // Total with Tip
                    HStack {
                        Text("Total with Tip")
                            .font(.headline)
                        Spacer()
                        Text("$\(String(format: "%.2f", viewModel.totalWithTip))")
                            .font(.title2)
                            .fontWeight(.bold)
                            .foregroundColor(.green)
                    }
                    .padding()
                    .background(Color.green.opacity(0.1))
                    .cornerRadius(8)
                    
                    // Submit Button
                    Button {
                        viewModel.submitTip()
                        dismiss()
                    } label: {
                        Text("Confirm Tip")
                            .font(.headline)
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(Color.blue)
                            .cornerRadius(12)
                    }
                    
                    Spacer()
                }
                .padding()
            }
            .navigationTitle("Add Tip")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
            }
        }
    }
}

// MARK: - Tip Button
struct TipButton: View {
    let percentage: Double
    let amount: Double
    let isSelected: Bool
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            VStack(spacing: 4) {
                Text("\(Int(percentage))%")
                    .font(.title2)
                    .fontWeight(.bold)
                
                Text("$\(String(format: "%.2f", amount))")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
            }
            .frame(maxWidth: .infinity)
            .padding()
            .background(isSelected ? Color.blue : Color(.systemGray6))
            .foregroundColor(isSelected ? .white : .primary)
            .cornerRadius(12)
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(isSelected ? Color.blue : Color.clear, lineWidth: 2)
            )
        }
    }
}

// MARK: - ViewModel
class TipDriverViewModel: ObservableObject {
    @Published var selectedPercentage: Double?
    @Published var customAmount: String = ""
    @Published var isCustomAmount: Bool = false
    @Published var tipAmount: Double = 0.0
    
    let order: Order
    private let db = Firestore.firestore()
    
    init(order: Order) {
        self.order = order
    }
    
    var suggestedTips: [(percentage: Double, amount: Double)] {
        TipCalculator.suggestedTips(orderTotal: order.total)
    }
    
    var totalWithTip: Double {
        order.total + tipAmount
    }
    
    func selectPresetTip(percentage: Double, amount: Double) {
        selectedPercentage = percentage
        isCustomAmount = false
        customAmount = ""
        tipAmount = amount
    }
    
    func selectNoTip() {
        selectedPercentage = nil
        isCustomAmount = false
        customAmount = ""
        tipAmount = 0.0
    }
    
    func submitTip() {
        guard let orderId = order.id,
              let driverId = order.driverId else { return }
        
        // Parse custom amount if selected
        if isCustomAmount, let amount = Double(customAmount) {
            tipAmount = amount
        }
        
        let tipType: String
        if isCustomAmount {
            tipType = "custom"
        } else if selectedPercentage != nil {
            tipType = "percentage"
        } else {
            tipType = "none"
        }
        
        let tip = Tip(
            id: UUID().uuidString,
            orderId: orderId,
            customerId: order.customerId,
            driverId: driverId,
            amount: tipAmount,
            tipType: tipType,
            percentage: selectedPercentage,
            driverThankYouMessage: nil,
            driverThankedAt: nil,
            createdAt: Int64(Date().timeIntervalSince1970 * 1000)
        )
        
        do {
            try db.collection("tips").document(tip.id ?? UUID().uuidString).setData(from: tip)
            
            // Update order
            let tipPercentageValue: Double = selectedPercentage ?? 0.0
            db.collection("orders").document(orderId).updateData([
                "tip": tipAmount,
                "tipPercentage": tipPercentageValue,
                "isTipped": true
            ])
            
            // Update driver's earnings
            updateDriverEarnings(driverId: driverId, tipAmount: tipAmount)
        } catch {
            print("Error saving tip: \(error)")
        }
    }
    
    private func updateDriverEarnings(driverId: String, tipAmount: Double) {
        db.collection("drivers").document(driverId).getDocument { document, error in
            if let data = document?.data(),
               let stats = data["stats"] as? [String: Any],
               let currentEarnings = stats["totalEarnings"] as? Double {
                
                self.db.collection("drivers").document(driverId).updateData([
                    "stats.totalEarnings": currentEarnings + tipAmount
                ])
            }
        }
    }
}
