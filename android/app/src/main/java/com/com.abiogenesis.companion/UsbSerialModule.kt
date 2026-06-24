package com.abiogenesis.companion

import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.hardware.usb.UsbDevice
import android.hardware.usb.UsbManager
import android.os.Build
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.hoho.android.usbserial.driver.CdcAcmSerialDriver
import com.hoho.android.usbserial.driver.Ch34xSerialDriver
import com.hoho.android.usbserial.driver.Cp21xxSerialDriver
import com.hoho.android.usbserial.driver.FtdiSerialDriver
import com.hoho.android.usbserial.driver.ProbeTable
import com.hoho.android.usbserial.driver.UsbSerialDriver
import com.hoho.android.usbserial.driver.UsbSerialPort
import com.hoho.android.usbserial.driver.UsbSerialProber

class UsbSerialModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    private val usbManager = reactContext.getSystemService(Context.USB_SERVICE) as UsbManager
    private var serialPort: UsbSerialPort? = null
    private val ACTION_USB_PERMISSION = "com.abiogenesis.companion.USB_PERMISSION"

    override fun getName(): String {
        return "UsbSerial"
    }

    /**
     * Build a custom ProbeTable that covers common Arduino / USB-to-Serial chips.
     * This is used as a fallback when getDefaultProber() returns nothing.
     */
    private fun getCustomProber(): UsbSerialProber {
        val customTable = ProbeTable()
        // Arduino LLC genuine boards (CDC ACM)
        customTable.addProduct(0x2341, 0x0043, CdcAcmSerialDriver::class.java) // Uno R3
        customTable.addProduct(0x2341, 0x0001, CdcAcmSerialDriver::class.java) // Uno
        customTable.addProduct(0x2341, 0x0243, CdcAcmSerialDriver::class.java) // Uno R3 alt
        customTable.addProduct(0x2A03, 0x0043, CdcAcmSerialDriver::class.java) // Uno R3 (arduino.org)
        // CH340 (most Arduino clones)
        customTable.addProduct(0x1A86, 0x7523, Ch34xSerialDriver::class.java)  // CH340
        customTable.addProduct(0x1A86, 0x5523, Ch34xSerialDriver::class.java)  // CH341
        customTable.addProduct(0x1A86, 0xE523, Ch34xSerialDriver::class.java)  // CH330
        // FTDI
        customTable.addProduct(0x0403, 0x6001, FtdiSerialDriver::class.java)   // FT232R
        customTable.addProduct(0x0403, 0x6015, FtdiSerialDriver::class.java)   // FT231X
        // CP210x (Silicon Labs)
        customTable.addProduct(0x10C4, 0xEA60, Cp21xxSerialDriver::class.java) // CP2102
        customTable.addProduct(0x10C4, 0xEA70, Cp21xxSerialDriver::class.java) // CP2105
        return UsbSerialProber(customTable)
    }

    /**
     * Find all drivers using the default prober first, then fall back to custom prober.
     */
    private fun findAllDrivers(): List<UsbSerialDriver> {
        var drivers = UsbSerialProber.getDefaultProber().findAllDrivers(usbManager)
        if (drivers.isEmpty()) {
            // Fallback: try custom prober for clone boards
            drivers = getCustomProber().findAllDrivers(usbManager)
        }
        return drivers
    }

    @ReactMethod
    fun listDevices(promise: Promise) {
        try {
            val availableDrivers = findAllDrivers()
            val resultList = Arguments.createArray()
            for (driver in availableDrivers) {
                val device = driver.device
                val deviceMap = Arguments.createMap()
                deviceMap.putInt("deviceId", device.deviceId)
                deviceMap.putInt("vendorId", device.vendorId)
                deviceMap.putInt("productId", device.productId)
                deviceMap.putString("deviceName", device.deviceName)
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                    deviceMap.putString("manufacturerName", device.manufacturerName)
                    deviceMap.putString("productName", device.productName)
                }
                resultList.pushMap(deviceMap)
            }
            promise.resolve(resultList)
        } catch (e: Exception) {
            promise.reject("ERR_LIST_DEVICES", e.message, e)
        }
    }

    @ReactMethod
    fun requestPermission(deviceId: Int, promise: Promise) {
        try {
            val device = findDeviceById(deviceId)
            if (device == null) {
                promise.reject("ERR_DEVICE_NOT_FOUND", "USB Device with ID $deviceId not found")
                return
            }

            if (usbManager.hasPermission(device)) {
                promise.resolve(true)
                return
            }

            val flag = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                PendingIntent.FLAG_MUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
            } else {
                PendingIntent.FLAG_UPDATE_CURRENT
            }
            val intent = Intent(ACTION_USB_PERMISSION).apply {
                setPackage(reactApplicationContext.packageName)
            }
            val permissionIntent = PendingIntent.getBroadcast(
                reactApplicationContext,
                0,
                intent,
                flag
            )

            // Register dynamic receiver to listen to user decision
            val filter = IntentFilter(ACTION_USB_PERMISSION)
            val receiver = object : BroadcastReceiver() {
                override fun onReceive(context: Context?, intent: Intent?) {
                    if (ACTION_USB_PERMISSION == intent?.action) {
                        val granted = intent.getBooleanExtra(UsbManager.EXTRA_PERMISSION_GRANTED, false)
                        reactApplicationContext.unregisterReceiver(this)
                        promise.resolve(granted)
                    }
                }
            }
            
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                reactApplicationContext.registerReceiver(receiver, filter, Context.RECEIVER_EXPORTED)
            } else {
                reactApplicationContext.registerReceiver(receiver, filter)
            }

            usbManager.requestPermission(device, permissionIntent)
        } catch (e: Exception) {
            promise.reject("ERR_REQ_PERMISSION", e.message, e)
        }
    }

    @ReactMethod
    fun connect(deviceId: Int, baudRate: Int, promise: Promise) {
        try {
            // Disconnect existing if any
            disconnectPort()

            val driver = findDriverById(deviceId)
            if (driver == null) {
                promise.reject("ERR_DEVICE_NOT_FOUND", "USB Device with ID $deviceId not found")
                return
            }

            val device = driver.device
            if (!usbManager.hasPermission(device)) {
                promise.reject("ERR_NO_PERMISSION", "No permission to access USB Device")
                return
            }

            val connection = usbManager.openDevice(device)
            if (connection == null) {
                promise.reject("ERR_OPEN_FAILED", "Failed to open USB connection")
                return
            }

            val port = driver.ports[0]
            port.open(connection)
            port.setParameters(baudRate, 8, UsbSerialPort.STOPBITS_1, UsbSerialPort.PARITY_NONE)
            
            // Set DTR/RTS to true (required for Arduino Uno to start serial communication)
            try {
                port.dtr = true
                port.rts = true
            } catch (e: Exception) {
                // Ignore if not supported by driver
            }

            serialPort = port

            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERR_CONNECT_FAILED", e.message, e)
        }
    }

    @ReactMethod
    fun disconnect(promise: Promise) {
        try {
            disconnectPort()
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERR_DISCONNECT_FAILED", e.message, e)
        }
    }

    @ReactMethod
    fun write(data: String, promise: Promise) {
        try {
            val port = serialPort
            if (port == null) {
                promise.reject("ERR_NOT_CONNECTED", "USB Serial is not connected")
                return
            }
            val bytes = data.toByteArray(Charsets.UTF_8)
            port.write(bytes, 1000)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERR_WRITE_FAILED", e.message, e)
        }
    }

    private fun disconnectPort() {
        serialPort?.let {
            try {
                it.close()
            } catch (e: Exception) {
                // Ignore close errors
            }
        }
        serialPort = null
    }

    private fun findDeviceById(deviceId: Int): UsbDevice? {
        val deviceList = usbManager.deviceList
        for (device in deviceList.values) {
            if (device.deviceId == deviceId) {
                return device
            }
        }
        return null
    }

    private fun findDriverById(deviceId: Int): UsbSerialDriver? {
        val availableDrivers = findAllDrivers()
        for (driver in availableDrivers) {
            if (driver.device.deviceId == deviceId) {
                return driver
            }
        }
        return null
    }
}
