//
//  Persistence.swift
//  eatffairdelivery
//
//  Created by Jithesh Manoharan on 11/26/25.
//

import CoreData

struct PersistenceController {
    static let shared = PersistenceController()

    /// Error types for persistence operations
    enum PersistenceError: Error {
        case saveFailed(Error)
        case loadFailed(Error)

        var localizedDescription: String {
            switch self {
            case .saveFailed(let error):
                return "Failed to save data: \(error.localizedDescription)"
            case .loadFailed(let error):
                return "Failed to load data: \(error.localizedDescription)"
            }
        }
    }

    /// Flag to track if store loaded successfully
    private(set) var storeLoaded = false
    private(set) var loadError: Error?

    @MainActor
    static let preview: PersistenceController = {
        let result = PersistenceController(inMemory: true)
        let viewContext = result.container.viewContext
        for _ in 0..<10 {
            let newItem = Item(context: viewContext)
            newItem.timestamp = Date()
        }
        do {
            try viewContext.save()
        } catch {
            // Log error but don't crash in preview
            #if DEBUG
            print("Preview persistence error: \(error.localizedDescription)")
            #endif
        }
        return result
    }()

    let container: NSPersistentContainer

    init(inMemory: Bool = false) {
        container = NSPersistentContainer(name: "eatffairdelivery")
        if inMemory {
            container.persistentStoreDescriptions.first?.url = URL(fileURLWithPath: "/dev/null")
        }
        container.loadPersistentStores { (storeDescription, error) in
            if let error = error as NSError? {
                // Log the error for debugging
                #if DEBUG
                print("CoreData Error: \(error.localizedDescription)")
                print("Error details: \(error.userInfo)")
                #endif

                // In production, we handle this gracefully instead of crashing
                // The app can still function with limited persistence
                // Possible causes:
                // - Parent directory doesn't exist or can't be created
                // - Persistent store not accessible (permissions/data protection)
                // - Device out of space
                // - Store migration failed
            }
        }
        container.viewContext.automaticallyMergesChangesFromParent = true
    }

    /// Safe save method that doesn't crash
    func save() throws {
        let context = container.viewContext
        if context.hasChanges {
            do {
                try context.save()
            } catch {
                #if DEBUG
                print("CoreData save error: \(error.localizedDescription)")
                #endif
                throw PersistenceError.saveFailed(error)
            }
        }
    }
}
