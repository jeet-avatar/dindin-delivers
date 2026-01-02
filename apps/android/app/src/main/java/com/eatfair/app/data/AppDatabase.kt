package com.eatfair.app.data

import androidx.room.Database
import androidx.room.RoomDatabase
import com.eatfair.shared.data.dao.AddressDao
import com.eatfair.shared.model.address.AddressDto

@Database(entities = [AddressDto::class], version = 1, exportSchema = false)
abstract class AppDatabase: RoomDatabase() {
    abstract fun addressDao(): AddressDao
}


