import SwiftUI
import FirebaseCore
import FirebaseAuth
import FirebaseFirestore
import FirebaseMessaging
import UserNotifications
import EatFairShared
import GoogleMaps
import GooglePlaces
import GoogleSignIn

class AppDelegate: NSObject, UIApplicationDelegate, UNUserNotificationCenterDelegate, MessagingDelegate {

    func application(_ application: UIApplication,
                     didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey : Any]? = nil) -> Bool {
        // Configure Google Maps SDK
        GMSServices.provideAPIKey(GoogleMapsConfig.currentKey)
        GMSPlacesClient.provideAPIKey(GoogleMapsConfig.currentKey)

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
        NotificationManager.shared.requestAuthorization { _ in }
    }

    // MARK: - Remote Notification Registration

    func application(_ application: UIApplication,
                     didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        Messaging.messaging().apnsToken = deviceToken
    }

    func application(_ application: UIApplication,
                     didFailToRegisterForRemoteNotificationsWithError error: Error) {
        #if DEBUG
        print("CustomerApp: Failed to register for remote notifications: \(error.localizedDescription)")
        #endif
    }

    // MARK: - Google Sign-In URL Handler

    func application(_ app: UIApplication,
                     open url: URL,
                     options: [UIApplication.OpenURLOptionsKey : Any] = [:]) -> Bool {
        return GIDSignIn.sharedInstance.handle(url)
    }

    // MARK: - UNUserNotificationCenterDelegate

    // Handle notification when app is in foreground
    func userNotificationCenter(_ center: UNUserNotificationCenter,
                                willPresent notification: UNNotification,
                                withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
        // Show banner and play sound even when app is in foreground
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

        // Save token to Firestore for the current user
        saveTokenToFirestore(token)
    }

    // MARK: - Notification Handling

    private func handleNotificationAction(_ payload: NotificationPayload) {
        switch payload.type {
        case .orderStatusUpdate, .orderReady, .orderPickedUp, .orderDelivered:
            // Navigate to order tracking
            if let orderId = payload.orderId {
                NotificationCenter.default.post(
                    name: NSNotification.Name("NavigateToOrder"),
                    object: nil,
                    userInfo: ["orderId": orderId]
                )
            }
        case .promotion:
            // Navigate to promotions/offers
            NotificationCenter.default.post(
                name: NSNotification.Name("NavigateToPromotions"),
                object: nil
            )
        default:
            break
        }
    }

    private func saveTokenToFirestore(_ token: String) {
        // Save FCM token to user's document for targeted notifications
        guard let userId = Auth.auth().currentUser?.uid else { return }

        let db = Firestore.firestore()
        db.collection("users").document(userId).setData([
            "fcmToken": token,
            "platform": "iOS",
            "lastUpdated": FieldValue.serverTimestamp()
        ], merge: true)
    }
}

@main
struct eatfaircustomerApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) var delegate

    @StateObject var addressViewModel = AddressViewModel()
    @StateObject var cartViewModel = CartViewModel()
    @StateObject var multiCartViewModel = MultiRestaurantCartViewModel()

    var body: some Scene {
        WindowGroup {
            MainAppView()
                .environmentObject(addressViewModel)
                .environmentObject(cartViewModel)
                .environmentObject(multiCartViewModel)
                .onAppear {
                    // Clear badge on app launch
                    NotificationManager.shared.clearBadge()
                }
                .onOpenURL { url in
                    // Handle Google Sign-In URL callback
                    GIDSignIn.sharedInstance.handle(url)
                }
        }
    }
}
