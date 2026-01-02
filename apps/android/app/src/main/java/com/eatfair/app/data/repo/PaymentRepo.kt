package com.eatfair.app.data.repo

import android.util.Log
import com.eatfair.shared.data.repository.DollorRepository
import com.eatfair.shared.model.payment.PaymentSheetKeys
import jakarta.inject.Inject

/**
 * PaymentRepo - Real API Implementation
 * Uses DollorRepository to create Stripe PaymentIntents
 * API: POST /payments/create-intent
 */
class PaymentRepo @Inject constructor(
    private val dollorRepository: DollorRepository
) {
    companion object {
        private const val TAG = "PaymentRepo"
    }

    /**
     * Get payment sheet keys from backend
     * Creates a Stripe PaymentIntent server-side and returns the keys needed for client-side payment
     */
    suspend fun getPaymentSheetKeys(amount: Double): Result<PaymentSheetKeys> {
        return try {
            Log.d(TAG, "Creating payment intent for amount: $amount")

            // Convert amount to cents (Stripe uses smallest currency unit)
            val amountInCents = (amount * 100).toInt()

            val result = dollorRepository.createPaymentIntent(
                amount = amountInCents,
                currency = "usd"
            )

            result.fold(
                onSuccess = { response ->
                    Log.d(TAG, "Payment intent created successfully")
                    val keys = PaymentSheetKeys(
                        paymentIntent = response.clientSecret,
                        ephemeralKey = response.ephemeralKey ?: "",
                        customer = response.customer ?: "",
                        publishableKey = response.publishableKey
                    )
                    Result.success(keys)
                },
                onFailure = { error ->
                    Log.e(TAG, "Failed to create payment intent: ${error.message}")
                    Result.failure(error)
                }
            )
        } catch (e: Exception) {
            Log.e(TAG, "Exception creating payment intent", e)
            Result.failure(e)
        }
    }
}
