import SwiftUI
import Combine
import EatFairShared

/// View for customers to browse available promotions and deals
struct DealsView: View {
    @StateObject private var viewModel = DealsViewModel()
    @State private var selectedFilter: DealFilter = .all
    @State private var copiedCode: String?

    enum DealFilter: String, CaseIterable {
        case all = "All Deals"
        case percentage = "% Off"
        case bogo = "BOGO"
        case freeDelivery = "Free Delivery"
        case dollarOff = "$ Off"
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                // Featured Deals Carousel
                if !viewModel.featuredDeals.isEmpty {
                    featuredSection
                }

                // Filter Chips
                filterChipsSection

                // All Deals List
                dealsListSection
            }
            .padding(.vertical)
        }
        .background(Color(.systemGroupedBackground))
        .navigationTitle("Deals & Offers")
        .navigationBarTitleDisplayMode(.large)
        .onAppear {
            viewModel.loadDeals()
        }
        .refreshable {
            viewModel.loadDeals()
        }
        .overlay {
            if viewModel.isLoading && viewModel.promotions.isEmpty {
                ProgressView("Loading deals...")
            }
        }
    }

    // MARK: - Featured Section

    private var featuredSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: "flame.fill")
                    .foregroundColor(Theme.brandOrange)
                Text("Hot Deals")
                    .font(.title2)
                    .fontWeight(.bold)
            }
            .padding(.horizontal)

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 16) {
                    ForEach(viewModel.featuredDeals) { deal in
                        FeaturedDealCard(deal: deal, onCopy: { code in
                            copyToClipboard(code)
                        })
                    }
                }
                .padding(.horizontal)
            }
        }
    }

    // MARK: - Filter Chips

    private var filterChipsSection: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(DealFilter.allCases, id: \.self) { filter in
                    Button(action: { selectedFilter = filter }) {
                        Text(filter.rawValue)
                            .font(.subheadline)
                            .fontWeight(selectedFilter == filter ? .semibold : .regular)
                            .padding(.horizontal, 16)
                            .padding(.vertical, 8)
                            .background(selectedFilter == filter ? Theme.brandGreen : Color(.systemGray6))
                            .foregroundColor(selectedFilter == filter ? .white : .primary)
                            .cornerRadius(20)
                    }
                }
            }
            .padding(.horizontal)
        }
    }

    // MARK: - Deals List

    private var dealsListSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("Available Offers")
                    .font(.headline)
                Spacer()
                Text("\(filteredPromotions.count) deals")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            .padding(.horizontal)

            if filteredPromotions.isEmpty {
                emptyStateView
            } else {
                LazyVStack(spacing: 12) {
                    ForEach(filteredPromotions) { promo in
                        DealCard(promotion: promo, copiedCode: copiedCode, onCopy: { code in
                            copyToClipboard(code)
                        })
                    }
                }
                .padding(.horizontal)
            }
        }
    }

    private var emptyStateView: some View {
        VStack(spacing: 16) {
            Image(systemName: "tag.slash")
                .font(.system(size: 50))
                .foregroundColor(.gray.opacity(0.5))
            Text("No deals available")
                .font(.headline)
            Text("Check back later for new offers")
                .font(.subheadline)
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 40)
    }

    // MARK: - Helpers

    private var filteredPromotions: [P2PCustomerPromotion] {
        switch selectedFilter {
        case .all:
            return viewModel.promotions
        case .percentage:
            return viewModel.promotions.filter { $0.type == "percentage" }
        case .bogo:
            return viewModel.promotions.filter { $0.type == "bogo" }
        case .freeDelivery:
            return viewModel.promotions.filter { $0.type == "free_delivery" }
        case .dollarOff:
            return viewModel.promotions.filter { $0.type == "flat_amount" }
        }
    }

    private func copyToClipboard(_ code: String) {
        UIPasteboard.general.string = code
        copiedCode = code

        // Reset after 2 seconds
        DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
            if copiedCode == code {
                copiedCode = nil
            }
        }
    }
}

// MARK: - Featured Deal Card

struct FeaturedDealCard: View {
    let deal: P2PFeaturedDeal
    let onCopy: (String) -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Headline
            Text(deal.headline)
                .font(.title)
                .fontWeight(.black)
                .foregroundColor(.white)

            Text(deal.vendorName)
                .font(.subheadline)
                .fontWeight(.medium)
                .foregroundColor(.white.opacity(0.9))

            if let desc = deal.description {
                Text(desc)
                    .font(.caption)
                    .foregroundColor(.white.opacity(0.8))
                    .lineLimit(2)
            }

            Spacer()

            // Promo Code
            Button(action: { onCopy(deal.promotionCode) }) {
                HStack {
                    Text(deal.promotionCode)
                        .font(.caption)
                        .fontWeight(.bold)
                        .foregroundColor(gradientColors.first)

                    Image(systemName: "doc.on.doc")
                        .font(.caption)
                        .foregroundColor(gradientColors.first)
                }
                .padding(.horizontal, 12)
                .padding(.vertical, 6)
                .background(Color.white)
                .cornerRadius(8)
            }

            if let minOrder = deal.minOrderAmount, minOrder > 0 {
                Text("Min. order $\(minOrder, specifier: "%.0f")")
                    .font(.caption2)
                    .foregroundColor(.white.opacity(0.7))
            }
        }
        .padding()
        .frame(width: 200, height: 180)
        .background(
            LinearGradient(
                colors: gradientColors,
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        )
        .cornerRadius(16)
        .shadow(color: gradientColors.first?.opacity(0.3) ?? .clear, radius: 8, x: 0, y: 4)
    }

    private var gradientColors: [Color] {
        switch deal.type {
        case "percentage":
            return [Color.purple, Color.pink]
        case "bogo":
            return [Color.orange, Color.red]
        case "free_delivery":
            return [Theme.brandGreen, Color.teal]
        default:
            return [Color.blue, Color.indigo]
        }
    }
}

// MARK: - Deal Card

struct DealCard: View {
    let promotion: P2PCustomerPromotion
    let copiedCode: String?
    let onCopy: (String) -> Void

    var body: some View {
        HStack(spacing: 16) {
            // Deal Badge
            dealBadge

            // Deal Info
            VStack(alignment: .leading, spacing: 4) {
                Text(promotion.name)
                    .font(.headline)
                    .lineLimit(1)

                Text(promotion.vendorName)
                    .font(.subheadline)
                    .foregroundColor(.secondary)

                if let desc = promotion.description {
                    Text(desc)
                        .font(.caption)
                        .foregroundColor(.secondary)
                        .lineLimit(2)
                }

                // Requirements
                HStack(spacing: 8) {
                    if let minOrder = promotion.minOrderAmount, minOrder > 0 {
                        Label("Min $\(minOrder, specifier: "%.0f")", systemImage: "cart")
                            .font(.caption2)
                            .foregroundColor(.secondary)
                    }

                    if let endDate = promotion.endDate {
                        Label(formatDate(endDate), systemImage: "clock")
                            .font(.caption2)
                            .foregroundColor(.secondary)
                    }
                }
            }

            Spacer()

            // Copy Button
            Button(action: { onCopy(promotion.promotionCode) }) {
                VStack(spacing: 4) {
                    Image(systemName: copiedCode == promotion.promotionCode ? "checkmark" : "doc.on.doc")
                        .font(.body)
                    Text(copiedCode == promotion.promotionCode ? "Copied!" : "Copy")
                        .font(.caption2)
                }
                .foregroundColor(copiedCode == promotion.promotionCode ? .green : Theme.brandGreen)
                .frame(width: 50)
            }
        }
        .padding()
        .background(Color.white)
        .cornerRadius(12)
        .shadow(color: .black.opacity(0.05), radius: 4, x: 0, y: 2)
    }

    private var dealBadge: some View {
        VStack(spacing: 2) {
            Text(badgeText)
                .font(.title3)
                .fontWeight(.black)
                .foregroundColor(.white)

            Text(badgeSubtext)
                .font(.caption2)
                .fontWeight(.medium)
                .foregroundColor(.white.opacity(0.9))
        }
        .frame(width: 70, height: 70)
        .background(badgeColor)
        .cornerRadius(12)
    }

    private var badgeText: String {
        switch promotion.type {
        case "percentage":
            return "\(Int(promotion.value))%"
        case "flat_amount":
            return "$\(Int(promotion.value))"
        case "bogo":
            return "B1G1"
        case "free_delivery":
            return "FREE"
        default:
            return "DEAL"
        }
    }

    private var badgeSubtext: String {
        switch promotion.type {
        case "percentage", "flat_amount":
            return "OFF"
        case "bogo":
            return "FREE"
        case "free_delivery":
            return "DLVRY"
        default:
            return ""
        }
    }

    private var badgeColor: Color {
        switch promotion.type {
        case "percentage":
            return .purple
        case "flat_amount":
            return .blue
        case "bogo":
            return .orange
        case "free_delivery":
            return Theme.brandGreen
        default:
            return .gray
        }
    }

    private func formatDate(_ dateString: String) -> String {
        let formatter = ISO8601DateFormatter()
        if let date = formatter.date(from: dateString) {
            let displayFormatter = DateFormatter()
            displayFormatter.dateFormat = "MMM d"
            return "Ends \(displayFormatter.string(from: date))"
        }
        return ""
    }
}

// MARK: - Deals ViewModel

class DealsViewModel: ObservableObject {
    @Published var promotions: [P2PCustomerPromotion] = []
    @Published var featuredDeals: [P2PFeaturedDeal] = []
    @Published var isLoading = false
    @Published var error: String?

    private let apiService = P2PAPIService.shared

    deinit {
        // Clean up any resources if needed
    }

    func loadDeals() {
        isLoading = true
        error = nil

        let group = DispatchGroup()

        // Load active promotions
        group.enter()
        apiService.getActivePromotions { [weak self] result in
            switch result {
            case .success(let response):
                self?.promotions = response.promotions
            case .failure(let err):
                print("Failed to load promotions: \(err)")
            }
            group.leave()
        }

        // Load featured deals
        group.enter()
        apiService.getFeaturedDeals { [weak self] result in
            switch result {
            case .success(let response):
                self?.featuredDeals = response.featured
            case .failure(let err):
                print("Failed to load featured deals: \(err)")
            }
            group.leave()
        }

        group.notify(queue: .main) { [weak self] in
            self?.isLoading = false
        }
    }
}

#Preview {
    NavigationStack {
        DealsView()
    }
}
