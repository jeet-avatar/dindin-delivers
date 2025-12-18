import SwiftUI

/// Notification type enum matching Android Partner app
enum NotificationType: String, CaseIterable {
    case newOrder = "NEW_ORDER"
    case orderCancelled = "ORDER_CANCELLED"
    case paymentReceived = "PAYMENT_RECEIVED"
    case reviewReceived = "REVIEW_RECEIVED"
    case system = "SYSTEM"

    var color: Color {
        switch self {
        case .newOrder: return Color(red: 76/255, green: 175/255, blue: 80/255)       // #4CAF50
        case .orderCancelled: return Color(red: 244/255, green: 67/255, blue: 54/255) // #F44336
        case .paymentReceived: return Color(red: 33/255, green: 150/255, blue: 243/255) // #2196F3
        case .reviewReceived: return Color(red: 255/255, green: 152/255, blue: 0/255)  // #FF9800
        case .system: return Color(red: 156/255, green: 39/255, blue: 176/255)        // #9C27B0
        }
    }

    var icon: String {
        switch self {
        case .newOrder: return "cart.fill"
        case .orderCancelled: return "xmark.circle.fill"
        case .paymentReceived: return "dollarsign.circle.fill"
        case .reviewReceived: return "star.fill"
        case .system: return "info.circle.fill"
        }
    }
}

/// Restaurant notification model matching Android
struct RestaurantNotification: Identifiable {
    let id: String
    let type: NotificationType
    let title: String
    let message: String
    let time: String
    var isRead: Bool

    static let sampleNotifications: [RestaurantNotification] = [
        RestaurantNotification(
            id: "1",
            type: .newOrder,
            title: "New Order Received",
            message: "Order #12345 from John D. - 2 items, $45.99",
            time: "2 mins ago",
            isRead: false
        ),
        RestaurantNotification(
            id: "2",
            type: .paymentReceived,
            title: "Payment Received",
            message: "You received $156.50 for today's orders",
            time: "1 hour ago",
            isRead: false
        ),
        RestaurantNotification(
            id: "3",
            type: .reviewReceived,
            title: "New Review",
            message: "Sarah M. left a 5-star review: \"Amazing food!\"",
            time: "3 hours ago",
            isRead: true
        ),
        RestaurantNotification(
            id: "4",
            type: .orderCancelled,
            title: "Order Cancelled",
            message: "Order #12340 was cancelled by the customer",
            time: "5 hours ago",
            isRead: true
        ),
        RestaurantNotification(
            id: "5",
            type: .system,
            title: "System Update",
            message: "New features available! Update your menu settings.",
            time: "1 day ago",
            isRead: true
        )
    ]
}

/// NotificationsView - Matches Android Partner NotificationsScreen
/// Platform Parity: Added to iOS to match Android-only feature
struct NotificationsView: View {
    @Environment(\.dismiss) private var dismiss
    @State private var notifications: [RestaurantNotification] = RestaurantNotification.sampleNotifications
    @State private var isLoading = false

    var body: some View {
        NavigationStack {
            ZStack {
                Color(UIColor.systemGroupedBackground)
                    .ignoresSafeArea()

                if isLoading {
                    ProgressView()
                        .scaleEffect(1.5)
                } else if notifications.isEmpty {
                    emptyStateView
                } else {
                    notificationsList
                }
            }
            .navigationTitle("Notifications")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button(action: { dismiss() }) {
                        Image(systemName: "chevron.left")
                            .foregroundColor(.white)
                    }
                }

                ToolbarItem(placement: .navigationBarTrailing) {
                    if !notifications.isEmpty {
                        Button("Clear All") {
                            withAnimation {
                                notifications.removeAll()
                            }
                        }
                        .foregroundColor(.white)
                    }
                }
            }
            .toolbarBackground(RestaurantTheme.brandOrange, for: .navigationBar)
            .toolbarBackground(.visible, for: .navigationBar)
            .toolbarColorScheme(.dark, for: .navigationBar)
        }
    }

    // MARK: - Empty State View
    private var emptyStateView: some View {
        VStack(spacing: 16) {
            Image(systemName: "bell.slash")
                .font(.system(size: 64))
                .foregroundColor(.gray)

            Text("No notifications")
                .font(.system(size: 18))
                .foregroundColor(.gray)
        }
    }

    // MARK: - Notifications List
    private var notificationsList: some View {
        ScrollView {
            LazyVStack(spacing: 12) {
                ForEach(notifications) { notification in
                    NotificationCard(notification: notification) {
                        markAsRead(notification)
                    }
                }
            }
            .padding(16)
        }
    }

    // MARK: - Mark as Read
    private func markAsRead(_ notification: RestaurantNotification) {
        if let index = notifications.firstIndex(where: { $0.id == notification.id }) {
            withAnimation {
                notifications[index].isRead = true
            }
        }
    }
}

/// Notification Card Component - Matches Android NotificationCard
struct NotificationCard: View {
    let notification: RestaurantNotification
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            HStack(spacing: 12) {
                // Icon with colored background
                ZStack {
                    Circle()
                        .fill(notification.type.color)
                        .frame(width: 48, height: 48)

                    Image(systemName: notification.type.icon)
                        .font(.system(size: 20))
                        .foregroundColor(.white)
                }

                // Content
                VStack(alignment: .leading, spacing: 4) {
                    Text(notification.title)
                        .font(.system(size: 15, weight: .bold))
                        .foregroundColor(.black)
                        .lineLimit(1)

                    Text(notification.message)
                        .font(.system(size: 13))
                        .foregroundColor(.gray)
                        .lineLimit(2)

                    Text(notification.time)
                        .font(.system(size: 12))
                        .foregroundColor(.gray)
                }
                .frame(maxWidth: .infinity, alignment: .leading)

                // Unread indicator
                if !notification.isRead {
                    Circle()
                        .fill(Color(red: 33/255, green: 150/255, blue: 243/255)) // #2196F3
                        .frame(width: 8, height: 8)
                }
            }
            .padding(16)
            .background(notification.isRead ? Color.white : Color(red: 227/255, green: 242/255, blue: 253/255)) // #E3F2FD
            .cornerRadius(12)
            .shadow(color: .black.opacity(0.05), radius: 1, x: 0, y: 1)
        }
        .buttonStyle(PlainButtonStyle())
    }
}

#Preview {
    NotificationsView()
}
