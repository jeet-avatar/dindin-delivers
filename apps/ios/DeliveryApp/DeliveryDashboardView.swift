import SwiftUI

struct DeliveryDashboardView: View {
    @State private var isOnline = false
    
    var body: some View {
        NavigationView {
            ZStack {
                // Map Background (Placeholder)
                Color.gray.opacity(0.1).edgesIgnoringSafeArea(.all)
                Text("Map View Here")
                    .foregroundColor(.gray)
                
                VStack {
                    // Top Bar
                    HStack {
                        VStack(alignment: .leading) {
                            Text("Current Location")
                                .font(.caption)
                                .foregroundColor(.gray)
                            Text("San Francisco, CA")
                                .font(.headline)
                        }
                        Spacer()
                        Image(systemName: "person.circle.fill")
                            .font(.largeTitle)
                            .foregroundColor(.gray)
                    }
                    .padding()
                    .background(Color(.systemBackground))
                    .shadow(radius: 2)
                    
                    Spacer()
                    
                    // Bottom Sheet / Action Area
                    VStack(spacing: 20) {
                        if !isOnline {
                            Text("You are offline")
                                .font(.headline)
                                .foregroundColor(.gray)
                            
                            Button(action: { isOnline = true }) {
                                Text("GO ONLINE")
                                    .font(.title3)
                                    .fontWeight(.bold)
                                    .foregroundColor(.white)
                                    .frame(maxWidth: .infinity)
                                    .padding()
                                    .background(Color("BrandGreen"))
                                    .cornerRadius(30)
                                    .shadow(radius: 5)
                            }
                        } else {
                            // Online State - Searching for orders
                            VStack(spacing: 15) {
                                ProgressView()
                                    .scaleEffect(1.5)
                                Text("Finding orders near you...")
                                    .font(.headline)
                                
                                Button(action: { isOnline = false }) {
                                    Text("GO OFFLINE")
                                        .fontWeight(.bold)
                                        .foregroundColor(.red)
                                        .padding()
                                        .background(Color.red.opacity(0.1))
                                        .cornerRadius(30)
                                }
                            }
                            .padding()
                            .frame(maxWidth: .infinity)
                            .background(Color(.systemBackground))
                            .cornerRadius(20)
                            .shadow(radius: 10)
                        }
                    }
                    .padding()
                    .padding(.bottom, 20)
                }
            }
            .navigationBarHidden(true)
        }
    }
}

struct DeliveryOrderRequestView: View {
    var body: some View {
        VStack(spacing: 20) {
            Text("New Delivery Request")
                .font(.title2)
                .fontWeight(.bold)
            
            HStack {
                VStack(alignment: .leading) {
                    Text("Pickup")
                        .font(.caption)
                        .foregroundColor(.gray)
                    Text("Natraj Restaurant")
                        .font(.headline)
                    Text("1.2 mi away")
                        .font(.subheadline)
                }
                Spacer()
                Text("$8.50")
                    .font(.title)
                    .fontWeight(.bold)
                    .foregroundColor(Color("BrandGreen"))
            }
            .padding()
            .background(Color(.secondarySystemBackground))
            .cornerRadius(10)
            
            HStack {
                VStack(alignment: .leading) {
                    Text("Dropoff")
                        .font(.caption)
                        .foregroundColor(.gray)
                    Text("123 Main St")
                        .font(.headline)
                    Text("3.5 mi trip")
                        .font(.subheadline)
                }
                Spacer()
            }
            .padding()
            .background(Color(.secondarySystemBackground))
            .cornerRadius(10)
            
            HStack(spacing: 15) {
                Button(action: {}) {
                    Text("Decline")
                        .fontWeight(.bold)
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color.gray)
                        .cornerRadius(12)
                }
                
                Button(action: {}) {
                    Text("Accept Delivery")
                        .fontWeight(.bold)
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color("BrandGreen"))
                        .cornerRadius(12)
                }
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(20)
        .shadow(radius: 20)
    }
}
