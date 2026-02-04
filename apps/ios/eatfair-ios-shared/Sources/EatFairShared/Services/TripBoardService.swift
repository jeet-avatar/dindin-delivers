import Foundation
import os

private let logger = Logger(subsystem: "com.dollorai.shared", category: "TripBoardService")

// MARK: - Trip Board Service
/// Craigslist-style rideshare bulletin board service
/// LEGALLY SAFE: User-generated content, no fare calculation, no payment processing

/// Important Legal Notice:
/// Dollor.ai Trip Board is a CLASSIFIED ADVERTISING SERVICE, not a transportation company.
/// All listings are user-generated. Dollor.ai does not verify, endorse, or guarantee any
/// listing content. Users arrange transportation at their own risk.

// MARK: - Models

/// Trip listing location
public struct TripLocation: Codable, Hashable {
    public let city: String
    public let state: String
    public let zipCode: String?
    public let neighborhood: String?
    public let latitude: Double?
    public let longitude: Double?

    public init(city: String, state: String, zipCode: String? = nil, neighborhood: String? = nil, latitude: Double? = nil, longitude: Double? = nil) {
        self.city = city
        self.state = state
        self.zipCode = zipCode
        self.neighborhood = neighborhood
        self.latitude = latitude
        self.longitude = longitude
    }

    enum CodingKeys: String, CodingKey {
        case city, state
        case zipCode = "zip_code"
        case neighborhood, latitude, longitude
    }
}

/// A trip listing (user-generated classified ad)
public struct TripListing: Codable, Identifiable, Hashable {
    public let listingId: String
    public let posterName: String
    public let posterContactMasked: String

    public let originCity: String
    public let originState: String
    public let destinationCity: String
    public let destinationState: String

    public let departureDate: String
    public let departureTime: String?
    public let availableSeats: Int

    // User-set price (NOT calculated by platform)
    public let askingPrice: Double?
    public let priceNegotiable: Bool
    public let priceNote: String?

    public let vehicleDescription: String?
    public let tripDescription: String?
    public let preferences: String?

    public let isDriver: Bool
    public let returnTripAvailable: Bool

    public let createdAt: String
    public let expiresAt: String

    // Legal disclaimer (always present)
    public let disclaimer: String

    public var id: String { listingId }

    enum CodingKeys: String, CodingKey {
        case listingId = "listing_id"
        case posterName = "poster_name"
        case posterContactMasked = "poster_contact_masked"
        case originCity = "origin_city"
        case originState = "origin_state"
        case destinationCity = "destination_city"
        case destinationState = "destination_state"
        case departureDate = "departure_date"
        case departureTime = "departure_time"
        case availableSeats = "available_seats"
        case askingPrice = "asking_price"
        case priceNegotiable = "price_negotiable"
        case priceNote = "price_note"
        case vehicleDescription = "vehicle_description"
        case tripDescription = "trip_description"
        case preferences
        case isDriver = "is_driver"
        case returnTripAvailable = "return_trip_available"
        case createdAt = "created_at"
        case expiresAt = "expires_at"
        case disclaimer
    }

    /// Display formatted price
    public var formattedPrice: String {
        if let price = askingPrice {
            return "$\(Int(price))"
        }
        return "Contact for price"
    }

    /// Display route
    public var routeDescription: String {
        "\(originCity), \(originState) → \(destinationCity), \(destinationState)"
    }
}

/// Request to create a trip listing
public struct CreateTripListingRequest: Codable {
    public let posterName: String
    public let posterEmail: String
    public let posterPhone: String?

    public let origin: TripLocation
    public let destination: TripLocation
    public let departureDate: String
    public let departureTime: String?
    public let flexibility: String?

    public let availableSeats: Int

    // Price is 100% user-determined - NO platform calculation
    public let askingPrice: Double?
    public let priceNegotiable: Bool
    public let priceNote: String?

    public let vehicleDescription: String?
    public let tripDescription: String?
    public let preferences: String?

    public let returnTripAvailable: Bool
    public let returnDate: String?

    public let isDriver: Bool

    // Required legal acknowledgment
    public let legalAcknowledgment: Bool

    public init(
        posterName: String,
        posterEmail: String,
        posterPhone: String? = nil,
        origin: TripLocation,
        destination: TripLocation,
        departureDate: String,
        departureTime: String? = nil,
        flexibility: String? = nil,
        availableSeats: Int = 1,
        askingPrice: Double? = nil,
        priceNegotiable: Bool = true,
        priceNote: String? = nil,
        vehicleDescription: String? = nil,
        tripDescription: String? = nil,
        preferences: String? = nil,
        returnTripAvailable: Bool = false,
        returnDate: String? = nil,
        isDriver: Bool = true,
        legalAcknowledgment: Bool
    ) {
        self.posterName = posterName
        self.posterEmail = posterEmail
        self.posterPhone = posterPhone
        self.origin = origin
        self.destination = destination
        self.departureDate = departureDate
        self.departureTime = departureTime
        self.flexibility = flexibility
        self.availableSeats = availableSeats
        self.askingPrice = askingPrice
        self.priceNegotiable = priceNegotiable
        self.priceNote = priceNote
        self.vehicleDescription = vehicleDescription
        self.tripDescription = tripDescription
        self.preferences = preferences
        self.returnTripAvailable = returnTripAvailable
        self.returnDate = returnDate
        self.isDriver = isDriver
        self.legalAcknowledgment = legalAcknowledgment
    }

    enum CodingKeys: String, CodingKey {
        case posterName = "poster_name"
        case posterEmail = "poster_email"
        case posterPhone = "poster_phone"
        case origin, destination
        case departureDate = "departure_date"
        case departureTime = "departure_time"
        case flexibility
        case availableSeats = "available_seats"
        case askingPrice = "asking_price"
        case priceNegotiable = "price_negotiable"
        case priceNote = "price_note"
        case vehicleDescription = "vehicle_description"
        case tripDescription = "trip_description"
        case preferences
        case returnTripAvailable = "return_trip_available"
        case returnDate = "return_date"
        case isDriver = "is_driver"
        case legalAcknowledgment = "legal_acknowledgment"
    }
}

/// Search listings response
public struct TripListingsResponse: Codable {
    public let success: Bool
    public let total: Int
    public let page: Int
    public let pageSize: Int
    public let listings: [TripListing]
    public let platformNotice: String
    public let disclaimer: String

    enum CodingKeys: String, CodingKey {
        case success, total, page
        case pageSize = "page_size"
        case listings
        case platformNotice = "platform_notice"
        case disclaimer
    }
}

/// Request to send a message
public struct SendMessageRequest: Codable {
    public let listingId: String
    public let senderName: String
    public let senderEmail: String
    public let senderPhone: String?
    public let message: String
    public let legalAcknowledgment: Bool

    public init(listingId: String, senderName: String, senderEmail: String, senderPhone: String? = nil, message: String, legalAcknowledgment: Bool) {
        self.listingId = listingId
        self.senderName = senderName
        self.senderEmail = senderEmail
        self.senderPhone = senderPhone
        self.message = message
        self.legalAcknowledgment = legalAcknowledgment
    }

    enum CodingKeys: String, CodingKey {
        case listingId = "listing_id"
        case senderName = "sender_name"
        case senderEmail = "sender_email"
        case senderPhone = "sender_phone"
        case message
        case legalAcknowledgment = "legal_acknowledgment"
    }
}

/// Message response
public struct SendMessageResponse: Codable {
    public let success: Bool
    public let messageId: String
    public let status: String
    public let disclaimer: String

    enum CodingKeys: String, CodingKey {
        case success
        case messageId = "message_id"
        case status, disclaimer
    }
}

/// Legal disclaimer response
public struct LegalDisclaimerResponse: Codable {
    public let disclaimer: String
    public let listingDisclaimer: String
    public let messageDisclaimer: String
    public let lastUpdated: String
    public let legalContact: String
    public let importantNotice: String

    enum CodingKeys: String, CodingKey {
        case disclaimer
        case listingDisclaimer = "listing_disclaimer"
        case messageDisclaimer = "message_disclaimer"
        case lastUpdated = "last_updated"
        case legalContact = "legal_contact"
        case importantNotice = "important_notice"
    }
}

// MARK: - Trip Board Service

public class TripBoardService {
    public static let shared = TripBoardService()

    private let baseURL: String
    private let session: URLSession

    private init() {
        self.baseURL = AppConfig.shared.p2pAPIBaseURL
        self.session = URLSession.shared
    }

    // MARK: - Safe URL Builder

    /// Safely creates a URL, returning nil if the string is invalid
    private func makeURL(_ urlString: String) -> URL? {
        return URL(string: urlString)
    }

    /// Creates an error for invalid URL
    private func invalidURLError() -> NSError {
        return NSError(domain: "TripBoard", code: -2, userInfo: [NSLocalizedDescriptionKey: "Invalid URL"])
    }

    // MARK: - Legal Disclaimers

    /// Get platform disclaimer - MUST be shown before user posts or contacts
    public func getDisclaimer(completion: @escaping (Result<LegalDisclaimerResponse, Error>) -> Void) {
        guard let url = makeURL("\(baseURL)/api/trip-board/disclaimer") else {
            DispatchQueue.main.async { completion(.failure(self.invalidURLError())) }
            return
        }

        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        session.dataTask(with: request) { data, response, error in
            if let error = error {
                DispatchQueue.main.async { completion(.failure(error)) }
                return
            }

            guard let data = data else {
                DispatchQueue.main.async { completion(.failure(NSError(domain: "TripBoard", code: -1, userInfo: [NSLocalizedDescriptionKey: "No data"]))) }
                return
            }

            do {
                let response = try JSONDecoder().decode(LegalDisclaimerResponse.self, from: data)
                DispatchQueue.main.async { completion(.success(response)) }
            } catch {
                DispatchQueue.main.async { completion(.failure(error)) }
            }
        }.resume()
    }

    // MARK: - Search Listings

    /// Search for trip listings
    public func searchListings(
        originCity: String? = nil,
        originState: String? = nil,
        destinationCity: String? = nil,
        destinationState: String? = nil,
        departureDate: String? = nil,
        minSeats: Int = 1,
        isDriver: Bool? = nil,
        page: Int = 1,
        pageSize: Int = 20,
        completion: @escaping (Result<TripListingsResponse, Error>) -> Void
    ) {
        guard var components = URLComponents(string: "\(baseURL)/api/trip-board/listings") else {
            DispatchQueue.main.async { completion(.failure(self.invalidURLError())) }
            return
        }
        var queryItems: [URLQueryItem] = [
            URLQueryItem(name: "page", value: "\(page)"),
            URLQueryItem(name: "page_size", value: "\(pageSize)"),
            URLQueryItem(name: "min_seats", value: "\(minSeats)")
        ]

        if let city = originCity { queryItems.append(URLQueryItem(name: "origin_city", value: city)) }
        if let state = originState { queryItems.append(URLQueryItem(name: "origin_state", value: state)) }
        if let city = destinationCity { queryItems.append(URLQueryItem(name: "destination_city", value: city)) }
        if let state = destinationState { queryItems.append(URLQueryItem(name: "destination_state", value: state)) }
        if let date = departureDate { queryItems.append(URLQueryItem(name: "departure_date", value: date)) }
        if let driver = isDriver { queryItems.append(URLQueryItem(name: "is_driver", value: driver ? "true" : "false")) }

        components.queryItems = queryItems

        guard let url = components.url else {
            DispatchQueue.main.async { completion(.failure(self.invalidURLError())) }
            return
        }
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        session.dataTask(with: request) { data, response, error in
            if let error = error {
                DispatchQueue.main.async { completion(.failure(error)) }
                return
            }

            guard let data = data else {
                DispatchQueue.main.async { completion(.failure(NSError(domain: "TripBoard", code: -1, userInfo: [NSLocalizedDescriptionKey: "No data"]))) }
                return
            }

            do {
                let response = try JSONDecoder().decode(TripListingsResponse.self, from: data)
                DispatchQueue.main.async { completion(.success(response)) }
            } catch {
                logger.info("TripBoard decode error: \(error)")
                DispatchQueue.main.async { completion(.failure(error)) }
            }
        }.resume()
    }

    // MARK: - Get Listing Details

    /// Get full details of a listing
    public func getListingDetails(listingId: String, completion: @escaping (Result<TripListing, Error>) -> Void) {
        guard let url = makeURL("\(baseURL)/api/trip-board/listings/\(listingId)") else {
            DispatchQueue.main.async { completion(.failure(self.invalidURLError())) }
            return
        }

        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        session.dataTask(with: request) { data, response, error in
            if let error = error {
                DispatchQueue.main.async { completion(.failure(error)) }
                return
            }

            guard let data = data else {
                DispatchQueue.main.async { completion(.failure(NSError(domain: "TripBoard", code: -1, userInfo: [NSLocalizedDescriptionKey: "No data"]))) }
                return
            }

            do {
                let listing = try JSONDecoder().decode(TripListing.self, from: data)
                DispatchQueue.main.async { completion(.success(listing)) }
            } catch {
                DispatchQueue.main.async { completion(.failure(error)) }
            }
        }.resume()
    }

    // MARK: - Create Listing

    /// Create a new trip listing - user MUST acknowledge legal disclaimer
    public func createListing(request: CreateTripListingRequest, completion: @escaping (Result<TripListing, Error>) -> Void) {
        // Verify legal acknowledgment
        guard request.legalAcknowledgment else {
            let error = NSError(domain: "TripBoard", code: 400, userInfo: [
                NSLocalizedDescriptionKey: "You must acknowledge the legal disclaimer before posting"
            ])
            completion(.failure(error))
            return
        }

        guard let url = makeURL("\(baseURL)/api/trip-board/listings") else {
            DispatchQueue.main.async { completion(.failure(self.invalidURLError())) }
            return
        }

        var urlRequest = URLRequest(url: url)
        urlRequest.httpMethod = "POST"
        urlRequest.setValue("application/json", forHTTPHeaderField: "Content-Type")

        do {
            urlRequest.httpBody = try JSONEncoder().encode(request)
        } catch {
            completion(.failure(error))
            return
        }

        session.dataTask(with: urlRequest) { data, response, error in
            if let error = error {
                DispatchQueue.main.async { completion(.failure(error)) }
                return
            }

            guard let data = data else {
                DispatchQueue.main.async { completion(.failure(NSError(domain: "TripBoard", code: -1, userInfo: [NSLocalizedDescriptionKey: "No data"]))) }
                return
            }

            do {
                let listing = try JSONDecoder().decode(TripListing.self, from: data)
                DispatchQueue.main.async { completion(.success(listing)) }
            } catch {
                // Try to decode error response
                if let errorDict = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                   let detail = errorDict["detail"] as? [String: Any],
                   let message = detail["message"] as? String {
                    let error = NSError(domain: "TripBoard", code: 400, userInfo: [NSLocalizedDescriptionKey: message])
                    DispatchQueue.main.async { completion(.failure(error)) }
                } else {
                    DispatchQueue.main.async { completion(.failure(error)) }
                }
            }
        }.resume()
    }

    // MARK: - Send Message

    /// Send a message to a listing poster - user MUST acknowledge legal disclaimer
    public func sendMessage(request: SendMessageRequest, completion: @escaping (Result<SendMessageResponse, Error>) -> Void) {
        // Verify legal acknowledgment
        guard request.legalAcknowledgment else {
            let error = NSError(domain: "TripBoard", code: 400, userInfo: [
                NSLocalizedDescriptionKey: "You must acknowledge that Dollor.ai is not a party to any arrangement"
            ])
            completion(.failure(error))
            return
        }

        guard let url = makeURL("\(baseURL)/api/trip-board/messages") else {
            DispatchQueue.main.async { completion(.failure(self.invalidURLError())) }
            return
        }

        var urlRequest = URLRequest(url: url)
        urlRequest.httpMethod = "POST"
        urlRequest.setValue("application/json", forHTTPHeaderField: "Content-Type")

        do {
            urlRequest.httpBody = try JSONEncoder().encode(request)
        } catch {
            completion(.failure(error))
            return
        }

        session.dataTask(with: urlRequest) { data, response, error in
            if let error = error {
                DispatchQueue.main.async { completion(.failure(error)) }
                return
            }

            guard let data = data else {
                DispatchQueue.main.async { completion(.failure(NSError(domain: "TripBoard", code: -1, userInfo: [NSLocalizedDescriptionKey: "No data"]))) }
                return
            }

            do {
                let response = try JSONDecoder().decode(SendMessageResponse.self, from: data)
                DispatchQueue.main.async { completion(.success(response)) }
            } catch {
                DispatchQueue.main.async { completion(.failure(error)) }
            }
        }.resume()
    }

    // MARK: - Delete Listing

    /// Delete a listing (only poster can delete)
    public func deleteListing(listingId: String, posterEmail: String, completion: @escaping (Result<Bool, Error>) -> Void) {
        guard var components = URLComponents(string: "\(baseURL)/api/trip-board/listings/\(listingId)") else {
            DispatchQueue.main.async { completion(.failure(self.invalidURLError())) }
            return
        }
        components.queryItems = [URLQueryItem(name: "poster_email", value: posterEmail)]

        guard let url = components.url else {
            DispatchQueue.main.async { completion(.failure(self.invalidURLError())) }
            return
        }
        var request = URLRequest(url: url)
        request.httpMethod = "DELETE"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        session.dataTask(with: request) { data, response, error in
            if let error = error {
                DispatchQueue.main.async { completion(.failure(error)) }
                return
            }

            if let httpResponse = response as? HTTPURLResponse, (200...299).contains(httpResponse.statusCode) {
                DispatchQueue.main.async { completion(.success(true)) }
            } else {
                let error = NSError(domain: "TripBoard", code: -1, userInfo: [NSLocalizedDescriptionKey: "Failed to delete listing"])
                DispatchQueue.main.async { completion(.failure(error)) }
            }
        }.resume()
    }
}

// MARK: - Price Helper (Educational Information Only)

/// Price helper response - EDUCATIONAL DATA ONLY, NOT FARE CALCULATION
public struct PriceHelperResponse: Codable {
    public let disclaimer: String
    public let distanceMiles: Double
    public let referenceData: PriceReferenceData
    public let whatOthersAsk: WhatOthersAsk
    public let importantNotes: [String]
    public let legalNotice: String

    enum CodingKeys: String, CodingKey {
        case disclaimer
        case distanceMiles = "distance_miles"
        case referenceData = "reference_data"
        case whatOthersAsk = "what_others_ask"
        case importantNotes = "important_notes"
        case legalNotice = "legal_notice"
    }
}

public struct PriceReferenceData: Codable {
    public let irsMileageRate: IRSMileageRate
    public let gasCostEstimate: GasCostEstimate

    enum CodingKeys: String, CodingKey {
        case irsMileageRate = "irs_mileage_rate"
        case gasCostEstimate = "gas_cost_estimate"
    }
}

public struct IRSMileageRate: Codable {
    public let rate: String
    public let source: String
    public let url: String
    public let estimate: Double
    public let note: String
}

public struct GasCostEstimate: Codable {
    public let estimate: Double
    public let assumptions: String
    public let note: String
}

public struct WhatOthersAsk: Codable {
    public let note: String
    public let ranges: PriceRanges
}

public struct PriceRanges: Codable {
    public let gasShareOnly: PriceRange
    public let gasPlusWear: PriceRange
    public let fairCompensation: PriceRange

    enum CodingKeys: String, CodingKey {
        case gasShareOnly = "gas_share_only"
        case gasPlusWear = "gas_plus_wear"
        case fairCompensation = "fair_compensation"
    }
}

public struct PriceRange: Codable {
    public let range: String
    public let description: String
}

// Extension to add price helper to TripBoardService
extension TripBoardService {

    /// Get educational price information - NOT fare calculation
    /// This provides reference data (IRS rates, gas costs) to help users decide their own price
    public func getPriceHelper(
        originLat: Double,
        originLng: Double,
        destinationLat: Double,
        destinationLng: Double,
        completion: @escaping (Result<PriceHelperResponse, Error>) -> Void
    ) {
        guard var components = URLComponents(string: "\(baseURL)/api/trip-board/price-helper") else {
            DispatchQueue.main.async { completion(.failure(NSError(domain: "TripBoard", code: -2, userInfo: [NSLocalizedDescriptionKey: "Invalid URL"]))) }
            return
        }
        components.queryItems = [
            URLQueryItem(name: "origin_lat", value: "\(originLat)"),
            URLQueryItem(name: "origin_lng", value: "\(originLng)"),
            URLQueryItem(name: "destination_lat", value: "\(destinationLat)"),
            URLQueryItem(name: "destination_lng", value: "\(destinationLng)")
        ]

        guard let url = components.url else {
            DispatchQueue.main.async { completion(.failure(NSError(domain: "TripBoard", code: -2, userInfo: [NSLocalizedDescriptionKey: "Invalid URL"]))) }
            return
        }
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        session.dataTask(with: request) { data, response, error in
            if let error = error {
                DispatchQueue.main.async { completion(.failure(error)) }
                return
            }

            guard let data = data else {
                DispatchQueue.main.async {
                    completion(.failure(NSError(domain: "TripBoard", code: -1, userInfo: [NSLocalizedDescriptionKey: "No data"])))
                }
                return
            }

            do {
                let response = try JSONDecoder().decode(PriceHelperResponse.self, from: data)
                DispatchQueue.main.async { completion(.success(response)) }
            } catch {
                DispatchQueue.main.async { completion(.failure(error)) }
            }
        }.resume()
    }
}

// MARK: - Match Models (Pay-Per-Match Success Fee)

/// A match between a driver and passenger
public struct TripMatch: Codable, Identifiable {
    public let matchId: String
    public let status: String // pending, confirmed, cancelled
    public let listingId: String

    // Trip details
    public let originCity: String
    public let originState: String
    public let destinationCity: String
    public let destinationState: String
    public let departureDate: String?

    // Other party info (masked until confirmed)
    public let otherPartyName: String
    public let otherPartyEmail: String?
    public let otherPartyPhone: String?
    public let otherPartyRole: String // "driver" or "passenger"

    // Match details
    public let agreedPrice: Double
    public let proposedBy: String // "you" or "them"
    public let needsYourConfirmation: Bool

    public let createdAt: String?
    public let confirmedAt: String?

    public var id: String { matchId }
    public var isConfirmed: Bool { status == "confirmed" }

    enum CodingKeys: String, CodingKey {
        case matchId = "match_id"
        case status
        case listingId = "listing_id"
        case originCity = "origin_city"
        case originState = "origin_state"
        case destinationCity = "destination_city"
        case destinationState = "destination_state"
        case departureDate = "departure_date"
        case otherPartyName = "other_party_name"
        case otherPartyEmail = "other_party_email"
        case otherPartyPhone = "other_party_phone"
        case otherPartyRole = "other_party_role"
        case agreedPrice = "agreed_price"
        case proposedBy = "proposed_by"
        case needsYourConfirmation = "needs_your_confirmation"
        case createdAt = "created_at"
        case confirmedAt = "confirmed_at"
    }
}

/// Request to propose a match
public struct ProposeMatchRequest: Codable {
    public let listingId: String
    public let agreedPrice: Double
    public let message: String?

    public init(listingId: String, agreedPrice: Double, message: String? = nil) {
        self.listingId = listingId
        self.agreedPrice = agreedPrice
        self.message = message
    }

    enum CodingKeys: String, CodingKey {
        case listingId = "listing_id"
        case agreedPrice = "agreed_price"
        case message
    }
}

/// Request to confirm a match and pay
public struct ConfirmMatchRequest: Codable {
    public let matchId: String

    public init(matchId: String) {
        self.matchId = matchId
    }

    enum CodingKeys: String, CodingKey {
        case matchId = "match_id"
    }
}

/// Match fee info response
public struct MatchFeeInfo: Codable {
    public let matchSuccessFee: Double
    public let whoPays: String
    public let whenYouPay: String
    public let whatsFree: [String]
    public let whatTriggersPayment: [String]
    public let thisFeeIsNot: [String]
    public let disclaimer: String
    public let legalModel: String

    enum CodingKeys: String, CodingKey {
        case matchSuccessFee = "match_success_fee"
        case whoPays = "who_pays"
        case whenYouPay = "when_you_pay"
        case whatsFree = "whats_free"
        case whatTriggersPayment = "what_triggers_payment"
        case thisFeeIsNot = "this_fee_is_not"
        case disclaimer
        case legalModel = "legal_model"
    }
}

// MARK: - Match Service Methods

extension TripBoardService {

    /// Get match fee info - explains the pay-per-match model
    public func getMatchFeeInfo(completion: @escaping (Result<MatchFeeInfo, Error>) -> Void) {
        guard let url = URL(string: "\(baseURL)/api/trip-board/match-fee-info") else {
            DispatchQueue.main.async { completion(.failure(NSError(domain: "TripBoard", code: -2, userInfo: [NSLocalizedDescriptionKey: "Invalid URL"]))) }
            return
        }

        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        session.dataTask(with: request) { data, response, error in
            if let error = error {
                DispatchQueue.main.async { completion(.failure(error)) }
                return
            }

            guard let data = data else {
                DispatchQueue.main.async { completion(.failure(NSError(domain: "TripBoard", code: -1, userInfo: [NSLocalizedDescriptionKey: "No data"]))) }
                return
            }

            do {
                let response = try JSONDecoder().decode(MatchFeeInfo.self, from: data)
                DispatchQueue.main.async { completion(.success(response)) }
            } catch {
                DispatchQueue.main.async { completion(.failure(error)) }
            }
        }.resume()
    }

    /// Propose a match after negotiation
    public func proposeMatch(listingId: String, agreedPrice: Double, completion: @escaping (Result<TripMatch, Error>) -> Void) {
        guard let url = URL(string: "\(baseURL)/api/trip-board/matches/propose") else {
            DispatchQueue.main.async { completion(.failure(NSError(domain: "TripBoard", code: -2, userInfo: [NSLocalizedDescriptionKey: "Invalid URL"]))) }
            return
        }

        var urlRequest = URLRequest(url: url)
        urlRequest.httpMethod = "POST"
        urlRequest.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let body: [String: Any] = [
            "listing_id": listingId,
            "agreed_price": agreedPrice
        ]

        do {
            urlRequest.httpBody = try JSONSerialization.data(withJSONObject: body)
        } catch {
            completion(.failure(error))
            return
        }

        session.dataTask(with: urlRequest) { data, response, error in
            if let error = error {
                DispatchQueue.main.async { completion(.failure(error)) }
                return
            }

            guard let data = data else {
                DispatchQueue.main.async { completion(.failure(NSError(domain: "TripBoard", code: -1, userInfo: [NSLocalizedDescriptionKey: "No data"]))) }
                return
            }

            do {
                let match = try JSONDecoder().decode(TripMatch.self, from: data)
                DispatchQueue.main.async { completion(.success(match)) }
            } catch {
                DispatchQueue.main.async { completion(.failure(error)) }
            }
        }.resume()
    }

    /// Confirm a match and pay $1 matchmaking fee
    public func confirmMatch(matchId: String, completion: @escaping (Result<TripMatch, Error>) -> Void) {
        guard let url = URL(string: "\(baseURL)/api/trip-board/matches/confirm") else {
            DispatchQueue.main.async { completion(.failure(NSError(domain: "TripBoard", code: -2, userInfo: [NSLocalizedDescriptionKey: "Invalid URL"]))) }
            return
        }

        var urlRequest = URLRequest(url: url)
        urlRequest.httpMethod = "POST"
        urlRequest.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let body: [String: Any] = ["match_id": matchId]

        do {
            urlRequest.httpBody = try JSONSerialization.data(withJSONObject: body)
        } catch {
            completion(.failure(error))
            return
        }

        session.dataTask(with: urlRequest) { data, response, error in
            if let error = error {
                DispatchQueue.main.async { completion(.failure(error)) }
                return
            }

            guard let data = data else {
                DispatchQueue.main.async { completion(.failure(NSError(domain: "TripBoard", code: -1, userInfo: [NSLocalizedDescriptionKey: "No data"]))) }
                return
            }

            do {
                let match = try JSONDecoder().decode(TripMatch.self, from: data)
                DispatchQueue.main.async { completion(.success(match)) }
            } catch {
                DispatchQueue.main.async { completion(.failure(error)) }
            }
        }.resume()
    }

    /// Get user's matches
    public func getMyMatches(completion: @escaping (Result<[TripMatch], Error>) -> Void) {
        guard let url = URL(string: "\(baseURL)/api/trip-board/my-matches") else {
            DispatchQueue.main.async { completion(.failure(NSError(domain: "TripBoard", code: -2, userInfo: [NSLocalizedDescriptionKey: "Invalid URL"]))) }
            return
        }

        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        session.dataTask(with: request) { data, response, error in
            if let error = error {
                DispatchQueue.main.async { completion(.failure(error)) }
                return
            }

            guard let data = data else {
                DispatchQueue.main.async { completion(.failure(NSError(domain: "TripBoard", code: -1, userInfo: [NSLocalizedDescriptionKey: "No data"]))) }
                return
            }

            do {
                let response = try JSONDecoder().decode(MyMatchesResponse.self, from: data)
                DispatchQueue.main.async { completion(.success(response.matches)) }
            } catch {
                DispatchQueue.main.async { completion(.failure(error)) }
            }
        }.resume()
    }

    private struct MyMatchesResponse: Codable {
        let matches: [TripMatch]
    }

    /// Search for drivers on a specific route
    public func searchDrivers(
        originCity: String,
        destinationCity: String,
        originState: String? = nil,
        destinationState: String? = nil,
        departureDate: String? = nil,
        minSeats: Int = 1,
        completion: @escaping (Result<[String: Any], Error>) -> Void
    ) {
        guard var components = URLComponents(string: "\(baseURL)/api/trip-board/search-drivers") else {
            DispatchQueue.main.async { completion(.failure(NSError(domain: "TripBoard", code: -2, userInfo: [NSLocalizedDescriptionKey: "Invalid URL"]))) }
            return
        }
        var queryItems: [URLQueryItem] = [
            URLQueryItem(name: "origin_city", value: originCity),
            URLQueryItem(name: "destination_city", value: destinationCity),
            URLQueryItem(name: "min_seats", value: "\(minSeats)")
        ]

        if let state = originState { queryItems.append(URLQueryItem(name: "origin_state", value: state)) }
        if let state = destinationState { queryItems.append(URLQueryItem(name: "destination_state", value: state)) }
        if let date = departureDate { queryItems.append(URLQueryItem(name: "departure_date", value: date)) }

        components.queryItems = queryItems

        guard let url = components.url else {
            DispatchQueue.main.async { completion(.failure(NSError(domain: "TripBoard", code: -2, userInfo: [NSLocalizedDescriptionKey: "Invalid URL"]))) }
            return
        }
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        session.dataTask(with: request) { data, response, error in
            if let error = error {
                DispatchQueue.main.async { completion(.failure(error)) }
                return
            }

            guard let data = data else {
                DispatchQueue.main.async { completion(.failure(NSError(domain: "TripBoard", code: -1, userInfo: [NSLocalizedDescriptionKey: "No data"]))) }
                return
            }

            do {
                if let json = try JSONSerialization.jsonObject(with: data) as? [String: Any] {
                    DispatchQueue.main.async { completion(.success(json)) }
                } else {
                    DispatchQueue.main.async { completion(.failure(NSError(domain: "TripBoard", code: -1, userInfo: [NSLocalizedDescriptionKey: "Invalid response"]))) }
                }
            } catch {
                DispatchQueue.main.async { completion(.failure(error)) }
            }
        }.resume()
    }

    /// Search for passengers on a specific route
    public func searchPassengers(
        originCity: String,
        destinationCity: String,
        originState: String? = nil,
        destinationState: String? = nil,
        departureDate: String? = nil,
        completion: @escaping (Result<[String: Any], Error>) -> Void
    ) {
        guard var components = URLComponents(string: "\(baseURL)/api/trip-board/search-passengers") else {
            DispatchQueue.main.async { completion(.failure(NSError(domain: "TripBoard", code: -2, userInfo: [NSLocalizedDescriptionKey: "Invalid URL"]))) }
            return
        }
        var queryItems: [URLQueryItem] = [
            URLQueryItem(name: "origin_city", value: originCity),
            URLQueryItem(name: "destination_city", value: destinationCity)
        ]

        if let state = originState { queryItems.append(URLQueryItem(name: "origin_state", value: state)) }
        if let state = destinationState { queryItems.append(URLQueryItem(name: "destination_state", value: state)) }
        if let date = departureDate { queryItems.append(URLQueryItem(name: "departure_date", value: date)) }

        components.queryItems = queryItems

        guard let url = components.url else {
            DispatchQueue.main.async { completion(.failure(NSError(domain: "TripBoard", code: -2, userInfo: [NSLocalizedDescriptionKey: "Invalid URL"]))) }
            return
        }
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        session.dataTask(with: request) { data, response, error in
            if let error = error {
                DispatchQueue.main.async { completion(.failure(error)) }
                return
            }

            guard let data = data else {
                DispatchQueue.main.async { completion(.failure(NSError(domain: "TripBoard", code: -1, userInfo: [NSLocalizedDescriptionKey: "No data"]))) }
                return
            }

            do {
                if let json = try JSONSerialization.jsonObject(with: data) as? [String: Any] {
                    DispatchQueue.main.async { completion(.success(json)) }
                } else {
                    DispatchQueue.main.async { completion(.failure(NSError(domain: "TripBoard", code: -1, userInfo: [NSLocalizedDescriptionKey: "Invalid response"]))) }
                }
            } catch {
                DispatchQueue.main.async { completion(.failure(error)) }
            }
        }.resume()
    }
}

// MARK: - Trip Safety Models

/// Safety agreement status for a match
public struct TripSafetyAgreement: Codable {
    public let agreementId: String
    public let matchId: String

    // Recording consent
    public let recordingConsent: RecordingConsentStatus

    // Payment confirmation
    public let payment: PaymentConfirmationStatus

    // Identity verification
    public let identityVerification: IdentityVerificationStatus

    // Safety checklist
    public let safetyChecklist: SafetyChecklistStatus

    // Trip status
    public let tripStatus: TripStatusInfo

    public let disclaimer: String

    enum CodingKeys: String, CodingKey {
        case agreementId = "agreement_id"
        case matchId = "match_id"
        case recordingConsent = "recording_consent"
        case payment
        case identityVerification = "identity_verification"
        case safetyChecklist = "safety_checklist"
        case tripStatus = "trip_status"
        case disclaimer
    }
}

public struct RecordingConsentStatus: Codable {
    public let driverConsented: Bool
    public let passengerConsented: Bool
    public let mutualAgreed: Bool
    public let consentText: String

    enum CodingKeys: String, CodingKey {
        case driverConsented = "driver_consented"
        case passengerConsented = "passenger_consented"
        case mutualAgreed = "mutual_agreed"
        case consentText = "consent_text"
    }
}

public struct PaymentConfirmationStatus: Codable {
    public let method: String?
    public let amount: Double?
    public let driverConfirmed: Bool
    public let passengerConfirmed: Bool
    public let paymentConfirmed: Bool
    public let info: String

    enum CodingKeys: String, CodingKey {
        case method, amount
        case driverConfirmed = "driver_confirmed"
        case passengerConfirmed = "passenger_confirmed"
        case paymentConfirmed = "payment_confirmed"
        case info
    }
}

public struct IdentityVerificationStatus: Codable {
    public let driverVerifiedPassenger: Bool
    public let passengerVerifiedDriver: Bool
    public let bothVerified: Bool
    public let instructions: String

    enum CodingKeys: String, CodingKey {
        case driverVerifiedPassenger = "driver_verified_passenger"
        case passengerVerifiedDriver = "passenger_verified_driver"
        case bothVerified = "both_verified"
        case instructions
    }
}

public struct SafetyChecklistStatus: Codable {
    public let driverCompleted: Bool
    public let passengerCompleted: Bool

    enum CodingKeys: String, CodingKey {
        case driverCompleted = "driver_completed"
        case passengerCompleted = "passenger_completed"
    }
}

public struct TripStatusInfo: Codable {
    public let started: Bool
    public let startedAt: String?
    public let completed: Bool
    public let completedAt: String?

    enum CodingKeys: String, CodingKey {
        case started
        case startedAt = "started_at"
        case completed
        case completedAt = "completed_at"
    }
}

/// My verification code response
public struct VerificationCodeResponse: Codable {
    public let yourCode: String
    public let instructions: String
    public let important: String

    enum CodingKeys: String, CodingKey {
        case yourCode = "your_code"
        case instructions, important
    }
}

/// Pre-trip safety summary
public struct PreTripSummary: Codable {
    public let matchId: String
    public let yourRole: String
    public let safetyStatus: SafetyStatusDetails
    public let readyToStart: Bool
    public let recommendations: [String]
    public let yourVerificationCode: String
    public let finalReminder: String

    enum CodingKeys: String, CodingKey {
        case matchId = "match_id"
        case yourRole = "your_role"
        case safetyStatus = "safety_status"
        case readyToStart = "ready_to_start"
        case recommendations
        case yourVerificationCode = "your_verification_code"
        case finalReminder = "final_reminder"
    }
}

public struct SafetyStatusDetails: Codable {
    public let recordingConsent: SafetyItemStatus
    public let payment: PaymentItemStatus
    public let identity: IdentityItemStatus
    public let safetyChecklist: SafetyChecklistItemStatus

    enum CodingKeys: String, CodingKey {
        case recordingConsent = "recording_consent"
        case payment, identity
        case safetyChecklist = "safety_checklist"
    }
}

public struct SafetyItemStatus: Codable {
    public let status: String
    public let yourConsent: Bool
    public let otherPartyConsent: Bool

    enum CodingKeys: String, CodingKey {
        case status
        case yourConsent = "your_consent"
        case otherPartyConsent = "other_party_consent"
    }
}

public struct PaymentItemStatus: Codable {
    public let status: String
    public let method: String?
    public let amount: Double?
    public let youConfirmed: Bool
    public let otherConfirmed: Bool

    enum CodingKeys: String, CodingKey {
        case status, method, amount
        case youConfirmed = "you_confirmed"
        case otherConfirmed = "other_confirmed"
    }
}

public struct IdentityItemStatus: Codable {
    public let status: String
    public let yourCode: String
    public let youVerifiedThem: Bool
    public let theyVerifiedYou: Bool

    enum CodingKeys: String, CodingKey {
        case status
        case yourCode = "your_code"
        case youVerifiedThem = "you_verified_them"
        case theyVerifiedYou = "they_verified_you"
    }
}

public struct SafetyChecklistItemStatus: Codable {
    public let status: String
}

/// Safety checklist item
public struct SafetyChecklistItem: Codable, Identifiable {
    public let id: String
    public let title: String
    public let description: String
    public let required: Bool

    public init(id: String, title: String, description: String, required: Bool) {
        self.id = id
        self.title = title
        self.description = description
        self.required = required
    }
}

/// Safety checklist response
public struct SafetyChecklistResponse: Codable {
    public let title: String
    public let disclaimer: String
    public let items: [SafetyChecklistItem]
}

/// Generic success response
public struct SafetyActionResponse: Codable {
    public let success: Bool
    public let message: String
    public let verified: Bool?
    public let mutualRecordingAgreed: Bool?
    public let paymentConfirmed: Bool?
    public let bothVerified: Bool?

    enum CodingKeys: String, CodingKey {
        case success, message, verified
        case mutualRecordingAgreed = "mutual_recording_agreed"
        case paymentConfirmed = "payment_confirmed"
        case bothVerified = "both_verified"
    }
}

// MARK: - Trip Safety Service Methods

extension TripBoardService {

    /// Get safety agreement status for a match
    public func getSafetyAgreement(matchId: String, userEmail: String, completion: @escaping (Result<TripSafetyAgreement, Error>) -> Void) {
        guard var components = URLComponents(string: "\(baseURL)/api/trip-board/safety/agreement/\(matchId)") else {
            DispatchQueue.main.async { completion(.failure(NSError(domain: "TripSafety", code: -2, userInfo: [NSLocalizedDescriptionKey: "Invalid URL"]))) }
            return
        }
        components.queryItems = [URLQueryItem(name: "user_email", value: userEmail)]

        guard let url = components.url else {
            DispatchQueue.main.async { completion(.failure(NSError(domain: "TripSafety", code: -2, userInfo: [NSLocalizedDescriptionKey: "Invalid URL"]))) }
            return
        }
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        session.dataTask(with: request) { data, response, error in
            if let error = error {
                DispatchQueue.main.async { completion(.failure(error)) }
                return
            }

            guard let data = data else {
                DispatchQueue.main.async { completion(.failure(NSError(domain: "TripSafety", code: -1, userInfo: [NSLocalizedDescriptionKey: "No data"]))) }
                return
            }

            do {
                let agreement = try JSONDecoder().decode(TripSafetyAgreement.self, from: data)
                DispatchQueue.main.async { completion(.success(agreement)) }
            } catch {
                DispatchQueue.main.async { completion(.failure(error)) }
            }
        }.resume()
    }

    /// Get your verification code to show the other party
    public func getMyVerificationCode(matchId: String, userEmail: String, userRole: String, completion: @escaping (Result<VerificationCodeResponse, Error>) -> Void) {
        guard var components = URLComponents(string: "\(baseURL)/api/trip-board/safety/my-verification-code/\(matchId)") else {
            DispatchQueue.main.async { completion(.failure(NSError(domain: "TripSafety", code: -2, userInfo: [NSLocalizedDescriptionKey: "Invalid URL"]))) }
            return
        }
        components.queryItems = [
            URLQueryItem(name: "user_email", value: userEmail),
            URLQueryItem(name: "user_role", value: userRole)
        ]

        guard let url = components.url else {
            DispatchQueue.main.async { completion(.failure(NSError(domain: "TripSafety", code: -2, userInfo: [NSLocalizedDescriptionKey: "Invalid URL"]))) }
            return
        }
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        session.dataTask(with: request) { data, response, error in
            if let error = error {
                DispatchQueue.main.async { completion(.failure(error)) }
                return
            }

            guard let data = data else {
                DispatchQueue.main.async { completion(.failure(NSError(domain: "TripSafety", code: -1, userInfo: [NSLocalizedDescriptionKey: "No data"]))) }
                return
            }

            do {
                let response = try JSONDecoder().decode(VerificationCodeResponse.self, from: data)
                DispatchQueue.main.async { completion(.success(response)) }
            } catch {
                DispatchQueue.main.async { completion(.failure(error)) }
            }
        }.resume()
    }

    /// Give recording consent
    public func giveRecordingConsent(matchId: String, userEmail: String, userRole: String, consent: Bool, completion: @escaping (Result<SafetyActionResponse, Error>) -> Void) {
        guard let url = URL(string: "\(baseURL)/api/trip-board/safety/recording-consent") else {
            DispatchQueue.main.async { completion(.failure(NSError(domain: "TripSafety", code: -2, userInfo: [NSLocalizedDescriptionKey: "Invalid URL"]))) }
            return
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let body: [String: Any] = [
            "match_id": matchId,
            "user_email": userEmail,
            "user_role": userRole,
            "consent": consent
        ]

        do {
            request.httpBody = try JSONSerialization.data(withJSONObject: body)
        } catch {
            completion(.failure(error))
            return
        }

        session.dataTask(with: request) { data, response, error in
            if let error = error {
                DispatchQueue.main.async { completion(.failure(error)) }
                return
            }

            guard let data = data else {
                DispatchQueue.main.async { completion(.failure(NSError(domain: "TripSafety", code: -1, userInfo: [NSLocalizedDescriptionKey: "No data"]))) }
                return
            }

            do {
                let response = try JSONDecoder().decode(SafetyActionResponse.self, from: data)
                DispatchQueue.main.async { completion(.success(response)) }
            } catch {
                DispatchQueue.main.async { completion(.failure(error)) }
            }
        }.resume()
    }

    /// Confirm payment arrangement
    public func confirmPayment(matchId: String, userEmail: String, userRole: String, paymentMethod: String?, amount: Double?, completion: @escaping (Result<SafetyActionResponse, Error>) -> Void) {
        guard let url = URL(string: "\(baseURL)/api/trip-board/safety/confirm-payment") else {
            DispatchQueue.main.async { completion(.failure(NSError(domain: "TripSafety", code: -2, userInfo: [NSLocalizedDescriptionKey: "Invalid URL"]))) }
            return
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        var body: [String: Any] = [
            "match_id": matchId,
            "user_email": userEmail,
            "user_role": userRole
        ]
        if let method = paymentMethod { body["payment_method"] = method }
        if let amt = amount { body["amount"] = amt }

        do {
            request.httpBody = try JSONSerialization.data(withJSONObject: body)
        } catch {
            completion(.failure(error))
            return
        }

        session.dataTask(with: request) { data, response, error in
            if let error = error {
                DispatchQueue.main.async { completion(.failure(error)) }
                return
            }

            guard let data = data else {
                DispatchQueue.main.async { completion(.failure(NSError(domain: "TripSafety", code: -1, userInfo: [NSLocalizedDescriptionKey: "No data"]))) }
                return
            }

            do {
                let response = try JSONDecoder().decode(SafetyActionResponse.self, from: data)
                DispatchQueue.main.async { completion(.success(response)) }
            } catch {
                DispatchQueue.main.async { completion(.failure(error)) }
            }
        }.resume()
    }

    /// Verify the other party's identity by entering their code
    public func verifyIdentity(matchId: String, userEmail: String, userRole: String, verificationCode: String, completion: @escaping (Result<SafetyActionResponse, Error>) -> Void) {
        guard let url = URL(string: "\(baseURL)/api/trip-board/safety/verify-identity") else {
            DispatchQueue.main.async { completion(.failure(NSError(domain: "TripSafety", code: -2, userInfo: [NSLocalizedDescriptionKey: "Invalid URL"]))) }
            return
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let body: [String: Any] = [
            "match_id": matchId,
            "user_email": userEmail,
            "user_role": userRole,
            "verification_code": verificationCode
        ]

        do {
            request.httpBody = try JSONSerialization.data(withJSONObject: body)
        } catch {
            completion(.failure(error))
            return
        }

        session.dataTask(with: request) { data, response, error in
            if let error = error {
                DispatchQueue.main.async { completion(.failure(error)) }
                return
            }

            guard let data = data else {
                DispatchQueue.main.async { completion(.failure(NSError(domain: "TripSafety", code: -1, userInfo: [NSLocalizedDescriptionKey: "No data"]))) }
                return
            }

            do {
                let response = try JSONDecoder().decode(SafetyActionResponse.self, from: data)
                DispatchQueue.main.async { completion(.success(response)) }
            } catch {
                DispatchQueue.main.async { completion(.failure(error)) }
            }
        }.resume()
    }

    /// Get safety checklist items
    public func getSafetyChecklist(completion: @escaping (Result<SafetyChecklistResponse, Error>) -> Void) {
        guard let url = URL(string: "\(baseURL)/api/trip-board/safety/safety-checklist-items") else {
            DispatchQueue.main.async { completion(.failure(NSError(domain: "TripSafety", code: -2, userInfo: [NSLocalizedDescriptionKey: "Invalid URL"]))) }
            return
        }

        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        session.dataTask(with: request) { data, response, error in
            if let error = error {
                DispatchQueue.main.async { completion(.failure(error)) }
                return
            }

            guard let data = data else {
                DispatchQueue.main.async { completion(.failure(NSError(domain: "TripSafety", code: -1, userInfo: [NSLocalizedDescriptionKey: "No data"]))) }
                return
            }

            do {
                let response = try JSONDecoder().decode(SafetyChecklistResponse.self, from: data)
                DispatchQueue.main.async { completion(.success(response)) }
            } catch {
                DispatchQueue.main.async { completion(.failure(error)) }
            }
        }.resume()
    }

    /// Acknowledge safety checklist
    public func acknowledgeSafetyChecklist(matchId: String, userEmail: String, userRole: String, acknowledgedItems: [String], completion: @escaping (Result<SafetyActionResponse, Error>) -> Void) {
        guard let url = URL(string: "\(baseURL)/api/trip-board/safety/safety-checklist") else {
            DispatchQueue.main.async { completion(.failure(NSError(domain: "TripSafety", code: -2, userInfo: [NSLocalizedDescriptionKey: "Invalid URL"]))) }
            return
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let body: [String: Any] = [
            "match_id": matchId,
            "user_email": userEmail,
            "user_role": userRole,
            "acknowledged_items": acknowledgedItems
        ]

        do {
            request.httpBody = try JSONSerialization.data(withJSONObject: body)
        } catch {
            completion(.failure(error))
            return
        }

        session.dataTask(with: request) { data, response, error in
            if let error = error {
                DispatchQueue.main.async { completion(.failure(error)) }
                return
            }

            guard let data = data else {
                DispatchQueue.main.async { completion(.failure(NSError(domain: "TripSafety", code: -1, userInfo: [NSLocalizedDescriptionKey: "No data"]))) }
                return
            }

            do {
                let response = try JSONDecoder().decode(SafetyActionResponse.self, from: data)
                DispatchQueue.main.async { completion(.success(response)) }
            } catch {
                DispatchQueue.main.async { completion(.failure(error)) }
            }
        }.resume()
    }

    /// Update trip status (started/completed)
    public func updateTripStatus(matchId: String, userEmail: String, userRole: String, status: String, completion: @escaping (Result<SafetyActionResponse, Error>) -> Void) {
        guard let url = URL(string: "\(baseURL)/api/trip-board/safety/trip-status") else {
            DispatchQueue.main.async { completion(.failure(NSError(domain: "TripSafety", code: -2, userInfo: [NSLocalizedDescriptionKey: "Invalid URL"]))) }
            return
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let body: [String: Any] = [
            "match_id": matchId,
            "user_email": userEmail,
            "user_role": userRole,
            "status": status
        ]

        do {
            request.httpBody = try JSONSerialization.data(withJSONObject: body)
        } catch {
            completion(.failure(error))
            return
        }

        session.dataTask(with: request) { data, response, error in
            if let error = error {
                DispatchQueue.main.async { completion(.failure(error)) }
                return
            }

            guard let data = data else {
                DispatchQueue.main.async { completion(.failure(NSError(domain: "TripSafety", code: -1, userInfo: [NSLocalizedDescriptionKey: "No data"]))) }
                return
            }

            do {
                let response = try JSONDecoder().decode(SafetyActionResponse.self, from: data)
                DispatchQueue.main.async { completion(.success(response)) }
            } catch {
                DispatchQueue.main.async { completion(.failure(error)) }
            }
        }.resume()
    }

    /// Get pre-trip safety summary
    public func getPreTripSummary(matchId: String, userEmail: String, userRole: String, completion: @escaping (Result<PreTripSummary, Error>) -> Void) {
        guard var components = URLComponents(string: "\(baseURL)/api/trip-board/safety/pre-trip-summary/\(matchId)") else {
            DispatchQueue.main.async { completion(.failure(NSError(domain: "TripSafety", code: -2, userInfo: [NSLocalizedDescriptionKey: "Invalid URL"]))) }
            return
        }
        components.queryItems = [
            URLQueryItem(name: "user_email", value: userEmail),
            URLQueryItem(name: "user_role", value: userRole)
        ]

        guard let url = components.url else {
            DispatchQueue.main.async { completion(.failure(NSError(domain: "TripSafety", code: -2, userInfo: [NSLocalizedDescriptionKey: "Invalid URL"]))) }
            return
        }
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        session.dataTask(with: request) { data, response, error in
            if let error = error {
                DispatchQueue.main.async { completion(.failure(error)) }
                return
            }

            guard let data = data else {
                DispatchQueue.main.async { completion(.failure(NSError(domain: "TripSafety", code: -1, userInfo: [NSLocalizedDescriptionKey: "No data"]))) }
                return
            }

            do {
                let summary = try JSONDecoder().decode(PreTripSummary.self, from: data)
                DispatchQueue.main.async { completion(.success(summary)) }
            } catch {
                DispatchQueue.main.async { completion(.failure(error)) }
            }
        }.resume()
    }
}

// MARK: - Legal Constants

public enum TripBoardLegal {
    public static let platformDisclaimer = """
    IMPORTANT LEGAL NOTICE:

    Dollor.ai Trip Board is a MATCHMAKING SERVICE, not a transportation company.
    We are a bulletin board where individuals can post and browse trip listings.

    FREE to use:
    - Post listings
    - Browse listings
    - Send messages
    - Negotiate terms

    PAID ($1 each):
    - Only when BOTH parties confirm a match

    Dollor.ai does NOT:
    - Provide transportation services
    - Calculate or suggest fares
    - Process ride payments
    - Verify users or drivers
    - Guarantee any arrangements

    All arrangements are private matters between individual users.
    """

    public static let listingDisclaimer = """
    This is a USER-GENERATED listing. Dollor.ai does not verify, endorse, or
    guarantee any information in this listing. Contact the poster directly to
    verify all details. Arrange transportation at your own risk.
    """

    public static let matchFeeDisclaimer = """
    The $1.00 match success fee is for MATCHMAKING SERVICES on Dollor.ai.
    This fee is NOT a transportation fee, booking fee, or commission.
    You only pay when both parties confirm they want to connect.
    """

    public static let matchDisclaimer = """
    By confirming this match, you agree to pay a $1 matchmaking service fee. This fee is for Dollor.ai's matchmaking platform service, NOT for transportation. Dollor.ai is not a party to any arrangement you make. Any transportation you arrange is a private matter between you and the other user. You assume all risks.
    """

    public static let messageDisclaimer = """
    Messaging is FREE. By contacting this user, you acknowledge that Dollor.ai is a bulletin board service, not a transportation company. We do not verify users. Any arrangements you make are private matters. Exercise caution when meeting strangers.
    """
}
