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
    @State private var isAddingAddress = false

    var body: some View {
        NavigationView {
            VStack(alignment: .leading, spacing: 0) {
                // Search Bar Entry
                Button(action: { showAddressSearch = true }) {
                    HStack {
                        Image(systemName: "magnifyingglass")
                            .foregroundColor(.black)
                        Text("Search for an address")
                            .foregroundColor(.gray)
                        Spacer()
                        Image(systemName: "chevron.right")
                            .foregroundColor(.gray)
                            .font(.caption)
                    }
                    .padding()
                    .background(Color(.systemGray6))
                    .cornerRadius(8)
                }
                .padding()
                .sheet(isPresented: $showAddressSearch) {
                    AddressSearchView { street, city, state, zip, coordinate in
                        isAddingAddress = true
                        let newAddress = Address(
                            userId: "",
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
                            isAddingAddress = false
                            if success {
                                isPresented = false
                            }
                        }
                    }
                }

                HStack {
                    Text("Saved addresses")
                        .font(.headline)
                    Spacer()
                    if viewModel.isLoading || isAddingAddress {
                        ProgressView()
                            .scaleEffect(0.8)
                    }
                }
                .padding(.horizontal)
                .padding(.bottom, 8)

                if viewModel.addresses.isEmpty && !viewModel.isLoading {
                    VStack(spacing: 16) {
                        Image(systemName: "mappin.slash")
                            .font(.system(size: 40))
                            .foregroundColor(.gray)
                        Text("No saved addresses")
                            .font(.subheadline)
                            .foregroundColor(.gray)
                        Text("Search above to add your first address")
                            .font(.caption)
                            .foregroundColor(.gray)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .padding()
                } else {
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

                                    VStack(alignment: .leading, spacing: 4) {
                                        HStack {
                                            Text(address.locationName)
                                                .font(.headline)
                                                .foregroundColor(.primary)
                                            if address.isDefault {
                                                Text("Default")
                                                    .font(.caption2)
                                                    .padding(.horizontal, 6)
                                                    .padding(.vertical, 2)
                                                    .background(brandGreen.opacity(0.2))
                                                    .foregroundColor(brandGreen)
                                                    .cornerRadius(4)
                                            }
                                        }
                                        Text("\(address.street), \(address.city)")
                                            .font(.subheadline)
                                            .foregroundColor(.gray)
                                            .lineLimit(1)
                                    }

                                    Spacer()

                                    if viewModel.selectedAddressId == address.id {
                                        Image(systemName: "checkmark.circle.fill")
                                            .foregroundColor(brandGreen)
                                            .font(.title2)
                                    }
                                }
                                .padding(.vertical, 8)
                            }
                        }
                    }
                    .listStyle(PlainListStyle())
                }
            }
            .navigationTitle("Deliver to")
            .navigationBarTitleDisplayMode(.inline)
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
