//
//  eatffairrestaurantApp.swift
//  eatffairrestaurant
//
//  Created by Jithesh Manoharan on 11/25/25.
//

import SwiftUI
import FirebaseCore
import FirebaseMessaging
import FirebaseAuth
import FirebaseFirestore
import CoreData
import UserNotifications
import EatFairShared

class AppDelegate: NSObject, UIApplicationDelegate, UNUserNotificationCenterDelegate, MessagingDelegate {

    func application(_ application: UIApplication,
                     didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey : Any]? = nil) -> Bool {
        // Configure Firebase
        FirebaseApp.configure()

        // Load app configuration from Firebase
        AppConfig.shared.fetchConfig()

        // Setup push notifications
        setupPushNotifications(application)

        return true
    }

    // MARK: - Push Notification Setup

    private func setupPushNotifications(_ application: UIApplication) {
        // Set delegates
        UNUserNotificationCenter.current().delegate = self
        Messaging.messaging().delegate = self

        // Request authorization
        NotificationManager.shared.requestAuthorization { granted in
            if granted {
                print("RestaurantApp: Push notification authorization granted")
            }
        }
    }

    // MARK: - Remote Notification Registration

    func application(_ application: UIApplication,
                     didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        Messaging.messaging().apnsToken = deviceToken
        let tokenString = deviceToken.map { String(format: "%02.2hhx", $0) }.joined()
        print("RestaurantApp: APNs token received: \(tokenString.prefix(20))...")
    }

    func application(_ application: UIApplication,
                     didFailToRegisterForRemoteNotificationsWithError error: Error) {
        print("RestaurantApp: Failed to register for remote notifications: \(error.localizedDescription)")
    }

    // MARK: - UNUserNotificationCenterDelegate

    // Handle notification when app is in foreground
    func userNotificationCenter(_ center: UNUserNotificationCenter,
                                willPresent notification: UNNotification,
                                withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
        let userInfo = notification.request.content.userInfo
        print("RestaurantApp: Received notification in foreground: \(userInfo)")

        // Show banner and play sound even when app is in foreground
        // Restaurant app should always show new order notifications prominently
        completionHandler([.banner, .sound, .badge])
    }

    // Handle notification tap
    func userNotificationCenter(_ center: UNUserNotificationCenter,
                                didReceive response: UNNotificationResponse,
                                withCompletionHandler completionHandler: @escaping () -> Void) {
        let userInfo = response.notification.request.content.userInfo
        print("RestaurantApp: User tapped notification: \(userInfo)")

        // Handle notification action based on type
        if let payload = NotificationPayload(from: userInfo) {
            handleNotificationAction(payload)
        }

        completionHandler()
    }

    // MARK: - MessagingDelegate

    func messaging(_ messaging: Messaging, didReceiveRegistrationToken fcmToken: String?) {
        guard let token = fcmToken else { return }
        print("RestaurantApp: FCM registration token: \(token.prefix(20))...")
        NotificationManager.shared.updateFCMToken(token)

        // Save token to Firestore for the restaurant
        saveTokenToFirestore(token)
    }

    // MARK: - Notification Handling

    private func handleNotificationAction(_ payload: NotificationPayload) {
        switch payload.type {
        case .newOrder:
            // Navigate to orders/dashboard with the new order highlighted
            if let orderId = payload.orderId {
                NotificationCenter.default.post(
                    name: NSNotification.Name("NavigateToNewOrder"),
                    object: nil,
                    userInfo: ["orderId": orderId]
                )
            }
        case .orderStatusUpdate:
            // Navigate to specific order
            if let orderId = payload.orderId {
                NotificationCenter.default.post(
                    name: NSNotification.Name("NavigateToOrder"),
                    object: nil,
                    userInfo: ["orderId": orderId]
                )
            }
        default:
            break
        }
    }

    private func saveTokenToFirestore(_ token: String) {
        // Save FCM token to restaurant's document for targeted notifications
        guard let restaurantId = Auth.auth().currentUser?.uid else { return }

        let db = Firestore.firestore()
        db.collection("restaurants").document(restaurantId).setData([
            "fcmToken": token,
            "platform": "iOS",
            "lastTokenUpdate": FieldValue.serverTimestamp()
        ], merge: true)
    }
}

@main
struct eatffairrestaurantApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) var delegate
    let persistenceController = PersistenceController.shared

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environment(\.managedObjectContext, persistenceController.container.viewContext)
                .onAppear {
                    // Clear badge on app launch
                    NotificationManager.shared.clearBadge()
                }
        }
    }
}
