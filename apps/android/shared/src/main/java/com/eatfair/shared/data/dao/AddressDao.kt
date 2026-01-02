package com.eatfair.shared.data.dao

import androidx.room.Dao
import androidx.room.Delete
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Update
import com.eatfair.shared.model.address.AddressDto
import kotlinx.coroutines.flow.Flow

@Dao
interface AddressDao {

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAddress(addressDto: AddressDto)

    // READ (all) - Use Flow for real-time updates in the UI
    @Query("SELECT * FROM addresses ORDER BY id DESC")
    fun getAllAddresses(): Flow<List<AddressDto>>

    // READ (one)
    @Query("SELECT * FROM addresses WHERE id = :id")
    suspend fun getAddressById(id: String): AddressDto?

    @Query("SELECT * FROM addresses WHERE isDefault = 1 LIMIT 1")
    suspend fun getDefaultAddress(): AddressDto?

    @Update
    suspend fun updateAddress(addressDto: AddressDto)

    @Delete
    suspend fun deleteAddress(addressDto: AddressDto)

    @Query("DELETE FROM addresses")
    suspend fun deleteAllAddresses()
}
