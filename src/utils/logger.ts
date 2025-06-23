import { format } from "date-fns";
import fs from "fs/promises";
import path from "path";
import { LOG_LEVELS } from "../config/constants";

type LogLevel = keyof typeof LOG_LEVELS;
type LogEntry = {
  timestamp: string;
  level: string;
  message: string;
  data?: unknown[];
  args?: unknown[];
};

class Logger {
  private static logFile = path.join(__dirname, "../../log.json");
  private static readonly MAX_LOG_SIZE = 10 * 1024 * 1024; // 10MB

  private static getCurrentTimestamp(): string {
    return format(new Date(), "yyyy-MM-dd HH:mm:ss");
  }

  private static async writeToFile(entry: LogEntry): Promise<void> {
    try {
      // Проверка размера файла
      let stats;
      try {
        stats = await fs.stat(this.logFile);
      } catch {
        stats = { size: 0 };
      }

      // Ротация логов
      if (stats.size > this.MAX_LOG_SIZE) {
        const rotatedFile = `${this.logFile}.${Date.now()}`;
        await fs.rename(this.logFile, rotatedFile);
      }

      // Форматирование записи
      const logLine = JSON.stringify(entry) + "\n";

      // Асинхронная запись
      await fs.appendFile(this.logFile, logLine, "utf-8");
    } catch (error) {
      console.error("Ошибка записи лога:", error);
    }
  }

  private static async log(level: LogLevel, ...args: unknown[]): Promise<void> {
    const levelLabel = LOG_LEVELS[level];
    const timestamp = this.getCurrentTimestamp();
    const message = args
      .map((arg) =>
        typeof arg === "object" ? JSON.stringify(arg) : String(arg)
      )
      .join(" ");

    // Консольный вывод
    console.log(`[${timestamp}] [${levelLabel}]`, ...args);

    // Формирование записи для файла
    const logEntry: LogEntry = {
      timestamp,
      level: levelLabel,
      message,
      ...(args.length > 1 ? { args } : {}),
    };

    // Асинхронная запись в файл (без ожидания)
    this.writeToFile(logEntry).catch(console.error);
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
