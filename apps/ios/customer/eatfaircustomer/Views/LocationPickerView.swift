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

    // Prefill state for AddAddressView
    @State private var showAddAddressWithPrefill = false
    @State private var prefillStreet = ""
    @State private var prefillCity = ""
    @State private var prefillState = ""
    @State private var prefillZip = ""
    @State private var prefillLatitude: Double = 0.0
    @State private var prefillLongitude: Double = 0.0

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
                        // Show the AddAddressView with pre-filled values so user can review/edit
                        showAddAddressWithPrefill = true
                        prefillStreet = street
                        prefillCity = city
                        prefillState = state
                        prefillZip = zip
                        prefillLatitude = coordinate?.latitude ?? 0.0
                        prefillLongitude = coordinate?.longitude ?? 0.0
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
            .sheet(isPresented: $showAddAddressWithPrefill) {
                AddAddressWithPrefillView(
                    viewModel: viewModel,
                    street: prefillStreet,
                    city: prefillCity,
                    state: prefillState,
                    zipCode: prefillZip,
                    latitude: prefillLatitude,
                    longitude: prefillLongitude,
                    onSaved: {
                        showAddAddressWithPrefill = false
                        isPresented = false
                    }
                )
            }
        }
        .onAppear {
            viewModel.fetchAddresses()
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

// MARK: - Add Address With Prefill View
/// Shows address form with pre-filled values from search, allowing user to review and edit
struct AddAddressWithPrefillView: View {
    @ObservedObject var viewModel: AddressViewModel
    @Environment(\.dismiss) var dismiss

    // Pre-filled values
    let initialStreet: String
    let initialCity: String
    let initialState: String
    let initialZipCode: String
    let initialLatitude: Double
    let initialLongitude: Double
    let onSaved: () -> Void

    // Editable state
    @State private var locationName = "Home"
    @State private var street: String
    @State private var unit = ""
    @State private var city: String
    @State private var state: String
    @State private var zipCode: String
    @State private var instructions = ""
    @State private var phoneNumber = ""
    @State private var isDefault = false
    @State private var latitude: Double
    @State private var longitude: Double

    init(viewModel: AddressViewModel, street: String, city: String, state: String, zipCode: String, latitude: Double, longitude: Double, onSaved: @escaping () -> Void) {
        self.viewModel = viewModel
        self.initialStreet = street
        self.initialCity = city
        self.initialState = state
        self.initialZipCode = zipCode
        self.initialLatitude = latitude
        self.initialLongitude = longitude
        self.onSaved = onSaved

        // Initialize state with prefilled values
        _street = State(initialValue: street)
        _city = State(initialValue: city)
        _state = State(initialValue: state)
        _zipCode = State(initialValue: zipCode)
        _latitude = State(initialValue: latitude)
        _longitude = State(initialValue: longitude)
    }

    var body: some View {
        NavigationView {
            Form {
                Section(header: Text("Review & Edit Address")) {
                    Text("Please verify the address details below")
                        .font(.caption)
                        .foregroundColor(.secondary)

                    Picker("Label", selection: $locationName) {
                        Text("Home").tag("Home")
                        Text("Work").tag("Work")
                        Text("Other").tag("Other")
                    }
                    .pickerStyle(SegmentedPickerStyle())
                }

                Section(header: Text("Street Address")) {
                    TextField("Street Address", text: $street)
                        .textContentType(.streetAddressLine1)
                    TextField("Apt / Suite / Unit (Optional)", text: $unit)
                        .textContentType(.streetAddressLine2)
                }

                Section(header: Text("City, State & Zip")) {
                    TextField("City", text: $city)
                        .textContentType(.addressCity)
                    HStack {
                        TextField("State", text: $state)
                            .textContentType(.addressState)
                        TextField("Zip Code", text: $zipCode)
                            .textContentType(.postalCode)
                            .keyboardType(.numberPad)
                    }
                }

                Section(header: Text("Contact Info (Optional)")) {
                    TextField("Phone Number", text: $phoneNumber)
                        .textContentType(.telephoneNumber)
                        .keyboardType(.phonePad)
                }

                Section(header: Text("Delivery Instructions (Optional)")) {
                    TextField("Gate code, leave at door, etc.", text: $instructions)
                }

                Section {
                    Toggle("Set as Default Address", isOn: $isDefault)
                }

                Section {
                    Button(action: saveAddress) {
                        if viewModel.isLoading {
                            HStack {
                                Spacer()
                                ProgressView()
                                Spacer()
                            }
                        } else {
                            HStack {
                                Spacer()
                                Text("Save Address")
                                    .fontWeight(.semibold)
                                    .foregroundColor(brandGreen)
                                Spacer()
                            }
                        }
                    }
                    .disabled(street.isEmpty || city.isEmpty || state.isEmpty || zipCode.isEmpty || viewModel.isLoading)
                }
            }
            .navigationTitle("Confirm Address")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
            }
        }
    }

    private func saveAddress() {
        let newAddress = Address(
            userId: "",
            locationName: locationName,
            street: street,
            unit: unit,
            city: city,
            state: state,
            zipCode: zipCode,
            instructions: instructions,
            addressType: locationName,
            latitude: latitude,
            longitude: longitude,
            phoneNumber: phoneNumber,
            isDefault: isDefault
        )

        viewModel.addAddress(address: newAddress) { success in
            if success {
                onSaved()
            }
        }
    }
}
