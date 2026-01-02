package com.eatfair.shared.data.repo

import android.util.Log
import com.eatfair.shared.data.dao.AddressDao
import com.eatfair.shared.data.repository.DollorRepository
import com.eatfair.shared.model.address.AddressDto
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import javax.inject.Inject
import javax.inject.Singleton

/**
 * AddressRepo - Unified address management matching iOS implementation
 *
 * Primary storage: PostgreSQL via REST API (like iOS P2PAPIService)
 * Local cache: Room database for offline access
 *
 * API Endpoints (matching iOS):
 * - GET /addresses/{customerId} - Get all addresses
 * - GET /addresses/{customerId}/default - Get default address
 * - POST /addresses/{customerId} - Add new address
 * - PUT /addresses/{customerId}/{addressId} - Update address
 * - DELETE /addresses/{customerId}/{addressId} - Delete address
 * - POST /addresses/{customerId}/{addressId}/set-default - Set as default
 */
@Singleton
class AddressRepo @Inject constructor(
    private val addressDao: AddressDao,
    private val dollorRepository: DollorRepository
) {
    companion object {
        private const val TAG = "AddressRepo"
    }

    /**
     * Get all addresses - fetches from API and caches locally
     */
    fun getAddresses(): Flow<List<AddressDto>> = addressDao.getAllAddresses()

    /**
     * Fetch addresses from API and sync to local cache
     */
    suspend fun fetchAddressesFromApi(): Result<List<AddressDto>> {
        return try {
            val result = dollorRepository.getAddresses()
            result.fold(
                onSuccess = { apiAddresses ->
                    Log.d(TAG, "Fetched ${apiAddresses.size} addresses from API")
                    // Convert and cache locally
                    val localAddresses = apiAddresses.map { AddressDto.fromApiAddress(it) }
                    // Clear old and insert new
                    addressDao.deleteAllAddresses()
                    localAddresses.forEach { addressDao.insertAddress(it) }
                    Result.success(localAddresses)
                },
                onFailure = { error ->
                    Log.e(TAG, "Failed to fetch addresses: ${error.message}")
                    Result.failure(error)
                }
            )
        } catch (e: Exception) {
            Log.e(TAG, "Exception fetching addresses: ${e.message}")
            Result.failure(e)
        }
    }

    /**
     * Get address by local ID
     */
    suspend fun getAddressById(id: String): AddressDto? = addressDao.getAddressById(id)

    /**
     * Insert new address - sends to API first, then caches locally
     */
    suspend fun insertAddress(addressDto: AddressDto): Result<AddressDto> {
        return try {
            Log.d(TAG, "Creating address via API")
            val result = dollorRepository.addAddress(addressDto.toAddAddressRequest())

            result.fold(
                onSuccess = { apiAddress ->
                    Log.d(TAG, "Address created successfully: ${apiAddress.id}")
                    // Convert API response and cache locally
                    val localAddress = AddressDto.fromApiAddress(apiAddress)
                    addressDao.insertAddress(localAddress)
                    Result.success(localAddress)
                },
                onFailure = { error ->
                    Log.e(TAG, "Failed to create address: ${error.message}")
                    Result.failure(error)
                }
            )
        } catch (e: Exception) {
            Log.e(TAG, "Exception creating address: ${e.message}")
            Result.failure(e)
        }
    }

    /**
     * Update existing address - sends to API first, then updates local cache
     */
    suspend fun updateAddress(addressDto: AddressDto): Result<AddressDto> {
        val apiId = addressDto.apiId
        if (apiId == null) {
            Log.e(TAG, "Cannot update address without API ID")
            return Result.failure(Exception("Address not synced with server"))
        }

        return try {
            Log.d(TAG, "Updating address via API: $apiId")
            val result = dollorRepository.updateAddress(apiId, addressDto.toUpdateAddressRequest())

            result.fold(
                onSuccess = { apiAddress ->
                    Log.d(TAG, "Address updated successfully")
                    // Convert API response and update local cache
                    val localAddress = AddressDto.fromApiAddress(apiAddress)
                    addressDao.updateAddress(localAddress)
                    Result.success(localAddress)
                },
                onFailure = { error ->
                    Log.e(TAG, "Failed to update address: ${error.message}")
                    Result.failure(error)
                }
            )
        } catch (e: Exception) {
            Log.e(TAG, "Exception updating address: ${e.message}")
            Result.failure(e)
        }
    }

    /**
     * Delete address - deletes from API first, then removes from local cache
     */
    suspend fun deleteAddress(addressDto: AddressDto): Result<Unit> {
        val apiId = addressDto.apiId
        if (apiId == null) {
            // If no API ID, just delete locally
            addressDao.deleteAddress(addressDto)
            return Result.success(Unit)
        }

        return try {
            Log.d(TAG, "Deleting address via API: $apiId")
            val result = dollorRepository.deleteAddress(apiId)

            result.fold(
                onSuccess = {
                    Log.d(TAG, "Address deleted successfully")
                    addressDao.deleteAddress(addressDto)
                    Result.success(Unit)
                },
                onFailure = { error ->
                    Log.e(TAG, "Failed to delete address: ${error.message}")
                    Result.failure(error)
                }
            )
        } catch (e: Exception) {
            Log.e(TAG, "Exception deleting address: ${e.message}")
            Result.failure(e)
        }
    }

    /**
     * Get default address from local cache
     */
    suspend fun getDefaultAddress(): AddressDto? {
        return addressDao.getDefaultAddress()
    }

    /**
     * Fetch default address from API
     */
    suspend fun fetchDefaultAddressFromApi(): Result<AddressDto?> {
        return try {
            val result = dollorRepository.getDefaultAddress()
            result.fold(
                onSuccess = { apiAddress ->
                    val localAddress = AddressDto.fromApiAddress(apiAddress)
                    Result.success(localAddress)
                },
                onFailure = { error ->
                    // 404 means no default address, which is valid
                    if (error.message?.contains("404") == true) {
                        Result.success(null)
                    } else {
                        Result.failure(error)
                    }
                }
            )
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * Set address as default
     */
    suspend fun setDefaultAddress(addressDto: AddressDto): Result<AddressDto> {
        val apiId = addressDto.apiId
        if (apiId == null) {
            return Result.failure(Exception("Address not synced with server"))
        }

        return try {
            Log.d(TAG, "Setting default address via API: $apiId")
            val result = dollorRepository.setDefaultAddress(apiId)

            result.fold(
                onSuccess = { apiAddress ->
                    Log.d(TAG, "Default address set successfully")
                    // Refresh all addresses to update isDefault flags
                    fetchAddressesFromApi()
                    val localAddress = AddressDto.fromApiAddress(apiAddress)
                    Result.success(localAddress)
                },
                onFailure = { error ->
                    Log.e(TAG, "Failed to set default address: ${error.message}")
                    Result.failure(error)
                }
            )
        } catch (e: Exception) {
            Log.e(TAG, "Exception setting default address: ${e.message}")
            Result.failure(e)
        }
    }
}
