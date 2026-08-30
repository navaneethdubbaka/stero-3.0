package com.abiogenesis.companion

import com.facebook.react.bridge.ReadableArray
import com.facebook.react.common.MapBuilder
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext

class VisionCameraViewManager : SimpleViewManager<VisionCameraView>() {

    companion object {
        const val COMMAND_CAPTURE_STILL = 1
    }

    override fun getName(): String {
        return "VisionCameraView"
    }

    override fun createViewInstance(reactContext: ThemedReactContext): VisionCameraView {
        return VisionCameraView(reactContext)
    }

    override fun onDropViewInstance(view: VisionCameraView) {
        super.onDropViewInstance(view)
        view.cleanup()
    }

    override fun getCommandsMap(): MutableMap<String, Int> {
        return MapBuilder.of("captureStill", COMMAND_CAPTURE_STILL)
    }

    override fun receiveCommand(view: VisionCameraView, commandId: String?, args: ReadableArray?) {
        when (commandId) {
            "captureStill", COMMAND_CAPTURE_STILL.toString() -> handleCaptureStill(view, args)
        }
    }

    override fun receiveCommand(view: VisionCameraView, commandId: Int, args: ReadableArray?) {
        when (commandId) {
            COMMAND_CAPTURE_STILL -> handleCaptureStill(view, args)
        }
    }

    private fun handleCaptureStill(view: VisionCameraView, args: ReadableArray?) {
        if (args == null || args.size() < 1) return
        val requestId = args.getString(0) ?: return
        val maxEdge = if (args.size() > 1) args.getInt(1) else 768
        val quality = if (args.size() > 2) args.getInt(2) else 75
        val saveDebug = if (args.size() > 3) args.getBoolean(3) else false
        view.captureStill(requestId, maxEdge, quality, saveDebug)
    }

    override fun getExportedCustomDirectEventTypeConstants(): Map<String, Any>? {
        return MapBuilder.builder<String, Any>()
            .put(
                "onPoseDetected",
                MapBuilder.of("registrationName", "onPoseDetected")
            )
            .put(
                "onStillCaptured",
                MapBuilder.of("registrationName", "onStillCaptured")
            )
            .build()
    }
}
