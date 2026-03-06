import SwiftUI
import Combine
import EatFairShared

/**
 * Search Restaurants View
 * Dedicated search screen for restaurants and food items
 * Matches Android SearchScreen for platform parity
 */

struct QuickSearchView: View {
    @Environment(\.dismiss) private var dismiss
    @StateObject private var viewModel = QuickSearchViewModel()
    @FocusState private var isSearchFocused: Bool

    let onSelectRestaurant: (Int) -> Void

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Search Bar
                searchBar

                ScrollView {
                    VStack(alignment: .leading, spacing: 24) {
                        // Recent Searches
                        if viewModel.searchQuery.isEmpty && !viewModel.recentSearches.isEmpty {
                            recentSearchesSection
                        }

                        // Popular Cuisines
                        if viewModel.searchQuery.isEmpty {
                            popularCuisinesSection
                        }

                        // Search Results
                        if !viewModel.searchQuery.isEmpty {
                            searchResultsSection
                        }

                        // Popular cuisines fill the empty state

                    }
                    .padding(.horizontal, 16)
                    .padding(.vertical, 16)
                }
            }
            .background(Color(UIColor.systemGroupedBackground))
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button {
                        dismiss()
                    } label: {
                        Image(systemName: "arrow.left")
                            .foregroundColor(.primary)
                    }
                }
            }
            .onAppear {
                isSearchFocused = true
            }
        }
    }

    // MARK: - Search Bar
    private var searchBar: some View {
        HStack(spacing: 12) {
            HStack {
                Image(systemName: "magnifyingglass")
                    .foregroundColor(.gray)

                TextField("Search restaurants, cuisines, dishes...", text: $viewModel.searchQuery)
                    .textFieldStyle(.plain)
                    .focused($isSearchFocused)
                    .submitLabel(.search)
                    .onSubmit {
                        viewModel.addToRecentSearches()
                    }

                if !viewModel.searchQuery.isEmpty {
                    Button {
                        viewModel.searchQuery = ""
                    } label: {
                        Image(systemName: "xmark.circle.fill")
                            .foregroundColor(.gray)
                    }
                }
            }
            .padding(12)
            .background(Color.white)
            .cornerRadius(12)

        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .background(Color(UIColor.systemBackground))
    }

    // MARK: - Recent Searches Section
    private var recentSearchesSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("Recent Searches")
                    .font(.headline)

                Spacer()

                Button("Clear") {
                    viewModel.clearRecentSearches()
                }
                .font(.subheadline)
                .foregroundColor(Theme.brandOrange)
            }

            FlowLayout(spacing: 8) {
                ForEach(viewModel.recentSearches, id: \.self) { search in
                    SearchChip(
                        text: search,
                        icon: "clock"
                    ) {
                        viewModel.searchQuery = search
                    }
                }
            }
        }
    }

    // MARK: - Popular Cuisines Section
    private var popularCuisinesSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Popular Cuisines")
                .font(.headline)

            FlowLayout(spacing: 8) {
                ForEach(viewModel.popularCuisines, id: \.self) { cuisine in
                    SearchChip(
                        text: cuisine,
                        icon: cuisineIcon(for: cuisine)
                    ) {
                        viewModel.searchQuery = cuisine
                    }
                }
            }
        }
    }

    // MARK: - Search Results Section
    private var searchResultsSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            if viewModel.isLoading {
                HStack {
                    Spacer()
                    ProgressView()
                    Spacer()
                }
                .padding(.vertical, 40)
            } else if viewModel.searchResults.isEmpty {
                emptyResultsView
            } else {
                Text("\(viewModel.searchResults.count) Results")
                    .font(.headline)

                ForEach(viewModel.searchResults) { result in
                    SearchResultCard(result: result) {
                        onSelectRestaurant(result.restaurantId)
                        dismiss()
                    }
                }
            }
        }
    }

    // MARK: - Empty Results View
    private var emptyResultsView: some View {
        VStack(spacing: 16) {
            Image(systemName: "magnifyingglass")
                .font(.system(size: 48))
                .foregroundColor(.gray)

            Text("No results found")
                .font(.headline)

            Text("Try searching for something else or check your spelling")
                .font(.subheadline)
                .foregroundColor(.gray)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 40)
    }


    // MARK: - Helper Functions
    private func cuisineIcon(for cuisine: String) -> String {
        switch cuisine.lowercased() {
        case "italian": return "🍕"
        case "indian": return "🍛"
        case "chinese": return "🥡"
        case "mexican": return "🌮"
        case "japanese": return "🍱"
        case "american": return "🍔"
        case "thai": return "🍜"
        case "pizza": return "🍕"
        case "sushi": return "🍣"
        case "burgers": return "🍔"
        case "healthy": return "🥗"
        case "desserts": return "🍰"
        default: return "🍽️"
        }
    }
}

// MARK: - Quick Search ViewModel
@MainActor
class QuickSearchViewModel: ObservableObject {
    @Published var searchQuery = "" {
        didSet {
            performSearch()
        }
    }
    @Published var searchResults: [SearchResult] = []
    @Published var isLoading = false
    @Published var recentSearches: [String] = ["Pizza", "Indian food", "Burgers"]
    @Published var popularCuisines: [String] = [
        "Italian", "Indian", "Chinese", "Mexican",
        "Japanese", "Thai", "American", "Healthy"
    ]

    private var searchTask: Task<Void, Never>?

    func performSearch() {
        searchTask?.cancel()

        guard !searchQuery.isEmpty else {
            searchResults = []
            return
        }

        isLoading = true

        searchTask = Task {
            // Debounce
            try? await Task.sleep(nanoseconds: 300_000_000) // 300ms

            guard !Task.isCancelled else { return }

            // Simulated search results
            let results = generateMockResults()

            await MainActor.run {
                self.searchResults = results
                self.isLoading = false
            }
        }
    }

    func addToRecentSearches() {
        guard !searchQuery.isEmpty else { return }

        // Remove if exists, then add to front
        recentSearches.removeAll { $0.lowercased() == searchQuery.lowercased() }
        recentSearches.insert(searchQuery, at: 0)

        // Keep only last 10
        if recentSearches.count > 10 {
            recentSearches = Array(recentSearches.prefix(10))
        }
    }

    func clearRecentSearches() {
        recentSearches = []
    }

    private func generateMockResults() -> [SearchResult] {
        // Mock data for demonstration
        return [
            SearchResult(
                id: "1",
                restaurantId: 1,
                restaurantName: "Bella Italia",
                itemName: "Margherita Pizza",
                cuisineType: "Italian",
                rating: 4.5,
                deliveryTime: "25-35 min",
                price: 14.99
            ),
            SearchResult(
                id: "2",
                restaurantId: 2,
                restaurantName: "Spice Garden",
                itemName: "Butter Chicken",
                cuisineType: "Indian",
                rating: 4.7,
                deliveryTime: "30-40 min",
                price: 16.99
            ),
            SearchResult(
                id: "3",
                restaurantId: 3,
                restaurantName: "Dragon Palace",
                itemName: "Kung Pao Chicken",
                cuisineType: "Chinese",
                rating: 4.3,
                deliveryTime: "20-30 min",
                price: 13.99
            )
        ]
    }
}

// MARK: - Search Result Model
struct SearchResult: Identifiable {
    let id: String
    let restaurantId: Int
    let restaurantName: String
    let itemName: String
    let cuisineType: String
    let rating: Double
    let deliveryTime: String
    let price: Double
}

// MARK: - Search Chip
struct SearchChip: View {
    let text: String
    let icon: String
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 6) {
                if icon.count == 1 {
                    Text(icon)
                } else {
                    Image(systemName: icon)
                        .font(.caption)
                }
                Text(text)
                    .font(.subheadline)
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 8)
            .background(Color.white)
            .foregroundColor(.primary)
            .cornerRadius(20)
            .shadow(color: .black.opacity(0.05), radius: 2, y: 1)
        }
    }
}

// MARK: - Search Result Card
struct SearchResultCard: View {
    let result: SearchResult
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 12) {
                // Placeholder image
                RoundedRectangle(cornerRadius: 8)
                    .fill(Color.gray.opacity(0.2))
                    .frame(width: 60, height: 60)
                    .overlay(
                        Text("🍽️")
                            .font(.title2)
                    )

                VStack(alignment: .leading, spacing: 4) {
                    Text(result.itemName)
                        .font(.subheadline)
                        .fontWeight(.semibold)
                        .foregroundColor(.primary)

                    Text(result.restaurantName)
                        .font(.caption)
                        .foregroundColor(.gray)

                    HStack(spacing: 8) {
                        HStack(spacing: 2) {
                            Image(systemName: "star.fill")
                                .font(.caption2)
                                .foregroundColor(.orange)
                            Text(String(format: "%.1f", result.rating))
                                .font(.caption)
                                .foregroundColor(.gray)
                        }

                        Text("•")
                            .foregroundColor(.gray)

                        Text(result.deliveryTime)
                            .font(.caption)
                            .foregroundColor(.gray)

                        Text("•")
                            .foregroundColor(.gray)

                        Text("$\(String(format: "%.2f", result.price))")
                            .font(.caption)
                            .fontWeight(.medium)
                            .foregroundColor(Theme.brandOrange)
                    }
                }

                Spacer()

                Image(systemName: "chevron.right")
                    .font(.caption)
                    .foregroundColor(.gray)
            }
            .padding(12)
            .background(Color.white)
            .cornerRadius(12)
            .shadow(color: .black.opacity(0.05), radius: 3, y: 1)
        }
    }
}


// MARK: - Flow Layout
struct FlowLayout: Layout {
    var spacing: CGFloat = 8

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let result = FlowResult(
            in: proposal.replacingUnspecifiedDimensions().width,
            subviews: subviews,
            spacing: spacing
        )
        return result.size
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        let result = FlowResult(
            in: bounds.width,
            subviews: subviews,
            spacing: spacing
        )
        for (index, subview) in subviews.enumerated() {
            subview.place(at: CGPoint(x: bounds.minX + result.positions[index].x,
                                       y: bounds.minY + result.positions[index].y),
                         proposal: .unspecified)
        }
    }

    struct FlowResult {
        var size: CGSize = .zero
        var positions: [CGPoint] = []

        init(in maxWidth: CGFloat, subviews: Subviews, spacing: CGFloat) {
            var x: CGFloat = 0
            var y: CGFloat = 0
            var rowHeight: CGFloat = 0

            for subview in subviews {
                let size = subview.sizeThatFits(.unspecified)

                if x + size.width > maxWidth && x > 0 {
                    x = 0
                    y += rowHeight + spacing
                    rowHeight = 0
                }

                positions.append(CGPoint(x: x, y: y))
                rowHeight = max(rowHeight, size.height)
                x += size.width + spacing
            }

            self.size = CGSize(width: maxWidth, height: y + rowHeight)
        }
    }
}


#Preview {
    QuickSearchView { _ in }
}
