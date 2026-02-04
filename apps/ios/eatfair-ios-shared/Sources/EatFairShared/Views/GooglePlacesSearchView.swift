import SwiftUI
import CoreLocation
import os
#if canImport(UIKit)
import UIKit
#endif

private let placesLogger = Logger(subsystem: "ai.dollor.shared", category: "GooglePlacesSearch")

/// Google Places Address Search View
/// Provides address autocomplete using Google Places API
/// Use this for production-ready address search with better accuracy than Apple MapKit
public struct GooglePlacesSearchView: View {
    @StateObject private var viewModel = GooglePlacesSearchViewModel()
    @Environment(\.presentationMode) var presentationMode

    /// Callback when address is selected
    /// Parameters: street, city, state, zip, coordinate
    public var onAddressSelected: (String, String, String, String, CLLocationCoordinate2D?) -> Void

    /// Optional: Current user location for better results
    public var currentLocation: CLLocationCoordinate2D?

    public init(
        currentLocation: CLLocationCoordinate2D? = nil,
        onAddressSelected: @escaping (String, String, String, String, CLLocationCoordinate2D?) -> Void
    ) {
        self.currentLocation = currentLocation
        self.onAddressSelected = onAddressSelected
    }

    public var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                // Search Bar
                HStack {
                    Image(systemName: "magnifyingglass")
                        .foregroundColor(.gray)
                    TextField("Search for your address", text: $viewModel.searchQuery)
                        .autocapitalization(.words)
                        .disableAutocorrection(true)
                        .onChange(of: viewModel.searchQuery) { newValue in
                            viewModel.search(query: newValue, near: currentLocation)
                        }

                    if !viewModel.searchQuery.isEmpty {
                        Button(action: { viewModel.searchQuery = "" }) {
                            Image(systemName: "xmark.circle.fill")
                                .foregroundColor(.gray)
                        }
                    }
                }
                .padding()
                .background(Color.gray.opacity(0.15))
                .cornerRadius(10)
                .padding()

                if viewModel.isLoading {
                    ProgressView()
                        .padding()
                }

                if let error = viewModel.error {
                    Text(error)
                        .font(.caption)
                        .foregroundColor(.red)
                        .padding()
                }

                // Results List
                List(viewModel.predictions) { prediction in
                    Button(action: {
                        selectPrediction(prediction)
                    }) {
                        VStack(alignment: .leading, spacing: 4) {
                            Text(prediction.mainText)
                                .font(.headline)
                            Text(prediction.secondaryText)
                                .font(.subheadline)
                                .foregroundColor(.gray)
                        }
                    }
                }
                .listStyle(PlainListStyle())

                // Powered by Google attribution (required by Google)
                HStack {
                    Spacer()
                    Text("Powered by Google")
                        .font(.caption2)
                        .foregroundColor(.gray)
                    Spacer()
                }
                .padding(.bottom, 8)
            }
            .navigationTitle("Search Address")
            .navigationBarItems(trailing: Button("Cancel") {
                presentationMode.wrappedValue.dismiss()
            })
        }
    }

    private func selectPrediction(_ prediction: GooglePlacePrediction) {
        viewModel.getPlaceDetails(placeId: prediction.placeId) { result in
            switch result {
            case .success(let detail):
                onAddressSelected(
                    detail.street,
                    detail.city,
                    detail.state,
                    detail.zip,
                    detail.coordinate
                )
                presentationMode.wrappedValue.dismiss()
            case .failure(let error):
                viewModel.error = error.localizedDescription
            }
        }
    }
}

/// ViewModel for Google Places Search
public class GooglePlacesSearchViewModel: ObservableObject {
    @Published public var searchQuery = ""
    @Published public var predictions: [GooglePlacePrediction] = []
    @Published public var isLoading = false
    @Published public var error: String?

    private let mapsService = GoogleMapsService.shared
    private var searchTask: DispatchWorkItem?

    public init() {}

    /// Search for addresses with debouncing
    public func search(query: String, near location: CLLocationCoordinate2D? = nil) {
        // Cancel previous search
        searchTask?.cancel()

        guard !query.isEmpty, query.count >= 3 else {
            predictions = []
            return
        }

        // Debounce by 300ms
        let task = DispatchWorkItem { [weak self] in
            self?.performSearch(query: query, near: location)
        }
        searchTask = task
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.3, execute: task)
    }

    private func performSearch(query: String, near location: CLLocationCoordinate2D?) {
        isLoading = true
        error = nil

        mapsService.getPlaceAutocomplete(input: query, location: location) { [weak self] result in
            self?.isLoading = false

            switch result {
            case .success(let predictions):
                self?.predictions = predictions
            case .failure(let err):
                self?.error = err.localizedDescription
                self?.predictions = []
            }
        }
    }

    /// Get full place details from place ID
    public func getPlaceDetails(placeId: String, completion: @escaping (Result<GooglePlaceDetail, Error>) -> Void) {
        isLoading = true

        mapsService.getPlaceDetails(placeId: placeId) { [weak self] result in
            self?.isLoading = false
            completion(result)
        }
    }
}

// MARK: - Preview

#if DEBUG
struct GooglePlacesSearchView_Previews: PreviewProvider {
    static var previews: some View {
        GooglePlacesSearchView { street, city, state, zip, coordinate in
            placesLogger.debug("Selected: \(street), \(city), \(state) \(zip)")
        }
    }
}
#endif
