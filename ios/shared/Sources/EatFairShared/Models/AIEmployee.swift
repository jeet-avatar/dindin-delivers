import Foundation
import FirebaseFirestore

// MARK: - AI Employee Models for TechCloudRPO Integration

/// AI Employee role types for EatFair P2P Platform
/// All roles integrate with TechCloudRPO (vibingticket.com) for AI processing
public enum AIEmployeeRole: String, Codable, CaseIterable {
    // OPERATIONS DEPARTMENT
    case orderProcessor = "order_processor"
    case driverDispatcher = "driver_dispatcher"
    case orderTracker = "order_tracker"

    // CUSTOMER SERVICE DEPARTMENT
    case customerSupport = "customer_support"
    case driverSupport = "driver_support"
    case restaurantSupport = "restaurant_support"

    // FINANCE DEPARTMENT
    case billingAgent = "billing_agent"           // AR - Accounts Receivable
    case payoutProcessor = "payout_processor"     // AP - Accounts Payable
    case accountant = "accountant"                // Journal entries, reconciliation

    // COMPLIANCE & ADMIN
    case documentVerifier = "document_verifier"
    case fraudDetector = "fraud_detector"
    case analyticsReporter = "analytics_reporter"

    // COMMUNICATION
    case emailAgent = "email_agent"
    case notificationAgent = "notification_agent"

    // LEGACY (kept for backwards compatibility)
    case menuManager = "menu_manager"
    case promotionManager = "promotion_manager"

    public var displayName: String {
        switch self {
        case .orderProcessor: return "Order Processor"
        case .driverDispatcher: return "Driver Dispatcher"
        case .orderTracker: return "Order Tracker"
        case .customerSupport: return "Customer Support"
        case .driverSupport: return "Driver Support"
        case .restaurantSupport: return "Restaurant Support"
        case .billingAgent: return "Billing Agent (AR)"
        case .payoutProcessor: return "Payout Processor (AP)"
        case .accountant: return "Accountant"
        case .documentVerifier: return "Document Verifier"
        case .fraudDetector: return "Fraud Detector"
        case .analyticsReporter: return "Analytics Reporter"
        case .emailAgent: return "Email Agent"
        case .notificationAgent: return "Notification Agent"
        case .menuManager: return "Menu Manager"
        case .promotionManager: return "Promotion Manager"
        }
    }

    public var description: String {
        switch self {
        case .orderProcessor: return "Validates orders, checks menu availability, calculates totals, routes to restaurants"
        case .driverDispatcher: return "Assigns drivers based on location, optimizes routes, handles reassignments"
        case .orderTracker: return "Real-time GPS tracking, ETA updates, delivery status notifications"
        case .customerSupport: return "Handles customer calls/chat, complaints, refunds, order modifications. Full order context via TechCloudRPO"
        case .driverSupport: return "Assists drivers with navigation, order issues, app support, emergency contacts"
        case .restaurantSupport: return "Helps restaurants with menu issues, order problems, payout questions, onboarding"
        case .billingAgent: return "Processes payments, handles failed charges, refunds, disputes, invoice generation"
        case .payoutProcessor: return "Calculates restaurant payouts ($1 fee), driver payments (100% tips), schedules transfers"
        case .accountant: return "Creates journal entries, reconciles accounts, generates P&L, maintains audit trail"
        case .documentVerifier: return "Verifies licenses, insurance, health permits using AI vision. Sends expiry alerts"
        case .fraudDetector: return "Detects unusual patterns, prevents chargebacks, scores risk, monitors account security"
        case .analyticsReporter: return "Generates daily KPIs, trend reports, forecasting, business insights"
        case .emailAgent: return "Sends order receipts, delivery confirmations, promotional emails via SendGrid"
        case .notificationAgent: return "Push notifications, SMS alerts via Twilio, in-app messages"
        case .menuManager: return "Manages menu updates, pricing, item availability"
        case .promotionManager: return "Creates and manages promotional campaigns and discounts"
        }
    }

    public var icon: String {
        switch self {
        case .orderProcessor: return "cart.badge.checkmark"
        case .driverDispatcher: return "car.2"
        case .orderTracker: return "location.circle"
        case .customerSupport: return "phone.badge.waveform"
        case .driverSupport: return "person.badge.shield.checkmark"
        case .restaurantSupport: return "building.2"
        case .billingAgent: return "creditcard"
        case .payoutProcessor: return "banknote"
        case .accountant: return "doc.text.magnifyingglass"
        case .documentVerifier: return "checkmark.shield"
        case .fraudDetector: return "exclamationmark.shield"
        case .analyticsReporter: return "chart.bar.xaxis"
        case .emailAgent: return "envelope.badge"
        case .notificationAgent: return "bell.badge"
        case .menuManager: return "menucard"
        case .promotionManager: return "megaphone"
        }
    }

    /// Department grouping for UI
    public var department: String {
        switch self {
        case .orderProcessor, .driverDispatcher, .orderTracker:
            return "Operations"
        case .customerSupport, .driverSupport, .restaurantSupport:
            return "Customer Service"
        case .billingAgent, .payoutProcessor, .accountant:
            return "Finance"
        case .documentVerifier, .fraudDetector, .analyticsReporter:
            return "Compliance & Admin"
        case .emailAgent, .notificationAgent:
            return "Communication"
        case .menuManager, .promotionManager:
            return "Marketing"
        }
    }

    /// Priority order for hiring (recommended first hires)
    public var hirePriority: Int {
        switch self {
        case .orderProcessor: return 1
        case .billingAgent: return 2
        case .customerSupport: return 3
        case .driverDispatcher: return 4
        case .payoutProcessor: return 5
        case .emailAgent: return 6
        case .accountant: return 7
        case .orderTracker: return 8
        case .driverSupport: return 9
        case .restaurantSupport: return 10
        case .documentVerifier: return 11
        case .notificationAgent: return 12
        case .fraudDetector: return 13
        case .analyticsReporter: return 14
        case .menuManager: return 15
        case .promotionManager: return 16
        }
    }
}

/// AI Employee status
public enum AIEmployeeStatus: String, Codable {
    case creating = "creating"
    case active = "active"
    case paused = "paused"
    case error = "error"
    case retired = "retired"

    public var displayName: String {
        switch self {
        case .creating: return "Creating..."
        case .active: return "Active"
        case .paused: return "Paused"
        case .error: return "Error"
        case .retired: return "Retired"
        }
    }

    public var color: String {
        switch self {
        case .creating: return "blue"
        case .active: return "green"
        case .paused: return "orange"
        case .error: return "red"
        case .retired: return "gray"
        }
    }
}

/// AI Employee model representing a WorkFlow AI employee from TechCloudRPO
public struct AIEmployee: Identifiable, Codable {
    @DocumentID public var id: String?
    public var name: String
    public var role: AIEmployeeRole
    public var status: AIEmployeeStatus
    public var workflowAIId: String? // ID from TechCloudRPO/vibingticket.com
    public var model: String // e.g., "qwen", "ollama"
    public var createdAt: Int64
    public var lastActiveAt: Int64?
    public var tasksCompleted: Int
    public var tasksInProgress: Int
    public var errorCount: Int
    public var configuration: AIEmployeeConfig
    public var metrics: AIEmployeeMetrics?
    public var assignedTo: String? // Restaurant ID, Driver ID, or "platform" for global

    public init(
        id: String? = nil,
        name: String,
        role: AIEmployeeRole,
        status: AIEmployeeStatus = .creating,
        workflowAIId: String? = nil,
        model: String = "qwen",
        createdAt: Int64 = Int64(Date().timeIntervalSince1970 * 1000),
        lastActiveAt: Int64? = nil,
        tasksCompleted: Int = 0,
        tasksInProgress: Int = 0,
        errorCount: Int = 0,
        configuration: AIEmployeeConfig = AIEmployeeConfig(),
        metrics: AIEmployeeMetrics? = nil,
        assignedTo: String? = "platform"
    ) {
        self.id = id
        self.name = name
        self.role = role
        self.status = status
        self.workflowAIId = workflowAIId
        self.model = model
        self.createdAt = createdAt
        self.lastActiveAt = lastActiveAt
        self.tasksCompleted = tasksCompleted
        self.tasksInProgress = tasksInProgress
        self.errorCount = errorCount
        self.configuration = configuration
        self.metrics = metrics
        self.assignedTo = assignedTo
    }

    public var isActive: Bool {
        status == .active
    }

    public var uptime: String {
        guard let lastActive = lastActiveAt else { return "Never active" }
        let seconds = (Int64(Date().timeIntervalSince1970 * 1000) - lastActive) / 1000
        if seconds < 60 { return "Active now" }
        if seconds < 3600 { return "\(seconds / 60)m ago" }
        if seconds < 86400 { return "\(seconds / 3600)h ago" }
        return "\(seconds / 86400)d ago"
    }
}

/// Configuration for AI Employee behavior
public struct AIEmployeeConfig: Codable {
    public var autoProcess: Bool // Automatically process without human review
    public var maxConcurrentTasks: Int
    public var workingHours: WorkingHours?
    public var notifyOnError: Bool
    public var escalateAfterRetries: Int
    public var customPrompt: String? // Custom instructions for this employee
    public var allowedActions: [String] // Specific actions this employee can perform

    public init(
        autoProcess: Bool = true,
        maxConcurrentTasks: Int = 10,
        workingHours: WorkingHours? = nil, // nil means 24/7
        notifyOnError: Bool = true,
        escalateAfterRetries: Int = 3,
        customPrompt: String? = nil,
        allowedActions: [String] = []
    ) {
        self.autoProcess = autoProcess
        self.maxConcurrentTasks = maxConcurrentTasks
        self.workingHours = workingHours
        self.notifyOnError = notifyOnError
        self.escalateAfterRetries = escalateAfterRetries
        self.customPrompt = customPrompt
        self.allowedActions = allowedActions
    }
}

/// Working hours configuration
public struct WorkingHours: Codable {
    public var startHour: Int // 0-23
    public var endHour: Int // 0-23
    public var timezone: String
    public var daysOfWeek: [Int] // 1=Sunday, 7=Saturday

    public init(
        startHour: Int = 0,
        endHour: Int = 24,
        timezone: String = "America/New_York",
        daysOfWeek: [Int] = [1, 2, 3, 4, 5, 6, 7]
    ) {
        self.startHour = startHour
        self.endHour = endHour
        self.timezone = timezone
        self.daysOfWeek = daysOfWeek
    }

    public var is24_7: Bool {
        startHour == 0 && endHour == 24 && daysOfWeek.count == 7
    }
}

/// Metrics for AI Employee performance tracking
public struct AIEmployeeMetrics: Codable {
    public var avgResponseTimeMs: Int
    public var successRate: Double // 0.0 - 1.0
    public var tasksPerHour: Double
    public var lastDayTasks: Int
    public var lastWeekTasks: Int
    public var lastMonthTasks: Int
    public var costSavingsEstimate: Double // Estimated $ saved vs human employee

    public init(
        avgResponseTimeMs: Int = 0,
        successRate: Double = 0.0,
        tasksPerHour: Double = 0.0,
        lastDayTasks: Int = 0,
        lastWeekTasks: Int = 0,
        lastMonthTasks: Int = 0,
        costSavingsEstimate: Double = 0.0
    ) {
        self.avgResponseTimeMs = avgResponseTimeMs
        self.successRate = successRate
        self.tasksPerHour = tasksPerHour
        self.lastDayTasks = lastDayTasks
        self.lastWeekTasks = lastWeekTasks
        self.lastMonthTasks = lastMonthTasks
        self.costSavingsEstimate = costSavingsEstimate
    }

    public var successRatePercentage: String {
        String(format: "%.1f%%", successRate * 100)
    }
}

/// Task assigned to an AI Employee
public struct AITask: Identifiable, Codable {
    @DocumentID public var id: String?
    public var employeeId: String
    public var type: String // "order_process", "support_ticket", "document_verify", etc.
    public var status: AITaskStatus
    public var priority: Int // 1-5, 5 being highest
    public var payload: [String: String] // Task-specific data
    public var result: [String: String]?
    public var createdAt: Int64
    public var startedAt: Int64?
    public var completedAt: Int64?
    public var errorMessage: String?
    public var retryCount: Int

    public init(
        id: String? = nil,
        employeeId: String,
        type: String,
        status: AITaskStatus = .pending,
        priority: Int = 3,
        payload: [String: String] = [:],
        result: [String: String]? = nil,
        createdAt: Int64 = Int64(Date().timeIntervalSince1970 * 1000),
        startedAt: Int64? = nil,
        completedAt: Int64? = nil,
        errorMessage: String? = nil,
        retryCount: Int = 0
    ) {
        self.id = id
        self.employeeId = employeeId
        self.type = type
        self.status = status
        self.priority = priority
        self.payload = payload
        self.result = result
        self.createdAt = createdAt
        self.startedAt = startedAt
        self.completedAt = completedAt
        self.errorMessage = errorMessage
        self.retryCount = retryCount
    }
}

/// Status of an AI task
public enum AITaskStatus: String, Codable {
    case pending = "pending"
    case inProgress = "in_progress"
    case completed = "completed"
    case failed = "failed"
    case escalated = "escalated"

    public var displayName: String {
        switch self {
        case .pending: return "Pending"
        case .inProgress: return "In Progress"
        case .completed: return "Completed"
        case .failed: return "Failed"
        case .escalated: return "Escalated"
        }
    }
}

// MARK: - TechCloudRPO API Models

/// Request to create an AI Employee via TechCloudRPO/WorkFlow AI
public struct CreateAIEmployeeRequest: Codable {
    public var name: String
    public var role: String
    public var model: String
    public var instructions: String
    public var capabilities: [String]
    public var organizationId: String

    public init(
        name: String,
        role: String,
        model: String = "qwen",
        instructions: String,
        capabilities: [String],
        organizationId: String
    ) {
        self.name = name
        self.role = role
        self.model = model
        self.instructions = instructions
        self.capabilities = capabilities
        self.organizationId = organizationId
    }
}

/// Response from TechCloudRPO/WorkFlow AI after creating employee
public struct CreateAIEmployeeResponse: Codable {
    public var success: Bool
    public var employeeId: String?
    public var status: String?
    public var message: String?
    public var apiKey: String? // For direct communication with the employee

    public init(
        success: Bool,
        employeeId: String? = nil,
        status: String? = nil,
        message: String? = nil,
        apiKey: String? = nil
    ) {
        self.success = success
        self.employeeId = employeeId
        self.status = status
        self.message = message
        self.apiKey = apiKey
    }
}

/// Platform-level AI employee roster for EatFair
public struct AIEmployeeRoster: Codable {
    public var employees: [AIEmployee]
    public var totalTasks24h: Int
    public var totalTasksCompleted: Int
    public var platformStatus: String // "operational", "degraded", "offline"
    public var lastUpdated: Int64

    public init(
        employees: [AIEmployee] = [],
        totalTasks24h: Int = 0,
        totalTasksCompleted: Int = 0,
        platformStatus: String = "operational",
        lastUpdated: Int64 = Int64(Date().timeIntervalSince1970 * 1000)
    ) {
        self.employees = employees
        self.totalTasks24h = totalTasks24h
        self.totalTasksCompleted = totalTasksCompleted
        self.platformStatus = platformStatus
        self.lastUpdated = lastUpdated
    }

    public var activeEmployeeCount: Int {
        employees.filter { $0.status == .active }.count
    }
}
