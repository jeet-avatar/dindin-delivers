import SwiftUI
import Combine
import FirebaseFirestore
import EatFairShared

// MARK: - AI Employees Management View

struct AIEmployeesView: View {
    @StateObject private var viewModel = AIEmployeesViewModel()
    @State private var showCreateEmployee = false
    @State private var selectedEmployee: AIEmployee?

    var body: some View {
        NavigationView {
            List {
                // Platform Status Section
                Section {
                    PlatformStatusCard(
                        status: viewModel.platformStatus,
                        activeCount: viewModel.activeEmployeeCount,
                        totalTasks: viewModel.totalTasksToday,
                        isLoading: viewModel.isLoading
                    )
                }

                // Error Message
                if let error = viewModel.error {
                    Section {
                        HStack {
                            Image(systemName: "exclamationmark.triangle.fill")
                                .foregroundColor(.orange)
                            Text(error)
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                    }
                }

                // Loading State
                if viewModel.isLoading {
                    Section {
                        HStack {
                            Spacer()
                            ProgressView()
                                .padding()
                            Spacer()
                        }
                    }
                } else {
                    // P2P AI Employees Section (from backend)
                    if !viewModel.p2pEmployees.isEmpty {
                        Section("P2P Backend AI Employees") {
                            ForEach(viewModel.p2pEmployees, id: \.id) { employee in
                                P2PAIEmployeeRow(employee: employee)
                            }
                        }

                        // System Health Section
                        if let health = viewModel.systemHealth {
                            Section("System Health") {
                                HStack {
                                    Text("All Employees Online")
                                    Spacer()
                                    Image(systemName: health.allEmployeesOnline ? "checkmark.circle.fill" : "xmark.circle.fill")
                                        .foregroundColor(health.allEmployeesOnline ? .green : .red)
                                }
                                HStack {
                                    Text("Processing Delay")
                                    Spacer()
                                    Text("\(health.processingDelayMs)ms")
                                        .foregroundColor(health.processingDelayMs < 100 ? .green : (health.processingDelayMs < 500 ? .orange : .red))
                                }
                                HStack {
                                    Text("Error Rate")
                                    Spacer()
                                    Text(health.errorRate)
                                        .foregroundColor(health.errorRate == "0%" ? .green : .orange)
                                }
                            }
                        }
                    }

                    // Firebase Active Employees Section
                    Section("Active AI Employees") {
                        if viewModel.activeEmployees.isEmpty && viewModel.p2pEmployees.isEmpty {
                            EmptyEmployeesCard()
                        } else {
                            ForEach(viewModel.activeEmployees) { employee in
                                AIEmployeeRow(employee: employee)
                                    .onTapGesture {
                                        selectedEmployee = employee
                                    }
                            }
                        }
                    }

                    // Inactive Employees
                    if !viewModel.inactiveEmployees.isEmpty {
                        Section("Inactive") {
                            ForEach(viewModel.inactiveEmployees) { employee in
                                AIEmployeeRow(employee: employee)
                                    .onTapGesture {
                                        selectedEmployee = employee
                                    }
                            }
                        }
                    }
                }

                // Quick Actions
                Section("Quick Actions") {
                    Button(action: { showCreateEmployee = true }) {
                        Label("Hire New AI Employee", systemImage: "person.badge.plus")
                    }

                    NavigationLink(destination: AITaskQueueView()) {
                        Label("View Task Queue", systemImage: "list.bullet.clipboard")
                    }

                    NavigationLink(destination: AIAuditLogView()) {
                        Label("Audit Log", systemImage: "doc.text.magnifyingglass")
                    }
                }
            }
            .navigationTitle("AI Workforce")
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(action: { showCreateEmployee = true }) {
                        Image(systemName: "plus")
                    }
                }
            }
            .refreshable {
                viewModel.fetchEmployees()
            }
            .sheet(isPresented: $showCreateEmployee) {
                CreateAIEmployeeView(viewModel: viewModel)
            }
            .sheet(item: $selectedEmployee) { employee in
                AIEmployeeDetailView(employee: employee, viewModel: viewModel)
            }
            .onAppear {
                viewModel.fetchEmployees()
            }
        }
    }
}

// MARK: - Platform Status Card

struct PlatformStatusCard: View {
    let status: String
    let activeCount: Int
    let totalTasks: Int
    var isLoading: Bool = false

    var statusColor: Color {
        if isLoading { return .gray }
        switch status {
        case "Fully operational": return .green
        case "Partially operational": return .orange
        case "No employees": return .blue
        default: return .red
        }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                if isLoading {
                    ProgressView()
                        .scaleEffect(0.8)
                } else {
                    Circle()
                        .fill(statusColor)
                        .frame(width: 12, height: 12)
                }
                Text(isLoading ? "Loading..." : status)
                    .font(.headline)
                Spacer()

                // WorkFlow AI badge
                Text("WorkFlow AI")
                    .font(.caption2)
                    .fontWeight(.medium)
                    .foregroundColor(.purple)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(Color.purple.opacity(0.1))
                    .cornerRadius(8)
            }

            HStack(spacing: 24) {
                VStack(alignment: .leading) {
                    Text(isLoading ? "-" : "\(activeCount)")
                        .font(.title2)
                        .fontWeight(.bold)
                    Text("Active")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }

                VStack(alignment: .leading) {
                    Text(isLoading ? "-" : "\(totalTasks)")
                        .font(.title2)
                        .fontWeight(.bold)
                    Text("Tasks Today")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }

                Spacer()
            }
        }
        .padding(.vertical, 8)
    }
}

// MARK: - Empty State Card

struct EmptyEmployeesCard: View {
    var body: some View {
        VStack(spacing: 12) {
            Image(systemName: "person.3.sequence")
                .font(.system(size: 40))
                .foregroundColor(.secondary)
            Text("No Active AI Employees")
                .font(.headline)
            Text("Hire AI employees to automate your operations 24/7")
                .font(.caption)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 24)
    }
}

// MARK: - AI Employee Row

struct AIEmployeeRow: View {
    let employee: AIEmployee

    var statusColor: Color {
        switch employee.status {
        case .active: return .green
        case .creating: return .blue
        case .paused: return .orange
        case .error: return .red
        case .retired: return .gray
        }
    }

    var body: some View {
        HStack(spacing: 12) {
            // Role Icon
            ZStack {
                Circle()
                    .fill(statusColor.opacity(0.15))
                    .frame(width: 44, height: 44)
                Image(systemName: employee.role.icon)
                    .foregroundColor(statusColor)
            }

            // Info
            VStack(alignment: .leading, spacing: 4) {
                Text(employee.name)
                    .font(.headline)
                Text(employee.role.displayName)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }

            Spacer()

            // Status & Metrics
            VStack(alignment: .trailing, spacing: 4) {
                HStack(spacing: 4) {
                    Circle()
                        .fill(statusColor)
                        .frame(width: 8, height: 8)
                    Text(employee.status.displayName)
                        .font(.caption)
                        .foregroundColor(statusColor)
                }

                Text("\(employee.tasksCompleted) tasks")
                    .font(.caption2)
                    .foregroundColor(.secondary)
            }
        }
        .padding(.vertical, 4)
    }
}

// MARK: - Create AI Employee View

struct CreateAIEmployeeView: View {
    @ObservedObject var viewModel: AIEmployeesViewModel
    @Environment(\.dismiss) private var dismiss

    @State private var name = ""
    @State private var selectedRole: AIEmployeeRole = .orderProcessor
    @State private var selectedModel = "qwen"
    @State private var autoProcess = true
    @State private var isCreating = false
    @State private var showSuccess = false
    @State private var showError = false
    @State private var errorMessage = ""

    let availableModels = ["qwen", "ollama", "gpt-4", "claude"]

    var body: some View {
        NavigationView {
            Form {
                Section("Employee Details") {
                    TextField("Name", text: $name)
                        .textContentType(.name)

                    Picker("Role", selection: $selectedRole) {
                        ForEach(AIEmployeeRole.allCases, id: \.self) { role in
                            HStack {
                                Image(systemName: role.icon)
                                Text(role.displayName)
                            }
                            .tag(role)
                        }
                    }
                }

                Section("Role Description") {
                    Text(selectedRole.description)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }

                Section("AI Model") {
                    Picker("Model", selection: $selectedModel) {
                        ForEach(availableModels, id: \.self) { model in
                            Text(model.capitalized).tag(model)
                        }
                    }
                    .pickerStyle(.segmented)

                    Text("Qwen is recommended for best performance with TechCloudRPO")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }

                Section("Automation") {
                    Toggle("Auto-process tasks", isOn: $autoProcess)

                    if autoProcess {
                        Text("Tasks will be processed automatically without human review")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    } else {
                        Text("Tasks will require manual approval before execution")
                            .font(.caption)
                            .foregroundColor(.orange)
                    }
                }

                Section {
                    Button(action: createEmployee) {
                        if isCreating {
                            HStack {
                                ProgressView()
                                    .scaleEffect(0.8)
                                Text("Creating...")
                            }
                            .frame(maxWidth: .infinity)
                        } else {
                            Text("Hire AI Employee")
                                .frame(maxWidth: .infinity)
                                .fontWeight(.semibold)
                        }
                    }
                    .disabled(name.isEmpty || isCreating)
                }
            }
            .navigationTitle("Hire AI Employee")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") { dismiss() }
                }
            }
            .alert("Success", isPresented: $showSuccess) {
                Button("OK") { dismiss() }
            } message: {
                Text("\(name) has been hired as \(selectedRole.displayName)! The employee is now being activated via WorkFlow AI.")
            }
            .alert("Error", isPresented: $showError) {
                Button("OK", role: .cancel) { }
            } message: {
                Text(errorMessage)
            }
        }
    }

    private func createEmployee() {
        isCreating = true

        viewModel.createEmployee(
            name: name,
            role: selectedRole,
            model: selectedModel,
            autoProcess: autoProcess
        ) { success in
            isCreating = false
            if success {
                showSuccess = true
            } else {
                errorMessage = viewModel.error ?? "Failed to create employee. Please try again."
                showError = true
            }
        }
    }
}

// MARK: - AI Employee Detail View

struct AIEmployeeDetailView: View {
    let employee: AIEmployee
    @ObservedObject var viewModel: AIEmployeesViewModel
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationView {
            List {
                // Header
                Section {
                    VStack(spacing: 16) {
                        ZStack {
                            Circle()
                                .fill(Color(employee.status.color).opacity(0.15))
                                .frame(width: 80, height: 80)
                            Image(systemName: employee.role.icon)
                                .font(.system(size: 32))
                                .foregroundColor(Color(employee.status.color))
                        }

                        Text(employee.name)
                            .font(.title2)
                            .fontWeight(.bold)

                        Text(employee.role.displayName)
                            .foregroundColor(.secondary)

                        HStack(spacing: 4) {
                            Circle()
                                .fill(Color(employee.status.color))
                                .frame(width: 10, height: 10)
                            Text(employee.status.displayName)
                                .font(.subheadline)
                                .foregroundColor(Color(employee.status.color))
                        }
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical)
                }

                // Metrics
                Section("Performance") {
                    HStack {
                        Text("Tasks Completed")
                        Spacer()
                        Text("\(employee.tasksCompleted)")
                            .foregroundColor(.secondary)
                    }

                    HStack {
                        Text("Tasks In Progress")
                        Spacer()
                        Text("\(employee.tasksInProgress)")
                            .foregroundColor(.secondary)
                    }

                    HStack {
                        Text("Error Count")
                        Spacer()
                        Text("\(employee.errorCount)")
                            .foregroundColor(employee.errorCount > 0 ? .red : .secondary)
                    }

                    HStack {
                        Text("Last Active")
                        Spacer()
                        Text(employee.uptime)
                            .foregroundColor(.secondary)
                    }
                }

                // Configuration
                Section("Configuration") {
                    HStack {
                        Text("Model")
                        Spacer()
                        Text(employee.model.capitalized)
                            .foregroundColor(.secondary)
                    }

                    HStack {
                        Text("Auto Process")
                        Spacer()
                        Image(systemName: employee.configuration.autoProcess ? "checkmark.circle.fill" : "xmark.circle")
                            .foregroundColor(employee.configuration.autoProcess ? .green : .orange)
                    }

                    HStack {
                        Text("Max Concurrent Tasks")
                        Spacer()
                        Text("\(employee.configuration.maxConcurrentTasks)")
                            .foregroundColor(.secondary)
                    }
                }

                // Actions
                Section("Actions") {
                    if employee.status == .active {
                        Button(action: { pauseEmployee() }) {
                            Label("Pause Employee", systemImage: "pause.circle")
                                .foregroundColor(.orange)
                        }
                    } else if employee.status == .paused {
                        Button(action: { resumeEmployee() }) {
                            Label("Resume Employee", systemImage: "play.circle")
                                .foregroundColor(.green)
                        }
                    }

                    if employee.status != .retired {
                        Button(action: { retireEmployee() }) {
                            Label("Retire Employee", systemImage: "person.badge.minus")
                                .foregroundColor(.red)
                        }
                    }
                }
            }
            .navigationTitle("Employee Details")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") { dismiss() }
                }
            }
        }
    }

    private func pauseEmployee() {
        guard let id = employee.id else { return }
        viewModel.pauseEmployee(id)
        dismiss()
    }

    private func resumeEmployee() {
        guard let id = employee.id else { return }
        viewModel.resumeEmployee(id)
        dismiss()
    }

    private func retireEmployee() {
        guard let id = employee.id else { return }
        viewModel.retireEmployee(id)
        dismiss()
    }
}

// MARK: - AI Task Queue View (Real Firebase Data)

struct AITaskQueueView: View {
    @StateObject private var viewModel = AITaskQueueViewModel()

    var body: some View {
        List {
            if viewModel.isLoading {
                Section {
                    HStack {
                        Spacer()
                        ProgressView()
                            .padding()
                        Spacer()
                    }
                }
            } else if viewModel.tasks.isEmpty {
                Section {
                    VStack(spacing: 12) {
                        Image(systemName: "tray")
                            .font(.system(size: 40))
                            .foregroundColor(.secondary)
                        Text("No Pending Tasks")
                            .font(.headline)
                        Text("AI employees are up to date with all work")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 24)
                }
            } else {
                // Pending Tasks
                if !viewModel.pendingTasks.isEmpty {
                    Section("Pending (\(viewModel.pendingTasks.count))") {
                        ForEach(viewModel.pendingTasks) { task in
                            AITaskRow(task: task)
                        }
                    }
                }

                // In Progress Tasks
                if !viewModel.inProgressTasks.isEmpty {
                    Section("In Progress (\(viewModel.inProgressTasks.count))") {
                        ForEach(viewModel.inProgressTasks) { task in
                            AITaskRow(task: task)
                        }
                    }
                }

                // Recent Completed
                if !viewModel.recentCompletedTasks.isEmpty {
                    Section("Recently Completed") {
                        ForEach(viewModel.recentCompletedTasks) { task in
                            AITaskRow(task: task)
                        }
                    }
                }
            }
        }
        .navigationTitle("Task Queue")
        .refreshable {
            viewModel.fetchTasks()
        }
        .onAppear {
            viewModel.fetchTasks()
        }
    }
}

struct AITaskRow: View {
    let task: AITask

    var statusColor: Color {
        switch task.status {
        case .pending: return .orange
        case .inProgress: return .blue
        case .completed: return .green
        case .failed: return .red
        case .escalated: return .purple
        }
    }

    var priorityIcon: String {
        switch task.priority {
        case 5: return "exclamationmark.3"
        case 4: return "exclamationmark.2"
        case 3: return "exclamationmark"
        default: return "minus"
        }
    }

    var body: some View {
        HStack(spacing: 12) {
            // Priority indicator
            VStack {
                Image(systemName: priorityIcon)
                    .font(.caption)
                    .foregroundColor(task.priority >= 4 ? .red : .secondary)
            }
            .frame(width: 24)

            // Task info
            VStack(alignment: .leading, spacing: 4) {
                Text(task.type.replacingOccurrences(of: "_", with: " ").capitalized)
                    .font(.subheadline)
                    .fontWeight(.medium)

                if let orderId = task.payload["orderId"] {
                    Text("Order: \(orderId)")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                }

                Text(timeAgo(from: task.createdAt))
                    .font(.caption2)
                    .foregroundColor(.secondary)
            }

            Spacer()

            // Status badge
            HStack(spacing: 4) {
                Circle()
                    .fill(statusColor)
                    .frame(width: 8, height: 8)
                Text(task.status.displayName)
                    .font(.caption)
                    .foregroundColor(statusColor)
            }
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(statusColor.opacity(0.1))
            .cornerRadius(12)
        }
        .padding(.vertical, 4)
    }

    private func timeAgo(from timestamp: Int64) -> String {
        let seconds = Int(Date().timeIntervalSince1970) - Int(timestamp / 1000)
        if seconds < 60 { return "Just now" }
        if seconds < 3600 { return "\(seconds / 60)m ago" }
        if seconds < 86400 { return "\(seconds / 3600)h ago" }
        return "\(seconds / 86400)d ago"
    }
}

class AITaskQueueViewModel: ObservableObject {
    @Published var tasks: [AITask] = []
    @Published var isLoading = false
    @Published var error: String?

    private let db = Firestore.firestore()
    private var listener: ListenerRegistration?

    var pendingTasks: [AITask] {
        tasks.filter { $0.status == .pending }
    }

    var inProgressTasks: [AITask] {
        tasks.filter { $0.status == .inProgress }
    }

    var recentCompletedTasks: [AITask] {
        tasks.filter { $0.status == .completed }.prefix(10).map { $0 }
    }

    func fetchTasks() {
        isLoading = true
        listener?.remove()

        listener = db.collection("ai_tasks")
            .order(by: "createdAt", descending: true)
            .limit(to: 50)
            .addSnapshotListener { [weak self] snapshot, error in
                DispatchQueue.main.async {
                    self?.isLoading = false

                    if let error = error {
                        self?.error = error.localizedDescription
                        return
                    }

                    self?.tasks = snapshot?.documents.compactMap { doc in
                        try? doc.data(as: AITask.self)
                    } ?? []
                }
            }
    }

    deinit {
        listener?.remove()
    }
}

// MARK: - AI Audit Log View (Real Firebase Data)

struct AIAuditLogView: View {
    @StateObject private var viewModel = AIAuditLogViewModel()

    var body: some View {
        List {
            if viewModel.isLoading {
                Section {
                    HStack {
                        Spacer()
                        ProgressView()
                            .padding()
                        Spacer()
                    }
                }
            } else if viewModel.logs.isEmpty {
                Section {
                    VStack(spacing: 12) {
                        Image(systemName: "doc.text.magnifyingglass")
                            .font(.system(size: 40))
                            .foregroundColor(.secondary)
                        Text("No Audit Logs")
                            .font(.headline)
                        Text("AI employee actions will appear here")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 24)
                }
            } else {
                ForEach(viewModel.logsByDate.keys.sorted().reversed(), id: \.self) { date in
                    Section(date) {
                        ForEach(viewModel.logsByDate[date] ?? []) { log in
                            AuditLogRow(log: log)
                        }
                    }
                }
            }
        }
        .navigationTitle("Audit Log")
        .refreshable {
            viewModel.fetchLogs()
        }
        .onAppear {
            viewModel.fetchLogs()
        }
    }
}

struct AuditLogEntry: Identifiable {
    let id: String
    let action: String
    let employeeId: String?
    let timestamp: Int64
    let details: [String: Any]

    var formattedTime: String {
        let date = Date(timeIntervalSince1970: TimeInterval(timestamp / 1000))
        let formatter = DateFormatter()
        formatter.dateFormat = "h:mm a"
        return formatter.string(from: date)
    }

    var dateString: String {
        let date = Date(timeIntervalSince1970: TimeInterval(timestamp / 1000))
        let formatter = DateFormatter()
        formatter.dateFormat = "MMM d, yyyy"
        return formatter.string(from: date)
    }

    var actionIcon: String {
        switch action {
        case "employee_created": return "person.badge.plus"
        case "status_changed": return "arrow.triangle.2.circlepath"
        case "task_submitted": return "plus.circle"
        case "task_completed": return "checkmark.circle"
        case "task_failed": return "xmark.circle"
        default: return "doc.text"
        }
    }

    var actionColor: Color {
        switch action {
        case "employee_created": return .green
        case "status_changed": return .blue
        case "task_submitted": return .orange
        case "task_completed": return .green
        case "task_failed": return .red
        default: return .secondary
        }
    }
}

struct AuditLogRow: View {
    let log: AuditLogEntry

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: log.actionIcon)
                .foregroundColor(log.actionColor)
                .frame(width: 24)

            VStack(alignment: .leading, spacing: 4) {
                Text(log.action.replacingOccurrences(of: "_", with: " ").capitalized)
                    .font(.subheadline)
                    .fontWeight(.medium)

                if let employeeId = log.employeeId {
                    Text("Employee: \(employeeId.prefix(8))...")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                }
            }

            Spacer()

            Text(log.formattedTime)
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .padding(.vertical, 4)
    }
}

class AIAuditLogViewModel: ObservableObject {
    @Published var logs: [AuditLogEntry] = []
    @Published var isLoading = false
    @Published var error: String?

    private let db = Firestore.firestore()
    private var listener: ListenerRegistration?

    var logsByDate: [String: [AuditLogEntry]] {
        Dictionary(grouping: logs) { $0.dateString }
    }

    func fetchLogs() {
        isLoading = true
        listener?.remove()

        listener = db.collection("ai_audit_log")
            .order(by: "timestamp", descending: true)
            .limit(to: 100)
            .addSnapshotListener { [weak self] snapshot, error in
                DispatchQueue.main.async {
                    self?.isLoading = false

                    if let error = error {
                        self?.error = error.localizedDescription
                        return
                    }

                    self?.logs = snapshot?.documents.compactMap { doc -> AuditLogEntry? in
                        let data = doc.data()
                        guard let action = data["action"] as? String,
                              let timestamp = data["timestamp"] as? Int64 else {
                            return nil
                        }

                        return AuditLogEntry(
                            id: doc.documentID,
                            action: action,
                            employeeId: data["employeeId"] as? String,
                            timestamp: timestamp,
                            details: data["details"] as? [String: Any] ?? [:]
                        )
                    } ?? []
                }
            }
    }

    deinit {
        listener?.remove()
    }
}

// MARK: - ViewModel

class AIEmployeesViewModel: ObservableObject {
    @Published var employees: [AIEmployee] = []
    @Published var isLoading = false
    @Published var error: String?

    // P2P API Data
    @Published var p2pEmployees: [P2PAIEmployee] = []
    @Published var systemHealth: P2PSystemHealth?

    private let service = AIEmployeeService.shared

    var activeEmployees: [AIEmployee] {
        employees.filter { $0.status == .active || $0.status == .creating }
    }

    var inactiveEmployees: [AIEmployee] {
        employees.filter { $0.status == .paused || $0.status == .error || $0.status == .retired }
    }

    var activeEmployeeCount: Int {
        // Prefer P2P data if available
        if !p2pEmployees.isEmpty {
            return p2pEmployees.filter { $0.status.lowercased() == "active" || $0.status.lowercased() == "online" }.count
        }
        return employees.filter { $0.status == .active }.count
    }

    var totalTasksToday: Int {
        // Prefer P2P data if available
        if !p2pEmployees.isEmpty {
            return p2pEmployees.reduce(0) { $0 + $1.tasksToday }
        }
        return employees.reduce(0) { $0 + $1.tasksCompleted }
    }

    var platformStatus: String {
        // Use system health from P2P if available
        if let health = systemHealth {
            if health.allEmployeesOnline && health.processingDelayMs < 100 {
                return "Fully operational"
            } else if health.allEmployeesOnline {
                return "Operational (slight delay)"
            } else {
                return "Partially operational"
            }
        }
        return service.platformStatus
    }

    func fetchEmployees() {
        service.fetchEmployees()

        // Observe Firebase changes
        service.$employees
            .receive(on: DispatchQueue.main)
            .assign(to: &$employees)

        service.$isLoading
            .receive(on: DispatchQueue.main)
            .assign(to: &$isLoading)

        service.$error
            .receive(on: DispatchQueue.main)
            .assign(to: &$error)

        // Observe P2P API data
        service.$p2pEmployees
            .receive(on: DispatchQueue.main)
            .assign(to: &$p2pEmployees)

        service.$systemHealth
            .receive(on: DispatchQueue.main)
            .assign(to: &$systemHealth)
    }

    func createEmployee(
        name: String,
        role: AIEmployeeRole,
        model: String,
        autoProcess: Bool,
        completion: @escaping (Bool) -> Void
    ) {
        service.createEmployee(
            name: name,
            role: role,
            model: model,
            autoProcess: autoProcess
        ) { result in
            DispatchQueue.main.async {
                switch result {
                case .success:
                    completion(true)
                case .failure(let error):
                    self.error = error.localizedDescription
                    completion(false)
                }
            }
        }
    }

    func pauseEmployee(_ id: String) {
        service.pauseEmployee(id)
    }

    func resumeEmployee(_ id: String) {
        service.resumeEmployee(id)
    }

    func retireEmployee(_ id: String) {
        service.retireEmployee(id)
    }
}

// MARK: - P2P AI Employee Row

struct P2PAIEmployeeRow: View {
    let employee: P2PAIEmployee

    var statusColor: Color {
        switch employee.status.lowercased() {
        case "active", "online": return .green
        case "idle": return .blue
        case "busy": return .orange
        case "offline", "error": return .red
        default: return .gray
        }
    }

    var roleIcon: String {
        switch employee.role.lowercased() {
        case "order_processor", "order processor": return "doc.text.fill"
        case "driver_dispatcher", "driver dispatcher": return "car.fill"
        case "customer_support", "customer support": return "person.fill.questionmark"
        case "billing_agent", "billing agent": return "dollarsign.circle.fill"
        case "fraud_detector", "fraud detector": return "shield.fill"
        case "analytics_reporter", "analytics reporter": return "chart.bar.fill"
        case "document_verifier", "document verifier": return "doc.badge.gearshape.fill"
        default: return "cpu.fill"
        }
    }

    var body: some View {
        HStack(spacing: 12) {
            // Role Icon
            ZStack {
                Circle()
                    .fill(statusColor.opacity(0.15))
                    .frame(width: 44, height: 44)
                Image(systemName: roleIcon)
                    .foregroundColor(statusColor)
            }

            // Info
            VStack(alignment: .leading, spacing: 4) {
                Text(employee.name)
                    .font(.headline)
                Text(employee.role.replacingOccurrences(of: "_", with: " ").capitalized)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }

            Spacer()

            // Status & Metrics
            VStack(alignment: .trailing, spacing: 4) {
                HStack(spacing: 4) {
                    Circle()
                        .fill(statusColor)
                        .frame(width: 8, height: 8)
                    Text(employee.status.capitalized)
                        .font(.caption)
                        .foregroundColor(statusColor)
                }

                HStack(spacing: 4) {
                    Text("\(employee.tasksToday) tasks")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                    if !employee.efficiency.isEmpty {
                        Text("• \(employee.efficiency)")
                            .font(.caption2)
                            .foregroundColor(.green)
                    }
                }
            }
        }
        .padding(.vertical, 4)
    }
}

// MARK: - Color Extension

extension Color {
    init(_ colorName: String) {
        switch colorName {
        case "green": self = .green
        case "blue": self = .blue
        case "orange": self = .orange
        case "red": self = .red
        case "gray": self = .gray
        default: self = .primary
        }
    }
}

#Preview {
    AIEmployeesView()
}
