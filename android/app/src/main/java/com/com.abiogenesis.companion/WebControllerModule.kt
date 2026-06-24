package com.abiogenesis.companion

import android.content.Context
import android.net.ConnectivityManager
import android.net.LinkProperties
import android.net.NetworkCapabilities
import android.util.Log
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import fi.iki.elonen.NanoHTTPD
import java.io.IOException
import java.net.InetAddress
import java.net.NetworkInterface
import java.util.Collections

class WebControllerModule(private val reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    private var server: WebServer? = null
    
    companion object {
        private const val TAG = "WebController"
        private var currentDirection = "S"
        private var currentSpeed = 150
        private var isUsbConnected = false

        // Methods to update state from JS so the Web UI can poll and show correct status
        fun updateStatus(direction: String, speed: Int, connected: Boolean) {
            currentDirection = direction
            currentSpeed = speed
            isUsbConnected = connected
        }
    }

    override fun getName(): String {
        return "WebController"
    }

    @ReactMethod
    fun startServer(port: Int, promise: Promise) {
        try {
            if (server != null) {
                server?.stop()
            }
            server = WebServer(port)
            server?.start()
            val ip = getWifiIpAddress()
            val url = "http://$ip:$port"
            Log.d(TAG, "Web controller server started at $url")
            promise.resolve(url)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to start server: ${e.message}", e)
            promise.reject("ERR_START_SERVER", e.message, e)
        }
    }

    @ReactMethod
    fun stopServer(promise: Promise) {
        try {
            server?.stop()
            server = null
            Log.d(TAG, "Web controller server stopped")
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to stop server: ${e.message}", e)
            promise.reject("ERR_STOP_SERVER", e.message, e)
        }
    }

    @ReactMethod
    fun isRunning(promise: Promise) {
        promise.resolve(server != null)
    }

    @ReactMethod
    fun getIpAddress(promise: Promise) {
        promise.resolve(getWifiIpAddress())
    }

    @ReactMethod
    fun syncRobotState(direction: String, speed: Int, connected: Boolean, promise: Promise) {
        updateStatus(direction, speed, connected)
        promise.resolve(true)
    }

    private fun sendEvent(eventName: String, params: WritableMap?) {
        reactContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(eventName, params)
    }

    private fun getWifiIpAddress(): String {
        try {
            val interfaces = Collections.list(NetworkInterface.getNetworkInterfaces())
            for (networkInterface in interfaces) {
                if (!networkInterface.isUp || networkInterface.isLoopback) continue
                val addresses = Collections.list(networkInterface.inetAddresses)
                for (address in addresses) {
                    if (!address.isLoopbackAddress && !address.hostAddress.contains(":")) {
                        val ip = address.hostAddress
                        if (ip.startsWith("192.") || ip.startsWith("10.") || ip.startsWith("172.")) {
                            return ip
                        }
                    }
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error getting IP address: ${e.message}")
        }
        return "127.0.0.1"
    }

    private inner class WebServer(port: Int) : NanoHTTPD(port) {
        override fun serve(session: IHTTPSession): Response {
            val method = session.method
            val uri = session.uri

            Log.d(TAG, "Request: $method $uri")

            // Handle API commands
            if (method == Method.POST && uri == "/api/command") {
                val files = HashMap<String, String>()
                try {
                    session.parseBody(files)
                    val postData = session.parms
                    val command = postData["command"]
                    val speedStr = postData["speed"]

                    if (command != null) {
                        Log.d(TAG, "Received command via web: $command")
                        val params = Arguments.createMap().apply {
                            putString("command", command)
                            if (speedStr != null) {
                                putInt("speed", speedStr.toIntOrNull() ?: currentSpeed)
                            }
                        }
                        // Emit event to React Native
                        sendEvent("onWebServerCommand", params)
                        
                        return newFixedLengthResponse(
                            Response.Status.OK, 
                            "application/json", 
                            "{\"success\": true, \"command\": \"$command\"}"
                        )
                    }
                } catch (e: Exception) {
                    Log.e(TAG, "Error handling command: ${e.message}")
                    return newFixedLengthResponse(
                        Response.Status.INTERNAL_ERROR, 
                        "application/json", 
                        "{\"error\": \"${e.message}\"}"
                    )
                }
            }

            // Handle status polling
            if (method == Method.GET && uri == "/api/status") {
                val json = """
                    {
                        "isConnected": $isUsbConnected,
                        "direction": "$currentDirection",
                        "speed": $currentSpeed
                    }
                """.trimIndent()
                return newFixedLengthResponse(Response.Status.OK, "application/json", json)
            }

            // Serve HTML Control page
            if (method == Method.GET && (uri == "/" || uri == "/index.html")) {
                val html = getHtmlTemplate()
                return newFixedLengthResponse(Response.Status.OK, "text/html", html)
            }

            return newFixedLengthResponse(Response.Status.NOT_FOUND, "text/plain", "Not Found")
        }
    }

    private fun getHtmlTemplate(): String {
        return """
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
                <title>ABIOGENESIS Remote Control</title>
                <style>
                    :root {
                        --bg-color: #0A0A0E;
                        --card-bg: #14141F;
                        --accent-cyan: #00FFFF;
                        --accent-green: #00FFC8;
                        --accent-red: #FF3C3C;
                        --accent-amber: #FFD700;
                        --text-color: #E0E0E6;
                        --text-muted: #8E8E9F;
                    }
                    * {
                        box-sizing: border-box;
                        margin: 0;
                        padding: 0;
                        user-select: none;
                        -webkit-user-select: none;
                    }
                    body {
                        background-color: var(--bg-color);
                        color: var(--text-color);
                        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                        padding: 20px;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        min-height: 100vh;
                        overflow: hidden;
                    }
                    .header {
                        text-align: center;
                        margin-bottom: 25px;
                        width: 100%;
                    }
                    .title {
                        font-size: 24px;
                        font-weight: 900;
                        letter-spacing: 2px;
                        color: #FFF;
                        text-shadow: 0 0 10px rgba(0,255,255,0.3);
                    }
                    .subtitle {
                        font-size: 11px;
                        color: var(--text-muted);
                        margin-top: 4px;
                        text-transform: uppercase;
                        letter-spacing: 1.5px;
                    }
                    .status-panel {
                        background-color: var(--card-bg);
                        border: 1px solid rgba(255,255,255,0.05);
                        border-radius: 12px;
                        padding: 12px 20px;
                        width: 100%;
                        max-width: 400px;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        margin-bottom: 30px;
                    }
                    .status-item {
                        display: flex;
                        flex-direction: column;
                    }
                    .status-label {
                        font-size: 9px;
                        text-transform: uppercase;
                        color: var(--text-muted);
                        letter-spacing: 1px;
                    }
                    .status-value {
                        font-size: 14px;
                        font-weight: bold;
                        margin-top: 2px;
                    }
                    .status-connected { color: var(--accent-green); }
                    .status-disconnected { color: var(--accent-red); }
                    
                    /* D-Pad styles */
                    .dpad-container {
                        position: relative;
                        width: 220px;
                        height: 220px;
                        margin-bottom: 35px;
                    }
                    .dpad-btn {
                        position: absolute;
                        width: 66px;
                        height: 66px;
                        background: rgba(255,255,255,0.03);
                        border: 1px solid rgba(255,255,255,0.08);
                        border-radius: 50%;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        color: #FFF;
                        font-size: 24px;
                        cursor: pointer;
                        transition: all 0.15s ease;
                        touch-action: manipulation;
                    }
                    .dpad-btn:active, .dpad-btn.active {
                        background: var(--accent-cyan);
                        border-color: var(--accent-cyan);
                        color: #000;
                        box-shadow: 0 0 15px rgba(0,255,255,0.5);
                    }
                    .dpad-up { top: 0; left: 77px; }
                    .dpad-left { top: 77px; left: 0; }
                    .dpad-stop { 
                        top: 77px; 
                        left: 77px; 
                        background: rgba(255, 60, 60, 0.1); 
                        border-color: rgba(255, 60, 60, 0.3);
                        color: var(--accent-red);
                        font-size: 11px;
                        font-weight: 800;
                    }
                    .dpad-stop:active, .dpad-stop.active {
                        background: var(--accent-red);
                        border-color: var(--accent-red);
                        color: #FFF;
                        box-shadow: 0 0 15px rgba(255,60,60,0.5);
                    }
                    .dpad-right { top: 77px; right: 0; }
                    .dpad-down { bottom: 0; left: 77px; }

                    /* Speed Slider */
                    .speed-container {
                        width: 100%;
                        max-width: 400px;
                        background: var(--card-bg);
                        border: 1px solid rgba(255,255,255,0.05);
                        border-radius: 16px;
                        padding: 20px;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                    }
                    .speed-header {
                        display: flex;
                        justify-content: space-between;
                        width: 100%;
                        margin-bottom: 10px;
                    }
                    .speed-title {
                        font-size: 11px;
                        text-transform: uppercase;
                        color: var(--text-muted);
                        letter-spacing: 1px;
                    }
                    .speed-val {
                        font-size: 18px;
                        font-weight: 900;
                        color: var(--accent-amber);
                    }
                    .slider {
                        -webkit-appearance: none;
                        width: 100%;
                        height: 6px;
                        border-radius: 3px;
                        background: rgba(255,255,255,0.1);
                        outline: none;
                        margin: 15px 0;
                    }
                    .slider::-webkit-slider-thumb {
                        -webkit-appearance: none;
                        appearance: none;
                        width: 22px;
                        height: 22px;
                        border-radius: 50%;
                        background: var(--accent-amber);
                        cursor: pointer;
                        box-shadow: 0 0 8px rgba(255,215,0,0.4);
                        transition: transform 0.1s ease;
                    }
                    .slider::-webkit-slider-thumb:active {
                        transform: scale(1.2);
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="title">ABIOGENESIS</div>
                    <div class="subtitle">WiFi Pilot Console</div>
                </div>

                <div class="status-panel">
                    <div class="status-item">
                        <span class="status-label">Robot Link</span>
                        <span id="link-status" class="status-value status-disconnected">DISCONNECTED</span>
                    </div>
                    <div class="status-item" style="text-align: right;">
                        <span class="status-label">Active Command</span>
                        <span id="active-cmd" class="status-value" style="color: var(--accent-cyan)">S</span>
                    </div>
                </div>

                <div class="dpad-container">
                    <div class="dpad-btn dpad-up" data-cmd="F">▲</div>
                    <div class="dpad-btn dpad-left" data-cmd="L">◀</div>
                    <div class="dpad-btn dpad-stop dpad-active" data-cmd="S">STOP</div>
                    <div class="dpad-btn dpad-right" data-cmd="R">▶</div>
                    <div class="dpad-btn dpad-down" data-cmd="B">▼</div>
                </div>

                <div class="speed-container">
                    <div class="speed-header">
                        <span class="speed-title">Chassis Speed Tuning</span>
                        <span id="speed-display" class="speed-val">150 PWM</span>
                    </div>
                    <input type="range" min="80" max="255" value="150" class="slider" id="speed-slider">
                </div>

                <script>
                    const linkStatus = document.getElementById('link-status');
                    const activeCmd = document.getElementById('active-cmd');
                    const speedDisplay = document.getElementById('speed-display');
                    const speedSlider = document.getElementById('speed-slider');
                    let currentDirection = 'S';

                    // Periodic Status Polling
                    async function pollStatus() {
                        try {
                            const res = await fetch('/api/status');
                            const status = await res.json();
                            
                            if (status.isConnected) {
                                linkStatus.textContent = 'CONNECTED';
                                linkStatus.className = 'status-value status-connected';
                            } else {
                                linkStatus.textContent = 'USB OFFLINE';
                                linkStatus.className = 'status-value status-disconnected';
                            }

                            // Sync speed if not dragging
                            if (document.activeElement !== speedSlider) {
                                speedSlider.value = status.speed;
                                speedDisplay.textContent = status.speed + ' PWM';
                            }
                            
                            // Highlight currently active direction
                            currentDirection = status.direction;
                            activeCmd.textContent = currentDirection;
                            
                            document.querySelectorAll('.dpad-btn').forEach(btn => {
                                if (btn.getAttribute('data-cmd') === currentDirection) {
                                    btn.classList.add('active');
                                } else {
                                    btn.classList.remove('active');
                                }
                            });
                        } catch (e) {
                            linkStatus.textContent = 'LINK ERROR';
                            linkStatus.className = 'status-value status-disconnected';
                        }
                    }

                    setInterval(pollStatus, 1000);
                    pollStatus();

                    // Send Command
                    async function sendCommand(command, speed) {
                        try {
                            const params = new URLSearchParams();
                            params.append('command', command);
                            if (speed !== undefined) {
                                params.append('speed', speed);
                            }
                            await fetch('/api/command', {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/x-www-form-urlencoded'
                                },
                                body: params
                            });
                        } catch (e) {
                            console.error('Failed to send command', e);
                        }
                    }

                    // Speed Slider Handler
                    speedSlider.addEventListener('input', (e) => {
                        const val = e.target.value;
                        speedDisplay.textContent = val + ' PWM';
                    });
                    
                    speedSlider.addEventListener('change', (e) => {
                        const val = e.target.value;
                        sendCommand(currentDirection, val);
                    });

                    // D-Pad Button Interaction
                    document.querySelectorAll('.dpad-btn').forEach(btn => {
                        const cmd = btn.getAttribute('data-cmd');

                        const startPress = (e) => {
                            e.preventDefault();
                            sendCommand(cmd, speedSlider.value);
                        };

                        const endPress = (e) => {
                            e.preventDefault();
                            // Only stop if released button matches the pressed command
                            if (cmd !== 'S') {
                                sendCommand('S', speedSlider.value);
                            }
                        };

                        // Touch/Pointer events support press-and-hold
                        btn.addEventListener('pointerdown', startPress);
                        btn.addEventListener('pointerup', endPress);
                        btn.addEventListener('pointerleave', endPress);
                    });
                </script>
            </body>
            </html>
        """.trimIndent()
    }
}
