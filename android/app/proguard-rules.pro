# Add project specific ProGuard / R8 rules here (Page 10 MVP freeze).
# Appended to proguard-android.txt when minifyEnabled is true.

# --- React Native / Hermes / New Architecture ---
-keep,allowobfuscation @interface com.facebook.proguard.annotations.DoNotStrip
-keep,allowobfuscation @interface com.facebook.proguard.annotations.KeepGettersAndSetters
-keep @com.facebook.proguard.annotations.DoNotStrip class *
-keepclassmembers class * {
    @com.facebook.proguard.annotations.DoNotStrip *;
}
-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }
-keep class com.facebook.jni.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }
-keep class com.facebook.react.bridge.** { *; }
-keep class com.facebook.react.uimanager.** { *; }

# Reanimated / Worklets
-keep class com.swmansion.reanimated.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }
-keep class com.swmansion.worklets.** { *; }

# Gesture Handler / Screens / Safe Area
-keep class com.swmansion.gesturehandler.** { *; }
-keep class com.swmansion.rnscreens.** { *; }

# --- Companion app natives ---
-keep class com.abiogenesis.companion.** { *; }

# --- USB serial (mik3y) ---
-keep class com.hoho.android.usbserial.** { *; }
-dontwarn com.hoho.android.usbserial.**

# --- MediaPipe / CameraX / Google ML ---
-keep class com.google.mediapipe.** { *; }
-keep class com.google.android.gms.** { *; }
-keep class androidx.camera.** { *; }
-dontwarn com.google.mediapipe.**
-dontwarn com.google.android.gms.**

# --- NanoHTTPD (Wi-Fi web pilot) ---
-keep class fi.iki.elonen.** { *; }
-dontwarn fi.iki.elonen.**

# --- ONNX Runtime (wake word / models) ---
-keep class ai.onnxruntime.** { *; }
-dontwarn ai.onnxruntime.**

# --- OpenWakeWord ---
-keep class xyz.rementia.openwakeword.** { *; }
-dontwarn xyz.rementia.openwakeword.**

# --- react-native-video / SVG / Skia ---
-keep class com.brentvatne.react.** { *; }
-keep class com.horcrux.svg.** { *; }
-keep class com.shopify.reactnative.skia.** { *; }

# Common RN / Android stubs
-dontwarn okhttp3.**
-dontwarn okio.**
-dontwarn javax.annotation.**
-dontwarn org.codehaus.mojo.animal_sniffer.**
