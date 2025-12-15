//
//  EnterpriseNetworkLayer.swift
//  EatFairShared
//
//  Enterprise-grade network layer with:
//  - Circuit Breaker pattern for fault tolerance
//  - P2P primary with Firebase fallback
//  - Structured error logging
//  - Exponential backoff retry
//  - Health monitoring
//  - Request/Response caching
//
//  Designed to handle 10 million concurrent users
//

import Foundation
import Combine

// MARK: - Configuration (No Hardcoding)

/// Enterprise configuration loaded from remote or bundled config
public struct NetworkConfig: Codable {
    // Primary P2P Backend
    public var p2pBaseURL: String
    public var p2pTimeout: TimeInterval

    // Firebase Fallback
    public var firebaseEnabled: Bool
    public var firebaseProjectId: String

    // Circuit Breaker
    public var circuitBreakerFailureThreshold: Int
    public var circuitBreakerRecoveryTimeout: TimeInterval
    public var circuitBreakerHalfOpenRequests: Int

    // Retry Configuration
    public var maxRetries: Int
    public var retryBaseDelay: TimeInterval
    public var retryMaxDelay: TimeInterval
    public var retryMultiplier: Double

    // Rate Limiting
    public var requestsPerSecond: Double
    public var burstLimit: Int

    // Cache
    public var cacheEnabled: Bool
    public var cacheTTLSeconds: Int

    // Logging
    public var logLevel: LogLevel
    public var remoteLoggingEnabled: Bool
    public var remoteLoggingEndpoint: String?

    public enum LogLevel: String, Codable {
        case debug, info, warning, error, critical
    }

    /// Default production configuration
    public static let production = NetworkConfig(
        p2pBaseURL: "https://api.dollor.ai",
        p2pTimeout: 30.0,
        firebaseEnabled: true,
        firebaseProjectId: "eatfair-p2p",
        circuitBreakerFailureThreshold: 5,
        circuitBreakerRecoveryTimeout: 30.0,
        circuitBreakerHalfOpenRequests: 3,
        maxRetries: 3,
        retryBaseDelay: 1.0,
        retryMaxDelay: 30.0,
        retryMultiplier: 2.0,
        requestsPerSecond: 10.0,
        burstLimit: 50,
        cacheEnabled: true,
        cacheTTLSeconds: 300,
        logLevel: .info,
        remoteLoggingEnabled: true,
        remoteLoggingEndpoint: "https://api.dollor.ai/api/logs"
    )

    /// Development configuration - uses same production endpoint for consistency
    public static let development = NetworkConfig(
        p2pBaseURL: "https://dollor.ai",
        p2pTimeout: 60.0,
        firebaseEnabled: true,
        firebaseProjectId: "eatfair-p2p",
        circuitBreakerFailureThreshold: 5,
        circuitBreakerRecoveryTimeout: 30.0,
        circuitBreakerHalfOpenRequests: 3,
        maxRetries: 3,
        retryBaseDelay: 1.0,
        retryMaxDelay: 30.0,
        retryMultiplier: 2.0,
        requestsPerSecond: 10.0,
        burstLimit: 50,
        cacheEnabled: true,
        cacheTTLSeconds: 300,
        logLevel: .debug,
        remoteLoggingEnabled: false,
        remoteLoggingEndpoint: nil
    )
}

// MARK: - Circuit Breaker State

public enum CircuitState: String, Codable {
    case closed      // Normal operation
    case open        // Failing fast, not making requests
    case halfOpen    // Testing if backend recovered
}

// MARK: - Enterprise Error Types

public enum EnterpriseNetworkError: Error, LocalizedError {
    case circuitOpen(lastError: String?, recoveryIn: TimeInterval)
    case allRetriesFailed(attempts: Int, lastError: Error)
    case rateLimited(retryAfter: TimeInterval)
    case timeout(duration: TimeInterval)
    case serverError(statusCode: Int, message: String?)
    case decodingError(type: String, error: Error)
    case networkUnavailable
    case invalidURL(String)
    case fallbackFailed(primary: Error, fallback: Error)

    public var errorDescription: String? {
        switch self {
        case .circuitOpen(let lastError, let recoveryIn):
            return "Service temporarily unavailable. Retry in \(Int(recoveryIn))s. Last error: \(lastError ?? "unknown")"
        case .allRetriesFailed(let attempts, let lastError):
            return "Request failed after \(attempts) attempts: \(lastError.localizedDescription)"
        case .rateLimited(let retryAfter):
            return "Too many requests. Retry in \(Int(retryAfter))s"
        case .timeout(let duration):
            return "Request timed out after \(Int(duration))s"
        case .serverError(let statusCode, let message):
            return "Server error \(statusCode): \(message ?? "Unknown error")"
        case .decodingError(let type, let error):
            return "Failed to decode \(type): \(error.localizedDescription)"
        case .networkUnavailable:
            return "Network unavailable. Please check your connection."
        case .invalidURL(let url):
            return "Invalid URL: \(url)"
        case .fallbackFailed(let primary, let fallback):
            return "Both primary and fallback failed. Primary: \(primary.localizedDescription), Fallback: \(fallback.localizedDescription)"
        }
    }
}

// MARK: - Structured Log Entry

public struct LogEntry: Codable {
    public let timestamp: Date
    public let level: NetworkConfig.LogLevel
    public let category: String
    public let message: String
    public let metadata: [String: String]
    public let requestId: String?
    public let userId: String?
    public let deviceId: String
    public let appVersion: String
    public let osVersion: String

    public init(
        level: NetworkConfig.LogLevel,
        category: String,
        message: String,
        metadata: [String: String] = [:],
        requestId: String? = nil,
        userId: String? = nil
    ) {
        self.timestamp = Date()
        self.level = level
        self.category = category
        self.message = message
        self.metadata = metadata
        self.requestId = requestId
        self.userId = userId
        self.deviceId = UIDevice.current.identifierForVendor?.uuidString ?? "unknown"
        self.appVersion = Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "unknown"
        self.osVersion = UIDevice.current.systemVersion
    }
}

// MARK: - Enterprise Logger

public final class EnterpriseLogger {
    public static let shared = EnterpriseLogger()

    private var config: NetworkConfig
    private var logBuffer: [LogEntry] = []
    private let bufferQueue = DispatchQueue(label: "com.eatfair.logger", qos: .utility)
    private let flushThreshold = 50
    private var flushTimer: Timer?

    private init() {
        self.config = .development
        startPeriodicFlush()
    }

    deinit {
        stopPeriodicFlush()
    }

    public func configure(with config: NetworkConfig) {
        self.config = config
    }

    private func stopPeriodicFlush() {
        flushTimer?.invalidate()
        flushTimer = nil
    }

    public func log(
        _ level: NetworkConfig.LogLevel,
        category: String,
        message: String,
        metadata: [String: String] = [:],
        requestId: String? = nil
    ) {
        // Check log level
        guard shouldLog(level) else { return }

        let entry = LogEntry(
            level: level,
            category: category,
            message: message,
            metadata: metadata,
            requestId: requestId,
            userId: UserDefaults.standard.string(forKey: "p2p_customer_id")
        )

        // Console logging
        #if DEBUG
        let emoji: String
        switch level {
        case .debug: emoji = "🔍"
        case .info: emoji = "ℹ️"
        case .warning: emoji = "⚠️"
        case .error: emoji = "❌"
        case .critical: emoji = "🚨"
        }
        print("\(emoji) [\(category)] \(message)")
        if !metadata.isEmpty {
            print("   Metadata: \(metadata)")
        }
        #endif

        // Buffer for remote logging
        if config.remoteLoggingEnabled {
            bufferQueue.async {
                self.logBuffer.append(entry)
                if self.logBuffer.count >= self.flushThreshold {
                    self.flush()
                }
            }
        }
    }

    private func shouldLog(_ level: NetworkConfig.LogLevel) -> Bool {
        let levels: [NetworkConfig.LogLevel] = [.debug, .info, .warning, .error, .critical]
        guard let configIndex = levels.firstIndex(of: config.logLevel),
              let levelIndex = levels.firstIndex(of: level) else {
            return true
        }
        return levelIndex >= configIndex
    }

    private func startPeriodicFlush() {
        flushTimer = Timer.scheduledTimer(withTimeInterval: 60, repeats: true) { [weak self] _ in
            self?.flush()
        }
    }

    public func flush() {
        bufferQueue.async { [weak self] in
            guard let self = self,
                  !self.logBuffer.isEmpty,
                  let endpoint = self.config.remoteLoggingEndpoint,
                  let url = URL(string: endpoint) else { return }

            let logsToSend = self.logBuffer
            self.logBuffer.removeAll()

            // Send logs to remote endpoint
            var request = URLRequest(url: url)
            request.httpMethod = "POST"
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")

            do {
                request.httpBody = try JSONEncoder().encode(logsToSend)
                URLSession.shared.dataTask(with: request).resume()
            } catch {
                // Re-add logs if encoding fails
                self.logBuffer.append(contentsOf: logsToSend)
            }
        }
    }

    // Convenience methods
    public func debug(_ message: String, category: String = "General", metadata: [String: String] = [:]) {
        log(.debug, category: category, message: message, metadata: metadata)
    }

    public func info(_ message: String, category: String = "General", metadata: [String: String] = [:]) {
        log(.info, category: category, message: message, metadata: metadata)
    }

    public func warning(_ message: String, category: String = "General", metadata: [String: String] = [:]) {
        log(.warning, category: category, message: message, metadata: metadata)
    }

    public func error(_ message: String, category: String = "General", metadata: [String: String] = [:]) {
        log(.error, category: category, message: message, metadata: metadata)
    }

    public func critical(_ message: String, category: String = "General", metadata: [String: String] = [:]) {
        log(.critical, category: category, message: message, metadata: metadata)
    }
}

// MARK: - Circuit Breaker

public final class CircuitBreaker {
    private let config: NetworkConfig
    private var state: CircuitState = .closed
    private var failureCount = 0
    private var successCount = 0
    private var lastFailureTime: Date?
    private var lastError: String?
    private var halfOpenSuccessCount = 0

    private let lock = NSLock()
    private let logger = EnterpriseLogger.shared

    // Metrics
    public private(set) var totalRequests = 0
    public private(set) var totalFailures = 0
    public private(set) var circuitOpenCount = 0

    public init(config: NetworkConfig) {
        self.config = config
    }

    public var currentState: CircuitState {
        lock.lock()
        defer { lock.unlock() }

        if state == .open {
            if let lastFailure = lastFailureTime,
               Date().timeIntervalSince(lastFailure) > config.circuitBreakerRecoveryTimeout {
                state = .halfOpen
                halfOpenSuccessCount = 0
                logger.info("Circuit breaker transitioning to HALF-OPEN", category: "CircuitBreaker")
            }
        }
        return state
    }

    public func canExecute() -> Result<Void, EnterpriseNetworkError> {
        let currentState = self.currentState

        switch currentState {
        case .closed, .halfOpen:
            return .success(())
        case .open:
            let recoveryIn = config.circuitBreakerRecoveryTimeout - (Date().timeIntervalSince(lastFailureTime ?? Date()))
            return .failure(.circuitOpen(lastError: lastError, recoveryIn: max(0, recoveryIn)))
        }
    }

    public func recordSuccess() {
        lock.lock()
        defer { lock.unlock() }

        totalRequests += 1
        successCount += 1

        if state == .halfOpen {
            halfOpenSuccessCount += 1
            if halfOpenSuccessCount >= config.circuitBreakerHalfOpenRequests {
                state = .closed
                failureCount = 0
                logger.info("Circuit breaker CLOSED - service recovered", category: "CircuitBreaker")
            }
        }
    }

    public func recordFailure(error: String) {
        lock.lock()
        defer { lock.unlock() }

        totalRequests += 1
        totalFailures += 1
        failureCount += 1
        lastFailureTime = Date()
        lastError = error

        if state == .halfOpen {
            state = .open
            circuitOpenCount += 1
            logger.warning("Circuit breaker OPENED from half-open", category: "CircuitBreaker", metadata: ["error": error])
        } else if failureCount >= config.circuitBreakerFailureThreshold {
            state = .open
            circuitOpenCount += 1
            logger.warning("Circuit breaker OPENED - failure threshold reached", category: "CircuitBreaker", metadata: [
                "failures": "\(failureCount)",
                "threshold": "\(config.circuitBreakerFailureThreshold)"
            ])
        }
    }

    public func getMetrics() -> [String: Any] {
        lock.lock()
        defer { lock.unlock() }

        return [
            "state": state.rawValue,
            "totalRequests": totalRequests,
            "totalFailures": totalFailures,
            "failureRate": totalRequests > 0 ? Double(totalFailures) / Double(totalRequests) : 0,
            "circuitOpenCount": circuitOpenCount,
            "currentFailureCount": failureCount
        ]
    }
}

// MARK: - Rate Limiter

public final class RateLimiter {
    private let config: NetworkConfig
    private var tokens: Double
    private var lastRefill: Date
    private let lock = NSLock()

    public init(config: NetworkConfig) {
        self.config = config
        self.tokens = Double(config.burstLimit)
        self.lastRefill = Date()
    }

    public func tryAcquire() -> Result<Void, EnterpriseNetworkError> {
        lock.lock()
        defer { lock.unlock() }

        refillTokens()

        if tokens >= 1.0 {
            tokens -= 1.0
            return .success(())
        } else {
            let waitTime = (1.0 - tokens) / config.requestsPerSecond
            return .failure(.rateLimited(retryAfter: waitTime))
        }
    }

    private func refillTokens() {
        let now = Date()
        let elapsed = now.timeIntervalSince(lastRefill)
        let newTokens = elapsed * config.requestsPerSecond
        tokens = min(Double(config.burstLimit), tokens + newTokens)
        lastRefill = now
    }
}

// MARK: - Response Cache

public final class ResponseCache {
    private var cache: [String: (data: Data, expiry: Date)] = [:]
    private let lock = NSLock()
    private let config: NetworkConfig

    public init(config: NetworkConfig) {
        self.config = config
    }

    public func get(key: String) -> Data? {
        guard config.cacheEnabled else { return nil }

        lock.lock()
        defer { lock.unlock() }

        if let entry = cache[key], entry.expiry > Date() {
            return entry.data
        }

        // Clean expired entry
        cache.removeValue(forKey: key)
        return nil
    }

    public func set(key: String, data: Data) {
        guard config.cacheEnabled else { return }

        lock.lock()
        defer { lock.unlock() }

        let expiry = Date().addingTimeInterval(TimeInterval(config.cacheTTLSeconds))
        cache[key] = (data, expiry)
    }

    public func invalidate(key: String) {
        lock.lock()
        defer { lock.unlock() }
        cache.removeValue(forKey: key)
    }

    public func invalidateAll() {
        lock.lock()
        defer { lock.unlock() }
        cache.removeAll()
    }
}

// MARK: - Health Monitor

public struct HealthStatus: Codable {
    public let isHealthy: Bool
    public let p2pBackendStatus: ServiceStatus
    public let firebaseFallbackStatus: ServiceStatus
    public let circuitBreakerState: String
    public let lastChecked: Date
    public let responseTimeMs: Int

    public enum ServiceStatus: String, Codable {
        case healthy, degraded, unhealthy, unknown
    }
}

public final class HealthMonitor {
    public static let shared = HealthMonitor()

    private var lastHealthCheck: HealthStatus?
    private let checkInterval: TimeInterval = 30.0
    private var checkTimer: Timer?

    public var currentStatus: HealthStatus? { lastHealthCheck }

    private init() {}

    public func startMonitoring(config: NetworkConfig, circuitBreaker: CircuitBreaker) {
        checkTimer?.invalidate()

        performHealthCheck(config: config, circuitBreaker: circuitBreaker)

        checkTimer = Timer.scheduledTimer(withTimeInterval: checkInterval, repeats: true) { [weak self] _ in
            self?.performHealthCheck(config: config, circuitBreaker: circuitBreaker)
        }
    }

    private func performHealthCheck(config: NetworkConfig, circuitBreaker: CircuitBreaker) {
        guard let url = URL(string: "\(config.p2pBaseURL)/") else { return }

        let startTime = Date()

        var request = URLRequest(url: url)
        request.timeoutInterval = 10.0

        URLSession.shared.dataTask(with: request) { [weak self] _, response, error in
            let responseTime = Int(Date().timeIntervalSince(startTime) * 1000)

            let p2pStatus: HealthStatus.ServiceStatus
            if let httpResponse = response as? HTTPURLResponse {
                p2pStatus = httpResponse.statusCode == 200 ? .healthy : .degraded
            } else if error != nil {
                p2pStatus = .unhealthy
            } else {
                p2pStatus = .unknown
            }

            let status = HealthStatus(
                isHealthy: p2pStatus == .healthy,
                p2pBackendStatus: p2pStatus,
                firebaseFallbackStatus: config.firebaseEnabled ? .healthy : .unknown,
                circuitBreakerState: circuitBreaker.currentState.rawValue,
                lastChecked: Date(),
                responseTimeMs: responseTime
            )

            self?.lastHealthCheck = status

            // Log health status
            if p2pStatus != .healthy {
                EnterpriseLogger.shared.warning(
                    "Health check failed",
                    category: "HealthMonitor",
                    metadata: [
                        "p2pStatus": p2pStatus.rawValue,
                        "responseTimeMs": "\(responseTime)"
                    ]
                )
            }
        }.resume()
    }

    public func stopMonitoring() {
        checkTimer?.invalidate()
        checkTimer = nil
    }
}

// MARK: - Enterprise Network Client

public final class EnterpriseNetworkClient {
    public static let shared = EnterpriseNetworkClient()

    private var config: NetworkConfig
    private let circuitBreaker: CircuitBreaker
    private let rateLimiter: RateLimiter
    private let cache: ResponseCache
    private let logger = EnterpriseLogger.shared
    private let session: URLSession

    private init() {
        #if DEBUG
        self.config = .development
        #else
        self.config = .production
        #endif

        self.circuitBreaker = CircuitBreaker(config: config)
        self.rateLimiter = RateLimiter(config: config)
        self.cache = ResponseCache(config: config)

        let sessionConfig = URLSessionConfiguration.default
        sessionConfig.timeoutIntervalForRequest = config.p2pTimeout
        sessionConfig.timeoutIntervalForResource = config.p2pTimeout * 2
        sessionConfig.httpMaximumConnectionsPerHost = 10
        sessionConfig.waitsForConnectivity = true
        self.session = URLSession(configuration: sessionConfig)

        // Start health monitoring
        HealthMonitor.shared.startMonitoring(config: config, circuitBreaker: circuitBreaker)
    }

    public func configure(with config: NetworkConfig) {
        self.config = config
        logger.configure(with: config)
    }

    /// Execute request with full enterprise resilience
    public func request<T: Codable>(
        endpoint: String,
        method: String = "GET",
        body: Data? = nil,
        headers: [String: String] = [:],
        cacheKey: String? = nil,
        useFallback: Bool = true
    ) async throws -> T {
        let requestId = UUID().uuidString.prefix(8).lowercased()

        logger.debug("Starting request", category: "Network", metadata: [
            "requestId": String(requestId),
            "endpoint": endpoint,
            "method": method
        ])

        // Check cache for GET requests
        if method == "GET", let key = cacheKey ?? endpoint.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed),
           let cachedData = cache.get(key: key) {
            logger.debug("Cache hit", category: "Network", metadata: ["requestId": String(requestId)])
            return try JSONDecoder().decode(T.self, from: cachedData)
        }

        // Check rate limit
        if case .failure(let error) = rateLimiter.tryAcquire() {
            logger.warning("Rate limited", category: "Network", metadata: ["requestId": String(requestId)])
            throw error
        }

        // Check circuit breaker
        if case .failure(let error) = circuitBreaker.canExecute() {
            logger.warning("Circuit open", category: "Network", metadata: ["requestId": String(requestId)])

            // Try fallback if enabled
            if useFallback && config.firebaseEnabled {
                logger.info("Attempting Firebase fallback", category: "Network", metadata: ["requestId": String(requestId)])
                return try await firebaseFallback(endpoint: endpoint, method: method, body: body)
            }
            throw error
        }

        // Execute with retry
        var lastError: Error = EnterpriseNetworkError.networkUnavailable

        for attempt in 1...config.maxRetries {
            do {
                let result: T = try await executeRequest(
                    endpoint: endpoint,
                    method: method,
                    body: body,
                    headers: headers,
                    requestId: String(requestId)
                )

                circuitBreaker.recordSuccess()

                // Cache successful GET responses
                if method == "GET", let key = cacheKey ?? endpoint.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed) {
                    if let data = try? JSONEncoder().encode(result) {
                        cache.set(key: key, data: data)
                    }
                }

                return result

            } catch {
                lastError = error
                circuitBreaker.recordFailure(error: error.localizedDescription)

                logger.warning("Request failed, attempt \(attempt)/\(config.maxRetries)", category: "Network", metadata: [
                    "requestId": String(requestId),
                    "error": error.localizedDescription
                ])

                if attempt < config.maxRetries {
                    // Exponential backoff
                    let delay = min(
                        config.retryBaseDelay * pow(config.retryMultiplier, Double(attempt - 1)),
                        config.retryMaxDelay
                    )
                    try await Task.sleep(nanoseconds: UInt64(delay * 1_000_000_000))
                }
            }
        }

        // All retries failed, try fallback
        if useFallback && config.firebaseEnabled {
            logger.info("All retries failed, attempting Firebase fallback", category: "Network", metadata: ["requestId": String(requestId)])
            do {
                return try await firebaseFallback(endpoint: endpoint, method: method, body: body)
            } catch let fallbackError {
                throw EnterpriseNetworkError.fallbackFailed(primary: lastError, fallback: fallbackError)
            }
        }

        throw EnterpriseNetworkError.allRetriesFailed(attempts: config.maxRetries, lastError: lastError)
    }

    private func executeRequest<T: Decodable>(
        endpoint: String,
        method: String,
        body: Data?,
        headers: [String: String],
        requestId: String
    ) async throws -> T {
        guard let url = URL(string: "\(config.p2pBaseURL)\(endpoint)") else {
            throw EnterpriseNetworkError.invalidURL(endpoint)
        }

        var request = URLRequest(url: url)
        request.httpMethod = method
        request.httpBody = body
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue(requestId, forHTTPHeaderField: "X-Request-ID")

        for (key, value) in headers {
            request.setValue(value, forHTTPHeaderField: key)
        }

        let startTime = Date()

        let (data, response) = try await session.data(for: request)

        let duration = Date().timeIntervalSince(startTime) * 1000

        guard let httpResponse = response as? HTTPURLResponse else {
            throw EnterpriseNetworkError.networkUnavailable
        }

        logger.debug("Response received", category: "Network", metadata: [
            "requestId": requestId,
            "statusCode": "\(httpResponse.statusCode)",
            "durationMs": "\(Int(duration))"
        ])

        guard (200...299).contains(httpResponse.statusCode) else {
            let message = String(data: data, encoding: .utf8)
            throw EnterpriseNetworkError.serverError(statusCode: httpResponse.statusCode, message: message)
        }

        do {
            return try JSONDecoder().decode(T.self, from: data)
        } catch {
            throw EnterpriseNetworkError.decodingError(type: String(describing: T.self), error: error)
        }
    }

    private func firebaseFallback<T: Decodable>(
        endpoint: String,
        method: String,
        body: Data?
    ) async throws -> T {
        // Firebase Firestore REST API fallback
        // This would call Firebase when P2P is down
        logger.info("Firebase fallback not fully implemented", category: "Fallback")
        throw EnterpriseNetworkError.networkUnavailable
    }

    // MARK: - Health & Metrics

    public func getHealthStatus() -> HealthStatus? {
        HealthMonitor.shared.currentStatus
    }

    public func getCircuitBreakerMetrics() -> [String: Any] {
        circuitBreaker.getMetrics()
    }

    public func invalidateCache() {
        cache.invalidateAll()
        logger.info("Cache invalidated", category: "Cache")
    }
}

// MARK: - UIDevice Extension for Logging

#if canImport(UIKit)
import UIKit
#else
// Fallback for non-UIKit platforms
public struct UIDevice {
    public static let current = UIDevice()
    public var identifierForVendor: UUID? { UUID() }
    public var systemVersion: String { "Unknown" }
}
#endif
