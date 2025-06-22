import { PortfolioManager } from "../portfolio/manager";
import { NewsRepository } from "../data/repositories/news.repo";
import { RiskEngine } from "../risk/engine";
import { logger } from "../utils/logger";
import { NEURAL_CONSTANTS } from "../config/constants";
import { TradeDecision, TradeDecisionAction, MarketData } from "../types";
import axios from "axios";
import config from "../config";
import { DataAnalyzer } from "./analyzer";
import { DecisionMaker } from "./decision-maker"; // Добавляем DecisionMaker
import { openaiAPI } from "../utils/api/openai";

export class NeuralStrategy {
  private dataAnalyzer = new DataAnalyzer();
  private decisionMaker: DecisionMaker; // Экземпляр DecisionMaker

  constructor(
    private portfolioManager: PortfolioManager,
    private newsRepository: NewsRepository,
    private riskEngine: RiskEngine,
    private marketScanner: any,
    private notifier: any
  ) {
    // Инициализируем DecisionMaker
    this.decisionMaker = new DecisionMaker(riskEngine);
  }

  async makeDecision(symbol: string): Promise<TradeDecision> {
    try {
      // 1. Получение рыночных данных
      const marketData: MarketData = await this.marketScanner.getMarketData(
        symbol
      );

      // 2. Получение новостей
      const latestNews = await this.newsRepository.getLatestNewsBySymbol(
        symbol,
        5
      );

      // 3. Анализ данных
      const analysis = this.dataAnalyzer.analyzeMarketContext(
        marketData,
        latestNews
      );

      // 4. Формирование промта
      const prompt = this.buildPrompt(symbol, analysis);

      // 5. Запрос к нейросети
      const neuralResponse = await this.queryNeuralNetwork(prompt);

      if (!neuralResponse) {
        throw new Error("Не удалось получить ответ от нейросети");
      }

      // 6. Парсинг ответа
      const neuralDecision = this.parseResponse(neuralResponse);

      // 7. Создаем базовый объект решения
      const baseDecision: TradeDecision = {
        symbol,
        action: neuralDecision.action,
        confidence: neuralDecision.confidence,
        potentialProfit: neuralDecision.potentialProfit,
        price: marketData.price, // Добавляем текущую цену
        reason: neuralDecision.reason,
      };

      // 8. Принимаем окончательное решение с учетом рисков
      const portfolioValue = await this.portfolioManager.getPortfolioValue({
        [symbol]: marketData.price,
      });
      const finalDecision = this.decisionMaker.makeFinalDecision(
        baseDecision,
        portfolioValue,
        analysis.volatilityScore
      );

      // 9. Проверка на особую возможность
      if (this.decisionMaker.isSpecialOpportunity(finalDecision)) {
        const message =
          this.decisionMaker.formatOpportunityMessage(finalDecision);
        this.notifier.sendAlert(message);
      }

      // 10. Возвращаем финальное решение
      return finalDecision;
    } catch (error) {
      logger.error(`Ошибка принятия решения по ${symbol}: ${error}`);
      // Возвращаем решение HOLD с минимальными данными
      return {
        symbol,
        action: "HOLD",
        confidence: 0,
        potentialProfit: 0,
        price: 0,
        reason: `Ошибка: ${error}`,
      };
    }
  }

  private buildPrompt(
    symbol: string,
    analysis: {
      volatilityScore: number;
      volumeScore: number;
      newsSentiment: number;
      relevanceKeywords: string[];
    }
  ): string {
    return `
      ${NEURAL_CONSTANTS.BASE_PROMPT}
      
      Анализ рынка для ${symbol}:
      - Волатильность: ${(analysis.volatilityScore * 100).toFixed(1)}%
      - Объем: ${(analysis.volumeScore * 100).toFixed(1)}%
      - Тональность новостей: ${(analysis.newsSentiment * 100).toFixed(1)}%
      - Ключевые слова: ${analysis.relevanceKeywords.join(", ")}
      
      Рекомендуй действие: BUY, SELL или HOLD.
      Укажи уверенность (0-100%) и потенциальную прибыль (0-100%).
      Обоснуй решение кратко.
    `;
  }

  private async queryNeuralNetwork(prompt: string): Promise<string | null> {
    return openaiAPI.generateTradeDecision(prompt);
  }

  private parseResponse(response: string): {
    action: TradeDecisionAction;
    confidence: number;
    potentialProfit: number;
    reason?: string;
  } {
    const normalized = response.trim().toUpperCase();

    // Определяем действие
    let action: TradeDecisionAction = "HOLD";
    if (
      NEURAL_CONSTANTS.DECISION_MAP.BUY.some((word) =>
        normalized.includes(word)
      )
    ) {
      action = "BUY";
    } else if (
      NEURAL_CONSTANTS.DECISION_MAP.SELL.some((word) =>
        normalized.includes(word)
      )
    ) {
      action = "SELL";
    }

    // Извлекаем уверенность
    let confidence = 0.7;
    const confidenceMatch = normalized.match(/УВЕРЕННОСТЬ:\s*(\d+)%/i);
    if (confidenceMatch) confidence = parseInt(confidenceMatch[1], 10) / 100;

    // Извлекаем потенциальную прибыль
    let potentialProfit = 0.1;
    const profitMatch = normalized.match(/ПРИБЫЛЬ:\s*(\d+)%/i);
    if (profitMatch) potentialProfit = parseInt(profitMatch[1], 10) / 100;

    // Извлекаем причину
    let reason: string | undefined;
    const reasonMatch = normalized.match(/ПРИЧИНА:\s*(.+)/i);
    if (reasonMatch) reason = reasonMatch[1];

    return {
      action,
      confidence,
      potentialProfit,
      reason,
    };
  }
}
