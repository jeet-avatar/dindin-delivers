//
//  PromotionsViewModel.swift
//  eatffairrestaurant
//
//  Created by EatFair
//  ViewModel for managing restaurant promotions - Uses P2P API as primary source
//

import Foundation
import FirebaseFirestore
import Combine
import EatFairShared

class PromotionsViewModel: ObservableObject {
    // MARK: - Published Properties
    @Published var promotions: [Promotion] = []
    @Published var p2pPromotions: [P2PPromotion] = [] // P2P backend promotions
    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var showError = false

    // AI Suggestions
    @Published var suggestions: [P2PPromotionSuggestion] = []
    @Published var analytics: P2PPromotionAnalytics?

    // State
    @Published var isCreating = false
    @Published var isDeleting = false

    // MARK: - Private Properties
    private let db = Firestore.firestore()
    private var listener: ListenerRegistration?
    private let p2pAPI = P2PAPIService.shared

    // Vendor ID from P2P API service
    private var vendorId: Int {
        p2pAPI.currentVendorId ?? 1
    }

    // MARK: - Fetch Promotions

    /// Fetch promotions from P2P API (primary) with Firebase fallback
    func fetchPromotions(restaurantId: String) {
        isLoading = true
        errorMessage = nil

        // Fetch from P2P backend first
        p2pAPI.getVendorPromotions(vendorId: vendorId) { [weak self] result in
            guard let self = self else { return }

            DispatchQueue.main.async {
                switch result {
                case .success(let fetchedPromotions):
                    self.p2pPromotions = fetchedPromotions
                    // Convert P2P promotions to shared Promotion model
                    self.promotions = fetchedPromotions.map { p2pPromo in
                        self.convertToPromotion(p2pPromo)
                    }
                    self.isLoading = false
                    #if DEBUG
                    print("[Promotions] Loaded \(fetchedPromotions.count) promotions from P2P API")
                    #endif

                case .failure(let error):
                    #if DEBUG
                    print("[Promotions] P2P fetch failed: \(error.localizedDescription), falling back to Firebase")
                    #endif
                    // Fallback to Firebase
                    self.fetchFirebasePromotions(restaurantId: restaurantId)
                }
            }
        }

        // Also fetch AI suggestions
        fetchSuggestions()

        // Fetch analytics
        fetchAnalytics()
    }

    /// Fallback to Firebase for fetching promotions
    private func fetchFirebasePromotions(restaurantId: String) {
        listener = db.collection("promotions")
            .whereField("restaurantId", isEqualTo: restaurantId)
            .order(by: "createdAt", descending: true)
            .addSnapshotListener { [weak self] snapshot, error in
                self?.isLoading = false

                if let error = error {
                    self?.errorMessage = error.localizedDescription
                    self?.showError = true
                    return
                }

                self?.promotions = snapshot?.documents.compactMap { doc in
                    try? doc.data(as: Promotion.self)
                } ?? []
            }
    }

    // MARK: - Create Promotion

    /// Create a new promotion via P2P API
    func createPromotion(_ promotion: Promotion, completion: @escaping (Bool) -> Void) {
        isCreating = true

        // Convert to P2P model
        let p2pPromotion = P2PPromotionCreate(
            name: promotion.title,
            description: promotion.description,
            type: promotion.discountType == "percentage" ? "percentage" : "flat_amount",
            value: promotion.discountValue,
            maxDiscount: nil,
            minOrderAmount: promotion.minimumOrder,
            targetAudience: "all",
            startDate: formatDateForAPI(Date(timeIntervalSince1970: TimeInterval(promotion.startDate) / 1000)),
            endDate: formatDateForAPI(Date(timeIntervalSince1970: TimeInterval(promotion.endDate) / 1000)),
            isRecurring: false,
            usageLimit: nil,
            perCustomerLimit: 1,
            pushToApp: true
        )

        p2pAPI.createPromotion(vendorId: vendorId, promotion: p2pPromotion) { [weak self] result in
            guard let self = self else { return }

            DispatchQueue.main.async {
                self.isCreating = false

                switch result {
                case .success(let createdPromo):
                    // Add to local list
                    self.p2pPromotions.append(createdPromo)
                    self.promotions.append(self.convertToPromotion(createdPromo))
                    #if DEBUG
                    print("[Promotions] Created promotion via P2P API: \(createdPromo.name)")
                    #endif
                    completion(true)

                case .failure(let error):
                    self.errorMessage = "Failed to create promotion: \(error.localizedDescription)"
                    self.showError = true
                    #if DEBUG
                    print("[Promotions] P2P create failed: \(error.localizedDescription)")
                    #endif
                    // Fallback to Firebase
                    self.createFirebasePromotion(promotion, completion: completion)
                }
            }
        }
    }

    /// Fallback to Firebase for creating promotions
    private func createFirebasePromotion(_ promotion: Promotion, completion: @escaping (Bool) -> Void) {
        do {
            try db.collection("promotions")
                .document(promotion.id ?? UUID().uuidString)
                .setData(from: promotion) { error in
                    completion(error == nil)
                }
        } catch {
            errorMessage = error.localizedDescription
            showError = true
            completion(false)
        }
    }

    // MARK: - Update Promotion

    func updatePromotion(_ promotion: Promotion, completion: @escaping (Bool) -> Void) {
        guard let promoIdString = promotion.id, let promoId = Int(promoIdString) else {
            // Try Firebase fallback if no valid P2P ID
            updateFirebasePromotion(promotion, completion: completion)
            return
        }

        let updates: [String: Any] = [
            "status": promotion.isActive ? "active" : "paused"
        ]

        p2pAPI.updatePromotion(promotionId: promoId, updates: updates) { [weak self] result in
            DispatchQueue.main.async {
                switch result {
                case .success(let updatedPromo):
                    // Update local list
                    if let strongSelf = self,
                       let index = strongSelf.promotions.firstIndex(where: { $0.id == promotion.id }) {
                        strongSelf.promotions[index] = strongSelf.convertToPromotion(updatedPromo)
                    }
                    if let strongSelf = self,
                       let index = strongSelf.p2pPromotions.firstIndex(where: { $0.id == promoId }) {
                        strongSelf.p2pPromotions[index] = updatedPromo
                    }
                    completion(true)

                case .failure(let error):
                    self?.errorMessage = error.localizedDescription
                    self?.showError = true
                    // Fallback to Firebase
                    self?.updateFirebasePromotion(promotion, completion: completion)
                }
            }
        }
    }

    /// Fallback to Firebase for updating promotions
    private func updateFirebasePromotion(_ promotion: Promotion, completion: @escaping (Bool) -> Void) {
        do {
            try db.collection("promotions")
                .document(promotion.id ?? UUID().uuidString)
                .setData(from: promotion, merge: true) { error in
                    completion(error == nil)
                }
        } catch {
            errorMessage = error.localizedDescription
            showError = true
            completion(false)
        }
    }

    // MARK: - Toggle Promotion Status

    func togglePromotionStatus(_ promotion: Promotion) {
        guard let promoIdString = promotion.id, let promoId = Int(promoIdString) else {
            // Firebase fallback
            toggleFirebasePromotionStatus(promotion)
            return
        }

        let newStatus = promotion.isActive ? "paused" : "active"
        let updates: [String: Any] = ["status": newStatus]

        p2pAPI.updatePromotion(promotionId: promoId, updates: updates) { [weak self] result in
            DispatchQueue.main.async {
                switch result {
                case .success(let updatedPromo):
                    // Update local list
                    if let strongSelf = self,
                       let index = strongSelf.promotions.firstIndex(where: { $0.id == promotion.id }) {
                        strongSelf.promotions[index] = strongSelf.convertToPromotion(updatedPromo)
                    }
                    if let strongSelf = self,
                       let index = strongSelf.p2pPromotions.firstIndex(where: { $0.id == promoId }) {
                        strongSelf.p2pPromotions[index] = updatedPromo
                    }
                    #if DEBUG
                    print("[Promotions] Toggled promotion status via P2P API")
                    #endif

                case .failure(let error):
                    self?.errorMessage = error.localizedDescription
                    self?.showError = true
                    // Fallback to Firebase
                    self?.toggleFirebasePromotionStatus(promotion)
                }
            }
        }
    }

    /// Fallback to Firebase for toggling promotion status
    private func toggleFirebasePromotionStatus(_ promotion: Promotion) {
        guard let id = promotion.id else { return }
        var updated = promotion
        updated.isActive.toggle()

        db.collection("promotions")
            .document(id)
            .updateData(["isActive": updated.isActive])
    }

    // MARK: - Delete Promotion

    func deletePromotion(_ promotion: Promotion, completion: @escaping (Bool) -> Void) {
        guard let promoIdString = promotion.id, let promoId = Int(promoIdString) else {
            // Firebase fallback
            deleteFirebasePromotion(promotion, completion: completion)
            return
        }

        isDeleting = true

        p2pAPI.deletePromotion(promotionId: promoId) { [weak self] result in
            guard let self = self else { return }

            DispatchQueue.main.async {
                self.isDeleting = false

                switch result {
                case .success(let success):
                    if success {
                        // Remove from local lists
                        self.promotions.removeAll { $0.id == promotion.id }
                        self.p2pPromotions.removeAll { $0.id == promoId }
                        #if DEBUG
                        print("[Promotions] Deleted promotion via P2P API")
                        #endif
                    }
                    completion(success)

                case .failure(let error):
                    self.errorMessage = error.localizedDescription
                    self.showError = true
                    // Fallback to Firebase
                    self.deleteFirebasePromotion(promotion, completion: completion)
                }
            }
        }
    }

    /// Fallback to Firebase for deleting promotions
    private func deleteFirebasePromotion(_ promotion: Promotion, completion: @escaping (Bool) -> Void) {
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

    // MARK: - AI Suggestions

    /// Fetch AI-powered promotion suggestions
    func fetchSuggestions() {
        p2pAPI.getPromotionSuggestions(vendorId: vendorId) { [weak self] result in
            DispatchQueue.main.async {
                switch result {
                case .success(let fetchedSuggestions):
                    self?.suggestions = fetchedSuggestions
                    #if DEBUG
                    print("[Promotions] Loaded \(fetchedSuggestions.count) AI suggestions")
                    #endif

                case .failure(let error):
                    #if DEBUG
                    print("[Promotions] Failed to fetch suggestions: \(error.localizedDescription)")
                    #endif
                }
            }
        }
    }

    /// Quick-create a promotion from an AI suggestion
    func quickCreateFromSuggestion(_ suggestion: P2PPromotionSuggestion, completion: @escaping (Bool) -> Void) {
        isCreating = true

        p2pAPI.quickCreatePromotion(vendorId: vendorId, promoType: suggestion.suggestionType) { [weak self] result in
            guard let self = self else { return }

            DispatchQueue.main.async {
                self.isCreating = false

                switch result {
                case .success(let createdPromo):
                    self.p2pPromotions.append(createdPromo)
                    self.promotions.append(self.convertToPromotion(createdPromo))
                    #if DEBUG
                    print("[Promotions] Quick-created promotion: \(createdPromo.name)")
                    #endif
                    completion(true)

                case .failure(let error):
                    self.errorMessage = error.localizedDescription
                    self.showError = true
                    completion(false)
                }
            }
        }
    }

    // MARK: - Analytics

    /// Fetch promotion analytics
    func fetchAnalytics() {
        p2pAPI.getPromotionAnalytics(vendorId: vendorId) { [weak self] result in
            DispatchQueue.main.async {
                switch result {
                case .success(let fetchedAnalytics):
                    self?.analytics = fetchedAnalytics
                    #if DEBUG
                    print("[Promotions] Loaded analytics: \(fetchedAnalytics.totalPromotions) total promotions")
                    #endif

                case .failure(let error):
                    #if DEBUG
                    print("[Promotions] Failed to fetch analytics: \(error.localizedDescription)")
                    #endif
                }
            }
        }
    }

    // MARK: - Promotion Usage (Firebase fallback)

    func fetchPromotionUsage(promotionId: String, completion: @escaping (Int, Double) -> Void) {
        // First try to get from P2P promotion data
        if let promoId = Int(promotionId),
           let p2pPromo = p2pPromotions.first(where: { $0.id == promoId }) {
            completion(p2pPromo.usageCount ?? 0, p2pPromo.totalDiscountGiven ?? 0.0)
            return
        }

        // Fallback to Firebase
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

    // MARK: - Helpers

    /// Convert P2P promotion to shared Promotion model
    private func convertToPromotion(_ p2pPromo: P2PPromotion) -> Promotion {
        let startTimestamp = parseAPIDate(p2pPromo.startDate)
        let endTimestamp = parseAPIDate(p2pPromo.endDate)

        return Promotion(
            id: String(p2pPromo.id),
            restaurantId: String(p2pPromo.vendorId),
            code: p2pPromo.promotionCode,
            title: p2pPromo.name,
            description: p2pPromo.description ?? "",
            discountType: p2pPromo.type == "percentage" ? "percentage" : "fixed",
            discountValue: p2pPromo.value,
            maxDiscount: p2pPromo.maxDiscount,
            minimumOrder: p2pPromo.minOrderAmount ?? 0,
            startDate: startTimestamp,
            endDate: endTimestamp,
            isActive: p2pPromo.status == "active",
            usageCount: p2pPromo.usageCount ?? 0
        )
    }

    /// Format date for API (ISO 8601)
    private func formatDateForAPI(_ date: Date) -> String {
        let formatter = ISO8601DateFormatter()
        return formatter.string(from: date)
    }

    /// Parse API date string to timestamp
    private func parseAPIDate(_ dateString: String?) -> Int64 {
        guard let dateString = dateString else {
            return Int64(Date().timeIntervalSince1970 * 1000)
        }

        let formatter = ISO8601DateFormatter()
        if let date = formatter.date(from: dateString) {
            return Int64(date.timeIntervalSince1970 * 1000)
        }

        // Try alternate format
        let altFormatter = DateFormatter()
        altFormatter.dateFormat = "yyyy-MM-dd"
        if let date = altFormatter.date(from: dateString) {
            return Int64(date.timeIntervalSince1970 * 1000)
        }

        return Int64(Date().timeIntervalSince1970 * 1000)
    }

    deinit {
        listener?.remove()
    }
}
