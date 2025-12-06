import SwiftUI
import Combine
import FirebaseFirestore
import FirebaseAuth
import EatFairShared
import CoreLocation

class EarningsViewModel: ObservableObject {
    // MARK: - Configuration
    private var config: AppConfig { AppConfig.shared }
    @Published var todayEarnings: Double = 0.0
    @Published var weekEarnings: Double = 0.0
    @Published var monthEarnings: Double = 0.0

    @Published var todayDeliveries: Int = 0
    @Published var weekDeliveries: Int = 0
    @Published var monthDeliveries: Int = 0

    @Published var todayHours: Double = 0.0
    @Published var weekHours: Double = 0.0
    @Published var monthHours: Double = 0.0

    @Published var dailyEarnings: [DailyEarning] = []
    @Published var isOnline: Bool = false

    @Published var todayBreakdown: EarningsBreakdown = EarningsBreakdown()
    @Published var weekBreakdown: EarningsBreakdown = EarningsBreakdown()
    @Published var monthBreakdown: EarningsBreakdown = EarningsBreakdown()

    @Published var currentSessionId: String?
    @Published var sessionStartTime: Date?
    @Published var recentTips: [Tip] = []

    private var db = Firestore.firestore()
    private var cancellables = Set<AnyCancellable>()
    private var locationManager = CLLocationManager()
    private var tipListener: ListenerRegistration?

    // Helper to get current driver ID (P2P or Firebase)
    private var currentDriverId: String? {
        // Try P2P auth first
        if let p2pDriverId = UserDefaults.standard.object(forKey: UserDefaultsKeys.driverId) as? Int {
            return String(p2pDriverId)
        }
        // Fallback to Firebase
        return Auth.auth().currentUser?.uid
    }

    func fetchEarnings() {
        guard let uid = currentDriverId else { return }
        
        let now = Date()
        let calendar = Calendar.current

        // Start of today
        let startOfToday = calendar.startOfDay(for: now)
        let todayTimestamp = Int64(startOfToday.timeIntervalSince1970 * 1000)

        // Start of week (Monday)
        guard let startOfWeek = calendar.date(from: calendar.dateComponents([.yearForWeekOfYear, .weekOfYear], from: now)) else { return }
        let weekTimestamp = Int64(startOfWeek.timeIntervalSince1970 * 1000)

        // Start of month
        guard let startOfMonth = calendar.date(from: calendar.dateComponents([.year, .month], from: now)) else { return }
        let monthTimestamp = Int64(startOfMonth.timeIntervalSince1970 * 1000)
        
        // Fetch today's earnings
        fetchPeriodEarnings(driverId: uid, startTimestamp: todayTimestamp) { earnings, count, breakdown in
            self.todayEarnings = earnings
            self.todayDeliveries = count
            self.todayBreakdown = breakdown
        }
        
        // Fetch week's earnings
        fetchPeriodEarnings(driverId: uid, startTimestamp: weekTimestamp) { earnings, count, breakdown in
            self.weekEarnings = earnings
            self.weekDeliveries = count
            self.weekBreakdown = breakdown
        }
        
        // Fetch month's earnings
        fetchPeriodEarnings(driverId: uid, startTimestamp: monthTimestamp) { earnings, count, breakdown in
            self.monthEarnings = earnings
            self.monthDeliveries = count
            self.monthBreakdown = breakdown
        }
        
        // Fetch daily breakdown for the week
        fetchDailyBreakdown(driverId: uid, startTimestamp: weekTimestamp)
    }
    
    private func fetchPeriodEarnings(driverId: String, startTimestamp: Int64, completion: @escaping (Double, Int, EarningsBreakdown) -> Void) {
        db.collection("orders")
            .whereField("driverId", isEqualTo: driverId)
            .whereField("status", isEqualTo: DeliveryOrderStatus.delivered.displayName)
            .whereField("deliveredAt", isGreaterThanOrEqualTo: startTimestamp)
            .getDocuments { snapshot, error in
                if let error = error {
                    #if DEBUG
                    print("Error fetching earnings: \(error)")
                    #endif
                    completion(0.0, 0, EarningsBreakdown())
                    return
                }
                
                guard let documents = snapshot?.documents else {
                    completion(0.0, 0, EarningsBreakdown())
                    return
                }
                
                var breakdown = EarningsBreakdown()
                
                for doc in documents {
                    let deliveryFee = doc.data()["deliveryFee"] as? Double ?? 0.0
                    let priorityFee = doc.data()["priorityFee"] as? Double ?? 0.0
                    let total = doc.data()["total"] as? Double ?? 0.0
                    // Use actual tip if available, otherwise estimate from config
                    let tip = doc.data()["tip"] as? Double ?? (total * self.config.defaultTipRate)

                    breakdown.deliveryFees += deliveryFee
                    breakdown.bonuses += priorityFee
                    breakdown.tips += tip
                }
                
                breakdown.total = breakdown.deliveryFees + breakdown.tips + breakdown.bonuses
                
                completion(breakdown.total, documents.count, breakdown)
            }
    }
    
    private func fetchDailyBreakdown(driverId: String, startTimestamp: Int64) {
        db.collection("orders")
            .whereField("driverId", isEqualTo: driverId)
            .whereField("status", isEqualTo: DeliveryOrderStatus.delivered.displayName)
            .whereField("deliveredAt", isGreaterThanOrEqualTo: startTimestamp)
            .getDocuments { snapshot, error in
                if let error = error {
                    #if DEBUG
                    print("Error fetching daily breakdown: \(error)")
                    #endif
                    return
                }
                
                guard let documents = snapshot?.documents else { return }
                
                // Group by day
                var dailyMap: [String: (earnings: Double, count: Int)] = [:]
                let dateFormatter = DateFormatter()
                dateFormatter.dateFormat = "EEE"
                
                for doc in documents {
                    if let deliveredAt = doc.data()["deliveredAt"] as? Int64 {
                        let date = Date(timeIntervalSince1970: TimeInterval(deliveredAt / 1000))
                        let dayKey = dateFormatter.string(from: date)

                        let deliveryFee = doc.data()["deliveryFee"] as? Double ?? 0.0
                        let priorityFee = doc.data()["priorityFee"] as? Double ?? 0.0
                        let total = doc.data()["total"] as? Double ?? 0.0
                        // Use actual tip if available, otherwise estimate from config
                        let tip = doc.data()["tip"] as? Double ?? (total * self.config.defaultTipRate)
                        let earnings = deliveryFee + priorityFee + tip
                        
                        if var existing = dailyMap[dayKey] {
                            existing.earnings += earnings
                            existing.count += 1
                            dailyMap[dayKey] = existing
                        } else {
                            dailyMap[dayKey] = (earnings, 1)
                        }
                    }
                }
                
                // Convert to array
                self.dailyEarnings = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map { day in
                    DailyEarning(day: day, amount: dailyMap[day]?.earnings ?? 0.0)
                }
            }
    }
    
    func updateOnlineStatus(_ status: Bool) {
        guard let uid = currentDriverId else { return }
        
        let driverData: [String: Any] = [
            "isOnline": status,
            "lastActive": Int64(Date().timeIntervalSince1970 * 1000)
        ]
        
        db.collection("drivers").document(uid).setData(driverData, merge: true) { error in
            if let error = error {
                #if DEBUG
                print("Error updating online status: \(error)")
                #endif
            } else {
                self.isOnline = status
            }
        }
    }
    
    func fetchOnlineStatus() {
        guard let uid = currentDriverId else { return }
        
        db.collection("drivers").document(uid).getDocument { snapshot, error in
            if let data = snapshot?.data() {
                self.isOnline = data["isOnline"] as? Bool ?? false
            }
        }
    }
    
    // MARK: - Mock Data for Testing (DEBUG only)
    #if DEBUG
    func loadMockData() {
        self.todayEarnings = 127.50
        self.weekEarnings = 892.30
        self.monthEarnings = 3456.80

        self.todayDeliveries = 12
        self.weekDeliveries = 67
        self.monthDeliveries = 284

        self.todayHours = 6.4
        self.weekHours = 38.0
        self.monthHours = 156.0

        self.dailyEarnings = [
            DailyEarning(day: "Mon", amount: 98.50),
            DailyEarning(day: "Tue", amount: 145.75),
            DailyEarning(day: "Wed", amount: 167.20),
            DailyEarning(day: "Thu", amount: 132.85),
            DailyEarning(day: "Fri", amount: 189.40),
            DailyEarning(day: "Sat", amount: 231.60),
            DailyEarning(day: "Sun", amount: 127.50)
        ]

        self.isOnline = true
    }
    #endif
    
    // MARK: - Session Tracking
    func startSession() {
        guard let uid = currentDriverId else { return }
        
        locationManager.requestWhenInUseAuthorization()
        
        let currentLocation = locationManager.location?.coordinate
        let session = DriverSession(
            id: UUID().uuidString,
            driverId: uid,
            startTime: Int64(Date().timeIntervalSince1970 * 1000),
            endTime: nil,
            duration: nil,
            startLocation: currentLocation.map { LocationCoordinate(
                latitude: $0.latitude,
                longitude: $0.longitude
            ) },
            endLocation: nil,
            deliveriesCompleted: 0,
            deliveriesCancelled: 0,
            totalDistance: 0.0,
            totalEarnings: 0.0,
            deviceInfo: "\(UIDevice.current.model) - \(UIDevice.current.systemName) \(UIDevice.current.systemVersion)",
            appVersion: Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "1.0"
        )
        
        guard let sessionId = session.id else { return }
        
        do {
            try db.collection("driver_sessions").document(sessionId).setData(from: session)
            currentSessionId = sessionId
            sessionStartTime = Date()
            isOnline = true
            
            // Update driver status
            db.collection("drivers").document(uid).updateData([
                "currentSessionId": sessionId,
                "isOnline": true
            ])
        } catch {
            #if DEBUG
            print("Error starting session: \(error)")
            #endif
        }
    }
    
    func endSession() {
        guard let sessionId = currentSessionId,
              let uid = currentDriverId,
              let startTime = sessionStartTime else { return }
        
        let endTime = Date()
        let duration = endTime.timeIntervalSince(startTime) / 3600.0 // hours
        
        let currentLocation = locationManager.location?.coordinate
        
        let endLocationData: Any = currentLocation.map { [
            "latitude": $0.latitude,
            "longitude": $0.longitude
        ] as [String: Any] } ?? NSNull()

        db.collection("driver_sessions").document(sessionId).updateData([
            "endTime": Int64(endTime.timeIntervalSince1970 * 1000),
            "duration": duration,
            "endLocation": endLocationData
        ])
        
        // Fetch session data to update driver stats
        db.collection("driver_sessions").document(sessionId).getDocument { [weak self] document, _ in
            if let session = try? document?.data(as: DriverSession.self) {
                self?.updateDriverStats(driverId: uid, session: session)
            }
        }
        
        // Update driver status
        db.collection("drivers").document(uid).updateData([
            "currentSessionId": NSNull(),
            "isOnline": false
        ])
        
        currentSessionId = nil
        sessionStartTime = nil
        isOnline = false
    }
    
    private func updateDriverStats(driverId: String, session: DriverSession) {
        db.collection("drivers").document(driverId).getDocument { [weak self] document, _ in
            guard let data = document?.data(),
                  var stats = data["stats"] as? [String: Any] else { return }
            
            // Update cumulative stats
            let currentDistance = stats["totalDistance"] as? Double ?? 0.0
            let currentTime = stats["totalOnlineTime"] as? Double ?? 0.0
            let currentEarnings = stats["totalEarnings"] as? Double ?? 0.0
            
            stats["totalDistance"] = currentDistance + session.totalDistance
            stats["totalOnlineTime"] = currentTime + (session.duration ?? 0.0)
            stats["totalEarnings"] = currentEarnings + session.totalEarnings
            
            self?.db.collection("drivers").document(driverId).updateData([
                "stats": stats
            ])
        }
    }
    
    // MARK: - Tip Listening
    func listenForTips() {
        guard let uid = currentDriverId else { return }
        
        tipListener = db.collection("tips")
            .whereField("driverId", isEqualTo: uid)
            .order(by: "createdAt", descending: true)
            .limit(to: 5)
            .addSnapshotListener { [weak self] snapshot, error in
                guard let documents = snapshot?.documents else { return }
                
                self?.recentTips = documents.compactMap { doc in
                    try? doc.data(as: Tip.self)
                }
            }
    }
    
    deinit {
        tipListener?.remove()
    }
}

struct DailyEarning: Identifiable {
    let id = UUID()
    let day: String
    let amount: Double
}

struct EarningsBreakdown {
    var deliveryFees: Double = 0.0
    var tips: Double = 0.0
    var bonuses: Double = 0.0
    var total: Double = 0.0
}
