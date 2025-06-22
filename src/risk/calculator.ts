import { Holding, MarketData } from "../types";
import { logger } from "../utils/logger";
import { PORTFOLIO_CONSTANTS } from "../config/constants";

/**
 * Калькулятор рисков для позиций и портфеля
 */
export class RiskCalculator {
  /**
   * Рассчитывает риск позиции на основе волатильности
   * @param holding Держаемая позиция
   * @param marketData Рыночные данные по активу
   * @returns Оценка риска (0-1), где 1 - максимальный риск
   */
  static calculatePositionRisk(
    holding: Holding,
    marketData: MarketData
  ): number {
    // Учитываем:
    // 1. Волатильность актива
    // 2. Долю в портфеле
    // 3. Время удержания
    const volatilityRisk = Math.min(marketData.change24h / 50, 1); // 50% изменения = max риск
    const portfolioShareRisk = Math.min(
      (holding.amount * marketData.price) /
        PORTFOLIO_CONSTANTS.MAX_ASSET_PERCENT,
      1
    );
    const timeRisk = this.calculateTimeRisk(holding.entryTime);

    // Среднее взвешенное
    return volatilityRisk * 0.5 + portfolioShareRisk * 0.3 + timeRisk * 0.2;
  }

  /**
   * Рассчитывает риск времени удержания позиции
   * @param entryTime Время входа в позицию
   * @returns Оценка риска (0-1)
   */
  private static calculateTimeRisk(entryTime: Date): number {
    const hoursHeld = (Date.now() - entryTime.getTime()) / (1000 * 60 * 60);
    // Риск возрастает после 48 часов удержания
    return Math.min(hoursHeld / 96, 1); // 96 часов (4 дня) = max риск
  }

  /**
   * Рассчитывает коэффициент Шарпа для портфеля
   * @param portfolioValue Текущая стоимость портфеля
   * @param initialBalance Начальный баланс
   * @param volatility Волатильность портфеля
   * @param riskFreeRate Безрисковая ставка (по умолчанию 0)
   */
  static calculateSharpeRatio(
    portfolioValue: number,
    initialBalance: number,
    volatility: number,
    riskFreeRate = 0
  ): number {
    if (volatility === 0) return 0;
    const returns = (portfolioValue - initialBalance) / initialBalance;
    return (returns - riskFreeRate) / volatility;
  }

  /**
   * Рассчитывает потенциальную просадку позиции
   * @param holding Держаемая позиция
   * @param marketData Рыночные данные
   * @param worstCaseScenario Наихудший сценарий изменения цены (%)
   */
  static calculatePositionDrawdown(
    holding: Holding,
    marketData: MarketData,
    worstCaseScenario = 0.2 // 20% максимального падения
  ): number {
    const currentValue = holding.amount * marketData.price;
    const potentialLoss = currentValue * worstCaseScenario;
    return potentialLoss;
  }

  /**
   * Определяет, превышает ли позиция лимиты риска
   * @param riskScore Оценка риска позиции
   * @param currentMode Текущий режим работы
   */
  static isPositionOverRiskLimit(
    riskScore: number,
    currentMode: string
  ): boolean {
    const riskLimits: any = {
      SAFETY: 0.3,
      NORMAL: 0.6,
      AGGRESSIVE: 0.8,
    };

    return riskScore > (riskLimits[currentMode] || riskLimits.NORMAL);
  }
}
