package com.eatfair.driver.location

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.os.Looper
import android.util.Log
import androidx.core.content.ContextCompat
import com.eatfair.shared.data.repository.DollorRepository
import com.google.android.gms.location.FusedLocationProviderClient
import com.google.android.gms.location.LocationCallback
import com.google.android.gms.location.LocationRequest
import com.google.android.gms.location.LocationResult
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Real-time driver location substrate.
 *
 * Starts FusedLocationProvider updates while the driver is online and pushes
 * each fix to the backend via [DollorRepository.updateDriverLocation]. The most
 * recent fix is exposed as [lastLocation] so ride-request queries can include
 * the driver's lat/long.
 */
@Singleton
class DriverLocationManager @Inject constructor(
    @ApplicationContext private val context: Context,
    private val repository: DollorRepository
) {
    companion object {
        private const val TAG = "DriverLocationManager"
        private const val UPDATE_INTERVAL_MS = 10_000L
        private const val FASTEST_INTERVAL_MS = 5_000L
    }

    data class LatLng(val latitude: Double, val longitude: Double)

    private val fusedClient: FusedLocationProviderClient =
        LocationServices.getFusedLocationProviderClient(context)

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    private val _lastLocation = MutableStateFlow<LatLng?>(null)
    val lastLocation: StateFlow<LatLng?> = _lastLocation.asStateFlow()

    @Volatile
    private var isTracking = false

    private val locationCallback = object : LocationCallback() {
        override fun onLocationResult(result: LocationResult) {
            val location = result.lastLocation ?: return
            _lastLocation.value = LatLng(location.latitude, location.longitude)
            scope.launch {
                repository.updateDriverLocation(location.latitude, location.longitude)
                    .onFailure { Log.w(TAG, "Failed to push driver location: ${it.message}") }
            }
        }
    }

    private fun hasLocationPermission(): Boolean {
        return ContextCompat.checkSelfPermission(
            context, Manifest.permission.ACCESS_FINE_LOCATION
        ) == PackageManager.PERMISSION_GRANTED ||
            ContextCompat.checkSelfPermission(
                context, Manifest.permission.ACCESS_COARSE_LOCATION
            ) == PackageManager.PERMISSION_GRANTED
    }

    /** Begin periodic location updates (no-op if already tracking or no permission). */
    fun startLocationUpdates() {
        if (isTracking) return
        if (!hasLocationPermission()) {
            Log.w(TAG, "Location permission not granted - cannot start updates")
            return
        }
        val request = LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, UPDATE_INTERVAL_MS)
            .setMinUpdateIntervalMillis(FASTEST_INTERVAL_MS)
            .build()
        try {
            fusedClient.requestLocationUpdates(request, locationCallback, Looper.getMainLooper())
            isTracking = true
            Log.d(TAG, "Started driver location updates")
        } catch (e: SecurityException) {
            Log.e(TAG, "SecurityException starting location updates: ${e.message}")
        }
    }

    /** Stop periodic location updates. */
    fun stopLocationUpdates() {
        if (!isTracking) return
        fusedClient.removeLocationUpdates(locationCallback)
        isTracking = false
        Log.d(TAG, "Stopped driver location updates")
    }
}
