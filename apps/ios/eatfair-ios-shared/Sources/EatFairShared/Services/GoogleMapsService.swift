import Foundation
import CoreLocation
import Combine

/// Google Maps Service for EatFair
/// Provides directions, distance matrix, geocoding, and places autocomplete
/// This service uses Google Maps REST APIs - the SDK initialization happens in each app
public class GoogleMapsService: ObservableObject {
    public static let shared = GoogleMapsService()

    @Published public var isLoading = false
    @Published public var error: String?

    private let apiKey = GoogleMapsConfig.currentKey
    private let baseURL = "https://maps.googleapis.com/maps/api"

    private init() {}

    // MARK: - Directions API

    /// Get driving directions between two points
    public func getDirections(
        origin: CLLocationCoordinate2D,
        destination: CLLocationCoordinate2D,
        completion: @escaping (Result<GoogleDirectionsResult, Error>) -> Void
    ) {
        let originStr = "\(origin.latitude),\(origin.longitude)"
        let destStr = "\(destination.latitude),\(destination.longitude)"

        guard let url = URL(string: "\(baseURL)/directions/json?origin=\(originStr)&destination=\(destStr)&mode=driving&departure_time=now&traffic_model=best_guess&key=\(apiKey)") else {
            completion(.failure(GoogleMapsError.invalidURL))
            return
        }

        isLoading = true

        URLSession.shared.dataTask(with: url) { [weak self] data, response, error in
            DispatchQueue.main.async {
                self?.isLoading = false

                if let error = error {
                    completion(.failure(error))
                    return
                }

                // Validate HTTP status code
                if let httpResponse = response as? HTTPURLResponse {
                    guard (200...299).contains(httpResponse.statusCode) else {
                        completion(.failure(GoogleMapsError.httpError(httpResponse.statusCode)))
                        return
                    }
                }

                guard let data = data else {
                    completion(.failure(GoogleMapsError.noData))
                    return
                }

                do {
                    let result = try JSONDecoder().decode(GoogleDirectionsResponse.self, from: data)
                    if result.status == "OK", let route = result.routes.first {
                        completion(.success(GoogleDirectionsResult(
                            distanceMeters: route.legs.first?.distance.value ?? 0,
                            distanceText: route.legs.first?.distance.text ?? "",
                            durationSeconds: route.legs.first?.duration.value ?? 0,
                            durationText: route.legs.first?.duration.text ?? "",
                            durationInTrafficSeconds: route.legs.first?.durationInTraffic?.value,
                            durationInTrafficText: route.legs.first?.durationInTraffic?.text,
                            polyline: route.overviewPolyline.points,
                            steps: route.legs.first?.steps.map { step in
                                GoogleDirectionStep(
                                    instruction: step.htmlInstructions,
                                    distanceText: step.distance.text,
                                    durationText: step.duration.text,
                                    startLocation: CLLocationCoordinate2D(latitude: step.startLocation.lat, longitude: step.startLocation.lng),
                                    endLocation: CLLocationCoordinate2D(latitude: step.endLocation.lat, longitude: step.endLocation.lng)
                                )
                            } ?? []
                        )))
                    } else {
                        completion(.failure(GoogleMapsError.apiError(result.status)))
                    }
                } catch {
                    completion(.failure(error))
                }
            }
        }.resume()
    }

    // MARK: - Distance Matrix API

    /// Calculate distances and ETAs for multiple origins/destinations
    public func getDistanceMatrix(
        origins: [CLLocationCoordinate2D],
        destinations: [CLLocationCoordinate2D],
        completion: @escaping (Result<[[GoogleDistanceMatrixElement]], Error>) -> Void
    ) {
        let originsStr = origins.map { "\($0.latitude),\($0.longitude)" }.joined(separator: "|")
        let destsStr = destinations.map { "\($0.latitude),\($0.longitude)" }.joined(separator: "|")

        guard let url = URL(string: "\(baseURL)/distancematrix/json?origins=\(originsStr)&destinations=\(destsStr)&mode=driving&departure_time=now&traffic_model=best_guess&key=\(apiKey)".addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? "") else {
            completion(.failure(GoogleMapsError.invalidURL))
            return
        }

        URLSession.shared.dataTask(with: url) { data, response, error in
            DispatchQueue.main.async {
                if let error = error {
                    completion(.failure(error))
                    return
                }

                // Validate HTTP status code
                if let httpResponse = response as? HTTPURLResponse {
                    guard (200...299).contains(httpResponse.statusCode) else {
                        completion(.failure(GoogleMapsError.httpError(httpResponse.statusCode)))
                        return
                    }
                }

                guard let data = data else {
                    completion(.failure(GoogleMapsError.noData))
                    return
                }

                do {
                    let result = try JSONDecoder().decode(GoogleDistanceMatrixResponse.self, from: data)
                    if result.status == "OK" {
                        let elements = result.rows.map { row in
                            row.elements.map { element in
                                GoogleDistanceMatrixElement(
                                    distanceMeters: element.distance?.value ?? 0,
                                    distanceText: element.distance?.text ?? "",
                                    durationSeconds: element.duration?.value ?? 0,
                                    durationText: element.duration?.text ?? "",
                                    durationInTrafficSeconds: element.durationInTraffic?.value,
                                    durationInTrafficText: element.durationInTraffic?.text,
                                    status: element.status
                                )
                            }
                        }
                        completion(.success(elements))
                    } else {
                        completion(.failure(GoogleMapsError.apiError(result.status)))
                    }
                } catch {
                    completion(.failure(error))
                }
            }
        }.resume()
    }

    // MARK: - Geocoding API

    /// Convert address to coordinates
    public func geocodeAddress(
        address: String,
        completion: @escaping (Result<GoogleGeocodingResult, Error>) -> Void
    ) {
        guard let encodedAddress = address.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed),
              let url = URL(string: "\(baseURL)/geocode/json?address=\(encodedAddress)&key=\(apiKey)") else {
            completion(.failure(GoogleMapsError.invalidURL))
            return
        }

        URLSession.shared.dataTask(with: url) { data, response, error in
            DispatchQueue.main.async {
                if let error = error {
                    completion(.failure(error))
                    return
                }

                // Validate HTTP status code
                if let httpResponse = response as? HTTPURLResponse {
                    guard (200...299).contains(httpResponse.statusCode) else {
                        completion(.failure(GoogleMapsError.httpError(httpResponse.statusCode)))
                        return
                    }
                }

                guard let data = data else {
                    completion(.failure(GoogleMapsError.noData))
                    return
                }

                do {
                    let result = try JSONDecoder().decode(GoogleGeocodingResponse.self, from: data)
                    if result.status == "OK", let firstResult = result.results.first {
                        completion(.success(GoogleGeocodingResult(
                            formattedAddress: firstResult.formattedAddress,
                            coordinate: CLLocationCoordinate2D(
                                latitude: firstResult.geometry.location.lat,
                                longitude: firstResult.geometry.location.lng
                            ),
                            placeId: firstResult.placeId
                        )))
                    } else {
                        completion(.failure(GoogleMapsError.apiError(result.status)))
                    }
                } catch {
                    completion(.failure(error))
                }
            }
        }.resume()
    }

    /// Convert coordinates to address (reverse geocoding)
    public func reverseGeocode(
        coordinate: CLLocationCoordinate2D,
        completion: @escaping (Result<GoogleGeocodingResult, Error>) -> Void
    ) {
        guard let url = URL(string: "\(baseURL)/geocode/json?latlng=\(coordinate.latitude),\(coordinate.longitude)&key=\(apiKey)") else {
            completion(.failure(GoogleMapsError.invalidURL))
            return
        }

        URLSession.shared.dataTask(with: url) { data, response, error in
            DispatchQueue.main.async {
                if let error = error {
                    completion(.failure(error))
                    return
                }

                // Validate HTTP status code
                if let httpResponse = response as? HTTPURLResponse {
                    guard (200...299).contains(httpResponse.statusCode) else {
                        completion(.failure(GoogleMapsError.httpError(httpResponse.statusCode)))
                        return
                    }
                }

                guard let data = data else {
                    completion(.failure(GoogleMapsError.noData))
                    return
                }

                do {
                    let result = try JSONDecoder().decode(GoogleGeocodingResponse.self, from: data)
                    if result.status == "OK", let firstResult = result.results.first {
                        completion(.success(GoogleGeocodingResult(
                            formattedAddress: firstResult.formattedAddress,
                            coordinate: coordinate,
                            placeId: firstResult.placeId
                        )))
                    } else {
                        completion(.failure(GoogleMapsError.apiError(result.status)))
                    }
                } catch {
                    completion(.failure(error))
                }
            }
        }.resume()
    }

    // MARK: - Places Autocomplete API

    /// Get address suggestions as user types
    public func getPlaceAutocomplete(
        input: String,
        location: CLLocationCoordinate2D? = nil,
        radius: Int = 50000, // 50km default
        completion: @escaping (Result<[GooglePlacePrediction], Error>) -> Void
    ) {
        guard let encodedInput = input.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) else {
            completion(.failure(GoogleMapsError.invalidURL))
            return
        }

        var urlString = "\(baseURL)/place/autocomplete/json?input=\(encodedInput)&types=address&key=\(apiKey)"

        if let location = location {
            urlString += "&location=\(location.latitude),\(location.longitude)&radius=\(radius)"
        }

        guard let url = URL(string: urlString) else {
            completion(.failure(GoogleMapsError.invalidURL))
            return
        }

        URLSession.shared.dataTask(with: url) { data, response, error in
            DispatchQueue.main.async {
                if let error = error {
                    completion(.failure(error))
                    return
                }

                // Validate HTTP status code
                if let httpResponse = response as? HTTPURLResponse {
                    guard (200...299).contains(httpResponse.statusCode) else {
                        completion(.failure(GoogleMapsError.httpError(httpResponse.statusCode)))
                        return
                    }
                }

                guard let data = data else {
                    completion(.failure(GoogleMapsError.noData))
                    return
                }

                do {
                    let result = try JSONDecoder().decode(GooglePlacesAutocompleteResponse.self, from: data)
                    if result.status == "OK" || result.status == "ZERO_RESULTS" {
                        let predictions = result.predictions.map { prediction in
                            GooglePlacePrediction(
                                placeId: prediction.placeId,
                                description: prediction.description,
                                mainText: prediction.structuredFormatting.mainText,
                                secondaryText: prediction.structuredFormatting.secondaryText ?? ""
                            )
                        }
                        completion(.success(predictions))
                    } else {
                        completion(.failure(GoogleMapsError.apiError(result.status)))
                    }
                } catch {
                    completion(.failure(error))
                }
            }
        }.resume()
    }

    /// Get place details from place ID
    public func getPlaceDetails(
        placeId: String,
        completion: @escaping (Result<GooglePlaceDetail, Error>) -> Void
    ) {
        guard let url = URL(string: "\(baseURL)/place/details/json?place_id=\(placeId)&fields=formatted_address,geometry,address_components,name&key=\(apiKey)") else {
            completion(.failure(GoogleMapsError.invalidURL))
            return
        }

        URLSession.shared.dataTask(with: url) { data, response, error in
            DispatchQueue.main.async {
                if let error = error {
                    completion(.failure(error))
                    return
                }

                // Validate HTTP status code
                if let httpResponse = response as? HTTPURLResponse {
                    guard (200...299).contains(httpResponse.statusCode) else {
                        completion(.failure(GoogleMapsError.httpError(httpResponse.statusCode)))
                        return
                    }
                }

                guard let data = data else {
                    completion(.failure(GoogleMapsError.noData))
                    return
                }

                do {
                    let result = try JSONDecoder().decode(GooglePlaceDetailsResponse.self, from: data)
                    if result.status == "OK", let place = result.result {
                        // Parse address components
                        var street = ""
                        var city = ""
                        var state = ""
                        var zip = ""
                        var country = ""

                        for component in place.addressComponents ?? [] {
                            if component.types.contains("street_number") {
                                street = component.longName + " "
                            }
                            if component.types.contains("route") {
                                street += component.longName
                            }
                            if component.types.contains("locality") {
                                city = component.longName
                            }
                            if component.types.contains("administrative_area_level_1") {
                                state = component.shortName
                            }
                            if component.types.contains("postal_code") {
                                zip = component.longName
                            }
                            if component.types.contains("country") {
                                country = component.shortName
                            }
                        }

                        completion(.success(GooglePlaceDetail(
                            placeId: placeId,
                            formattedAddress: place.formattedAddress ?? "",
                            name: place.name,
                            coordinate: CLLocationCoordinate2D(
                                latitude: place.geometry?.location.lat ?? 0,
                                longitude: place.geometry?.location.lng ?? 0
                            ),
                            street: street.trimmingCharacters(in: .whitespaces),
                            city: city,
                            state: state,
                            zip: zip,
                            country: country
                        )))
                    } else {
                        completion(.failure(GoogleMapsError.apiError(result.status)))
                    }
                } catch {
                    completion(.failure(error))
                }
            }
        }.resume()
    }

    // MARK: - Utility

    /// Calculate ETA with traffic
    public func calculateETA(
        from origin: CLLocationCoordinate2D,
        to destination: CLLocationCoordinate2D,
        completion: @escaping (Result<(eta: TimeInterval, etaText: String), Error>) -> Void
    ) {
        getDirections(origin: origin, destination: destination) { result in
            switch result {
            case .success(let directions):
                let etaSeconds = TimeInterval(directions.durationInTrafficSeconds ?? directions.durationSeconds)
                let etaText = directions.durationInTrafficText ?? directions.durationText
                completion(.success((etaSeconds, etaText)))
            case .failure(let error):
                completion(.failure(error))
            }
        }
    }
}

// MARK: - Error Types

public enum GoogleMapsError: Error, LocalizedError {
    case invalidURL
    case noData
    case httpError(Int)
    case apiError(String)

    public var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "Invalid URL"
        case .noData:
            return "No data received"
        case .httpError(let statusCode):
            return "HTTP error: \(statusCode)"
        case .apiError(let status):
            return "Google Maps API error: \(status)"
        }
    }
}

// MARK: - Result Models

public struct GoogleDirectionsResult {
    public let distanceMeters: Int
    public let distanceText: String
    public let durationSeconds: Int
    public let durationText: String
    public let durationInTrafficSeconds: Int?
    public let durationInTrafficText: String?
    public let polyline: String
    public let steps: [GoogleDirectionStep]
}

public struct GoogleDirectionStep {
    public let instruction: String
    public let distanceText: String
    public let durationText: String
    public let startLocation: CLLocationCoordinate2D
    public let endLocation: CLLocationCoordinate2D
}

public struct GoogleDistanceMatrixElement {
    public let distanceMeters: Int
    public let distanceText: String
    public let durationSeconds: Int
    public let durationText: String
    public let durationInTrafficSeconds: Int?
    public let durationInTrafficText: String?
    public let status: String
}

public struct GoogleGeocodingResult {
    public let formattedAddress: String
    public let coordinate: CLLocationCoordinate2D
    public let placeId: String
}

public struct GooglePlacePrediction: Identifiable {
    public let placeId: String
    public let description: String
    public let mainText: String
    public let secondaryText: String

    public var id: String { placeId }
}

public struct GooglePlaceDetail {
    public let placeId: String
    public let formattedAddress: String
    public let name: String?
    public let coordinate: CLLocationCoordinate2D
    public let street: String
    public let city: String
    public let state: String
    public let zip: String
    public let country: String
}

// MARK: - API Response Models (Private)

private struct GoogleDirectionsResponse: Codable {
    let status: String
    let routes: [GoogleRoute]
}

private struct GoogleRoute: Codable {
    let legs: [GoogleLeg]
    let overviewPolyline: GooglePolyline

    enum CodingKeys: String, CodingKey {
        case legs
        case overviewPolyline = "overview_polyline"
    }
}

private struct GoogleLeg: Codable {
    let distance: GoogleTextValue
    let duration: GoogleTextValue
    let durationInTraffic: GoogleTextValue?
    let steps: [GoogleStep]

    enum CodingKeys: String, CodingKey {
        case distance, duration, steps
        case durationInTraffic = "duration_in_traffic"
    }
}

private struct GoogleStep: Codable {
    let htmlInstructions: String
    let distance: GoogleTextValue
    let duration: GoogleTextValue
    let startLocation: GoogleLatLng
    let endLocation: GoogleLatLng

    enum CodingKeys: String, CodingKey {
        case distance, duration
        case htmlInstructions = "html_instructions"
        case startLocation = "start_location"
        case endLocation = "end_location"
    }
}

private struct GooglePolyline: Codable {
    let points: String
}

private struct GoogleTextValue: Codable {
    let text: String
    let value: Int
}

private struct GoogleLatLng: Codable {
    let lat: Double
    let lng: Double
}

private struct GoogleDistanceMatrixResponse: Codable {
    let status: String
    let rows: [GoogleDistanceMatrixRow]
}

private struct GoogleDistanceMatrixRow: Codable {
    let elements: [GoogleDistanceMatrixElementResponse]
}

private struct GoogleDistanceMatrixElementResponse: Codable {
    let status: String
    let distance: GoogleTextValue?
    let duration: GoogleTextValue?
    let durationInTraffic: GoogleTextValue?

    enum CodingKeys: String, CodingKey {
        case status, distance, duration
        case durationInTraffic = "duration_in_traffic"
    }
}

private struct GoogleGeocodingResponse: Codable {
    let status: String
    let results: [GoogleGeocodingResultResponse]
}

private struct GoogleGeocodingResultResponse: Codable {
    let formattedAddress: String
    let geometry: GoogleGeometry
    let placeId: String

    enum CodingKeys: String, CodingKey {
        case geometry
        case formattedAddress = "formatted_address"
        case placeId = "place_id"
    }
}

private struct GoogleGeometry: Codable {
    let location: GoogleLatLng
}

private struct GooglePlacesAutocompleteResponse: Codable {
    let status: String
    let predictions: [GooglePrediction]
}

private struct GooglePrediction: Codable {
    let placeId: String
    let description: String
    let structuredFormatting: GoogleStructuredFormatting

    enum CodingKeys: String, CodingKey {
        case description
        case placeId = "place_id"
        case structuredFormatting = "structured_formatting"
    }
}

private struct GoogleStructuredFormatting: Codable {
    let mainText: String
    let secondaryText: String?

    enum CodingKeys: String, CodingKey {
        case mainText = "main_text"
        case secondaryText = "secondary_text"
    }
}

private struct GooglePlaceDetailsResponse: Codable {
    let status: String
    let result: GooglePlaceResult?
}

private struct GooglePlaceResult: Codable {
    let formattedAddress: String?
    let name: String?
    let geometry: GoogleGeometry?
    let addressComponents: [GoogleAddressComponent]?

    enum CodingKeys: String, CodingKey {
        case name, geometry
        case formattedAddress = "formatted_address"
        case addressComponents = "address_components"
    }
}

private struct GoogleAddressComponent: Codable {
    let longName: String
    let shortName: String
    let types: [String]

    enum CodingKeys: String, CodingKey {
        case types
        case longName = "long_name"
        case shortName = "short_name"
    }
}
