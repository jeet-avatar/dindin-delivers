import SwiftUI
import MapKit
import Combine

class AddressSearchViewModel: NSObject, ObservableObject, MKLocalSearchCompleterDelegate {
    @Published var searchQuery = ""
    @Published var results: [MKLocalSearchCompletion] = []
    @Published var selectedLocation: CLLocationCoordinate2D?
    @Published var isLoading = false
    
    private var completer: MKLocalSearchCompleter
    private var cancellable: AnyCancellable?
    
    override init() {
        completer = MKLocalSearchCompleter()
        super.init()
        completer.delegate = self
        completer.resultTypes = .address

        cancellable = $searchQuery
            .debounce(for: .milliseconds(300), scheduler: RunLoop.main)
            .sink { [weak self] query in
                if query.isEmpty {
                    self?.results = []
                } else {
                    self?.completer.queryFragment = query
                }
            }
    }

    deinit {
        cancellable?.cancel()
    }
    
    func completerDidUpdateResults(_ completer: MKLocalSearchCompleter) {
        self.results = completer.results
    }
    
    func completer(_ completer: MKLocalSearchCompleter, didFailWithError error: Error) {
        print("Address search failed: \(error.localizedDescription)")
    }
    
    func selectAddress(_ completion: MKLocalSearchCompletion, completionHandler: @escaping (String, String, String, String, CLLocationCoordinate2D?) -> Void) {
        let searchRequest = MKLocalSearch.Request(completion: completion)
        let search = MKLocalSearch(request: searchRequest)
        
        isLoading = true
        search.start { [weak self] response, error in
            self?.isLoading = false
            guard let item = response?.mapItems.first else { return }
            
            self?.selectedLocation = item.placemark.coordinate
            
            // Extract address components
            let placemark = item.placemark
            let street = [placemark.subThoroughfare, placemark.thoroughfare].compactMap { $0 }.joined(separator: " ")
            let city = placemark.locality ?? ""
            let state = placemark.administrativeArea ?? ""
            let zip = placemark.postalCode ?? ""
            
            completionHandler(street, city, state, zip, item.placemark.coordinate)
        }
    }
}
