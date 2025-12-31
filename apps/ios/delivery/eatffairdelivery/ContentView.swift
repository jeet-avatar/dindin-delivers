//
//  ContentView.swift
//  eatffairdelivery
//
//  Created by Jithesh Manoharan on 11/26/25.
//  Issues #11-12 Fixed: Safe optional handling and proper error notifications
//

import SwiftUI
import CoreData

struct ContentView: View {
    @Environment(\.managedObjectContext) private var viewContext

    @FetchRequest(
        sortDescriptors: [NSSortDescriptor(keyPath: \Item.timestamp, ascending: true)],
        animation: .default)
    private var items: FetchedResults<Item>

    // Issue #12: State for error alerts in all configurations
    @State private var showErrorAlert = false
    @State private var errorAlertMessage = ""

    var body: some View {
        NavigationView {
            List {
                ForEach(items) { item in
                    NavigationLink {
                        // Issue #11 Fixed: Safe optional binding instead of force unwrap
                        if let timestamp = item.timestamp {
                            Text("Item at \(timestamp, formatter: itemFormatter)")
                        } else {
                            Text("Item with unknown timestamp")
                        }
                    } label: {
                        // Issue #11 Fixed: Safe optional binding
                        if let timestamp = item.timestamp {
                            Text(timestamp, formatter: itemFormatter)
                        } else {
                            Text("No timestamp")
                                .foregroundColor(.secondary)
                        }
                    }
                }
                .onDelete(perform: deleteItems)
            }
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    EditButton()
                }
                ToolbarItem {
                    Button(action: addItem) {
                        Label("Add Item", systemImage: "plus")
                    }
                }
            }
            // Issue #12: Error alert visible in all build configurations
            .alert("Error", isPresented: $showErrorAlert) {
                Button("OK", role: .cancel) {}
            } message: {
                Text(errorAlertMessage)
            }
            Text("Select an item")
        }
    }

    private func addItem() {
        withAnimation {
            let newItem = Item(context: viewContext)
            newItem.timestamp = Date()

            do {
                try viewContext.save()
            } catch {
                // Issue #12 Fixed: Show error to user in all configurations
                let nsError = error as NSError
                #if DEBUG
                print("CoreData save error: \(nsError), \(nsError.userInfo)")
                #endif
                errorAlertMessage = "Failed to save item. Please try again."
                showErrorAlert = true
            }
        }
    }

    private func deleteItems(offsets: IndexSet) {
        withAnimation {
            offsets.map { items[$0] }.forEach(viewContext.delete)

            do {
                try viewContext.save()
            } catch {
                // Issue #12 Fixed: Show error to user in all configurations
                let nsError = error as NSError
                #if DEBUG
                print("CoreData delete error: \(nsError), \(nsError.userInfo)")
                #endif
                errorAlertMessage = "Failed to delete item. Please try again."
                showErrorAlert = true
            }
        }
    }
}

private let itemFormatter: DateFormatter = {
    let formatter = DateFormatter()
    formatter.dateStyle = .short
    formatter.timeStyle = .medium
    return formatter
}()

#Preview {
    ContentView().environment(\.managedObjectContext, PersistenceController.preview.container.viewContext)
}
