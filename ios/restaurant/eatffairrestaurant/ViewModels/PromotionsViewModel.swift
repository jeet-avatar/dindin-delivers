//
//  PromotionsViewModel.swift
//  eatffairrestaurant
//
//  Created by EatFair
//  ViewModel for managing restaurant promotions
//

import Foundation
import FirebaseFirestore
import Combine
import EatFairShared

class PromotionsViewModel: ObservableObject {
    @Published var promotions: [Promotion] = []
    @Published var isLoading = false
    @Published var errorMessage: String?
    
    private let db = Firestore.firestore()
    private var listener: ListenerRegistration?
    
    func fetchPromotions(restaurantId: String) {
        isLoading = true
        
        listener = db.collection("promotions")
            .whereField("restaurantId", isEqualTo: restaurantId)
            .order(by: "createdAt", descending: true)
            .addSnapshotListener { [weak self] snapshot, error in
                self?.isLoading = false
                
                if let error = error {
                    self?.errorMessage = error.localizedDescription
                    return
                }
                
                self?.promotions = snapshot?.documents.compactMap { doc in
                    try? doc.data(as: Promotion.self)
                } ?? []
            }
    }
    
    func createPromotion(_ promotion: Promotion, completion: @escaping (Bool) -> Void) {
        do {
            try db.collection("promotions")
                .document(promotion.id ?? UUID().uuidString)
                .setData(from: promotion) { error in
                    completion(error == nil)
                }
        } catch {
            errorMessage = error.localizedDescription
            completion(false)
        }
    }
    
    func updatePromotion(_ promotion: Promotion, completion: @escaping (Bool) -> Void) {
        do {
            try db.collection("promotions")
                .document(promotion.id ?? UUID().uuidString)
                .setData(from: promotion, merge: true) { error in
                    completion(error == nil)
                }
        } catch {
            errorMessage = error.localizedDescription
            completion(false)
        }
    }
    
    func togglePromotionStatus(_ promotion: Promotion) {
        guard let id = promotion.id else { return }
        var updated = promotion
        updated.isActive.toggle()
        
        db.collection("promotions")
            .document(id)
            .updateData(["isActive": updated.isActive])
    }
    
    func deletePromotion(_ promotion: Promotion, completion: @escaping (Bool) -> Void) {
        guard let id = promotion.id else {
            completion(false)
            return
        }
        db.collection("promotions")
            .document(id)
            .delete { error in
                completion(error == nil)
            }
    }
    
    func fetchPromotionUsage(promotionId: String, completion: @escaping (Int, Double) -> Void) {
        db.collection("promotion_usage")
            .whereField("promotionId", isEqualTo: promotionId)
            .getDocuments { snapshot, _ in
                let count = snapshot?.documents.count ?? 0
                let totalDiscount = snapshot?.documents.reduce(0.0) { sum, doc in
                    sum + (doc.data()["discountAmount"] as? Double ?? 0.0)
                } ?? 0.0
                
                completion(count, totalDiscount)
            }
    }
    
    deinit {
        listener?.remove()
    }
}
