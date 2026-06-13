// ─── Structured Logger ───────────────────────────────────────────
// Replaces all console.log/error with structured JSON logging

type LogLevel = "INFO" | "WARN" | "ERROR";

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
}

function formatEntry(entry: LogEntry): string {
  return JSON.stringify(entry);
}

function log(level: LogLevel, message: string, context?: Record<string, unknown>) {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    context,
  };

  const formatted = formatEntry(entry);

  if (level === "ERROR") {
    console.error(formatted);
  } else if (level === "WARN") {
    console.warn(formatted);
  } else {
    console.log(formatted);
  }
}

export const logger = {
  info: (message: string, context?: Record<string, unknown>) => log("INFO", message, context),
  warn: (message: string, context?: Record<string, unknown>) => log("WARN", message, context),
  error: (message: string, context?: Record<string, unknown>) => log("ERROR", message, context),

  // Domain-specific helpers
  sessionCreated: (sessionId: string, agentId: string) =>
    log("INFO", "Session created", { sessionId, agentId }),
  sessionJoined: (sessionId: string, userId: string, role: string) =>
    log("INFO", "Session joined", { sessionId, userId, role }),
  sessionEnded: (sessionId: string, durationSeconds: number) =>
    log("INFO", "Session ended", { sessionId, durationSeconds }),
  recordingStarted: (sessionId: string, recordingId: string) =>
    log("INFO", "Recording started", { sessionId, recordingId }),
  recordingStopped: (sessionId: string, recordingId: string) =>
    log("INFO", "Recording stopped", { sessionId, recordingId }),
  authFailure: (reason: string, context?: Record<string, unknown>) =>
    log("WARN", `Auth failure: ${reason}`, context),
  apiError: (route: string, error: unknown) =>
    log("ERROR", `API error in ${route}`, {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    }),
};
