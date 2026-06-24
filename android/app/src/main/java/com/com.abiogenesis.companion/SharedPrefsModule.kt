package com.abiogenesis.companion

import android.content.Context
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise

class SharedPrefsModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    private val sharedPref = reactContext.getSharedPreferences("ABIOGENESIS_SETTINGS", Context.MODE_PRIVATE)

    override fun getName(): String {
        return "SharedPrefs"
    }

    @ReactMethod
    fun setString(key: String, value: String, promise: Promise) {
        try {
            sharedPref.edit().putString(key, value).apply()
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERR_SHARED_PREFS_WRITE", e.message, e)
        }
    }

    @ReactMethod
    fun getString(key: String, defaultValue: String, promise: Promise) {
        try {
            val value = sharedPref.getString(key, defaultValue)
            promise.resolve(value)
        } catch (e: Exception) {
            promise.reject("ERR_SHARED_PREFS_READ", e.message, e)
        }
    }
}
