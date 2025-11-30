import SwiftUI

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
            
            EarningsView()
                .tabItem {
                    Label("Earnings", systemImage: "dollarsign.circle")
                }
                .tag(2)
            
            ProfileView()
                .tabItem {
                    Label("Profile", systemImage: "person.circle")
                }
                .tag(3)
        }
        .accentColor(Color("BrandOrange")) // Assuming BrandOrange is defined
    }
}

struct OrdersView: View {
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
                            .tint(Color("BrandGreen"))
                    }
                    .padding()
                    .background(Color(.systemBackground))
                    .cornerRadius(12)
                    .shadow(radius: 2)
                    
                    // New Orders Section
                    VStack(alignment: .leading) {
                        Text("NEW ORDERS (2)")
                            .font(.caption)
                            .fontWeight(.bold)
                            .foregroundColor(.gray)
                            .padding(.leading)
                        
                        OrderCard(orderId: "#4921", items: "2x Butter Chicken, 1x Garlic Naan", price: "$34.50", time: "2 mins ago", status: .new)
                        OrderCard(orderId: "#4922", items: "1x Veg Biryani", price: "$12.00", time: "5 mins ago", status: .new)
                    }
                    
                    // In Progress Section
                    VStack(alignment: .leading) {
                        Text("IN PROGRESS (1)")
                            .font(.caption)
                            .fontWeight(.bold)
                            .foregroundColor(.gray)
                            .padding(.leading)
                        
                        OrderCard(orderId: "#4918", items: "1x Samosa Chat", price: "$8.50", time: "15 mins ago", status: .preparing)
                    }
                }
                .padding()
            }
            .navigationTitle("Dashboard")
            .background(Color(.systemGroupedBackground))
        }
    }
}

enum OrderStatus {
    case new, preparing, ready
}

struct OrderCard: View {
    let orderId: String
    let items: String
    let price: String
    let time: String
    let status: OrderStatus
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text(orderId)
                    .font(.headline)
                    .fontWeight(.bold)
                Spacer()
                Text(time)
                    .font(.caption)
                    .foregroundColor(.gray)
            }
            
            Text(items)
                .font(.body)
                .foregroundColor(.primary)
            
            Divider()
            
            HStack {
                Text(price)
                    .font(.headline)
                
                Spacer()
                
                if status == .new {
                    HStack(spacing: 12) {
                        Button(action: {}) {
                            Text("Reject")
                                .fontWeight(.semibold)
                                .foregroundColor(.red)
                                .padding(.horizontal, 16)
                                .padding(.vertical, 8)
                                .background(Color.red.opacity(0.1))
                                .cornerRadius(8)
                        }
                        
                        Button(action: {}) {
                            Text("Accept")
                                .fontWeight(.semibold)
                                .foregroundColor(.white)
                                .padding(.horizontal, 16)
                                .padding(.vertical, 8)
                                .background(Color("BrandGreen"))
                                .cornerRadius(8)
                        }
                    }
                } else if status == .preparing {
                    Button(action: {}) {
                        Text("Mark Ready")
                            .fontWeight(.semibold)
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 8)
                            .background(Color("BrandOrange"))
                            .cornerRadius(8)
                    }
                }
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(radius: 2)
    }
}

// Placeholder Views
struct MenuView: View { var body: some View { Text("Menu Management") } }
struct EarningsView: View { var body: some View { Text("Earnings") } }
struct ProfileView: View { var body: some View { Text("Restaurant Profile") } }
