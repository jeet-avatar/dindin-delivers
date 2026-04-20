/**
 * Phone number validation utilities
 */

/**
 * Validates and formats phone numbers
 * Supports multiple formats:
 * - US: (555) 123-4567, 555-123-4567, 5551234567
 * - International: +1-555-123-4567, +44 20 1234 5678
 * - Extensions: 555-123-4567 x101, (555) 123-4567 ext. 200
 */
export function validatePhoneNumber(phone: string | null | undefined): {
  isValid: boolean;
  formatted?: string;
  error?: string;
} {
  // Allow null or undefined (optional field)
  if (!phone || phone.trim() === '') {
    return { isValid: true };
  }

  const trimmedPhone = phone.trim();

  // Phone number regex patterns
  const patterns = [
    // US formats with optional extension
    /^(\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})(\s?(x|ext\.?|extension)\s?([0-9]{1,5}))?$/i,

    // International format (E.164): +[country code][number]
    /^\+[1-9]\d{1,14}$/,

    // General international format with spaces/dashes
    /^\+?[1-9]\d{0,3}[-.\s]?\(?[0-9]{1,4}\)?[-.\s]?[0-9]{1,4}[-.\s]?[0-9]{1,9}(\s?(x|ext\.?|extension)\s?([0-9]{1,5}))?$/i,
  ];

  // Check if phone matches any valid pattern
  const isValidFormat = patterns.some(pattern => pattern.test(trimmedPhone));

  if (!isValidFormat) {
    return {
      isValid: false,
      error: 'Invalid phone number format. Please use a valid format like: (555) 123-4567, +1-555-123-4567, or +44 20 1234 5678',
    };
  }

  // Additional validation: ensure it has at least 10 digits (excluding country code, extensions, and formatting)
  const digitsOnly = trimmedPhone.replace(/\D/g, '');

  // For US numbers (starting with +1 or no country code), should have 10 digits
  // For international, should have at least 10 digits (can be up to 15)
  if (digitsOnly.length < 10 || digitsOnly.length > 15) {
    return {
      isValid: false,
      error: 'Phone number must contain between 10 and 15 digits',
    };
  }

  return {
    isValid: true,
    formatted: trimmedPhone, // Return as-is to preserve user's preferred format
  };
}

/**
 * Validates email address format
 */
export function validateEmail(email: string | null | undefined): {
  isValid: boolean;
  formatted?: string;
  error?: string;
} {
  // Allow null or undefined (optional field)
  if (!email || email.trim() === '') {
    return { isValid: true };
  }

  const trimmedEmail = email.trim().toLowerCase();

  // RFC 5322 compliant email regex (simplified)
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

  if (!emailRegex.test(trimmedEmail)) {
    return {
      isValid: false,
      error: 'Invalid email address format',
    };
  }

  return {
    isValid: true,
    formatted: trimmedEmail,
  };
}

/**
 * Validates contact data before creating or updating
 */
export function validateContactData(data: {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
}): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Validate first name (required)
  if (!data.firstName || !data.firstName.trim()) {
    errors.push('First name is required');
  }

  // Validate last name (required)
  if (!data.lastName || !data.lastName.trim()) {
    errors.push('Last name is required');
  }

  // Validate email if provided
  if (data.email) {
    const emailValidation = validateEmail(data.email);
    if (!emailValidation.isValid) {
      errors.push(emailValidation.error || 'Invalid email');
    }
  }

  // Validate phone if provided
  if (data.phone) {
    const phoneValidation = validatePhoneNumber(data.phone);
    if (!phoneValidation.isValid) {
      errors.push(phoneValidation.error || 'Invalid phone number');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
