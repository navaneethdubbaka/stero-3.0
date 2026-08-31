export type LogLevel = 'info' | 'warn' | 'error';

export type LogEntry = {
  at: number;
  level: LogLevel;
  message: string;
};

const MAX = 80;
const ring: LogEntry[] = [];

/** Strip secrets so diagnostics zip never includes API keys. */
export function sanitizeLogMessage(message: string): string {
  return message
    .replace(/sk-[A-Za-z0-9_-]{10,}/g, 'sk-[redacted]')
    .replace(/api[_-]?key["']?\s*[:=]\s*["']?[^"'\s]+/gi, 'api_key=[redacted]');
}

export function log(level: LogLevel, message: string): void {
  const entry: LogEntry = {
    at: Date.now(),
    level,
    message: sanitizeLogMessage(String(message)).slice(0, 500),
  };
  ring.push(entry);
  if (ring.length > MAX) {
    ring.splice(0, ring.length - MAX);
  }
}

export function logInfo(message: string): void {
  log('info', message);
}

export function logWarn(message: string): void {
  log('warn', message);
}

export function logError(message: string): void {
  log('error', message);
}

export function getLogRing(): LogEntry[] {
  return [...ring];
}

export function clearLogRing(): void {
  ring.length = 0;
}
