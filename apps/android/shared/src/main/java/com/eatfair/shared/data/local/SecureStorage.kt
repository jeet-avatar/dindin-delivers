package com.eatfair.shared.data.local

import android.content.Context
import android.content.SharedPreferences
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Secure Storage for sensitive data (tokens, user info)
 * Uses Android EncryptedSharedPreferences for security
 * Matches iOS SecureStorage functionality
 *
 * Thread Safety:
 * - All read/write operations are synchronized
 * - Uses ReentrantReadWriteLock for optimal concurrent access
 * - Write operations are exclusive, read operations can be concurrent
 */
@Singleton
class SecureStorage @Inject constructor(
    @ApplicationContext private val context: Context
) {
    private val masterKey = MasterKey.Builder(context)
        .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
        .build()

    private val sharedPreferences: SharedPreferences = EncryptedSharedPreferences.create(
        context,
        "dollor_secure_prefs",
        masterKey,
        EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
        EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
    )

    // Thread-safe lock for read/write operations
    private val lock = java.util.concurrent.locks.ReentrantReadWriteLock()
    private val readLock = lock.readLock()
    private val writeLock = lock.writeLock()

    // ==========================================
    // CUSTOMER AUTH
    // ==========================================

    var customerToken: String?
        get() = readLock.lock().let {
            try {
                sharedPreferences.getString(KEY_CUSTOMER_TOKEN, null)
            } finally {
                readLock.unlock()
            }
        }
        set(value) = writeLock.lock().let {
            try {
                sharedPreferences.edit().putString(KEY_CUSTOMER_TOKEN, value).apply()
            } finally {
                writeLock.unlock()
            }
        }

    var customerId: Int
        get() = readLock.lock().let {
            try {
                sharedPreferences.getInt(KEY_CUSTOMER_ID, -1)
            } finally {
                readLock.unlock()
            }
        }
        set(value) = writeLock.lock().let {
            try {
                sharedPreferences.edit().putInt(KEY_CUSTOMER_ID, value).apply()
            } finally {
                writeLock.unlock()
            }
        }

    var customerName: String?
        get() = readLock.lock().let {
            try {
                sharedPreferences.getString(KEY_CUSTOMER_NAME, null)
            } finally {
                readLock.unlock()
            }
        }
        set(value) = writeLock.lock().let {
            try {
                sharedPreferences.edit().putString(KEY_CUSTOMER_NAME, value).apply()
            } finally {
                writeLock.unlock()
            }
        }

    var customerEmail: String?
        get() = readLock.lock().let {
            try {
                sharedPreferences.getString(KEY_CUSTOMER_EMAIL, null)
            } finally {
                readLock.unlock()
            }
        }
        set(value) = writeLock.lock().let {
            try {
                sharedPreferences.edit().putString(KEY_CUSTOMER_EMAIL, value).apply()
            } finally {
                writeLock.unlock()
            }
        }

    val isCustomerLoggedIn: Boolean
        get() = readLock.lock().let {
            try {
                val token = sharedPreferences.getString(KEY_CUSTOMER_TOKEN, null)
                val id = sharedPreferences.getInt(KEY_CUSTOMER_ID, -1)
                token != null && id != -1
            } finally {
                readLock.unlock()
            }
        }

    fun saveCustomerAuth(token: String, id: Int, name: String?, email: String?) {
        writeLock.lock()
        try {
            sharedPreferences.edit()
                .putString(KEY_CUSTOMER_TOKEN, token)
                .putInt(KEY_CUSTOMER_ID, id)
                .putString(KEY_CUSTOMER_NAME, name)
                .putString(KEY_CUSTOMER_EMAIL, email)
                .apply()
        } finally {
            writeLock.unlock()
        }
    }

    fun clearCustomerAuth() {
        writeLock.lock()
        try {
            sharedPreferences.edit()
                .remove(KEY_CUSTOMER_TOKEN)
                .remove(KEY_CUSTOMER_ID)
                .remove(KEY_CUSTOMER_NAME)
                .remove(KEY_CUSTOMER_EMAIL)
                .apply()
        } finally {
            writeLock.unlock()
        }
    }

    // ==========================================
    // DRIVER AUTH
    // ==========================================

    var driverToken: String?
        get() = readLock.lock().let {
            try {
                sharedPreferences.getString(KEY_DRIVER_TOKEN, null)
            } finally {
                readLock.unlock()
            }
        }
        set(value) = writeLock.lock().let {
            try {
                sharedPreferences.edit().putString(KEY_DRIVER_TOKEN, value).apply()
            } finally {
                writeLock.unlock()
            }
        }

    var driverId: Int
        get() = readLock.lock().let {
            try {
                sharedPreferences.getInt(KEY_DRIVER_ID, -1)
            } finally {
                readLock.unlock()
            }
        }
        set(value) = writeLock.lock().let {
            try {
                sharedPreferences.edit().putInt(KEY_DRIVER_ID, value).apply()
            } finally {
                writeLock.unlock()
            }
        }

    var driverName: String?
        get() = readLock.lock().let {
            try {
                sharedPreferences.getString(KEY_DRIVER_NAME, null)
            } finally {
                readLock.unlock()
            }
        }
        set(value) = writeLock.lock().let {
            try {
                sharedPreferences.edit().putString(KEY_DRIVER_NAME, value).apply()
            } finally {
                writeLock.unlock()
            }
        }

    var driverEmail: String?
        get() = readLock.lock().let {
            try {
                sharedPreferences.getString(KEY_DRIVER_EMAIL, null)
            } finally {
                readLock.unlock()
            }
        }
        set(value) = writeLock.lock().let {
            try {
                sharedPreferences.edit().putString(KEY_DRIVER_EMAIL, value).apply()
            } finally {
                writeLock.unlock()
            }
        }

    var driverPhone: String?
        get() = readLock.lock().let {
            try {
                sharedPreferences.getString(KEY_DRIVER_PHONE, null)
            } finally {
                readLock.unlock()
            }
        }
        set(value) = writeLock.lock().let {
            try {
                sharedPreferences.edit().putString(KEY_DRIVER_PHONE, value).apply()
            } finally {
                writeLock.unlock()
            }
        }

    var driverVehicleInfo: String?
        get() = readLock.lock().let {
            try {
                sharedPreferences.getString(KEY_DRIVER_VEHICLE, null)
            } finally {
                readLock.unlock()
            }
        }
        set(value) = writeLock.lock().let {
            try {
                sharedPreferences.edit().putString(KEY_DRIVER_VEHICLE, value).apply()
            } finally {
                writeLock.unlock()
            }
        }

    val isDriverLoggedIn: Boolean
        get() = readLock.lock().let {
            try {
                val token = sharedPreferences.getString(KEY_DRIVER_TOKEN, null)
                val id = sharedPreferences.getInt(KEY_DRIVER_ID, -1)
                token != null && id != -1
            } finally {
                readLock.unlock()
            }
        }

    fun saveDriverAuth(
        token: String,
        id: Int,
        name: String?,
        email: String?,
        phone: String? = null,
        vehicleInfo: String? = null
    ) {
        writeLock.lock()
        try {
            sharedPreferences.edit()
                .putString(KEY_DRIVER_TOKEN, token)
                .putInt(KEY_DRIVER_ID, id)
                .putString(KEY_DRIVER_NAME, name)
                .putString(KEY_DRIVER_EMAIL, email)
                .putString(KEY_DRIVER_PHONE, phone)
                .putString(KEY_DRIVER_VEHICLE, vehicleInfo)
                .apply()
        } finally {
            writeLock.unlock()
        }
    }

    fun clearDriverAuth() {
        writeLock.lock()
        try {
            sharedPreferences.edit()
                .remove(KEY_DRIVER_TOKEN)
                .remove(KEY_DRIVER_ID)
                .remove(KEY_DRIVER_NAME)
                .remove(KEY_DRIVER_EMAIL)
                .remove(KEY_DRIVER_PHONE)
                .remove(KEY_DRIVER_VEHICLE)
                .apply()
        } finally {
            writeLock.unlock()
        }
    }

    // ==========================================
    // VENDOR AUTH
    // ==========================================

    var vendorToken: String?
        get() = readLock.lock().let {
            try {
                sharedPreferences.getString(KEY_VENDOR_TOKEN, null)
            } finally {
                readLock.unlock()
            }
        }
        set(value) = writeLock.lock().let {
            try {
                sharedPreferences.edit().putString(KEY_VENDOR_TOKEN, value).apply()
            } finally {
                writeLock.unlock()
            }
        }

    var vendorId: Int
        get() = readLock.lock().let {
            try {
                sharedPreferences.getInt(KEY_VENDOR_ID, -1)
            } finally {
                readLock.unlock()
            }
        }
        set(value) = writeLock.lock().let {
            try {
                sharedPreferences.edit().putInt(KEY_VENDOR_ID, value).apply()
            } finally {
                writeLock.unlock()
            }
        }

    var vendorName: String?
        get() = readLock.lock().let {
            try {
                sharedPreferences.getString(KEY_VENDOR_NAME, null)
            } finally {
                readLock.unlock()
            }
        }
        set(value) = writeLock.lock().let {
            try {
                sharedPreferences.edit().putString(KEY_VENDOR_NAME, value).apply()
            } finally {
                writeLock.unlock()
            }
        }

    var vendorEmail: String?
        get() = readLock.lock().let {
            try {
                sharedPreferences.getString(KEY_VENDOR_EMAIL, null)
            } finally {
                readLock.unlock()
            }
        }
        set(value) = writeLock.lock().let {
            try {
                sharedPreferences.edit().putString(KEY_VENDOR_EMAIL, value).apply()
            } finally {
                writeLock.unlock()
            }
        }

    val isVendorLoggedIn: Boolean
        get() = readLock.lock().let {
            try {
                val token = sharedPreferences.getString(KEY_VENDOR_TOKEN, null)
                val id = sharedPreferences.getInt(KEY_VENDOR_ID, -1)
                token != null && id != -1
            } finally {
                readLock.unlock()
            }
        }

    fun saveVendorAuth(token: String, id: Int, name: String?, email: String?) {
        writeLock.lock()
        try {
            sharedPreferences.edit()
                .putString(KEY_VENDOR_TOKEN, token)
                .putInt(KEY_VENDOR_ID, id)
                .putString(KEY_VENDOR_NAME, name)
                .putString(KEY_VENDOR_EMAIL, email)
                .apply()
        } finally {
            writeLock.unlock()
        }
    }

    fun clearVendorAuth() {
        writeLock.lock()
        try {
            sharedPreferences.edit()
                .remove(KEY_VENDOR_TOKEN)
                .remove(KEY_VENDOR_ID)
                .remove(KEY_VENDOR_NAME)
                .remove(KEY_VENDOR_EMAIL)
                .apply()
        } finally {
            writeLock.unlock()
        }
    }

    // ==========================================
    // LEGAL ACCEPTANCE
    // ==========================================

    var hasAcceptedTerms: Boolean
        get() = readLock.lock().let {
            try {
                sharedPreferences.getBoolean(KEY_ACCEPTED_TERMS, false)
            } finally {
                readLock.unlock()
            }
        }
        set(value) = writeLock.lock().let {
            try {
                sharedPreferences.edit().putBoolean(KEY_ACCEPTED_TERMS, value).apply()
            } finally {
                writeLock.unlock()
            }
        }

    var hasAcceptedPrivacyPolicy: Boolean
        get() = readLock.lock().let {
            try {
                sharedPreferences.getBoolean(KEY_ACCEPTED_PRIVACY, false)
            } finally {
                readLock.unlock()
            }
        }
        set(value) = writeLock.lock().let {
            try {
                sharedPreferences.edit().putBoolean(KEY_ACCEPTED_PRIVACY, value).apply()
            } finally {
                writeLock.unlock()
            }
        }

    var termsAcceptanceDate: Long
        get() = readLock.lock().let {
            try {
                sharedPreferences.getLong(KEY_TERMS_DATE, 0)
            } finally {
                readLock.unlock()
            }
        }
        set(value) = writeLock.lock().let {
            try {
                sharedPreferences.edit().putLong(KEY_TERMS_DATE, value).apply()
            } finally {
                writeLock.unlock()
            }
        }

    fun acceptTermsAndPrivacy() {
        writeLock.lock()
        try {
            sharedPreferences.edit()
                .putBoolean(KEY_ACCEPTED_TERMS, true)
                .putBoolean(KEY_ACCEPTED_PRIVACY, true)
                .putLong(KEY_TERMS_DATE, System.currentTimeMillis())
                .apply()
        } finally {
            writeLock.unlock()
        }
    }

    // ==========================================
    // UTILITY
    // ==========================================

    fun getAuthHeader(userType: UserType): String? {
        readLock.lock()
        try {
            val token = when (userType) {
                UserType.CUSTOMER -> sharedPreferences.getString(KEY_CUSTOMER_TOKEN, null)
                UserType.DRIVER -> sharedPreferences.getString(KEY_DRIVER_TOKEN, null)
                UserType.VENDOR -> sharedPreferences.getString(KEY_VENDOR_TOKEN, null)
            }
            return token?.let { "Bearer $it" }
        } finally {
            readLock.unlock()
        }
    }

    fun clearAll() {
        writeLock.lock()
        try {
            sharedPreferences.edit().clear().apply()
        } finally {
            writeLock.unlock()
        }
    }

    companion object {
        // Customer keys
        private const val KEY_CUSTOMER_TOKEN = "customer_token"
        private const val KEY_CUSTOMER_ID = "customer_id"
        private const val KEY_CUSTOMER_NAME = "customer_name"
        private const val KEY_CUSTOMER_EMAIL = "customer_email"

        // Driver keys
        private const val KEY_DRIVER_TOKEN = "driver_token"
        private const val KEY_DRIVER_ID = "driver_id"
        private const val KEY_DRIVER_NAME = "driver_name"
        private const val KEY_DRIVER_EMAIL = "driver_email"
        private const val KEY_DRIVER_PHONE = "driver_phone"
        private const val KEY_DRIVER_VEHICLE = "driver_vehicle"

        // Vendor keys
        private const val KEY_VENDOR_TOKEN = "vendor_token"
        private const val KEY_VENDOR_ID = "vendor_id"
        private const val KEY_VENDOR_NAME = "vendor_name"
        private const val KEY_VENDOR_EMAIL = "vendor_email"

        // Legal keys
        private const val KEY_ACCEPTED_TERMS = "accepted_terms"
        private const val KEY_ACCEPTED_PRIVACY = "accepted_privacy"
        private const val KEY_TERMS_DATE = "terms_date"
    }

    enum class UserType {
        CUSTOMER, DRIVER, VENDOR
    }
}
