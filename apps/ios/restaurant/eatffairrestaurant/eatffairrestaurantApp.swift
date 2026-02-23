//
//  eatffairrestaurantApp.swift
//  eatffairrestaurant
//
//  Created by Jithesh Manoharan on 11/25/25.
//

import SwiftUI
import FirebaseCore
import FirebaseMessaging
import CoreData
import UserNotifications
import EatFairShared
import GoogleMaps
import GooglePlaces
import os

private let logger = Logger(subsystem: "com.dollorai.restaurant", category: "RestaurantApp")
import GoogleSignIn

class AppDelegate: NSObject, UIApplicationDelegate, UNUserNotificationCenterDelegate, MessagingDelegate {

    func application(_ application: UIApplication,
                     didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey : Any]? = nil) -> Bool {
        // Configure Google Maps SDK
        GMSServices.provideAPIKey(GoogleMapsConfig.currentKey)
        GMSPlacesClient.provideAPIKey(GoogleMapsConfig.currentKey)

        // Configure Firebase (for messaging only - auth uses P2P backend)
        // Safety check: Only configure if GoogleService-Info.plist bundle ID matches app bundle ID
        if let path = Bundle.main.path(forResource: "GoogleService-Info", ofType: "plist"),
           let plist = NSDictionary(contentsOfFile: path),
           let plistBundleId = plist["BUNDLE_ID"] as? String,
           plistBundleId == Bundle.main.bundleIdentifier {
            FirebaseApp.configure()
        } else {
            // Log mismatch for debugging - app will work without Firebase features
            logger.warning("GoogleService-Info.plist BUNDLE_ID mismatch or missing, skipping Firebase")
        }

        // Load app configuration
        AppConfig.shared.fetchConfig()

        // Setup push notifications
        setupPushNotifications(application)

        return true
    }

    // Handle Google Sign-In URL callback
    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey : Any] = [:]) -> Bool {
        return GIDSignIn.sharedInstance.handle(url)
    }

    // MARK: - Push Notification Setup

    private func setupPushNotifications(_ application: UIApplication) {
        // Set delegates only - do NOT request authorization here
        // Permission should be requested after user logs in (just-in-time)
        // This follows Apple's guidelines for App Store approval
        UNUserNotificationCenter.current().delegate = self
        Messaging.messaging().delegate = self
    }

    // MARK: - Remote Notification Registration

    func application(_ application: UIApplication,
                     didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        Messaging.messaging().apnsToken = deviceToken
    }

    func application(_ application: UIApplication,
                     didFailToRegisterForRemoteNotificationsWithError error: Error) {
        #if DEBUG
        logger.debug("RestaurantApp: Failed to register for remote notifications: \(error.localizedDescription)")
        #endif
    }

    // MARK: - UNUserNotificationCenterDelegate

    // Handle notification when app is in foreground
    func userNotificationCenter(_ center: UNUserNotificationCenter,
                                willPresent notification: UNNotification,
                                withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
        // Show banner and play sound even when app is in foreground
        // Restaurant app should always show new order notifications prominently
        completionHandler([.banner, .sound, .badge])
    }

    // Handle notification tap
    func userNotificationCenter(_ center: UNUserNotificationCenter,
                                didReceive response: UNNotificationResponse,
                                withCompletionHandler completionHandler: @escaping () -> Void) {
        let userInfo = response.notification.request.content.userInfo

        // Handle notification action based on type
        if let payload = NotificationPayload(from: userInfo) {
            handleNotificationAction(payload)
        }

        completionHandler()
    }

    // MARK: - MessagingDelegate

    func messaging(_ messaging: Messaging, didReceiveRegistrationToken fcmToken: String?) {
        guard let token = fcmToken else { return }
        NotificationManager.shared.updateFCMToken(token)

        // Save token to P2P backend for the restaurant
        saveTokenToServer(token)
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

    private func saveTokenToServer(_ token: String) {
        // Save FCM token to P2P backend for targeted notifications
        guard let vendorId = P2PAPIService.shared.currentVendorId else {
            return
        }

        // Store FCM token via P2P backend
        P2PAPIService.shared.saveVendorFCMToken(vendorId: vendorId, token: token) { result in
            #if DEBUG
            switch result {
            case .success:
                logger.debug("RestaurantApp: FCM token saved for vendor \(vendorId)")
            case .failure(let error):
                logger.debug("RestaurantApp: Failed to save FCM token: \(error.localizedDescription)")
            }
            #endif
        }
    }
}

@main
struct EatffairrestaurantApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) var delegate
    let persistenceController = PersistenceController.shared
    @State private var showJailbreakWarning = false

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environment(\.managedObjectContext, persistenceController.container.viewContext)
                .onAppear {
                    // Clear badge on app launch
                    NotificationManager.shared.clearBadge()

                    // Check for jailbroken device and warn user
                    if NetworkSecurity.shared.shouldRestrictFeatures() {
                        showJailbreakWarning = true
                    }
                }
                .onOpenURL { url in
                    // Handle Google Sign-In URL callback
                    GIDSignIn.sharedInstance.handle(url)
                }
                .alert("Security Warning", isPresented: $showJailbreakWarning) {
                    Button("I Understand", role: .cancel) { }
                } message: {
                    Text(NetworkSecurity.shared.jailbreakWarningMessage())
                }
        }
    }
}
