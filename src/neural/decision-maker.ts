import { TradeDecision, TradeDecisionAction } from "../types";
import { RiskEngine } from "../risk/engine";
import { logger } from "../utils/logger";
import { NEURAL_CONSTANTS } from "../config/constants";

export class DecisionMaker {
  constructor(private riskEngine: RiskEngine) {}

  /**
   * Принимает окончательное решение с учетом рисков
   */
  makeFinalDecision(
    neuralDecision: TradeDecision,
    currentPortfolioValue: number,
    volatilityScore: number
  ): TradeDecision {
    // Корректировка уверенности на основе волатильности
    const adjustedConfidence =
      neuralDecision.confidence * (1 - volatilityScore);

    // В аварийном режиме блокируем покупки
    if (
      this.riskEngine.getCurrentMode() === "SAFETY" &&
      neuralDecision.action === "BUY"
    ) {
      logger.warn("Блокировка BUY в аварийном режиме");
      return {
        ...neuralDecision,
        action: "HOLD",
        confidence: adjustedConfidence,
      };
    }

    // При низкой уверенности - холдим
    if (adjustedConfidence < NEURAL_CONSTANTS.MIN_CONFIDENCE) {
      return {
        ...neuralDecision,
        action: "HOLD",
        confidence: adjustedConfidence,
      };
    }

    // Расчет размера позиции
    const positionSize = this.riskEngine.calculatePositionSize(
      currentPortfolioValue,
      volatilityScore
    );

    return {
      ...neuralDecision,
      amount: positionSize,
      confidence: adjustedConfidence,
    };
  }

  /**
   * Проверяет, является ли решение "особой возможностью"
   */
  isSpecialOpportunity(decision: TradeDecision): boolean {
    return (
      decision.confidence > 0.8 &&
      decision.potentialProfit > 0.15 &&
      this.riskEngine.canSwitchToAggressive(
        decision.confidence,
        decision.potentialProfit
      )
    );
  }

  /**
   * Форматирует сообщение о торговой возможности
   */
  formatOpportunityMessage(decision: TradeDecision): string {
    const actionMap: Record<TradeDecisionAction, string> = {
      BUY: "Покупка",
      SELL: "Продажа",
      HOLD: "Удержание",
    };

    return `
      🚀 Обнаружена торговая возможность!
      Символ: ${decision.symbol}
      Действие: ${actionMap[decision.action]}
      Потенциальная прибыль: ${(decision.potentialProfit * 100).toFixed(1)}%
      Вероятность успеха: ${(decision.confidence * 100).toFixed(1)}%
      ${decision.reason ? `Причина: ${decision.reason}` : ""}
    `;
  }
}
