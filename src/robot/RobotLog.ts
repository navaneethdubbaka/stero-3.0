export type RobotLogEntry = {
  at: number;
  message: string;
};

const MAX_ENTRIES = 40;
const entries: RobotLogEntry[] = [];

/** One-shot / diagnostic warnings for Settings → LOGS. */
export function pushRobotWarning(message: string): void {
  entries.push({ at: Date.now(), message });
  if (entries.length > MAX_ENTRIES) {
    entries.splice(0, entries.length - MAX_ENTRIES);
  }
  console.warn(`[RobotLog] ${message}`);
}

export function getRobotWarnings(): RobotLogEntry[] {
  return [...entries];
}

export function clearRobotWarnings(): void {
  entries.length = 0;
}
