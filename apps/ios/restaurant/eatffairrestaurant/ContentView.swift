//
//  ContentView.swift
//  eatffairrestaurant
//
//  Created by Jithesh Manoharan on 11/25/25.
//

import SwiftUI
import CoreData
import EatFairShared

struct ContentView: View {
    @State private var isLoggedIn = false

    var body: some View {
        Group {
            if isLoggedIn {
                EnhancedDashboardView()
            } else {
                LoginView(isLoggedIn: $isLoggedIn)
            }
        }
        .onAppear {
            // Check P2P vendor login (single source of truth)
            if P2PAPIService.shared.currentVendorId != nil {
                #if DEBUG
                print("ContentView: Found P2P vendor ID, user is logged in")
                #endif
                isLoggedIn = true
            }
        }
        .onChange(of: isLoggedIn) { _, newValue in
            if newValue {
                // Request notification permission after login (just-in-time)
                // This follows Apple's App Store guidelines
                NotificationManager.shared.requestAuthorization { granted in
                    #if DEBUG
                    print("ContentView: Notification permission \(granted ? "granted" : "denied")")
                    #endif
                }
            }
        }
    }
}

#Preview {
    ContentView().environment(\.managedObjectContext, PersistenceController.preview.container.viewContext)
}
