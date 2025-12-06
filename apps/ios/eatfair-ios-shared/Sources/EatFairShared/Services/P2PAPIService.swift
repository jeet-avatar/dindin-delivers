import Foundation
import Combine

/// P2P Platform API Service
/// Connects iOS apps to the P2P backend for restaurant data, menus, and orders
public class P2PAPIService: ObservableObject {
    public static let shared = P2PAPIService()

    // MARK: - Configuration
    // Production URL - connected to Dollar.ai live backend
    private let baseURL = "https://dollor.ai/api"

    @Published public var isLoading = false
    @Published public var error: String?

    private var cancellables = Set<AnyCancellable>()

    private init() {}

    // MARK: - Public Restaurant APIs (Customer App)

    /// Fetch all available restaurants with addresses and menu previews
    public func fetchRestaurants(
        city: String? = nil,
        cuisine: String? = nil,
        completion: @escaping (Result<[P2PRestaurant], Error>) -> Void
    ) {
        var urlComponents = URLComponents(string: "\(baseURL)/public/restaurants")!
        var queryItems: [URLQueryItem] = []

        if let city = city {
            queryItems.append(URLQueryItem(name: "city", value: city))
        }
        if let cuisine = cuisine {
            queryItems.append(URLQueryItem(name: "cuisine", value: cuisine))
        }

        if !queryItems.isEmpty {
            urlComponents.queryItems = queryItems
        }

        guard let url = urlComponents.url else {
            completion(.failure(P2PAPIError.invalidURL))
            return
        }

        isLoading = true

        URLSession.shared.dataTask(with: url) { [weak self] data, response, error in
            DispatchQueue.main.async {
                self?.isLoading = false

                if let error = error {
                    self?.error = error.localizedDescription
                    completion(.failure(error))
                    return
                }

                guard let data = data else {
                    completion(.failure(P2PAPIError.noData))
                    return
                }

                do {
                    let response = try JSONDecoder().decode(P2PRestaurantsResponse.self, from: data)
                    completion(.success(response.restaurants))
                } catch {
                    self?.error = "Failed to decode restaurants: \(error.localizedDescription)"
                    completion(.failure(error))
                }
            }
        }.resume()
    }

    /// Fetch restaurant detail with full menu
    public func fetchRestaurantDetail(
        vendorId: Int,
        completion: @escaping (Result<P2PRestaurantDetail, Error>) -> Void
    ) {
        guard let url = URL(string: "\(baseURL)/public/restaurants/\(vendorId)") else {
            completion(.failure(P2PAPIError.invalidURL))
            return
        }

        isLoading = true

        URLSession.shared.dataTask(with: url) { [weak self] data, response, error in
            DispatchQueue.main.async {
                self?.isLoading = false

                if let error = error {
                    self?.error = error.localizedDescription
                    completion(.failure(error))
                    return
                }

                guard let data = data else {
                    completion(.failure(P2PAPIError.noData))
                    return
                }

                do {
                    let response = try JSONDecoder().decode(P2PRestaurantDetailResponse.self, from: data)
                    completion(.success(response.toDetail()))
                } catch {
                    self?.error = "Failed to decode restaurant detail: \(error.localizedDescription)"
                    completion(.failure(error))
                }
            }
        }.resume()
    }

    /// Fetch vendor profile info (for Restaurant App settings)
    /// Uses public endpoint so no auth required
    public func fetchVendorProfile(
        vendorId: Int,
        completion: @escaping (Result<P2PVendorProfile, Error>) -> Void
    ) {
        guard let url = URL(string: "\(baseURL)/public/restaurants/\(vendorId)") else {
            completion(.failure(P2PAPIError.invalidURL))
            return
        }

        isLoading = true

        URLSession.shared.dataTask(with: url) { [weak self] data, response, error in
            DispatchQueue.main.async {
                self?.isLoading = false

                if let error = error {
                    self?.error = error.localizedDescription
                    completion(.failure(error))
                    return
                }

                guard let data = data else {
                    completion(.failure(P2PAPIError.noData))
                    return
                }

                do {
                    let response = try JSONDecoder().decode(P2PVendorProfileResponse.self, from: data)
                    completion(.success(response.restaurant))
                } catch {
                    self?.error = "Failed to decode vendor profile: \(error.localizedDescription)"
                    print("Vendor profile decode error: \(error)")
                    completion(.failure(error))
                }
            }
        }.resume()
    }

    // MARK: - Restaurant App APIs (Menu Management)

    /// Fetch menu items for a vendor (Restaurant App)
    public func fetchMenuItems(
        vendorId: Int,
        completion: @escaping (Result<[P2PMenuItem], Error>) -> Void
    ) {
        guard let url = URL(string: "\(baseURL)/vendors/\(vendorId)/menu") else {
            completion(.failure(P2PAPIError.invalidURL))
            return
        }

        isLoading = true

        URLSession.shared.dataTask(with: url) { [weak self] data, response, error in
            DispatchQueue.main.async {
                self?.isLoading = false

                if let error = error {
                    self?.error = error.localizedDescription
                    completion(.failure(error))
                    return
                }

                guard let data = data else {
                    completion(.failure(P2PAPIError.noData))
                    return
                }

                do {
                    // Backend returns array directly, not wrapped in response object
                    let items = try JSONDecoder().decode([P2PMenuItem].self, from: data)
                    completion(.success(items))
                } catch {
                    self?.error = "Failed to decode menu items: \(error.localizedDescription)"
                    print("Decode error: \(error)")
                    completion(.failure(error))
                }
            }
        }.resume()
    }

    /// Update a menu item (Restaurant App)
    public func updateMenuItem(
        vendorId: Int,
        itemId: Int,
        updates: [String: Any],
        completion: @escaping (Result<P2PMenuItem, Error>) -> Void
    ) {
        guard let url = URL(string: "\(baseURL)/vendors/\(vendorId)/menu/\(itemId)") else {
            completion(.failure(P2PAPIError.invalidURL))
            return
        }

        var request = URLRequest(url: url)
        request.httpMethod = "PATCH"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        do {
            request.httpBody = try JSONSerialization.data(withJSONObject: updates)
        } catch {
            completion(.failure(error))
            return
        }

        URLSession.shared.dataTask(with: request) { [weak self] data, response, error in
            DispatchQueue.main.async {
                if let error = error {
                    self?.error = error.localizedDescription
                    completion(.failure(error))
                    return
                }

                guard let data = data else {
                    completion(.failure(P2PAPIError.noData))
                    return
                }

                do {
                    let response = try JSONDecoder().decode(P2PMenuItemResponse.self, from: data)
                    completion(.success(response.item))
                } catch {
                    self?.error = "Failed to decode updated item: \(error.localizedDescription)"
                    completion(.failure(error))
                }
            }
        }.resume()
    }

    /// Toggle menu item availability (Restaurant App)
    public func toggleItemAvailability(
        vendorId: Int,
        itemId: Int,
        inStock: Bool,
        completion: @escaping (Result<Bool, Error>) -> Void
    ) {
        updateMenuItem(vendorId: vendorId, itemId: itemId, updates: ["in_stock": inStock]) { result in
            switch result {
            case .success(let item):
                completion(.success(item.inStock))
            case .failure(let error):
                completion(.failure(error))
            }
        }
    }

    /// Assign stock images to menu items without images
    public func assignStockImages(
        vendorId: Int,
        completion: @escaping (Result<Int, Error>) -> Void
    ) {
        guard let url = URL(string: "\(baseURL)/vendors/\(vendorId)/menu/assign-stock-images") else {
            completion(.failure(P2PAPIError.invalidURL))
            return
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"

        URLSession.shared.dataTask(with: request) { [weak self] data, response, error in
            DispatchQueue.main.async {
                if let error = error {
                    self?.error = error.localizedDescription
                    completion(.failure(error))
                    return
                }

                guard let data = data else {
                    completion(.failure(P2PAPIError.noData))
                    return
                }

                do {
                    let response = try JSONDecoder().decode(P2PStockImageResponse.self, from: data)
                    completion(.success(response.itemsUpdated))
                } catch {
                    self?.error = "Failed to assign stock images: \(error.localizedDescription)"
                    completion(.failure(error))
                }
            }
        }.resume()
    }

    // MARK: - Menu Verification APIs (Aria AI Employee)

    /// Get menu verification status
    public func getVerificationStatus(
        vendorId: Int,
        completion: @escaping (Result<P2PVerificationStatus, Error>) -> Void
    ) {
        guard let url = URL(string: "\(baseURL)/menu-verification/status/\(vendorId)") else {
            completion(.failure(P2PAPIError.invalidURL))
            return
        }

        URLSession.shared.dataTask(with: url) { [weak self] data, response, error in
            DispatchQueue.main.async {
                if let error = error {
                    self?.error = error.localizedDescription
                    completion(.failure(error))
                    return
                }

                guard let data = data else {
                    completion(.failure(P2PAPIError.noData))
                    return
                }

                do {
                    let status = try JSONDecoder().decode(P2PVerificationStatus.self, from: data)
                    completion(.success(status))
                } catch {
                    self?.error = "Failed to decode verification status: \(error.localizedDescription)"
                    completion(.failure(error))
                }
            }
        }.resume()
    }

    /// Approve all prices (Aria AI)
    public func approveAllPrices(
        vendorId: Int,
        completion: @escaping (Result<Bool, Error>) -> Void
    ) {
        guard let url = URL(string: "\(baseURL)/menu-verification/approve-all/\(vendorId)") else {
            completion(.failure(P2PAPIError.invalidURL))
            return
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"

        URLSession.shared.dataTask(with: request) { [weak self] data, response, error in
            DispatchQueue.main.async {
                if let error = error {
                    self?.error = error.localizedDescription
                    completion(.failure(error))
                    return
                }

                guard let data = data else {
                    completion(.failure(P2PAPIError.noData))
                    return
                }

                do {
                    let response = try JSONDecoder().decode(P2PApprovalResponse.self, from: data)
                    completion(.success(response.success))
                } catch {
                    self?.error = "Failed to approve prices: \(error.localizedDescription)"
                    completion(.failure(error))
                }
            }
        }.resume()
    }

    // MARK: - Vendor Authentication

    /// Login as a vendor (restaurant owner)
    public func vendorLogin(
        email: String,
        password: String,
        completion: @escaping (Result<P2PLoginResponse, Error>) -> Void
    ) {
        guard let url = URL(string: "\(baseURL)/auth/vendor/login") else {
            completion(.failure(P2PAPIError.invalidURL))
            return
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/x-www-form-urlencoded", forHTTPHeaderField: "Content-Type")

        let bodyString = "username=\(email)&password=\(password)"
        request.httpBody = bodyString.data(using: .utf8)

        isLoading = true

        URLSession.shared.dataTask(with: request) { [weak self] data, response, error in
            DispatchQueue.main.async {
                self?.isLoading = false

                if let error = error {
                    self?.error = error.localizedDescription
                    completion(.failure(error))
                    return
                }

                guard let data = data else {
                    completion(.failure(P2PAPIError.noData))
                    return
                }

                // Check for error response
                if let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode != 200 {
                    if let errorResponse = try? JSONDecoder().decode(P2PErrorResponse.self, from: data) {
                        completion(.failure(P2PAPIError.serverError(errorResponse.detail)))
                    } else {
                        completion(.failure(P2PAPIError.serverError("Login failed")))
                    }
                    return
                }

                do {
                    let loginResponse = try JSONDecoder().decode(P2PLoginResponse.self, from: data)
                    // Store the token
                    UserDefaults.standard.set(loginResponse.accessToken, forKey: "p2p_access_token")
                    UserDefaults.standard.set(loginResponse.user.vendorId, forKey: "p2p_vendor_id")
                    completion(.success(loginResponse))
                } catch {
                    self?.error = "Failed to decode login response: \(error.localizedDescription)"
                    completion(.failure(error))
                }
            }
        }.resume()
    }

    /// Get stored vendor ID
    public var currentVendorId: Int? {
        return UserDefaults.standard.object(forKey: "p2p_vendor_id") as? Int
    }

    /// Check if logged in
    public var isLoggedIn: Bool {
        return UserDefaults.standard.string(forKey: "p2p_access_token") != nil
    }

    /// Logout
    public func logout() {
        UserDefaults.standard.removeObject(forKey: "p2p_access_token")
        UserDefaults.standard.removeObject(forKey: "p2p_vendor_id")
    }

    /// Register a new vendor
    public func vendorRegister(
        email: String,
        password: String,
        restaurantName: String,
        completion: @escaping (Result<P2PLoginResponse, Error>) -> Void
    ) {
        guard let url = URL(string: "\(baseURL)/auth/vendor/register") else {
            completion(.failure(P2PAPIError.invalidURL))
            return
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let body: [String: Any] = [
            "email": email,
            "password": password,
            "full_name": restaurantName,
            "restaurant_name": restaurantName
        ]

        request.httpBody = try? JSONSerialization.data(withJSONObject: body)

        isLoading = true
        error = nil

        URLSession.shared.dataTask(with: request) { [weak self] data, response, error in
            DispatchQueue.main.async {
                self?.isLoading = false

                if let error = error {
                    self?.error = error.localizedDescription
                    completion(.failure(error))
                    return
                }

                guard let data = data else {
                    completion(.failure(P2PAPIError.noData))
                    return
                }

                // Check for error response
                if let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode >= 400 {
                    if let errorResponse = try? JSONDecoder().decode(P2PErrorResponse.self, from: data) {
                        completion(.failure(P2PAPIError.serverError(errorResponse.detail)))
                    } else {
                        completion(.failure(P2PAPIError.serverError("Registration failed")))
                    }
                    return
                }

                do {
                    let loginResponse = try JSONDecoder().decode(P2PLoginResponse.self, from: data)
                    // Store the token
                    UserDefaults.standard.set(loginResponse.accessToken, forKey: "p2p_access_token")
                    UserDefaults.standard.set(loginResponse.user.vendorId, forKey: "p2p_vendor_id")
                    completion(.success(loginResponse))
                } catch {
                    self?.error = "Failed to decode response: \(error.localizedDescription)"
                    completion(.failure(error))
                }
            }
        }.resume()
    }

    /// Request password reset
    public func requestPasswordReset(
        email: String,
        completion: @escaping (Result<Void, Error>) -> Void
    ) {
        guard let url = URL(string: "\(baseURL)/auth/password-reset/request") else {
            completion(.failure(P2PAPIError.invalidURL))
            return
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let body: [String: Any] = ["email": email]
        request.httpBody = try? JSONSerialization.data(withJSONObject: body)

        isLoading = true
        error = nil

        URLSession.shared.dataTask(with: request) { [weak self] data, response, error in
            DispatchQueue.main.async {
                self?.isLoading = false

                if let error = error {
                    self?.error = error.localizedDescription
                    completion(.failure(error))
                    return
                }

                if let httpResponse = response as? HTTPURLResponse {
                    if httpResponse.statusCode >= 200 && httpResponse.statusCode < 300 {
                        completion(.success(()))
                    } else if let data = data,
                              let errorResponse = try? JSONDecoder().decode(P2PErrorResponse.self, from: data) {
                        completion(.failure(P2PAPIError.serverError(errorResponse.detail)))
                    } else {
                        completion(.failure(P2PAPIError.serverError("Password reset request failed")))
                    }
                } else {
                    completion(.failure(P2PAPIError.noData))
                }
            }
        }.resume()
    }

    // MARK: - Customer Authentication

    /// Customer login
    public func customerLogin(
        email: String,
        password: String,
        completion: @escaping (Result<P2PCustomerLoginResponse, Error>) -> Void
    ) {
        guard let url = URL(string: "\(baseURL)/customer/login") else {
            completion(.failure(P2PAPIError.invalidURL))
            return
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let body: [String: Any] = ["email": email, "password": password]
        request.httpBody = try? JSONSerialization.data(withJSONObject: body)

        isLoading = true

        URLSession.shared.dataTask(with: request) { [weak self] data, response, error in
            DispatchQueue.main.async {
                self?.isLoading = false

                if let error = error {
                    self?.error = error.localizedDescription
                    completion(.failure(error))
                    return
                }

                guard let data = data else {
                    completion(.failure(P2PAPIError.noData))
                    return
                }

                if let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode >= 400 {
                    if let errorResponse = try? JSONDecoder().decode(P2PErrorResponse.self, from: data) {
                        completion(.failure(P2PAPIError.serverError(errorResponse.detail)))
                    } else {
                        completion(.failure(P2PAPIError.serverError("Login failed")))
                    }
                    return
                }

                do {
                    let loginResponse = try JSONDecoder().decode(P2PCustomerLoginResponse.self, from: data)
                    UserDefaults.standard.set(loginResponse.accessToken, forKey: "p2p_customer_access_token")
                    UserDefaults.standard.set(loginResponse.customerId, forKey: "p2p_customer_id")
                    completion(.success(loginResponse))
                } catch {
                    self?.error = "Failed to decode login response: \(error.localizedDescription)"
                    completion(.failure(error))
                }
            }
        }.resume()
    }

    /// Google OAuth login/registration for customers
    /// This endpoint handles both login and registration - if user exists, logs them in; if not, registers them
    public func customerGoogleAuth(
        email: String,
        name: String,
        googleId: String,
        completion: @escaping (Result<P2PCustomerLoginResponse, Error>) -> Void
    ) {
        guard let url = URL(string: "\(baseURL)/customer/google-auth") else {
            completion(.failure(P2PAPIError.invalidURL))
            return
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let body: [String: Any] = [
            "email": email,
            "name": name,
            "google_id": googleId
        ]
        request.httpBody = try? JSONSerialization.data(withJSONObject: body)

        isLoading = true

        URLSession.shared.dataTask(with: request) { [weak self] data, response, error in
            DispatchQueue.main.async {
                self?.isLoading = false

                if let error = error {
                    self?.error = error.localizedDescription
                    completion(.failure(error))
                    return
                }

                guard let data = data else {
                    completion(.failure(P2PAPIError.noData))
                    return
                }

                if let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode >= 400 {
                    if let errorResponse = try? JSONDecoder().decode(P2PErrorResponse.self, from: data) {
                        completion(.failure(P2PAPIError.serverError(errorResponse.detail)))
                    } else {
                        completion(.failure(P2PAPIError.serverError("Google auth failed")))
                    }
                    return
                }

                do {
                    let loginResponse = try JSONDecoder().decode(P2PCustomerLoginResponse.self, from: data)
                    UserDefaults.standard.set(loginResponse.accessToken, forKey: "p2p_customer_access_token")
                    UserDefaults.standard.set(loginResponse.customerId, forKey: "p2p_customer_id")
                    completion(.success(loginResponse))
                } catch {
                    self?.error = "Failed to decode Google auth response: \(error.localizedDescription)"
                    completion(.failure(error))
                }
            }
        }.resume()
    }

    /// Apple OAuth login/registration for customers
    /// This endpoint handles both login and registration - if user exists, logs them in; if not, registers them
    public func customerAppleAuth(
        email: String,
        name: String,
        appleId: String,
        completion: @escaping (Result<P2PCustomerLoginResponse, Error>) -> Void
    ) {
        guard let url = URL(string: "\(baseURL)/customer/apple-auth") else {
            completion(.failure(P2PAPIError.invalidURL))
            return
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let body: [String: Any] = [
            "email": email,
            "name": name,
            "apple_id": appleId
        ]
        request.httpBody = try? JSONSerialization.data(withJSONObject: body)

        isLoading = true

        URLSession.shared.dataTask(with: request) { [weak self] data, response, error in
            DispatchQueue.main.async {
                self?.isLoading = false

                if let error = error {
                    self?.error = error.localizedDescription
                    completion(.failure(error))
                    return
                }

                guard let data = data else {
                    completion(.failure(P2PAPIError.noData))
                    return
                }

                if let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode >= 400 {
                    if let errorResponse = try? JSONDecoder().decode(P2PErrorResponse.self, from: data) {
                        completion(.failure(P2PAPIError.serverError(errorResponse.detail)))
                    } else {
                        completion(.failure(P2PAPIError.serverError("Apple auth failed")))
                    }
                    return
                }

                do {
                    let loginResponse = try JSONDecoder().decode(P2PCustomerLoginResponse.self, from: data)
                    UserDefaults.standard.set(loginResponse.accessToken, forKey: "p2p_customer_access_token")
                    UserDefaults.standard.set(loginResponse.customerId, forKey: "p2p_customer_id")
                    completion(.success(loginResponse))
                } catch {
                    self?.error = "Failed to decode Apple auth response: \(error.localizedDescription)"
                    completion(.failure(error))
                }
            }
        }.resume()
    }

    /// Request password reset - sends reset code to email
    public func requestPasswordReset(
        email: String,
        completion: @escaping (Result<P2PPasswordResetResponse, Error>) -> Void
    ) {
        guard let url = URL(string: "\(baseURL)/customer/password-reset/request") else {
            completion(.failure(P2PAPIError.invalidURL))
            return
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let body: [String: Any] = ["email": email]
        request.httpBody = try? JSONSerialization.data(withJSONObject: body)

        isLoading = true

        URLSession.shared.dataTask(with: request) { [weak self] data, response, error in
            DispatchQueue.main.async {
                self?.isLoading = false

                if let error = error {
                    self?.error = error.localizedDescription
                    completion(.failure(error))
                    return
                }

                guard let data = data else {
                    completion(.failure(P2PAPIError.noData))
                    return
                }

                if let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode >= 400 {
                    if let errorResponse = try? JSONDecoder().decode(P2PErrorResponse.self, from: data) {
                        completion(.failure(P2PAPIError.serverError(errorResponse.detail)))
                    } else {
                        completion(.failure(P2PAPIError.serverError("Password reset request failed")))
                    }
                    return
                }

                do {
                    let resetResponse = try JSONDecoder().decode(P2PPasswordResetResponse.self, from: data)
                    completion(.success(resetResponse))
                } catch {
                    self?.error = "Failed to decode response: \(error.localizedDescription)"
                    completion(.failure(error))
                }
            }
        }.resume()
    }

    /// Confirm password reset with code and new password
    public func confirmPasswordReset(
        email: String,
        code: String,
        newPassword: String,
        completion: @escaping (Result<P2PPasswordResetResponse, Error>) -> Void
    ) {
        guard let url = URL(string: "\(baseURL)/customer/password-reset/confirm") else {
            completion(.failure(P2PAPIError.invalidURL))
            return
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let body: [String: Any] = [
            "email": email,
            "code": code,
            "new_password": newPassword
        ]
        request.httpBody = try? JSONSerialization.data(withJSONObject: body)

        isLoading = true

        URLSession.shared.dataTask(with: request) { [weak self] data, response, error in
            DispatchQueue.main.async {
                self?.isLoading = false

                if let error = error {
                    self?.error = error.localizedDescription
                    completion(.failure(error))
                    return
                }

                guard let data = data else {
                    completion(.failure(P2PAPIError.noData))
                    return
                }

                if let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode >= 400 {
                    if let errorResponse = try? JSONDecoder().decode(P2PErrorResponse.self, from: data) {
                        completion(.failure(P2PAPIError.serverError(errorResponse.detail)))
                    } else {
                        completion(.failure(P2PAPIError.serverError("Password reset confirmation failed")))
                    }
                    return
                }

                do {
                    let resetResponse = try JSONDecoder().decode(P2PPasswordResetResponse.self, from: data)
                    completion(.success(resetResponse))
                } catch {
                    self?.error = "Failed to decode response: \(error.localizedDescription)"
                    completion(.failure(error))
                }
            }
        }.resume()
    }

    /// Customer registration
    public func customerRegister(
        email: String,
        password: String,
        fullName: String,
        phone: String,
        completion: @escaping (Result<P2PCustomerLoginResponse, Error>) -> Void
    ) {
        guard let url = URL(string: "\(baseURL)/customer/register") else {
            completion(.failure(P2PAPIError.invalidURL))
            return
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        // Backend expects "name", not "full_name"
        let body: [String: Any] = [
            "email": email,
            "password": password,
            "name": fullName,
            "phone": phone
        ]
        request.httpBody = try? JSONSerialization.data(withJSONObject: body)

        isLoading = true

        URLSession.shared.dataTask(with: request) { [weak self] data, response, error in
            DispatchQueue.main.async {
                self?.isLoading = false

                if let error = error {
                    self?.error = error.localizedDescription
                    completion(.failure(error))
                    return
                }

                guard let data = data else {
                    completion(.failure(P2PAPIError.noData))
                    return
                }

                if let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode >= 400 {
                    if let errorResponse = try? JSONDecoder().decode(P2PErrorResponse.self, from: data) {
                        completion(.failure(P2PAPIError.serverError(errorResponse.detail)))
                    } else {
                        completion(.failure(P2PAPIError.serverError("Registration failed")))
                    }
                    return
                }

                do {
                    let loginResponse = try JSONDecoder().decode(P2PCustomerLoginResponse.self, from: data)
                    UserDefaults.standard.set(loginResponse.accessToken, forKey: "p2p_customer_access_token")
                    UserDefaults.standard.set(loginResponse.customerId, forKey: "p2p_customer_id")
                    UserDefaults.standard.set(loginResponse.fullName, forKey: "p2p_customer_name")
                    UserDefaults.standard.set(loginResponse.email, forKey: "p2p_customer_email")
                    completion(.success(loginResponse))
                } catch {
                    self?.error = "Failed to decode response: \(error.localizedDescription)"
                    completion(.failure(error))
                }
            }
        }.resume()
    }

    /// Get stored customer ID
    public var currentCustomerId: Int? {
        return UserDefaults.standard.object(forKey: "p2p_customer_id") as? Int
    }

    /// Check if customer is logged in
    public var isCustomerLoggedIn: Bool {
        return UserDefaults.standard.string(forKey: "p2p_customer_access_token") != nil
    }

    /// Customer logout
    public func customerLogout() {
        UserDefaults.standard.removeObject(forKey: "p2p_customer_access_token")
        UserDefaults.standard.removeObject(forKey: "p2p_customer_id")
    }

    // MARK: - Customer Order APIs

    /// Fetch all orders for the current customer
    public func fetchCustomerOrders(
        completion: @escaping (Result<[P2PCustomerOrder], Error>) -> Void
    ) {
        guard let url = URL(string: "\(baseURL)/customer/orders") else {
            completion(.failure(P2PAPIError.invalidURL))
            return
        }

        var request = URLRequest(url: url)
        request.httpMethod = "GET"

        // Add auth token if available
        if let token = UserDefaults.standard.string(forKey: "p2p_customer_access_token") {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        isLoading = true

        URLSession.shared.dataTask(with: request) { [weak self] data, response, error in
            DispatchQueue.main.async {
                self?.isLoading = false

                if let error = error {
                    self?.error = error.localizedDescription
                    completion(.failure(error))
                    return
                }

                guard let data = data else {
                    completion(.failure(P2PAPIError.noData))
                    return
                }

                do {
                    let orders = try JSONDecoder().decode([P2PCustomerOrder].self, from: data)
                    completion(.success(orders))
                } catch {
                    self?.error = "Failed to decode orders: \(error.localizedDescription)"
                    print("Decode error: \(error)")
                    completion(.failure(error))
                }
            }
        }.resume()
    }

    /// Track a specific order with driver location
    public func trackOrder(
        orderId: Int,
        completion: @escaping (Result<P2POrderTracking, Error>) -> Void
    ) {
        guard let url = URL(string: "\(baseURL)/customer/orders/\(orderId)/track") else {
            completion(.failure(P2PAPIError.invalidURL))
            return
        }

        var request = URLRequest(url: url)
        request.httpMethod = "GET"

        if let token = UserDefaults.standard.string(forKey: "p2p_customer_access_token") {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        URLSession.shared.dataTask(with: request) { [weak self] data, response, error in
            DispatchQueue.main.async {
                if let error = error {
                    self?.error = error.localizedDescription
                    completion(.failure(error))
                    return
                }

                guard let data = data else {
                    completion(.failure(P2PAPIError.noData))
                    return
                }

                do {
                    let tracking = try JSONDecoder().decode(P2POrderTracking.self, from: data)
                    completion(.success(tracking))
                } catch {
                    self?.error = "Failed to decode tracking: \(error.localizedDescription)"
                    completion(.failure(error))
                }
            }
        }.resume()
    }

    /// Fetch customer's active orders (for real-time tracking)
    public func fetchActiveOrders(
        completion: @escaping (Result<[P2PCustomerOrder], Error>) -> Void
    ) {
        guard let customerId = currentCustomerId else {
            // No customer ID, return empty array (guest user)
            completion(.success([]))
            return
        }

        guard let url = URL(string: "\(baseURL)/customer/\(customerId)/active-orders") else {
            completion(.failure(P2PAPIError.invalidURL))
            return
        }

        var request = URLRequest(url: url)
        request.httpMethod = "GET"

        if let token = UserDefaults.standard.string(forKey: "p2p_customer_access_token") {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        URLSession.shared.dataTask(with: request) { [weak self] data, response, error in
            DispatchQueue.main.async {
                if let error = error {
                    self?.error = error.localizedDescription
                    completion(.failure(error))
                    return
                }

                guard let data = data else {
                    completion(.failure(P2PAPIError.noData))
                    return
                }

                do {
                    let orders = try JSONDecoder().decode([P2PCustomerOrder].self, from: data)
                    completion(.success(orders))
                } catch {
                    // Return empty array if endpoint doesn't exist yet
                    completion(.success([]))
                }
            }
        }.resume()
    }

    // MARK: - Order Creation API (Customer App)

    /// Create a new order and get backend-generated order number
    /// This ensures order numbers are synced across all three apps
    public func createOrder(
        vendorId: Int,
        customerName: String,
        customerEmail: String,
        customerPhone: String,
        deliveryAddress: [String: String],
        deliveryInstructions: String?,
        items: [[String: Any]],
        tip: Double = 0.0,
        completion: @escaping (Result<P2PCreateOrderResponse, Error>) -> Void
    ) {
        guard let url = URL(string: "\(baseURL)/erp/orders/create") else {
            completion(.failure(P2PAPIError.invalidURL))
            return
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let body: [String: Any] = [
            "vendor_id": vendorId,
            "customer_name": customerName,
            "customer_email": customerEmail,
            "customer_phone": customerPhone,
            "delivery_address": deliveryAddress,
            "delivery_instructions": deliveryInstructions ?? "",
            "items": items,
            "tip": tip
        ]

        request.httpBody = try? JSONSerialization.data(withJSONObject: body)

        isLoading = true

        URLSession.shared.dataTask(with: request) { [weak self] data, response, error in
            DispatchQueue.main.async {
                self?.isLoading = false

                if let error = error {
                    self?.error = error.localizedDescription
                    completion(.failure(error))
                    return
                }

                guard let data = data else {
                    completion(.failure(P2PAPIError.noData))
                    return
                }

                // Check for error response
                if let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode >= 400 {
                    if let errorResponse = try? JSONDecoder().decode(P2PErrorResponse.self, from: data) {
                        completion(.failure(P2PAPIError.serverError(errorResponse.detail)))
                    } else {
                        completion(.failure(P2PAPIError.serverError("Order creation failed")))
                    }
                    return
                }

                do {
                    let orderResponse = try JSONDecoder().decode(P2PCreateOrderResponse.self, from: data)
                    completion(.success(orderResponse))
                } catch {
                    self?.error = "Failed to decode order response: \(error.localizedDescription)"
                    completion(.failure(error))
                }
            }
        }.resume()
    }

    // MARK: - Vendor Orders API (Restaurant App)

    /// Fetch orders for a vendor from the P2P backend
    public func fetchVendorOrders(
        vendorId: Int,
        completion: @escaping (Result<[P2PVendorOrder], Error>) -> Void
    ) {
        guard let url = URL(string: "\(baseURL)/erp/orders/vendor/\(vendorId)") else {
            completion(.failure(P2PAPIError.invalidURL))
            return
        }

        var request = URLRequest(url: url)
        request.httpMethod = "GET"

        isLoading = true

        URLSession.shared.dataTask(with: request) { [weak self] data, response, error in
            DispatchQueue.main.async {
                self?.isLoading = false

                if let error = error {
                    self?.error = error.localizedDescription
                    completion(.failure(error))
                    return
                }

                guard let data = data else {
                    completion(.failure(P2PAPIError.noData))
                    return
                }

                do {
                    let response = try JSONDecoder().decode(P2PVendorOrdersResponse.self, from: data)
                    completion(.success(response.orders))
                } catch {
                    self?.error = "Failed to decode vendor orders: \(error.localizedDescription)"
                    completion(.failure(error))
                }
            }
        }.resume()
    }

    /// Update order status via P2P backend
    public func updateOrderStatus(
        orderId: Int,
        status: String,
        completion: @escaping (Result<Bool, Error>) -> Void
    ) {
        guard let url = URL(string: "\(baseURL)/erp/orders/\(orderId)/status?status=\(status.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? status)") else {
            completion(.failure(P2PAPIError.invalidURL))
            return
        }

        var request = URLRequest(url: url)
        request.httpMethod = "PUT"

        URLSession.shared.dataTask(with: request) { data, response, error in
            DispatchQueue.main.async {
                if let error = error {
                    completion(.failure(error))
                    return
                }

                if let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 {
                    completion(.success(true))
                } else {
                    completion(.failure(P2PAPIError.serverError("Failed to update order status")))
                }
            }
        }.resume()
    }

    /// Update vendor online/offline status
    public func updateVendorStatus(
        vendorId: Int,
        isOnline: Bool,
        completion: @escaping (Result<Bool, Error>) -> Void
    ) {
        guard let url = URL(string: "\(baseURL)/vendors/\(vendorId)/status?is_online=\(isOnline)") else {
            completion(.failure(P2PAPIError.invalidURL))
            return
        }

        var request = URLRequest(url: url)
        request.httpMethod = "PUT"

        if let token = UserDefaults.standard.string(forKey: "p2p_access_token") {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        URLSession.shared.dataTask(with: request) { data, response, error in
            DispatchQueue.main.async {
                if let error = error {
                    completion(.failure(error))
                    return
                }

                if let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 {
                    completion(.success(true))
                } else {
                    completion(.failure(P2PAPIError.serverError("Failed to update vendor status")))
                }
            }
        }.resume()
    }

    // MARK: - Driver Authentication APIs

    /// Login as a driver
    public func driverLogin(
        email: String,
        password: String,
        completion: @escaping (Result<P2PDriverLoginResponse, Error>) -> Void
    ) {
        guard let url = URL(string: "\(baseURL)/auth/driver/login") else {
            completion(.failure(P2PAPIError.invalidURL))
            return
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/x-www-form-urlencoded", forHTTPHeaderField: "Content-Type")

        let bodyString = "username=\(email)&password=\(password)"
        request.httpBody = bodyString.data(using: .utf8)

        isLoading = true

        URLSession.shared.dataTask(with: request) { [weak self] data, response, error in
            DispatchQueue.main.async {
                self?.isLoading = false

                if let error = error {
                    self?.error = error.localizedDescription
                    completion(.failure(error))
                    return
                }

                guard let data = data else {
                    completion(.failure(P2PAPIError.noData))
                    return
                }

                // Check for error response
                if let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode != 200 {
                    if let errorResponse = try? JSONDecoder().decode(P2PErrorResponse.self, from: data) {
                        completion(.failure(P2PAPIError.serverError(errorResponse.detail)))
                    } else {
                        completion(.failure(P2PAPIError.serverError("Login failed")))
                    }
                    return
                }

                do {
                    let loginResponse = try JSONDecoder().decode(P2PDriverLoginResponse.self, from: data)
                    // Store the token and driver info
                    UserDefaults.standard.set(loginResponse.accessToken, forKey: "p2p_driver_access_token")
                    UserDefaults.standard.set(loginResponse.driverId, forKey: "p2p_driver_id")
                    UserDefaults.standard.set(loginResponse.driverCode, forKey: "p2p_driver_code")
                    UserDefaults.standard.set(loginResponse.name, forKey: "p2p_driver_name")
                    UserDefaults.standard.set(loginResponse.email, forKey: "p2p_driver_email")
                    completion(.success(loginResponse))
                } catch {
                    self?.error = "Failed to decode login response: \(error.localizedDescription)"
                    completion(.failure(error))
                }
            }
        }.resume()
    }

    /// Register a new driver
    public func driverRegister(
        email: String,
        password: String,
        firstName: String,
        lastName: String,
        phone: String,
        completion: @escaping (Result<P2PDriverLoginResponse, Error>) -> Void
    ) {
        guard let url = URL(string: "\(baseURL)/auth/driver/register") else {
            completion(.failure(P2PAPIError.invalidURL))
            return
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let body: [String: Any] = [
            "email": email,
            "password": password,
            "first_name": firstName,
            "last_name": lastName,
            "phone": phone
        ]

        request.httpBody = try? JSONSerialization.data(withJSONObject: body)

        isLoading = true
        error = nil

        URLSession.shared.dataTask(with: request) { [weak self] data, response, error in
            DispatchQueue.main.async {
                self?.isLoading = false

                if let error = error {
                    self?.error = error.localizedDescription
                    completion(.failure(error))
                    return
                }

                guard let data = data else {
                    completion(.failure(P2PAPIError.noData))
                    return
                }

                // Check for error response
                if let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode >= 400 {
                    if let errorResponse = try? JSONDecoder().decode(P2PErrorResponse.self, from: data) {
                        completion(.failure(P2PAPIError.serverError(errorResponse.detail)))
                    } else {
                        completion(.failure(P2PAPIError.serverError("Registration failed")))
                    }
                    return
                }

                do {
                    let loginResponse = try JSONDecoder().decode(P2PDriverLoginResponse.self, from: data)
                    // Store the token and driver info
                    UserDefaults.standard.set(loginResponse.accessToken, forKey: "p2p_driver_access_token")
                    UserDefaults.standard.set(loginResponse.driverId, forKey: "p2p_driver_id")
                    UserDefaults.standard.set(loginResponse.driverCode, forKey: "p2p_driver_code")
                    UserDefaults.standard.set(loginResponse.name, forKey: "p2p_driver_name")
                    UserDefaults.standard.set(loginResponse.email, forKey: "p2p_driver_email")
                    completion(.success(loginResponse))
                } catch {
                    self?.error = "Failed to decode response: \(error.localizedDescription)"
                    completion(.failure(error))
                }
            }
        }.resume()
    }

    /// Get stored driver ID
    public var currentDriverId: Int? {
        return UserDefaults.standard.object(forKey: "p2p_driver_id") as? Int
    }

    /// Get stored driver name
    public var currentDriverName: String? {
        return UserDefaults.standard.string(forKey: "p2p_driver_name")
    }

    /// Get stored driver code
    public var currentDriverCode: String? {
        return UserDefaults.standard.string(forKey: "p2p_driver_code")
    }

    /// Check if driver is logged in
    public var isDriverLoggedIn: Bool {
        return UserDefaults.standard.string(forKey: "p2p_driver_access_token") != nil
    }

    /// Driver logout
    public func driverLogout() {
        UserDefaults.standard.removeObject(forKey: "p2p_driver_access_token")
        UserDefaults.standard.removeObject(forKey: "p2p_driver_id")
        UserDefaults.standard.removeObject(forKey: "p2p_driver_code")
        UserDefaults.standard.removeObject(forKey: "p2p_driver_name")
        UserDefaults.standard.removeObject(forKey: "p2p_driver_email")
    }

    /// Get driver profile from P2P API
    public func getDriverProfile(
        driverId: Int,
        completion: @escaping (Result<[String: Any], Error>) -> Void
    ) {
        guard let url = URL(string: "\(baseURL)/erp/drivers/\(driverId)") else {
            completion(.failure(P2PAPIError.invalidURL))
            return
        }

        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        // Add auth token if available
        if let token = UserDefaults.standard.string(forKey: "p2p_driver_access_token") {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        URLSession.shared.dataTask(with: request) { [weak self] data, response, error in
            DispatchQueue.main.async {
                if let error = error {
                    self?.error = error.localizedDescription
                    completion(.failure(error))
                    return
                }

                guard let data = data else {
                    completion(.failure(P2PAPIError.noData))
                    return
                }

                // Try to decode as generic dictionary
                if let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] {
                    completion(.success(json))
                } else {
                    // Return basic info from stored UserDefaults
                    let storedProfile: [String: Any] = [
                        "id": driverId,
                        "name": UserDefaults.standard.string(forKey: "p2p_driver_name") ?? "",
                        "email": UserDefaults.standard.string(forKey: "p2p_driver_email") ?? "",
                        "status": "pending",
                        "approval_status": "pending"
                    ]
                    completion(.success(storedProfile))
                }
            }
        }.resume()
    }

    // MARK: - Update Driver Profile

    /// Update driver profile information
    public func updateDriverProfile(
        driverId: Int,
        firstName: String? = nil,
        lastName: String? = nil,
        phone: String? = nil,
        vehicleType: String? = nil,
        vehicleMake: String? = nil,
        vehicleModel: String? = nil,
        vehicleYear: Int? = nil,
        vehicleColor: String? = nil,
        licensePlate: String? = nil,
        licenseExpiry: Date? = nil,
        insuranceExpiry: Date? = nil,
        completion: @escaping (Result<[String: Any], Error>) -> Void
    ) {
        guard let url = URL(string: "\(baseURL)/drivers/\(driverId)") else {
            completion(.failure(P2PAPIError.invalidURL))
            return
        }

        var request = URLRequest(url: url)
        request.httpMethod = "PUT"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        // Add auth token
        if let token = UserDefaults.standard.string(forKey: "p2p_driver_access_token") {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        // Build request body - only include non-nil values
        var body: [String: Any] = [:]

        if let firstName = firstName { body["first_name"] = firstName }
        if let lastName = lastName { body["last_name"] = lastName }
        if let phone = phone { body["phone"] = phone }
        if let vehicleType = vehicleType { body["vehicle_type"] = vehicleType }
        if let vehicleMake = vehicleMake { body["vehicle_make"] = vehicleMake }
        if let vehicleModel = vehicleModel { body["vehicle_model"] = vehicleModel }
        if let vehicleYear = vehicleYear { body["vehicle_year"] = vehicleYear }
        if let vehicleColor = vehicleColor { body["vehicle_color"] = vehicleColor }
        if let licensePlate = licensePlate { body["license_plate"] = licensePlate }

        if let licenseExpiry = licenseExpiry {
            let formatter = ISO8601DateFormatter()
            body["license_expiry"] = formatter.string(from: licenseExpiry)
        }
        if let insuranceExpiry = insuranceExpiry {
            let formatter = ISO8601DateFormatter()
            body["insurance_expiry"] = formatter.string(from: insuranceExpiry)
        }

        request.httpBody = try? JSONSerialization.data(withJSONObject: body)

        URLSession.shared.dataTask(with: request) { data, response, error in
            DispatchQueue.main.async {
                if let error = error {
                    completion(.failure(error))
                    return
                }

                guard let data = data else {
                    completion(.failure(P2PAPIError.noData))
                    return
                }

                // Check HTTP status code
                if let httpResponse = response as? HTTPURLResponse {
                    if httpResponse.statusCode >= 400 {
                        if let errorJson = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                           let detail = errorJson["detail"] as? String {
                            completion(.failure(P2PAPIError.serverError(detail)))
                        } else {
                            completion(.failure(P2PAPIError.serverError("HTTP \(httpResponse.statusCode)")))
                        }
                        return
                    }
                }

                if let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] {
                    completion(.success(json))
                } else {
                    completion(.failure(P2PAPIError.decodingError))
                }
            }
        }.resume()
    }

    // MARK: - Driver Documents APIs

    /// Fetch driver documents status
    public func getDriverDocuments(
        driverId: Int,
        completion: @escaping (Result<DriverDocumentsResponse, Error>) -> Void
    ) {
        guard let url = URL(string: "\(baseURL)/drivers/\(driverId)/documents") else {
            completion(.failure(P2PAPIError.invalidURL))
            return
        }

        var request = URLRequest(url: url)
        if let token = UserDefaults.standard.string(forKey: "p2p_driver_access_token") {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        URLSession.shared.dataTask(with: request) { data, response, error in
            DispatchQueue.main.async {
                if let error = error {
                    completion(.failure(error))
                    return
                }

                guard let data = data else {
                    completion(.failure(P2PAPIError.noData))
                    return
                }

                do {
                    let response = try JSONDecoder().decode(DriverDocumentsResponse.self, from: data)
                    completion(.success(response))
                } catch {
                    completion(.failure(error))
                }
            }
        }.resume()
    }

    /// Upload driver document (driver's license, insurance, etc.)
    public func uploadDriverDocument(
        driverId: Int,
        documentType: DriverDocumentType,
        imageData: Data,
        expiryDate: Date? = nil,
        completion: @escaping (Result<DocumentUploadResponse, Error>) -> Void
    ) {
        guard let url = URL(string: "\(baseURL)/drivers/\(driverId)/documents") else {
            completion(.failure(P2PAPIError.invalidURL))
            return
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"

        // Add auth token
        if let token = UserDefaults.standard.string(forKey: "p2p_driver_access_token") {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        // Create multipart form data
        let boundary = UUID().uuidString
        request.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")

        var body = Data()

        // Add document type field
        body.append("--\(boundary)\r\n".data(using: .utf8)!)
        body.append("Content-Disposition: form-data; name=\"document_type\"\r\n\r\n".data(using: .utf8)!)
        body.append("\(documentType.rawValue)\r\n".data(using: .utf8)!)

        // Add expiry date if provided
        if let expiryDate = expiryDate {
            let formatter = ISO8601DateFormatter()
            body.append("--\(boundary)\r\n".data(using: .utf8)!)
            body.append("Content-Disposition: form-data; name=\"expiry_date\"\r\n\r\n".data(using: .utf8)!)
            body.append("\(formatter.string(from: expiryDate))\r\n".data(using: .utf8)!)
        }

        // Add file
        body.append("--\(boundary)\r\n".data(using: .utf8)!)
        body.append("Content-Disposition: form-data; name=\"file\"; filename=\"\(documentType.rawValue).jpg\"\r\n".data(using: .utf8)!)
        body.append("Content-Type: image/jpeg\r\n\r\n".data(using: .utf8)!)
        body.append(imageData)
        body.append("\r\n".data(using: .utf8)!)

        // Close boundary
        body.append("--\(boundary)--\r\n".data(using: .utf8)!)

        request.httpBody = body

        isLoading = true

        URLSession.shared.dataTask(with: request) { [weak self] data, response, error in
            DispatchQueue.main.async {
                self?.isLoading = false

                if let error = error {
                    self?.error = error.localizedDescription
                    completion(.failure(error))
                    return
                }

                guard let data = data else {
                    completion(.failure(P2PAPIError.noData))
                    return
                }

                do {
                    let response = try JSONDecoder().decode(DocumentUploadResponse.self, from: data)
                    completion(.success(response))
                } catch {
                    // Try to parse as generic JSON for error messages
                    if let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                       let success = json["success"] as? Bool, success {
                        let mockResponse = DocumentUploadResponse(
                            success: true,
                            message: json["message"] as? String ?? "Document uploaded",
                            fileUrl: json["file_url"] as? String,
                            documentType: documentType.rawValue,
                            verificationStatus: json["verification_status"] as? String ?? "pending",
                            aiVerificationId: json["ai_verification_id"] as? String
                        )
                        completion(.success(mockResponse))
                    } else {
                        self?.error = "Failed to upload document"
                        completion(.failure(error))
                    }
                }
            }
        }.resume()
    }

    // MARK: - Driver Delivery APIs

    /// Fetch available orders for delivery
    public func fetchAvailableDeliveryOrders(
        completion: @escaping (Result<[P2PDeliveryOrder], Error>) -> Void
    ) {
        guard let url = URL(string: "\(baseURL)/erp/orders/available-for-delivery") else {
            completion(.failure(P2PAPIError.invalidURL))
            return
        }

        isLoading = true

        URLSession.shared.dataTask(with: url) { [weak self] data, response, error in
            DispatchQueue.main.async {
                self?.isLoading = false

                if let error = error {
                    self?.error = error.localizedDescription
                    completion(.failure(error))
                    return
                }

                guard let data = data else {
                    completion(.failure(P2PAPIError.noData))
                    return
                }

                do {
                    let response = try JSONDecoder().decode(P2PDeliveryOrdersResponse.self, from: data)
                    completion(.success(response.orders))
                } catch {
                    self?.error = "Failed to decode orders: \(error.localizedDescription)"
                    completion(.failure(error))
                }
            }
        }.resume()
    }

    /// Assign driver to an order (accept delivery)
    public func acceptDeliveryOrder(
        orderId: Int,
        completion: @escaping (Result<Bool, Error>) -> Void
    ) {
        guard let driverId = currentDriverId else {
            completion(.failure(P2PAPIError.serverError("Driver not logged in")))
            return
        }

        guard let url = URL(string: "\(baseURL)/erp/orders/\(orderId)/assign-driver") else {
            completion(.failure(P2PAPIError.invalidURL))
            return
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let body: [String: Any] = ["driver_id": driverId]
        request.httpBody = try? JSONSerialization.data(withJSONObject: body)

        URLSession.shared.dataTask(with: request) { [weak self] data, response, error in
            DispatchQueue.main.async {
                if let error = error {
                    self?.error = error.localizedDescription
                    completion(.failure(error))
                    return
                }

                if let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode >= 400 {
                    if let data = data,
                       let errorResponse = try? JSONDecoder().decode(P2PErrorResponse.self, from: data) {
                        completion(.failure(P2PAPIError.serverError(errorResponse.detail)))
                    } else {
                        completion(.failure(P2PAPIError.serverError("Failed to accept order")))
                    }
                    return
                }

                completion(.success(true))
            }
        }.resume()
    }

    /// Mark order as picked up
    public func markOrderPickedUp(
        orderId: Int,
        completion: @escaping (Result<Bool, Error>) -> Void
    ) {
        guard let url = URL(string: "\(baseURL)/erp/orders/\(orderId)/picked-up") else {
            completion(.failure(P2PAPIError.invalidURL))
            return
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"

        URLSession.shared.dataTask(with: request) { [weak self] data, response, error in
            DispatchQueue.main.async {
                if let error = error {
                    self?.error = error.localizedDescription
                    completion(.failure(error))
                    return
                }

                if let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode >= 400 {
                    if let data = data,
                       let errorResponse = try? JSONDecoder().decode(P2PErrorResponse.self, from: data) {
                        completion(.failure(P2PAPIError.serverError(errorResponse.detail)))
                    } else {
                        completion(.failure(P2PAPIError.serverError("Failed to mark as picked up")))
                    }
                    return
                }

                completion(.success(true))
            }
        }.resume()
    }

    /// Mark order as delivered
    public func markOrderDelivered(
        orderId: Int,
        completion: @escaping (Result<Bool, Error>) -> Void
    ) {
        guard let url = URL(string: "\(baseURL)/erp/orders/\(orderId)/delivered") else {
            completion(.failure(P2PAPIError.invalidURL))
            return
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"

        URLSession.shared.dataTask(with: request) { [weak self] data, response, error in
            DispatchQueue.main.async {
                if let error = error {
                    self?.error = error.localizedDescription
                    completion(.failure(error))
                    return
                }

                if let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode >= 400 {
                    if let data = data,
                       let errorResponse = try? JSONDecoder().decode(P2PErrorResponse.self, from: data) {
                        completion(.failure(P2PAPIError.serverError(errorResponse.detail)))
                    } else {
                        completion(.failure(P2PAPIError.serverError("Failed to mark as delivered")))
                    }
                    return
                }

                completion(.success(true))
            }
        }.resume()
    }

    /// Refresh driver token - call when receiving 401 Unauthorized
    public func refreshDriverToken(completion: @escaping (Result<String, Error>) -> Void) {
        guard let token = UserDefaults.standard.string(forKey: "p2p_driver_access_token") else {
            completion(.failure(P2PAPIError.serverError("No token to refresh")))
            return
        }

        guard let url = URL(string: "\(baseURL)/auth/driver/refresh") else {
            completion(.failure(P2PAPIError.invalidURL))
            return
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")

        URLSession.shared.dataTask(with: request) { data, response, error in
            if let error = error {
                DispatchQueue.main.async {
                    completion(.failure(error))
                }
                return
            }

            guard let httpResponse = response as? HTTPURLResponse else {
                DispatchQueue.main.async {
                    completion(.failure(P2PAPIError.serverError("Invalid response")))
                }
                return
            }

            if httpResponse.statusCode == 200, let data = data {
                do {
                    if let json = try JSONSerialization.jsonObject(with: data) as? [String: Any],
                       let newToken = json["access_token"] as? String {
                        // Save new token
                        UserDefaults.standard.set(newToken, forKey: "p2p_driver_access_token")
                        DispatchQueue.main.async {
                            print("[P2P] Token refreshed successfully")
                            completion(.success(newToken))
                        }
                        return
                    }
                } catch {
                    // Parse error
                }
            }

            DispatchQueue.main.async {
                completion(.failure(P2PAPIError.serverError("Token refresh failed - please log in again")))
            }
        }.resume()
    }

    /// Update driver location (with automatic token refresh on 401)
    public func updateDriverLocation(
        latitude: Double,
        longitude: Double,
        completion: @escaping (Result<Bool, Error>) -> Void
    ) {
        updateDriverLocationInternal(latitude: latitude, longitude: longitude, retryOnExpired: true, completion: completion)
    }

    /// Internal implementation with retry capability
    private func updateDriverLocationInternal(
        latitude: Double,
        longitude: Double,
        retryOnExpired: Bool,
        completion: @escaping (Result<Bool, Error>) -> Void
    ) {
        guard let token = UserDefaults.standard.string(forKey: "p2p_driver_access_token") else {
            completion(.failure(P2PAPIError.serverError("Driver not logged in")))
            return
        }

        guard let url = URL(string: "\(baseURL)/auth/driver/location?latitude=\(latitude)&longitude=\(longitude)") else {
            completion(.failure(P2PAPIError.invalidURL))
            return
        }

        var request = URLRequest(url: url)
        request.httpMethod = "PUT"
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")

        URLSession.shared.dataTask(with: request) { [weak self] data, response, error in
            if let error = error {
                DispatchQueue.main.async {
                    self?.error = error.localizedDescription
                    completion(.failure(error))
                }
                return
            }

            // Check for 401 Unauthorized - token expired
            if let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 401 {
                if retryOnExpired {
                    print("[P2P] Token expired, attempting refresh...")
                    self?.refreshDriverToken { result in
                        switch result {
                        case .success:
                            // Retry the request with new token
                            self?.updateDriverLocationInternal(
                                latitude: latitude,
                                longitude: longitude,
                                retryOnExpired: false,
                                completion: completion
                            )
                        case .failure(let error):
                            // Token refresh failed - user needs to re-login
                            print("[P2P] Token refresh failed: \(error)")
                            NotificationCenter.default.post(
                                name: Notification.Name("DriverTokenExpired"),
                                object: nil
                            )
                            completion(.failure(P2PAPIError.serverError("Session expired - please log in again")))
                        }
                    }
                    return
                } else {
                    // Already retried, fail
                    DispatchQueue.main.async {
                        NotificationCenter.default.post(
                            name: Notification.Name("DriverTokenExpired"),
                            object: nil
                        )
                        completion(.failure(P2PAPIError.serverError("Session expired - please log in again")))
                    }
                    return
                }
            }

            DispatchQueue.main.async {
                completion(.success(true))
            }
        }.resume()
    }

    /// Set driver online/offline status
    public func setDriverOnlineStatus(
        isOnline: Bool,
        completion: @escaping (Result<Bool, Error>) -> Void
    ) {
        guard let token = UserDefaults.standard.string(forKey: "p2p_driver_access_token") else {
            completion(.failure(P2PAPIError.serverError("Driver not logged in")))
            return
        }

        guard let url = URL(string: "\(baseURL)/auth/driver/online?is_online=\(isOnline)") else {
            completion(.failure(P2PAPIError.invalidURL))
            return
        }

        var request = URLRequest(url: url)
        request.httpMethod = "PUT"
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")

        URLSession.shared.dataTask(with: request) { [weak self] data, response, error in
            DispatchQueue.main.async {
                if let error = error {
                    self?.error = error.localizedDescription
                    completion(.failure(error))
                    return
                }

                completion(.success(true))
            }
        }.resume()
    }

    /// Fetch driver's active deliveries
    public func fetchMyDeliveries(
        completion: @escaping (Result<[P2PDeliveryOrder], Error>) -> Void
    ) {
        guard let driverId = currentDriverId else {
            completion(.failure(P2PAPIError.serverError("Driver not logged in")))
            return
        }

        guard let url = URL(string: "\(baseURL)/erp/orders/driver/\(driverId)/active") else {
            completion(.failure(P2PAPIError.invalidURL))
            return
        }

        URLSession.shared.dataTask(with: url) { [weak self] data, response, error in
            DispatchQueue.main.async {
                if let error = error {
                    self?.error = error.localizedDescription
                    completion(.failure(error))
                    return
                }

                guard let data = data else {
                    completion(.failure(P2PAPIError.noData))
                    return
                }

                do {
                    let response = try JSONDecoder().decode(P2PDeliveryOrdersResponse.self, from: data)
                    completion(.success(response.orders))
                } catch {
                    // If endpoint doesn't exist yet, return empty array
                    completion(.success([]))
                }
            }
        }.resume()
    }

    /// Complete a delivery
    public func completeDelivery(
        orderId: Int,
        completion: @escaping (Result<Bool, Error>) -> Void
    ) {
        guard let token = UserDefaults.standard.string(forKey: "p2p_driver_access_token") else {
            completion(.failure(P2PAPIError.serverError("Driver not logged in")))
            return
        }

        guard let url = URL(string: "\(baseURL)/erp/orders/\(orderId)/complete-delivery") else {
            completion(.failure(P2PAPIError.invalidURL))
            return
        }

        var request = URLRequest(url: url)
        request.httpMethod = "PUT"
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")

        URLSession.shared.dataTask(with: request) { data, response, error in
            DispatchQueue.main.async {
                if let error = error {
                    completion(.failure(error))
                    return
                }

                if let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 {
                    completion(.success(true))
                } else {
                    completion(.failure(P2PAPIError.serverError("Failed to complete delivery")))
                }
            }
        }.resume()
    }

    /// Cancel delivery assignment (driver unassigns from order)
    public func cancelDeliveryAssignment(
        orderId: Int,
        completion: @escaping (Result<Bool, Error>) -> Void
    ) {
        guard let token = UserDefaults.standard.string(forKey: "p2p_driver_access_token") else {
            completion(.failure(P2PAPIError.serverError("Driver not logged in")))
            return
        }

        guard let url = URL(string: "\(baseURL)/erp/orders/\(orderId)/unassign-driver") else {
            completion(.failure(P2PAPIError.invalidURL))
            return
        }

        var request = URLRequest(url: url)
        request.httpMethod = "PUT"
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")

        URLSession.shared.dataTask(with: request) { data, response, error in
            DispatchQueue.main.async {
                if let error = error {
                    completion(.failure(error))
                    return
                }

                if let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 {
                    completion(.success(true))
                } else {
                    completion(.failure(P2PAPIError.serverError("Failed to cancel delivery")))
                }
            }
        }.resume()
    }

    /// Update driver location for an order
    public func updateDriverLocation(
        orderId: Int,
        latitude: Double,
        longitude: Double,
        completion: @escaping (Result<Bool, Error>) -> Void
    ) {
        guard let token = UserDefaults.standard.string(forKey: "p2p_driver_access_token") else {
            completion(.failure(P2PAPIError.serverError("Driver not logged in")))
            return
        }

        guard let url = URL(string: "\(baseURL)/erp/orders/\(orderId)/driver-location") else {
            completion(.failure(P2PAPIError.invalidURL))
            return
        }

        var request = URLRequest(url: url)
        request.httpMethod = "PUT"
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let body: [String: Any] = [
            "latitude": latitude,
            "longitude": longitude,
            "updated_at": ISO8601DateFormatter().string(from: Date())
        ]
        request.httpBody = try? JSONSerialization.data(withJSONObject: body)

        URLSession.shared.dataTask(with: request) { _, _, _ in
            DispatchQueue.main.async {
                completion(.success(true))
            }
        }.resume()
    }

    // MARK: - P2P Ride APIs (Ride-sharing like Uber)

    /// Fetch available rides for drivers
    public func fetchAvailableRides(
        completion: @escaping (Result<[P2PRide], Error>) -> Void
    ) {
        guard let url = URL(string: "\(baseURL)/erp/rides/available") else {
            completion(.failure(P2PAPIError.invalidURL))
            return
        }

        var request = URLRequest(url: url)
        if let token = UserDefaults.standard.string(forKey: "p2p_driver_access_token") {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        URLSession.shared.dataTask(with: request) { data, response, error in
            DispatchQueue.main.async {
                if let error = error {
                    completion(.failure(error))
                    return
                }

                guard let data = data else {
                    completion(.failure(P2PAPIError.noData))
                    return
                }

                do {
                    let response = try JSONDecoder().decode(P2PRidesResponse.self, from: data)
                    completion(.success(response.rides))
                } catch {
                    print("Ride decode error: \(error)")
                    completion(.failure(error))
                }
            }
        }.resume()
    }

    /// Accept a ride (driver picks up passenger)
    public func acceptRide(
        rideId: Int,
        completion: @escaping (Result<Bool, Error>) -> Void
    ) {
        guard let driverId = currentDriverId else {
            completion(.failure(P2PAPIError.serverError("Driver not logged in")))
            return
        }

        guard let url = URL(string: "\(baseURL)/erp/rides/\(rideId)/accept") else {
            completion(.failure(P2PAPIError.invalidURL))
            return
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        if let token = UserDefaults.standard.string(forKey: "p2p_driver_access_token") {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        let body: [String: Any] = ["driver_id": driverId]
        request.httpBody = try? JSONSerialization.data(withJSONObject: body)

        URLSession.shared.dataTask(with: request) { data, response, error in
            DispatchQueue.main.async {
                if let error = error {
                    completion(.failure(error))
                    return
                }

                if let httpResponse = response as? HTTPURLResponse {
                    if httpResponse.statusCode == 200 {
                        completion(.success(true))
                    } else {
                        if let data = data,
                           let errorResponse = try? JSONDecoder().decode(P2PErrorResponse.self, from: data) {
                            completion(.failure(P2PAPIError.serverError(errorResponse.detail)))
                        } else {
                            completion(.failure(P2PAPIError.serverError("Failed to accept ride")))
                        }
                    }
                }
            }
        }.resume()
    }

    /// Mark passenger as picked up
    public func ridePickedUp(
        rideId: Int,
        completion: @escaping (Result<Bool, Error>) -> Void
    ) {
        guard let token = UserDefaults.standard.string(forKey: "p2p_driver_access_token") else {
            completion(.failure(P2PAPIError.serverError("Driver not logged in")))
            return
        }

        guard let url = URL(string: "\(baseURL)/erp/rides/\(rideId)/picked-up") else {
            completion(.failure(P2PAPIError.invalidURL))
            return
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")

        URLSession.shared.dataTask(with: request) { data, response, error in
            DispatchQueue.main.async {
                if let error = error {
                    completion(.failure(error))
                    return
                }

                if let httpResponse = response as? HTTPURLResponse {
                    if httpResponse.statusCode == 200 {
                        completion(.success(true))
                    } else {
                        if let data = data,
                           let errorResponse = try? JSONDecoder().decode(P2PErrorResponse.self, from: data) {
                            completion(.failure(P2PAPIError.serverError(errorResponse.detail)))
                        } else {
                            completion(.failure(P2PAPIError.serverError("Failed to confirm pickup")))
                        }
                    }
                }
            }
        }.resume()
    }

    /// Complete a ride (passenger dropped off)
    public func completeRide(
        rideId: Int,
        completion: @escaping (Result<Bool, Error>) -> Void
    ) {
        guard let token = UserDefaults.standard.string(forKey: "p2p_driver_access_token") else {
            completion(.failure(P2PAPIError.serverError("Driver not logged in")))
            return
        }

        // Rides use the same completion endpoint as deliveries since they're stored as orders
        guard let url = URL(string: "\(baseURL)/erp/orders/\(rideId)/complete-delivery") else {
            completion(.failure(P2PAPIError.invalidURL))
            return
        }

        var request = URLRequest(url: url)
        request.httpMethod = "PUT"
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")

        URLSession.shared.dataTask(with: request) { data, response, error in
            DispatchQueue.main.async {
                if let error = error {
                    completion(.failure(error))
                    return
                }

                if let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 {
                    completion(.success(true))
                } else {
                    completion(.failure(P2PAPIError.serverError("Failed to complete ride")))
                }
            }
        }.resume()
    }

    // MARK: - Customer Ride Request APIs

    /// Request a ride (customer requests pickup)
    public func requestRide(
        customerName: String,
        customerEmail: String,
        customerPhone: String,
        pickupAddress: RideAddressInput,
        dropoffAddress: RideAddressInput,
        notes: String? = nil,
        tip: Double = 0.0,
        completion: @escaping (Result<RideRequestResponse, Error>) -> Void
    ) {
        guard let url = URL(string: "\(baseURL)/erp/rides/request") else {
            completion(.failure(P2PAPIError.invalidURL))
            return
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let body: [String: Any] = [
            "customer_name": customerName,
            "customer_email": customerEmail,
            "customer_phone": customerPhone,
            "pickup_address": [
                "street": pickupAddress.street,
                "city": pickupAddress.city,
                "state": pickupAddress.state,
                "zip": pickupAddress.zip,
                "lat": pickupAddress.lat,
                "lng": pickupAddress.lng
            ],
            "dropoff_address": [
                "street": dropoffAddress.street,
                "city": dropoffAddress.city,
                "state": dropoffAddress.state,
                "zip": dropoffAddress.zip,
                "lat": dropoffAddress.lat,
                "lng": dropoffAddress.lng
            ],
            "notes": notes ?? "",
            "tip": tip
        ]

        request.httpBody = try? JSONSerialization.data(withJSONObject: body)

        URLSession.shared.dataTask(with: request) { data, response, error in
            DispatchQueue.main.async {
                if let error = error {
                    completion(.failure(error))
                    return
                }

                guard let data = data else {
                    completion(.failure(P2PAPIError.noData))
                    return
                }

                do {
                    let response = try JSONDecoder().decode(RideRequestResponse.self, from: data)
                    completion(.success(response))
                } catch {
                    print("Ride request decode error: \(error)")
                    // Try to get error message from response
                    if let errorResponse = try? JSONDecoder().decode(P2PErrorResponse.self, from: data) {
                        completion(.failure(P2PAPIError.serverError(errorResponse.detail)))
                    } else {
                        completion(.failure(error))
                    }
                }
            }
        }.resume()
    }

    /// Track customer's active ride
    public func trackMyRide(
        rideId: Int,
        completion: @escaping (Result<RideTrackingInfo, Error>) -> Void
    ) {
        guard let url = URL(string: "\(baseURL)/erp/orders/\(rideId)/full-tracking") else {
            completion(.failure(P2PAPIError.invalidURL))
            return
        }

        URLSession.shared.dataTask(with: url) { data, response, error in
            DispatchQueue.main.async {
                if let error = error {
                    completion(.failure(error))
                    return
                }

                guard let data = data else {
                    completion(.failure(P2PAPIError.noData))
                    return
                }

                do {
                    let response = try JSONDecoder().decode(RideTrackingInfo.self, from: data)
                    completion(.success(response))
                } catch {
                    completion(.failure(error))
                }
            }
        }.resume()
    }
}

/// MARK: - Customer Ride Request Models

/// Input for ride address (pickup or dropoff)
public struct RideAddressInput: Codable {
    public let street: String
    public let city: String
    public let state: String
    public let zip: String
    public let lat: Double
    public let lng: Double

    public init(street: String, city: String, state: String, zip: String, lat: Double, lng: Double) {
        self.street = street
        self.city = city
        self.state = state
        self.zip = zip
        self.lat = lat
        self.lng = lng
    }

    public var fullAddress: String {
        [street, city, state, zip].filter { !$0.isEmpty }.joined(separator: ", ")
    }
}

/// Response from ride request
public struct RideRequestResponse: Codable {
    public let success: Bool
    public let rideId: Int
    public let rideNumber: String
    public let pickup: RideAddressInput?
    public let dropoff: RideAddressInput?
    public let totalFare: Double
    public let driverEarnings: Double
    public let platformFee: Double
    public let baseFare: Double
    public let distanceFee: Double
    public let timeFee: Double
    public let surgeMultiplier: Double
    public let taxAmount: Double
    public let taxRate: String
    public let tip: Double
    public let status: String
    public let processedBy: String?

    enum CodingKeys: String, CodingKey {
        case success
        case rideId = "ride_id"
        case rideNumber = "ride_number"
        case pickup
        case dropoff
        case totalFare = "total_fare"
        case driverEarnings = "driver_earnings"
        case platformFee = "platform_fee"
        case baseFare = "base_fare"
        case distanceFee = "distance_fee"
        case timeFee = "time_fee"
        case surgeMultiplier = "surge_multiplier"
        case taxAmount = "tax_amount"
        case taxRate = "tax_rate"
        case tip
        case status
        case processedBy = "processed_by"
    }
}

/// Ride tracking info for customers
public struct RideTrackingInfo: Codable {
    public let success: Bool
    public let orderId: Int
    public let orderNumber: String
    public let status: String
    public let driverName: String?
    public let driverPhone: String?
    public let driverLatitude: Double?
    public let driverLongitude: Double?
    public let estimatedArrival: String?

    enum CodingKeys: String, CodingKey {
        case success
        case orderId = "order_id"
        case orderNumber = "order_number"
        case status
        case driverName = "driver_name"
        case driverPhone = "driver_phone"
        case driverLatitude = "driver_latitude"
        case driverLongitude = "driver_longitude"
        case estimatedArrival = "estimated_arrival"
    }
}

// MARK: - Auth Response Models

public struct P2PLoginResponse: Codable {
    public let accessToken: String
    public let tokenType: String
    public let user: P2PUser

    enum CodingKeys: String, CodingKey {
        case accessToken = "access_token"
        case tokenType = "token_type"
        case user
    }
}

public struct P2PUser: Codable {
    public let id: Int
    public let email: String
    public let fullName: String
    public let role: String
    public let vendorId: Int?

    enum CodingKeys: String, CodingKey {
        case id
        case email
        case fullName = "full_name"
        case role
        case vendorId = "vendor_id"
    }
}

public struct P2PErrorResponse: Codable {
    public let detail: String
}

// MARK: - Error Types

public enum P2PAPIError: Error, LocalizedError {
    case invalidURL
    case noData
    case decodingError
    case serverError(String)

    public var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "Invalid URL"
        case .noData:
            return "No data received from server"
        case .decodingError:
            return "Failed to decode server response"
        case .serverError(let message):
            return message
        }
    }
}

// MARK: - Response Models

public struct P2PRestaurantsResponse: Codable {
    public let success: Bool
    public let count: Int
    public let restaurants: [P2PRestaurant]
}

public struct P2PRestaurant: Identifiable, Codable {
    public let id: Int
    public let vendorId: String
    public let name: String
    public let cuisineType: String?
    public let address: P2PAddress
    public let location: P2PLocation
    public let contact: P2PContact
    public let operatingHours: String?
    public let deliveryAvailable: Bool
    public let pickupAvailable: Bool
    public let averagePrepTime: Int?
    public let menuItemsCount: Int
    public let previewImages: [String]
    public let rating: Double
    public let isOpen: Bool

    enum CodingKeys: String, CodingKey {
        case id
        case vendorId = "vendor_id"
        case name
        case cuisineType = "cuisine_type"
        case address
        case location
        case contact
        case operatingHours = "operating_hours"
        case deliveryAvailable = "delivery_available"
        case pickupAvailable = "pickup_available"
        case averagePrepTime = "average_prep_time"
        case menuItemsCount = "menu_items_count"
        case previewImages = "preview_images"
        case rating
        case isOpen = "is_open"
    }
}

public struct P2PAddress: Codable {
    public let street: String?
    public let city: String?
    public let state: String?
    public let zipCode: String?
    public let country: String?
    public let fullAddress: String

    enum CodingKeys: String, CodingKey {
        case street, city, state
        case zipCode = "zip_code"
        case country
        case fullAddress = "full_address"
    }
}

public struct P2PLocation: Codable {
    public let latitude: Double?
    public let longitude: Double?
}

public struct P2PContact: Codable {
    public let phone: String?
    public let email: String?
}

// MARK: - Vendor Profile (for Restaurant App Settings)

public struct P2PVendorProfileResponse: Codable {
    public let success: Bool
    public let restaurant: P2PVendorProfile
}

public struct P2PVendorProfile: Codable {
    public let id: Int
    public let vendorId: String
    public let name: String
    public let cuisineType: String?
    public let address: P2PAddress
    public let location: P2PLocation
    public let contact: P2PContact
    public let operatingHours: String?
    public let deliveryAvailable: Bool
    public let pickupAvailable: Bool
    public let averagePrepTime: Int?
    public let rating: Double
    public let reviewsCount: Int

    enum CodingKeys: String, CodingKey {
        case id
        case vendorId = "vendor_id"
        case name
        case cuisineType = "cuisine_type"
        case address
        case location
        case contact
        case operatingHours = "operating_hours"
        case deliveryAvailable = "delivery_available"
        case pickupAvailable = "pickup_available"
        case averagePrepTime = "average_prep_time"
        case rating
        case reviewsCount = "reviews_count"
    }
}

public struct P2PRestaurantDetailResponse: Codable {
    public let success: Bool
    public let restaurant: P2PRestaurantInfo
    public let menu: [String: [P2PDetailMenuItem]]

    public func toDetail() -> P2PRestaurantDetail {
        P2PRestaurantDetail(restaurant: restaurant, menu: menu)
    }
}

/// Menu item structure specifically for restaurant detail response
/// (Uses 'name' key instead of 'item_name')
public struct P2PDetailMenuItem: Identifiable, Codable {
    public let id: Int
    public let name: String
    public let description: String?
    public let price: Double
    public let imageUrl: String?
    public let isVegetarian: Bool
    public let isVegan: Bool
    public let isGlutenFree: Bool
    public let isSpicy: Bool
    public let spiceLevel: Int
    public let prepTime: Int?
    public let calories: Int?
    public let inStock: Bool
    public let customizations: [P2PMenuItemCustomization]?

    enum CodingKeys: String, CodingKey {
        case id, name, description, price, customizations
        case imageUrl = "image_url"
        case isVegetarian = "is_vegetarian"
        case isVegan = "is_vegan"
        case isGlutenFree = "is_gluten_free"
        case isSpicy = "is_spicy"
        case spiceLevel = "spice_level"
        case prepTime = "prep_time"
        case calories
        case inStock = "in_stock"
    }
}

public struct P2PRestaurantDetail {
    public let restaurant: P2PRestaurantInfo
    public let menu: [String: [P2PDetailMenuItem]]

    public var menuCategories: [String] {
        Array(menu.keys).sorted()
    }

    /// Get all menu items with their category included
    public var allMenuItemsWithCategory: [(item: P2PDetailMenuItem, category: String)] {
        menu.flatMap { category, items in
            items.map { (item: $0, category: category) }
        }
    }
}

public struct P2PRestaurantInfo: Codable {
    public let id: Int
    public let vendorId: String
    public let name: String
    public let cuisineType: String?
    public let address: P2PAddress
    public let location: P2PLocation
    public let contact: P2PContact
    public let operatingHours: String?
    public let deliveryAvailable: Bool
    public let pickupAvailable: Bool
    public let averagePrepTime: Int?
    public let rating: Double
    public let reviewsCount: Int

    enum CodingKeys: String, CodingKey {
        case id
        case vendorId = "vendor_id"
        case name
        case cuisineType = "cuisine_type"
        case address
        case location
        case contact
        case operatingHours = "operating_hours"
        case deliveryAvailable = "delivery_available"
        case pickupAvailable = "pickup_available"
        case averagePrepTime = "average_prep_time"
        case rating
        case reviewsCount = "reviews_count"
    }
}

// MARK: - P2P Customization Models

public struct P2PCustomizationOption: Codable {
    public let name: String
    public let price: Double
    public let isDefault: Bool?
    public let isAvailable: Bool?

    enum CodingKeys: String, CodingKey {
        case name, price
        case isDefault = "is_default"
        case isAvailable = "is_available"
    }

    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        name = try container.decode(String.self, forKey: .name)
        price = try container.decodeIfPresent(Double.self, forKey: .price) ?? 0.0
        isDefault = try container.decodeIfPresent(Bool.self, forKey: .isDefault)
        isAvailable = try container.decodeIfPresent(Bool.self, forKey: .isAvailable)
    }
}

public struct P2PMenuItemCustomization: Codable {
    public let name: String
    public let type: String  // "single" or "multiple"
    public let required: Bool
    public let minSelections: Int?
    public let maxSelections: Int?
    public let options: [P2PCustomizationOption]

    enum CodingKeys: String, CodingKey {
        case name, type, required, options
        case minSelections = "min_selections"
        case maxSelections = "max_selections"
    }

    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        name = try container.decode(String.self, forKey: .name)
        type = try container.decodeIfPresent(String.self, forKey: .type) ?? "single"
        required = try container.decodeIfPresent(Bool.self, forKey: .required) ?? false
        minSelections = try container.decodeIfPresent(Int.self, forKey: .minSelections)
        maxSelections = try container.decodeIfPresent(Int.self, forKey: .maxSelections)
        options = try container.decodeIfPresent([P2PCustomizationOption].self, forKey: .options) ?? []
    }
}

public struct P2PMenuItem: Identifiable, Codable {
    public let id: Int
    public let name: String
    public let description: String?
    public let category: String?
    public let price: Double
    public let imageUrl: String?
    public let isVegetarian: Bool
    public let isVegan: Bool
    public let isGlutenFree: Bool
    public let isSpicy: Bool
    public let spiceLevel: Int
    public let prepTime: Int?
    public let calories: Int?
    public let inStock: Bool
    public let customizations: [P2PMenuItemCustomization]?

    enum CodingKeys: String, CodingKey {
        case id
        case name = "item_name"
        case description, category, price
        case imageUrl = "image_url"
        case isVegetarian = "is_vegetarian"
        case isVegan = "is_vegan"
        case isGlutenFree = "is_gluten_free"
        case isSpicy = "is_spicy"
        case spiceLevel = "spice_level"
        case prepTime = "prep_time"
        case calories
        case inStock = "in_stock"
        case customizations
    }
}

public struct P2PMenuResponse: Codable {
    public let success: Bool
    public let items: [P2PMenuItem]
}

public struct P2PMenuItemResponse: Codable {
    public let success: Bool
    public let item: P2PMenuItem
}

public struct P2PStockImageResponse: Codable {
    public let success: Bool
    public let message: String
    public let itemsUpdated: Int

    enum CodingKeys: String, CodingKey {
        case success, message
        case itemsUpdated = "items_updated"
    }
}

public struct P2PVerificationStatus: Codable {
    public let success: Bool
    public let status: String
    public let discrepanciesCount: Int
    public let canActivate: Bool

    enum CodingKeys: String, CodingKey {
        case success, status
        case discrepanciesCount = "discrepancies_count"
        case canActivate = "can_activate"
    }
}

public struct P2PApprovalResponse: Codable {
    public let success: Bool
    public let message: String
}

// MARK: - Conversion Extensions

public extension P2PRestaurant {
    /// Convert to the shared Restaurant model for compatibility with existing code
    func toRestaurant() -> Restaurant {
        Restaurant(
            id: String(id),  // Use numeric ID so MenuViewModel can fetch from P2P
            name: name,
            cuisine: cuisineType ?? "General",
            rating: rating,
            deliveryTime: averagePrepTime != nil ? "\(averagePrepTime!)-\(averagePrepTime! + 15) min" : "30-45 min",
            imageUrl: previewImages.first ?? "",
            address: address.fullAddress,
            latitude: location.latitude ?? 0,
            longitude: location.longitude ?? 0,
            phone: contact.phone ?? ""
        )
    }
}

public extension P2PMenuItem {
    /// Convert to the shared MenuItem model for compatibility with existing code
    func toMenuItem() -> MenuItem {
        MenuItem(
            id: String(id),
            name: name,
            description: description ?? "",
            price: price,
            imageUrl: imageUrl ?? "",
            isAvailable: inStock,
            category: nil,
            isPopular: false,
            prepTime: prepTime ?? 15,
            calories: (calories ?? 0) > 0 ? calories : nil,
            dietaryTags: buildDietaryTags(),
            customizations: convertCustomizations()
        )
    }

    private func buildDietaryTags() -> [String] {
        var tags: [String] = []
        if isVegetarian { tags.append("vegetarian") }
        if isVegan { tags.append("vegan") }
        if isGlutenFree { tags.append("gluten-free") }
        if isSpicy { tags.append("spicy") }
        return tags
    }

    private func convertCustomizations() -> [MenuItemCustomization]? {
        guard let p2pCustomizations = customizations, !p2pCustomizations.isEmpty else {
            return nil
        }

        return p2pCustomizations.map { p2pCust in
            let options = p2pCust.options.map { opt in
                CustomizationOption(
                    name: opt.name,
                    price: opt.price,
                    isDefault: opt.isDefault,
                    isAvailable: opt.isAvailable
                )
            }

            return MenuItemCustomization(
                name: p2pCust.name,
                type: p2pCust.type == "multiple" ? .multiple : .single,
                required: p2pCust.required,
                minSelections: p2pCust.minSelections,
                maxSelections: p2pCust.maxSelections,
                options: options
            )
        }
    }
}

// MARK: - Driver Authentication Response Models

public struct P2PDriverLoginResponse: Codable {
    public let accessToken: String
    public let tokenType: String
    public let driverId: Int
    public let driverCode: String
    public let name: String  // Backend returns combined name
    public let email: String
    public let status: String?  // Only present in registration response
    public let message: String?  // Only present in registration response

    enum CodingKeys: String, CodingKey {
        case accessToken = "access_token"
        case tokenType = "token_type"
        case driverId = "driver_id"
        case driverCode = "driver_code"
        case name
        case email
        case status
        case message
    }
}

// MARK: - Driver Document Models

public enum DriverDocumentType: String, Codable {
    case driversLicense = "drivers_license"
    case licenseFront = "license_front"
    case licenseBack = "license_back"
    case insurance = "insurance"
    case insuranceCard = "insurance_card"
    case backgroundCheck = "background_check"
    case vehicleFront = "vehicle_front"
    case vehicleSide = "vehicle_side"
    case vehicleBack = "vehicle_back"
    case profilePhoto = "profile_photo"

    public var displayName: String {
        switch self {
        case .driversLicense: return "Driver's License"
        case .licenseFront: return "License Front"
        case .licenseBack: return "License Back"
        case .insurance: return "Vehicle Insurance"
        case .insuranceCard: return "Insurance Card"
        case .backgroundCheck: return "Background Check"
        case .vehicleFront: return "Vehicle Front"
        case .vehicleSide: return "Vehicle Side"
        case .vehicleBack: return "Vehicle Back"
        case .profilePhoto: return "Profile Photo"
        }
    }
}

public struct DriverDocument: Codable, Identifiable {
    public let id: Int
    public let documentType: String
    public let fileName: String
    public let fileUrl: String?
    public let uploadDate: String?
    public let expiryDate: String?
    public let status: String
    public let verified: Bool

    enum CodingKeys: String, CodingKey {
        case id
        case documentType = "document_type"
        case fileName = "file_name"
        case fileUrl = "file_url"
        case uploadDate = "upload_date"
        case expiryDate = "expiry_date"
        case status
        case verified
    }
}

public struct DriverDocumentsResponse: Codable {
    public let driverId: Int
    public let documents: [DriverDocument]
    public let count: Int
    public let allVerified: Bool

    enum CodingKeys: String, CodingKey {
        case driverId = "driver_id"
        case documents
        case count
        case allVerified = "all_verified"
    }
}

public struct DocumentUploadResponse: Codable {
    public let success: Bool
    public let message: String
    public let fileUrl: String?
    public let documentType: String
    public let verificationStatus: String
    public let aiVerificationId: String?

    enum CodingKeys: String, CodingKey {
        case success
        case message
        case fileUrl = "file_url"
        case documentType = "document_type"
        case verificationStatus = "verification_status"
        case aiVerificationId = "ai_verification_id"
    }

    public init(success: Bool, message: String, fileUrl: String?, documentType: String, verificationStatus: String, aiVerificationId: String?) {
        self.success = success
        self.message = message
        self.fileUrl = fileUrl
        self.documentType = documentType
        self.verificationStatus = verificationStatus
        self.aiVerificationId = aiVerificationId
    }
}

// MARK: - Delivery Order Models

public struct P2PDeliveryOrdersResponse: Codable {
    public let success: Bool
    public let orders: [P2PDeliveryOrder]
}

/// Nested delivery address structure from API
public struct P2PDeliveryAddress: Codable {
    public let street: String?
    public let city: String?
    public let state: String?
    public let zip: String?

    public var fullAddress: String {
        [street, city, state, zip].compactMap { $0 }.joined(separator: ", ")
    }
}

public struct P2PDeliveryOrder: Identifiable, Codable {
    public var id: Int { orderId }
    public let orderId: Int
    public let orderNumber: String
    public let status: String?
    public let restaurantName: String
    public let restaurantAddress: String
    public let customerName: String?
    public let customerAddress: String?
    public let deliveryAddressObj: P2PDeliveryAddress?
    public let customerPhone: String?
    public let pickupLatitude: Double?
    public let pickupLongitude: Double?
    public let dropoffLatitude: Double?
    public let dropoffLongitude: Double?
    public let estimatedDistance: Double?
    public let estimatedDuration: Int?
    public let deliveryFee: Double
    public let tip: Double?
    public let totalEarnings: Double?
    public let createdAt: String
    public let assignedAt: String?
    public let pickedUpAt: String?
    public let deliveredAt: String?

    /// Computed property to get delivery address as string
    public var deliveryAddressString: String {
        if let addr = customerAddress, !addr.isEmpty {
            return addr
        }
        return deliveryAddressObj?.fullAddress ?? "Address not available"
    }

    enum CodingKeys: String, CodingKey {
        case orderId = "order_id"
        case orderNumber = "order_number"
        case status
        case restaurantName = "restaurant"
        case restaurantAddress = "pickup_address"
        case customerName = "customer_name"
        case customerAddress = "customer_address"
        case deliveryAddressObj = "delivery_address"
        case customerPhone = "customer_phone"
        case pickupLatitude = "pickup_latitude"
        case pickupLongitude = "pickup_longitude"
        case dropoffLatitude = "dropoff_latitude"
        case dropoffLongitude = "dropoff_longitude"
        case estimatedDistance = "estimated_distance"
        case estimatedDuration = "estimated_duration"
        case deliveryFee = "delivery_fee"
        case tip
        case totalEarnings = "total_earnings"
        case createdAt = "created_at"
        case assignedAt = "assigned_at"
        case pickedUpAt = "picked_up_at"
        case deliveredAt = "delivered_at"
    }
}

// MARK: - P2P Ride Models

/// Driver mode - Food Delivery or Ride-sharing
public enum DriverMode: String, CaseIterable {
    case foodDelivery = "food_delivery"
    case rideShare = "ride_share"

    public var displayName: String {
        switch self {
        case .foodDelivery: return "Food Delivery"
        case .rideShare: return "Ride Share"
        }
    }

    public var icon: String {
        switch self {
        case .foodDelivery: return "bag.fill"
        case .rideShare: return "car.fill"
        }
    }
}

/// Response for available rides
public struct P2PRidesResponse: Codable {
    public let success: Bool
    public let rides: [P2PRide]
}

/// P2P Ride model - for passenger pickup/dropoff
public struct P2PRide: Identifiable, Codable {
    public let rideId: Int
    public let rideNumber: String
    public let customerName: String?
    public let pickup: P2PRideLocation?
    public let dropoff: P2PRideLocation?
    public let fee: Double
    public let tip: Double?
    public let totalEarnings: Double?
    public let notes: String?
    public let createdAt: String?

    public var id: Int { rideId }

    public var earnings: Double {
        totalEarnings ?? (fee + (tip ?? 0))
    }

    enum CodingKeys: String, CodingKey {
        case rideId = "ride_id"
        case rideNumber = "ride_number"
        case customerName = "customer_name"
        case pickup
        case dropoff
        case fee
        case tip
        case totalEarnings = "total_earnings"
        case notes
        case createdAt = "created_at"
    }
}

/// Ride location with address details
public struct P2PRideLocation: Codable {
    public let street: String?
    public let city: String?
    public let state: String?
    public let zip: String?
    public let lat: Double?
    public let lng: Double?

    public var fullAddress: String {
        [street, city, state, zip].compactMap { $0 }.filter { !$0.isEmpty }.joined(separator: ", ")
    }

    public var coordinate: (lat: Double, lng: Double)? {
        guard let lat = lat, let lng = lng else { return nil }
        return (lat, lng)
    }
}

// MARK: - Order Creation Response

/// Response from backend when creating an order
/// Contains the backend-generated order number for syncing across all apps
public struct P2PCreateOrderResponse: Codable {
    public let success: Bool
    public let orderId: Int
    public let orderNumber: String
    public let status: String
    public let subtotal: Double
    public let tax: Double
    public let deliveryFee: Double
    public let platformFee: Double
    public let total: Double
    public let estimatedDeliveryTime: String?
    public let createdAt: String

    enum CodingKeys: String, CodingKey {
        case success
        case orderId = "order_id"
        case orderNumber = "order_number"
        case status
        case subtotal
        case tax = "tax_amount"
        case deliveryFee = "delivery_fee"
        case platformFee = "platform_fee"
        case total = "total_amount"
        case estimatedDeliveryTime = "estimated_delivery_time"
        case createdAt = "created_at"
    }
}

/// Response from vendor orders endpoint
public struct P2PVendorOrdersResponse: Codable {
    public let success: Bool
    public let orders: [P2PVendorOrder]
}

/// Item in a vendor order
public struct P2PVendorOrderItem: Codable {
    public let name: String
    public let quantity: Int
    public let unitPrice: Double
    public let totalPrice: Double

    enum CodingKeys: String, CodingKey {
        case name
        case quantity
        case unitPrice = "unit_price"
        case totalPrice = "total_price"
    }
}

/// Delivery address in a vendor order
public struct P2PVendorDeliveryAddress: Codable {
    public let street: String?
    public let city: String?
    public let state: String?
    public let zip: String?
    public let zipCode: String?

    enum CodingKeys: String, CodingKey {
        case street
        case city
        case state
        case zip
        case zipCode = "zip_code"
    }

    /// Get the zip code (supports both "zip" and "zip_code" keys)
    public var resolvedZip: String {
        return zipCode ?? zip ?? ""
    }
}

/// Order model as returned by the vendor orders endpoint
public struct P2PVendorOrder: Codable, Identifiable {
    public let id: Int
    public let orderNumber: String
    public let customerName: String
    public let customerPhone: String?
    public let items: [P2PVendorOrderItem]  // Array of items from backend
    public let subtotal: Double
    public let tax: Double
    public let deliveryFee: Double
    public let total: Double
    public let status: String
    public let deliveryAddress: P2PVendorDeliveryAddress?  // Object from backend
    public let deliveryInstructions: String?
    public let createdAt: String?

    enum CodingKeys: String, CodingKey {
        case id
        case orderNumber = "order_number"
        case customerName = "customer_name"
        case customerPhone = "customer_phone"
        case items
        case subtotal
        case tax
        case deliveryFee = "delivery_fee"
        case total
        case status
        case deliveryAddress = "delivery_address"
        case deliveryInstructions = "delivery_instructions"
        case createdAt = "created_at"
    }

    /// Get items as dictionary array for compatibility
    public var parsedItems: [[String: Any]] {
        return items.map { item in
            [
                "name": item.name,
                "quantity": item.quantity,
                "unit_price": item.unitPrice,
                "total_price": item.totalPrice
            ]
        }
    }

    /// Get delivery address as dictionary for compatibility
    public var parsedDeliveryAddress: [String: String]? {
        guard let addr = deliveryAddress else { return nil }
        return [
            "street": addr.street ?? "",
            "city": addr.city ?? "",
            "state": addr.state ?? "",
            "zip": addr.resolvedZip
        ]
    }

    /// Convert to shared Order model for compatibility
    public func toOrder(vendorId: String, restaurantName: String) -> Order {
        // Parse createdAt to timestamp
        let timestamp: Int64
        if let createdAtString = createdAt {
            let formatter = ISO8601DateFormatter()
            formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
            if let date = formatter.date(from: createdAtString) {
                timestamp = Int64(date.timeIntervalSince1970 * 1000)
            } else {
                // Try without fractional seconds
                formatter.formatOptions = [.withInternetDateTime]
                if let date = formatter.date(from: createdAtString) {
                    timestamp = Int64(date.timeIntervalSince1970 * 1000)
                } else {
                    timestamp = Int64(Date().timeIntervalSince1970 * 1000)
                }
            }
        } else {
            timestamp = Int64(Date().timeIntervalSince1970 * 1000)
        }

        // Convert typed items to OrderItem array
        let orderItems: [OrderItem] = items.map { item in
            OrderItem(
                menuItemId: "0",
                name: item.name,
                price: item.unitPrice,
                quantity: item.quantity,
                options: nil
            )
        }

        // Convert typed address to DeliveryAddress
        let addr = deliveryAddress
        let deliveryAddr = DeliveryAddress(
            fullAddress: addr.map { "\($0.street ?? ""), \($0.city ?? ""), \($0.state ?? "") \($0.resolvedZip)" } ?? "",
            street: addr?.street ?? "",
            city: addr?.city ?? "",
            state: addr?.state ?? "",
            zipCode: addr?.resolvedZip ?? "",
            latitude: 0,
            longitude: 0,
            landmark: deliveryInstructions
        )

        // Map P2P status to Firebase status
        let mappedStatus: String
        switch status.lowercased() {
        case "pending", "pending_payment":
            mappedStatus = "Placed"
        case "confirmed":
            mappedStatus = "Accepted"
        case "preparing":
            mappedStatus = "Preparing"
        case "ready", "ready_for_pickup":
            mappedStatus = "Ready"
        case "picked_up", "out_for_delivery":
            mappedStatus = "PickedUp"
        case "delivered":
            mappedStatus = "Delivered"
        case "cancelled":
            mappedStatus = "Cancelled"
        default:
            mappedStatus = status
        }

        return Order(
            id: String(id),  // Database ID for API calls
            orderId: orderNumber,  // Display order number (e.g., "EF120500009")
            customerId: "",
            customerName: customerName,
            customerEmail: "",
            deliveryAddress: deliveryAddr,
            deliveryInstructions: deliveryInstructions ?? "",
            restaurant: RestaurantInfo(
                id: vendorId,
                name: restaurantName,
                address: "",
                latitude: 0,
                longitude: 0,
                imageUrl: ""
            ),
            items: orderItems,
            itemsCount: orderItems.count,
            subtotal: subtotal,
            deliveryFee: deliveryFee,
            serviceFee: 0,
            priorityFee: 0,
            smallOrderFee: 0,
            tax: tax,
            total: total,
            status: mappedStatus,
            placedAt: timestamp
        )
    }
}

// MARK: - Customer Auth Response Models

public struct P2PPasswordResetResponse: Codable {
    public let message: String
    public let success: Bool

    enum CodingKeys: String, CodingKey {
        case message
        case success
    }
}

public struct P2PCustomerLoginResponse: Codable {
    public let accessToken: String
    public let tokenType: String
    public let customerId: Int
    public let email: String
    public let fullName: String
    public let phone: String?

    enum CodingKeys: String, CodingKey {
        case accessToken = "access_token"
        case tokenType = "token_type"
        case customerId = "customer_id"
        case email
        case fullName = "full_name"
        case name  // Backend may return "name" instead of "full_name"
        case phone
    }

    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        accessToken = try container.decode(String.self, forKey: .accessToken)
        tokenType = try container.decode(String.self, forKey: .tokenType)
        customerId = try container.decode(Int.self, forKey: .customerId)
        email = try container.decode(String.self, forKey: .email)
        phone = try container.decodeIfPresent(String.self, forKey: .phone)

        // Try "full_name" first, fall back to "name"
        if let name = try container.decodeIfPresent(String.self, forKey: .fullName) {
            fullName = name
        } else if let name = try container.decodeIfPresent(String.self, forKey: .name) {
            fullName = name
        } else {
            fullName = ""
        }
    }

    public func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(accessToken, forKey: .accessToken)
        try container.encode(tokenType, forKey: .tokenType)
        try container.encode(customerId, forKey: .customerId)
        try container.encode(email, forKey: .email)
        try container.encode(fullName, forKey: .fullName)
        try container.encodeIfPresent(phone, forKey: .phone)
    }
}

// MARK: - Customer Order Models

/// Order model as returned by the customer orders endpoint
public struct P2PCustomerOrder: Codable, Identifiable {
    public let id: Int
    public let orderNumber: String
    public let status: String
    public let vendorId: Int
    public let vendorName: String?
    public let customerName: String
    public let customerPhone: String?
    public let totalAmount: Double
    public let subtotal: Double
    public let taxAmount: Double
    public let deliveryFee: Double
    public let tip: Double?
    public let items: String  // JSON string of items
    public let deliveryAddress: String?  // JSON string
    public let deliveryInstructions: String?
    public let driverId: Int?
    public let driverName: String?
    public let driverLocation: String?  // JSON string with lat/lng
    public let pickupLatitude: Double?
    public let pickupLongitude: Double?
    public let deliveryLatitude: Double?
    public let deliveryLongitude: Double?
    public let createdAt: String?
    public let confirmedAt: String?
    public let preparingAt: String?
    public let readyAt: String?
    public let pickedUpAt: String?
    public let deliveredAt: String?

    enum CodingKeys: String, CodingKey {
        case id
        case orderNumber = "order_number"
        case status
        case vendorId = "vendor_id"
        case vendorName = "vendor_name"
        case customerName = "customer_name"
        case customerPhone = "customer_phone"
        case totalAmount = "total_amount"
        case subtotal
        case taxAmount = "tax_amount"
        case deliveryFee = "delivery_fee"
        case tip
        case items
        case deliveryAddress = "delivery_address"
        case deliveryInstructions = "delivery_instructions"
        case driverId = "driver_id"
        case driverName = "driver_name"
        case driverLocation = "driver_location"
        case pickupLatitude = "pickup_latitude"
        case pickupLongitude = "pickup_longitude"
        case deliveryLatitude = "delivery_latitude"
        case deliveryLongitude = "delivery_longitude"
        case createdAt = "created_at"
        case confirmedAt = "confirmed_at"
        case preparingAt = "preparing_at"
        case readyAt = "ready_at"
        case pickedUpAt = "picked_up_at"
        case deliveredAt = "delivered_at"
    }

    /// Parse items JSON string into array
    public var parsedItems: [[String: Any]] {
        guard let data = items.data(using: .utf8),
              let array = try? JSONSerialization.jsonObject(with: data) as? [[String: Any]] else {
            return []
        }
        return array
    }

    /// Parse delivery address JSON string
    public var parsedDeliveryAddress: [String: String]? {
        guard let addressString = deliveryAddress,
              let data = addressString.data(using: .utf8),
              let dict = try? JSONSerialization.jsonObject(with: data) as? [String: String] else {
            return nil
        }
        return dict
    }

    /// Parse driver location
    public var parsedDriverLocation: (latitude: Double, longitude: Double)? {
        guard let locationString = driverLocation,
              let data = locationString.data(using: .utf8),
              let dict = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let lat = dict["latitude"] as? Double,
              let lng = dict["longitude"] as? Double else {
            return nil
        }
        return (latitude: lat, longitude: lng)
    }

    /// Map P2P status to display status
    public var displayStatus: String {
        switch status.lowercased() {
        case "pending", "pending_payment":
            return "Placed"
        case "confirmed":
            return "Confirmed"
        case "preparing":
            return "Preparing"
        case "ready", "ready_for_pickup":
            return "Ready"
        case "out_for_delivery":
            return "Out for Delivery"
        case "delivered":
            return "Delivered"
        case "cancelled":
            return "Cancelled"
        default:
            return status.capitalized
        }
    }

    /// Check if order is currently active (not completed or cancelled)
    public var isActive: Bool {
        let completedStatuses = ["delivered", "cancelled"]
        return !completedStatuses.contains(status.lowercased())
    }

    /// Convert to shared Order model for compatibility
    public func toOrder() -> Order {
        // Parse createdAt to timestamp
        let timestamp: Int64
        if let createdAtString = createdAt {
            let formatter = ISO8601DateFormatter()
            formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
            if let date = formatter.date(from: createdAtString) {
                timestamp = Int64(date.timeIntervalSince1970 * 1000)
            } else {
                formatter.formatOptions = [.withInternetDateTime]
                if let date = formatter.date(from: createdAtString) {
                    timestamp = Int64(date.timeIntervalSince1970 * 1000)
                } else {
                    timestamp = Int64(Date().timeIntervalSince1970 * 1000)
                }
            }
        } else {
            timestamp = Int64(Date().timeIntervalSince1970 * 1000)
        }

        // Parse items
        let orderItems: [OrderItem] = parsedItems.map { item in
            OrderItem(
                menuItemId: String(item["menu_item_id"] as? Int ?? 0),
                name: item["name"] as? String ?? "Unknown",
                price: item["unit_price"] as? Double ?? item["price"] as? Double ?? 0,
                quantity: item["quantity"] as? Int ?? 1,
                options: nil
            )
        }

        // Parse address
        let addr = parsedDeliveryAddress
        let deliveryAddr = DeliveryAddress(
            fullAddress: addr.map { "\($0["street"] ?? ""), \($0["city"] ?? ""), \($0["state"] ?? "") \($0["zip"] ?? "")" } ?? "",
            street: addr?["street"] ?? "",
            city: addr?["city"] ?? "",
            state: addr?["state"] ?? "",
            zipCode: addr?["zip"] ?? "",
            latitude: deliveryLatitude ?? 0,
            longitude: deliveryLongitude ?? 0,
            landmark: deliveryInstructions
        )

        return Order(
            orderId: orderNumber,
            customerId: "",
            customerName: customerName,
            customerEmail: "",
            deliveryAddress: deliveryAddr,
            deliveryInstructions: deliveryInstructions ?? "",
            restaurant: RestaurantInfo(
                id: String(vendorId),
                name: vendorName ?? "Restaurant",
                address: "",
                latitude: pickupLatitude ?? 0,
                longitude: pickupLongitude ?? 0,
                imageUrl: ""
            ),
            items: orderItems,
            itemsCount: orderItems.count,
            subtotal: subtotal,
            deliveryFee: deliveryFee,
            serviceFee: 0,
            priorityFee: 0,
            smallOrderFee: 0,
            tax: taxAmount,
            total: totalAmount,
            status: displayStatus,
            placedAt: timestamp,
            driverId: driverId != nil ? String(driverId!) : nil
        )
    }
}

// MARK: - Order Tracking Model

public struct P2POrderTracking: Codable {
    public let orderId: Int
    public let orderNumber: String
    public let status: String
    public let vendorName: String?
    public let vendorAddress: String?
    public let pickupLatitude: Double?
    public let pickupLongitude: Double?
    public let deliveryAddress: String?
    public let deliveryLatitude: Double?
    public let deliveryLongitude: Double?
    public let driverId: Int?
    public let driverName: String?
    public let driverPhone: String?
    public let driverLatitude: Double?
    public let driverLongitude: Double?
    public let estimatedDeliveryTime: String?
    public let statusHistory: [P2POrderStatusEvent]?

    enum CodingKeys: String, CodingKey {
        case orderId = "order_id"
        case orderNumber = "order_number"
        case status
        case vendorName = "vendor_name"
        case vendorAddress = "vendor_address"
        case pickupLatitude = "pickup_latitude"
        case pickupLongitude = "pickup_longitude"
        case deliveryAddress = "delivery_address"
        case deliveryLatitude = "delivery_latitude"
        case deliveryLongitude = "delivery_longitude"
        case driverId = "driver_id"
        case driverName = "driver_name"
        case driverPhone = "driver_phone"
        case driverLatitude = "driver_latitude"
        case driverLongitude = "driver_longitude"
        case estimatedDeliveryTime = "estimated_delivery_time"
        case statusHistory = "status_history"
    }

    /// Map P2P status to display status
    public var displayStatus: String {
        switch status.lowercased() {
        case "pending", "pending_payment":
            return "Placed"
        case "confirmed":
            return "Confirmed"
        case "preparing":
            return "Preparing"
        case "ready", "ready_for_pickup":
            return "Ready"
        case "out_for_delivery":
            return "Out for Delivery"
        case "delivered":
            return "Delivered"
        case "cancelled":
            return "Cancelled"
        default:
            return status.capitalized
        }
    }
}

public struct P2POrderStatusEvent: Codable {
    public let status: String
    public let timestamp: String
    public let note: String?
}

// MARK: - Enterprise WebSocket Manager

/// WebSocket Manager for real-time updates
public class P2PWebSocketManager: NSObject, ObservableObject, URLSessionWebSocketDelegate {
    public static let shared = P2PWebSocketManager()

    @Published public var isConnected = false
    @Published public var lastMessage: P2PWebSocketMessage?

    private var webSocketTask: URLSessionWebSocketTask?
    private var session: URLSession!
    private var clientType: String = "customer"
    private var clientId: String = ""

    // Production WebSocket URL - connected to Dollar.ai live backend
    private let wsBaseURL = "wss://dollor.ai/api/realtime/ws"

    private override init() {
        super.init()
        session = URLSession(configuration: .default, delegate: self, delegateQueue: nil)
    }

    /// Connect to WebSocket server
    public func connect(clientType: String, clientId: String) {
        self.clientType = clientType
        self.clientId = clientId

        guard let url = URL(string: "\(wsBaseURL)/\(clientType)/\(clientId)") else {
            print("[WebSocket] Invalid URL")
            return
        }

        webSocketTask = session.webSocketTask(with: url)
        webSocketTask?.resume()

        DispatchQueue.main.async {
            self.isConnected = true
        }

        receiveMessage()
        startPingTimer()

        print("[WebSocket] Connecting to \(url.absoluteString)")
    }

    /// Disconnect from WebSocket server
    public func disconnect() {
        webSocketTask?.cancel(with: .goingAway, reason: nil)
        DispatchQueue.main.async {
            self.isConnected = false
        }
        print("[WebSocket] Disconnected")
    }

    /// Receive messages recursively
    private func receiveMessage() {
        webSocketTask?.receive { [weak self] result in
            switch result {
            case .success(let message):
                switch message {
                case .string(let text):
                    self?.handleTextMessage(text)
                case .data(let data):
                    if let text = String(data: data, encoding: .utf8) {
                        self?.handleTextMessage(text)
                    }
                @unknown default:
                    break
                }
                // Continue listening
                self?.receiveMessage()

            case .failure(let error):
                print("[WebSocket] Receive error: \(error)")
                DispatchQueue.main.async {
                    self?.isConnected = false
                }
            }
        }
    }

    private func handleTextMessage(_ text: String) {
        guard let data = text.data(using: .utf8) else { return }

        do {
            let message = try JSONDecoder().decode(P2PWebSocketMessage.self, from: data)
            DispatchQueue.main.async {
                self.lastMessage = message
                NotificationCenter.default.post(
                    name: .p2pWebSocketMessage,
                    object: nil,
                    userInfo: ["message": message]
                )
            }
            print("[WebSocket] Received: \(message.type)")
        } catch {
            print("[WebSocket] Failed to decode message: \(error)")
        }
    }

    /// Send ping to keep connection alive
    private func startPingTimer() {
        DispatchQueue.global().asyncAfter(deadline: .now() + 30) { [weak self] in
            self?.sendPing()
        }
    }

    private func sendPing() {
        guard isConnected else { return }

        let pingMessage = ["type": "ping"]
        if let data = try? JSONSerialization.data(withJSONObject: pingMessage) {
            webSocketTask?.send(.data(data)) { [weak self] error in
                if let error = error {
                    print("[WebSocket] Ping error: \(error)")
                } else {
                    self?.startPingTimer()
                }
            }
        }
    }

    // MARK: - URLSessionWebSocketDelegate

    public func urlSession(_ session: URLSession, webSocketTask: URLSessionWebSocketTask, didOpenWithProtocol protocol: String?) {
        print("[WebSocket] Connected")
        DispatchQueue.main.async {
            self.isConnected = true
        }
    }

    public func urlSession(_ session: URLSession, webSocketTask: URLSessionWebSocketTask, didCloseWith closeCode: URLSessionWebSocketTask.CloseCode, reason: Data?) {
        print("[WebSocket] Closed with code: \(closeCode)")
        DispatchQueue.main.async {
            self.isConnected = false
        }
    }
}

/// WebSocket Message Model
public struct P2PWebSocketMessage: Codable {
    public let type: String
    public let orderId: Int?
    public let orderNumber: String?
    public let status: String?
    public let payload: [String: AnyCodable]?
    public let timestamp: String?

    enum CodingKeys: String, CodingKey {
        case type
        case orderId = "order_id"
        case orderNumber = "order_number"
        case status
        case payload
        case timestamp
    }
}

/// Helper for encoding/decoding Any types
public struct AnyCodable: Codable {
    public let value: Any

    public init(_ value: Any) {
        self.value = value
    }

    public init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        if let intValue = try? container.decode(Int.self) {
            value = intValue
        } else if let doubleValue = try? container.decode(Double.self) {
            value = doubleValue
        } else if let stringValue = try? container.decode(String.self) {
            value = stringValue
        } else if let boolValue = try? container.decode(Bool.self) {
            value = boolValue
        } else {
            value = ""
        }
    }

    public func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        if let intValue = value as? Int {
            try container.encode(intValue)
        } else if let doubleValue = value as? Double {
            try container.encode(doubleValue)
        } else if let stringValue = value as? String {
            try container.encode(stringValue)
        } else if let boolValue = value as? Bool {
            try container.encode(boolValue)
        }
    }
}

/// Notification name for WebSocket messages
public extension Notification.Name {
    static let p2pWebSocketMessage = Notification.Name("p2pWebSocketMessage")
}

// MARK: - P2PAPIService Extensions for Enterprise Features

extension P2PAPIService {

    // MARK: - FCM Token Management

    /// Save FCM token for customer
    public func saveCustomerFCMToken(
        customerId: Int,
        token: String,
        completion: @escaping (Result<Bool, Error>) -> Void
    ) {
        guard let url = URL(string: "\(baseURL)/erp/customers/\(customerId)/fcm-token") else {
            completion(.failure(P2PAPIError.invalidURL))
            return
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let body = ["token": token, "device_type": "ios"]
        request.httpBody = try? JSONSerialization.data(withJSONObject: body)

        URLSession.shared.dataTask(with: request) { data, response, error in
            DispatchQueue.main.async {
                if let error = error {
                    completion(.failure(error))
                    return
                }
                completion(.success(true))
            }
        }.resume()
    }

    /// Save FCM token for driver
    public func saveDriverFCMToken(
        driverId: Int,
        token: String,
        completion: @escaping (Result<Bool, Error>) -> Void
    ) {
        guard let url = URL(string: "\(baseURL)/erp/drivers/\(driverId)/fcm-token") else {
            completion(.failure(P2PAPIError.invalidURL))
            return
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let body = ["token": token, "device_type": "ios"]
        request.httpBody = try? JSONSerialization.data(withJSONObject: body)

        URLSession.shared.dataTask(with: request) { data, response, error in
            DispatchQueue.main.async {
                if let error = error {
                    completion(.failure(error))
                    return
                }
                completion(.success(true))
            }
        }.resume()
    }

    /// Save FCM token for vendor/restaurant
    public func saveVendorFCMToken(
        vendorId: Int,
        token: String,
        completion: @escaping (Result<Bool, Error>) -> Void
    ) {
        guard let url = URL(string: "\(baseURL)/erp/vendors/\(vendorId)/fcm-token") else {
            completion(.failure(P2PAPIError.invalidURL))
            return
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let body = ["token": token, "device_type": "ios"]
        request.httpBody = try? JSONSerialization.data(withJSONObject: body)

        URLSession.shared.dataTask(with: request) { data, response, error in
            DispatchQueue.main.async {
                if let error = error {
                    completion(.failure(error))
                    return
                }
                completion(.success(true))
            }
        }.resume()
    }

    // MARK: - Driver Location Updates

    /// Update driver's current location
    public func updateDriverLocation(
        driverId: Int,
        latitude: Double,
        longitude: Double,
        completion: @escaping (Result<Bool, Error>) -> Void
    ) {
        guard let url = URL(string: "\(baseURL)/erp/drivers/\(driverId)/location") else {
            completion(.failure(P2PAPIError.invalidURL))
            return
        }

        var request = URLRequest(url: url)
        request.httpMethod = "PUT"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let body: [String: Any] = [
            "latitude": latitude,
            "longitude": longitude,
            "updated_at": ISO8601DateFormatter().string(from: Date())
        ]
        request.httpBody = try? JSONSerialization.data(withJSONObject: body)

        URLSession.shared.dataTask(with: request) { data, response, error in
            DispatchQueue.main.async {
                if let error = error {
                    completion(.failure(error))
                    return
                }
                completion(.success(true))
            }
        }.resume()
    }

    /// Update driver online/offline status
    public func updateDriverOnlineStatus(
        driverId: Int,
        isOnline: Bool,
        completion: @escaping (Result<Bool, Error>) -> Void
    ) {
        guard let url = URL(string: "\(baseURL)/erp/drivers/\(driverId)/status?is_online=\(isOnline)") else {
            completion(.failure(P2PAPIError.invalidURL))
            return
        }

        var request = URLRequest(url: url)
        request.httpMethod = "PUT"

        URLSession.shared.dataTask(with: request) { data, response, error in
            DispatchQueue.main.async {
                if let error = error {
                    completion(.failure(error))
                    return
                }
                completion(.success(true))
            }
        }.resume()
    }

    /// Save FCM token for push notifications
    public func saveDriverFCMToken(
        driverId: Int,
        fcmToken: String,
        completion: @escaping (Result<Bool, Error>) -> Void
    ) {
        guard let url = URL(string: "\(baseURL)/erp/drivers/\(driverId)/fcm-token") else {
            completion(.failure(P2PAPIError.invalidURL))
            return
        }

        var request = URLRequest(url: url)
        request.httpMethod = "PUT"
        request.addValue("application/json", forHTTPHeaderField: "Content-Type")

        let body: [String: Any] = ["fcm_token": fcmToken]
        request.httpBody = try? JSONSerialization.data(withJSONObject: body)

        URLSession.shared.dataTask(with: request) { data, response, error in
            DispatchQueue.main.async {
                if let error = error {
                    completion(.failure(error))
                    return
                }
                completion(.success(true))
            }
        }.resume()
    }

    // MARK: - Order Tracking

    /// Get full order tracking info (for customer app)
    public func getFullOrderTracking(
        orderId: Int,
        completion: @escaping (Result<P2PFullOrderTracking, Error>) -> Void
    ) {
        guard let url = URL(string: "\(baseURL)/erp/orders/\(orderId)/full-tracking") else {
            completion(.failure(P2PAPIError.invalidURL))
            return
        }

        URLSession.shared.dataTask(with: url) { data, response, error in
            DispatchQueue.main.async {
                if let error = error {
                    completion(.failure(error))
                    return
                }

                guard let data = data else {
                    completion(.failure(P2PAPIError.noData))
                    return
                }

                do {
                    let tracking = try JSONDecoder().decode(P2PFullOrderTracking.self, from: data)
                    completion(.success(tracking))
                } catch {
                    completion(.failure(error))
                }
            }
        }.resume()
    }

    /// Get driver location for an order
    public func getDriverLocation(
        orderId: Int,
        completion: @escaping (Result<P2PDriverLocation, Error>) -> Void
    ) {
        guard let url = URL(string: "\(baseURL)/erp/orders/\(orderId)/driver-location") else {
            completion(.failure(P2PAPIError.invalidURL))
            return
        }

        URLSession.shared.dataTask(with: url) { data, response, error in
            DispatchQueue.main.async {
                if let error = error {
                    completion(.failure(error))
                    return
                }

                guard let data = data else {
                    completion(.failure(P2PAPIError.noData))
                    return
                }

                do {
                    let location = try JSONDecoder().decode(P2PDriverLocation.self, from: data)
                    completion(.success(location))
                } catch {
                    completion(.failure(error))
                }
            }
        }.resume()
    }

    // MARK: - Enterprise Analytics

    /// Get real-time analytics (for admin dashboard)
    public func getRealtimeAnalytics(
        completion: @escaping (Result<P2PRealtimeAnalytics, Error>) -> Void
    ) {
        guard let url = URL(string: "\(baseURL)/erp/analytics/realtime") else {
            completion(.failure(P2PAPIError.invalidURL))
            return
        }

        URLSession.shared.dataTask(with: url) { data, response, error in
            DispatchQueue.main.async {
                if let error = error {
                    completion(.failure(error))
                    return
                }

                guard let data = data else {
                    completion(.failure(P2PAPIError.noData))
                    return
                }

                do {
                    let analytics = try JSONDecoder().decode(P2PRealtimeAnalytics.self, from: data)
                    completion(.success(analytics))
                } catch {
                    completion(.failure(error))
                }
            }
        }.resume()
    }

    /// Get AI employee stats
    public func getAIEmployeeStats(
        completion: @escaping (Result<P2PAIEmployeeStats, Error>) -> Void
    ) {
        guard let url = URL(string: "\(baseURL)/erp/analytics/ai-employees") else {
            completion(.failure(P2PAPIError.invalidURL))
            return
        }

        URLSession.shared.dataTask(with: url) { data, response, error in
            DispatchQueue.main.async {
                if let error = error {
                    completion(.failure(error))
                    return
                }

                guard let data = data else {
                    completion(.failure(P2PAPIError.noData))
                    return
                }

                do {
                    let stats = try JSONDecoder().decode(P2PAIEmployeeStats.self, from: data)
                    completion(.success(stats))
                } catch {
                    completion(.failure(error))
                }
            }
        }.resume()
    }
}

// MARK: - Enterprise Response Models

public struct P2PFullOrderTracking: Codable {
    public let success: Bool
    public let order: P2PTrackingOrder
    public let restaurant: P2PTrackingRestaurant
    public let driver: P2PTrackingDriver?
    public let timeline: [P2PTimelineEvent]
    public let estimatedDelivery: String?

    enum CodingKeys: String, CodingKey {
        case success, order, restaurant, driver, timeline
        case estimatedDelivery = "estimated_delivery"
    }
}

public struct P2PTrackingOrder: Codable {
    public let id: Int
    public let orderNumber: String
    public let status: String
    public let subtotal: Double
    public let tax: Double
    public let deliveryFee: Double
    public let tip: Double
    public let total: Double

    enum CodingKeys: String, CodingKey {
        case id
        case orderNumber = "order_number"
        case status, subtotal, tax
        case deliveryFee = "delivery_fee"
        case tip, total
    }
}

public struct P2PTrackingRestaurant: Codable {
    public let id: Int?
    public let name: String?
    public let address: String?
    public let phone: String?
    public let latitude: Double?
    public let longitude: Double?
}

public struct P2PTrackingDriver: Codable {
    public let id: Int?
    public let name: String?
    public let phone: String?
    public let rating: Double?
    public let photoUrl: String?
    public let vehicle: String?
    public let licensePlate: String?
    public let location: P2PLocation?

    enum CodingKeys: String, CodingKey {
        case id, name, phone, rating
        case photoUrl = "photo_url"
        case vehicle
        case licensePlate = "license_plate"
        case location
    }
}

public struct P2PTimelineEvent: Codable {
    public let status: String
    public let time: String
}

public struct P2PDriverLocation: Codable {
    public let success: Bool
    public let orderId: Int
    public let driver: P2PDriverInfo?
    public let location: P2PLocation?
    public let orderStatus: String
    public let estimatedArrival: String?

    enum CodingKeys: String, CodingKey {
        case success
        case orderId = "order_id"
        case driver, location
        case orderStatus = "order_status"
        case estimatedArrival = "estimated_arrival"
    }
}

public struct P2PDriverInfo: Codable {
    public let id: Int?
    public let name: String?
    public let phone: String?
    public let rating: Double?
    public let photoUrl: String?

    enum CodingKeys: String, CodingKey {
        case id, name, phone, rating
        case photoUrl = "photo_url"
    }
}

public struct P2PRealtimeAnalytics: Codable {
    public let success: Bool
    public let timestamp: String
    public let processedBy: String
    public let orders: P2POrdersAnalytics
    public let drivers: P2PDriversAnalytics
    public let restaurants: P2PRestaurantsAnalytics
    public let revenue: P2PRevenueAnalytics
    public let performance: P2PPerformanceAnalytics

    enum CodingKeys: String, CodingKey {
        case success, timestamp
        case processedBy = "processed_by"
        case orders, drivers, restaurants, revenue, performance
    }
}

public struct P2POrdersAnalytics: Codable {
    public let byStatus: [String: Int]
    public let totalToday: Int
    public let active: Int

    enum CodingKeys: String, CodingKey {
        case byStatus = "by_status"
        case totalToday = "total_today"
        case active
    }
}

public struct P2PDriversAnalytics: Codable {
    public let totalActive: Int
    public let onlineNow: Int
    public let utilizationRate: Double

    enum CodingKeys: String, CodingKey {
        case totalActive = "total_active"
        case onlineNow = "online_now"
        case utilizationRate = "utilization_rate"
    }
}

public struct P2PRestaurantsAnalytics: Codable {
    public let active: Int
}

public struct P2PRevenueAnalytics: Codable {
    public let totalToday: Double
    public let platformFees: Double
    public let deliveryFees: Double
    public let tipsCollected: Double
    public let ordersCompleted: Int

    enum CodingKeys: String, CodingKey {
        case totalToday = "total_today"
        case platformFees = "platform_fees"
        case deliveryFees = "delivery_fees"
        case tipsCollected = "tips_collected"
        case ordersCompleted = "orders_completed"
    }
}

public struct P2PPerformanceAnalytics: Codable {
    public let avgPrepTimeMinutes: Double?
    public let avgDeliveryTimeMinutes: Double?

    enum CodingKeys: String, CodingKey {
        case avgPrepTimeMinutes = "avg_prep_time_minutes"
        case avgDeliveryTimeMinutes = "avg_delivery_time_minutes"
    }
}

public struct P2PAIEmployeeStats: Codable {
    public let success: Bool
    public let timestamp: String
    public let aiEmployees: [P2PAIEmployee]
    public let systemHealth: P2PSystemHealth

    enum CodingKeys: String, CodingKey {
        case success, timestamp
        case aiEmployees = "ai_employees"
        case systemHealth = "system_health"
    }
}

public struct P2PAIEmployee: Codable {
    public let id: String
    public let name: String
    public let role: String
    public let tasksToday: Int
    public let status: String
    public let efficiency: String

    enum CodingKeys: String, CodingKey {
        case id, name, role
        case tasksToday = "tasks_today"
        case status, efficiency
    }
}

public struct P2PSystemHealth: Codable {
    public let allEmployeesOnline: Bool
    public let processingDelayMs: Int
    public let errorRate: String

    enum CodingKeys: String, CodingKey {
        case allEmployeesOnline = "all_employees_online"
        case processingDelayMs = "processing_delay_ms"
        case errorRate = "error_rate"
    }
}
