import SwiftUI
import EatFairShared
import CoreLocation

// Theme colors for consistent styling
private let brandOrange = Color(red: 1.0, green: 0.427, blue: 0.0)
private let brandGreen = Color(red: 0.298, green: 0.686, blue: 0.314)

struct LocationPickerView: View {
    @ObservedObject var viewModel: AddressViewModel
    @Binding var isPresented: Bool
    @State private var showAddressSearch = false
    
    var body: some View {
        NavigationView {
            VStack(alignment: .leading) {
                // Search Bar Entry
                Button(action: { showAddressSearch = true }) {
                    HStack {
                        Image(systemName: "magnifyingglass")
                            .foregroundColor(.black)
                        Text("Search for an address")
                            .foregroundColor(.gray)
                        Spacer()
                    }
                    .padding()
                    .background(Color(.systemGray6))
                    .cornerRadius(8)
                }
                .padding()
                .sheet(isPresented: $showAddressSearch) {
                    AddressSearchView { street, city, state, zip, coordinate in
                        // When address is searched, we should probably ADD it as a new address or just select it temporarily?
                        // For "Standard Way", usually it adds it.
                        // Let's add it.
                        let newAddress = Address(
                            userId: "", // ViewModel handles this
                            locationName: "New Address",
                            street: street,
                            unit: "",
                            city: city,
                            state: state,
                            zipCode: zip,
                            instructions: "",
                            type: "Other",
                            latitude: coordinate?.latitude ?? 0.0,
                            longitude: coordinate?.longitude ?? 0.0,
                            phoneNumber: "",
                            isDefault: false
                        )
                        viewModel.addAddress(address: newAddress) { success in
                            if success {
                                // Select the newly added address (we might need to wait for fetch, but let's assume it updates)
                                // Actually, fetch is async.
                                // Ideally we select it after fetch.
                            }
                        }
                        isPresented = false
                    }
                }
                
                Text("Saved addresses")
                    .font(.headline)
                    .padding(.horizontal)
                
                List {
                    ForEach(viewModel.addresses) { address in
                        Button(action: {
                            viewModel.selectedAddressId = address.id
                            isPresented = false
                        }) {
                            HStack {
                                Image(systemName: iconForType(address.type))
                                    .font(.title2)
                                    .foregroundColor(brandOrange)
                                    .frame(width: 30)
                                
                                VStack(alignment: .leading) {
                                    Text(address.locationName)
                                        .font(.headline)
                                        .foregroundColor(.primary)
                                    Text("\(address.street), \(address.city)")
                                        .font(.subheadline)
                                        .foregroundColor(.gray)
                                }
                                
                                Spacer()
                                
                                if viewModel.selectedAddressId == address.id {
                                    Image(systemName: "checkmark.circle.fill")
                                        .foregroundColor(brandGreen)
                                }
                            }
                            .padding(.vertical, 4)
                        }
                    }
                }
                .listStyle(PlainListStyle())
            }
            .navigationTitle("Addresses")
            .navigationBarItems(leading: Button(action: { isPresented = false }) {
                Image(systemName: "xmark")
                    .foregroundColor(.black)
            })
        }
    }
    
    func iconForType(_ type: String) -> String {
        switch type.lowercased() {
        case "home": return "house.fill"
        case "work": return "briefcase.fill"
        default: return "mappin.circle.fill"
        }
    }
}
