//
//  PromotionsView.swift
//  eatffairrestaurant
//
//  Created by EatFair
//  Main promotions list view for restaurants
//

import SwiftUI
import EatFairShared

struct PromotionsView: View {
    @StateObject private var viewModel = PromotionsViewModel()
    @State private var showingCreatePromotion = false
    
    let restaurantId: String
    
    var body: some View {
        NavigationView {
            ZStack {
                if viewModel.isLoading {
                    ProgressView()
                } else if viewModel.promotions.isEmpty {
                    emptyState
                } else {
                    promotionsList
                }
            }
            .navigationTitle("Promotions")
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button {
                        showingCreatePromotion = true
                    } label: {
                        Image(systemName: "plus.circle.fill")
                            .font(.title3)
                    }
                }
            }
            .sheet(isPresented: $showingCreatePromotion) {
                CreatePromotionView(
                    viewModel: viewModel,
                    restaurantId: restaurantId
                )
            }
            .onAppear {
                viewModel.fetchPromotions(restaurantId: restaurantId)
            }
        }
    }
    
    private var emptyState: some View {
        VStack(spacing: 16) {
            Image(systemName: "tag.slash")
                .font(.system(size: 60))
                .foregroundColor(.gray)
            
            Text("No Promotions Yet")
                .font(.title2)
                .fontWeight(.bold)
            
            Text("Create your first promotion to attract more customers")
                .font(.subheadline)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal)
            
            Button {
                showingCreatePromotion = true
            } label: {
                Text("Create Promotion")
                    .font(.headline)
                    .foregroundColor(.white)
                    .padding()
                    .background(Color.blue)
                    .cornerRadius(12)
            }
        }
    }
    
    private var promotionsList: some View {
        List {
            ForEach(viewModel.promotions) { promotion in
                PromotionRow(
                    promotion: promotion,
                    viewModel: viewModel
                )
            }
        }
        .listStyle(.plain)
    }
}

// MARK: - Promotion Row
struct PromotionRow: View {
    let promotion: Promotion
    @ObservedObject var viewModel: PromotionsViewModel
    
    @State private var usageCount: Int = 0
    @State private var totalDiscount: Double = 0.0
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text(promotion.code)
                        .font(.headline)
                        .foregroundColor(.blue)
                    
                    Text(promotion.title)
                        .font(.subheadline)
                }
                
                Spacer()
                
                Toggle("", isOn: .init(
                    get: { promotion.isActive },
                    set: { _ in viewModel.togglePromotionStatus(promotion) }
                ))
                .labelsHidden()
            }
            
            // Discount Info
            HStack {
                Label(
                    discountText,
                    systemImage: "tag.fill"
                )
                .font(.subheadline)
                .foregroundColor(.green)
                
                Spacer()
                
                if promotion.minimumOrder > 0 {
                    Text("Min: $\(String(format: "%.2f", promotion.minimumOrder))")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
            
            // Usage Stats
            HStack {
                Label("\(usageCount) uses", systemImage: "chart.bar.fill")
                    .font(.caption)
                    .foregroundColor(.secondary)
                
                Spacer()
                
                Text("Saved: $\(String(format: "%.2f", totalDiscount))")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            
            // Validity
            HStack {
                Image(systemName: isExpired ? "exclamationmark.circle.fill" : "clock")
                    .foregroundColor(isExpired ? .red : .secondary)
                
                Text(validityText)
                    .font(.caption)
                    .foregroundColor(isExpired ? .red : .secondary)
            }
        }
        .padding()
        .background(promotion.isActive ? Color.green.opacity(0.05) : Color.gray.opacity(0.05))
        .cornerRadius(12)
        .onAppear {
            guard let promotionId = promotion.id else { return }
            viewModel.fetchPromotionUsage(promotionId: promotionId) { count, discount in
                usageCount = count
                totalDiscount = discount
            }
        }
    }
    
    private var discountText: String {
        if promotion.discountType == "percentage" {
            return "\(Int(promotion.discountValue))% Off"
        } else {
            return "$\(String(format: "%.2f", promotion.discountValue)) Off"
        }
    }
    
    private var isExpired: Bool {
        Date(timeIntervalSince1970: TimeInterval(promotion.endDate / 1000)) < Date()
    }
    
    private var validityText: String {
        let endDate = Date(timeIntervalSince1970: TimeInterval(promotion.endDate / 1000))
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        
        if isExpired {
            return "Expired on \(formatter.string(from: endDate))"
        } else {
            return "Valid until \(formatter.string(from: endDate))"
        }
    }
}
