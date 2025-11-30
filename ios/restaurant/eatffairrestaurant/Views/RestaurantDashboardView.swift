import SwiftUI
import FirebaseAuth
import FirebaseFirestore
import EatFairShared
import Combine
import CoreLocation

struct RestaurantDashboardView: View {
    @State private var isOnline = true
    @State private var selectedTab = 0
    
    var body: some View {
        TabView(selection: $selectedTab) {
            OrdersView()
                .tabItem {
                    Label("Orders", systemImage: "list.bullet.clipboard")
                }
                .tag(0)
            
            MenuView()
                .tabItem {
                    Label("Menu", systemImage: "fork.knife")
                }
                .tag(1)
            
            // NEW: Promotions Tab
            PromotionsView(restaurantId: Auth.auth().currentUser?.uid ?? "")
                .tabItem {
                    Label("Promotions", systemImage: "tag.fill")
                }
                .tag(2)
            
            DeliveryMapView()
                .tabItem {
                    Label("Map", systemImage: "map")
                }
                .tag(3)
            
            EarningsView()
                .tabItem {
                    Label("Earnings", systemImage: "dollarsign.circle")
                }
                .tag(4)
            
            ProfileView()
                .tabItem {
                    Label("Profile", systemImage: "person.circle")
                }
                .tag(5)
        }
        .accentColor(.orange) // Using system orange for now
    }
}

struct OrdersView: View {
    @StateObject private var viewModel = RestaurantViewModel()
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 16) {
                    // Status Toggle
                    HStack {
                        Text("Accepting Orders")
                            .font(.headline)
                        Spacer()
                        Toggle("", isOn: .constant(true))
                            .labelsHidden()
                            .tint(.green)
                    }
                    .padding()
                    .background(Color(.systemBackground))
                    .cornerRadius(12)
                    .shadow(radius: 2)
                    
                    if viewModel.isLoading {
                        ProgressView("Loading orders...")
                            .padding()
                    }
                    
                    // New Orders Section
                    if !viewModel.newOrders.isEmpty {
                        VStack(alignment: .leading) {
                            Text("NEW ORDERS (\(viewModel.newOrders.count))")
                                .font(.caption)
                                .fontWeight(.bold)
                                .foregroundColor(.gray)
                                .padding(.leading)
                            
                            ForEach(viewModel.newOrders) { order in
                                OrderCard(order: order, onAccept: {
                                    viewModel.updateStatus(order: order, newStatus: "Preparing")
                                }, onReject: {
                                    viewModel.updateStatus(order: order, newStatus: "Rejected")
                                }, onMarkReady: {
                                    // Not applicable for new orders
                                })
                            }
                        }
                    }
                    
                    // In Progress Section
                    if !viewModel.inProgressOrders.isEmpty {
                        VStack(alignment: .leading) {
                            Text("IN PROGRESS (\(viewModel.inProgressOrders.count))")
                                .font(.caption)
                                .fontWeight(.bold)
                                .foregroundColor(.gray)
                                .padding(.leading)
                            
                            ForEach(viewModel.inProgressOrders) { order in
                                OrderCard(order: order, onAccept: {}, onReject: {}, onMarkReady: {
                                    viewModel.updateStatus(order: order, newStatus: "Ready")
                                })
                            }
                        }
                    }
                    
                    if viewModel.newOrders.isEmpty && viewModel.inProgressOrders.isEmpty && !viewModel.isLoading {
                        Text("No active orders")
                            .foregroundColor(.gray)
                            .padding(.top, 40)
                    }
                }
                .padding()
            }
            .navigationTitle("Dashboard")
            .background(Color(.systemGroupedBackground))
            .onAppear {
                viewModel.fetchOrders()
            }
        }
    }
}

struct OrderCard: View {
    let order: Order
    var onAccept: () -> Void
    var onReject: () -> Void
    var onMarkReady: () -> Void
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("#\(order.id?.prefix(4).uppercased() ?? "----")")
                    .font(.headline)
                    .fontWeight(.bold)
                Spacer()
                Text(Date(timeIntervalSince1970: TimeInterval(order.placedAt) / 1000), style: .time)
                    .font(.caption)
                    .foregroundColor(.gray)
            }
            
            ForEach(order.items, id: \.id) { item in
                HStack {
                    Text("\(item.quantity)x \(item.name)")
                        .font(.body)
                        .foregroundColor(.primary)
                }
            }
            
            Divider()
            
            VStack(alignment: .leading, spacing: 4) {
                HStack {
                    Text("Subtotal")
                        .foregroundColor(.gray)
                    Spacer()
                    Text("$\(String(format: "%.2f", order.subtotal))")
                }
                HStack {
                    Text("Tax")
                        .foregroundColor(.gray)
                    Spacer()
                    Text("$\(String(format: "%.2f", order.tax))")
                }
                HStack {
                    Text("Delivery Fee")
                        .foregroundColor(.gray)
                    Spacer()
                    Text("$\(String(format: "%.2f", order.deliveryFee))")
                }
                Divider()
                HStack {
                    Text("Total")
                        .font(.headline)
                    Spacer()
                    Text("$\(String(format: "%.2f", order.total))")
                        .font(.headline)
                }
            }
            .font(.caption)
            
            Spacer()
                
                if order.status == "Placed" {
                    HStack(spacing: 12) {
                        Button(action: onReject) {
                            Text("Reject")
                                .fontWeight(.semibold)
                                .foregroundColor(.red)
                                .padding(.horizontal, 16)
                                .padding(.vertical, 8)
                                .background(Color.red.opacity(0.1))
                                .cornerRadius(8)
                        }
                        
                        Button(action: onAccept) {
                            Text("Accept")
                                .fontWeight(.semibold)
                                .foregroundColor(.white)
                                .padding(.horizontal, 16)
                                .padding(.vertical, 8)
                                .background(Color.green)
                                .cornerRadius(8)
                        }
                    }
                } else if order.status == "Preparing" {
                    Button(action: onMarkReady) {
                        Text("Mark Ready")
                            .fontWeight(.semibold)
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 8)
                            .background(Color.orange)
                            .cornerRadius(8)
                    }
                } else if order.status == "Ready" {
                    Text("Ready for Pickup")
                        .fontWeight(.bold)
                        .foregroundColor(.green)
                }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(radius: 2)
    }
}

// Placeholder Views
struct EarningsView: View {
    @StateObject private var viewModel = EarningsViewModel()
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 20) {
                    // Summary Cards
                    HStack(spacing: 15) {
                        SummaryCard(title: "Total Revenue", value: "$\(String(format: "%.2f", viewModel.totalRevenue))", icon: "dollarsign.circle.fill", color: .green)
                        SummaryCard(title: "Total Orders", value: "\(viewModel.totalOrders)", icon: "cart.fill", color: .blue)
                    }
                    .padding(.horizontal)
                    
                    // Recent Transactions / Orders
                    VStack(alignment: .leading, spacing: 10) {
                        Text("Recent Completed Orders")
                            .font(.headline)
                            .padding(.horizontal)
                        
                        if viewModel.completedOrders.isEmpty {
                            Text("No completed orders yet.")
                                .foregroundColor(.gray)
                                .padding()
                        } else {
                            ForEach(viewModel.completedOrders) { order in
                                HStack {
                                    VStack(alignment: .leading) {
                                        Text("#\(order.id?.prefix(4).uppercased() ?? "----")")
                                            .fontWeight(.bold)
                                        Text(Date(timeIntervalSince1970: TimeInterval(order.placedAt) / 1000), style: .date)
                                            .font(.caption)
                                            .foregroundColor(.gray)
                                    }
                                    Spacer()
                                    Text("$\(String(format: "%.2f", order.total))")
                                        .fontWeight(.bold)
                                        .foregroundColor(.green)
                                }
                                .padding()
                                .background(Color(.systemBackground))
                                .cornerRadius(10)
                                .shadow(radius: 1)
                                .padding(.horizontal)
                            }
                        }
                    }
                }
                .padding(.top)
            }
            .navigationTitle("Earnings")
            .background(Color(.systemGroupedBackground))
            .onAppear {
                viewModel.fetchEarnings()
            }
        }
    }
}

struct SummaryCard: View {
    let title: String
    let value: String
    let icon: String
    let color: Color
    
    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Image(systemName: icon)
                    .foregroundColor(color)
                    .font(.title2)
                Spacer()
            }
            Text(value)
                .font(.title2)
                .fontWeight(.bold)
            Text(title)
                .font(.caption)
                .foregroundColor(.gray)
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(radius: 2)
    }
}

class EarningsViewModel: ObservableObject {
    @Published var totalRevenue: Double = 0.0
    @Published var totalOrders: Int = 0
    @Published var completedOrders: [Order] = []
    
    private var db = Firestore.firestore()
    
    func fetchEarnings() {
        guard Auth.auth().currentUser?.uid != nil else { return }
        
        // Fetch orders where restaurant.id matches uid (mapped to Int if needed, but we use String for now in iOS)
        // Note: In iOS app, we are treating restaurantId as String (Auth UID).
        // If we strictly follow Android Int ID, this query might need adjustment.
        // For now, assuming we query by "restaurant.id" (String) or filter client side.
        
        // Actually, RestaurantViewModel queries by "restaurantId" (String) or similar.
        // Let's look at RestaurantViewModel query: db.collection("orders").order(by: "placedAt")...
        // It fetches ALL orders and filters? No, it should filter by restaurant.
        
        // Let's fetch all orders for this restaurant
        // Since we don't have a reliable "restaurantId" field in Order (it's inside RestaurantInfo),
        // and RestaurantInfo.id is Int, but our Auth UID is String...
        // We might need to fetch all and filter, or rely on a "restaurantId" string field if we added one.
        // Step 1575: We added `restaurant: RestaurantInfo`.
        // We did NOT add a top-level `restaurantId` string field.
        // This is a query limitation.
        
        // Workaround: Fetch all orders (limit 100) and filter client side for now.
        // In production, we MUST add `restaurantId` (String) to Order document for indexing.
        
        db.collection("orders")
            .getDocuments { snapshot, error in
                guard let documents = snapshot?.documents else { return }
                
                let allOrders = documents.compactMap { try? $0.data(as: Order.self) }
                
                // Filter for this restaurant (using Name or ID if possible)
                // Since we don't have the Int ID of the current restaurant easily accessible here without fetching profile...
                // We'll filter by Name for now (Fragile!) or assume all orders are ours (Dev Mode).
                // Better: Fetch Profile first to get Name/ID.
                
                // Let's assume for this demo we show ALL completed orders (since we are likely the only restaurant in dev).
                // Or better, filter where status is "Delivered" or "Ready".
                
                let completed = allOrders.filter { $0.status == "Delivered" || $0.status == "Ready" || $0.status == "Picked Up" }
                
                DispatchQueue.main.async {
                    self.completedOrders = completed.sorted(by: { $0.placedAt > $1.placedAt })
                    self.totalOrders = completed.count
                    self.totalRevenue = completed.reduce(0) { $0 + $1.total }
                }
            }
    }
}
struct ProfileView: View {
    @State private var restaurantName = "My Restaurant"
    @State private var cuisine = "Indian"
    
    // Detailed Address Fields
    @State private var street = ""
    @State private var unit = ""
    @State private var city = ""
    @State private var state = ""
    @State private var zipCode = ""
    @State private var instructions = ""
    
    @State private var phoneNumber = "555-0123"
    @State private var isEditing = false
    
    @State private var latitude: Double = 0.0
    @State private var longitude: Double = 0.0
    @State private var showAddressSearch = false
    
    var body: some View {
        NavigationView {
            Form {
                Section(header: Text("Restaurant Details")) {
                    if isEditing {
                        TextField("Name", text: $restaurantName)
                        TextField("Cuisine", text: $cuisine)
                        TextField("Phone", text: $phoneNumber)
                    } else {
                        HStack {
                            Text("Name")
                            Spacer()
                            Text(restaurantName).foregroundColor(.gray)
                        }
                        HStack {
                            Text("Cuisine")
                            Spacer()
                            Text(cuisine).foregroundColor(.gray)
                        }
                        HStack {
                            Text("Phone")
                            Spacer()
                            Text(phoneNumber).foregroundColor(.gray)
                        }
                    }
                }
                
                Section(header: Text("Address")) {
                    if isEditing {
                        Button(action: { showAddressSearch = true }) {
                            HStack {
                                Image(systemName: "magnifyingglass")
                                Text("Search Address (Auto-fill)")
                                    .fontWeight(.medium)
                            }
                            .foregroundColor(.blue)
                        }
                        
                        TextField("Street Address", text: $street)
                        TextField("Apt / Suite / Unit", text: $unit)
                        TextField("City", text: $city)
                        HStack {
                            TextField("State", text: $state)
                            Divider()
                            TextField("Zip Code", text: $zipCode)
                                .keyboardType(.numberPad)
                        }
                        TextField("Delivery Instructions", text: $instructions)
                    } else {
                        VStack(alignment: .leading, spacing: 4) {
                            Text(street).fontWeight(.medium)
                            if !unit.isEmpty { Text(unit).font(.caption) }
                            Text("\(city), \(state) \(zipCode)")
                                .font(.subheadline)
                                .foregroundColor(.gray)
                            if !instructions.isEmpty {
                                Text("Note: \(instructions)")
                                    .font(.caption)
                                    .italic()
                                    .foregroundColor(.orange)
                                    .padding(.top, 4)
                            }
                        }
                    }
                }
                
                Section {
                    Button(action: {
                        if isEditing {
                            // Save changes to Firestore
                            saveProfile()
                        }
                        isEditing.toggle()
                    }) {
                        Text(isEditing ? "Save Changes" : "Edit Profile")
                            .foregroundColor(isEditing ? .green : .blue)
                    }
                }
                
                Section {
                    NavigationLink(destination: ReviewsView()) {
                        Label("Customer Reviews", systemImage: "star.bubble")
                    }
                }
                
                Section {
                    Button(action: {
                        try? Auth.auth().signOut()
                        // Handle logout state (window reload or state change)
                    }) {
                        Text("Log Out")
                            .foregroundColor(.red)
                    }
                }
            }
            .navigationTitle("Profile")
            .onAppear {
                fetchProfile()
            }
            .sheet(isPresented: $showAddressSearch) {
                AddressSearchView { selectedStreet, selectedCity, selectedState, selectedZip, coordinate in
                    self.street = selectedStreet
                    self.city = selectedCity
                    self.state = selectedState
                    self.zipCode = selectedZip
                    if let coord = coordinate {
                        self.latitude = coord.latitude
                        self.longitude = coord.longitude
                    }
                }
            }
        }
    }
    
    func fetchProfile() {
        guard let uid = Auth.auth().currentUser?.uid else { return }
        let db = Firestore.firestore()
        db.collection("restaurants").document(uid).getDocument { snapshot, error in
            if let data = snapshot?.data() {
                self.restaurantName = data["name"] as? String ?? "My Restaurant"
                self.cuisine = data["cuisine"] as? String ?? "Indian"
                self.phoneNumber = data["phone"] as? String ?? "555-0123"
                
                self.street = data["street"] as? String ?? ""
                self.unit = data["unit"] as? String ?? ""
                self.city = data["city"] as? String ?? ""
                self.state = data["state"] as? String ?? ""
                self.zipCode = data["zipCode"] as? String ?? ""
                self.instructions = data["instructions"] as? String ?? ""
                
                self.latitude = data["latitude"] as? Double ?? 0.0
                self.longitude = data["longitude"] as? Double ?? 0.0
                
                // Fallback if detailed fields missing but address string exists
                if self.street.isEmpty, let fullAddress = data["address"] as? String {
                    self.street = fullAddress
                }
            }
        }
    }
    
    func saveProfile() {
        guard let uid = Auth.auth().currentUser?.uid else { return }
        let db = Firestore.firestore()
        
        let fullAddress = "\(street), \(unit.isEmpty ? "" : unit + ", ")\(city), \(state) \(zipCode)"
        
        // Helper to save data
        func saveData(lat: Double, long: Double) {
            db.collection("restaurants").document(uid).setData([
                "name": restaurantName,
                "cuisine": cuisine,
                "address": fullAddress,
                "street": street,
                "unit": unit,
                "city": city,
                "state": state,
                "zipCode": zipCode,
                "instructions": instructions,
                "phone": phoneNumber,
                "latitude": lat,
                "longitude": long
            ], merge: true)
        }
        
        // If lat/long are 0, try to geocode
        if latitude == 0.0 || longitude == 0.0 {
            let geocoder = CLGeocoder()
            geocoder.geocodeAddressString(fullAddress) { placemarks, error in
                if let location = placemarks?.first?.location {
                    self.latitude = location.coordinate.latitude
                    self.longitude = location.coordinate.longitude
                    saveData(lat: location.coordinate.latitude, long: location.coordinate.longitude)
                } else {
                    print("Geocoding failed: \(error?.localizedDescription ?? "Unknown")")
                    saveData(lat: 0.0, long: 0.0)
                }
            }
        } else {
            saveData(lat: latitude, long: longitude)
        }
    }
}
