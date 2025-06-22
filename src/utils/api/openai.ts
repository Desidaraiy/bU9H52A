import OpenAI from "openai";
import config from "../../config";
import { logger } from "../logger";

class OpenAIAPI {
  private client: OpenAI;

  constructor() {
    this.client = new OpenAI({
      apiKey: config.openai.apiKey,
    });
  }

  /**
   * Генерирует торговое решение
   */
  async generateTradeDecision(prompt: string) {
    try {
      const response = await this.client.chat.completions.create({
        model: config.openai.model,
        messages: [{ role: "user", content: prompt }],
        temperature: config.openai.temperature,
        max_tokens: config.openai.maxTokens,
      });
      return response.choices[0].message.content;
    } catch (error) {
      logger.error("Ошибка генерации решения:", error);
      throw error;
    }
  }
}

export const openaiAPI = new OpenAIAPI();
