import { RestClientV5 } from "bybit-api";
import { MarketData } from "../types";
import { logger } from "../utils/logger";
import config from "../config";

export class MarketScanner {
  private client: RestClientV5;

  constructor() {
    // Инициализация REST клиента V5
    this.client = new RestClientV5({
      key: config.bybit.apiKey,
      secret: config.bybit.apiSecret,
      testnet: config.bybit.testnet,
    });
  }

  async getMarketData(symbol: string): Promise<MarketData> {
    try {
      // Вызов API для спотового рынка (category: 'spot')
      const response = await this.client.getTickers({
        category: "spot",
        symbol: symbol,
      });

      if (!response.result?.list?.[0]) {
        throw new Error(`No data for symbol: ${symbol}`);
      }

      const ticker = response.result.list[0];
      return {
        symbol,
        price: parseFloat(ticker.lastPrice),
        volume: parseFloat(ticker.volume24h),
        change24h: parseFloat(ticker.price24hPcnt) * 100,
      };
    } catch (error) {
      logger.error(`Ошибка получения данных для ${symbol}: ${error}`);
      throw error;
    }
  }

  async findBestPairs(limit = 5): Promise<string[]> {
    try {
      const response = await this.client.getTickers({ category: "spot" });

      if (!response.result?.list) {
        logger.warn("Нет данных о рынке: response.result.list отсутствует");
        return [];
      }

      // Логируем общее количество пар
      logger.debug(`Получено пар: ${response.result.list.length}`);

      const filteredPairs = response.result.list.filter((ticker) => {
        const volume = parseFloat(ticker.volume24h);
        const change = Math.abs(parseFloat(ticker.price24hPcnt) * 100);

        // Детальная проверка критериев
        const volumePassed = volume > 100;
        const changePassed = change > 0.1;

        if (!volumePassed || !changePassed) {
          logger.debug(`Пара ${ticker.symbol} отфильтрована: 
          volume=${volume} (${volumePassed ? "OK" : "FAIL"}), 
          change=${change.toFixed(2)}% (${changePassed ? "OK" : "FAIL"})`);
        }

        return volumePassed && changePassed;
      });

      // Логируем результаты фильтрации
      logger.debug(`Пар после фильтрации: ${filteredPairs.length}`);

      if (filteredPairs.length === 0) {
        logger.warn("Активирован фолбэк: использование BTC/USDT и ETH/USDT");
        return ["BTC/USDT", "ETH/USDT"];
      }

      const sortedPairs = filteredPairs.sort(
        (a, b) => parseFloat(b.volume24h) - parseFloat(a.volume24h)
      );

      const topPairs = sortedPairs.slice(0, limit);

      // Логируем итоговый выбор
      logger.info(
        `Топ-${limit} пар: ${topPairs.map((p) => p.symbol).join(", ")}`
      );

      return topPairs.map((ticker) => ticker.symbol);
    } catch (error) {
      logger.error(`Ошибка сканирования рынка: ${error}`);
      return [];
    }
  }
}
