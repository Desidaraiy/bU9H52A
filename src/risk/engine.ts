import { Holding, PortfolioManager } from "../portfolio/manager";
import { logger } from "../utils/logger";
import config from "../config";
import { PortfolioRebalancer } from "../portfolio/rebalancer";
import { OrderExecutor } from "../core/executor";
import { MarketData } from "../types";
import { RiskCalculator } from "./calculator";

export class RiskEngine {
  private maxDrawdown: number = config.risk.maxDrawdown;
  private initialBalance: number = config.risk.initialBalance;
  private positionSizePercent: number = config.risk.positionSizePercent;
  private emergencyThreshold: number = config.risk.emergencyThreshold;
  private currentMode: "NORMAL" | "AGGRESSIVE" | "SAFETY" = "NORMAL";
  private orderExecutor?: OrderExecutor; // Добавляем свойство

  constructor(private portfolioManager: PortfolioManager) {}

  /**
   * Устанавливает OrderExecutor (вызывается после инициализации)
   */
  setOrderExecutor(executor: OrderExecutor) {
    this.orderExecutor = executor;
  }

  /**
   * Оценка риска портфеля
   * @param currentPrices Текущие рыночные цены активов
   * @returns Объект с информацией о риске и текущим режимом
   */
  async evaluateRisk(currentPrices: Record<string, number>): Promise<{
    emergency: boolean;
    mode: "NORMAL" | "AGGRESSIVE" | "SAFETY";
    drawdownPercent: number;
  }> {
    try {
      const portfolioValue = await this.portfolioManager.getPortfolioValue(
        currentPrices
      );
      const drawdown =
        (this.initialBalance - portfolioValue) / this.initialBalance;
      const drawdownPercent = parseFloat((drawdown * 100).toFixed(2));

      // Активация аварийного режима при превышении порога
      if (
        drawdown >= this.emergencyThreshold &&
        this.currentMode !== "SAFETY"
      ) {
        logger.warn(
          `Активация аварийного режима! Просадка: ${drawdownPercent}%`
        );
        this.currentMode = "SAFETY";
        return { emergency: true, mode: "SAFETY", drawdownPercent };
      }

      // Возврат к нормальному режиму при улучшении ситуации
      if (drawdown < this.emergencyThreshold && this.currentMode === "SAFETY") {
        logger.info("Возврат к нормальному режиму");
        this.currentMode = "NORMAL";
      }

      return { emergency: false, mode: this.currentMode, drawdownPercent };
    } catch (error) {
      logger.error(`Ошибка оценки риска: ${error}`);
      return { emergency: false, mode: this.currentMode, drawdownPercent: 0 };
    }
  }

  /**
   * Расчет размера позиции с учетом риска
   * @param currentValue Текущая стоимость портфеля
   * @param volatility Волатильность актива (0-1)
   * @returns Размер позиции в USDT
   */
  calculatePositionSize(currentValue: number, volatility: number): number {
    let riskFactor: number;

    switch (this.currentMode) {
      case "AGGRESSIVE":
        riskFactor = this.positionSizePercent * 1.5; // +50% риска
        break;
      case "SAFETY":
        riskFactor = this.positionSizePercent * 0.5; // -50% риска
        break;
      default: // NORMAL
        riskFactor = this.positionSizePercent;
    }

    return currentValue * riskFactor * (1 - volatility);
  }

  /**
   * Переключение режима работы
   * @param mode Новый режим работы
   */
  setMode(mode: "NORMAL" | "AGGRESSIVE" | "SAFETY"): void {
    if (this.currentMode !== mode) {
      logger.info(`Смена режима работы: ${this.currentMode} → ${mode}`);
      this.currentMode = mode;
    }
  }

  /**
   * Получение текущего режима работы
   */
  getCurrentMode(): "NORMAL" | "AGGRESSIVE" | "SAFETY" {
    return this.currentMode;
  }

  /**
   * Проверка возможности перехода в агрессивный режим
   * @param confidence Уверенность нейросети (0-1)
   * @param potentialProfit Потенциальная прибыль (0-1)
   */
  canSwitchToAggressive(confidence: number, potentialProfit: number): boolean {
    return confidence > 0.8 && potentialProfit > 0.15;
  }

  async activateSafetyMode(prices: Record<string, number>) {
    if (!this.orderExecutor) {
      throw new Error("OrderExecutor not initialized in RiskEngine");
    }

    logger.warn("Активация аварийного режима!");
    this.currentMode = "SAFETY";

    const rebalancer = new PortfolioRebalancer(
      this.portfolioManager,
      this.orderExecutor
    );

    await rebalancer.moveToStablecoins(prices);
  }

  evaluatePositionRisk(
    holding: Holding,
    marketData: MarketData
  ): { riskScore: number; isOverLimit: boolean } {
    const riskScore = RiskCalculator.calculatePositionRisk(holding, marketData);
    return {
      riskScore,
      isOverLimit: RiskCalculator.isPositionOverRiskLimit(
        riskScore,
        this.currentMode
      ),
    };
  }
}
