import { initializeDatabase } from "./data/database";
import { Trader } from "./core/trader";
import { logger } from "./utils/logger";
import config from "./config";

async function main() {
  try {
    // 1. Инициализация БД
    await initializeDatabase();
    logger.info("База данных инициализирована");

    // 2. Создание трейдера
    const trader = new Trader();
    logger.info("Торговый бот инициализирован");

    // 3. Запуск торгового цикла
    trader.start();
    logger.info("Торговый бот запущен");

    // 4. Обработка завершения работы
    process.on("SIGINT", async () => {
      logger.info("Остановка торгового бота...");
      trader.stop();
      process.exit(0);
    });
  } catch (error) {
    logger.error("Не удалось запустить приложение:", error);
    process.exit(1);
  }
}

// Запуск приложения
main();
