import dotenv from "dotenv";
import path from "path";
import { NewsSource } from "../types"; // Тип для источников новостей

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

// Базовые настройки приложения
const config = {
  // Настройки окружения
  env: process.env.NODE_ENV || "development",

  // Настройки Bybit API
  bybit: {
    apiKey: process.env.BYBIT_API_KEY || "",
    apiSecret: process.env.BYBIT_API_SECRET || "",
    testnet: process.env.BYBIT_TESTNET === "true",
  },

  // Настройки OpenAI
  openai: {
    apiKey: process.env.OPENAI_API_KEY || "",
    model: process.env.OPENAI_MODEL || "gpt-4-turbo",
    temperature: parseFloat(process.env.OPENAI_TEMP || "0.2"),
    maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || "500"),
  },

  // Настройки рисков
  risk: {
    maxDrawdown: parseFloat(process.env.MAX_DRAWDOWN || "0.1"),
    initialBalance: parseFloat(process.env.INITIAL_BALANCE || "50"),
    positionSizePercent: parseFloat(
      process.env.POSITION_SIZE_PERCENT || "0.02"
    ),
    emergencyThreshold: parseFloat(process.env.EMERGENCY_THRESHOLD || "0.08"),
  },

  // Настройки парсера новостей
  news: {
    updateInterval: parseInt(process.env.NEWS_UPDATE_INTERVAL || "900000"), // 15 минут
    sources: JSON.parse(process.env.NEWS_SOURCES || "[]") as NewsSource[],
    sentimentThreshold: parseFloat(
      process.env.NEWS_SENTIMENT_THRESHOLD || "0.7"
    ),
  },

  // Настройки уведомлений
  notifications: {
    email: process.env.NOTIFICATION_EMAIL || "",
    emailSender: process.env.NOTIFICATION_EMAIL_SENDER || "",
    emailPassword: process.env.NOTIFICATION_EMAIL_PASSWORD || "",
    // ... остальные настройки
  },

  // Настройки базы данных
  database: {
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "3306"),
    name: process.env.DB_NAME || "crypto_bot",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    dialect: "mysql" as const,
    logging: process.env.DB_LOGGING === "true",
  },

  // Настройки стратегии
  strategy: {
    defaultMode: process.env.DEFAULT_STRATEGY || "conservative",
    minVolatility: parseFloat(process.env.MIN_VOLATILITY || "0.03"),
    maxAssetPercent: parseFloat(process.env.MAX_ASSET_PERCENT || "0.2"),
  },
};

export default config;
