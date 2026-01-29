import SwiftUI
import EatFairShared

struct CartView: View {
    @EnvironmentObject var cartViewModel: CartViewModel
    @State private var showingAlert = false // Kept for legacy, though unused now
    @State private var showingCheckout = false
    
    var body: some View {
        NavigationStack {
            VStack {
                // Navigation Destination for Checkout
                // We use .navigationDestination modifier below instead of NavigationLink

                
                if cartViewModel.items.isEmpty {
                    VStack(spacing: 20) {
                        Image(systemName: "cart")
                            .font(.system(size: 60))
                            .foregroundColor(Theme.textGrey)
                        Text("Your cart is empty")
                            .font(.title2)
                            .foregroundColor(Theme.brandBlack)
                        Text("Add items from a restaurant to get started.")
                            .foregroundColor(Theme.textGrey)
                            .multilineTextAlignment(.center)
                            .padding()
                    }
                } else {
                    List {
                        if let restaurant = cartViewModel.restaurant {
                            Section(header: Text("Ordering from \(restaurant.name)")) {
                                ForEach(cartViewModel.items) { item in
                                    HStack {
                                        Text(item.name)
                                        Spacer()
                                        Text("$\(String(format: "%.2f", item.price))")
                                    }
                                }
                                .onDelete(perform: cartViewModel.removeFromCart)
                            }
                        }
                        
                        Section {
                            HStack {
                                Text("Total")
                                    .fontWeight(.bold)
                                Spacer()
                                Text("$\(String(format: "%.2f", cartViewModel.total))")
                                    .fontWeight(.bold)
                            }
                        }
                    }
                    .listStyle(InsetGroupedListStyle())
                    
                    // Proceed to Checkout Button
                    Button(action: {
                        showingCheckout = true
                    }) {
                        Text("Proceed to Checkout")
                            .font(.headline)
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(Theme.brandGreen)
                            .cornerRadius(12)
                            .shadow(color: Theme.brandGreen.opacity(0.3), radius: 10, x: 0, y: 5)
                    }
                    .padding()
                }
            }
            .navigationTitle("Cart")
            .navigationDestination(isPresented: $showingCheckout) {
                CheckoutView()
            }
        }
    }
}
