# Vision tracking module

MediaPipe pose events from `VisionCameraView` are forwarded into `TrackingEngine`,
which updates `useTrackingStore` for HUD and (later) Follow / eye-contact.

**Page 2:** camera stays mounted on `VisionScreen` only. A headless pose host for
`FaceScreen` is deferred to Pages 4–5 — mount the same native view off-screen or
as a tiny lifecycle host and call `TrackingEngine.ingest` the same way.
