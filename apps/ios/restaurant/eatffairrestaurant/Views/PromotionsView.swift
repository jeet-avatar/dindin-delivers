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
            // Analytics Summary Header
            if let analytics = viewModel.analytics {
                PromotionAnalyticsSummary(analytics: analytics)
                    .listRowInsets(EdgeInsets())
                    .listRowBackground(Color.clear)
            }

            // AI Suggestions Section
            if !viewModel.suggestions.isEmpty {
                Section {
                    ForEach(viewModel.suggestions, id: \.suggestionType) { suggestion in
                        AISuggestionRow(
                            suggestion: suggestion,
                            isCreating: viewModel.isCreating
                        ) {
                            viewModel.quickCreateFromSuggestion(suggestion) { _ in }
                        }
                    }
                } header: {
                    HStack {
                        Image(systemName: "sparkles")
                        Text("AI Suggestions")
                    }
                    .font(.subheadline)
                    .foregroundColor(.purple)
                }
            }

            // Promotions List
            Section {
                ForEach(viewModel.promotions) { promotion in
                    PromotionRow(
                        promotion: promotion,
                        viewModel: viewModel
                    )
                }
            } header: {
                if !viewModel.promotions.isEmpty {
                    Text("Your Promotions")
                        .font(.subheadline)
                }
            }
        }
        .listStyle(.plain)
    }
}

// MARK: - Promotion Analytics Summary
struct PromotionAnalyticsSummary: View {
    let analytics: P2PPromotionAnalytics

    var body: some View {
        VStack(spacing: 16) {
            HStack {
                Text("Promotion Performance")
                    .font(.headline)
                Spacer()
            }

            LazyVGrid(columns: [
                GridItem(.flexible()),
                GridItem(.flexible())
            ], spacing: 12) {
                AnalyticsMetricCard(
                    title: "Total Promotions",
                    value: "\(analytics.totalPromotions)",
                    icon: "tag.fill",
                    color: .blue
                )

                AnalyticsMetricCard(
                    title: "Active",
                    value: "\(analytics.activePromotions)",
                    icon: "checkmark.circle.fill",
                    color: .green
                )

                AnalyticsMetricCard(
                    title: "Redemptions",
                    value: "\(analytics.totalRedemptions)",
                    icon: "cart.fill",
                    color: .orange
                )

                AnalyticsMetricCard(
                    title: "Discount Given",
                    value: "$\(String(format: "%.0f", analytics.totalDiscountGiven))",
                    icon: "dollarsign.circle.fill",
                    color: .purple
                )
            }

            // Additional metrics
            if let avgOrder = analytics.averageOrderValueWithPromo, avgOrder > 0 {
                HStack {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Avg Order w/ Promo")
                            .font(.caption)
                            .foregroundColor(.secondary)
                        Text("$\(String(format: "%.2f", avgOrder))")
                            .font(.subheadline)
                            .fontWeight(.semibold)
                            .foregroundColor(.green)
                    }

                    Spacer()

                    if let conversion = analytics.conversionRate, conversion > 0 {
                        VStack(alignment: .trailing, spacing: 4) {
                            Text("Conversion Rate")
                                .font(.caption)
                                .foregroundColor(.secondary)
                            Text("\(String(format: "%.1f", conversion * 100))%")
                                .font(.subheadline)
                                .fontWeight(.semibold)
                                .foregroundColor(.blue)
                        }
                    }
                }
                .padding(.top, 8)
            }
        }
        .padding()
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(Color(.systemBackground))
                .shadow(color: .black.opacity(0.05), radius: 4, x: 0, y: 2)
        )
        .padding(.horizontal)
        .padding(.vertical, 8)
    }
}

// MARK: - Analytics Metric Card
struct AnalyticsMetricCard: View {
    let title: String
    let value: String
    let icon: String
    let color: Color

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Image(systemName: icon)
                    .foregroundColor(color)
                Spacer()
            }

            Text(value)
                .font(.title2)
                .fontWeight(.bold)

            Text(title)
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .padding(12)
        .background(color.opacity(0.1))
        .cornerRadius(10)
    }
}

// MARK: - AI Suggestion Row
struct AISuggestionRow: View {
    let suggestion: P2PPromotionSuggestion
    let isCreating: Bool
    let onCreate: () -> Void

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: suggestionIcon)
                .font(.title3)
                .foregroundColor(.purple)
                .frame(width: 36, height: 36)
                .background(Color.purple.opacity(0.1))
                .clipShape(Circle())

            VStack(alignment: .leading, spacing: 4) {
                Text(suggestion.name)
                    .font(.subheadline)
                    .fontWeight(.medium)

                Text(suggestion.description)
                    .font(.caption)
                    .foregroundColor(.secondary)
                    .lineLimit(2)

                if let impact = suggestion.expectedImpact {
                    Text("Expected: \(impact)")
                        .font(.caption2)
                        .foregroundColor(.green)
                }
            }

            Spacer()

            Button(action: onCreate) {
                if isCreating {
                    ProgressView()
                        .scaleEffect(0.8)
                } else {
                    Text("Use")
                        .font(.caption)
                        .fontWeight(.semibold)
                        .foregroundColor(.white)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 6)
                        .background(Color.purple)
                        .cornerRadius(6)
                }
            }
            .disabled(isCreating)
        }
        .padding(.vertical, 4)
    }

    private var suggestionIcon: String {
        switch suggestion.suggestionType.lowercased() {
        case "happy_hour": return "clock.fill"
        case "bundle": return "gift.fill"
        case "loyalty": return "heart.fill"
        case "seasonal": return "leaf.fill"
        case "flash_sale": return "bolt.fill"
        default: return "sparkles"
        }
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
