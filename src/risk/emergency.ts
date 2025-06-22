import { RiskEngine } from "./engine";
import { PortfolioRebalancer } from "../portfolio/rebalancer";
import { logger } from "../utils/logger";
import { OrderExecutor } from "../core/executor";
import { PortfolioManager } from "../portfolio/manager";

export class EmergencyProtocol {
  private rebalancer: PortfolioRebalancer;

  constructor(
    private riskEngine: RiskEngine,
    private portfolioManager: PortfolioManager,
    private executor: OrderExecutor
  ) {
    this.rebalancer = new PortfolioRebalancer(portfolioManager, executor);
  }

  /**
   * Проверяет условия и активирует аварийный режим при необходимости
   * @param prices Текущие рыночные цены
   * @returns true, если аварийный режим был активирован, иначе false
   */
  async checkAndActivate(prices: Record<string, number>): Promise<boolean> {
    const riskStatus = await this.riskEngine.evaluateRisk(prices);

    if (riskStatus.emergency && this.riskEngine.getCurrentMode() !== "SAFETY") {
      await this.activateEmergencyMode(prices);
      return true;
    }

    return false;
  }

  /**
   * Активирует аварийный режим
   * @param prices Текущие рыночные цены
   */
  private async activateEmergencyMode(
    prices: Record<string, number>
  ): Promise<void> {
    logger.warn("АКТИВАЦИЯ АВАРИЙНОГО РЕЖИМА!");

    // 1. Переключаем режим рисков
    this.riskEngine.setMode("SAFETY");

    // 2. Переводим портфель в стейблкоины
    await this.rebalancer.moveToStablecoins(prices);

    // 3. Останавливаем все активные торговые операции
    // (логика остановки трейдера должна быть реализована в Trader)
    logger.error("Торговля приостановлена из-за аварийного режима");
  }
}
