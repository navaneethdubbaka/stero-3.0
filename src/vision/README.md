# Vision tracking module

MediaPipe pose events from `VisionCameraView` are forwarded into `TrackingEngine`,
which updates `useTrackingStore` for HUD, Follow, and eye-contact gaze.

## Camera hosts

| Screen | Role |
|--------|------|
| `VisionScreen` | Full preview + Follow toggle diagnostics |
| `FaceScreen` | **Hidden** 1×1 `VisionCameraView` while awake for gaze + Follow |

**Power cost:** Face’s hidden host still runs CameraX + MediaPipe Pose while the
face is awake. Sleep unmounts it (releases camera). React Navigation stack
unmounts Face when Vision is open, so only one host is active at a time.

Do not call `TrackingEngine.reset()` on unmount while `FollowMode.isEnabled()`.

## Vision AI (Page 6)

`VisionAiService` answers see / read / count / find via a JPEG still from the
mounted camera (`captureStill`) plus multimodal chat. When vision is off, no
camera is mounted, or the provider rejects images, it falls back to a short
pose-text summary from `useTrackingStore`. Stills stay in memory unless
Settings → Debug save stills is enabled (writes under app cache).
