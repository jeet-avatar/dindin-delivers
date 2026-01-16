import SwiftUI
import EatFairShared

struct MenuView: View {
    @StateObject private var viewModel = RestaurantMenuViewModel()
    @State private var showingAddSheet = false
    
    var body: some View {
        NavigationView {
            List {
                if viewModel.isLoading {
                    ProgressView()
                }
                
                ForEach(Array(viewModel.allItems), id: \.id) { item in
                    MenuItemRow(item: item)
                }
                .onDelete(perform: viewModel.deleteItem)
            }
            .navigationTitle("Menu")
            .toolbar {
                Button(action: { showingAddSheet = true }) {
                    Image(systemName: "plus")
                }
            }
            .sheet(isPresented: $showingAddSheet) {
                AddMenuItemView(viewModel: viewModel)
            }
            .onAppear {
                viewModel.fetchMenu()
            }
        }
    }
}

struct AddMenuItemView: View {
    @ObservedObject var viewModel: RestaurantMenuViewModel
    @Environment(\.presentationMode) var presentationMode
    
    @State private var name = ""
    @State private var description = ""
    @State private var price = ""
    @State private var selectedImage: UIImage?
    @State private var showingImagePicker = false
    @State private var isUploading = false
    
    var body: some View {
        NavigationView {
            Form {
                Section(header: Text("Details")) {
                    TextField("Name", text: $name)
                    TextField("Description", text: $description)
                    TextField("Price", text: $price)
                        .keyboardType(.decimalPad)
                }
                
                Section(header: Text("Image")) {
                    if let image = selectedImage {
                        Image(uiImage: image)
                            .resizable()
                            .scaledToFit()
                            .frame(height: 200)
                    }
                    
                    Button(action: { showingImagePicker = true }) {
                        Text(selectedImage == nil ? "Select Image" : "Change Image")
                    }
                }
                
                if isUploading {
                    Section {
                        HStack {
                            Spacer()
                            ProgressView("Uploading...")
                            Spacer()
                        }
                    }
                }
                
                Button("Add Item") {
                    if let priceValue = Double(price) {
                        isUploading = true
                        viewModel.addItem(name: name, description: description, price: priceValue, image: selectedImage)
                        
                        // Wait a bit or use completion handler (ViewModel update needed for completion)
                        // For now, dismiss after delay or assume VM handles it async
                        DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) {
                            isUploading = false
                            presentationMode.wrappedValue.dismiss()
                        }
                    }
                }
                .disabled(name.isEmpty || price.isEmpty || isUploading)
            }
            .navigationTitle("Add Menu Item")
            .sheet(isPresented: $showingImagePicker) {
                ImagePicker(image: $selectedImage)
            }
        }
    }
}

// MARK: - Menu Item Row
struct MenuItemRow: View {
    let item: EatFairShared.MenuItem

    var body: some View {
        HStack {
            VStack(alignment: .leading) {
                Text(item.name)
                    .font(.headline)
                Text(item.description)
                    .font(.caption)
                    .foregroundColor(.gray)
                Text("$\(String(format: "%.2f", item.price))")
                    .font(.subheadline)
            }

            Spacer()

            Image(systemName: item.isAvailable ? "checkmark.circle.fill" : "circle")
                .foregroundColor(item.isAvailable ? .green : .gray)
        }
    }
}
