import Foundation
import FirebaseFirestore
import FirebaseAuth

// MARK: - AI Employee Service
// Best Practice: Event-driven architecture with Firebase as the event source
// iOS apps write tasks to Firestore → Cloud Functions trigger AI processing
// AI employees (via TechCloudRPO) process and write results back

/// Service for managing AI Employees and their tasks
/// This follows the event-driven P2P architecture pattern
public class AIEmployeeService: ObservableObject {
    public static let shared = AIEmployeeService()

    private let db = Firestore.firestore()

    // Collections
    private let employeesCollection = "ai_employees"
    private let tasksCollection = "ai_tasks"
    private let taskQueueCollection = "ai_task_queue"
    private let auditLogCollection = "ai_audit_log"

    // TechCloudRPO Configuration
    private let techCloudRPOBaseURL = "https://www.vibingticket.com/api"

    @Published public var employees: [AIEmployee] = []
    @Published public var pendingTasks: [AITask] = []
    @Published public var isLoading = false
    @Published public var error: String?

    // P2P API Data
    @Published public var p2pAIStats: P2PAIEmployeeStats?
    @Published public var p2pEmployees: [P2PAIEmployee] = []
    @Published public var systemHealth: P2PSystemHealth?

    private var employeesListener: ListenerRegistration?
    private var tasksListener: ListenerRegistration?
    private let p2pAPI = P2PAPIService.shared

    private init() {}

    // MARK: - Employee Management

    /// Fetch all AI employees - tries P2P API first, then Firebase fallback
    public func fetchEmployees() {
        isLoading = true

        // First fetch from P2P API (primary source)
        fetchP2PAIEmployeeStats()

        // Also setup Firebase listener as backup/sync
        setupFirebaseListener()
    }

    /// Fetch AI employee stats from P2P backend
    public func fetchP2PAIEmployeeStats() {
        p2pAPI.getAIEmployeeStats { [weak self] result in
            DispatchQueue.main.async {
                switch result {
                case .success(let stats):
                    self?.p2pAIStats = stats
                    self?.p2pEmployees = stats.aiEmployees
                    self?.systemHealth = stats.systemHealth
                    self?.isLoading = false
                    #if DEBUG
                    print("[AIEmployee] Loaded \(stats.aiEmployees.count) AI employees from P2P API")
                    #endif

                case .failure(let error):
                    #if DEBUG
                    print("[AIEmployee] P2P API failed: \(error.localizedDescription), using Firebase fallback")
                    #endif
                    // Firebase will handle the data
                }
            }
        }
    }

    /// Setup Firebase listener as fallback
    private func setupFirebaseListener() {
        employeesListener?.remove()
        employeesListener = db.collection(employeesCollection)
            .order(by: "createdAt", descending: true)
            .addSnapshotListener { [weak self] snapshot, error in
                self?.isLoading = false

                if let error = error {
                    self?.error = error.localizedDescription
                    return
                }

                self?.employees = snapshot?.documents.compactMap { doc in
                    try? doc.data(as: AIEmployee.self)
                } ?? []
            }
    }

    /// Create a new AI Employee
    /// Best Practice: Write to Firestore, let Cloud Function handle TechCloudRPO API call
    public func createEmployee(
        name: String,
        role: AIEmployeeRole,
        model: String = "qwen",
        autoProcess: Bool = true,
        assignedTo: String? = "platform",
        completion: @escaping (Result<AIEmployee, Error>) -> Void
    ) {
        let config = AIEmployeeConfig(
            autoProcess: autoProcess,
            maxConcurrentTasks: 10,
            notifyOnError: true,
            escalateAfterRetries: 3,
            allowedActions: getDefaultActions(for: role)
        )

        var employee = AIEmployee(
            name: name,
            role: role,
            status: .creating,
            model: model,
            configuration: config,
            assignedTo: assignedTo
        )

        do {
            let docRef = try db.collection(employeesCollection).addDocument(from: employee)
            employee.id = docRef.documentID

            // Log the creation event
            logAuditEvent(
                action: "employee_created",
                employeeId: docRef.documentID,
                details: ["name": name, "role": role.rawValue]
            )

            // Queue a task for Cloud Function to call TechCloudRPO
            queueTechCloudRPORegistration(employee: employee)

            completion(.success(employee))
        } catch {
            completion(.failure(error))
        }
    }

    /// Get default allowed actions based on role
    private func getDefaultActions(for role: AIEmployeeRole) -> [String] {
        switch role {
        case .orderProcessor:
            return ["validate_order", "calculate_total", "notify_restaurant", "assign_driver"]
        case .driverDispatcher:
            return ["find_available_drivers", "calculate_eta", "assign_delivery", "optimize_route"]
        case .orderTracker:
            return ["update_location", "calculate_eta", "send_status_update", "notify_customer"]
        case .customerSupport:
            return ["respond_inquiry", "process_refund", "escalate_issue", "send_notification"]
        case .driverSupport:
            return ["assist_navigation", "resolve_order_issues", "contact_restaurant", "emergency_support"]
        case .restaurantSupport:
            return ["menu_assistance", "order_problem_resolution", "payout_questions", "onboarding_help"]
        case .billingAgent:
            return ["process_payment", "handle_failed_charge", "process_refund", "generate_invoice"]
        case .payoutProcessor:
            return ["calculate_payout", "initiate_transfer", "reconcile_payments", "generate_statement"]
        case .accountant:
            return ["create_journal_entry", "reconcile_accounts", "generate_pnl", "audit_trail"]
        case .documentVerifier:
            return ["verify_license", "verify_insurance", "check_expiration", "approve_document", "reject_document"]
        case .fraudDetector:
            return ["detect_anomaly", "score_risk", "block_transaction", "flag_account"]
        case .analyticsReporter:
            return ["generate_report", "calculate_metrics", "identify_trends", "send_insights"]
        case .emailAgent:
            return ["send_receipt", "send_confirmation", "send_promotional", "manage_templates"]
        case .notificationAgent:
            return ["push_notification", "sms_alert", "in_app_message", "schedule_notification"]
        case .menuManager:
            return ["update_item", "toggle_availability", "suggest_pricing", "manage_categories"]
        case .promotionManager:
            return ["create_promotion", "target_audience", "calculate_discount", "track_performance"]
        }
    }

    /// Queue registration with TechCloudRPO (Cloud Function will process)
    private func queueTechCloudRPORegistration(employee: AIEmployee) {
        guard let employeeId = employee.id else { return }

        let registrationTask: [String: Any] = [
            "type": "register_employee",
            "employeeId": employeeId,
            "name": employee.name,
            "role": employee.role.rawValue,
            "model": employee.model,
            "instructions": generateInstructions(for: employee.role),
            "capabilities": employee.configuration.allowedActions,
            "status": "pending",
            "createdAt": FieldValue.serverTimestamp(),
            "retryCount": 0
        ]

        db.collection(taskQueueCollection).addDocument(data: registrationTask)
    }

    /// Generate AI instructions based on role
    private func generateInstructions(for role: AIEmployeeRole) -> String {
        let baseInstructions = """
        You are an AI employee for EatFair, a food delivery platform.
        Always be professional, efficient, and customer-focused.
        Follow all platform policies and escalate issues when uncertain.
        """

        let roleSpecific: String
        switch role {
        case .orderProcessor:
            roleSpecific = """
            Your role is to process incoming food orders.
            - Validate order items against restaurant menu
            - Calculate accurate totals including tax and delivery fees
            - Check restaurant availability and prep times
            - Route orders to appropriate restaurants
            - Handle order modifications within time limits
            """
        case .driverDispatcher:
            roleSpecific = """
            Your role is to dispatch drivers efficiently.
            - Match orders with nearby available drivers
            - Optimize routes for multiple deliveries
            - Calculate and communicate accurate ETAs
            - Handle driver reassignments when needed
            - Balance driver workload fairly
            """
        case .orderTracker:
            roleSpecific = """
            Your role is to track orders in real-time.
            - Monitor driver GPS location
            - Calculate and update ETAs
            - Send delivery status notifications
            - Alert customers of delays or issues
            """
        case .customerSupport:
            roleSpecific = """
            Your role is to provide customer support.
            - Respond to customer inquiries promptly and helpfully
            - Handle complaints with empathy and solutions
            - Process refund requests following policy guidelines
            - Escalate complex issues when needed
            - Track and follow up on open tickets
            """
        case .driverSupport:
            roleSpecific = """
            Your role is to assist drivers.
            - Help with navigation and directions
            - Resolve order pickup issues
            - Contact restaurants on driver's behalf
            - Handle emergency situations
            """
        case .restaurantSupport:
            roleSpecific = """
            Your role is to assist restaurants.
            - Help with menu updates and issues
            - Resolve order problems
            - Answer payout and billing questions
            - Assist with onboarding and setup
            """
        case .billingAgent:
            roleSpecific = """
            Your role is to handle billing (Accounts Receivable).
            - Process customer payments
            - Handle failed charges and retries
            - Process refund requests
            - Generate invoices and receipts
            - Handle payment disputes
            """
        case .payoutProcessor:
            roleSpecific = """
            Your role is to process payouts (Accounts Payable).
            - Calculate restaurant payouts ($1 platform fee)
            - Calculate driver payments (100% delivery fee + tips)
            - Initiate bank transfers on schedule
            - Generate payment statements
            - Reconcile discrepancies
            """
        case .accountant:
            roleSpecific = """
            Your role is to maintain accounting records.
            - Create journal entries for all transactions
            - Reconcile accounts daily
            - Generate P&L and financial reports
            - Maintain audit trail
            - Flag discrepancies for review
            """
        case .documentVerifier:
            roleSpecific = """
            Your role is to verify business documents.
            - Review uploaded licenses, permits, and insurance documents
            - Check document authenticity and validity using AI vision
            - Verify expiration dates and send renewal alerts
            - Approve or reject with clear reasoning
            - Maintain compliance with local regulations
            """
        case .fraudDetector:
            roleSpecific = """
            Your role is to detect and prevent fraud.
            - Monitor transactions for unusual patterns
            - Score risk levels for accounts and orders
            - Prevent chargebacks proactively
            - Block suspicious transactions
            - Flag accounts for review
            """
        case .analyticsReporter:
            roleSpecific = """
            Your role is to generate business insights.
            - Create daily/weekly/monthly KPI reports
            - Identify trends in orders, revenue, and behavior
            - Provide forecasting and predictions
            - Highlight anomalies that need attention
            - Send automated insights to stakeholders
            """
        case .emailAgent:
            roleSpecific = """
            Your role is to manage email communications.
            - Send order confirmation receipts
            - Send delivery notifications
            - Handle promotional email campaigns via SendGrid
            - Manage email templates
            - Track email delivery and engagement
            """
        case .notificationAgent:
            roleSpecific = """
            Your role is to manage notifications.
            - Send push notifications to mobile apps
            - Send SMS alerts via Twilio
            - Handle in-app messaging
            - Schedule and manage notification timing
            - Personalize messages based on user preferences
            """
        case .menuManager:
            roleSpecific = """
            Your role is to help manage restaurant menus.
            - Assist with menu item updates and pricing
            - Monitor and flag availability issues
            - Suggest optimizations based on performance data
            - Ensure menu accuracy and completeness
            """
        case .promotionManager:
            roleSpecific = """
            Your role is to manage promotional campaigns.
            - Create targeted promotions based on data
            - Calculate optimal discount amounts
            - Track promotion performance and ROI
            - Suggest timing and audience targeting
            """
        }

        return baseInstructions + "\n\n" + roleSpecific
    }

    // MARK: - Task Management (Event-Driven Pattern)

    /// Submit a task for AI processing
    /// Best Practice: Apps submit tasks to Firestore, AI employees poll/receive via webhooks
    public func submitTask(
        employeeId: String,
        type: String,
        priority: Int = 3,
        payload: [String: String],
        completion: @escaping (Result<AITask, Error>) -> Void
    ) {
        var task = AITask(
            employeeId: employeeId,
            type: type,
            priority: priority,
            payload: payload
        )

        do {
            let docRef = try db.collection(tasksCollection).addDocument(from: task)
            task.id = docRef.documentID

            logAuditEvent(
                action: "task_submitted",
                employeeId: employeeId,
                details: ["taskId": docRef.documentID, "type": type]
            )

            completion(.success(task))
        } catch {
            completion(.failure(error))
        }
    }

    /// Quick task submission helpers for common operations
    public func submitOrderForProcessing(orderId: String, restaurantId: String) {
        guard let processor = employees.first(where: { $0.role == .orderProcessor && $0.isActive }) else {
            // No active order processor, add to general queue
            queueTaskForNextAvailableEmployee(
                role: .orderProcessor,
                type: "process_order",
                payload: ["orderId": orderId, "restaurantId": restaurantId]
            )
            return
        }

        submitTask(
            employeeId: processor.id ?? "",
            type: "process_order",
            priority: 4, // High priority
            payload: ["orderId": orderId, "restaurantId": restaurantId]
        ) { _ in }
    }

    public func submitDocumentForVerification(documentType: String, entityId: String, entityType: String) {
        guard let verifier = employees.first(where: { $0.role == .documentVerifier && $0.isActive }) else {
            queueTaskForNextAvailableEmployee(
                role: .documentVerifier,
                type: "verify_document",
                payload: ["documentType": documentType, "entityId": entityId, "entityType": entityType]
            )
            return
        }

        submitTask(
            employeeId: verifier.id ?? "",
            type: "verify_document",
            priority: 3,
            payload: ["documentType": documentType, "entityId": entityId, "entityType": entityType]
        ) { _ in }
    }

    public func submitSupportTicket(ticketId: String, customerId: String, issue: String) {
        guard let support = employees.first(where: { $0.role == .customerSupport && $0.isActive }) else {
            queueTaskForNextAvailableEmployee(
                role: .customerSupport,
                type: "handle_support",
                payload: ["ticketId": ticketId, "customerId": customerId, "issue": issue]
            )
            return
        }

        submitTask(
            employeeId: support.id ?? "",
            type: "handle_support",
            priority: 3,
            payload: ["ticketId": ticketId, "customerId": customerId, "issue": issue]
        ) { _ in }
    }

    /// Queue task for role when no employee is currently available
    private func queueTaskForNextAvailableEmployee(role: AIEmployeeRole, type: String, payload: [String: String]) {
        let queuedTask: [String: Any] = [
            "role": role.rawValue,
            "type": type,
            "payload": payload,
            "status": "queued",
            "createdAt": FieldValue.serverTimestamp(),
            "processedAt": NSNull()
        ]

        db.collection(taskQueueCollection).addDocument(data: queuedTask)
    }

    // MARK: - Employee Status Management

    /// Update employee status
    public func updateEmployeeStatus(_ employeeId: String, status: AIEmployeeStatus) {
        db.collection(employeesCollection).document(employeeId).updateData([
            "status": status.rawValue,
            "lastActiveAt": status == .active ? FieldValue.serverTimestamp() : NSNull()
        ])

        logAuditEvent(
            action: "status_changed",
            employeeId: employeeId,
            details: ["newStatus": status.rawValue]
        )
    }

    /// Pause an employee
    public func pauseEmployee(_ employeeId: String) {
        updateEmployeeStatus(employeeId, status: .paused)
    }

    /// Resume an employee
    public func resumeEmployee(_ employeeId: String) {
        updateEmployeeStatus(employeeId, status: .active)
    }

    /// Retire an employee (permanent deactivation)
    public func retireEmployee(_ employeeId: String) {
        updateEmployeeStatus(employeeId, status: .retired)
    }

    // MARK: - Audit Logging

    /// Log all AI actions for compliance and debugging
    private func logAuditEvent(action: String, employeeId: String?, details: [String: Any]) {
        var logEntry: [String: Any] = [
            "action": action,
            "timestamp": FieldValue.serverTimestamp(),
            "details": details
        ]

        if let employeeId = employeeId {
            logEntry["employeeId"] = employeeId
        }

        if let userId = Auth.auth().currentUser?.uid {
            logEntry["triggeredBy"] = userId
        }

        db.collection(auditLogCollection).addDocument(data: logEntry)
    }

    // MARK: - Metrics & Reporting

    /// Get employee metrics summary
    public func getEmployeeMetrics(_ employeeId: String, completion: @escaping (AIEmployeeMetrics?) -> Void) {
        // This would typically aggregate from task completion data
        db.collection(tasksCollection)
            .whereField("employeeId", isEqualTo: employeeId)
            .whereField("status", isEqualTo: AITaskStatus.completed.rawValue)
            .getDocuments { snapshot, error in
                guard let documents = snapshot?.documents else {
                    completion(nil)
                    return
                }

                let tasks = documents.compactMap { try? $0.data(as: AITask.self) }
                let completedCount = tasks.count

                // Calculate metrics
                let avgResponseTime = tasks.compactMap { task -> Int? in
                    guard let started = task.startedAt, let completed = task.completedAt else { return nil }
                    return Int(completed - started)
                }.reduce(0, +) / max(completedCount, 1)

                let metrics = AIEmployeeMetrics(
                    avgResponseTimeMs: avgResponseTime,
                    successRate: Double(completedCount) / Double(max(tasks.count, 1)),
                    tasksPerHour: Double(completedCount) / 24.0, // Simplified
                    lastDayTasks: completedCount,
                    lastWeekTasks: completedCount,
                    lastMonthTasks: completedCount,
                    costSavingsEstimate: Double(completedCount) * 2.50 // $2.50 per task estimate
                )

                completion(metrics)
            }
    }

    // MARK: - Cleanup

    public func stopListening() {
        employeesListener?.remove()
        tasksListener?.remove()
    }

    deinit {
        stopListening()
    }
}

// MARK: - Convenience Extensions

public extension AIEmployeeService {
    /// Get active employees by role
    func getActiveEmployees(for role: AIEmployeeRole) -> [AIEmployee] {
        employees.filter { $0.role == role && $0.isActive }
    }

    /// Check if a specific role has active employees
    func hasActiveEmployee(for role: AIEmployeeRole) -> Bool {
        !getActiveEmployees(for: role).isEmpty
    }

    /// Get the platform's operational status
    var platformStatus: String {
        let activeCount = employees.filter { $0.isActive }.count
        let totalCount = employees.count

        if totalCount == 0 { return "No employees" }
        if activeCount == totalCount { return "Fully operational" }
        if activeCount > 0 { return "Partially operational" }
        return "Offline"
    }
}
