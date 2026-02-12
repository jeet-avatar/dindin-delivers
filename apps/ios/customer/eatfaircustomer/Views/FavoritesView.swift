import SwiftUI
import EatFairShared
import Combine

struct FavoritesView: View {
    @StateObject private var viewModel = FavoritesViewModel()

    var body: some View {
        NavigationView {
            VStack {
                if viewModel.isLoading {
                    ProgressView()
                } else if viewModel.favorites.isEmpty {
                    VStack(spacing: 20) {
                        Image(systemName: "heart.slash")
                            .font(.system(size: 60))
                            .foregroundColor(Theme.textGrey)
                        Text("No Favorites Yet")
                            .font(.title2)
                            .foregroundColor(Theme.brandBlack)
                        Text("Mark restaurants as favorite to see them here.")
                            .foregroundColor(Theme.textGrey)
                            .multilineTextAlignment(.center)
                            .padding(.horizontal)
                    }
                } else {
                    List {
                        ForEach(viewModel.favorites) { restaurant in
                            NavigationLink(destination: RestaurantDetailView(restaurant: restaurant)) {
                                HStack {
                                    AsyncImage(url: URL(string: restaurant.imageUrl)) { image in
                                        image
                                            .resizable()
                                            .aspectRatio(contentMode: .fill)
                                    } placeholder: {
                                        Image(systemName: "photo")
                                            .foregroundColor(.gray)
                                    }
                                    .frame(width: 60, height: 60)
                                    .cornerRadius(8)
                                    .clipped()

                                    VStack(alignment: .leading, spacing: 4) {
                                        Text(restaurant.name)
                                            .font(.headline)
                                        Text(restaurant.cuisine)
                                            .font(.caption)
                                            .foregroundColor(.gray)
                                        HStack(spacing: 4) {
                                            Image(systemName: "star.fill")
                                                .foregroundColor(.yellow)
                                                .font(.caption)
                                            Text(String(format: "%.1f", restaurant.rating))
                                                .font(.caption)
                                                .foregroundColor(.gray)
                                        }
                                    }
                                    Spacer()
                                    Image(systemName: "heart.fill")
                                        .foregroundColor(.red)
                                }
                            }
                        }
                        .onDelete(perform: viewModel.removeFavorite)
                    }
                    .listStyle(.plain)
                }
            }
            .navigationTitle("Favorites")
            .toolbar {
                if !viewModel.favorites.isEmpty {
                    EditButton()
                }
            }
            .onAppear {
                viewModel.fetchFavorites()
            }
            .refreshable {
                viewModel.fetchFavorites()
            }
        }
    }
}

// MARK: - ViewModel using P2P Backend
class FavoritesViewModel: ObservableObject {
    @Published var favorites: [Restaurant] = []
    @Published var isLoading = false
    @Published var errorMessage: String?

    private let p2pService = P2PAPIService.shared

    deinit {
        // Clean up any resources if needed
    }

    func fetchFavorites() {
        guard let customerId = p2pService.currentCustomerId else { return }

        isLoading = true
        errorMessage = nil

        p2pService.fetchCustomerFavorites(customerId: customerId) { [weak self] result in
            DispatchQueue.main.async {
                self?.isLoading = false
                switch result {
                case .success(let response):
                    self?.favorites = response.favorites.map { fav in
                        Restaurant(
                            id: String(fav.vendorId),
                            name: fav.restaurantName ?? "Unknown",
                            cuisine: fav.cuisine ?? "",
                            rating: fav.rating ?? 0.0,
                            deliveryTime: "30 min",
                            imageUrl: fav.imageUrl ?? "",
                            address: fav.address ?? "",
                            latitude: fav.latitude ?? 0.0,
                            longitude: fav.longitude ?? 0.0,
                            phone: fav.phone ?? ""
                        )
                    }
                case .failure(let error):
                    let errMsg = error.localizedDescription.lowercased()
                    if errMsg.contains("network") || errMsg.contains("connection") {
                        self?.errorMessage = "Unable to connect. Please check your internet connection."
                    } else {
                        self?.errorMessage = "Unable to load favorites. Please try again."
                    }
                }
            }
        }
    }

    func removeFavorite(at offsets: IndexSet) {
        guard let customerId = p2pService.currentCustomerId else { return }

        for index in offsets {
            let restaurant = favorites[index]
            guard let restaurantId = restaurant.id, let vendorId = Int(restaurantId) else { continue }

            p2pService.removeFavorite(customerId: customerId, vendorId: vendorId) { _ in }
        }

        favorites.remove(atOffsets: offsets)
    }

    func addFavorite(vendorId: Int) {
        guard let customerId = p2pService.currentCustomerId else { return }

        p2pService.addFavorite(customerId: customerId, vendorId: vendorId) { [weak self] result in
            DispatchQueue.main.async {
                if case .success = result {
                    self?.fetchFavorites()
                }
            }
        }
    }

    func checkIsFavorite(vendorId: Int, completion: @escaping (Bool) -> Void) {
        guard let customerId = p2pService.currentCustomerId else {
            completion(false)
            return
        }

        p2pService.checkFavorite(customerId: customerId, vendorId: vendorId) { result in
            DispatchQueue.main.async {
                switch result {
                case .success(let response):
                    completion(response.isFavorite)
                case .failure:
                    completion(false)
                }
            }
        }
    }
}
