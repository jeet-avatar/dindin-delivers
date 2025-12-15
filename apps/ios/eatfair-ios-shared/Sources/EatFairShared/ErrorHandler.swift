import Foundation
import SwiftUI

// MARK: - EatFair Error Types

/// Standardized error types for EatFair apps
public enum EatFairError: LocalizedError {
    // Network Errors
    case networkUnavailable
    case serverError(String)
    case timeout

    // Authentication Errors
    case notAuthenticated
    case sessionExpired
    case invalidCredentials

    // Order Errors
    case orderNotFound
    case orderCreationFailed(String)
    case paymentFailed(String)

    // Restaurant Errors
    case restaurantClosed
    case menuUnavailable
    case itemOutOfStock(String)

    // Location Errors
    case locationPermissionDenied
    case locationUnavailable
    case addressNotFound

    // Cart Errors
    case cartEmpty
    case maxRestaurantsReached
    case minimumOrderNotMet(Double)

    // Generic
    case unknown(String)

    public var errorDescription: String? {
        switch self {
        case .networkUnavailable:
            return "No internet connection. Please check your network settings."
        case .serverError(let message):
            return "Server error: \(message)"
        case .timeout:
            return "Request timed out. Please try again."

        case .notAuthenticated:
            return "Please sign in to continue."
        case .sessionExpired:
            return "Your session has expired. Please sign in again."
        case .invalidCredentials:
            return "Invalid email or password. Please try again."

        case .orderNotFound:
            return "Order not found. It may have been cancelled."
        case .orderCreationFailed(let reason):
            return "Unable to place order: \(reason)"
        case .paymentFailed(let reason):
            return "Payment failed: \(reason)"

        case .restaurantClosed:
            return "This restaurant is currently closed."
        case .menuUnavailable:
            return "Menu is not available at this time."
        case .itemOutOfStock(let item):
            return "\(item) is currently out of stock."

        case .locationPermissionDenied:
            return "Location access is required. Please enable it in Settings."
        case .locationUnavailable:
            return "Unable to determine your location."
        case .addressNotFound:
            return "Address not found. Please enter a valid address."

        case .cartEmpty:
            return "Your cart is empty. Add items to continue."
        case .maxRestaurantsReached:
            return "Maximum \(AppConfig.shared.maxRestaurantsPerOrder) restaurants allowed per order."
        case .minimumOrderNotMet(let minimum):
            return "Minimum order amount is $\(String(format: "%.2f", minimum))."

        case .unknown(let message):
            return message.isEmpty ? "An unexpected error occurred." : message
        }
    }

    public var recoverySuggestion: String? {
        switch self {
        case .networkUnavailable:
            return "Check your WiFi or cellular connection and try again."
        case .timeout:
            return "The server is taking too long. Try again in a moment."
        case .sessionExpired, .notAuthenticated:
            return "Tap to sign in."
        case .locationPermissionDenied:
            return "Go to Settings > Privacy > Location Services to enable."
        default:
            return nil
        }
    }

    public var isRetryable: Bool {
        switch self {
        case .networkUnavailable, .timeout, .serverError:
            return true
        default:
            return false
        }
    }
}

// MARK: - Error Alert Configuration

public struct ErrorAlertConfig {
    public let title: String
    public let message: String
    public let primaryAction: AlertAction?
    public let secondaryAction: AlertAction?

    public struct AlertAction {
        public let title: String
        public let style: ActionStyle
        public let handler: () -> Void

        public enum ActionStyle {
            case `default`, cancel, destructive
        }

        public init(title: String, style: ActionStyle = .default, handler: @escaping () -> Void = {}) {
            self.title = title
            self.style = style
            self.handler = handler
        }
    }

    public init(title: String, message: String, primaryAction: AlertAction? = nil, secondaryAction: AlertAction? = nil) {
        self.title = title
        self.message = message
        self.primaryAction = primaryAction
        self.secondaryAction = secondaryAction
    }

    /// Create a simple alert with OK button
    public static func simple(title: String = "Error", message: String) -> ErrorAlertConfig {
        ErrorAlertConfig(
            title: title,
            message: message,
            primaryAction: AlertAction(title: "OK", style: .default)
        )
    }

    /// Create an alert with retry option
    public static func retryable(message: String, onRetry: @escaping () -> Void) -> ErrorAlertConfig {
        ErrorAlertConfig(
            title: "Something Went Wrong",
            message: message,
            primaryAction: AlertAction(title: "Retry", style: .default, handler: onRetry),
            secondaryAction: AlertAction(title: "Cancel", style: .cancel)
        )
    }
}

// MARK: - Error Handler

/// Centralized error handler for EatFair apps
public class ErrorHandler: ObservableObject {
    public static let shared = ErrorHandler()

    @Published public var currentError: EatFairError?
    @Published public var showError = false

    private init() {}

    /// Handle and display an error
    public func handle(_ error: Error, context: String = "") {
        let eatFairError = mapToEatFairError(error, context: context)

        DispatchQueue.main.async {
            self.currentError = eatFairError
            self.showError = true
        }

        // Log for debugging
        logError(eatFairError, originalError: error, context: context)
    }

    /// Handle an EatFairError directly
    public func handle(_ error: EatFairError) {
        DispatchQueue.main.async {
            self.currentError = error
            self.showError = true
        }

        logError(error, originalError: nil, context: "")
    }

    /// Dismiss current error
    public func dismiss() {
        DispatchQueue.main.async {
            self.showError = false
            self.currentError = nil
        }
    }

    /// Map generic errors to EatFairError
    private func mapToEatFairError(_ error: Error, context: String) -> EatFairError {
        // Check for NSError codes
        let nsError = error as NSError

        // Network errors
        if nsError.domain == NSURLErrorDomain {
            switch nsError.code {
            case NSURLErrorNotConnectedToInternet, NSURLErrorNetworkConnectionLost:
                return .networkUnavailable
            case NSURLErrorTimedOut:
                return .timeout
            default:
                return .serverError(error.localizedDescription)
            }
        }

        // Firebase errors
        if nsError.domain == "FIRAuthErrorDomain" {
            switch nsError.code {
            case 17009: // Wrong password
                return .invalidCredentials
            case 17011: // User not found
                return .invalidCredentials
            case 17014: // Requires re-authentication
                return .sessionExpired
            default:
                return .unknown(error.localizedDescription)
            }
        }

        // Already EatFairError
        if let eatFairError = error as? EatFairError {
            return eatFairError
        }

        return .unknown(error.localizedDescription)
    }

    private func logError(_ error: EatFairError, originalError: Error?, context: String) {
        #if DEBUG
        print("❌ [EatFairError] \(error.localizedDescription)")
        if let original = originalError {
            print("   Original: \(original)")
        }
        if !context.isEmpty {
            print("   Context: \(context)")
        }
        #endif

        // In production, this would send to analytics/crash reporting
    }
}

// MARK: - SwiftUI View Modifier for Error Handling

public struct ErrorAlertModifier: ViewModifier {
    @ObservedObject var errorHandler = ErrorHandler.shared
    var onRetry: (() -> Void)?

    public func body(content: Content) -> some View {
        content
            .alert("Error", isPresented: $errorHandler.showError) {
                if let error = errorHandler.currentError, error.isRetryable, let retry = onRetry {
                    Button("Retry") {
                        errorHandler.dismiss()
                        retry()
                    }
                    Button("Cancel", role: .cancel) {
                        errorHandler.dismiss()
                    }
                } else {
                    Button("OK") {
                        errorHandler.dismiss()
                    }
                }
            } message: {
                if let error = errorHandler.currentError {
                    Text(error.localizedDescription)
                }
            }
    }
}

public extension View {
    /// Add standardized error alert handling to a view
    func withErrorHandling(onRetry: (() -> Void)? = nil) -> some View {
        modifier(ErrorAlertModifier(onRetry: onRetry))
    }
}

// MARK: - User-Friendly Messages

public struct UserMessages {
    // Success Messages
    public static let orderPlaced = "Your order has been placed successfully!"
    public static let profileUpdated = "Profile updated successfully."
    public static let addressSaved = "Address saved successfully."
    public static let paymentAdded = "Payment method added."

    // Loading Messages
    public static let loadingRestaurants = "Finding restaurants near you..."
    public static let loadingMenu = "Loading menu..."
    public static let placingOrder = "Placing your order..."
    public static let processingPayment = "Processing payment..."

    // Empty States
    public static let noRestaurants = "No restaurants found in your area."
    public static let noOrders = "You haven't placed any orders yet."
    public static let emptyCart = "Your cart is empty. Start adding delicious items!"
    public static let noAddresses = "No saved addresses. Add one to get started."

    // Confirmation
    public static let confirmLogout = "Are you sure you want to log out?"
    public static let confirmCancelOrder = "Are you sure you want to cancel this order?"
    public static let confirmClearCart = "Clear all items from your cart?"
}
