package com.eatfair.shared.model

data class LanguageDto(
    val code: String,
    val name: String,
    val nativeName: String,
    val isSelected: Boolean = false
)
