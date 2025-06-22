import { PortfolioRepository } from "../data/repositories/portfolio.repo";
import { logger } from "../utils/logger";
import { PORTFOLIO_CONSTANTS } from "../config/constants";
import { MarketData } from "../types";
import { RiskCalculator } from "../risk/calculator";
import config from "../config";
import { RiskEngine } from "../risk/engine";

// Определяем интерфейс Holding локально
export interface Holding {
  symbol: string;
  amount: number;
  entryPrice: number;
  entryTime: Date;
}

export class PortfolioManager {
  private repo = new PortfolioRepository();
  private riskEngine?: RiskEngine;

  setRiskEngine(riskEngine: RiskEngine) {
    this.riskEngine = riskEngine;
  }

  async updatePosition(
    symbol: string,
    change: number,
    price: number
  ): Promise<boolean> {
    const result = await this.repo.updatePosition(symbol, change, price);
    if (result) {
      logger.info(`Позиция обновлена: ${symbol} | ${change} @ ${price}`);
    }
    return result;
  }

  async getCurrentHoldings(): Promise<Holding[]> {
    const assets = await this.repo.getPortfolio();
    return assets.map((asset) => ({
      symbol: asset.symbol,
      amount: asset.amount,
      entryPrice: asset.entryPrice,
      entryTime: asset.entryTime, // Убрали currentValue
    }));
  }

  async getPortfolioValue(prices: Record<string, number>): Promise<number> {
    return this.repo.getPortfolioValue(prices);
  }

  async isAssetOverweight(
    symbol: string,
    prices: Record<string, number>
  ): Promise<boolean> {
    const portfolioValue = await this.getPortfolioValue(prices);
    const assets = await this.getCurrentHoldings();
    const asset = assets.find((a) => a.symbol === symbol);
    if (!asset) return false;

    const assetValue = (prices[symbol] || 0) * asset.amount;
    const assetShare = assetValue / portfolioValue;
    return assetShare > PORTFOLIO_CONSTANTS.MAX_ASSET_PERCENT;
  }

  async getAssetDecisions(symbol: string, limit = 10): Promise<any[]> {
    return this.repo.getAssetDecisions(symbol, limit);
  }

  /**
   * Генерирует отчет о рисках портфеля
   */
  async generateRiskReport(
    fullMarketData: Record<string, MarketData> // Изменяем тип входных данных
  ): Promise<{
    sharpeRatio: number;
    maxDrawdown: number;
    riskPositions: string[];
  }> {
    if (!this.riskEngine) {
      throw new Error("RiskEngine is not initialized in PortfolioManager");
    }

    const holdings = await this.getCurrentHoldings();
    const prices = Object.fromEntries(
      Object.entries(fullMarketData).map(([symbol, data]) => [
        symbol,
        data.price,
      ])
    );

    const portfolioValue = await this.getPortfolioValue(prices);

    // Рассчитываем волатильность портфеля с реальными данными
    let portfolioVolatility = 0;
    holdings.forEach((holding) => {
      const assetData = fullMarketData[holding.symbol];
      if (!assetData) {
        logger.warn(
          `No market data for ${holding.symbol}, skipping risk calculation`
        );
        return;
      }

      portfolioVolatility += RiskCalculator.calculatePositionRisk(
        holding,
        assetData // Используем реальные рыночные данные
      );
    });

    if (holdings.length > 0) {
      portfolioVolatility /= holdings.length;
    }

    const sharpeRatio = RiskCalculator.calculateSharpeRatio(
      portfolioValue,
      config.risk.initialBalance,
      portfolioVolatility
    );

    // Определяем позиции с высоким риском
    const riskPositions: string[] = [];
    holdings.forEach((holding) => {
      const assetData = fullMarketData[holding.symbol];
      if (!assetData) return;

      const { isOverLimit } = this.riskEngine!.evaluatePositionRisk(
        holding,
        assetData // Реальные данные вместо заглушек
      );

      if (isOverLimit) riskPositions.push(holding.symbol);
    });

    return {
      sharpeRatio,
      maxDrawdown: portfolioValue * config.risk.maxDrawdown,
      riskPositions,
    };
  }
}
