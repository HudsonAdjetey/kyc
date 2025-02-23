type LogLevel = "info" | "warn" | "error"

class Logger {
  private log(level: LogLevel, message: string, data?: Record<string, unknown>): void {
    const timestamp = new Date().toISOString()
    const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`

    if (data) {
      console[level](logMessage, JSON.stringify(data))
    } else {
      console[level](logMessage)
    }
  }

  info(message: string, data?: Record<string, unknown>): void {
    this.log("info", message, data)
  }

  warn(message: string, data?: Record<string, unknown>): void {
    this.log("warn", message, data)
  }

  error(message: string, error: Error): void {
    this.log("error", message, {
      error: error.message,
      stack: error.stack,
    })
  }
}

export const logger = new Logger()

