//
//  TipNotificationView.swift
//  eatffairdelivery
//
//  Created by EatFair
//  Shows tip received notification with thank you option
//

import SwiftUI
import FirebaseFirestore
import EatFairShared

struct TipNotificationView: View {
    let tip: Tip
    @State private var showingThankYou = false
    @State private var hasThanked = false
    
    var body: some View {
        VStack(spacing: 16) {
            // Tip Amount
            VStack(spacing: 8) {
                Image(systemName: "heart.circle.fill")
                    .resizable()
                    .frame(width: 50, height: 50)
                    .foregroundColor(.pink)
                
                Text("You received a tip!")
                    .font(.headline)
                
                Text("$\(String(format: "%.2f", tip.amount))")
                    .font(.system(size: 36, weight: .bold))
                    .foregroundColor(.green)
                
                if let percentage = tip.percentage {
                    Text("\(Int(percentage))% tip")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
            }
            
            Divider()
            
            // Thank You Button
            if !hasThanked && tip.driverThankYouMessage == nil {
                Button {
                    showingThankYou = true
                } label: {
                    HStack {
                        Image(systemName: "hand.thumbsup.fill")
                        Text("Say Thank You")
                    }
                    .font(.headline)
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color.blue)
                    .cornerRadius(12)
                }
            } else {
                HStack {
                    Image(systemName: "checkmark.circle.fill")
                        .foregroundColor(.green)
                    Text(tip.driverThankYouMessage ?? "Thank you sent!")
                        .foregroundColor(.secondary)
                }
                .padding()
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(16)
        .shadow(radius: 10)
        .sheet(isPresented: $showingThankYou) {
            SendThankYouView(tip: tip, hasThanked: $hasThanked)
        }
        .onAppear {
            hasThanked = tip.driverThankYouMessage != nil
        }
    }
}

// MARK: - Send Thank You View
struct SendThankYouView: View {
    let tip: Tip
    @Binding var hasThanked: Bool
    
    @Environment(\.dismiss) var dismiss
    @State private var selectedMessage: String?
    
    private let presetMessages = [
        "Thank you so much! 🙏",
        "Really appreciate it! ⭐",
        "You made my day! 😊",
        "Thanks for the generous tip! 💚"
    ]
    
    var body: some View {
        NavigationView {
            VStack(spacing: 24) {
                // Header
                VStack(spacing: 12) {
                    Image(systemName: "heart.text.square.fill")
                        .resizable()
                        .frame(width: 60, height: 60)
                        .foregroundColor(.pink)
                    
                    Text("Send a Thank You Message")
                        .font(.title2)
                        .fontWeight(.bold)
                    
                    Text("Let your customer know you appreciate the tip")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                        .multilineTextAlignment(.center)
                }
                .padding(.top)
                
                // Preset Messages
                VStack(spacing: 12) {
                    ForEach(presetMessages, id: \.self) { message in
                        Button {
                            selectedMessage = message
                        } label: {
                            HStack {
                                Text(message)
                                    .foregroundColor(.primary)
                                Spacer()
                                if selectedMessage == message {
                                    Image(systemName: "checkmark.circle.fill")
                                        .foregroundColor(.blue)
                                }
                            }
                            .padding()
                            .background(selectedMessage == message ? Color.blue.opacity(0.1) : Color(.systemGray6))
                            .cornerRadius(12)
                        }
                    }
                }
                
                Spacer()
                
                // Send Button
                Button {
                    sendThankYou()
                } label: {
                    Text("Send Message")
                        .font(.headline)
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(selectedMessage != nil ? Color.blue : Color.gray)
                        .cornerRadius(12)
                }
                .disabled(selectedMessage == nil)
            }
            .padding()
            .navigationTitle("Thank You")
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
    
    private func sendThankYou() {
        guard let message = selectedMessage,
              let tipId = tip.id else { return }
        
        let db = Firestore.firestore()
        db.collection("tips").document(tipId).updateData([
            "driverThankYouMessage": message,
            "driverThankedAt": Int64(Date().timeIntervalSince1970 * 1000)
        ]) { error in
            if error == nil {
                hasThanked = true
                dismiss()
            }
        }
    }
}
