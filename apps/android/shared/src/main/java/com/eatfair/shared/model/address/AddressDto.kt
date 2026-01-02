package com.eatfair.shared.model.address

import androidx.room.Entity
import androidx.room.Ignore
import androidx.room.PrimaryKey

import com.eatfair.shared.constants.AddressType
import java.util.UUID

/**
 * Unified Address model for local caching (Room) with API sync
 *
 * Storage: Room (local cache) + PostgreSQL (via REST API)
 * API: GET/POST/PUT/DELETE /addresses/{customerId}
 *
 * iOS Reference: P2PCustomerAddress
 * - id: Int (PostgreSQL auto-increment)
 * - All other fields match
 */
@Entity(tableName = "addresses")
data class AddressDto(

    /** Primary key for Room - String UUID for local identification */
    @PrimaryKey
    val id: String = UUID.randomUUID().toString(),

    /** API ID from PostgreSQL backend (Int) - null for new addresses not yet synced */
    val apiId: Int? = null,

    /** User ID who owns this address (Int from API, stored as String for flexibility) */
    val userId: String = "",

    /** Display name e.g., "Home", "Work", "Mom's House" */
    val locationName: String = "",

    // UNIFIED FIELD NAMES (matching iOS)
    /** Complete formatted address for display */
    val fullAddress: String = "",

    /** Street address (e.g., "123 Main St") */
    val street: String = "",

    /** Apartment/Suite/Unit number */
    val unit: String = "",

    /** City name */
    val city: String = "",

    /** State code e.g., "CA" */
    val state: String = "",

    /** ZIP/Postal code */
    val zipCode: String = "",

    /** Delivery instructions */
    val instructions: String? = null,

    /** Address type: "home" | "work" | "other" */
    val addressType: String = "home",

    /** Latitude coordinate */
    val latitude: Double = 0.0,

    /** Longitude coordinate */
    val longitude: Double = 0.0,

    /** Contact phone number */
    val phoneNumber: String? = null,

    /** Whether this is the default/primary address */
    val isDefault: Boolean = false,

    // Timestamps
    val createdAt: Long = System.currentTimeMillis(),
    val updatedAt: Long = System.currentTimeMillis(),

    // Legacy field mappings for backward compatibility
    @Deprecated("Use fullAddress instead")
    val completeAddress: String = "",

    @Deprecated("Use unit instead")
    val houseNumber: String = "",

    @Deprecated("Use street instead")
    val apartmentRoad: String = "",

    @Deprecated("Use instructions instead")
    val directions: String? = null,

    @Deprecated("Use addressType string instead")
    val type: AddressType = AddressType.OTHER
) {
    /**
     * Get formatted address line 1 (street + unit)
     */
    fun addressLine1(): String {
        val streetPart = street.ifEmpty { apartmentRoad }
        val unitPart = unit.ifEmpty { houseNumber }
        return if (unitPart.isNotEmpty()) "$unitPart $streetPart" else streetPart
    }

    /**
     * Get formatted address line 2 (city, state zip)
     */
    fun addressLine2(): String {
        return if (city.isNotEmpty() && state.isNotEmpty()) {
            "$city, $state $zipCode"
        } else {
            fullAddress.ifEmpty { completeAddress }
        }
    }

    /**
     * Get the full address for display
     */
    fun getDisplayAddress(): String {
        return fullAddress.ifEmpty { completeAddress }
    }

    companion object {
        /**
         * Create from API Address model (PostgreSQL backend)
         * Maps Int IDs from API to local model
         */
        fun fromApiAddress(address: com.eatfair.shared.model.Address): AddressDto {
            return AddressDto(
                id = "api_${address.id}",  // Prefix with api_ to identify API-sourced addresses
                apiId = address.id,
                userId = address.userId.toString(),
                locationName = address.locationName ?: address.label ?: "",
                fullAddress = "${address.street}, ${address.city}, ${address.state} ${address.zipCode}",
                street = address.street,
                unit = address.unit ?: "",
                city = address.city,
                state = address.state,
                zipCode = address.zipCode,
                instructions = address.instructions,
                addressType = address.addressType ?: "home",
                latitude = address.latitude ?: 0.0,
                longitude = address.longitude ?: 0.0,
                phoneNumber = address.phoneNumber,
                isDefault = address.isDefault
            )
        }
    }

    /**
     * Convert to API AddAddressRequest for creating new address
     */
    fun toAddAddressRequest(): com.eatfair.shared.model.AddAddressRequest {
        return com.eatfair.shared.model.AddAddressRequest(
            locationName = locationName,
            street = street,
            unit = unit.ifEmpty { null },
            city = city,
            state = state,
            zipCode = zipCode,
            instructions = instructions,
            addressType = addressType,
            latitude = latitude,
            longitude = longitude,
            phoneNumber = phoneNumber,
            isDefault = isDefault
        )
    }

    /**
     * Convert to API UpdateAddressRequest for updating existing address
     */
    fun toUpdateAddressRequest(): com.eatfair.shared.model.UpdateAddressRequest {
        return com.eatfair.shared.model.UpdateAddressRequest(
            locationName = locationName,
            street = street,
            unit = unit.ifEmpty { null },
            city = city,
            state = state,
            zipCode = zipCode,
            instructions = instructions,
            addressType = addressType,
            latitude = latitude,
            longitude = longitude,
            phoneNumber = phoneNumber,
            isDefault = isDefault
        )
    }
}
