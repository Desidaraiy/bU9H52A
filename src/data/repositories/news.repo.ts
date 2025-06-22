import { NewsItem } from "../models/news.model";
import { Op } from "sequelize";
import { logger } from "../../utils/logger";

export class NewsRepository {
  /**
   * Сохранить новость в базу данных
   */
  async saveNewsItem(news: {
    source: string;
    title: string;
    url: string;
    summary?: string | null;
    publishedAt: Date;
    sentimentScore?: number | null;
    symbol?: string | null;
    metadata?: Record<string, unknown> | null;
  }): Promise<NewsItem> {
    try {
      return await NewsItem.create(news);
    } catch (error) {
      logger.error("Ошибка сохранения новости:", error);
      throw error;
    }
  }

  /**
   * Получить последние новости по символу (активу)
   */
  async getLatestNewsBySymbol(symbol: string, limit = 5): Promise<NewsItem[]> {
    return NewsItem.findAll({
      where: {
        [Op.or]: [
          { symbol },
          { symbol: null }, // Новости без привязки к активу
        ],
      },
      order: [["publishedAt", "DESC"]],
      limit,
    });
  }

  /**
   * Получить последние новости по источнику
   */
  async getLatestNewsBySource(source: string, limit = 5): Promise<NewsItem[]> {
    return NewsItem.findAll({
      where: { source },
      order: [["publishedAt", "DESC"]],
      limit,
    });
  }

  /**
   * Получить новости с положительной тональностью
   */
  async getPositiveNews(limit = 5): Promise<NewsItem[]> {
    return NewsItem.findAll({
      where: {
        sentimentScore: {
          [Op.gt]: 0.5,
        },
      },
      order: [["publishedAt", "DESC"]],
      limit,
    });
  }

  /**
   * Получить новости с отрицательной тональностью
   */
  async getNegativeNews(limit = 5): Promise<NewsItem[]> {
    return NewsItem.findAll({
      where: {
        sentimentScore: {
          [Op.lt]: -0.5,
        },
      },
      order: [["publishedAt", "DESC"]],
      limit,
    });
  }
}
