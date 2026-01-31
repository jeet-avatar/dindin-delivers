//
//  RateRestaurantView.swift
//  eatfaircustomer
//
//  Created by EatFair
//  Restaurant rating view with 5-star system and categories
//

import SwiftUI
import Combine
import EatFairShared

struct RateRestaurantView: View {
    @Environment(\.dismiss) var dismiss
    @StateObject private var viewModel: RateRestaurantViewModel

    let order: Order

    init(order: Order) {
        self.order = order
        self._viewModel = StateObject(wrappedValue: RateRestaurantViewModel(order: order))
    }

    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 24) {
                    // Restaurant Info
                    VStack(spacing: 12) {
                        Image(systemName: "fork.knife.circle.fill")
                            .resizable()
                            .frame(width: 80, height: 80)
                            .foregroundColor(Theme.brandOrange)

                        Text(order.restaurant.name)
                            .font(.title2)
                            .fontWeight(.bold)

                        Text("How was your food?")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                    }
                    .padding(.top)

                    // Star Rating
                    VStack(spacing: 8) {
                        HStack(spacing: 12) {
                            ForEach(1...5, id: \.self) { star in
                                Button {
                                    viewModel.rating = star
                                } label: {
                                    Image(systemName: star <= viewModel.rating ? "star.fill" : "star")
                                        .resizable()
                                        .frame(width: 44, height: 44)
                                        .foregroundColor(star <= viewModel.rating ? .yellow : .gray)
                                }
                            }
                        }

                        if viewModel.rating > 0 {
                            Text(ratingText)
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                        }
                    }
                    .padding()

                    // Category Toggles (show if rating >= 3)
                    if viewModel.rating >= 3 {
                        VStack(spacing: 12) {
                            Text("What went well?")
                                .font(.headline)
                                .frame(maxWidth: .infinity, alignment: .leading)

                            RestaurantCategoryToggle(
                                title: "Great Food Quality",
                                icon: "star.fill",
                                isSelected: $viewModel.foodQuality
                            )

                            RestaurantCategoryToggle(
                                title: "Good Portion Size",
                                icon: "fork.knife",
                                isSelected: $viewModel.portionSize
                            )

                            RestaurantCategoryToggle(
                                title: "Value for Money",
                                icon: "dollarsign.circle.fill",
                                isSelected: $viewModel.valueForMoney
                            )

                            RestaurantCategoryToggle(
                                title: "Order Was Accurate",
                                icon: "checkmark.circle.fill",
                                isSelected: $viewModel.accuracy
                            )
                        }
                        .padding()
                        .background(Color(.systemGray6))
                        .cornerRadius(12)
                    }

                    // Review Text (optional)
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Write a Review (Optional)")
                            .font(.headline)

                        TextEditor(text: $viewModel.review)
                            .frame(height: 100)
                            .padding(8)
                            .background(Color(.systemGray6))
                            .cornerRadius(8)
                            .overlay(
                                RoundedRectangle(cornerRadius: 8)
                                    .stroke(Color.gray.opacity(0.3), lineWidth: 1)
                            )
                    }

                    // Error Message
                    if let error = viewModel.errorMessage {
                        Text(error)
                            .font(.caption)
                            .foregroundColor(.red)
                            .padding(.horizontal)
                    }

                    // Submit Button
                    Button {
                        viewModel.submitRating()
                    } label: {
                        HStack {
                            if viewModel.isSubmitting {
                                ProgressView()
                                    .tint(.white)
                            }
                            Text(viewModel.isSubmitting ? "Submitting..." : "Submit Rating")
                        }
                        .font(.headline)
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(viewModel.rating > 0 ? Theme.brandOrange : Color.gray)
                        .cornerRadius(12)
                    }
                    .disabled(viewModel.rating == 0 || viewModel.isSubmitting)

                    Spacer()
                }
                .padding()
            }
            .navigationTitle("Rate Restaurant")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Skip") {
                        dismiss()
                    }
                }
            }
            .onChange(of: viewModel.didSubmit) { submitted in
                if submitted {
                    dismiss()
                }
            }
        }
    }

    private var ratingText: String {
        switch viewModel.rating {
        case 1: return "Poor"
        case 2: return "Below Average"
        case 3: return "Average"
        case 4: return "Good"
        case 5: return "Excellent"
        default: return ""
        }
    }
}

// MARK: - Category Toggle
struct RestaurantCategoryToggle: View {
    let title: String
    let icon: String
    @Binding var isSelected: Bool

    var body: some View {
        Button {
            isSelected.toggle()
        } label: {
            HStack {
                Image(systemName: icon)
                    .foregroundColor(isSelected ? Theme.brandOrange : .gray)
                    .frame(width: 24)

                Text(title)
                    .foregroundColor(.primary)

                Spacer()

                if isSelected {
                    Image(systemName: "checkmark.circle.fill")
                        .foregroundColor(Theme.brandOrange)
                }
            }
            .padding()
            .background(isSelected ? Theme.brandOrange.opacity(0.1) : Color.white)
            .cornerRadius(8)
            .overlay(
                RoundedRectangle(cornerRadius: 8)
                    .stroke(isSelected ? Theme.brandOrange : Color.gray.opacity(0.3), lineWidth: 1)
            )
        }
    }
}

// MARK: - ViewModel
class RateRestaurantViewModel: ObservableObject {
    @Published var rating: Int = 0
    @Published var review: String = ""
    @Published var foodQuality: Bool = false
    @Published var portionSize: Bool = false
    @Published var valueForMoney: Bool = false
    @Published var accuracy: Bool = false
    @Published var isSubmitting: Bool = false
    @Published var errorMessage: String?
    @Published var didSubmit: Bool = false

    private let order: Order
    private let p2pService = P2PAPIService.shared

    init(order: Order) {
        self.order = order
    }

    func submitRating() {
        guard let orderId = order.id, let orderIdInt = Int(orderId) else {
            errorMessage = "Invalid order ID"
            return
        }

        guard let restaurantId = Int(order.restaurant.id) else {
            errorMessage = "Invalid restaurant info"
            return
        }

        isSubmitting = true
        errorMessage = nil

        p2pService.submitRestaurantRating(
            orderId: orderIdInt,
            restaurantId: restaurantId,
            rating: rating,
            review: review.isEmpty ? nil : review,
            foodQuality: foodQuality,
            portionSize: portionSize,
            valueForMoney: valueForMoney,
            accuracy: accuracy
        ) { [weak self] result in
            DispatchQueue.main.async {
                self?.isSubmitting = false
                switch result {
                case .success(let response):
                    print("[RateRestaurantView] Rating submitted: \(response.message)")
                    self?.didSubmit = true
                case .failure(let error):
                    self?.errorMessage = error.localizedDescription
                    print("[RateRestaurantView] Rating failed: \(error)")
                }
            }
        }
    }
}
