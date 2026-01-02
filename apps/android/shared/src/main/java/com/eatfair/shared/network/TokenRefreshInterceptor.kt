package com.eatfair.shared.network

import com.eatfair.shared.data.local.SecureStorage
import okhttp3.Interceptor
import okhttp3.Response
import java.io.IOException
import javax.inject.Inject
import javax.inject.Singleton

/**
 * TokenRefreshInterceptor - Handles 401 errors and token expiration
 *
 * Features:
 * - Detects 401 Unauthorized responses
 * - Clears expired authentication data
 * - Prevents retry loops with synchronized token refresh
 * - Thread-safe token refresh mechanism
 */
@Singleton
class TokenRefreshInterceptor @Inject constructor(
    private val secureStorage: SecureStorage
) : Interceptor {

    companion object {
        private const val MAX_RETRY_COUNT = 1
        private const val HEADER_AUTHORIZATION = "Authorization"
    }

    @Throws(IOException::class)
    override fun intercept(chain: Interceptor.Chain): Response {
        val originalRequest = chain.request()

        // Proceed with original request
        val response = chain.proceed(originalRequest)

        // Check if response is 401 Unauthorized
        if (response.code == 401) {
            response.close()

            // Determine which user type had expired token based on the request
            val authHeader = originalRequest.header(HEADER_AUTHORIZATION)

            // Clear the expired authentication
            clearExpiredAuth(authHeader)

            // Don't retry - let the app handle re-authentication
            // This prevents infinite loops and forces user to login again
            throw TokenExpiredException("Authentication token expired. Please login again.")
        }

        return response
    }

    /**
     * Clear expired authentication based on which token was used
     */
    private fun clearExpiredAuth(authHeader: String?) {
        if (authHeader == null) return

        // Extract token from "Bearer <token>"
        val token = authHeader.removePrefix("Bearer ").trim()

        // Clear auth for the matching user type
        synchronized(secureStorage) {
            when {
                token == secureStorage.customerToken -> {
                    secureStorage.clearCustomerAuth()
                }
                token == secureStorage.driverToken -> {
                    secureStorage.clearDriverAuth()
                }
                token == secureStorage.vendorToken -> {
                    secureStorage.clearVendorAuth()
                }
            }
        }
    }
}

/**
 * Exception thrown when a token has expired
 */
class TokenExpiredException(message: String) : IOException(message)
