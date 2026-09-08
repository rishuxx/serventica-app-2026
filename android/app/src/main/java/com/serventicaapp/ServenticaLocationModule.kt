package com.serventicaapp

import android.annotation.SuppressLint
import android.content.Context
import android.location.Location
import android.location.LocationListener
import android.location.LocationManager
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class ServenticaLocationModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "ServenticaLocation"

    @SuppressLint("MissingPermission")
    @ReactMethod
    fun getCurrentPosition(promise: Promise) {
        val locationManager =
            reactContext.getSystemService(Context.LOCATION_SERVICE) as? LocationManager

        if (locationManager == null) {
            promise.reject("LOCATION_UNAVAILABLE", "Android LocationManager is not available on this device")
            return
        }

        val providers = listOf(
            LocationManager.GPS_PROVIDER,
            LocationManager.NETWORK_PROVIDER,
            LocationManager.PASSIVE_PROVIDER
        )

        // 1. Inspect recent last known location from providers
        var bestLocation: Location? = null
        for (provider in providers) {
            try {
                if (locationManager.isProviderEnabled(provider)) {
                    val loc = locationManager.getLastKnownLocation(provider)
                    if (loc != null) {
                        if (bestLocation == null || loc.accuracy < bestLocation.accuracy) {
                            bestLocation = loc
                        }
                    }
                }
            } catch (e: SecurityException) {
                // Permission not granted
            }
        }

        // If fresh location is available (< 30 seconds old), return immediately
        if (bestLocation != null && (System.currentTimeMillis() - bestLocation.time) < 30000) {
            val map = Arguments.createMap().apply {
                putDouble("latitude", bestLocation.latitude)
                putDouble("longitude", bestLocation.longitude)
                putDouble("accuracy", bestLocation.accuracy.toDouble())
                putDouble("altitude", bestLocation.altitude)
                putDouble("timestamp", bestLocation.time.toDouble())
            }
            promise.resolve(map)
            return
        }

        // 2. Request single fresh update from GPS / Network
        var hasResolved = false
        val listener = object : LocationListener {
            override fun onLocationChanged(location: Location) {
                if (!hasResolved) {
                    hasResolved = true
                    try {
                        locationManager.removeUpdates(this)
                    } catch (e: Exception) {
                        // ignore
                    }
                    val map = Arguments.createMap().apply {
                        putDouble("latitude", location.latitude)
                        putDouble("longitude", location.longitude)
                        putDouble("accuracy", location.accuracy.toDouble())
                        putDouble("altitude", location.altitude)
                        putDouble("timestamp", location.time.toDouble())
                    }
                    promise.resolve(map)
                }
            }

            override fun onStatusChanged(provider: String?, status: Int, extras: Bundle?) {}
            override fun onProviderEnabled(provider: String) {}
            override fun onProviderDisabled(provider: String) {}
        }

        val mainHandler = Handler(Looper.getMainLooper())
        mainHandler.postDelayed({
            if (!hasResolved) {
                try {
                    locationManager.removeUpdates(listener)
                } catch (e: Exception) {
                    // ignore
                }
                if (bestLocation != null) {
                    val map = Arguments.createMap().apply {
                        putDouble("latitude", bestLocation.latitude)
                        putDouble("longitude", bestLocation.longitude)
                        putDouble("accuracy", bestLocation.accuracy.toDouble())
                        putDouble("altitude", bestLocation.altitude)
                        putDouble("timestamp", bestLocation.time.toDouble())
                    }
                    promise.resolve(map)
                } else {
                    promise.reject("TIMEOUT", "GPS location acquisition timed out")
                }
            }
        }, 12000)

        var requestedAny = false
        for (provider in providers) {
            try {
                if (locationManager.isProviderEnabled(provider)) {
                    locationManager.requestSingleUpdate(provider, listener, Looper.getMainLooper())
                    requestedAny = true
                }
            } catch (e: Exception) {
                // ignore
            }
        }

        if (!requestedAny && bestLocation != null) {
            val map = Arguments.createMap().apply {
                putDouble("latitude", bestLocation.latitude)
                putDouble("longitude", bestLocation.longitude)
                putDouble("accuracy", bestLocation.accuracy.toDouble())
                putDouble("altitude", bestLocation.altitude)
                putDouble("timestamp", bestLocation.time.toDouble())
            }
            promise.resolve(map)
        } else if (!requestedAny) {
            promise.reject("PROVIDERS_DISABLED", "No location providers (GPS/Network) are enabled")
        }
    }
}
