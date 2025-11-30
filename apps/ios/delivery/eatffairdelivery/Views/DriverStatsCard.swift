//
//  DriverStatsCard.swift
//  eatffairdelivery
//
//  Created by EatFair
//  Displays driver statistics from Firestore
//

import SwiftUI
import Combine
import FirebaseFirestore
import FirebaseAuth
import EatFairShared

struct DriverStatsCard: View {
    @StateObject private var viewModel = DriverStatsViewModel()
    
    var body: some View {
        VStack(spacing: 16) {
            HStack {
                Text("Your Stats")
                    .font(.headline)
                Spacer()
                Button {
                    viewModel.fetchStats()
                } label: {
                    Image(systemName: "arrow.clockwise")
                        .foregroundColor(.blue)
                }
            }
            
            if viewModel.isLoading {
                ProgressView()
                    .frame(height: 120)
            } else {
                LazyVGrid(columns: [
                    GridItem(.flexible()),
                    GridItem(.flexible())
                ], spacing: 16) {
                    StatBox(
                        icon: "star.fill",
                        value: String(format: "%.1f", viewModel.stats?.rating ?? 0.0),
                        label: "Rating",
                        color: .yellow
                    )
                    
                    StatBox(
                        icon: "checkmark.circle.fill",
                        value: "\(viewModel.stats?.completedDeliveries ?? 0)",
                        label: "Deliveries",
                        color: .green
                    )
                    
                    StatBox(
                        icon: "Percent",
                        value: String(format: "%.0f%%", viewModel.stats?.completionRate ?? 0),
                        label: "Completion",
                        color: .blue
                    )
                    
                    StatBox(
                        icon: "clock.fill",
                        value: String(format: "%.0f%%", viewModel.stats?.onTimeRate ?? 0),
                        label: "On Time",
                        color: .purple
                    )
                }
            }
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(16)
        .onAppear {
            viewModel.fetchStats()
        }
    }
}

// MARK: - Stat Box
struct StatBox: View {
    let icon: String
    let value: String
    let label: String
    let color: Color
    
    var body: some View {
        VStack(spacing: 8) {
            Image(systemName: icon)
                .font(.title2)
                .foregroundColor(color)
            
            Text(value)
                .font(.title3)
                .fontWeight(.bold)
            
            Text(label)
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
    }
}

// MARK: - ViewModel
class DriverStatsViewModel: ObservableObject {
    @Published var stats: DriverStats?
    @Published var isLoading = false
    
    private let db = Firestore.firestore()
    
    func fetchStats() {
        guard let uid = Auth.auth().currentUser?.uid else { return }
        
        isLoading = true
        
        db.collection("drivers").document(uid).getDocument { [weak self] document, error in
            self?.isLoading = false
            
            if let data = document?.data(),
               let statsData = data["stats"] as? [String: Any] {
                
                self?.stats = DriverStats(
                    rating: statsData["rating"] as? Double ?? 0.0,
                    totalDeliveries: statsData["totalDeliveries"] as? Int ?? 0,
                    completedDeliveries: statsData["completedDeliveries"] as? Int ?? 0,
                    cancelledDeliveries: statsData["cancelledDeliveries"] as? Int ?? 0,
                    totalEarnings: statsData["totalEarnings"] as? Double ?? 0.0,
                    totalDistance: statsData["totalDistance"] as? Double ?? 0.0,
                    totalOnlineTime: statsData["totalOnlineTime"] as? Double ?? 0.0,
                    acceptanceRate: statsData["acceptanceRate"] as? Double ?? 0.0,
                    completionRate: statsData["completionRate"] as? Double ?? 0.0,
                    onTimeRate: statsData["onTimeRate"] as? Double ?? 0.0,
                    weeklyDeliveries: statsData["weeklyDeliveries"] as? Int ?? 0,
                    weeklyEarnings: statsData["weeklyEarnings"] as? Double ?? 0.0,
                    weeklyHours: statsData["weeklyHours"] as? Double ?? 0.0,
                    weeklyDistance: statsData["weeklyDistance"] as? Double ?? 0.0,
                    weekStartDate: statsData["weekStartDate"] as? Int64 ?? 0
                )
            }
        }
    }
}
