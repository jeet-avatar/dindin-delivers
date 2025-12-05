//
//  eatffairdeliveryApp.swift
//  eatffairdelivery
//
//  Created by Jithesh Manoharan on 11/26/25.
//

import SwiftUI
import FirebaseCore
import FirebaseMessaging
import GoogleSignIn
import UserNotifications
import EatFairShared
import GoogleMaps
import GooglePlaces

class AppDelegate: NSObject, UIApplicationDelegate, UNUserNotificationCenterDelegate, MessagingDelegate {

    func application(_ application: UIApplication,
                     didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey : Any]? = nil) -> Bool {
        // Configure Google Maps SDK
        GMSServices.provideAPIKey(GoogleMapsConfig.currentKey)
        GMSPlacesClient.provideAPIKey(GoogleMapsConfig.currentKey)

        // Configure Firebase (for push notifications and Google Sign-In only)
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
                print("DeliveryApp: Push notification authorization granted")
            }
        }
    }

    // MARK: - Remote Notification Registration

    func application(_ application: UIApplication,
                     didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        Messaging.messaging().apnsToken = deviceToken
        let tokenString = deviceToken.map { String(format: "%02.2hhx", $0) }.joined()
        print("DeliveryApp: APNs token received: \(tokenString.prefix(20))...")
    }

    func application(_ application: UIApplication,
                     didFailToRegisterForRemoteNotificationsWithError error: Error) {
        print("DeliveryApp: Failed to register for remote notifications: \(error.localizedDescription)")
    }

    // MARK: - UNUserNotificationCenterDelegate

    // Handle notification when app is in foreground
    func userNotificationCenter(_ center: UNUserNotificationCenter,
                                willPresent notification: UNNotification,
                                withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
        let userInfo = notification.request.content.userInfo
        print("DeliveryApp: Received notification in foreground: \(userInfo)")

        // Show banner and play sound even when app is in foreground
        // Delivery app should always show new order notifications prominently
        completionHandler([.banner, .sound, .badge])
    }

    // Handle notification tap
    func userNotificationCenter(_ center: UNUserNotificationCenter,
                                didReceive response: UNNotificationResponse,
                                withCompletionHandler completionHandler: @escaping () -> Void) {
        let userInfo = response.notification.request.content.userInfo
        print("DeliveryApp: User tapped notification: \(userInfo)")

        // Handle notification action based on type
        if let payload = NotificationPayload(from: userInfo) {
            handleNotificationAction(payload)
        }

        completionHandler()
    }

    // MARK: - MessagingDelegate

    func messaging(_ messaging: Messaging, didReceiveRegistrationToken fcmToken: String?) {
        guard let token = fcmToken else { return }
        print("DeliveryApp: FCM registration token: \(token.prefix(20))...")
        NotificationManager.shared.updateFCMToken(token)

        // Save token to P2P backend
        saveFCMTokenToP2P(token)
    }

    // MARK: - Notification Handling

    private func handleNotificationAction(_ payload: NotificationPayload) {
        switch payload.type {
        case .newOrder, .orderReady:
            // Navigate to available orders or specific order
            if let orderId = payload.orderId {
                NotificationCenter.default.post(
                    name: NSNotification.Name("NavigateToOrder"),
                    object: nil,
                    userInfo: ["orderId": orderId]
                )
            } else {
                NotificationCenter.default.post(
                    name: NSNotification.Name("NavigateToAvailableOrders"),
                    object: nil
                )
            }
        case .driverAssigned:
            // Navigate to my deliveries
            if let orderId = payload.orderId {
                NotificationCenter.default.post(
                    name: NSNotification.Name("NavigateToActiveDelivery"),
                    object: nil,
                    userInfo: ["orderId": orderId]
                )
            }
        default:
            break
        }
    }

    private func saveFCMTokenToP2P(_ token: String) {
        // Save FCM token to P2P driver endpoint
        guard let driverId = UserDefaults.standard.object(forKey: "p2p_driver_id") as? Int else { return }

        // TODO: Add P2P endpoint to save FCM token
        print("DeliveryApp: Would save FCM token for driver \(driverId)")
    }
}

@main
struct eatffairdeliveryApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) var delegate
    @StateObject private var authManager = AuthManager()

    var body: some Scene {
        WindowGroup {
            NavigationView {
                if authManager.isLoggedIn {
                    DriverDashboardView()
                        .environmentObject(authManager)
                } else {
                    DriverLoginView(isLoggedIn: $authManager.isLoggedIn)
                }
            }
            .onOpenURL { url in
                GIDSignIn.sharedInstance.handle(url)
            }
            .onAppear {
                // Clear badge on app launch
                NotificationManager.shared.clearBadge()
            }
        }
    }
}
