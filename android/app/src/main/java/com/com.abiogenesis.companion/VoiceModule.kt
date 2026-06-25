package com.abiogenesis.companion

import android.content.Intent
import android.os.Bundle
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import android.speech.tts.TextToSpeech
import android.speech.tts.UtteranceProgressListener
import android.util.Log
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.rementia.openwakeword.lib.WakeWordEngine
import com.rementia.openwakeword.lib.model.*
import kotlinx.coroutines.*
import java.util.*

class VoiceModule(private val reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext), TextToSpeech.OnInitListener {

    private val tag = "VoiceModule"
    private var wakeWordEngine: WakeWordEngine? = null
    private var speechRecognizer: SpeechRecognizer? = null
    private var tts: TextToSpeech? = null
    
    private val scope = CoroutineScope(Dispatchers.Default + SupervisorJob())
    private var wakeWordJob: Job? = null
    private var isWakeWordListening = false

    private var speechRate = 1.0f
    private var volume = 1.0f

    override fun getName(): String {
        return "VoiceModule"
    }

    init {
        // Initialize TTS
        UiThreadUtil.runOnUiThread {
            try {
                tts = TextToSpeech(reactContext, this)
            } catch (e: Exception) {
                Log.e(tag, "Failed to initialize TTS: ${e.message}", e)
            }
        }
        // Initialize SpeechRecognizer
        UiThreadUtil.runOnUiThread {
            try {
                speechRecognizer = SpeechRecognizer.createSpeechRecognizer(reactContext)
                speechRecognizer?.setRecognitionListener(object : RecognitionListener {
                    override fun onReadyForSpeech(params: Bundle?) {
                        sendEvent("onSpeechStateChange", Arguments.createMap().apply { putString("state", "READY") })
                    }
                    override fun onBeginningOfSpeech() {
                        sendEvent("onSpeechStateChange", Arguments.createMap().apply { putString("state", "BEGINNING") })
                    }
                    override fun onRmsChanged(rmsdB: Float) {}
                    override fun onBufferReceived(buffer: ByteArray?) {}
                    override fun onEndOfSpeech() {
                        sendEvent("onSpeechStateChange", Arguments.createMap().apply { putString("state", "END") })
                    }
                    override fun onError(error: Int) {
                        val errorMessage = when (error) {
                            SpeechRecognizer.ERROR_AUDIO -> "Audio recording error"
                            SpeechRecognizer.ERROR_CLIENT -> "Client side error"
                            SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS -> "Insufficient permissions"
                            SpeechRecognizer.ERROR_NETWORK -> "Network error"
                            SpeechRecognizer.ERROR_NETWORK_TIMEOUT -> "Network timeout"
                            SpeechRecognizer.ERROR_NO_MATCH -> "No speech match"
                            SpeechRecognizer.ERROR_RECOGNIZER_BUSY -> "Speech recognizer busy"
                            SpeechRecognizer.ERROR_SERVER -> "Server error"
                            SpeechRecognizer.ERROR_SPEECH_TIMEOUT -> "Speech input timeout"
                            else -> "Unknown error"
                        }
                        val map = Arguments.createMap().apply {
                            putInt("code", error)
                            putString("message", errorMessage)
                        }
                        sendEvent("onSpeechError", map)
                    }
                    override fun onResults(results: Bundle?) {
                        val matches = results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                        if (!matches.isNullOrEmpty()) {
                            val map = Arguments.createMap().apply {
                                putString("text", matches[0])
                            }
                            sendEvent("onSpeechRecognized", map)
                        }
                    }
                    override fun onPartialResults(partialResults: Bundle?) {
                        val matches = partialResults?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                        if (!matches.isNullOrEmpty()) {
                            val map = Arguments.createMap().apply {
                                putString("text", matches[0])
                            }
                            sendEvent("onSpeechPartialResult", map)
                        }
                    }
                    override fun onEvent(eventType: Int, params: Bundle?) {}
                })
            } catch (e: Exception) {
                Log.e(tag, "Failed to initialize SpeechRecognizer: ${e.message}", e)
            }
        }
    }

    override fun onInit(status: Int) {
        if (status == TextToSpeech.SUCCESS) {
            tts?.language = Locale.US
            tts?.setOnUtteranceProgressListener(object : UtteranceProgressListener() {
                override fun onStart(utteranceId: String?) {
                    sendEvent("onTtsStarted", Arguments.createMap().apply { putString("id", utteranceId) })
                }
                override fun onDone(utteranceId: String?) {
                    sendEvent("onTtsFinished", Arguments.createMap().apply { putString("id", utteranceId) })
                }
                override fun onError(utteranceId: String?) {
                    sendEvent("onTtsError", Arguments.createMap().apply { putString("id", utteranceId) })
                }
                override fun onStop(utteranceId: String?, interrupted: Boolean) {
                    sendEvent("onTtsStopped", Arguments.createMap().apply { putString("id", utteranceId) })
                }
            })
        } else {
            Log.e(tag, "Failed to initialize TextToSpeech")
        }
    }

    @ReactMethod
    fun startWakeWordDetection(promise: Promise) {
        try {
            if (isWakeWordListening) {
                promise.resolve(true)
                return
            }

            val models = listOf(
                WakeWordModel("Sonic", "sonic.onnx", threshold = 0.5f)
            )
            
            wakeWordEngine = WakeWordEngine(reactContext, models)
            
            wakeWordJob = scope.launch {
                wakeWordEngine?.detections?.collect { detection ->
                    Log.d(tag, "Wake word detected: ${detection.model.name} score: ${detection.score}")
                    if (detection.model.name == "Sonic") {
                        val map = Arguments.createMap().apply {
                            putString("model", detection.model.name)
                            putDouble("score", detection.score.toDouble())
                        }
                        sendEvent("onWakeWordDetected", map)
                    }
                }
            }

            wakeWordEngine?.start()
            isWakeWordListening = true
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e(tag, "Error starting wake word engine", e)
            promise.reject("ERROR_START_WAKEWORD", e.message, e)
        }
    }

    @ReactMethod
    fun stopWakeWordDetection(promise: Promise) {
        try {
            wakeWordJob?.cancel()
            wakeWordEngine?.release()
            wakeWordEngine = null
            isWakeWordListening = false
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERROR_STOP_WAKEWORD", e.message, e)
        }
    }

    @ReactMethod
    fun startSpeechRecognition(promise: Promise) {
        UiThreadUtil.runOnUiThread {
            try {
                // First stop wake word detection if it is listening, to release the mic
                if (isWakeWordListening) {
                    wakeWordJob?.cancel()
                    wakeWordEngine?.release()
                    wakeWordEngine = null
                    isWakeWordListening = false
                }
                val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
                    putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
                    putExtra(RecognizerIntent.EXTRA_LANGUAGE, "en-US")
                    putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
                    putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1)
                }
                speechRecognizer?.startListening(intent)
                promise.resolve(true)
            } catch (e: Exception) {
                promise.reject("ERROR_START_SPEECH", e.message, e)
            }
        }
    }

    @ReactMethod
    fun stopSpeechRecognition(promise: Promise) {
        UiThreadUtil.runOnUiThread {
            try {
                speechRecognizer?.stopListening()
                promise.resolve(true)
            } catch (e: Exception) {
                promise.reject("ERROR_STOP_SPEECH", e.message, e)
            }
        }
    }

    @ReactMethod
    fun speak(text: String, voiceName: String, promise: Promise) {
        UiThreadUtil.runOnUiThread {
            try {
                tts?.setSpeechRate(speechRate)
                if (voiceName.isNotEmpty()) {
                    val match = tts?.voices?.firstOrNull { it.name == voiceName || it.locale.toString() == voiceName }
                    if (match != null) {
                        tts?.voice = match
                    }
                }
                val params = Bundle().apply {
                    putFloat(TextToSpeech.Engine.KEY_PARAM_VOLUME, volume)
                }
                val utteranceId = UUID.randomUUID().toString()
                tts?.speak(text, TextToSpeech.QUEUE_FLUSH, params, utteranceId)
                promise.resolve(utteranceId)
            } catch (e: Exception) {
                promise.reject("ERROR_TTS", e.message, e)
            }
        }
    }

    @ReactMethod
    fun getAvailableVoices(promise: Promise) {
        UiThreadUtil.runOnUiThread {
            try {
                val voices = tts?.voices
                val list = Arguments.createArray()
                if (voices != null) {
                    for (voice in voices) {
                        val map = Arguments.createMap().apply {
                            putString("name", voice.name)
                            putString("locale", voice.locale.toString())
                            putInt("quality", voice.quality)
                            putInt("latency", voice.latency)
                            putBoolean("isNetwork", voice.isNetworkConnectionRequired)
                        }
                        list.pushMap(map)
                    }
                }
                promise.resolve(list)
            } catch (e: Exception) {
                promise.reject("ERROR_GET_VOICES", e.message, e)
            }
        }
    }

    @ReactMethod
    fun stopSpeaking(promise: Promise) {
        UiThreadUtil.runOnUiThread {
            try {
                tts?.stop()
                promise.resolve(true)
            } catch (e: Exception) {
                promise.reject("ERROR_STOP_TTS", e.message, e)
            }
        }
    }

    @ReactMethod
    fun setVoiceSettings(rate: Double, vol: Double, promise: Promise) {
        speechRate = rate.toFloat()
        volume = vol.toFloat()
        promise.resolve(true)
    }

    private fun sendEvent(eventName: String, params: WritableMap?) {
        if (reactContext.hasActiveReactInstance()) {
            reactContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit(eventName, params)
        }
    }
}
