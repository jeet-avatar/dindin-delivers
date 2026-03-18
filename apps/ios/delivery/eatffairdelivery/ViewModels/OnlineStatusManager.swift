import Foundation
import Combine
import EatFairShared
import os

private let logger = Logger(subsystem: "com.dollorai.delivery", category: "OnlineStatusManager")

/// Single source of truth for driver online/offline status.
///
/// Replaces three independent isOnline states that previously lived in
/// DeliveryViewModel, RideBiddingViewModel, and EarningsViewModel.
///
/// Responsibilities:
/// - Call PUT /api/auth/driver/online exactly once per toggle
/// - Start/stop LocationManager.shared tracking
/// - Revert isOnline on API failure
/// - Publish isOnline so all ViewModels observe the same value
///
/// Usage: Read OnlineStatusManager.shared.isOnline from any ViewModel.
/// Toggle: call OnlineStatusManager.shared.setOnlineStatus(_:)
final class OnlineStatusManager: ObservableObject {

    static let shared = OnlineStatusManager()

    @Published private(set) var isOnline: Bool = false

    private let p2pService = P2PAPIService.shared
    private var isRequestInFlight = false

    private init() {}

    /// Toggle driver online/offline. Calls backend once; reverts on failure.
    /// Safe to call from any ViewModel — in-flight guard prevents duplicate calls.
    func setOnlineStatus(_ online: Bool) {
        guard !isRequestInFlight else {
            #if DEBUG
            logger.warning("[OnlineStatusManager] setOnlineStatus(\(online)) ignored — request already in flight")
            #endif
            return
        }

        // Optimistic update
        isOnline = online
        isRequestInFlight = true

        // Start/stop location tracking immediately (before API response)
        if online {
            LocationManager.shared.startTracking()
        } else {
            LocationManager.shared.stopTracking()
        }

        p2pService.setDriverOnlineStatus(isOnline: online) { [weak self] result in
            DispatchQueue.main.async {
                guard let self = self else { return }
                self.isRequestInFlight = false

                switch result {
                case .success:
                    #if DEBUG
                    logger.info("[OnlineStatusManager] Status confirmed by backend: isOnline=\(online)")
                    #endif
                    // Speak confirmation only when going online (matches original DeliveryViewModel behavior)
                    if online {
                        VoiceAssistantManager.shared.speak("You are now online and receiving orders")
                    } else {
                        VoiceAssistantManager.shared.speak("You are now offline")
                    }

                case .failure(let error):
                    // Revert optimistic update
                    self.isOnline = !online
                    // Revert location tracking
                    if !online {
                        LocationManager.shared.startTracking() // We tried to go offline but failed
                    } else {
                        LocationManager.shared.stopTracking()  // We tried to go online but failed
                    }
                    #if DEBUG
                    logger.error("[OnlineStatusManager] setOnlineStatus failed: \(error.localizedDescription)")
                    #endif
                }
            }
        }
    }

    /// Called by EarningsViewModel.startSession() when session is written to Firebase.
    /// Sets isOnline=true WITHOUT calling the backend (session flow already handles this
    /// via updateOnlineStatus which calls backend separately).
    func markOnlineLocally() {
        isOnline = true
        LocationManager.shared.startTracking()
    }

    /// Called by EarningsViewModel.endSession() when session ends.
    /// Sets isOnline=false WITHOUT calling the backend (endSession calls updateOnlineStatus separately).
    func markOfflineLocally() {
        isOnline = false
        LocationManager.shared.stopTracking()
    }
}
