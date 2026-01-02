package com.eatfair.shared.model.address

import android.os.Parcelable
import kotlinx.parcelize.Parcelize

@Parcelize
data class LocationData(
    val locationName: String,
    val address: String,
    val latitude: Double,
    val longitude: Double
) : Parcelable
