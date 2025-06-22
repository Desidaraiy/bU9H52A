import { PortfolioManager } from "./manager";
import { OrderExecutor } from "../core/executor";
import { logger } from "../utils/logger";
import { PORTFOLIO_CONSTANTS } from "../config/constants";
import { TradeDecision } from "../types";

export class PortfolioRebalancer {
  constructor(
    private portfolioManager: PortfolioManager,
    private orderExecutor: OrderExecutor
  ) {}

  /**
   * Выполняет ребалансировку портфеля
   * @param prices Текущие рыночные цены активов
   */
  async rebalance(prices: Record<string, number>): Promise<void> {
    try {
      const holdings = await this.portfolioManager.getCurrentHoldings();
      const portfolioValue = await this.portfolioManager.getPortfolioValue(
        prices
      );

      for (const holding of holdings) {
        const symbol = holding.symbol;
        const currentPrice = prices[symbol] || 0;
        const assetValue = currentPrice * holding.amount;
        const assetShare = assetValue / portfolioValue;

        if (assetShare > PORTFOLIO_CONSTANTS.MAX_ASSET_PERCENT) {
          const excessShare =
            assetShare - PORTFOLIO_CONSTANTS.MAX_ASSET_PERCENT;
          const amountToSell = holding.amount * (excessShare / assetShare);

          logger.info(
            `Ребалансировка: продажа ${amountToSell.toFixed(
              6
            )} ${symbol} для снижения доли с ${(assetShare * 100).toFixed(
              1
            )}% до ${(PORTFOLIO_CONSTANTS.MAX_ASSET_PERCENT * 100).toFixed(1)}%`
          );

          // Формируем решение на продажу
          const decision: TradeDecision = {
            symbol,
            action: "SELL",
            confidence: 1, // Максимальная уверенность
            potentialProfit: 0,
            price: currentPrice,
            amount: amountToSell * currentPrice, // Сумма в USDT
            reason: "Автоматическая ребалансировка портфеля",
          };

          await this.orderExecutor.executeDecision(decision);
        }
      }

      logger.info("Ребалансировка портфеля завершена");
    } catch (error) {
      logger.error(`Ошибка при ребалансировке портфеля: ${error}`);
      throw error; // Пробрасываем для обработки на верхнем уровне
    }
  }

  /**
   * Выполняет переход в стейблкоины (аварийная ребалансировка)
   */
  async moveToStablecoins(
    prices: Record<string, number>,
    stablecoin = "USDT"
  ): Promise<void> {
    try {
      const holdings = await this.portfolioManager.getCurrentHoldings();

      for (const holding of holdings) {
        if (holding.symbol.includes(stablecoin)) continue;

        const decision: TradeDecision = {
          symbol: holding.symbol,
          action: "SELL",
          confidence: 1,
          potentialProfit: 0,
          price: prices[holding.symbol] || 0,
          amount: holding.amount * (prices[holding.symbol] || 0),
          reason: "Аварийный переход в стейблкоины",
        };

        await this.orderExecutor.executeDecision(decision);
      }

      logger.warn("Портфель полностью переведен в стейблкоины");
    } catch (error) {
      logger.error(`Ошибка перевода в стейблкоины: ${error}`);
    }
  }
}
