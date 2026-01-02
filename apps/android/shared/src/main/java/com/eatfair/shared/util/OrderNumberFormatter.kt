package com.eatfair.shared.util

import java.text.SimpleDateFormat
import java.util.*

/**
 * Enterprise Order Number Formatter
 * Matches iOS DateTimeFormatter for cross-platform consistency
 *
 * Format: DL-YYYYMMDD-HHMMSS-XXXX
 * Example: DL-20251212-143525-0042
 *
 * Components:
 * - DL: Dollor prefix (also supports legacy EF prefix for backwards compatibility)
 * - YYYYMMDD: Date (year, month, day)
 * - HHMMSS: Time (hour, minute, second)
 * - XXXX: Sequential order number (4 digits, zero-padded)
 */
object OrderNumberFormatter {

    /**
     * Parse enterprise order number to extract components
     * @param orderNumber Format: "EF-YYYYMMDD-HHMMSS-XXXX"
     * @return OrderNumberComponents or null if invalid format
     */
    fun parse(orderNumber: String): OrderNumberComponents? {
        val parts = orderNumber.split("-")

        // Validate enterprise format: DL-YYYYMMDD-HHMMSS-XXXX or EF-YYYYMMDD-HHMMSS-XXXX (legacy)
        if (parts.size >= 4 && (parts[0] == "DL" || parts[0] == "EF") && parts[1].length == 8 && parts[2].length == 6) {
            return try {
                val dateString = "${parts[1]}${parts[2]}"
                val formatter = SimpleDateFormat("yyyyMMddHHmmss", Locale.US)
                val date = formatter.parse(dateString)
                val sequence = parts[3]

                OrderNumberComponents(
                    fullNumber = orderNumber,
                    date = date,
                    sequence = sequence,
                    displaySequence = "#$sequence"
                )
            } catch (e: Exception) {
                null
            }
        }

        // Handle legacy format: DL120800042 or EF120800042 (no dashes)
        val prefix = when {
            orderNumber.startsWith("DL") -> "DL"
            orderNumber.startsWith("EF") -> "EF"
            else -> null
        }
        if (prefix != null && orderNumber.length > 2) {
            return OrderNumberComponents(
                fullNumber = orderNumber,
                date = null,
                sequence = orderNumber.removePrefix(prefix),
                displaySequence = "#${orderNumber.removePrefix(prefix)}"
            )
        }

        return null
    }

    /**
     * Format order number for display
     * "EF-20251212-143525-0042" -> "Order #0042 | Dec 12, 2025 at 2:35 PM"
     */
    fun formatForDisplay(orderNumber: String): String {
        val components = parse(orderNumber)

        return if (components?.date != null) {
            val dateFormatter = SimpleDateFormat("MMM d, yyyy 'at' h:mm a", Locale.US)
            "Order #${components.sequence} | ${dateFormatter.format(components.date)}"
        } else {
            "Order #${orderNumber.removePrefix("DL-").removePrefix("EF-").replace("-", "")}"
        }
    }

    /**
     * Get short display format
     * "EF-20251212-143525-0042" -> "#0042"
     */
    fun getShortDisplay(orderNumber: String): String {
        val components = parse(orderNumber)
        return components?.displaySequence ?: "#$orderNumber"
    }

    /**
     * Get just the sequence number
     * "EF-20251212-143525-0042" -> "0042"
     */
    fun getSequence(orderNumber: String): String {
        val components = parse(orderNumber)
        return components?.sequence ?: orderNumber.removePrefix("DL").removePrefix("EF")
    }

    /**
     * Get the date from order number
     * "EF-20251212-143525-0042" -> Date or null
     */
    fun getDate(orderNumber: String): Date? {
        return parse(orderNumber)?.date
    }

    /**
     * Format order placed time
     * "EF-20251212-143525-0042" -> "Dec 12, 2025 at 2:35 PM"
     */
    fun formatOrderTime(orderNumber: String): String {
        val date = getDate(orderNumber) ?: return "--"
        val formatter = SimpleDateFormat("MMM d, yyyy 'at' h:mm a", Locale.US)
        return formatter.format(date)
    }

    /**
     * Format relative time (e.g., "5 minutes ago")
     */
    fun formatRelativeTime(orderNumber: String): String {
        val date = getDate(orderNumber) ?: return "--"
        val now = Date()
        val diffMs = now.time - date.time
        val diffMinutes = diffMs / (1000 * 60)
        val diffHours = diffMinutes / 60
        val diffDays = diffHours / 24

        return when {
            diffMinutes < 1 -> "Just now"
            diffMinutes < 60 -> "$diffMinutes min ago"
            diffHours < 24 -> "$diffHours hr ago"
            diffDays < 7 -> "$diffDays days ago"
            else -> {
                val formatter = SimpleDateFormat("MMM d", Locale.US)
                formatter.format(date)
            }
        }
    }

    /**
     * Generate a new order number (client-side fallback)
     * Should only be used when backend is unavailable
     */
    fun generate(sequence: Int = (1..9999).random()): String {
        val formatter = SimpleDateFormat("yyyyMMdd-HHmmss", Locale.US)
        return "DL-${formatter.format(Date())}-${String.format("%04d", sequence)}"
    }

    /**
     * Validate if string is a valid order number format
     */
    fun isValid(orderNumber: String?): Boolean {
        if (orderNumber.isNullOrBlank()) return false
        return (orderNumber.startsWith("DL") || orderNumber.startsWith("EF")) && (
            // Enterprise format: DL-YYYYMMDD-HHMMSS-XXXX or EF-YYYYMMDD-HHMMSS-XXXX
            orderNumber.matches(Regex("(DL|EF)-\\d{8}-\\d{6}-\\d{4}")) ||
            // Legacy format: DL or EF followed by digits
            orderNumber.matches(Regex("(DL|EF)\\d+"))
        )
    }
}

/**
 * Parsed order number components
 */
data class OrderNumberComponents(
    val fullNumber: String,
    val date: Date?,
    val sequence: String,
    val displaySequence: String
)

/**
 * Extension function for String to format as order display
 */
fun String.toOrderDisplay(): String = OrderNumberFormatter.formatForDisplay(this)

/**
 * Extension function to get short order display
 */
fun String.toShortOrderDisplay(): String = OrderNumberFormatter.getShortDisplay(this)
