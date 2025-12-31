import SwiftUI
import EatFairShared

/// Registration view - matches Android RegisterScreen
/// Fields: email, password, name, phone, zip code
struct RegisterView: View {
    @EnvironmentObject var authViewModel: AuthViewModel
    @Environment(\.dismiss) private var dismiss

    @State private var email = ""
    @State private var password = ""
    @State private var name = ""
    @State private var phoneNumber = ""
    @State private var zipCode = ""

    @State private var emailError: String?
    @State private var passwordError: String?
    @State private var nameError: String?
    @State private var phoneError: String?
    @State private var zipCodeError: String?

    @State private var isLoading = false
    @State private var showError = false
    @State private var errorMessage = ""

    var onLoginTap: () -> Void
    var onRegisterSuccess: () -> Void

    var body: some View {
        ScrollView {
            VStack(spacing: 0) {
                // Header
                headerSection

                // Form Fields
                VStack(spacing: 20) {
                    emailField
                    passwordField
                    nameField
                    phoneField
                    zipCodeField

                    benefitsCard

                    registerButton

                    termsText

                    loginLink
                }
                .padding(24)
            }
        }
        .background(Color.white)
        .alert("Registration Error", isPresented: $showError) {
            Button("OK", role: .cancel) { }
        } message: {
            Text(errorMessage)
        }
    }

    // MARK: - Header Section
    private var headerSection: some View {
        VStack(spacing: 8) {
            Text("Join EatFair")
                .font(.system(size: 28, weight: .bold))
                .foregroundColor(.white)

            Text("100% goes to restaurants & drivers. You only pay\n$1 transaction fee.")
                .font(.system(size: 14))
                .foregroundColor(.white.opacity(0.95))
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 32)
        .background(Color.accentColor)
    }

    // MARK: - Form Fields
    private var emailField: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Email Address")
                .font(.system(size: 16, weight: .medium))
                .foregroundColor(.black)

            TextField("your@email.com", text: $email)
                .textFieldStyle(RoundedTextFieldStyle(hasError: emailError != nil))
                .keyboardType(.emailAddress)
                .autocapitalization(.none)
                .onChange(of: email) { _ in emailError = nil }

            if let error = emailError {
                Text(error)
                    .font(.caption)
                    .foregroundColor(.red)
            }
        }
    }

    private var passwordField: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Password")
                .font(.system(size: 16, weight: .medium))
                .foregroundColor(.black)

            SecureField("Minimum 6 characters", text: $password)
                .textFieldStyle(RoundedTextFieldStyle(hasError: passwordError != nil))
                .onChange(of: password) { _ in passwordError = nil }

            if let error = passwordError {
                Text(error)
                    .font(.caption)
                    .foregroundColor(.red)
            }
        }
    }

    private var nameField: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Name")
                .font(.system(size: 16, weight: .medium))
                .foregroundColor(.black)

            TextField("John Doe", text: $name)
                .textFieldStyle(RoundedTextFieldStyle(hasError: nameError != nil))
                .onChange(of: name) { _ in nameError = nil }

            if let error = nameError {
                Text(error)
                    .font(.caption)
                    .foregroundColor(.red)
            }
        }
    }

    private var phoneField: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Phone Number")
                .font(.system(size: 16, weight: .medium))
                .foregroundColor(.black)

            TextField("(555) 123-4567", text: $phoneNumber)
                .textFieldStyle(RoundedTextFieldStyle(hasError: phoneError != nil))
                .keyboardType(.phonePad)
                .onChange(of: phoneNumber) { _ in phoneError = nil }

            if let error = phoneError {
                Text(error)
                    .font(.caption)
                    .foregroundColor(.red)
            }
        }
    }

    private var zipCodeField: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("ZIP Code")
                .font(.system(size: 16, weight: .medium))
                .foregroundColor(.black)

            TextField("12345", text: $zipCode)
                .textFieldStyle(RoundedTextFieldStyle(hasError: zipCodeError != nil))
                .keyboardType(.numberPad)
                .onChange(of: zipCode) { _ in zipCodeError = nil }

            if let error = zipCodeError {
                Text(error)
                    .font(.caption)
                    .foregroundColor(.red)
            }
        }
    }

    // MARK: - Benefits Card
    private var benefitsCard: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Why Join EatFair?")
                .font(.system(size: 18, weight: .bold))
                .foregroundColor(.black)

            RegisterBenefitRow(icon: "dollarsign.circle.fill", title: "Only $\(Int(AppConfig.shared.foodCustomerFee)) fee per order", description: "No commission fees - no hidden costs")

            RegisterBenefitRow(icon: "iphone", title: "Easy To Use", description: "Search local restaurants, Choose your food and place an order")

            RegisterBenefitRow(icon: "hand.raised.fill", title: "Fair Platform", description: "Supporting local restaurants with ethical practices")
        }
        .padding(20)
        .background(Color(UIColor.systemGray6))
        .cornerRadius(12)
    }

    // MARK: - Register Button
    private var registerButton: some View {
        Button(action: validateAndRegister) {
            if isLoading {
                ProgressView()
                    .progressViewStyle(CircularProgressViewStyle(tint: .white))
            } else {
                Text("Join EatFair")
                    .font(.system(size: 18, weight: .semibold))
            }
        }
        .frame(maxWidth: .infinity)
        .frame(height: 56)
        .background(Color.accentColor)
        .foregroundColor(.white)
        .cornerRadius(12)
        .disabled(isLoading)
    }

    // MARK: - Terms Text
    private var termsText: some View {
        Text("By registering, you agree to our Terms of Service and Privacy Policy. You must comply with local health regulations and business licensing requirements.")
            .font(.system(size: 11))
            .foregroundColor(.gray)
            .multilineTextAlignment(.center)
    }

    // MARK: - Login Link
    private var loginLink: some View {
        HStack {
            Text("Already have an account?")
                .font(.system(size: 14))
                .foregroundColor(.gray)

            Button("Log In") {
                onLoginTap()
            }
            .font(.system(size: 14, weight: .semibold))
            .foregroundColor(.accentColor)
        }
    }

    // MARK: - Validation
    private func validateEmail() -> String? {
        if email.trimmingCharacters(in: .whitespaces).isEmpty {
            return "Email is required"
        }
        let emailRegex = "[A-Z0-9a-z._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,64}"
        let emailPredicate = NSPredicate(format: "SELF MATCHES %@", emailRegex)
        if !emailPredicate.evaluate(with: email) {
            return "Invalid email format"
        }
        return nil
    }

    private func validatePassword() -> String? {
        if password.isEmpty {
            return "Password is required"
        }
        if password.count < 6 {
            return "Password must be at least 6 characters"
        }
        return nil
    }

    private func validateName() -> String? {
        if name.trimmingCharacters(in: .whitespaces).isEmpty {
            return "Name is required"
        }
        if name.count < 2 {
            return "Name must be at least 2 characters"
        }
        return nil
    }

    private func validatePhone() -> String? {
        let digits = phoneNumber.filter { $0.isNumber }
        if digits.isEmpty {
            return "Phone number is required"
        }
        if digits.count < 10 {
            return "Phone number must be at least 10 digits"
        }
        return nil
    }

    private func validateZipCode() -> String? {
        if zipCode.isEmpty {
            return "ZIP code is required"
        }
        if zipCode.count != 5 || !zipCode.allSatisfy({ $0.isNumber }) {
            return "ZIP code must be 5 digits"
        }
        return nil
    }

    private func validateAndRegister() {
        emailError = validateEmail()
        passwordError = validatePassword()
        nameError = validateName()
        phoneError = validatePhone()
        zipCodeError = validateZipCode()

        guard emailError == nil && passwordError == nil && nameError == nil &&
              phoneError == nil && zipCodeError == nil else {
            return
        }

        isLoading = true

        // Call production API for registration
        P2PAPIService.shared.customerRegister(
            email: email,
            password: password,
            fullName: name,
            phone: phoneNumber
        ) { result in
            DispatchQueue.main.async {
                isLoading = false
                switch result {
                case .success:
                    onRegisterSuccess()
                case .failure(let error):
                    errorMessage = error.localizedDescription
                    showError = true
                }
            }
        }
    }
}

// MARK: - Register Benefit Row Component
struct RegisterBenefitRow: View {
    let icon: String
    let title: String
    let description: String

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            Image(systemName: icon)
                .font(.system(size: 24))
                .foregroundColor(.accentColor)

            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundColor(.black)

                Text(description)
                    .font(.system(size: 14))
                    .foregroundColor(.gray)
            }
        }
    }
}

// MARK: - Rounded Text Field Style
struct RoundedTextFieldStyle: TextFieldStyle {
    var hasError: Bool = false

    func _body(configuration: TextField<Self._Label>) -> some View {
        configuration
            .padding()
            .background(Color.white)
            .overlay(
                RoundedRectangle(cornerRadius: 8)
                    .stroke(hasError ? Color.red : Color.gray.opacity(0.3), lineWidth: 1)
            )
    }
}

#Preview {
    RegisterView(onLoginTap: {}, onRegisterSuccess: {})
}
