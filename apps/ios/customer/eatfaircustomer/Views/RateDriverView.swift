//
//  RateDriverView.swift
//  eatfaircustomer
//
//  Created by EatFair
//  Driver rating view with 5-star system and categories
//

import SwiftUI
import Combine
import EatFairShared

struct RateDriverView: View {
    @Environment(\.dismiss) var dismiss
    @StateObject private var viewModel: RateDriverViewModel
    
    let order: Order
    
    init(order: Order) {
        self.order = order
        self._viewModel = StateObject(wrappedValue: RateDriverViewModel(order: order))
    }
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 24) {
                    // Driver Info
                    VStack(spacing: 12) {
                        Image(systemName: "person.circle.fill")
                            .resizable()
                            .frame(width: 80, height: 80)
                            .foregroundColor(.gray)
                        
                        Text(order.driverName ?? "Your Driver")
                            .font(.title2)
                            .fontWeight(.bold)
                        
                        Text("How was your delivery?")
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
                            
                            CategoryToggle(
                                title: "On Time Delivery",
                                icon: "clock.fill",
                                isSelected: $viewModel.onTime
                            )
                            
                            CategoryToggle(
                                title: "Friendly & Professional",
                                icon: "heart.fill",
                                isSelected: $viewModel.friendly
                            )
                            
                            CategoryToggle(
                                title: "Followed Instructions",
                                icon: "checkmark.circle.fill",
                                isSelected: $viewModel.followedInstructions
                            )
                            
                            CategoryToggle(
                                title: "Food Quality Maintained",
                                icon: "fork.knife",
                                isSelected: $viewModel.foodQuality
                            )
                        }
                        .padding()
                        .background(Color(.systemGray6))
                        .cornerRadius(12)
                    }
                    
                    // Comment (optional)
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Additional Comments (Optional)")
                            .font(.headline)
                        
                        TextEditor(text: $viewModel.comment)
                            .frame(height: 100)
                            .padding(8)
                            .background(Color(.systemGray6))
                            .cornerRadius(8)
                            .overlay(
                                RoundedRectangle(cornerRadius: 8)
                                    .stroke(Color.gray.opacity(0.3), lineWidth: 1)
                            )
                    }
                    
                    // Submit Button
                    Button {
                        viewModel.submitRating()
                        dismiss()
                    } label: {
                        Text("Submit Rating")
                            .font(.headline)
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(viewModel.rating > 0 ? Color.blue : Color.gray)
                            .cornerRadius(12)
                    }
                    .disabled(viewModel.rating == 0)
                    
                    Spacer()
                }
                .padding()
            }
            .navigationTitle("Rate Your Delivery")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Skip") {
                        dismiss()
                    }
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
struct CategoryToggle: View {
    let title: String
    let icon: String
    @Binding var isSelected: Bool
    
    var body: some View {
        Button {
            isSelected.toggle()
        } label: {
            HStack {
                Image(systemName: icon)
                    .foregroundColor(isSelected ? .green : .gray)
                    .frame(width: 24)
                
                Text(title)
                    .foregroundColor(.primary)
                
                Spacer()
                
                if isSelected {
                    Image(systemName: "checkmark.circle.fill")
                        .foregroundColor(.green)
                }
            }
            .padding()
            .background(isSelected ? Color.green.opacity(0.1) : Color.white)
            .cornerRadius(8)
            .overlay(
                RoundedRectangle(cornerRadius: 8)
                    .stroke(isSelected ? Color.green : Color.gray.opacity(0.3), lineWidth: 1)
            )
        }
    }
}

// MARK: - ViewModel
class RateDriverViewModel: ObservableObject {
    @Published var rating: Int = 0
    @Published var comment: String = ""
    @Published var onTime: Bool = false
    @Published var friendly: Bool = false
    @Published var followedInstructions: Bool = false
    @Published var foodQuality: Bool = false
    @Published var isSubmitting: Bool = false
    @Published var errorMessage: String?

    private let order: Order
    private let p2pService = P2PAPIService.shared

    init(order: Order) {
        self.order = order
    }

    deinit {
        // Clean up any resources if needed
    }

    func submitRating() {
        guard let orderId = order.id,
              let driverIdString = order.driverId,
              let driverId = Int(driverIdString) else {
            errorMessage = "Invalid order or driver info"
            return
        }

        guard let orderIdInt = Int(orderId) else {
            errorMessage = "Invalid order ID"
            return
        }

        isSubmitting = true
        errorMessage = nil

        p2pService.submitDriverRating(
            orderId: orderIdInt,
            driverId: driverId,
            rating: rating,
            comment: comment.isEmpty ? nil : comment,
            onTime: onTime,
            friendly: friendly,
            followedInstructions: followedInstructions,
            foodQuality: foodQuality
        ) { [weak self] result in
            DispatchQueue.main.async {
                self?.isSubmitting = false
                switch result {
                case .success(let response):
                    print("[RateDriverView] Rating submitted: \(response.message)")
                case .failure(let error):
                    self?.errorMessage = error.localizedDescription
                    print("[RateDriverView] Rating failed: \(error)")
                }
            }
        }
    }
}
