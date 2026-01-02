package com.eatfair.shared.model.home

data class Category(

    val id: Int,

    val name: String,

    val emoji: String,

    val isPopular: Boolean = false,

    var isSelected: Boolean = false

)