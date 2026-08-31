/** Matches Android PowerManager.THERMAL_STATUS_SEVERE. */
export const THERMAL_STATUS_SEVERE = 3;

export function isThermalSevere(status: number): boolean {
  return status >= THERMAL_STATUS_SEVERE;
}
