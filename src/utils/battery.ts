/** Follow is refused at or below this percent. */
export const LOW_BATTERY_PERCENT = 15;

export function isLowBattery(percent: number): boolean {
  return percent >= 0 && percent <= LOW_BATTERY_PERCENT;
}
