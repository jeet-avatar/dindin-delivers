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
                    List(viewModel.favorites) { restaurant in
                        NavigationLink(destination: RestaurantDetailView(restaurant: restaurant)) {
                            HStack {
                                Image(systemName: "photo") // Placeholder
                                    .resizable()
                                    .frame(width: 60, height: 60)
                                    .cornerRadius(8)
                                VStack(alignment: .leading) {
                                    Text(restaurant.name)
                                        .font(.headline)
                                    Text(restaurant.cuisine)
                                        .font(.caption)
                                        .foregroundColor(.gray)
                                }
                                Spacer()
                                Image(systemName: "heart.fill")
                                    .foregroundColor(.red)
                            }
                        }
                    }
                }
            }
            .navigationTitle("Favorites")
            .onAppear {
                viewModel.fetchFavorites()
            }
        }
    }
}

import FirebaseFirestore
import FirebaseAuth

class FavoritesViewModel: ObservableObject {
    @Published var favorites: [Restaurant] = []
    @Published var isLoading = false
    private var db = Firestore.firestore()
    
    func fetchFavorites() {
        guard let uid = Auth.auth().currentUser?.uid else { return }
        isLoading = true
        
        db.collection("users").document(uid).collection("favorites").getDocuments { snapshot, error in
            self.isLoading = false
            if let error = error {
                print("Error fetching favorites: \(error)")
                return
            }
            
            guard let documents = snapshot?.documents else { return }
            
            // In a real app, we would fetch Restaurant details for each favorite ID.
            // For now, we'll decode if we stored the full object, or mock it if we only stored IDs.
            // Assuming we store minimal details: id, name, cuisine.
            
            self.favorites = documents.compactMap { doc in
                let data = doc.data()
                return Restaurant(
                    id: doc.documentID,
                    name: data["name"] as? String ?? "Unknown",
                    cuisine: data["cuisine"] as? String ?? "Unknown",
                    rating: data["rating"] as? Double ?? 0.0,
                    deliveryTime: "30 min",
                    imageUrl: "restaurant_placeholder",
                    address: data["address"] as? String ?? "",
                    latitude: data["latitude"] as? Double ?? 0.0,
                    longitude: data["longitude"] as? Double ?? 0.0,
                    phone: data["phone"] as? String ?? ""
                )
            }
        }
    }
}
