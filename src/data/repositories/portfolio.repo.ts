import { Decision } from "../models/decision.model";
import { Asset } from "../models/asset.model";
import sequelize from "../database";
import { Op } from "sequelize";
import { logger } from "../../utils/logger";

export class PortfolioRepository {
  /**
   * Обновление позиции актива в портфеле.
   * @param symbol Символ актива (например, BTCUSDT)
   * @param change Изменение количества (может быть отрицательным)
   * @param price Цена актива на момент операции
   */
  async updatePosition(
    symbol: string,
    change: number,
    price: number
  ): Promise<boolean> {
    const transaction = await sequelize.transaction();
    try {
      let asset = await Asset.findOne({ where: { symbol }, transaction });

      if (asset) {
        const newAmount = asset.amount + change;
        if (newAmount <= 0) {
          await asset.destroy({ transaction });
        } else {
          const newEntryPrice =
            (asset.entryPrice * asset.amount + price * change) / newAmount;
          await asset.update(
            {
              amount: newAmount,
              entryPrice: newEntryPrice,
            },
            { transaction }
          );
        }
      } else if (change > 0) {
        await Asset.create(
          {
            symbol,
            amount: change,
            entryPrice: price,
          },
          { transaction }
        );
      }

      await transaction.commit();
      logger.info(`Позиция обновлена: ${symbol} | Δ${change} @ ${price}`);
      return true;
    } catch (error) {
      await transaction.rollback();
      logger.error(`Ошибка обновления позиции: ${error}`);
      return false;
    }
  }

  /**
   * Получение текущего портфеля
   */
  async getPortfolio(): Promise<Asset[]> {
    return Asset.findAll();
  }

  /**
   * Получение текущей стоимости портфеля по рыночным ценам
   */
  async getPortfolioValue(prices: Record<string, number>): Promise<number> {
    const assets = await this.getPortfolio();
    return assets.reduce((total, asset) => {
      return total + (prices[asset.symbol] || 0) * asset.amount;
    }, 0);
  }

  /**
   * Получение истории решений по активу
   */
  async getAssetDecisions(symbol: string, limit = 10): Promise<Decision[]> {
    return Decision.findAll({
      where: { assetSymbol: symbol },
      order: [["createdAt", "DESC"]],
      limit,
    });
  }
}
