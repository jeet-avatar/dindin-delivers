import SwiftUI
import Combine
import PhotosUI
import FirebaseAuth
import FirebaseFirestore
import FirebaseStorage
import EatFairShared

/// World-class Menu Management with AI-powered suggestions
struct EnhancedMenuView: View {
    @StateObject private var viewModel = MenuViewModel()
    @State private var selectedCategory: String? = nil
    @State private var showAddItem = false
    @State private var showEditItem: MenuItem?
    @State private var searchText = ""

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Quick Stats Bar
                menuStatsBar

                // Search Bar
                searchBar

                // Category Tabs
                categoryTabs

                // Menu Items List
                ScrollView(.vertical, showsIndicators: true) {
                    LazyVStack(spacing: 12) {
                        // AI Suggestion for menu
                        if let suggestion = viewModel.menuSuggestion {
                            MenuSuggestionBanner(suggestion: suggestion)
                        }

                        // Menu Items
                        ForEach(filteredItems) { item in
                            MenuItemCard(
                                item: item,
                                onToggleAvailability: { viewModel.toggleItemAvailability(item) },
                                onEdit: { showEditItem = item },
                                onDelete: { viewModel.deleteItem(item) }
                            )
                        }

                        if filteredItems.isEmpty && !viewModel.isLoading {
                            EmptyMenuView()
                        }

                        // Bottom padding for scrolling
                        Color.clear.frame(height: 100)
                    }
                    .padding()
                }
                .scrollDismissesKeyboard(.immediately)
                .refreshable {
                    viewModel.fetchMenu()
                }
            }
            .background(RestaurantTheme.backgroundGrouped)
            .navigationTitle("Menu")
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(action: { showAddItem = true }) {
                        Image(systemName: "plus.circle.fill")
                            .foregroundColor(RestaurantTheme.brandOrange)
                    }
                }
            }
            .sheet(isPresented: $showAddItem) {
                AddEditMenuItemView(viewModel: viewModel, item: nil)
            }
            .sheet(item: $showEditItem) { item in
                AddEditMenuItemView(viewModel: viewModel, item: item)
            }
            .onAppear {
                viewModel.fetchMenu()
            }
        }
    }

    private var filteredItems: [MenuItem] {
        var items = viewModel.menuItems

        if let category = selectedCategory {
            items = items.filter { $0.category == category }
        }

        if !searchText.isEmpty {
            items = items.filter {
                $0.name.localizedCaseInsensitiveContains(searchText) ||
                $0.description.localizedCaseInsensitiveContains(searchText)
            }
        }

        return items
    }

    // MARK: - Menu Stats Bar
    private var menuStatsBar: some View {
        HStack(spacing: 12) {
            QuickStatCard(
                title: "Total Items",
                value: "\(viewModel.menuItems.count)",
                color: RestaurantTheme.brandBlue,
                icon: "menucard.fill"
            )

            QuickStatCard(
                title: "Available",
                value: "\(viewModel.menuItems.filter { $0.isAvailable }.count)",
                color: RestaurantTheme.brandGreen,
                icon: "checkmark.circle.fill"
            )

            QuickStatCard(
                title: "Out of Stock",
                value: "\(viewModel.menuItems.filter { !$0.isAvailable }.count)",
                color: RestaurantTheme.brandRed,
                icon: "xmark.circle.fill"
            )

            QuickStatCard(
                title: "Categories",
                value: "\(viewModel.categories.count)",
                color: RestaurantTheme.brandPurple,
                icon: "folder.fill"
            )
        }
        .padding(.horizontal)
        .padding(.vertical, 8)
        .background(RestaurantTheme.backgroundPrimary)
    }

    // MARK: - Search Bar
    private var searchBar: some View {
        HStack {
            Image(systemName: "magnifyingglass")
                .foregroundColor(.gray)

            TextField("Search menu items...", text: $searchText)
                .textFieldStyle(.plain)

            if !searchText.isEmpty {
                Button(action: { searchText = "" }) {
                    Image(systemName: "xmark.circle.fill")
                        .foregroundColor(.gray)
                }
            }
        }
        .padding(12)
        .background(RestaurantTheme.backgroundSecondary)
        .cornerRadius(12)
        .padding(.horizontal)
        .padding(.vertical, 8)
        .background(RestaurantTheme.backgroundPrimary)
    }

    // MARK: - Category Tabs
    private var categoryTabs: some View {
        ScrollView(.horizontal, showsIndicators: true) {
            HStack(spacing: 8) {
                CategoryTab(
                    title: "All",
                    count: viewModel.menuItems.count,
                    isSelected: selectedCategory == nil
                ) {
                    withAnimation(.spring(response: 0.3)) {
                        selectedCategory = nil
                    }
                }

                ForEach(viewModel.categories, id: \.self) { category in
                    CategoryTab(
                        title: category,
                        count: viewModel.menuItems.filter { $0.category == category }.count,
                        isSelected: selectedCategory == category
                    ) {
                        withAnimation(.spring(response: 0.3)) {
                            selectedCategory = category
                        }
                    }
                }

                // Trailing spacer for last item visibility
                Color.clear.frame(width: 20)
            }
            .padding(.horizontal)
            .padding(.vertical, 4)
        }
        .frame(height: 50)
        .background(RestaurantTheme.backgroundPrimary)
    }
}

// MARK: - Category Tab
struct CategoryTab: View {
    let title: String
    let count: Int
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 6) {
                Text(title)
                    .fontWeight(isSelected ? .semibold : .regular)

                Text("\(count)")
                    .font(.caption2)
                    .fontWeight(.bold)
                    .foregroundColor(.white)
                    .padding(.horizontal, 6)
                    .padding(.vertical, 2)
                    .background(isSelected ? RestaurantTheme.brandOrange : Color.gray)
                    .clipShape(Capsule())
            }
            .foregroundColor(isSelected ? RestaurantTheme.brandOrange : .secondary)
            .padding(.horizontal, 16)
            .padding(.vertical, 8)
            .background(isSelected ? RestaurantTheme.brandOrange.opacity(0.1) : Color.clear)
            .cornerRadius(20)
        }
    }
}

// MARK: - Menu Suggestion Banner
struct MenuSuggestionBanner: View {
    let suggestion: String

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: "lightbulb.fill")
                .font(.title3)
                .foregroundColor(.yellow)

            VStack(alignment: .leading, spacing: 4) {
                Text("AI Suggestion")
                    .font(.caption)
                    .fontWeight(.medium)
                    .foregroundColor(.secondary)
                Text(suggestion)
                    .font(.subheadline)
                    .foregroundColor(.primary)
            }

            Spacer()
        }
        .padding()
        .background(
            LinearGradient(
                colors: [Color.yellow.opacity(0.1), Color.orange.opacity(0.1)],
                startPoint: .leading,
                endPoint: .trailing
            )
        )
        .cornerRadius(12)
    }
}

// MARK: - Menu Item Card
struct MenuItemCard: View {
    let item: MenuItem
    var onToggleAvailability: () -> Void
    var onEdit: () -> Void
    var onDelete: () -> Void

    @State private var showDeleteConfirm = false

    var body: some View {
        VStack(spacing: 0) {
            HStack(spacing: 12) {
                // Item Image
                ZStack {
                    RoundedRectangle(cornerRadius: 12)
                        .fill(Color.gray.opacity(0.2))
                        .frame(width: 70, height: 70)

                    if !item.imageUrl.isEmpty {
                        AsyncImage(url: URL(string: item.imageUrl)) { image in
                            image
                                .resizable()
                                .aspectRatio(contentMode: .fill)
                        } placeholder: {
                            Image(systemName: "fork.knife")
                                .foregroundColor(.gray)
                        }
                        .frame(width: 70, height: 70)
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                    } else {
                        Image(systemName: "fork.knife")
                            .font(.title2)
                            .foregroundColor(.gray)
                    }

                    // Out of stock overlay
                    if !item.isAvailable {
                        RoundedRectangle(cornerRadius: 12)
                            .fill(Color.black.opacity(0.5))
                            .frame(width: 70, height: 70)

                        Text("SOLD\nOUT")
                            .font(.caption2)
                            .fontWeight(.bold)
                            .foregroundColor(.white)
                            .multilineTextAlignment(.center)
                    }
                }

                VStack(alignment: .leading, spacing: 4) {
                    HStack {
                        Text(item.name)
                            .font(.headline)
                            .lineLimit(1)

                        if item.isPopular {
                            Text("POPULAR")
                                .font(.caption2)
                                .fontWeight(.bold)
                                .foregroundColor(.white)
                                .padding(.horizontal, 6)
                                .padding(.vertical, 2)
                                .background(RestaurantTheme.brandOrange)
                                .clipShape(Capsule())
                        }
                    }

                    Text(item.description)
                        .font(.caption)
                        .foregroundColor(.secondary)
                        .lineLimit(2)

                    HStack {
                        Text("$\(String(format: "%.2f", item.price))")
                            .font(.subheadline)
                            .fontWeight(.bold)
                            .foregroundColor(RestaurantTheme.brandGreen)

                        Text("•")
                            .foregroundColor(.gray)

                        Text(item.category ?? "General")
                            .font(.caption)
                            .foregroundColor(.secondary)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 2)
                            .background(Color.gray.opacity(0.1))
                            .cornerRadius(8)
                    }
                }

                Spacer()

                // Toggle and Menu
                VStack(spacing: 8) {
                    Toggle("", isOn: Binding(
                        get: { item.isAvailable },
                        set: { _ in onToggleAvailability() }
                    ))
                    .toggleStyle(SwitchToggleStyle(tint: RestaurantTheme.brandGreen))
                    .labelsHidden()

                    Menu {
                        Button(action: onEdit) {
                            Label("Edit Item", systemImage: "pencil")
                        }

                        Button(role: .destructive, action: { showDeleteConfirm = true }) {
                            Label("Delete Item", systemImage: "trash")
                        }
                    } label: {
                        Image(systemName: "ellipsis.circle")
                            .font(.title3)
                            .foregroundColor(.secondary)
                    }
                }
            }
            .padding()
        }
        .background(RestaurantTheme.backgroundPrimary)
        .cornerRadius(16)
        .shadow(color: RestaurantTheme.cardShadow, radius: 4, x: 0, y: 2)
        .opacity(item.isAvailable ? 1 : 0.8)
        .alert("Delete Item?", isPresented: $showDeleteConfirm) {
            Button("Cancel", role: .cancel) { }
            Button("Delete", role: .destructive) { onDelete() }
        } message: {
            Text("Are you sure you want to delete \"\(item.name)\"? This action cannot be undone.")
        }
    }
}

// MARK: - Empty Menu View
struct EmptyMenuView: View {
    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: "menucard")
                .font(.system(size: 50))
                .foregroundColor(.gray.opacity(0.5))

            Text("No menu items")
                .font(.headline)
                .foregroundColor(.secondary)

            Text("Add your first menu item to get started")
                .font(.subheadline)
                .foregroundColor(.gray)
        }
        .padding(.vertical, 60)
    }
}

// MARK: - Add/Edit Menu Item View
struct AddEditMenuItemView: View {
    @ObservedObject var viewModel: MenuViewModel
    let item: MenuItem?
    @Environment(\.dismiss) var dismiss

    @State private var name = ""
    @State private var description = ""
    @State private var price = ""
    @State private var category = ""
    @State private var isAvailable = true
    @State private var isPopular = false
    @State private var prepTime = "15"
    @State private var showCategoryPicker = false
    @State private var newCategory = ""

    // Image picker states
    @State private var selectedPhotoItem: PhotosPickerItem?
    @State private var selectedImage: UIImage?
    @State private var existingImageUrl: String?
    @State private var isUploadingImage = false

    var isEditing: Bool { item != nil }

    var body: some View {
        NavigationStack {
            Form {
                // Image Section
                Section("Item Photo") {
                    VStack(alignment: .center, spacing: 12) {
                        if let image = selectedImage {
                            Image(uiImage: image)
                                .resizable()
                                .scaledToFill()
                                .frame(width: 150, height: 150)
                                .clipShape(RoundedRectangle(cornerRadius: 12))
                        } else if let urlString = existingImageUrl, !urlString.isEmpty,
                                  let url = URL(string: urlString) {
                            AsyncImage(url: url) { phase in
                                switch phase {
                                case .success(let image):
                                    image
                                        .resizable()
                                        .scaledToFill()
                                        .frame(width: 150, height: 150)
                                        .clipShape(RoundedRectangle(cornerRadius: 12))
                                case .failure:
                                    placeholderImage
                                default:
                                    ProgressView()
                                        .frame(width: 150, height: 150)
                                }
                            }
                        } else {
                            placeholderImage
                        }

                        PhotosPicker(selection: $selectedPhotoItem, matching: .images) {
                            Label(selectedImage == nil && existingImageUrl == nil ? "Add Photo" : "Change Photo",
                                  systemImage: "photo.badge.plus")
                        }
                        .onChange(of: selectedPhotoItem) { _, newValue in
                            Task {
                                if let data = try? await newValue?.loadTransferable(type: Data.self),
                                   let image = UIImage(data: data) {
                                    await MainActor.run {
                                        selectedImage = image
                                    }
                                }
                            }
                        }

                        if selectedImage != nil || (existingImageUrl != nil && !existingImageUrl!.isEmpty) {
                            Button(role: .destructive) {
                                selectedImage = nil
                                existingImageUrl = nil
                                selectedPhotoItem = nil
                            } label: {
                                Label("Remove Photo", systemImage: "trash")
                            }
                            .font(.caption)
                        }
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 8)
                }

                Section("Item Details") {
                    TextField("Name", text: $name)

                    TextField("Description", text: $description, axis: .vertical)
                        .lineLimit(3...5)

                    HStack {
                        Text("$")
                        TextField("Price", text: $price)
                            .keyboardType(.decimalPad)
                    }
                }

                Section("Category") {
                    if viewModel.categories.isEmpty {
                        TextField("Category", text: $category)
                    } else {
                        Picker("Category", selection: $category) {
                            ForEach(viewModel.categories, id: \.self) { cat in
                                Text(cat).tag(cat)
                            }
                            Text("+ New Category").tag("__new__")
                        }

                        if category == "__new__" {
                            TextField("New Category Name", text: $newCategory)
                        }
                    }
                }

                Section("Settings") {
                    HStack {
                        Text("Prep Time")
                        Spacer()
                        TextField("Minutes", text: $prepTime)
                            .keyboardType(.numberPad)
                            .multilineTextAlignment(.trailing)
                            .frame(width: 50)
                        Text("min")
                            .foregroundColor(.secondary)
                    }

                    Toggle("Available", isOn: $isAvailable)
                    Toggle("Mark as Popular", isOn: $isPopular)
                }

                if isEditing {
                    Section {
                        Button(role: .destructive) {
                            if let item = item {
                                viewModel.deleteItem(item)
                                dismiss()
                            }
                        } label: {
                            HStack {
                                Spacer()
                                Text("Delete Item")
                                Spacer()
                            }
                        }
                    }
                }
            }
            .navigationTitle(isEditing ? "Edit Item" : "Add Item")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") { dismiss() }
                }

                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Save") {
                        saveItem()
                    }
                    .fontWeight(.semibold)
                    .disabled(name.isEmpty || price.isEmpty)
                }
            }
            .onAppear {
                if let item = item {
                    name = item.name
                    description = item.description
                    price = String(format: "%.2f", item.price)
                    category = item.category ?? ""
                    isAvailable = item.isAvailable
                    isPopular = item.isPopular
                    prepTime = "\(item.prepTime)"
                    existingImageUrl = item.imageUrl
                }
            }
            .overlay {
                if isUploadingImage {
                    ZStack {
                        Color.black.opacity(0.4)
                        VStack(spacing: 12) {
                            ProgressView()
                                .scaleEffect(1.5)
                            Text("Uploading image...")
                                .foregroundColor(.white)
                        }
                    }
                    .ignoresSafeArea()
                }
            }
        }
    }

    private var placeholderImage: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 12)
                .fill(Color(.systemGray5))
                .frame(width: 150, height: 150)
            VStack(spacing: 8) {
                Image(systemName: "photo")
                    .font(.system(size: 40))
                    .foregroundColor(.secondary)
                Text("No Photo")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
        }
    }

    private func saveItem() {
        let finalCategory = category == "__new__" ? newCategory : category
        let priceValue = Double(price) ?? 0
        let prepTimeValue = Int(prepTime) ?? 15

        isUploadingImage = true

        // Determine image URL
        let imageUrlToSave: String?
        if selectedImage != nil {
            // New image selected - will be uploaded
            imageUrlToSave = nil // Will be set after upload
        } else if existingImageUrl != nil && !existingImageUrl!.isEmpty {
            // Keep existing image
            imageUrlToSave = existingImageUrl
        } else {
            // No image
            imageUrlToSave = ""
        }

        if isEditing, let existingItem = item {
            if let newImage = selectedImage {
                // Upload new image then update item
                viewModel.uploadImageAndUpdateItem(
                    existingItem,
                    image: newImage,
                    name: name,
                    description: description,
                    price: priceValue,
                    category: finalCategory,
                    isAvailable: isAvailable,
                    isPopular: isPopular,
                    prepTime: prepTimeValue
                ) {
                    isUploadingImage = false
                    dismiss()
                }
            } else {
                // No new image - just update with existing or empty URL
                viewModel.updateItem(
                    existingItem,
                    name: name,
                    description: description,
                    price: priceValue,
                    category: finalCategory,
                    isAvailable: isAvailable,
                    isPopular: isPopular,
                    prepTime: prepTimeValue,
                    imageUrl: imageUrlToSave
                )
                isUploadingImage = false
                dismiss()
            }
        } else {
            if let newImage = selectedImage {
                // Upload new image then add item
                viewModel.uploadImageAndAddItem(
                    image: newImage,
                    name: name,
                    description: description,
                    price: priceValue,
                    category: finalCategory,
                    isAvailable: isAvailable,
                    isPopular: isPopular,
                    prepTime: prepTimeValue
                ) {
                    isUploadingImage = false
                    dismiss()
                }
            } else {
                viewModel.addItem(
                    name: name,
                    description: description,
                    price: priceValue,
                    category: finalCategory,
                    isAvailable: isAvailable,
                    isPopular: isPopular,
                    prepTime: prepTimeValue,
                    imageUrl: ""
                )
                isUploadingImage = false
                dismiss()
            }
        }
    }
}

// MARK: - Menu ViewModel
class MenuViewModel: ObservableObject {
    @Published var menuItems: [MenuItem] = []
    @Published var categories: [String] = []
    @Published var isLoading = false
    @Published var menuSuggestion: String?

    private let db = Firestore.firestore()
    private let storage = Storage.storage()
    private let p2pAPI = P2PAPIService.shared

    var restaurantId: String? {
        // First try P2P vendor ID, fallback to Firebase
        if let vendorId = p2pAPI.currentVendorId {
            return String(vendorId)
        }
        return Auth.auth().currentUser?.uid
    }

    var vendorId: Int? {
        return p2pAPI.currentVendorId
    }

    func fetchMenu() {
        isLoading = true

        // Try P2P backend first
        if let vendorId = vendorId {
            p2pAPI.fetchMenuItems(vendorId: vendorId) { [weak self] result in
                DispatchQueue.main.async {
                    self?.isLoading = false
                    switch result {
                    case .success(let p2pItems):
                        // Convert P2P menu items to local MenuItem format
                        self?.menuItems = p2pItems.map { p2pItem in
                            MenuItem(
                                id: String(p2pItem.id),
                                name: p2pItem.name,
                                description: p2pItem.description ?? "",
                                price: p2pItem.price,
                                imageUrl: p2pItem.imageUrl ?? "",
                                isAvailable: p2pItem.inStock,
                                category: p2pItem.category ?? "Main Course",
                                isPopular: false,
                                prepTime: p2pItem.prepTime ?? 15
                            )
                        }
                        // Extract unique categories
                        self?.categories = Array(Set(self?.menuItems.compactMap { $0.category } ?? []))
                            .sorted()
                        // Generate AI suggestion
                        self?.generateMenuSuggestion()
                    case .failure(let error):
                        #if DEBUG
                        print("Failed to fetch P2P menu: \(error)")
                        #endif
                        // Fallback to Firebase
                        self?.fetchMenuFromFirebase()
                    }
                }
            }
        } else {
            // Fallback to Firebase
            fetchMenuFromFirebase()
        }
    }

    private func fetchMenuFromFirebase() {
        guard let restaurantId = Auth.auth().currentUser?.uid else {
            isLoading = false
            return
        }

        db.collection("restaurants").document(restaurantId).collection("menu")
            .getDocuments { [weak self] snapshot, error in
                DispatchQueue.main.async {
                    self?.isLoading = false

                    if let documents = snapshot?.documents {
                        self?.menuItems = documents.compactMap { doc -> MenuItem? in
                            try? doc.data(as: MenuItem.self)
                        }

                        // Extract unique categories
                        self?.categories = Array(Set(self?.menuItems.compactMap { $0.category } ?? []))
                            .sorted()

                        // Generate AI suggestion
                        self?.generateMenuSuggestion()
                    }
                }
            }
    }

    func toggleItemAvailability(_ item: MenuItem) {
        guard let restaurantId = restaurantId, let itemId = item.id else { return }
        let newAvailability = !item.isAvailable

        // Sync with P2P backend first (primary source)
        if let vendorId = vendorId, let itemIdInt = Int(itemId) {
            p2pAPI.toggleItemAvailability(vendorId: vendorId, itemId: itemIdInt, inStock: newAvailability) { [weak self] result in
                DispatchQueue.main.async {
                    switch result {
                    case .success:
                        #if DEBUG
                        print("[Menu] P2P item availability updated")
                        #endif
                    case .failure(let error):
                        #if DEBUG
                        print("[Menu] P2P availability update failed: \(error.localizedDescription)")
                        #endif
                    }
                    // Also update Firebase for backup
                    self?.db.collection("restaurants").document(restaurantId)
                        .collection("menu").document(itemId)
                        .updateData(["isAvailable": newAvailability]) { _ in
                            self?.fetchMenu()
                        }
                }
            }
        } else {
            // Fallback to Firebase only
            db.collection("restaurants").document(restaurantId)
                .collection("menu").document(itemId)
                .updateData(["isAvailable": newAvailability]) { [weak self] _ in
                    self?.fetchMenu()
                }
        }
    }

    func addItem(name: String, description: String, price: Double, category: String, isAvailable: Bool, isPopular: Bool, prepTime: Int, imageUrl: String = "") {
        guard let restaurantId = restaurantId else { return }

        let newItem: [String: Any] = [
            "name": name,
            "description": description,
            "price": price,
            "category": category,
            "imageUrl": imageUrl,
            "isAvailable": isAvailable,
            "isPopular": isPopular,
            "prepTime": prepTime,
            "createdAt": Int64(Date().timeIntervalSince1970 * 1000)
        ]

        db.collection("restaurants").document(restaurantId)
            .collection("menu").addDocument(data: newItem) { [weak self] _ in
                self?.fetchMenu()
            }
    }

    func updateItem(_ item: MenuItem, name: String, description: String, price: Double, category: String, isAvailable: Bool, isPopular: Bool, prepTime: Int, imageUrl: String? = nil) {
        guard let restaurantId = restaurantId, let itemId = item.id else { return }

        var updateData: [String: Any] = [
            "name": name,
            "description": description,
            "price": price,
            "category": category,
            "isAvailable": isAvailable,
            "isPopular": isPopular,
            "prepTime": prepTime,
            "updatedAt": Int64(Date().timeIntervalSince1970 * 1000)
        ]

        // Only update imageUrl if provided
        if let imageUrl = imageUrl {
            updateData["imageUrl"] = imageUrl
        }

        // Sync with P2P backend first (primary source)
        if let vendorId = vendorId, let itemIdInt = Int(itemId) {
            // P2P uses snake_case keys
            var p2pUpdates: [String: Any] = [
                "name": name,
                "description": description,
                "price": price,
                "category": category,
                "in_stock": isAvailable,
                "prep_time": prepTime
            ]
            if let imageUrl = imageUrl {
                p2pUpdates["image_url"] = imageUrl
            }

            p2pAPI.updateMenuItem(vendorId: vendorId, itemId: itemIdInt, updates: p2pUpdates) { [weak self] result in
                DispatchQueue.main.async {
                    switch result {
                    case .success:
                        #if DEBUG
                        print("[Menu] P2P item updated successfully")
                        #endif
                    case .failure(let error):
                        #if DEBUG
                        print("[Menu] P2P item update failed: \(error.localizedDescription)")
                        #endif
                    }
                    // Also update Firebase for backup
                    self?.db.collection("restaurants").document(restaurantId)
                        .collection("menu").document(itemId)
                        .updateData(updateData) { _ in
                            self?.fetchMenu()
                        }
                }
            }
        } else {
            // Fallback to Firebase only
            db.collection("restaurants").document(restaurantId)
                .collection("menu").document(itemId)
                .updateData(updateData) { [weak self] _ in
                    self?.fetchMenu()
                }
        }
    }

    // MARK: - Image Upload Functions

    func uploadImageAndAddItem(image: UIImage, name: String, description: String, price: Double, category: String, isAvailable: Bool, isPopular: Bool, prepTime: Int, completion: @escaping () -> Void) {
        guard let restaurantId = restaurantId else {
            completion()
            return
        }

        uploadMenuItemImage(image: image, restaurantId: restaurantId) { [weak self] imageUrl in
            self?.addItem(
                name: name,
                description: description,
                price: price,
                category: category,
                isAvailable: isAvailable,
                isPopular: isPopular,
                prepTime: prepTime,
                imageUrl: imageUrl ?? ""
            )
            completion()
        }
    }

    func uploadImageAndUpdateItem(_ item: MenuItem, image: UIImage, name: String, description: String, price: Double, category: String, isAvailable: Bool, isPopular: Bool, prepTime: Int, completion: @escaping () -> Void) {
        guard let restaurantId = restaurantId else {
            completion()
            return
        }

        uploadMenuItemImage(image: image, restaurantId: restaurantId, itemId: item.id) { [weak self] imageUrl in
            self?.updateItem(
                item,
                name: name,
                description: description,
                price: price,
                category: category,
                isAvailable: isAvailable,
                isPopular: isPopular,
                prepTime: prepTime,
                imageUrl: imageUrl
            )
            completion()
        }
    }

    private func uploadMenuItemImage(image: UIImage, restaurantId: String, itemId: String? = nil, completion: @escaping (String?) -> Void) {
        // Compress image
        guard let imageData = image.jpegData(compressionQuality: 0.7) else {
            #if DEBUG
            print("Failed to compress image")
            #endif
            completion(nil)
            return
        }

        // Create unique filename
        let filename = itemId ?? UUID().uuidString
        let storageRef = storage.reference()
            .child("restaurants")
            .child(restaurantId)
            .child("menu")
            .child("\(filename).jpg")

        // Upload
        let metadata = StorageMetadata()
        metadata.contentType = "image/jpeg"

        storageRef.putData(imageData, metadata: metadata) { _, error in
            if let error = error {
                #if DEBUG
                print("Image upload failed: \(error.localizedDescription)")
                #endif
                completion(nil)
                return
            }

            // Get download URL
            storageRef.downloadURL { url, error in
                if let error = error {
                    #if DEBUG
                    print("Failed to get download URL: \(error.localizedDescription)")
                    #endif
                    completion(nil)
                    return
                }

                completion(url?.absoluteString)
            }
        }
    }

    func deleteItem(_ item: MenuItem) {
        guard let restaurantId = restaurantId, let itemId = item.id else { return }

        db.collection("restaurants").document(restaurantId)
            .collection("menu").document(itemId)
            .delete { [weak self] _ in
                self?.fetchMenu()
            }
    }

    private func generateMenuSuggestion() {
        let unavailableCount = menuItems.filter { !$0.isAvailable }.count
        let totalItems = menuItems.count

        if unavailableCount > totalItems / 3 {
            menuSuggestion = "Many items are unavailable. Consider restocking or updating your menu."
        } else if categories.count == 1 {
            menuSuggestion = "Adding more categories can help customers find items faster."
        } else if menuItems.count < 10 {
            menuSuggestion = "Adding more variety to your menu can increase order values."
        } else {
            menuSuggestion = nil
        }
    }
}

// MenuItem model is now in EatFairShared with full support for:
// - isPopular, prepTime, createdAt, updatedAt
// - calories, allergens, dietaryTags (future features)

#Preview {
    EnhancedMenuView()
}
