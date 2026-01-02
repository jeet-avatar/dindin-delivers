package com.eatfair.app.di

import android.content.Context
import androidx.room.Room
import com.eatfair.app.data.AppDatabase
import com.eatfair.shared.data.dao.AddressDao
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

/**
 * App-specific dependency injection module.
 *
 * Firebase services (Auth, Storage) are provided by SharedModule.
 * All data flows through P2P backend API - no Firestore.
 */
@Module
@InstallIn(SingletonComponent::class)
object AppModule {



    @Provides
    @Singleton
    fun provideAppDatabase(@ApplicationContext context: Context): AppDatabase {
        return Room.databaseBuilder(
            context,
            AppDatabase::class.java,
            "eatfair_ddb"
        ).build()
    }

    @Provides
    fun provideAddressDao(appDatabase: AppDatabase): AddressDao {
        return appDatabase.addressDao()
    }

    // NOTE: Firestore has been removed. All data flows through P2P backend API.
    // See SharedModule.kt for Firebase Auth (Google Sign-In) and Firebase Storage providers.
}
