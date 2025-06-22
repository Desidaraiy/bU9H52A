import { format } from "date-fns";
import { LOG_LEVELS } from "../config/constants";

type LogLevel = keyof typeof LOG_LEVELS;

class Logger {
  private static getCurrentTimestamp(): string {
    return format(new Date(), "yyyy-MM-dd HH:mm:ss");
  }

  private static log(level: LogLevel, ...args: unknown[]): void {
    const levelLabel = LOG_LEVELS[level];
    console.log(`[${this.getCurrentTimestamp()}] [${levelLabel}]`, ...args);
  }

  static debug(...args: unknown[]): void {
    if (process.env.NODE_ENV !== "production") {
      this.log("DEBUG", ...args);
    }
  }

  static info(...args: unknown[]): void {
    this.log("INFO", ...args);
  }

  static warn(...args: unknown[]): void {
    this.log("WARN", ...args);
  }

  static error(...args: unknown[]): void {
    this.log("ERROR", ...args);
  }
}

export const logger = Logger;
