import SwiftUI
import Combine
import EatFairShared
import os

private let logger = Logger(subsystem: "com.dollorai.restaurant", category: "PromotionsViewModel")

/// Filter options for promotions list
enum PromotionFilter: String, CaseIterable {
    case all = "All"
    case active = "Active"
    case inactive = "Inactive"
}

/// ViewModel for managing restaurant promotions via P2P backend
class PromotionsViewModel: ObservableObject {
    // MARK: - Published Properties
    @Published var promotions: [P2PPromotion] = []
    @Published var suggestions: [P2PPromotionSuggestion] = []
    @Published var analytics: P2PPromotionAnalytics?
    @Published var isLoading = false
    @Published var error: String?
    @Published var showError = false
    @Published var filterTab: PromotionFilter = .all
    @Published var successMessage: String?
    @Published var showSuccess = false

    // MARK: - Private
    private let p2pAPI = P2PAPIService.shared

    private var vendorId: Int? {
        p2pAPI.currentVendorId
    }

    // MARK: - Computed Properties

    var filteredPromotions: [P2PPromotion] {
        switch filterTab {
        case .all:
            return promotions
        case .active:
            return promotions.filter { $0.status.lowercased() == "active" }
        case .inactive:
            return promotions.filter { $0.status.lowercased() != "active" }
        }
    }

    var activeCount: Int {
        promotions.filter { $0.status.lowercased() == "active" }.count
    }

    var totalRedemptions: Int {
        promotions.compactMap { $0.usageCount }.reduce(0, +)
    }

    // MARK: - Fetch Promotions

    func fetchPromotions() {
        guard let vendorId = vendorId else {
            setError("Vendor ID not available. Please log in again.")
            return
        }

        isLoading = true
        p2pAPI.getVendorPromotions(vendorId: vendorId) { [weak self] result in
            guard let self = self else { return }
            self.isLoading = false
            switch result {
            case .success(let promos):
                self.promotions = promos
                #if DEBUG
                logger.info("Fetched \(promos.count) promotions")
                #endif
            case .failure(let error):
                self.setError("Failed to load promotions: \(error.localizedDescription)")
            }
        }
    }

    // MARK: - Create Promotion

    func createPromotion(_ data: P2PPromotionCreate) {
        guard let vendorId = vendorId else {
            setError("Vendor ID not available.")
            return
        }

        isLoading = true
        p2pAPI.createPromotion(vendorId: vendorId, promotion: data) { [weak self] result in
            guard let self = self else { return }
            self.isLoading = false
            switch result {
            case .success(let promo):
                self.promotions.insert(promo, at: 0)
                self.setSuccess("Promotion \"\(promo.name)\" created successfully!")
                #if DEBUG
                logger.info("Created promotion: \(promo.name)")
                #endif
            case .failure(let error):
                self.setError("Failed to create promotion: \(error.localizedDescription)")
            }
        }
    }

    // MARK: - Update Promotion

    func updatePromotion(id: Int, updates: [String: Any]) {
        isLoading = true
        p2pAPI.updatePromotion(promotionId: id, updates: updates) { [weak self] result in
            guard let self = self else { return }
            self.isLoading = false
            switch result {
            case .success(let updatedPromo):
                if let index = self.promotions.firstIndex(where: { $0.id == id }) {
                    self.promotions[index] = updatedPromo
                }
                self.setSuccess("Promotion updated successfully!")
                #if DEBUG
                logger.info("Updated promotion ID: \(id)")
                #endif
            case .failure(let error):
                self.setError("Failed to update promotion: \(error.localizedDescription)")
            }
        }
    }

    // MARK: - Delete Promotion

    func deletePromotion(id: Int) {
        isLoading = true
        p2pAPI.deletePromotion(promotionId: id) { [weak self] result in
            guard let self = self else { return }
            self.isLoading = false
            switch result {
            case .success(let success):
                if success {
                    self.promotions.removeAll { $0.id == id }
                    self.setSuccess("Promotion deleted.")
                } else {
                    self.setError("Failed to delete promotion.")
                }
            case .failure(let error):
                self.setError("Failed to delete: \(error.localizedDescription)")
            }
        }
    }

    // MARK: - Toggle Promotion (Active <-> Paused)

    func togglePromotion(_ promo: P2PPromotion) {
        let newStatus = promo.status.lowercased() == "active" ? "paused" : "active"
        updatePromotion(id: promo.id, updates: ["status": newStatus])
    }

    // MARK: - AI Suggestions

    func fetchSuggestions() {
        guard let vendorId = vendorId else { return }

        p2pAPI.getPromotionSuggestions(vendorId: vendorId) { [weak self] result in
            guard let self = self else { return }
            switch result {
            case .success(let suggestions):
                self.suggestions = suggestions
                #if DEBUG
                logger.info("Fetched \(suggestions.count) AI suggestions")
                #endif
            case .failure(let error):
                #if DEBUG
                logger.error("Failed to fetch suggestions: \(error.localizedDescription)")
                #endif
            }
        }
    }

    // MARK: - Quick Create

    func quickCreate(type: String) {
        guard let vendorId = vendorId else {
            setError("Vendor ID not available.")
            return
        }

        isLoading = true
        p2pAPI.quickCreatePromotion(vendorId: vendorId, promoType: type) { [weak self] result in
            guard let self = self else { return }
            self.isLoading = false
            switch result {
            case .success(let promo):
                self.promotions.insert(promo, at: 0)
                self.setSuccess("\"\(promo.name)\" created!")
                #if DEBUG
                logger.info("Quick-created promotion: \(promo.name)")
                #endif
            case .failure(let error):
                self.setError("Quick create failed: \(error.localizedDescription)")
            }
        }
    }

    // MARK: - Analytics

    func fetchAnalytics() {
        guard let vendorId = vendorId else { return }

        p2pAPI.getPromotionAnalytics(vendorId: vendorId) { [weak self] result in
            guard let self = self else { return }
            switch result {
            case .success(let analytics):
                self.analytics = analytics
            case .failure(let error):
                #if DEBUG
                logger.error("Failed to fetch analytics: \(error.localizedDescription)")
                #endif
            }
        }
    }

    // MARK: - Helpers

    private func setError(_ message: String) {
        error = message
        showError = true
        #if DEBUG
        logger.error("\(message)")
        #endif
    }

    private func setSuccess(_ message: String) {
        successMessage = message
        showSuccess = true
    }
}
