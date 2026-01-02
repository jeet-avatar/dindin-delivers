package com.eatfair.app.model.profile

import androidx.compose.ui.graphics.vector.ImageVector

data class ProfileMenuItemDto(

    val icon: ImageVector,

    val title: String,

    val onClick: () -> Unit

)