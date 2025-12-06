import SwiftUI
import Combine
import FirebaseAuth
import FirebaseFirestore
import FirebaseStorage
import EatFairShared

@MainActor
class DriverProfileViewModel: ObservableObject {
    // MARK: - Published Properties
    @Published var driver: Driver?
    @Published var isLoading = false
    @Published var isEditing = false
    @Published var showError = false
    @Published var errorMessage = ""

    // MARK: - Personal Info
    @Published var name = ""
    @Published var email = ""
    @Published var phone = ""
    @Published var dateOfBirth: Date?

    // MARK: - Address
    @Published var street = ""
    @Published var city = ""
    @Published var state = ""
    @Published var zipCode = ""

    // MARK: - Driver's License
    @Published var licenseNumber = ""
    @Published var licenseState = ""
    @Published var licenseClass = "C"
    @Published var licenseExpiration: Date?
    @Published var licenseFrontUrl: String?
    @Published var licenseBackUrl: String?

    // MARK: - Vehicle
    @Published var vehicleMake = ""
    @Published var vehicleModel = ""
    @Published var vehicleYear = Calendar.current.component(.year, from: Date())
    @Published var vehicleColor = ""
    @Published var vehicleType = "Sedan"
    @Published var licensePlate = ""
    @Published var plateState = ""
    @Published var vehicleFrontUrl: String?
    @Published var vehicleSideUrl: String?
    @Published var vehicleBackUrl: String?

    // MARK: - Insurance
    @Published var insuranceProvider = ""
    @Published var insurancePolicyNumber = ""
    @Published var insuranceExpiration: Date?
    @Published var insuranceCardUrl: String?

    // MARK: - Bank Account
    @Published var bankName = ""
    @Published var accountHolderName = ""
    @Published var accountType = "checking"
    @Published var routingNumber = ""
    @Published var accountNumber = ""

    // MARK: - Preferences
    @Published var notificationsEnabled = true
    @Published var soundEnabled = true
    @Published var acceptCashOrders = true
    @Published var maxDeliveryDistance: Double = AppConfig.shared.maxDeliveryDistanceMiles

    // MARK: - Expiration Alerts
    @Published var expirationAlerts: [ExpirationAlert] = []

    struct ExpirationAlert: Identifiable {
        let id = UUID()
        let type: DocumentType
        let documentName: String
        let expirationDate: Date
        let daysRemaining: Int
        let isExpired: Bool
        let isUrgent: Bool // < 30 days

        var icon: String {
            switch type {
            case .license: return "car.fill"
            case .insurance: return "shield.fill"
            case .registration: return "doc.text.fill"
            }
        }

        var color: Color {
            if isExpired { return .red }
            if isUrgent { return .orange }
            return .yellow
        }

        var message: String {
            if isExpired {
                return "\(documentName) has expired"
            } else if daysRemaining <= 7 {
                return "\(documentName) expires in \(daysRemaining) day\(daysRemaining == 1 ? "" : "s")"
            } else {
                return "\(documentName) expires in \(daysRemaining) days"
            }
        }
    }

    enum DocumentType {
        case license, insurance, registration
    }

    // MARK: - Private Properties
    private let db = Firestore.firestore()
    private let storage = Storage.storage()
    private let p2pService = P2PAPIService.shared

    // Helper to get current driver ID (P2P or Firebase)
    private var currentDriverId: String? {
        // Try P2P auth first
        if let p2pDriverId = UserDefaults.standard.object(forKey: UserDefaultsKeys.driverId) as? Int {
            return String(p2pDriverId)
        }
        // Fallback to Firebase
        return Auth.auth().currentUser?.uid
    }

    // MARK: - Fetch Profile
    func fetchProfile() {
        // First try P2P API
        if let driverId = UserDefaults.standard.object(forKey: UserDefaultsKeys.driverId) as? Int {
            fetchP2PProfile(driverId: driverId)
            return
        }

        // Fallback to Firebase
        guard let uid = Auth.auth().currentUser?.uid else {
            errorMessage = "Not logged in"
            showError = true
            return
        }

        isLoading = true

        db.collection("drivers").document(uid).getDocument { [weak self] snapshot, error in
            DispatchQueue.main.async {
                self?.isLoading = false

                if let error = error {
                    self?.errorMessage = error.localizedDescription
                    self?.showError = true
                    return
                }

                if let data = snapshot?.data() {
                    self?.parseDriverData(data)
                } else {
                    // Create new driver profile if doesn't exist
                    self?.createNewProfile(uid: uid)
                }
            }
        }
    }

    // MARK: - Fetch P2P Profile
    private func fetchP2PProfile(driverId: Int) {
        isLoading = true

        p2pService.getDriverProfile(driverId: driverId) { [weak self] result in
            DispatchQueue.main.async {
                self?.isLoading = false

                switch result {
                case .success(let driverData):
                    self?.parseP2PDriverData(driverData)
                case .failure(let error):
                    self?.errorMessage = error.localizedDescription
                    self?.showError = true
                }
            }
        }
    }

    private func parseP2PDriverData(_ data: [String: Any]) {
        // Personal Info from P2P response
        name = data["name"] as? String ?? data["full_name"] as? String ?? ""
        email = data["email"] as? String ?? ""
        phone = data["phone"] as? String ?? data["phone_number"] as? String ?? ""

        // Approval status
        let approvalStatus = data["status"] as? String ?? data["approval_status"] as? String ?? "pending"
        let isApproved = approvalStatus == "approved" || approvalStatus == "active"

        // Build a basic driver object for P2P data
        driver = Driver(
            id: String(data["id"] as? Int ?? 0),
            name: name,
            email: email,
            phone: phone,
            profileImageUrl: data["profile_image"] as? String,
            dateOfBirth: nil,
            address: nil,
            driversLicense: nil,
            vehicle: nil,
            vehicleType: data["vehicle_type"] as? String ?? "Car",
            licensePlate: data["license_plate"] as? String ?? "",
            insurance: nil,
            bankAccount: nil,
            isOnline: data["is_online"] as? Bool ?? false,
            isApproved: isApproved,
            approvalStatus: approvalStatus,
            currentLatitude: data["latitude"] as? Double ?? 0.0,
            currentLongitude: data["longitude"] as? Double ?? 0.0,
            stats: DriverStats(
                rating: data["rating"] as? Double ?? 5.0,
                totalDeliveries: data["total_deliveries"] as? Int ?? 0,
                completedDeliveries: data["completed_deliveries"] as? Int ?? 0,
                cancelledDeliveries: 0,
                totalEarnings: data["total_earnings"] as? Double ?? 0.0,
                totalDistance: 0.0,
                totalOnlineTime: 0.0,
                acceptanceRate: 100.0,
                completionRate: 100.0,
                onTimeRate: 100.0,
                weeklyDeliveries: 0,
                weeklyEarnings: 0.0,
                weeklyHours: 0.0,
                weeklyDistance: 0.0
            )
        )
    }

    private func parseDriverData(_ data: [String: Any]) {
        // Personal Info
        name = data["name"] as? String ?? ""
        email = data["email"] as? String ?? Auth.auth().currentUser?.email ?? ""
        phone = data["phone"] as? String ?? ""

        if let dobTimestamp = data["dateOfBirth"] as? Int64 {
            dateOfBirth = Date(timeIntervalSince1970: TimeInterval(dobTimestamp / 1000))
        }

        // Address
        if let addressData = data["address"] as? [String: Any] {
            street = addressData["street"] as? String ?? ""
            city = addressData["city"] as? String ?? ""
            state = addressData["state"] as? String ?? ""
            zipCode = addressData["zipCode"] as? String ?? ""
        }

        // Driver's License
        if let licenseData = data["driversLicense"] as? [String: Any] {
            licenseNumber = licenseData["licenseNumber"] as? String ?? ""
            licenseState = licenseData["state"] as? String ?? ""
            licenseClass = licenseData["licenseClass"] as? String ?? "C"
            licenseFrontUrl = licenseData["frontImageUrl"] as? String
            licenseBackUrl = licenseData["backImageUrl"] as? String

            if let expTimestamp = licenseData["expirationDate"] as? Int64 {
                licenseExpiration = Date(timeIntervalSince1970: TimeInterval(expTimestamp / 1000))
            }
        }

        // Vehicle Info
        if let vehicleData = data["vehicle"] as? [String: Any] {
            vehicleMake = vehicleData["make"] as? String ?? ""
            vehicleModel = vehicleData["model"] as? String ?? ""
            vehicleYear = vehicleData["year"] as? Int ?? Calendar.current.component(.year, from: Date())
            vehicleColor = vehicleData["color"] as? String ?? ""
            vehicleType = vehicleData["vehicleType"] as? String ?? "Sedan"
            licensePlate = vehicleData["licensePlate"] as? String ?? ""
            plateState = vehicleData["state"] as? String ?? ""
            vehicleFrontUrl = vehicleData["frontImageUrl"] as? String
            vehicleSideUrl = vehicleData["sideImageUrl"] as? String
            vehicleBackUrl = vehicleData["backImageUrl"] as? String
        } else {
            // Fallback to top-level fields for backward compatibility
            vehicleType = data["vehicleType"] as? String ?? "Car"
            licensePlate = data["licensePlate"] as? String ?? ""
        }

        // Insurance
        if let insuranceData = data["insurance"] as? [String: Any] {
            insuranceProvider = insuranceData["provider"] as? String ?? ""
            insurancePolicyNumber = insuranceData["policyNumber"] as? String ?? ""
            insuranceCardUrl = insuranceData["insuranceCardImageUrl"] as? String

            if let expTimestamp = insuranceData["expirationDate"] as? Int64 {
                insuranceExpiration = Date(timeIntervalSince1970: TimeInterval(expTimestamp / 1000))
            }
        }

        // Bank Account
        if let bankData = data["bankAccount"] as? [String: Any] {
            bankName = bankData["bankName"] as? String ?? ""
            accountHolderName = bankData["accountHolderName"] as? String ?? ""
            accountType = bankData["accountType"] as? String ?? "checking"
        }

        // Preferences
        if let prefsData = data["preferences"] as? [String: Any] {
            notificationsEnabled = prefsData["notificationsEnabled"] as? Bool ?? true
            soundEnabled = prefsData["soundEnabled"] as? Bool ?? true
            acceptCashOrders = prefsData["acceptCashOrders"] as? Bool ?? true
            maxDeliveryDistance = prefsData["maxDeliveryDistance"] as? Double ?? AppConfig.shared.maxDeliveryDistanceMiles
        }

        // Build Driver object for display
        buildDriverObject(from: data)

        // Check for expiring documents
        checkDocumentExpirations()
    }

    // MARK: - Expiration Check

    func checkDocumentExpirations() {
        var alerts: [ExpirationAlert] = []
        let now = Date()
        let alertThreshold = 60 // days - warn if expiring within 60 days

        // Check Driver's License
        if let licenseExp = licenseExpiration {
            let daysRemaining = Calendar.current.dateComponents([.day], from: now, to: licenseExp).day ?? 0
            if daysRemaining <= alertThreshold {
                alerts.append(ExpirationAlert(
                    type: .license,
                    documentName: "Driver's License",
                    expirationDate: licenseExp,
                    daysRemaining: max(0, daysRemaining),
                    isExpired: daysRemaining <= 0,
                    isUrgent: daysRemaining <= 30
                ))
            }
        }

        // Check Insurance
        if let insuranceExp = insuranceExpiration {
            let daysRemaining = Calendar.current.dateComponents([.day], from: now, to: insuranceExp).day ?? 0
            if daysRemaining <= alertThreshold {
                alerts.append(ExpirationAlert(
                    type: .insurance,
                    documentName: "Insurance",
                    expirationDate: insuranceExp,
                    daysRemaining: max(0, daysRemaining),
                    isExpired: daysRemaining <= 0,
                    isUrgent: daysRemaining <= 30
                ))
            }
        }

        // Sort by urgency (expired first, then by days remaining)
        expirationAlerts = alerts.sorted { first, second in
            if first.isExpired && !second.isExpired { return true }
            if !first.isExpired && second.isExpired { return false }
            return first.daysRemaining < second.daysRemaining
        }
    }

    private func buildDriverObject(from data: [String: Any]) {
        var statsObj: DriverStats?
        if let statsData = data["stats"] as? [String: Any] {
            statsObj = DriverStats(
                rating: statsData["rating"] as? Double ?? 5.0,
                totalDeliveries: statsData["totalDeliveries"] as? Int ?? 0,
                completedDeliveries: statsData["completedDeliveries"] as? Int ?? 0,
                cancelledDeliveries: statsData["cancelledDeliveries"] as? Int ?? 0,
                totalEarnings: statsData["totalEarnings"] as? Double ?? 0.0,
                totalDistance: statsData["totalDistance"] as? Double ?? 0.0,
                totalOnlineTime: statsData["totalOnlineTime"] as? Double ?? 0.0,
                acceptanceRate: statsData["acceptanceRate"] as? Double ?? 100.0,
                completionRate: statsData["completionRate"] as? Double ?? 100.0,
                onTimeRate: statsData["onTimeRate"] as? Double ?? 100.0,
                weeklyDeliveries: statsData["weeklyDeliveries"] as? Int ?? 0,
                weeklyEarnings: statsData["weeklyEarnings"] as? Double ?? 0.0,
                weeklyHours: statsData["weeklyHours"] as? Double ?? 0.0,
                weeklyDistance: statsData["weeklyDistance"] as? Double ?? 0.0
            )
        }

        driver = Driver(
            id: Auth.auth().currentUser?.uid,
            name: name,
            email: email,
            phone: phone,
            profileImageUrl: data["profileImageUrl"] as? String,
            dateOfBirth: data["dateOfBirth"] as? Int64,
            address: DriverAddress(
                street: street,
                city: city,
                state: state,
                zipCode: zipCode
            ),
            driversLicense: DriversLicense(
                licenseNumber: licenseNumber,
                state: licenseState,
                licenseClass: licenseClass,
                frontImageUrl: licenseFrontUrl,
                backImageUrl: licenseBackUrl,
                isVerified: (data["driversLicense"] as? [String: Any])?["isVerified"] as? Bool ?? false
            ),
            vehicle: VehicleInfo(
                make: vehicleMake,
                model: vehicleModel,
                year: vehicleYear,
                color: vehicleColor,
                licensePlate: licensePlate,
                state: plateState,
                vehicleType: vehicleType,
                frontImageUrl: vehicleFrontUrl,
                sideImageUrl: vehicleSideUrl,
                backImageUrl: vehicleBackUrl,
                isVerified: (data["vehicle"] as? [String: Any])?["isVerified"] as? Bool ?? false
            ),
            vehicleType: vehicleType,
            licensePlate: licensePlate,
            insurance: InsuranceInfo(
                provider: insuranceProvider,
                policyNumber: insurancePolicyNumber,
                insuranceCardImageUrl: insuranceCardUrl,
                isVerified: (data["insurance"] as? [String: Any])?["isVerified"] as? Bool ?? false
            ),
            bankAccount: BankAccountInfo(
                bankName: bankName,
                accountHolderName: accountHolderName,
                accountType: accountType,
                accountNumberLast4: (data["bankAccount"] as? [String: Any])?["accountNumberLast4"] as? String ?? "",
                isVerified: (data["bankAccount"] as? [String: Any])?["isVerified"] as? Bool ?? false
            ),
            isOnline: data["isOnline"] as? Bool ?? false,
            isApproved: data["isApproved"] as? Bool ?? false,
            approvalStatus: data["approvalStatus"] as? String ?? "pending",
            currentLatitude: data["currentLatitude"] as? Double ?? 0.0,
            currentLongitude: data["currentLongitude"] as? Double ?? 0.0,
            stats: statsObj
        )
    }

    private func createNewProfile(uid: String) {
        let initialData: [String: Any] = [
            "name": Auth.auth().currentUser?.displayName ?? "",
            "email": Auth.auth().currentUser?.email ?? "",
            "phone": Auth.auth().currentUser?.phoneNumber ?? "",
            "isOnline": false,
            "isApproved": false,
            "approvalStatus": "pending",
            "currentLatitude": 0.0,
            "currentLongitude": 0.0,
            "createdAt": Int64(Date().timeIntervalSince1970 * 1000),
            "stats": [
                "rating": 5.0,
                "totalDeliveries": 0,
                "completedDeliveries": 0,
                "cancelledDeliveries": 0,
                "totalEarnings": 0.0,
                "totalDistance": 0.0,
                "totalOnlineTime": 0.0,
                "acceptanceRate": 100.0,
                "completionRate": 100.0,
                "onTimeRate": 100.0,
                "weeklyDeliveries": 0,
                "weeklyEarnings": 0.0,
                "weeklyHours": 0.0,
                "weeklyDistance": 0.0
            ] as [String: Any]
        ]

        db.collection("drivers").document(uid).setData(initialData) { [weak self] error in
            guard let self = self else { return }
            if let error = error {
                DispatchQueue.main.async {
                    self.errorMessage = error.localizedDescription
                    self.showError = true
                }
            } else {
                DispatchQueue.main.async {
                    self.fetchProfile()
                }
            }
        }
    }

    // MARK: - Save Profile
    func saveProfile() {
        guard let uid = Auth.auth().currentUser?.uid else { return }

        isLoading = true

        var driverData: [String: Any] = [
            "name": name,
            "email": email,
            "phone": phone,
            "updatedAt": Int64(Date().timeIntervalSince1970 * 1000)
        ]

        // Date of Birth
        if let dob = dateOfBirth {
            driverData["dateOfBirth"] = Int64(dob.timeIntervalSince1970 * 1000)
        }

        // Address
        driverData["address"] = [
            "street": street,
            "city": city,
            "state": state,
            "zipCode": zipCode,
            "country": "USA"
        ]

        // Driver's License
        var licenseData: [String: Any] = [
            "licenseNumber": licenseNumber,
            "state": licenseState,
            "licenseClass": licenseClass
        ]
        if let exp = licenseExpiration {
            licenseData["expirationDate"] = Int64(exp.timeIntervalSince1970 * 1000)
        }
        if let frontUrl = licenseFrontUrl {
            licenseData["frontImageUrl"] = frontUrl
        }
        if let backUrl = licenseBackUrl {
            licenseData["backImageUrl"] = backUrl
        }
        driverData["driversLicense"] = licenseData

        // Vehicle
        var vehicleData: [String: Any] = [
            "make": vehicleMake,
            "model": vehicleModel,
            "year": vehicleYear,
            "color": vehicleColor,
            "vehicleType": vehicleType,
            "licensePlate": licensePlate,
            "state": plateState
        ]
        if let frontUrl = vehicleFrontUrl {
            vehicleData["frontImageUrl"] = frontUrl
        }
        if let sideUrl = vehicleSideUrl {
            vehicleData["sideImageUrl"] = sideUrl
        }
        if let backUrl = vehicleBackUrl {
            vehicleData["backImageUrl"] = backUrl
        }
        driverData["vehicle"] = vehicleData

        // Also store at top level for backward compatibility
        driverData["vehicleType"] = vehicleType
        driverData["licensePlate"] = licensePlate

        // Insurance
        var insuranceData: [String: Any] = [
            "provider": insuranceProvider,
            "policyNumber": insurancePolicyNumber
        ]
        if let exp = insuranceExpiration {
            insuranceData["expirationDate"] = Int64(exp.timeIntervalSince1970 * 1000)
        }
        if let cardUrl = insuranceCardUrl {
            insuranceData["insuranceCardImageUrl"] = cardUrl
        }
        driverData["insurance"] = insuranceData

        // Bank Account (only save if provided)
        if !bankName.isEmpty {
            var bankData: [String: Any] = [
                "bankName": bankName,
                "accountHolderName": accountHolderName,
                "accountType": accountType
            ]
            if !routingNumber.isEmpty {
                bankData["routingNumber"] = routingNumber
            }
            if !accountNumber.isEmpty {
                // Only store last 4 digits
                let last4 = String(accountNumber.suffix(4))
                bankData["accountNumberLast4"] = last4
            }
            driverData["bankAccount"] = bankData
        }

        // Preferences
        driverData["preferences"] = [
            "notificationsEnabled": notificationsEnabled,
            "soundEnabled": soundEnabled,
            "acceptCashOrders": acceptCashOrders,
            "maxDeliveryDistance": maxDeliveryDistance
        ]

        db.collection("drivers").document(uid).setData(driverData, merge: true) { [weak self] error in
            DispatchQueue.main.async {
                self?.isLoading = false

                if let error = error {
                    self?.errorMessage = error.localizedDescription
                    self?.showError = true
                } else {
                    self?.isEditing = false
                    self?.fetchProfile() // Refresh data
                }
            }
        }
    }

    // MARK: - Upload Profile Image
    func uploadProfileImage(_ data: Data) async {
        // Try P2P upload first if logged in via P2P
        if let p2pDriverId = UserDefaults.standard.object(forKey: UserDefaultsKeys.driverId) as? Int {
            await uploadProfileImageViaP2P(data: data, driverId: p2pDriverId)
            return
        }

        // Fallback to Firebase
        guard let uid = Auth.auth().currentUser?.uid else {
            await MainActor.run {
                self.errorMessage = "Not logged in. Please login again."
                self.showError = true
            }
            return
        }

        await MainActor.run { self.isLoading = true }

        let storageRef = storage.reference().child("drivers/\(uid)/profile.jpg")

        do {
            let metadata = StorageMetadata()
            metadata.contentType = "image/jpeg"

            _ = try await storageRef.putDataAsync(data, metadata: metadata)
            let downloadURL = try await storageRef.downloadURL()

            // Update Firestore
            try await db.collection("drivers").document(uid).updateData([
                "profileImageUrl": downloadURL.absoluteString
            ])

            await MainActor.run {
                self.driver?.profileImageUrl = downloadURL.absoluteString
                self.isLoading = false
            }
        } catch {
            await MainActor.run {
                self.errorMessage = error.localizedDescription
                self.showError = true
                self.isLoading = false
            }
        }
    }

    /// Upload profile image via P2P API
    private func uploadProfileImageViaP2P(data: Data, driverId: Int) async {
        await MainActor.run { self.isLoading = true }

        P2PAPIService.shared.uploadDriverDocument(
            driverId: driverId,
            documentType: .profilePhoto,
            imageData: data
        ) { [weak self] result in
            DispatchQueue.main.async {
                self?.isLoading = false

                switch result {
                case .success(let response):
                    #if DEBUG
                    print("[P2P] Profile image upload successful: \(response.message)")
                    #endif

                    // Update local state with the returned URL
                    if let fileUrl = response.fileUrl {
                        self?.driver?.profileImageUrl = fileUrl
                    }

                case .failure(let error):
                    self?.errorMessage = error.localizedDescription
                    self?.showError = true
                    #if DEBUG
                    print("[P2P] Profile image upload failed: \(error)")
                    #endif
                }
            }
        }
    }

    // MARK: - Upload Document
    func uploadDocument(_ data: Data, type: String) async {
        // Try P2P upload first if logged in via P2P
        if let p2pDriverId = UserDefaults.standard.object(forKey: UserDefaultsKeys.driverId) as? Int {
            await uploadDocumentViaP2P(data: data, type: type, driverId: p2pDriverId)
            return
        }

        // Fallback to Firebase
        guard let uid = Auth.auth().currentUser?.uid else { return }

        isLoading = true

        let fileName: String
        let firestoreField: String

        switch type {
        case "license_front":
            fileName = "license_front.jpg"
            firestoreField = "driversLicense.frontImageUrl"
        case "license_back":
            fileName = "license_back.jpg"
            firestoreField = "driversLicense.backImageUrl"
        case "vehicle_front":
            fileName = "vehicle_front.jpg"
            firestoreField = "vehicle.frontImageUrl"
        case "vehicle_side":
            fileName = "vehicle_side.jpg"
            firestoreField = "vehicle.sideImageUrl"
        case "vehicle_back":
            fileName = "vehicle_back.jpg"
            firestoreField = "vehicle.backImageUrl"
        case "insurance_card":
            fileName = "insurance_card.jpg"
            firestoreField = "insurance.insuranceCardImageUrl"
        default:
            fileName = "\(type).jpg"
            firestoreField = type
        }

        let storageRef = storage.reference().child("drivers/\(uid)/documents/\(fileName)")

        do {
            let metadata = StorageMetadata()
            metadata.contentType = "image/jpeg"

            _ = try await storageRef.putDataAsync(data, metadata: metadata)
            let downloadURL = try await storageRef.downloadURL()

            // Update Firestore with nested field
            try await db.collection("drivers").document(uid).updateData([
                firestoreField: downloadURL.absoluteString
            ])

            // Update local state
            await MainActor.run {
                switch type {
                case "license_front":
                    self.licenseFrontUrl = downloadURL.absoluteString
                case "license_back":
                    self.licenseBackUrl = downloadURL.absoluteString
                case "vehicle_front":
                    self.vehicleFrontUrl = downloadURL.absoluteString
                case "vehicle_side":
                    self.vehicleSideUrl = downloadURL.absoluteString
                case "vehicle_back":
                    self.vehicleBackUrl = downloadURL.absoluteString
                case "insurance_card":
                    self.insuranceCardUrl = downloadURL.absoluteString
                default:
                    break
                }
                self.isLoading = false
            }
        } catch {
            await MainActor.run {
                self.errorMessage = error.localizedDescription
                self.showError = true
                self.isLoading = false
            }
        }
    }

    // MARK: - Upload Document via P2P API (with AI Verification)
    private func uploadDocumentViaP2P(data: Data, type: String, driverId: Int) async {
        isLoading = true

        // Map document type to P2P API document type
        let documentType: DriverDocumentType
        var expiryDate: Date? = nil

        switch type {
        case "license_front", "license_back":
            documentType = .driversLicense
            expiryDate = self.licenseExpiration
        case "insurance_card":
            documentType = .insurance
            expiryDate = self.insuranceExpiration
        default:
            // For vehicle photos, we'll use drivers_license as a placeholder
            // The backend can handle various document types
            documentType = .driversLicense
        }

        P2PAPIService.shared.uploadDriverDocument(
            driverId: driverId,
            documentType: documentType,
            imageData: data,
            expiryDate: expiryDate
        ) { [weak self] result in
            DispatchQueue.main.async {
                self?.isLoading = false

                switch result {
                case .success(let response):
                    #if DEBUG
                    print("[P2P] Document upload successful: \(response.message)")
                    print("[P2P] AI Verification Status: \(response.verificationStatus)")
                    if let verificationId = response.aiVerificationId {
                        print("[P2P] AI Verification ID: \(verificationId)")
                    }
                    #endif

                    // Update local state with the returned URL
                    if let fileUrl = response.fileUrl {
                        switch type {
                        case "license_front":
                            self?.licenseFrontUrl = fileUrl
                        case "license_back":
                            self?.licenseBackUrl = fileUrl
                        case "vehicle_front":
                            self?.vehicleFrontUrl = fileUrl
                        case "vehicle_side":
                            self?.vehicleSideUrl = fileUrl
                        case "vehicle_back":
                            self?.vehicleBackUrl = fileUrl
                        case "insurance_card":
                            self?.insuranceCardUrl = fileUrl
                        default:
                            break
                        }
                    }

                    // If the document was auto-verified, refresh profile to get updated status
                    if response.verificationStatus == "verified" {
                        self?.fetchProfile()
                    }

                case .failure(let error):
                    self?.errorMessage = error.localizedDescription
                    self?.showError = true
                    #if DEBUG
                    print("[P2P] Document upload failed: \(error)")
                    #endif
                }
            }
        }
    }
}
