import SwiftUI
import EatFairShared

// MARK: - Registration Step Enum
enum RegistrationStep: Int, CaseIterable {
    case restaurantInfo = 0
    case contactLocation = 1
    case operations = 2
    case review = 3

    var title: String {
        switch self {
        case .restaurantInfo: return "Restaurant"
        case .contactLocation: return "Location"
        case .operations: return "Operations"
        case .review: return "Review"
        }
    }

    var subtitle: String {
        switch self {
        case .restaurantInfo: return "Basic Info"
        case .contactLocation: return "Address"
        case .operations: return "Hours & Services"
        case .review: return "Submit"
        }
    }

    var icon: String {
        switch self {
        case .restaurantInfo: return "building.2"
        case .contactLocation: return "location"
        case .operations: return "clock"
        case .review: return "doc.text"
        }
    }
}

// MARK: - Cuisine Types (matching Web)
let cuisineTypes = [
    "American", "Chinese", "Indian", "Italian", "Japanese",
    "Mexican", "Thai", "Mediterranean", "Fast Food", "Vietnamese",
    "Korean", "Greek", "French", "Spanish", "Other"
]

// MARK: - Form Data Model
struct RegistrationFormData {
    // Step 1: Restaurant Info
    var restaurantName: String = ""
    var cuisineType: String = ""
    var description: String = ""
    var contactName: String = ""
    var contactEmail: String = ""
    var contactPhone: String = ""
    var password: String = ""
    var confirmPassword: String = ""

    // Step 2: Contact & Location
    var streetAddress: String = ""
    var city: String = ""
    var state: String = ""
    var zipCode: String = ""
    var website: String = ""

    // Step 3: Operations
    var seatingCapacity: String = "50"
    var avgPrepTime: String = "25"
    var deliveryAvailable: Bool = true
    var pickupAvailable: Bool = true
    var mondayHours: String = "9:00 AM - 9:00 PM"
    var tuesdayHours: String = "9:00 AM - 9:00 PM"
    var wednesdayHours: String = "9:00 AM - 9:00 PM"
    var thursdayHours: String = "9:00 AM - 9:00 PM"
    var fridayHours: String = "9:00 AM - 10:00 PM"
    var saturdayHours: String = "10:00 AM - 10:00 PM"
    var sundayHours: String = "10:00 AM - 9:00 PM"

    // Step 4: Terms
    var acceptedTerms: Bool = false
    var acceptedPrivacy: Bool = false
}

// MARK: - Main Registration View
struct RestaurantRegistrationView: View {
    @Binding var isPresented: Bool
    @Binding var isLoggedIn: Bool

    @State private var currentStep: RegistrationStep = .restaurantInfo
    @State private var formData = RegistrationFormData()
    @State private var isLoading = false
    @State private var errorMessage = ""
    @State private var showSuccessView = false
    @State private var registeredVendorId: Int?

    private let p2pAPI = P2PAPIService.shared

    // Brand colors matching Web
    private let dollorGold = Color(red: 1.0, green: 0.84, blue: 0.0)
    private let dollorDark = Color(red: 0.1, green: 0.1, blue: 0.18)

    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                // Step Progress Indicator
                StepProgressView(currentStep: currentStep)
                    .padding(.horizontal)
                    .padding(.top, 8)

                // Content
                ScrollView {
                    VStack(spacing: 24) {
                        switch currentStep {
                        case .restaurantInfo:
                            Step1RestaurantInfoView(formData: $formData, errorMessage: $errorMessage)
                        case .contactLocation:
                            Step2ContactLocationView(formData: $formData, errorMessage: $errorMessage)
                        case .operations:
                            Step3OperationsView(formData: $formData)
                        case .review:
                            Step4ReviewView(formData: $formData, errorMessage: $errorMessage)
                        }
                    }
                    .padding()
                }

                // Error Message
                if !errorMessage.isEmpty {
                    HStack {
                        Image(systemName: "exclamationmark.circle.fill")
                            .foregroundColor(.red)
                        Text(errorMessage)
                            .foregroundColor(.red)
                            .font(.subheadline)
                    }
                    .padding()
                    .background(Color.red.opacity(0.1))
                    .cornerRadius(8)
                    .padding(.horizontal)
                }

                // Navigation Buttons
                HStack(spacing: 16) {
                    if currentStep != .restaurantInfo {
                        Button(action: goBack) {
                            HStack {
                                Image(systemName: "arrow.left")
                                Text("Back")
                            }
                            .foregroundColor(.gray)
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(Color.gray.opacity(0.1))
                            .cornerRadius(12)
                        }
                    }

                    Button(action: goNext) {
                        HStack {
                            if isLoading {
                                ProgressView()
                                    .progressViewStyle(CircularProgressViewStyle(tint: .white))
                            } else {
                                Text(currentStep == .review ? "Submit Application" : "Continue")
                                    .fontWeight(.bold)
                                if currentStep != .review {
                                    Image(systemName: "arrow.right")
                                }
                            }
                        }
                        .foregroundColor(dollorDark)
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(dollorGold)
                        .cornerRadius(12)
                    }
                    .disabled(isLoading || !isCurrentStepValid)
                    .opacity(isCurrentStepValid ? 1.0 : 0.6)
                }
                .padding()
            }
            .navigationTitle("Partner Application")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button(action: { isPresented = false }) {
                        Image(systemName: "xmark")
                            .foregroundColor(.gray)
                    }
                }
            }
            .sheet(isPresented: $showSuccessView) {
                RegistrationSuccessView(
                    vendorId: registeredVendorId,
                    email: formData.contactEmail,
                    isPresented: $isPresented,
                    isLoggedIn: $isLoggedIn
                )
            }
        }
    }

    // MARK: - Validation

    private var isCurrentStepValid: Bool {
        switch currentStep {
        case .restaurantInfo:
            return !formData.restaurantName.isEmpty &&
                   !formData.cuisineType.isEmpty &&
                   !formData.contactName.isEmpty &&
                   !formData.contactEmail.isEmpty &&
                   !formData.contactPhone.isEmpty &&
                   !formData.password.isEmpty &&
                   formData.password == formData.confirmPassword &&
                   formData.password.count >= 8 &&
                   EmailValidator.isValid(formData.contactEmail)
        case .contactLocation:
            return !formData.streetAddress.isEmpty &&
                   !formData.city.isEmpty &&
                   !formData.state.isEmpty &&
                   !formData.zipCode.isEmpty
        case .operations:
            return !formData.seatingCapacity.isEmpty &&
                   !formData.avgPrepTime.isEmpty
        case .review:
            return formData.acceptedTerms && formData.acceptedPrivacy
        }
    }

    // MARK: - Navigation

    private func goBack() {
        withAnimation {
            if let previousStep = RegistrationStep(rawValue: currentStep.rawValue - 1) {
                currentStep = previousStep
            }
        }
    }

    private func goNext() {
        errorMessage = ""

        if currentStep == .review {
            submitApplication()
        } else {
            withAnimation {
                if let nextStep = RegistrationStep(rawValue: currentStep.rawValue + 1) {
                    currentStep = nextStep
                }
            }
        }
    }

    // MARK: - Submit Application

    private func submitApplication() {
        isLoading = true
        errorMessage = ""

        // Build operating hours JSON
        let operatingHours: [String: String] = [
            "monday": formData.mondayHours,
            "tuesday": formData.tuesdayHours,
            "wednesday": formData.wednesdayHours,
            "thursday": formData.thursdayHours,
            "friday": formData.fridayHours,
            "saturday": formData.saturdayHours,
            "sunday": formData.sundayHours
        ]

        guard let hoursData = try? JSONEncoder().encode(operatingHours),
              let hoursString = String(data: hoursData, encoding: .utf8) else {
            errorMessage = "Failed to encode operating hours"
            isLoading = false
            return
        }

        // Prepare registration data matching Web API
        let registrationData: [String: Any] = [
            "company_name": formData.restaurantName,
            "restaurant_name": formData.restaurantName,
            "cuisine_type": formData.cuisineType,
            "contact_name": formData.contactName,
            "contact_email": formData.contactEmail,
            "contact_phone": formData.contactPhone,
            "password": formData.password,
            "street": formData.streetAddress,
            "city": formData.city,
            "state": formData.state,
            "zip_code": formData.zipCode,
            "website": formData.website,
            "operating_hours": hoursString,
            "seating_capacity": Int(formData.seatingCapacity) ?? 50,
            "delivery_available": formData.deliveryAvailable,
            "pickup_available": formData.pickupAvailable,
            "average_prep_time": Int(formData.avgPrepTime) ?? 25,
            "notes": formData.description,
            "platform": "ios"
        ]

        // Call P2P API for vendor registration
        p2pAPI.vendorPublicRegister(data: registrationData) { result in
            DispatchQueue.main.async {
                switch result {
                case .success(let response):
                    registeredVendorId = response.id
                    // Auto-login after successful registration
                    autoLoginAfterRegistration()
                case .failure(let error):
                    isLoading = false
                    if let apiError = error as? P2PAPIError {
                        switch apiError {
                        case .serverError(let message):
                            errorMessage = message
                        default:
                            errorMessage = "Registration failed. Please try again."
                        }
                    } else {
                        errorMessage = error.localizedDescription
                    }
                }
            }
        }
    }

    // MARK: - Auto Login After Registration

    private func autoLoginAfterRegistration() {
        // Use the same credentials to log in and get an access token
        p2pAPI.vendorLogin(email: formData.contactEmail, password: formData.password) { result in
            DispatchQueue.main.async {
                isLoading = false
                switch result {
                case .success:
                    // Successfully logged in with access token saved
                    showSuccessView = true
                case .failure:
                    // Registration succeeded but auto-login failed
                    // Still show success - user can log in manually
                    showSuccessView = true
                }
            }
        }
    }
}

// MARK: - Step Progress View
struct StepProgressView: View {
    let currentStep: RegistrationStep

    private let dollorGold = Color(red: 1.0, green: 0.84, blue: 0.0)

    var body: some View {
        HStack(spacing: 0) {
            ForEach(RegistrationStep.allCases, id: \.rawValue) { step in
                HStack(spacing: 0) {
                    // Step indicator
                    VStack(spacing: 4) {
                        ZStack {
                            Circle()
                                .fill(step.rawValue <= currentStep.rawValue ? dollorGold : Color.gray.opacity(0.3))
                                .frame(width: 32, height: 32)

                            if step.rawValue < currentStep.rawValue {
                                Image(systemName: "checkmark")
                                    .font(.system(size: 14, weight: .bold))
                                    .foregroundColor(.black)
                            } else {
                                Image(systemName: step.icon)
                                    .font(.system(size: 12))
                                    .foregroundColor(step.rawValue == currentStep.rawValue ? .black : .gray)
                            }
                        }

                        Text(step.title)
                            .font(.system(size: 10, weight: step.rawValue == currentStep.rawValue ? .semibold : .regular))
                            .foregroundColor(step.rawValue <= currentStep.rawValue ? .primary : .gray)
                    }

                    // Connector line
                    if step != RegistrationStep.allCases.last {
                        Rectangle()
                            .fill(step.rawValue < currentStep.rawValue ? dollorGold : Color.gray.opacity(0.3))
                            .frame(height: 2)
                            .frame(maxWidth: .infinity)
                    }
                }
            }
        }
        .padding(.vertical, 8)
    }
}

// MARK: - Step 1: Restaurant Info
struct Step1RestaurantInfoView: View {
    @Binding var formData: RegistrationFormData
    @Binding var errorMessage: String
    @State private var showCuisinePicker = false

    var body: some View {
        VStack(alignment: .leading, spacing: 20) {
            // Header
            VStack(alignment: .leading, spacing: 8) {
                Text("Restaurant Information")
                    .font(.title2)
                    .fontWeight(.bold)

                Text("Tell us about your restaurant")
                    .font(.subheadline)
                    .foregroundColor(.gray)
            }

            // Restaurant Name
            FormTextField(
                title: "Restaurant Name",
                placeholder: "Enter restaurant name",
                text: $formData.restaurantName,
                icon: "building.2"
            )

            // Cuisine Type
            VStack(alignment: .leading, spacing: 8) {
                Text("Cuisine Type")
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .foregroundColor(.gray)

                Button(action: { showCuisinePicker = true }) {
                    HStack {
                        Image(systemName: "fork.knife")
                            .foregroundColor(.gray)
                        Text(formData.cuisineType.isEmpty ? "Select cuisine type" : formData.cuisineType)
                            .foregroundColor(formData.cuisineType.isEmpty ? .gray : .primary)
                        Spacer()
                        Image(systemName: "chevron.down")
                            .foregroundColor(.gray)
                    }
                    .padding()
                    .background(Color.gray.opacity(0.1))
                    .cornerRadius(10)
                }
            }
            .actionSheet(isPresented: $showCuisinePicker) {
                ActionSheet(
                    title: Text("Select Cuisine Type"),
                    buttons: cuisineTypes.map { cuisine in
                        .default(Text(cuisine)) {
                            formData.cuisineType = cuisine
                        }
                    } + [.cancel()]
                )
            }

            // Description
            VStack(alignment: .leading, spacing: 8) {
                Text("Description (Optional)")
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .foregroundColor(.gray)

                TextEditor(text: $formData.description)
                    .frame(height: 80)
                    .padding(8)
                    .background(Color.gray.opacity(0.1))
                    .cornerRadius(10)
            }

            Divider()

            Text("Contact Information")
                .font(.headline)

            // Contact Name
            FormTextField(
                title: "Contact Name",
                placeholder: "Full name",
                text: $formData.contactName,
                icon: "person"
            )

            // Contact Email
            VStack(alignment: .leading, spacing: 4) {
                FormTextField(
                    title: "Email Address",
                    placeholder: "email@example.com",
                    text: $formData.contactEmail,
                    icon: "envelope",
                    keyboardType: .emailAddress,
                    autocapitalization: .none
                )

                if !formData.contactEmail.isEmpty && !EmailValidator.isValid(formData.contactEmail) {
                    Text(EmailValidator.getErrorMessage(formData.contactEmail) ?? "Invalid email address")
                        .font(.caption)
                        .foregroundColor(.red)
                }
            }

            // Contact Phone
            FormTextField(
                title: "Phone Number",
                placeholder: "(555) 123-4567",
                text: $formData.contactPhone,
                icon: "phone",
                keyboardType: .phonePad
            )

            Divider()

            Text("Account Security")
                .font(.headline)

            // Password
            FormSecureField(
                title: "Password",
                placeholder: "At least 8 characters",
                text: $formData.password,
                icon: "lock"
            )

            // Confirm Password
            FormSecureField(
                title: "Confirm Password",
                placeholder: "Confirm your password",
                text: $formData.confirmPassword,
                icon: "lock.fill"
            )

            if !formData.password.isEmpty && formData.password.count < 8 {
                Text("Password must be at least 8 characters")
                    .font(.caption)
                    .foregroundColor(.orange)
            }

            if !formData.confirmPassword.isEmpty && formData.password != formData.confirmPassword {
                Text("Passwords do not match")
                    .font(.caption)
                    .foregroundColor(.red)
            }
        }
    }
}

// MARK: - Step 2: Contact & Location
struct Step2ContactLocationView: View {
    @Binding var formData: RegistrationFormData
    @Binding var errorMessage: String

    let states = ["AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
                  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
                  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
                  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
                  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"]

    @State private var showStatePicker = false

    var body: some View {
        VStack(alignment: .leading, spacing: 20) {
            // Header
            VStack(alignment: .leading, spacing: 8) {
                Text("Restaurant Location")
                    .font(.title2)
                    .fontWeight(.bold)

                Text("Where is your restaurant located?")
                    .font(.subheadline)
                    .foregroundColor(.gray)
            }

            // Street Address
            FormTextField(
                title: "Street Address",
                placeholder: "123 Main Street",
                text: $formData.streetAddress,
                icon: "location"
            )

            // City
            FormTextField(
                title: "City",
                placeholder: "City",
                text: $formData.city,
                icon: "building"
            )

            // State
            VStack(alignment: .leading, spacing: 8) {
                Text("State")
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .foregroundColor(.gray)

                Button(action: { showStatePicker = true }) {
                    HStack {
                        Image(systemName: "map")
                            .foregroundColor(.gray)
                        Text(formData.state.isEmpty ? "Select state" : formData.state)
                            .foregroundColor(formData.state.isEmpty ? .gray : .primary)
                        Spacer()
                        Image(systemName: "chevron.down")
                            .foregroundColor(.gray)
                    }
                    .padding()
                    .background(Color.gray.opacity(0.1))
                    .cornerRadius(10)
                }
            }
            .actionSheet(isPresented: $showStatePicker) {
                ActionSheet(
                    title: Text("Select State"),
                    buttons: states.map { state in
                        .default(Text(state)) {
                            formData.state = state
                        }
                    } + [.cancel()]
                )
            }

            // ZIP Code
            FormTextField(
                title: "ZIP Code",
                placeholder: "12345",
                text: $formData.zipCode,
                icon: "number",
                keyboardType: .numberPad
            )

            Divider()

            // Website (Optional)
            FormTextField(
                title: "Website (Optional)",
                placeholder: "https://yourrestaurant.com",
                text: $formData.website,
                icon: "globe",
                keyboardType: .URL,
                autocapitalization: .none
            )
        }
    }
}

// MARK: - Step 3: Operations
struct Step3OperationsView: View {
    @Binding var formData: RegistrationFormData

    var body: some View {
        VStack(alignment: .leading, spacing: 20) {
            // Header
            VStack(alignment: .leading, spacing: 8) {
                Text("Operations")
                    .font(.title2)
                    .fontWeight(.bold)

                Text("Set up your restaurant's operational details")
                    .font(.subheadline)
                    .foregroundColor(.gray)
            }

            // Seating Capacity
            FormTextField(
                title: "Seating Capacity",
                placeholder: "50",
                text: $formData.seatingCapacity,
                icon: "person.3",
                keyboardType: .numberPad
            )

            // Average Prep Time
            FormTextField(
                title: "Average Prep Time (minutes)",
                placeholder: "25",
                text: $formData.avgPrepTime,
                icon: "clock",
                keyboardType: .numberPad
            )

            Divider()

            Text("Services Offered")
                .font(.headline)

            // Delivery Toggle
            Toggle(isOn: $formData.deliveryAvailable) {
                HStack {
                    Image(systemName: "bicycle")
                        .foregroundColor(.orange)
                    Text("Delivery Available")
                }
            }
            .padding()
            .background(Color.gray.opacity(0.1))
            .cornerRadius(10)

            // Pickup Toggle
            Toggle(isOn: $formData.pickupAvailable) {
                HStack {
                    Image(systemName: "bag")
                        .foregroundColor(.green)
                    Text("Pickup Available")
                }
            }
            .padding()
            .background(Color.gray.opacity(0.1))
            .cornerRadius(10)

            Divider()

            Text("Operating Hours")
                .font(.headline)

            // Operating Hours
            OperatingHoursRow(day: "Monday", hours: $formData.mondayHours)
            OperatingHoursRow(day: "Tuesday", hours: $formData.tuesdayHours)
            OperatingHoursRow(day: "Wednesday", hours: $formData.wednesdayHours)
            OperatingHoursRow(day: "Thursday", hours: $formData.thursdayHours)
            OperatingHoursRow(day: "Friday", hours: $formData.fridayHours)
            OperatingHoursRow(day: "Saturday", hours: $formData.saturdayHours)
            OperatingHoursRow(day: "Sunday", hours: $formData.sundayHours)
        }
    }
}

// MARK: - Operating Hours Row
struct OperatingHoursRow: View {
    let day: String
    @Binding var hours: String

    var body: some View {
        HStack {
            Text(day)
                .font(.subheadline)
                .frame(width: 100, alignment: .leading)

            TextField("9:00 AM - 9:00 PM", text: $hours)
                .textFieldStyle(RoundedBorderTextFieldStyle())
        }
    }
}

// MARK: - Step 4: Review
struct Step4ReviewView: View {
    @Binding var formData: RegistrationFormData
    @Binding var errorMessage: String

    private let dollorGold = Color(red: 1.0, green: 0.84, blue: 0.0)

    var body: some View {
        VStack(alignment: .leading, spacing: 20) {
            // Header
            VStack(alignment: .leading, spacing: 8) {
                Text("Review & Submit")
                    .font(.title2)
                    .fontWeight(.bold)

                Text("Please review your information before submitting")
                    .font(.subheadline)
                    .foregroundColor(.gray)
            }

            // Summary Card
            VStack(alignment: .leading, spacing: 16) {
                ReviewSection(title: "Restaurant", items: [
                    ("Name", formData.restaurantName),
                    ("Cuisine", formData.cuisineType),
                    ("Description", formData.description.isEmpty ? "Not provided" : formData.description)
                ])

                Divider()

                ReviewSection(title: "Contact", items: [
                    ("Name", formData.contactName),
                    ("Email", formData.contactEmail),
                    ("Phone", formData.contactPhone)
                ])

                Divider()

                ReviewSection(title: "Location", items: [
                    ("Address", formData.streetAddress),
                    ("City", "\(formData.city), \(formData.state) \(formData.zipCode)"),
                    ("Website", formData.website.isEmpty ? "Not provided" : formData.website)
                ])

                Divider()

                ReviewSection(title: "Operations", items: [
                    ("Seating", "\(formData.seatingCapacity) seats"),
                    ("Prep Time", "\(formData.avgPrepTime) minutes"),
                    ("Delivery", formData.deliveryAvailable ? "Available" : "Not available"),
                    ("Pickup", formData.pickupAvailable ? "Available" : "Not available")
                ])
            }
            .padding()
            .background(Color.gray.opacity(0.05))
            .cornerRadius(12)

            Divider()

            // Pricing Info
            VStack(alignment: .leading, spacing: 12) {
                Text("Dollor.AI Pricing")
                    .font(.headline)

                HStack {
                    Image(systemName: "dollarsign.circle.fill")
                        .foregroundColor(dollorGold)
                        .font(.title2)

                    VStack(alignment: .leading) {
                        Text("Just $1 Per Order")
                            .font(.headline)
                        Text("No percentage commission - keep more of your profits!")
                            .font(.caption)
                            .foregroundColor(.gray)
                    }
                }
                .padding()
                .background(dollorGold.opacity(0.1))
                .cornerRadius(10)
            }

            Divider()

            // Terms & Privacy
            VStack(alignment: .leading, spacing: 16) {
                Text("Legal Agreements")
                    .font(.headline)

                Toggle(isOn: $formData.acceptedTerms) {
                    HStack {
                        Image(systemName: formData.acceptedTerms ? "checkmark.square.fill" : "square")
                            .foregroundColor(formData.acceptedTerms ? .green : .gray)
                        Text("I accept the Terms of Service")
                            .font(.subheadline)
                    }
                }
                .toggleStyle(SwitchToggleStyle(tint: .green))

                Toggle(isOn: $formData.acceptedPrivacy) {
                    HStack {
                        Image(systemName: formData.acceptedPrivacy ? "checkmark.square.fill" : "square")
                            .foregroundColor(formData.acceptedPrivacy ? .green : .gray)
                        Text("I accept the Privacy Policy")
                            .font(.subheadline)
                    }
                }
                .toggleStyle(SwitchToggleStyle(tint: .green))

                VStack(alignment: .leading, spacing: 4) {
                    Text("Platform Disclosure")
                        .font(.caption)
                        .fontWeight(.semibold)
                        .foregroundColor(.blue)

                    Text("Dollor.AI is a peer-to-platform matchmaking service that connects restaurants with customers and independent delivery partners. We are NOT a transportation network company (TNC). All delivery services are performed by independent contractors.")
                        .font(.caption)
                        .foregroundColor(.gray)
                }
                .padding(8)
                .background(Color.blue.opacity(0.05))
                .cornerRadius(8)
            }
        }
    }
}

// MARK: - Review Section
struct ReviewSection: View {
    let title: String
    let items: [(String, String)]

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title)
                .font(.subheadline)
                .fontWeight(.semibold)
                .foregroundColor(.gray)

            ForEach(items, id: \.0) { item in
                HStack {
                    Text(item.0)
                        .font(.subheadline)
                        .foregroundColor(.gray)
                    Spacer()
                    Text(item.1)
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .multilineTextAlignment(.trailing)
                }
            }
        }
    }
}

// MARK: - Form Text Field
struct FormTextField: View {
    let title: String
    let placeholder: String
    @Binding var text: String
    let icon: String
    var keyboardType: UIKeyboardType = .default
    var autocapitalization: UITextAutocapitalizationType = .sentences

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title)
                .font(.subheadline)
                .fontWeight(.medium)
                .foregroundColor(.gray)

            HStack {
                Image(systemName: icon)
                    .foregroundColor(.gray)
                    .frame(width: 24)

                TextField(placeholder, text: $text)
                    .keyboardType(keyboardType)
                    .autocapitalization(autocapitalization == .none ? .none : .words)
                    .autocorrectionDisabled()
            }
            .padding()
            .background(Color.gray.opacity(0.1))
            .cornerRadius(10)
        }
    }
}

// MARK: - Form Secure Field
struct FormSecureField: View {
    let title: String
    let placeholder: String
    @Binding var text: String
    let icon: String
    @State private var isVisible = false

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title)
                .font(.subheadline)
                .fontWeight(.medium)
                .foregroundColor(.gray)

            HStack {
                Image(systemName: icon)
                    .foregroundColor(.gray)
                    .frame(width: 24)

                if isVisible {
                    TextField(placeholder, text: $text)
                        .autocapitalization(.none)
                        .autocorrectionDisabled()
                } else {
                    SecureField(placeholder, text: $text)
                }

                Button(action: { isVisible.toggle() }) {
                    Image(systemName: isVisible ? "eye.slash" : "eye")
                        .foregroundColor(.gray)
                }
            }
            .padding()
            .background(Color.gray.opacity(0.1))
            .cornerRadius(10)
        }
    }
}

// MARK: - Registration Success View
struct RegistrationSuccessView: View {
    let vendorId: Int?
    let email: String
    @Binding var isPresented: Bool
    @Binding var isLoggedIn: Bool

    private let dollorGold = Color(red: 1.0, green: 0.84, blue: 0.0)

    var body: some View {
        VStack(spacing: 24) {
            Spacer()

            // Success Icon
            ZStack {
                Circle()
                    .fill(Color.green.opacity(0.1))
                    .frame(width: 120, height: 120)

                Image(systemName: "checkmark.circle.fill")
                    .font(.system(size: 60))
                    .foregroundColor(.green)
            }

            Text("Application Submitted!")
                .font(.title)
                .fontWeight(.bold)

            Text("Thank you for applying to join Dollor.AI!")
                .font(.subheadline)
                .foregroundColor(.gray)
                .multilineTextAlignment(.center)

            // Next Steps Card
            VStack(alignment: .leading, spacing: 16) {
                Text("What's Next?")
                    .font(.headline)

                NextStepRow(number: 1, text: "We'll review your application within 24-48 hours")
                NextStepRow(number: 2, text: "You'll receive an email at \(email)")
                NextStepRow(number: 3, text: "Upload required documents in the app")
                NextStepRow(number: 4, text: "Once approved, your restaurant goes live!")
            }
            .padding()
            .background(Color.gray.opacity(0.05))
            .cornerRadius(12)
            .padding(.horizontal)

            Spacer()

            // Continue Button
            Button(action: {
                isPresented = false
                // Optionally auto-login the user
                isLoggedIn = true
            }) {
                Text("Continue to Dashboard")
                    .fontWeight(.bold)
                    .foregroundColor(.black)
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(dollorGold)
                    .cornerRadius(12)
            }
            .padding(.horizontal)
            .padding(.bottom)
        }
    }
}

// MARK: - Next Step Row
struct NextStepRow: View {
    let number: Int
    let text: String

    private let dollorGold = Color(red: 1.0, green: 0.84, blue: 0.0)

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            ZStack {
                Circle()
                    .fill(dollorGold)
                    .frame(width: 24, height: 24)
                Text("\(number)")
                    .font(.caption)
                    .fontWeight(.bold)
                    .foregroundColor(.black)
            }

            Text(text)
                .font(.subheadline)
                .foregroundColor(.gray)
        }
    }
}

// MARK: - Preview
struct RestaurantRegistrationView_Previews: PreviewProvider {
    static var previews: some View {
        RestaurantRegistrationView(
            isPresented: .constant(true),
            isLoggedIn: .constant(false)
        )
    }
}
