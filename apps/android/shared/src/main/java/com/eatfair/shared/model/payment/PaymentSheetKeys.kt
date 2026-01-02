package com.eatfair.shared.model.payment

data class PaymentSheetKeys(
    val paymentIntent: String,
    val ephemeralKey: String,
    val customer: String,
    val publishableKey: String
)
