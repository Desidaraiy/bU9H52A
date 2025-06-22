import { MarketData } from "../types";
import { NewsItem } from "../data/models/news.model";
import { logger } from "../utils/logger";
import { NEURAL_CONSTANTS } from "../config/constants";

export class DataAnalyzer {
  /**
   * Анализирует текущий рыночный контекст
   */
  analyzeMarketContext(
    marketData: MarketData,
    newsItems: NewsItem[]
  ): {
    volatilityScore: number;
    volumeScore: number;
    newsSentiment: number;
    relevanceKeywords: string[];
  } {
    return {
      volatilityScore: this.calculateVolatilityScore(marketData.change24h),
      volumeScore: this.calculateVolumeScore(marketData.volume),
      newsSentiment: this.analyzeNewsSentiment(newsItems),
      relevanceKeywords: this.extractKeywords(newsItems),
    };
  }

  /**
   * Рассчитывает оценку волатильности (0-1)
   */
  private calculateVolatilityScore(change24h: number): number {
    // Нормализация: 0% = 0, 20% = 1
    return Math.min(Math.abs(change24h) / 20, 1);
  }

  /**
   * Рассчитывает оценку объема (0-1)
   */
  private calculateVolumeScore(volume: number): number {
    // Логарифмическая шкала: log10(volume + 1)
    return Math.min(Math.log10(volume + 1) / 8, 1);
  }

  /**
   * Анализирует тональность новостей
   */
  private analyzeNewsSentiment(newsItems: NewsItem[]): number {
    const validItems = newsItems.filter((item) => item.sentimentScore !== null);
    if (validItems.length === 0) return 0;

    return (
      validItems.reduce(
        (sum: number, item) => sum + (item.sentimentScore || 0),
        0
      ) / validItems.length
    );
  }

  /**
   * Извлекает ключевые слова из новостей
   */
  private extractKeywords(newsItems: NewsItem[]): string[] {
    const allText = newsItems
      .map((item) => `${item.title} ${item.summary || ""}`)
      .join(" ")
      .toLowerCase();

    const words = allText.split(/\W+/).filter((word) => word.length > 3);
    const frequency: Record<string, number> = {};

    words.forEach((word) => {
      frequency[word] = (frequency[word] || 0) + 1;
    });

    return Object.entries(frequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, NEURAL_CONSTANTS.MAX_HISTORY)
      .map(([word]) => word);
  }
}
