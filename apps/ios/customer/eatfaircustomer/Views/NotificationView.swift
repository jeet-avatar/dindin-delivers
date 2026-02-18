import os

private let logger = Logger(subsystem: "com.dollorai.customer", category: "NotificationView")

import SwiftUI
import EatFairShared

/// Notification View - matches Android NotificationScreen
/// Shows list of notifications with order updates, promotions, etc.
struct NotificationView: View {
    @Environment(\.dismiss) private var dismiss

    @State private var notifications: [NotificationItem] = []
    @State private var isLoading = false
    @State private var showError = false
    @State private var errorMessage = ""

    var body: some View {
        NavigationStack {
            ZStack {
                if isLoading {
                    ProgressView("Loading notifications...")
                } else if notifications.isEmpty {
                    emptyState
                } else {
                    notificationsList
                }
            }
            .background(Color(UIColor.systemGray6))
            .navigationTitle("Notifications")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    if !notifications.isEmpty {
                        Button("Clear All") {
                            clearAllNotifications()
                        }
                        .font(.system(size: 14))
                        .foregroundColor(.accentColor)
                    }
                }
            }
            .onAppear {
                loadNotifications()
            }
            .alert("Error", isPresented: $showError) {
                Button("OK", role: .cancel) { }
            } message: {
                Text(errorMessage)
            }
        }
    }

    // MARK: - Empty State
    private var emptyState: some View {
        VStack(spacing: 16) {
            Image(systemName: "bell.slash")
                .font(.system(size: 60))
                .foregroundColor(.gray.opacity(0.5))

            Text("No Notifications")
                .font(.system(size: 20, weight: .semibold))
                .foregroundColor(.black)

            Text("You don't have any notifications yet.\nWe'll notify you about orders and promotions.")
                .font(.system(size: 14))
                .foregroundColor(.gray)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 40)
        }
    }

    // MARK: - Notifications List
    private var notificationsList: some View {
        ScrollView {
            LazyVStack(spacing: 12) {
                ForEach(notifications) { notification in
                    NotificationRow(notification: notification) {
                        markAsRead(notification)
                    }
                }
            }
            .padding(16)
        }
    }

    // MARK: - Actions
    private func loadNotifications() {
        isLoading = true

        // Call production API to fetch notifications
        P2PAPIService.shared.getNotifications { result in
            DispatchQueue.main.async {
                isLoading = false
                switch result {
                case .success(let items):
                    notifications = items
                case .failure(let error):
                    // Show empty state on error (graceful degradation)
                    notifications = []
                    #if DEBUG
                    logger.info("[NotificationView] Error loading notifications: \(error)")
                    #endif
                }
            }
        }
    }

    private func markAsRead(_ notification: NotificationItem) {
        P2PAPIService.shared.markNotificationAsRead(notificationId: notification.id) { _ in
            // Update local state
            if let index = notifications.firstIndex(where: { $0.id == notification.id }) {
                notifications[index].isRead = true
            }
        }
    }

    private func clearAllNotifications() {
        P2PAPIService.shared.clearAllNotifications { result in
            DispatchQueue.main.async {
                switch result {
                case .success:
                    notifications = []
                case .failure(let error):
                    let errMsg = error.localizedDescription.lowercased()
                    if errMsg.contains("network") || errMsg.contains("connection") {
                        errorMessage = "Unable to connect. Please check your internet connection."
                    } else {
                        errorMessage = "Unable to clear notifications. Please try again."
                    }
                    showError = true
                }
            }
        }
    }
}

// MARK: - Notification Item Model
struct NotificationItem: Identifiable {
    let id: String
    let title: String
    let message: String
    let type: NotificationType
    let timestamp: Date
    var isRead: Bool

    enum NotificationType: String {
        case orderUpdate = "order"
        case promotion = "promotion"
        case system = "system"
        case delivery = "delivery"
        case rideUpdate = "ride"

        var icon: String {
            switch self {
            case .orderUpdate: return "bag.fill"
            case .promotion: return "tag.fill"
            case .system: return "bell.fill"
            case .delivery: return "shippingbox.fill"
            case .rideUpdate: return "car.fill"
            }
        }

        var color: Color {
            switch self {
            case .orderUpdate: return .blue
            case .promotion: return .orange
            case .system: return .gray
            case .delivery: return .green
            case .rideUpdate: return .purple
            }
        }
    }
}

// MARK: - Notification Row
struct NotificationRow: View {
    let notification: NotificationItem
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            HStack(alignment: .top, spacing: 12) {
                // Icon
                Circle()
                    .fill(notification.type.color.opacity(0.2))
                    .frame(width: 44, height: 44)
                    .overlay(
                        Image(systemName: notification.type.icon)
                            .font(.system(size: 18))
                            .foregroundColor(notification.type.color)
                    )

                // Content
                VStack(alignment: .leading, spacing: 4) {
                    HStack {
                        Text(notification.title)
                            .font(.system(size: 16, weight: notification.isRead ? .regular : .semibold))
                            .foregroundColor(.black)

                        Spacer()

                        if !notification.isRead {
                            Circle()
                                .fill(Color.accentColor)
                                .frame(width: 8, height: 8)
                        }
                    }

                    Text(notification.message)
                        .font(.system(size: 14))
                        .foregroundColor(.gray)
                        .lineLimit(2)

                    Text(timeAgo(from: notification.timestamp))
                        .font(.system(size: 12))
                        .foregroundColor(.gray.opacity(0.7))
                }
            }
            .padding(16)
            .background(notification.isRead ? Color.white : Color.accentColor.opacity(0.05))
            .cornerRadius(12)
            .shadow(color: .black.opacity(0.05), radius: 2, x: 0, y: 2)
        }
        .buttonStyle(PlainButtonStyle())
    }

    private func timeAgo(from date: Date) -> String {
        let formatter = RelativeDateTimeFormatter()
        formatter.unitsStyle = .abbreviated
        return formatter.localizedString(for: date, relativeTo: Date())
    }
}

// MARK: - P2PAPIService Extension for Notifications
extension P2PAPIService {
    func getNotifications(completion: @escaping (Result<[NotificationItem], Error>) -> Void) {
        // TODO: Implement actual API call when backend endpoint is available
        // For now, return empty list (graceful degradation)
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
            completion(.success([]))
        }
    }

    func markNotificationAsRead(notificationId: String, completion: @escaping (Result<Void, Error>) -> Void) {
        // TODO: Implement actual API call
        completion(.success(()))
    }

    func clearAllNotifications(completion: @escaping (Result<Void, Error>) -> Void) {
        // TODO: Implement actual API call
        completion(.success(()))
    }
}

#Preview {
    NotificationView()
}
