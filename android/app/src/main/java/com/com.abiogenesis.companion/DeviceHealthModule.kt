package com.abiogenesis.companion

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.BatteryManager
import android.os.Build
import android.os.PowerManager
import android.view.WindowManager
import androidx.core.content.FileProvider
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.LifecycleEventListener
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.DeviceEventManagerModule
import java.io.File
import java.io.FileOutputStream
import java.util.zip.ZipEntry
import java.util.zip.ZipOutputStream

class DeviceHealthModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext), LifecycleEventListener {

    private var batteryReceiver: BroadcastReceiver? = null
    private var thermalListener: PowerManager.OnThermalStatusChangedListener? = null

    override fun getName(): String = "DeviceHealth"

    override fun getConstants(): MutableMap<String, Any> {
        val map = HashMap<String, Any>()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            map["THERMAL_SEVERE"] = PowerManager.THERMAL_STATUS_SEVERE
        } else {
            map["THERMAL_SEVERE"] = 3
        }
        return map
    }

    override fun initialize() {
        super.initialize()
        reactContext.addLifecycleEventListener(this)
        startListeners()
    }

    override fun invalidate() {
        stopListeners()
        reactContext.removeLifecycleEventListener(this)
        super.invalidate()
    }

    override fun onHostResume() {
        emitHealth()
    }

    override fun onHostPause() {}
    override fun onHostDestroy() {
        stopListeners()
    }

    @ReactMethod
    fun addListener(eventName: String) {}

    @ReactMethod
    fun removeListeners(count: Int) {}

    @ReactMethod
    fun getBatteryPercent(promise: Promise) {
        promise.resolve(readBatteryPercent())
    }

    @ReactMethod
    fun getThermalStatus(promise: Promise) {
        promise.resolve(readThermalStatus())
    }

    @ReactMethod
    fun getHealth(promise: Promise) {
        promise.resolve(healthMap())
    }

    /**
     * Window brightness 0..1 while Face is focused.
     * Pass a negative value to restore system brightness.
     */
    @ReactMethod
    fun setFaceBrightness(value: Double, promise: Promise) {
        val activity = currentActivity
        if (activity == null) {
            promise.resolve(false)
            return
        }
        activity.runOnUiThread {
            try {
                val lp = activity.window.attributes
                lp.screenBrightness = if (value < 0) {
                    WindowManager.LayoutParams.BRIGHTNESS_OVERRIDE_NONE
                } else {
                    value.toFloat().coerceIn(0.05f, 1.0f)
                }
                activity.window.attributes = lp
                promise.resolve(true)
            } catch (e: Exception) {
                promise.reject("ERR_BRIGHTNESS", e.message, e)
            }
        }
    }

    /**
     * Zip JSON metadata (no PII expected from JS) and open a share sheet.
     */
    @ReactMethod
    fun shareDiagnosticsZip(jsonMeta: String, promise: Promise) {
        try {
            val dir = File(reactContext.cacheDir, "diagnostics")
            if (!dir.exists()) dir.mkdirs()
            val zipFile = File(dir, "abiogenesis-diagnostics.zip")
            ZipOutputStream(FileOutputStream(zipFile)).use { zip ->
                zip.putNextEntry(ZipEntry("diagnostics.json"))
                zip.write(jsonMeta.toByteArray(Charsets.UTF_8))
                zip.closeEntry()
            }
            val uri = FileProvider.getUriForFile(
                reactContext,
                "${reactContext.packageName}.fileprovider",
                zipFile
            )
            val share = Intent(Intent.ACTION_SEND).apply {
                type = "application/zip"
                putExtra(Intent.EXTRA_STREAM, uri)
                putExtra(Intent.EXTRA_SUBJECT, "ABIOGENESIS diagnostics")
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            val chooser = Intent.createChooser(share, "Share diagnostics").apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            reactContext.startActivity(chooser)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERR_DIAG_ZIP", e.message, e)
        }
    }

    private fun startListeners() {
        if (batteryReceiver == null) {
            batteryReceiver = object : BroadcastReceiver() {
                override fun onReceive(context: Context?, intent: Intent?) {
                    emitHealth()
                }
            }
            val filter = IntentFilter(Intent.ACTION_BATTERY_CHANGED)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                reactContext.registerReceiver(batteryReceiver, filter, Context.RECEIVER_NOT_EXPORTED)
            } else {
                reactContext.registerReceiver(batteryReceiver, filter)
            }
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q && thermalListener == null) {
            val pm = reactContext.getSystemService(Context.POWER_SERVICE) as PowerManager
            thermalListener = PowerManager.OnThermalStatusChangedListener { emitHealth() }
            pm.addThermalStatusListener(reactContext.mainExecutor, thermalListener!!)
        }
        emitHealth()
    }

    private fun stopListeners() {
        batteryReceiver?.let {
            try {
                reactContext.unregisterReceiver(it)
            } catch (_: Exception) {
            }
        }
        batteryReceiver = null
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q && thermalListener != null) {
            val pm = reactContext.getSystemService(Context.POWER_SERVICE) as PowerManager
            try {
                pm.removeThermalStatusListener(thermalListener!!)
            } catch (_: Exception) {
            }
        }
        thermalListener = null
    }

    private fun readBatteryPercent(): Int {
        val bm = reactContext.getSystemService(Context.BATTERY_SERVICE) as BatteryManager
        val pct = bm.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY)
        return if (pct in 0..100) pct else -1
    }

    private fun readThermalStatus(): Int {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            val pm = reactContext.getSystemService(Context.POWER_SERVICE) as PowerManager
            return pm.currentThermalStatus
        }
        return 0
    }

    private fun healthMap(): WritableMap {
        val map = Arguments.createMap()
        map.putInt("batteryPercent", readBatteryPercent())
        map.putInt("thermalStatus", readThermalStatus())
        return map
    }

    private fun emitHealth() {
        if (!reactContext.hasActiveReactInstance()) return
        reactContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit("onHealthChanged", healthMap())
    }
}
