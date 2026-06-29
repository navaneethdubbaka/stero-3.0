package com.abiogenesis.companion

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.os.SystemClock
import android.util.Log
import android.view.View.MeasureSpec
import android.widget.FrameLayout
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.Preview
import androidx.camera.core.CameraState
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.core.content.ContextCompat
import androidx.lifecycle.LifecycleOwner
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactContext
import com.facebook.react.bridge.WritableMap
import com.facebook.react.uimanager.UIManagerHelper
import com.facebook.react.uimanager.events.Event
import com.facebook.react.uimanager.events.RCTEventEmitter
import com.google.mediapipe.framework.image.MediaImageBuilder
import com.google.mediapipe.framework.image.BitmapImageBuilder
import com.google.mediapipe.tasks.core.BaseOptions
import com.google.mediapipe.tasks.vision.core.ImageProcessingOptions
import com.google.mediapipe.tasks.vision.core.RunningMode
import com.google.mediapipe.tasks.vision.poselandmarker.PoseLandmarker
import com.google.mediapipe.tasks.vision.poselandmarker.PoseLandmarkerResult
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors

// Custom React Native New/Old Architecture Compatible Event Class
class PoseEvent(
    surfaceId: Int,
    viewId: Int,
    private val eventMap: WritableMap
) : Event<PoseEvent>(surfaceId, viewId) {

    @Deprecated("Use constructor with surfaceId")
    constructor(viewId: Int, eventMap: WritableMap) : this(-1, viewId, eventMap)

    override fun getEventName(): String = "onPoseDetected"

    override fun getEventData(): WritableMap? = eventMap

    override fun dispatch(rctEventEmitter: RCTEventEmitter) {
        rctEventEmitter.receiveEvent(viewTag, eventName, eventMap)
    }
}

class VisionCameraView(context: Context) : FrameLayout(context) {

    private val previewView = PreviewView(context)
    private var cameraProvider: ProcessCameraProvider? = null
    private var imageAnalyzer: ImageAnalysis? = null
    private var poseLandmarker: PoseLandmarker? = null
    private var cameraExecutor: ExecutorService? = null
    private var isUsingFrontCamera = true
    private var isCameraStarted = false

    init {
        // Force COMPATIBLE (TextureView) implementation mode
        // to prevent z-ordering, clipping, and black-screen issues inside React Native layouts.
        previewView.implementationMode = PreviewView.ImplementationMode.COMPATIBLE
        previewView.layoutParams = LayoutParams(
            LayoutParams.MATCH_PARENT,
            LayoutParams.MATCH_PARENT
        )
        addView(previewView)
    }

    override fun onAttachedToWindow() {
        super.onAttachedToWindow()
        Log.i("VisionCameraView", "onAttachedToWindow - initializing camera and pose detector")
        if (cameraExecutor == null) {
            cameraExecutor = Executors.newSingleThreadExecutor()
        }
        // Initialize MediaPipe PoseLandmarker asynchronously on background thread
        cameraExecutor?.execute {
            setupPoseLandmarker()
        }
        if (width > 0 && height > 0) {
            startCamera()
        }
    }

    override fun onDetachedFromWindow() {
        super.onDetachedFromWindow()
        Log.i("VisionCameraView", "onDetachedFromWindow - cleaning up resources")
        cameraProvider?.unbindAll()
        cleanup()
    }

    override fun onLayout(changed: Boolean, left: Int, top: Int, right: Int, bottom: Int) {
        super.onLayout(changed, left, top, right, bottom)
        val w = right - left
        val h = bottom - top
        Log.i("VisionCameraView", "onLayout: w=$w, h=$h, changed=$changed")
        
        if (w > 0 && h > 0) {
            previewView.measure(
                MeasureSpec.makeMeasureSpec(w, MeasureSpec.EXACTLY),
                MeasureSpec.makeMeasureSpec(h, MeasureSpec.EXACTLY)
            )
            previewView.layout(0, 0, w, h)
            startCamera()
        }
    }

    override fun requestLayout() {
        super.requestLayout()
        post {
            measure(
                MeasureSpec.makeMeasureSpec(width, MeasureSpec.EXACTLY),
                MeasureSpec.makeMeasureSpec(height, MeasureSpec.EXACTLY)
            )
            layout(left, top, right, bottom)
        }
    }

    private fun getLifecycleOwner(): LifecycleOwner? {
        var ctx = context
        while (ctx is android.content.ContextWrapper) {
            if (ctx is LifecycleOwner) {
                return ctx
            }
            ctx = ctx.baseContext
        }
        return (context as? ReactContext)?.currentActivity as? LifecycleOwner
    }

    private fun setupPoseLandmarker() {
        if (poseLandmarker != null) return
        try {
            val baseOptionsBuilder = BaseOptions.builder()
                .setModelAssetPath("pose_landmarker_lite.task")

            val optionsBuilder = PoseLandmarker.PoseLandmarkerOptions.builder()
                .setBaseOptions(baseOptionsBuilder.build())
                .setRunningMode(RunningMode.LIVE_STREAM)
                .setResultListener { result, _ ->
                    processPoseResult(result)
                }
                .setErrorListener { exception ->
                    val errorMsg = "MediaPipe Error: ${exception.message}"
                    Log.e("VisionCameraView", errorMsg, exception)
                    sendErrorToJs(errorMsg)
                }

            poseLandmarker = PoseLandmarker.createFromOptions(context.applicationContext, optionsBuilder.build())
            Log.i("VisionCameraView", "MediaPipe PoseLandmarker initialized.")
        } catch (e: Exception) {
            val errorMsg = "MediaPipe Init Error: ${e.message}"
            Log.e("VisionCameraView", errorMsg, e)
            sendErrorToJs(errorMsg)
        }
    }

    private fun startCamera() {
        if (isCameraStarted) return
        isCameraStarted = true
        Log.i("VisionCameraView", "startCamera: starting CameraX with dimensions w=$width, h=$height")

        val permission = ContextCompat.checkSelfPermission(context, Manifest.permission.CAMERA)
        val appPermission = ContextCompat.checkSelfPermission(context.applicationContext, Manifest.permission.CAMERA)
        if (permission != PackageManager.PERMISSION_GRANTED && appPermission != PackageManager.PERMISSION_GRANTED) {
            Log.w("VisionCameraView", "Camera permission check failed. Attempting setup anyway.")
        }

        val cameraProviderFuture = ProcessCameraProvider.getInstance(context.applicationContext)
        cameraProviderFuture.addListener({
            try {
                cameraProvider = cameraProviderFuture.get()
                bindCameraUseCases()
            } catch (e: Exception) {
                val errorMsg = "CameraProvider Error: ${e.message}"
                Log.e("VisionCameraView", errorMsg, e)
                sendErrorToJs(errorMsg)
            }
        }, ContextCompat.getMainExecutor(context.applicationContext))
    }

    private fun bindCameraUseCases() {
        val provider = cameraProvider ?: return
        val lifecycleOwner = getLifecycleOwner()

        if (lifecycleOwner == null) {
            val errorMsg = "LifecycleOwner is null, retrying bind in 500ms..."
            Log.w("VisionCameraView", errorMsg)
            sendErrorToJs(errorMsg)
            postDelayed({ bindCameraUseCases() }, 500)
            return
        }

        val executor = cameraExecutor ?: return

        // Preview use case - configure to 1280x720 landscape to prevent heavy surface buffers
        val preview = Preview.Builder()
            .setTargetResolution(android.util.Size(1280, 720))
            .build()
            .also {
                it.setSurfaceProvider(previewView.surfaceProvider)
            }

        // Image Analysis use case - use standard 640x480 resolution to prevent HAL session config timeouts
        imageAnalyzer = ImageAnalysis.Builder()
            .setTargetResolution(android.util.Size(640, 480))
            .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
            .build()
            .also { analysis ->
                analysis.setAnalyzer(executor) { imageProxy ->
                    val mediaImage = imageProxy.image
                    val landmarker = poseLandmarker
                    
                    if (mediaImage != null && landmarker != null) {
                        try {
                            // Asynchronously convert YUV_420_888 ImageProxy to ARGB_8888 Bitmap
                            val bitmap = yuv420ToBitmap(mediaImage)
                            // Pass converted bitmap to MediaPipe
                            val mpImage = BitmapImageBuilder(bitmap).build()
                            val imageProcessingOptions = ImageProcessingOptions.builder()
                                .setRotationDegrees(imageProxy.imageInfo.rotationDegrees)
                                .build()
                            
                            val frameTime = SystemClock.uptimeMillis()
                            landmarker.detectAsync(mpImage, imageProcessingOptions, frameTime)
                        } catch (e: Exception) {
                            Log.e("VisionCameraView", "Frame analysis failed", e)
                        } finally {
                            imageProxy.close()
                        }
                    } else {
                        imageProxy.close()
                    }
                }
            }

        // Resolve selected camera with front to back fallbacks
        var cameraSelector = if (isUsingFrontCamera) {
            CameraSelector.DEFAULT_FRONT_CAMERA
        } else {
            CameraSelector.DEFAULT_BACK_CAMERA
        }

        try {
            if (isUsingFrontCamera && !provider.hasCamera(CameraSelector.DEFAULT_FRONT_CAMERA) &&
                provider.hasCamera(CameraSelector.DEFAULT_BACK_CAMERA)) {
                isUsingFrontCamera = false
                cameraSelector = CameraSelector.DEFAULT_BACK_CAMERA
                Log.w("VisionCameraView", "Front camera not found, falling back to Back Camera.")
            }
        } catch (e: Exception) {
            Log.e("VisionCameraView", "Error checking camera availability", e)
        }

        try {
            provider.unbindAll()
            val camera = provider.bindToLifecycle(lifecycleOwner, cameraSelector, preview, imageAnalyzer)
            Log.i("VisionCameraView", "CameraX UseCases bound successfully.")
            
            // Listen to camera state changes to dynamically switch to back camera if front camera fails to open/configure
            camera.cameraInfo.cameraState.observe(lifecycleOwner) { cameraState ->
                val stateType = cameraState.type
                Log.i("VisionCameraView", "Camera state transition: $stateType")
                val error = cameraState.error
                if (error != null) {
                    val code = error.code
                    Log.e("VisionCameraView", "Camera state error code: $code (type: $stateType)")
                    if (isUsingFrontCamera) {
                        post {
                            fallbackToBackCamera()
                        }
                    }
                }
            }

            // Clear any previous error on success
            sendClearErrorToJs()
        } catch (e: Exception) {
            val errorMsg = "CameraX Bind Error: ${e.message}"
            Log.e("VisionCameraView", errorMsg, e)
            sendErrorToJs(errorMsg)
        }
    }

    private fun fallbackToBackCamera() {
        if (isUsingFrontCamera) {
            Log.w("VisionCameraView", "Front camera timed out or failed to configure. Falling back to Back Camera.")
            sendErrorToJs("Front camera failed to configure. Falling back to back camera...")
            isUsingFrontCamera = false
            
            // Release front camera resources first to allow back camera to capture hardware locks
            try {
                cameraProvider?.unbindAll()
            } catch (e: Exception) {
                Log.e("VisionCameraView", "Error unbinding prior to fallback", e)
            }
            
            // Introduce a 500ms delay for HAL driver teardown completion
            postDelayed({
                bindCameraUseCases()
            }, 500)
        }
    }

    private fun yuv420ToNv21(image: android.media.Image): ByteArray {
        val width = image.width
        val height = image.height
        val ySize = width * height
        val uvSize = width * height / 2
        val nv21 = ByteArray(ySize + uvSize)

        val yBuffer = image.planes[0].buffer
        val uBuffer = image.planes[1].buffer
        val vBuffer = image.planes[2].buffer

        var pos = 0
        val yRowStride = image.planes[0].rowStride
        val yPixelStride = image.planes[0].pixelStride
        if (yPixelStride == 1 && yRowStride == width) {
            yBuffer.get(nv21, 0, ySize)
            pos += ySize
        } else {
            for (row in 0 until height) {
                yBuffer.position(row * yRowStride)
                yBuffer.get(nv21, pos, width)
                pos += width
            }
        }

        val uRowStride = image.planes[1].rowStride
        val uPixelStride = image.planes[1].pixelStride
        val vRowStride = image.planes[2].rowStride
        val vPixelStride = image.planes[2].pixelStride

        val uvWidth = width / 2
        val uvHeight = height / 2

        for (row in 0 until uvHeight) {
            val uPos = row * uRowStride
            val vPos = row * vRowStride
            for (col in 0 until uvWidth) {
                uBuffer.position(uPos + col * uPixelStride)
                vBuffer.position(vPos + col * vPixelStride)
                nv21[pos++] = vBuffer.get()
                nv21[pos++] = uBuffer.get()
            }
        }
        return nv21
    }

    private fun yuv420ToBitmap(image: android.media.Image): android.graphics.Bitmap {
        val nv21 = yuv420ToNv21(image)
        val yuvImage = android.graphics.YuvImage(nv21, android.graphics.ImageFormat.NV21, image.width, image.height, null)
        val out = java.io.ByteArrayOutputStream()
        yuvImage.compressToJpeg(android.graphics.Rect(0, 0, image.width, image.height), 100, out)
        val imageBytes = out.toByteArray()
        return android.graphics.BitmapFactory.decodeByteArray(imageBytes, 0, imageBytes.size)
    }

    private fun processPoseResult(result: PoseLandmarkerResult) {
        val landmarksList = result.landmarks()
        val eventData = Arguments.createMap()

        if (landmarksList != null && landmarksList.isNotEmpty()) {
            val landmarks = landmarksList[0] // Primary person

            // Calculate center offset and distance based on shoulders
            // Left Shoulder is 11, Right Shoulder is 12
            if (landmarks.size > 12) {
                val leftShoulder = landmarks[11]
                val rightShoulder = landmarks[12]

                // Horizontal center: 0.5 is absolute center
                val centerX = (leftShoulder.x() + rightShoulder.x()) / 2.0f
                // Offset is target horizontal offset from screen center (-0.5 to 0.5)
                val offset = centerX - 0.5f

                // Shoulder width determines distance estimation
                val shoulderWidth = Math.abs(leftShoulder.x() - rightShoulder.x())

                // Calibrate close/medium/far zones
                val distanceZone = when {
                    shoulderWidth > 0.28f -> "CLOSE"
                    shoulderWidth >= 0.14f -> "MEDIUM"
                    else -> "FAR"
                }

                eventData.putBoolean("personFound", true)
                eventData.putDouble("offset", offset.toDouble())
                eventData.putString("distanceZone", distanceZone)
                eventData.putDouble("shoulderWidth", shoulderWidth.toDouble())

                // Export simplified keypoints array to JS for drawing
                val keypointsArray = Arguments.createArray()
                for (landmark in landmarks) {
                    val keypointMap = Arguments.createMap().apply {
                        putDouble("x", landmark.x().toDouble())
                        putDouble("y", landmark.y().toDouble())
                        putDouble("z", landmark.z().toDouble())
                        putDouble("presence", landmark.presence().orElse(0.0f).toDouble())
                        putDouble("visibility", landmark.visibility().orElse(0.0f).toDouble())
                    }
                    keypointsArray.pushMap(keypointMap)
                }
                eventData.putArray("landmarks", keypointsArray)
            } else {
                setEmptyTrackingData(eventData)
            }
        } else {
            setEmptyTrackingData(eventData)
        }

        dispatchEventToJs(eventData)
    }

    private fun setEmptyTrackingData(eventData: WritableMap) {
        eventData.putBoolean("personFound", false)
        eventData.putDouble("offset", 0.0)
        eventData.putString("distanceZone", "FAR")
        eventData.putDouble("shoulderWidth", 0.0)
        eventData.putArray("landmarks", Arguments.createArray())
    }

    private fun sendErrorToJs(message: String) {
        val eventData = Arguments.createMap().apply {
            putBoolean("personFound", false)
            putDouble("offset", 0.0)
            putString("distanceZone", "FAR")
            putDouble("shoulderWidth", 0.0)
            putArray("landmarks", Arguments.createArray())
            putString("error", message)
        }
        dispatchEventToJs(eventData)
    }

    private fun sendClearErrorToJs() {
        val eventData = Arguments.createMap().apply {
            putBoolean("personFound", false)
            putDouble("offset", 0.0)
            putString("distanceZone", "FAR")
            putDouble("shoulderWidth", 0.0)
            putArray("landmarks", Arguments.createArray())
            putNull("error")
        }
        dispatchEventToJs(eventData)
    }

    private fun dispatchEventToJs(eventData: WritableMap) {
        val reactContext = context as? ReactContext ?: return
        try {
            val surfaceId = UIManagerHelper.getSurfaceId(this)
            val eventDispatcher = UIManagerHelper.getEventDispatcherForReactTag(reactContext, id)
            eventDispatcher?.dispatchEvent(PoseEvent(surfaceId, id, eventData))
        } catch (e: Exception) {
            Log.e("VisionCameraView", "Failed to dispatch PoseEvent via UIManagerHelper", e)
        }
    }

    fun cleanup() {
        isCameraStarted = false
        cameraExecutor?.shutdown()
        cameraExecutor = null
        try {
            poseLandmarker?.close()
        } catch (e: Exception) {
            Log.e("VisionCameraView", "Failed to close PoseLandmarker", e)
        }
        poseLandmarker = null
    }
}
