import Foundation

/// Email validation utility that ensures only real, valid emails are accepted.
/// Blocks disposable/temporary email domains and validates email format strictly.
public struct EmailValidator {

    /// Result of email validation
    public struct ValidationResult {
        public let isValid: Bool
        public let errorMessage: String?

        public init(isValid: Bool, errorMessage: String? = nil) {
            self.isValid = isValid
            self.errorMessage = errorMessage
        }
    }

    /// List of common disposable/temporary email domains to block
    /// These services provide throwaway emails that are often used for spam or fraud
    private static let disposableEmailDomains: Set<String> = [
        // Major disposable email services
        "mailinator.com", "mailinator.net", "mailinator2.com",
        "guerrillamail.com", "guerrillamail.net", "guerrillamail.org", "guerrillamail.biz",
        "tempmail.com", "temp-mail.org", "temp-mail.io",
        "10minutemail.com", "10minutemail.net",
        "throwaway.email", "throwawaymail.com",
        "fakeinbox.com", "fakemailgenerator.com",
        "getnada.com", "nada.email",
        "dispostable.com", "disposablemail.com",
        "yopmail.com", "yopmail.fr", "yopmail.net",
        "trashmail.com", "trashmail.net", "trashmail.org",
        "sharklasers.com", "guerrillamail.de",
        "maildrop.cc", "mailnesia.com",
        "mytrashmail.com", "mt2009.com",
        "getairmail.com", "airmail.com",
        "tempr.email", "tempail.com",
        "mohmal.com", "mohmal.im",
        "emailondeck.com", "anonymousemail.me",
        "mintemail.com", "spamgourmet.com",
        "mailcatch.com", "mailexpire.com",
        "emailsensei.com", "tempinbox.com",
        "discard.email", "discardmail.com",
        "spambox.us", "spamfree24.org",
        "jetable.org", "link2mail.net",
        "meltmail.com", "spamobox.com",
        "bugmenot.com", "mailzilla.com",
        "bobmail.info", "mailforspam.com",
        "tempmailaddress.com", "burnermail.io",
        "tempmailo.com", "emailfake.com",
        "crazymailing.com", "tempsky.com",
        "fakemail.net", "fakemailgenerator.net",
        "haltospam.com", "hidemail.de",
        "imgof.com", "incognitomail.com",
        "inboxalias.com", "jetable.net",
        "kasmail.com", "killmail.com",
        "klzlv.com", "koszmail.pl",
        "kurzepost.de", "lawlita.com",
        "letthemeatspam.com", "lhsdv.com",
        "lifebyfood.com", "litedrop.com",
        "lol.ovpn.to", "lookugly.com",
        "lortemail.dk", "lovemeleaveme.com",
        "lr78.com", "maboard.com",
        "mail-hierarchie.net", "mail-temporaire.fr",
        "mail4trash.com", "mailbidon.com",
        "mailblocks.com", "mailcatch.com",
        "mailchop.com", "maildu.de",
        "maileater.com", "mailfreeonline.com",
        "mailguard.me", "mailhazard.com",
        "mailhazard.us", "mailhz.me",
        "mailimate.com", "mailin8r.com",
        "mailinater.com", "mailinator.org",
        "mailinator.us", "mailismagic.com",
        "mailmate.com", "mailme.ir",
        "mailme.lv", "mailmetrash.com",
        "mailmoat.com", "mailnator.com",
        "mailnull.com", "mailorg.org",
        "mailsac.com", "mailscrap.com",
        "mailshell.com", "mailsiphon.com",
        "mailslapping.com", "mailslite.com",
        "mailtemp.info", "mailtothis.com",
        "mailzilla.org", "makemetheking.com",
        "manifestgenerator.com", "manybrain.com"
    ]

    /// Validates an email address for format and blocks disposable domains
    /// - Parameter email: The email address to validate
    /// - Returns: ValidationResult with isValid status and optional error message
    public static func validate(_ email: String) -> ValidationResult {
        let trimmedEmail = email.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()

        // Check if empty
        if trimmedEmail.isEmpty {
            return ValidationResult(isValid: false, errorMessage: "Email is required")
        }

        // Check basic structure
        guard trimmedEmail.contains("@") else {
            return ValidationResult(isValid: false, errorMessage: "Invalid email format")
        }

        // Split email into local and domain parts
        let parts = trimmedEmail.split(separator: "@")
        guard parts.count == 2 else {
            return ValidationResult(isValid: false, errorMessage: "Invalid email format")
        }

        let localPart = String(parts[0])
        let domainPart = String(parts[1])

        // Validate local part
        if localPart.isEmpty || localPart.count > 64 {
            return ValidationResult(isValid: false, errorMessage: "Invalid email format")
        }

        // Check for invalid characters or patterns in local part
        if localPart.hasPrefix(".") || localPart.hasSuffix(".") || localPart.contains("..") {
            return ValidationResult(isValid: false, errorMessage: "Invalid email format")
        }

        // Validate domain part
        if domainPart.isEmpty || domainPart.count > 255 {
            return ValidationResult(isValid: false, errorMessage: "Invalid email domain")
        }

        // Check domain has at least one dot (TLD)
        guard domainPart.contains(".") else {
            return ValidationResult(isValid: false, errorMessage: "Invalid email domain")
        }

        // Check for invalid domain patterns
        if domainPart.hasPrefix(".") || domainPart.hasSuffix(".") || domainPart.contains("..") {
            return ValidationResult(isValid: false, errorMessage: "Invalid email domain")
        }

        // Validate TLD (must be at least 2 characters)
        let domainComponents = domainPart.split(separator: ".")
        guard let tld = domainComponents.last, tld.count >= 2 else {
            return ValidationResult(isValid: false, errorMessage: "Invalid email domain")
        }

        // RFC 5322 compliant regex validation
        let emailRegex = "^[A-Z0-9a-z._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,64}$"
        let emailPredicate = NSPredicate(format: "SELF MATCHES %@", emailRegex)
        guard emailPredicate.evaluate(with: trimmedEmail) else {
            return ValidationResult(isValid: false, errorMessage: "Invalid email format")
        }

        // Check against disposable email domains
        if disposableEmailDomains.contains(domainPart) {
            return ValidationResult(isValid: false, errorMessage: "Temporary/disposable email addresses are not allowed. Please use a real email.")
        }

        // Check for numeric-only local parts (often spam)
        if localPart.allSatisfy({ $0.isNumber }) && localPart.count > 5 {
            return ValidationResult(isValid: false, errorMessage: "Please use a valid email address")
        }

        // Check for obviously fake patterns
        let fakePatterns = ["test@test", "fake@fake", "asdf@", "qwerty@", "1234@", "aaa@", "xxx@"]
        for pattern in fakePatterns {
            if trimmedEmail.hasPrefix(pattern) {
                return ValidationResult(isValid: false, errorMessage: "Please use a valid email address")
            }
        }

        return ValidationResult(isValid: true)
    }

    /// Quick check if email is valid (returns Bool only)
    /// - Parameter email: The email address to validate
    /// - Returns: true if valid, false otherwise
    public static func isValid(_ email: String) -> Bool {
        return validate(email).isValid
    }

    /// Gets the error message for invalid email, or nil if valid
    /// - Parameter email: The email address to validate
    /// - Returns: Error message string or nil
    public static func getErrorMessage(_ email: String) -> String? {
        return validate(email).errorMessage
    }
}
