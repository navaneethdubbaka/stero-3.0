export type StillCaptureResult = {
  jpegBase64: string;
  width: number;
  height: number;
};

export type StillCaptureHost = {
  captureStill: (
    maxEdgePx: number,
    jpegQuality: number,
    saveDebug: boolean
  ) => Promise<StillCaptureResult>;
};

let activeHost: StillCaptureHost | null = null;

export function registerStillCaptureHost(host: StillCaptureHost): void {
  activeHost = host;
}

export function unregisterStillCaptureHost(host: StillCaptureHost): void {
  if (activeHost === host) {
    activeHost = null;
  }
}

export function hasStillCaptureHost(): boolean {
  return activeHost != null;
}

/**
 * Capture a JPEG still from the mounted VisionCameraView (Face or Vision screen).
 * Rejects with a clear error when no camera host is active.
 */
export async function captureStill(options?: {
  maxEdgePx?: number;
  jpegQuality?: number;
  saveDebug?: boolean;
}): Promise<StillCaptureResult> {
  if (!activeHost) {
    throw new Error('NO_CAMERA');
  }
  return activeHost.captureStill(
    options?.maxEdgePx ?? 768,
    options?.jpegQuality ?? 75,
    options?.saveDebug ?? false
  );
}
