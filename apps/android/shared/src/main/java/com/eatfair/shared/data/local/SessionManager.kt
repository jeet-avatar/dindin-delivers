package com.eatfair.shared.data.local

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import javax.inject.Singleton

// DataStore instance, defined once at the application level
val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "auth_prefs")

/**
 * SessionManager - DataStore Only (No Firebase)
 *
 * All session data is stored in DataStore.
 * Authentication is handled by P2P backend API via SecureStorage.
 */
@Singleton
class SessionManager @Inject constructor(
    @ApplicationContext private val context: Context
) {

    // Keys for storing data
    private val IS_LOGGED_IN = booleanPreferencesKey("is_logged_in")
    private val USER_ID = stringPreferencesKey("user_id")
    private val USER_NAME = stringPreferencesKey("user_name")
    private val USER_EMAIL = stringPreferencesKey("user_email")
    private val profileImageUriKey = stringPreferencesKey("profile_image_uri")

    val isLoggedIn: Flow<Boolean> = context.dataStore.data
        .map { preferences ->
            preferences[IS_LOGGED_IN] ?: false
        }

    val userId: Flow<String?> = context.dataStore.data
        .map { preferences ->
            preferences[USER_ID]
        }

    val userNameFlow: Flow<String?> = context.dataStore.data
        .map { preferences ->
            preferences[USER_NAME]
        }

    val userEmailFlow: Flow<String?> = context.dataStore.data
        .map { preferences ->
            preferences[USER_EMAIL]
        }

    val profileImageUriFlow: Flow<String?> = context.dataStore.data
        .map { preferences ->
            preferences[profileImageUriKey]
        }

    suspend fun saveProfileImageUri(uriString: String?) {
        context.dataStore.edit { preferences ->
            if (uriString != null) {
                preferences[profileImageUriKey] = uriString
            } else {
                preferences.remove(profileImageUriKey)
            }
        }
    }

    suspend fun saveSession(uid: String, name: String?, email: String?) {
        context.dataStore.edit { preferences ->
            preferences[IS_LOGGED_IN] = true
            preferences[USER_ID] = uid
            if (name != null) {
                preferences[USER_NAME] = name
            }
            if (email != null) {
                preferences[USER_EMAIL] = email
            }
        }
    }

    suspend fun clearSession() {
        context.dataStore.edit { preferences ->
            preferences.clear() // Clears all auth data
        }
    }

    // Helper functions to get current values
    suspend fun getUserId(): String? {
        return try {
            context.dataStore.data.map { it[USER_ID] }.first()
        } catch (e: Exception) {
            null
        }
    }

    suspend fun getUserName(): String? {
        return try {
            context.dataStore.data.map { it[USER_NAME] }.first()
        } catch (e: Exception) {
            null
        }
    }

    suspend fun getUserEmail(): String? {
        return try {
            context.dataStore.data.map { it[USER_EMAIL] }.first()
        } catch (e: Exception) {
            null
        }
    }
}
