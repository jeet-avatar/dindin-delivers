package com.eatfair.shared.validation

import java.util.regex.Pattern

/**
 * Validation Extensions for Model Classes
 * Provides comprehensive input validation for all data models
 */

// Email validation
private val EMAIL_PATTERN = Pattern.compile(
    "[a-zA-Z0-9+._%\\-]{1,256}@[a-zA-Z0-9][a-zA-Z0-9\\-]{0,64}(\\.[a-zA-Z0-9][a-zA-Z0-9\\-]{0,25})+"
)

fun String.isValidEmail(): Boolean {
    return isNotBlank() && EMAIL_PATTERN.matcher(this).matches()
}

// Phone validation (US format)
private val PHONE_PATTERN = Pattern.compile("^[+]?[1]?[\\s.-]?[(]?\\d{3}[)]?[\\s.-]?\\d{3}[\\s.-]?\\d{4}$")

fun String.isValidPhone(): Boolean {
    return isNotBlank() && PHONE_PATTERN.matcher(this.replace("\\s".toRegex(), "")).matches()
}

// Password validation (min 8 chars, at least 1 letter and 1 number)
fun String.isValidPassword(): Boolean {
    return length >= 8 && any { it.isLetter() } && any { it.isDigit() }
}

// ZIP code validation (US format: 5 digits or 5+4 digits)
private val ZIP_PATTERN = Pattern.compile("^\\d{5}(-\\d{4})?$")

fun String.isValidZipCode(): Boolean {
    return isNotBlank() && ZIP_PATTERN.matcher(this).matches()
}

// Price validation (non-negative)
fun Double.isValidPrice(): Boolean {
    return this >= 0.0 && !this.isNaN() && !this.isInfinite()
}

fun Float.isValidPrice(): Boolean {
    return this >= 0.0f && !this.isNaN() && !this.isInfinite()
}

// Quantity validation (positive integer)
fun Int.isValidQuantity(): Boolean {
    return this > 0
}

// Rating validation (1-5 scale)
fun Int.isValidRating(): Boolean {
    return this in 1..5
}

fun Double.isValidRating(): Boolean {
    return this in 0.0..5.0 && !this.isNaN() && !this.isInfinite()
}

fun Float.isValidRating(): Boolean {
    return this in 0.0f..5.0f && !this.isNaN() && !this.isInfinite()
}

// Latitude validation
fun Double.isValidLatitude(): Boolean {
    return this in -90.0..90.0 && !this.isNaN() && !this.isInfinite()
}

// Longitude validation
fun Double.isValidLongitude(): Boolean {
    return this in -180.0..180.0 && !this.isNaN() && !this.isInfinite()
}

// String length validation
fun String.hasMinLength(minLength: Int): Boolean {
    return this.length >= minLength
}

fun String.hasMaxLength(maxLength: Int): Boolean {
    return this.length <= maxLength
}

fun String.isWithinLength(minLength: Int, maxLength: Int): Boolean {
    return this.length in minLength..maxLength
}

// Sanitize input (remove potential XSS/SQL injection attempts)
fun String.sanitize(): String {
    return this
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace("\"", "&quot;")
        .replace("'", "&#x27;")
        .replace("/", "&#x2F;")
        .trim()
}

/**
 * Validation Result sealed class
 */
sealed class ValidationResult {
    object Valid : ValidationResult()
    data class Invalid(val errors: List<String>) : ValidationResult()

    fun isValid(): Boolean = this is Valid

    fun getErrorsOrNull(): List<String>? = when (this) {
        is Valid -> null
        is Invalid -> errors
    }
}

/**
 * Validation builder for combining multiple validations
 */
class ValidationBuilder {
    private val errors = mutableListOf<String>()

    fun validate(condition: Boolean, errorMessage: String) {
        if (!condition) {
            errors.add(errorMessage)
        }
    }

    fun build(): ValidationResult {
        return if (errors.isEmpty()) {
            ValidationResult.Valid
        } else {
            ValidationResult.Invalid(errors)
        }
    }
}

fun validate(block: ValidationBuilder.() -> Unit): ValidationResult {
    return ValidationBuilder().apply(block).build()
}
