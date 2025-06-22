import { Sequelize } from "sequelize-typescript";
import config from "../config";
import { Asset } from "./models/asset.model";
import { Decision } from "./models/decision.model";
import { NewsItem } from "./models/news.model";
import { logger } from "../utils/logger";

// Инициализация Sequelize с TypeScript
const sequelize = new Sequelize({
  dialect: config.database.dialect,
  host: config.database.host,
  port: config.database.port,
  database: config.database.name,
  username: config.database.user,
  password: config.database.password,
  models: [Asset, Decision, NewsItem],
  logging: config.database.logging ? (msg) => logger.debug(msg) : false,
  define: {
    timestamps: true,
    underscored: true,
    charset: "utf8mb4",
    collate: "utf8mb4_unicode_ci",
  },
  dialectOptions: {
    decimalNumbers: true, // Правильное чтение DECIMAL
  },
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
});

// Функция для подключения к БД
export async function initializeDatabase() {
  try {
    await sequelize.authenticate();
    logger.info("Database connection established");

    // Синхронизация моделей
    await sequelize.sync({ alter: process.env.NODE_ENV !== "production" });
    logger.info("Database models synchronized");
  } catch (error) {
    logger.error("Database connection failed:", error);
    process.exit(1);
  }
}

export default sequelize;
