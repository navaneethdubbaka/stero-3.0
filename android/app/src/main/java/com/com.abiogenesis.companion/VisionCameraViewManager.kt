package com.abiogenesis.companion

import com.facebook.react.common.MapBuilder
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext

class VisionCameraViewManager : SimpleViewManager<VisionCameraView>() {

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

    override fun getExportedCustomDirectEventTypeConstants(): Map<String, Any>? {
        return MapBuilder.builder<String, Any>()
            .put(
                "onPoseDetected",
                MapBuilder.of("registrationName", "onPoseDetected")
            )
            .build()
    }
}
