import { AccountTypeV5, RestClientV5 } from "bybit-api";
import config from "../../config";
import { logger } from "../logger";

class BybitAPI {
  private client: RestClientV5;

  constructor() {
    this.client = new RestClientV5({
      key: config.bybit.apiKey,
      secret: config.bybit.apiSecret,
      testnet: config.bybit.testnet,
    });
  }

  /**
   * Получает баланс кошелька
   */
  async getWalletBalance(accountType: AccountTypeV5 = "UNIFIED") {
    try {
      const response = await this.client.getWalletBalance({ accountType });
      return response.result;
    } catch (error) {
      logger.error("Ошибка получения баланса Bybit:", error);
      throw error;
    }
  }

  /**
   * Размещает ордер
   */
  async placeOrder(params: {
    symbol: string;
    side: "Buy" | "Sell";
    orderType: "Market" | "Limit";
    qty: string;
    price?: string;
    timeInForce?: "GTC" | "IOC" | "FOK" | "PostOnly";
  }) {
    try {
      const response = await this.client.submitOrder({
        category: "spot",
        ...params,
      });
      return response.result;
    } catch (error) {
      logger.error("Ошибка размещения ордера:", error);
      throw error;
    }
  }

  /**
   * Получает последние цены для символов
   */
  async getTickers(symbols: string[]) {
    try {
      const response = await this.client.getTickers({
        category: "spot",
        symbol: symbols.join(","),
      });
      return response.result.list;
    } catch (error) {
      logger.error("Ошибка получения тикеров:", error);
      throw error;
    }
  }
}

export const bybitAPI = new BybitAPI();
