//
//  ContentView.swift
//  eatffairrestaurant
//
//  Created by Jithesh Manoharan on 11/25/25.
//

import SwiftUI
import FirebaseAuth
import CoreData

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
            if Auth.auth().currentUser != nil {
                isLoggedIn = true
            }
        }
    }
}

#Preview {
    ContentView().environment(\.managedObjectContext, PersistenceController.preview.container.viewContext)
}
