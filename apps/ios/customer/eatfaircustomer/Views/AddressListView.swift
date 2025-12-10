import SwiftUI
import CoreLocation
import EatFairShared

struct AddressListView: View {
    @StateObject var viewModel = AddressViewModel()
    @State private var showingAddAddress = false

    var body: some View {
        List {
            if viewModel.isLoading {
                HStack {
                    Spacer()
                    ProgressView("Loading addresses...")
                    Spacer()
                }
                .padding()
            }

            if viewModel.addresses.isEmpty && !viewModel.isLoading {
                VStack(spacing: 16) {
                    Image(systemName: "mappin.slash")
                        .font(.system(size: 50))
                        .foregroundColor(.gray)
                    Text("No saved addresses")
                        .font(.headline)
                    Text("Add an address to get started")
                        .font(.subheadline)
                        .foregroundColor(.gray)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 40)
            }

            ForEach(viewModel.addresses) { address in
                Button(action: {
                    viewModel.selectedAddressId = address.id
                }) {
                    HStack {
                        VStack(alignment: .leading) {
                            HStack {
                                Image(systemName: iconForType(address.type))
                                    .foregroundColor(Theme.brandOrange)
                                Text(address.locationName)
                                    .font(.headline)
                                    .foregroundColor(.primary)
                                if address.isDefault {
                                    Text("Default")
                                        .font(.caption)
                                        .padding(4)
                                        .background(Color.green.opacity(0.2))
                                        .foregroundColor(.green)
                                        .cornerRadius(4)
                                }
                            }
                            Text("\(address.street), \(address.city), \(address.state) \(address.zipCode)")
                                .font(.subheadline)
                                .foregroundColor(.gray)
                        }
                        Spacer()
                        if viewModel.selectedAddressId == address.id {
                            Image(systemName: "checkmark.circle.fill")
                                .foregroundColor(Theme.brandGreen)
                        }
                    }
                }
                .padding(.vertical, 4)
                .contextMenu {
                    // Set as default option
                    if !address.isDefault {
                        Button {
                            viewModel.setDefaultAddress(address)
                        } label: {
                            Label("Set as Default", systemImage: "star.fill")
                        }
                    }

                    // Delete option
                    Button(role: .destructive) {
                        viewModel.deleteAddress(address: address)
                    } label: {
                        Label("Delete", systemImage: "trash")
                    }
                }
                .swipeActions(edge: .leading, allowsFullSwipe: true) {
                    if !address.isDefault {
                        Button {
                            viewModel.setDefaultAddress(address)
                        } label: {
                            Label("Default", systemImage: "star.fill")
                        }
                        .tint(.orange)
                    }
                }
                .swipeActions(edge: .trailing, allowsFullSwipe: false) {
                    Button(role: .destructive) {
                        viewModel.deleteAddress(address: address)
                    } label: {
                        Label("Delete", systemImage: "trash")
                    }
                }
            }
        }
        .navigationTitle("Saved Addresses")
        .toolbar {
            Button(action: { showingAddAddress = true }) {
                Image(systemName: "plus")
            }
        }
        .sheet(isPresented: $showingAddAddress) {
            AddAddressView(viewModel: viewModel)
        }
    }
    
    func deleteAddress(at offsets: IndexSet) {
        offsets.forEach { index in
            let address = viewModel.addresses[index]
            viewModel.deleteAddress(address: address)
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

struct AddAddressView: View {
    @ObservedObject var viewModel: AddressViewModel
    @Environment(\.presentationMode) var presentationMode
    
    @State private var locationName = "Home"
    @State private var street = ""
    @State private var unit = ""
    @State private var city = ""
    @State private var state = ""
    @State private var zipCode = ""
    @State private var instructions = ""
    @State private var phoneNumber = ""
    @State private var isDefault = false
    
    // Geocoded coordinates
    @State private var latitude: Double = 0.0
    @State private var longitude: Double = 0.0
    
    @State private var showAddressSearch = false
    
    var body: some View {
        NavigationView {
            Form {
                Section(header: Text("Address Details")) {
                    Button(action: { showAddressSearch = true }) {
                        HStack {
                            Image(systemName: "magnifyingglass")
                            Text("Search Address (Auto-fill)")
                                .fontWeight(.medium)
                        }
                        .foregroundColor(Theme.brandOrange)
                    }
                    
                    Picker("Label", selection: $locationName) {
                        Text("Home").tag("Home")
                        Text("Work").tag("Work")
                        Text("Other").tag("Other")
                    }
                    .pickerStyle(SegmentedPickerStyle())
                    
                    TextField("Street Address", text: $street)
                    TextField("Apt / Suite / Unit", text: $unit)
                    TextField("City", text: $city)
                    HStack {
                        TextField("State", text: $state)
                        TextField("Zip Code", text: $zipCode)
                            .keyboardType(.numberPad)
                    }
                }
                
                Section(header: Text("Contact Info")) {
                    TextField("Phone Number", text: $phoneNumber)
                        .keyboardType(.phonePad)
                }
                
                Section(header: Text("Delivery Instructions")) {
                    TextField("Gate code, leave at door, etc.", text: $instructions)
                }
                
                Section {
                    Toggle("Set as Default Address", isOn: $isDefault)
                }
                
                Button(action: saveAddress) {
                    if viewModel.isLoading {
                        ProgressView()
                    } else {
                        Text("Save Address")
                            .frame(maxWidth: .infinity)
                            .foregroundColor(Theme.brandGreen)
                    }
                }
                .disabled(street.isEmpty || city.isEmpty || state.isEmpty || zipCode.isEmpty)
            }
            .navigationTitle("Add New Address")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        presentationMode.wrappedValue.dismiss()
                    }
                }
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
    
    func saveAddress() {
        let newAddress = Address(
            userId: "", // Set in ViewModel
            locationName: locationName,
            street: street,
            unit: unit,
            city: city,
            state: state,
            zipCode: zipCode,
            instructions: instructions,
            type: locationName, // Use locationName as type
            latitude: latitude,
            longitude: longitude,
            phoneNumber: phoneNumber,
            isDefault: isDefault
        )
        
        viewModel.addAddress(address: newAddress) { success in
            if success {
                presentationMode.wrappedValue.dismiss()
            }
        }
    }
}
