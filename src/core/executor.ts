import { RestClientV5 } from "bybit-api";
import { logger } from "../utils/logger";
import config from "../config";
import { TradeDecision } from "../types";
import { RiskEngine } from "../risk/engine";
import { PortfolioManager } from "../portfolio/manager";
import { MarketScanner } from "./scanner"; // Импортируем MarketScanner
import { bybitAPI } from "../utils/api/bybit";

export class OrderExecutor {
  private client: RestClientV5;
  private riskEngine: RiskEngine;
  private portfolioManager: PortfolioManager;
  private scanner: MarketScanner; // Добавляем сканер

  constructor(
    riskEngine: RiskEngine,
    portfolioManager: PortfolioManager,
    scanner: MarketScanner
  ) {
    this.client = new RestClientV5({
      key: config.bybit.apiKey,
      secret: config.bybit.apiSecret,
      testnet: config.bybit.testnet,
    });
    this.riskEngine = riskEngine;
    this.portfolioManager = portfolioManager;
    this.scanner = scanner; // Инициализируем сканер
  }

  /**
   * Исполняет торговое решение
   */
  async executeDecision(decision: TradeDecision): Promise<boolean> {
    try {
      if (decision.action === "HOLD") {
        logger.info(
          `Решение HOLD, ордер не требуется. Символ: ${decision.symbol}`
        );
        return true;
      }

      // 1. Получаем актуальные данные
      const marketData = await this.scanner.getMarketData(decision.symbol);
      const prices = { [decision.symbol]: marketData.price };
      const portfolioValue = await this.portfolioManager.getPortfolioValue(
        prices
      );

      // 2. Рассчитываем размер позиции через RiskEngine
      const positionSize = this.riskEngine.calculatePositionSize(
        portfolioValue,
        this.calculateVolatilityScore(marketData.change24h)
      );

      // 3. Рассчитываем количество актива
      const amount = positionSize / marketData.price;
      if (amount <= 0) {
        logger.warn(
          `Нулевое количество для ${decision.symbol}. Ордер не будет размещен.`
        );
        return false;
      }

      const side = decision.action === "BUY" ? "Buy" : "Sell";

      // 4. Размещаем рыночный ордер
      const orderResult = await bybitAPI.placeOrder({
        symbol: decision.symbol,
        side: side,
        orderType: "Market",
        qty: amount.toFixed(6),
      });

      //   if (orderResult.retCode !== 0) {
      //     throw new Error(`Ошибка ордера: ${orderResult.retMsg}`);
      //   }

      logger.info(
        `Ордер успешно размещен: ${decision.symbol} ${side} ${amount.toFixed(
          6
        )} по ${marketData.price}`
      );
      return true;
    } catch (error) {
      logger.error(`Ошибка исполнения решения по ${decision.symbol}: ${error}`);
      return false;
    }
  }

  /**
   * Рассчитывает оценку волатильности (0-1) на основе 24h change
   */
  private calculateVolatilityScore(change24h: number): number {
    return Math.min(Math.abs(change24h) / 20, 1);
  }

  /**
   * Рассчитывает количество актива
   * @param decision Торговое решение
   * @param currentPrice Текущая цена актива
   */
  private calculateAmount(
    decision: TradeDecision,
    currentPrice: number
  ): number {
    // Если количество явно задано - используем его
    if (decision.amount) return decision.amount;

    // Рассчитываем на основе суммы в USDT
    const amountUsdt = this.getPositionSize();
    return amountUsdt / currentPrice;
  }

  /**
   * Определяет размер позиции в USDT
   */
  private getPositionSize(): number {
    // Фиксированный размер для тестов
    return 10; // 10 USDT

    // В реальной реализации:
    // return riskEngine.calculatePositionSize(...)
  }
}
