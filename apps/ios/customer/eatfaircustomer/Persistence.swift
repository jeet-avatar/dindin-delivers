//
//  Persistence.swift
//  eatfaircustomer
//
//  Created by Jithesh Manoharan on 11/25/25.
//

import CoreData
import os

private let coreDataLogger = Logger(subsystem: "com.dollorai.customer", category: "CoreData")

struct PersistenceController {
    static let shared = PersistenceController()

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
            let nsError = error as NSError
            coreDataLogger.error("Preview save error: \(nsError), \(nsError.userInfo)")
        }
        return result
    }()

    let container: NSPersistentContainer

    init(inMemory: Bool = false) {
        container = NSPersistentContainer(name: "eatfaircustomer")
        if inMemory {
            container.persistentStoreDescriptions.first?.url = URL(fileURLWithPath: "/dev/null")
        }
        container.loadPersistentStores(completionHandler: { (storeDescription, error) in
            if let error = error as NSError? {
                // Log the error but don't crash - allow app to continue with degraded functionality
                coreDataLogger.error("Persistent store error: \(error), \(error.userInfo)")
            }
        })
        container.viewContext.automaticallyMergesChangesFromParent = true
    }
}
