package com.abiogenesis.companion

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.provider.Settings
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import android.util.Log

class NotificationModule(private val reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    private val receiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            intent?.let {
                if (it.action == NotificationListenerService.ACTION_NOTIFICATION) {
                    val packageName = it.getStringExtra("packageName") ?: ""
                    val title = it.getStringExtra("title") ?: ""
                    val text = it.getStringExtra("text") ?: ""

                    val params = Arguments.createMap().apply {
                        putString("packageName", packageName)
                        putString("title", title)
                        putString("text", text)
                    }

                    Log.d("NotificationModule", "Emitting notification event to JS: $packageName")
                    reactContext
                        .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                        .emit("onNotificationReceived", params)
                }
            }
        }
    }

    override fun getName(): String {
        return "NotificationModule"
    }

    override fun initialize() {
        super.initialize()
        val filter = IntentFilter(NotificationListenerService.ACTION_NOTIFICATION)
        try {
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.TIRAMISU) {
                reactContext.registerReceiver(receiver, filter, Context.RECEIVER_EXPORTED)
            } else {
                reactContext.registerReceiver(receiver, filter)
            }
        } catch (e: Exception) {
            Log.e("NotificationModule", "Failed to register broadcast receiver", e)
        }
    }

    override fun invalidate() {
        super.invalidate()
        try {
            reactContext.unregisterReceiver(receiver)
        } catch (e: Exception) {
            Log.e("NotificationModule", "Error unregistering receiver", e)
        }
    }

    @ReactMethod
    fun checkPermission(promise: Promise) {
        try {
            val enabledListeners = Settings.Secure.getString(reactContext.contentResolver, "enabled_notification_listeners")
            val packageName = reactContext.packageName
            val isEnabled = enabledListeners != null && enabledListeners.contains(packageName)
            promise.resolve(isEnabled)
        } catch (e: Exception) {
            promise.reject("PERMISSION_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun requestPermission() {
        try {
            val intent = Intent("android.settings.ACTION_NOTIFICATION_LISTENER_SETTINGS").apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            reactContext.startActivity(intent)
        } catch (e: Exception) {
            Log.e("NotificationModule", "Failed to open notification settings", e)
        }
    }
}
