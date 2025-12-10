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

        // Issue #13 Fixed: Configure Firebase with error handling
        configureFirebase()

        // Load app configuration from Firebase
        AppConfig.shared.fetchConfig()

        // Setup push notifications
        setupPushNotifications(application)

        return true
    }

    /// Issue #13 Fixed: Firebase configuration with proper error handling
    private func configureFirebase() {
        // Check if Firebase is already configured (prevents double configuration crash)
        guard FirebaseApp.app() == nil else {
            #if DEBUG
            print("DeliveryApp: Firebase already configured, skipping")
            #endif
            return
        }

        // Verify GoogleService-Info.plist exists
        guard Bundle.main.path(forResource: "GoogleService-Info", ofType: "plist") != nil else {
            #if DEBUG
            print("DeliveryApp: ERROR - GoogleService-Info.plist not found!")
            #endif
            // App can still function without Firebase (no push notifications)
            return
        }

        // Configure Firebase (doesn't throw - checked via FirebaseApp.app() above)
        FirebaseApp.configure()
        #if DEBUG
        print("DeliveryApp: Firebase configured successfully")
        #endif
    }

    // MARK: - Push Notification Setup

    private func setupPushNotifications(_ application: UIApplication) {
        // Set delegates
        UNUserNotificationCenter.current().delegate = self
        Messaging.messaging().delegate = self

        // Request authorization
        NotificationManager.shared.requestAuthorization { granted in
            #if DEBUG
            if granted {
                print("DeliveryApp: Push notification authorization granted")
            }
            #endif
        }
    }

    // MARK: - Remote Notification Registration

    func application(_ application: UIApplication,
                     didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        Messaging.messaging().apnsToken = deviceToken
        #if DEBUG
        let tokenString = deviceToken.map { String(format: "%02.2hhx", $0) }.joined()
        print("DeliveryApp: APNs token received: \(tokenString.prefix(20))...")
        #endif
    }

    func application(_ application: UIApplication,
                     didFailToRegisterForRemoteNotificationsWithError error: Error) {
        #if DEBUG
        print("DeliveryApp: Failed to register for remote notifications: \(error.localizedDescription)")
        #endif
    }

    // MARK: - UNUserNotificationCenterDelegate

    // Handle notification when app is in foreground
    func userNotificationCenter(_ center: UNUserNotificationCenter,
                                willPresent notification: UNNotification,
                                withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
        #if DEBUG
        let userInfo = notification.request.content.userInfo
        print("DeliveryApp: Received notification in foreground: \(userInfo)")
        #endif

        // Show banner and play sound even when app is in foreground
        // Delivery app should always show new order notifications prominently
        completionHandler([.banner, .sound, .badge])
    }

    // Handle notification tap
    func userNotificationCenter(_ center: UNUserNotificationCenter,
                                didReceive response: UNNotificationResponse,
                                withCompletionHandler completionHandler: @escaping () -> Void) {
        let userInfo = response.notification.request.content.userInfo
        #if DEBUG
        print("DeliveryApp: User tapped notification: \(userInfo)")
        #endif

        // Handle notification action based on type
        if let payload = NotificationPayload(from: userInfo) {
            handleNotificationAction(payload)
        }

        completionHandler()
    }

    // MARK: - MessagingDelegate

    func messaging(_ messaging: Messaging, didReceiveRegistrationToken fcmToken: String?) {
        guard let token = fcmToken else { return }
        #if DEBUG
        print("DeliveryApp: FCM registration token: \(token.prefix(20))...")
        #endif
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
        guard let driverId = UserDefaults.standard.object(forKey: UserDefaultsKeys.driverId) as? Int else { return }

        P2PAPIService.shared.saveDriverFCMToken(driverId: driverId, fcmToken: token) { result in
            #if DEBUG
            switch result {
            case .success:
                print("DeliveryApp: FCM token saved for driver \(driverId)")
            case .failure(let error):
                print("DeliveryApp: Failed to save FCM token: \(error.localizedDescription)")
            }
            #endif
        }
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
