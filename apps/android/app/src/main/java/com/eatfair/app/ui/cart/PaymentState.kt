package com.eatfair.app.ui.cart

sealed class PaymentState {
    object Idle : PaymentState()
    object Loading : PaymentState()
    object Ready : PaymentState()
    object Success : PaymentState()
    data class Error(val message: String) : PaymentState()
}