import { MarketScanner } from "./scanner";
import { NeuralStrategy } from "../neural/strategy";
import { OrderExecutor } from "./executor";
import { PortfolioManager } from "../portfolio/manager";
import { RiskEngine } from "../risk/engine";
import { Scheduler } from "./scheduler";
import { logger } from "../utils/logger";
import { NewsRepository } from "../data/repositories/news.repo";
import { DecisionNotifier } from "../utils/notifier";
import config from "../config";
import { MarketData, TradeDecision } from "../types";
import { PortfolioRebalancer } from "../portfolio/rebalancer";
import { EmergencyProtocol } from "../risk/emergency";

export class Trader {
  private scanner: MarketScanner;
  private portfolioManager: PortfolioManager;
  private riskEngine: RiskEngine;
  private neuralStrategy: NeuralStrategy;
  private executor: OrderExecutor;
  private scheduler: Scheduler;
  private newsRepository: NewsRepository;
  private notifier: DecisionNotifier;
  private rebalancer: PortfolioRebalancer;
  private emergencyProtocol: EmergencyProtocol;

  constructor(
    private readonly tradeInterval: number = config.news.updateInterval
  ) {
    // 1. Инициализация независимых модулей
    this.newsRepository = new NewsRepository();
    this.notifier = new DecisionNotifier();
    this.scanner = new MarketScanner();
    this.scheduler = new Scheduler();

    // 2. Создаем основные объекты без зависимостей
    this.portfolioManager = new PortfolioManager();
    this.riskEngine = new RiskEngine(this.portfolioManager);
    this.executor = new OrderExecutor(
      this.riskEngine,
      this.portfolioManager,
      this.scanner
    );

    // 3. Устанавливаем взаимные зависимости ПОСЛЕ создания
    this.portfolioManager.setRiskEngine(this.riskEngine);
    this.riskEngine.setOrderExecutor(this.executor);

    // 4. Инициализация зависимых модулей
    this.neuralStrategy = new NeuralStrategy(
      this.portfolioManager,
      this.newsRepository,
      this.riskEngine,
      this.scanner,
      this.notifier
    );

    this.rebalancer = new PortfolioRebalancer(
      this.portfolioManager,
      this.executor
    );

    this.emergencyProtocol = new EmergencyProtocol(
      this.riskEngine,
      this.portfolioManager,
      this.executor
    );
  }

  /**
   * Запускает торгового бота
   */
  start() {
    this.scheduler.registerIntervalTask("trade-cycle", this.tradeInterval, () =>
      this.tradeCycle()
    );
    logger.info("Торговый бот запущен");
  }

  /**
   * Останавливает торгового бота
   */
  stop() {
    this.scheduler.cancelTask("trade-cycle");
    logger.info("Торговый бот остановлен");
  }

  /**
   * Главный торговый цикл
   */
  private async tradeCycle() {
    try {
      logger.info("--- НАЧАЛО ТОРГОВОГО ЦИКЛА ---");

      // 1. Получаем лучшие пары для торговли
      const symbols = await this.scanner.findBestPairs(3);
      if (symbols.length === 0) {
        logger.warn("Не найдено подходящих пар для торговли");
        return;
      }
      logger.info(`Отобраны пары: ${symbols.join(", ")}`);

      // 2. Получаем полные рыночные данные
      const marketData = await this.getMarketData(symbols);

      // 3. Извлекаем цены для emergencyProtocol
      const prices = Object.fromEntries(
        Object.entries(marketData).map(([symbol, data]) => [symbol, data.price])
      );

      // 4. Проверяем аварийный протокол
      const emergencyActivated = await this.emergencyProtocol.checkAndActivate(
        prices
      );
      if (emergencyActivated) {
        logger.error("Торговый цикл прерван из-за аварийного режима");
        return;
      }

      // 5. Оцениваем риск портфеля
      const riskAssessment = await this.riskEngine.evaluateRisk(prices);
      logger.info(
        `Оценка риска: режим ${riskAssessment.mode}, просадка ${riskAssessment.drawdownPercent}%`
      );

      // 6. Генерируем отчет о рисках
      const riskReport = await this.portfolioManager.generateRiskReport(
        marketData
      );
      if (riskReport.riskPositions.length > 0) {
        logger.warn(
          `Обнаружены высокорисковые позиции: ${riskReport.riskPositions.join(
            ", "
          )}`
        );
      }

      // 7. Для каждой пары принимаем решение и исполняем
      for (const symbol of symbols) {
        try {
          const decision = await this.neuralStrategy.makeDecision(symbol);

          const tradeDecision: TradeDecision = {
            ...decision,
            symbol,
            price: marketData[symbol].price,
            amount: decision.amount,
          };

          await this.executor.executeDecision(tradeDecision);

          // Обновляем портфель
          if (tradeDecision.action === "BUY") {
            await this.portfolioManager.updatePosition(
              symbol,
              tradeDecision.amount! / tradeDecision.price,
              tradeDecision.price
            );
          } else if (tradeDecision.action === "SELL") {
            await this.portfolioManager.updatePosition(
              symbol,
              -(tradeDecision.amount! / tradeDecision.price),
              tradeDecision.price
            );
          }
        } catch (error) {
          logger.error(`Ошибка обработки пары ${symbol}: ${error}`);
        }
      }

      // 8. Ребалансировка портфеля (передаем marketData)
      if (this.isTimeForRebalance()) {
        logger.info("Запуск недельной ребалансировки портфеля");
        await this.rebalancePortfolio(marketData); // Исправлено: передаем marketData
      }

      logger.info("--- ТОРГОВЫЙ ЦИКЛ ЗАВЕРШЕН ---");
    } catch (error) {
      logger.error(`Критическая ошибка в торговом цикле: ${error}`);
    }
  }

  /**
   * Получает текущие цены для списка символов
   */
  private async getMarketData(
    symbols: string[]
  ): Promise<Record<string, MarketData>> {
    const marketData: Record<string, MarketData> = {};
    for (const symbol of symbols) {
      try {
        // Используем реальную структуру MarketData
        marketData[symbol] = await this.scanner.getMarketData(symbol);
      } catch (error) {
        logger.error(`Ошибка получения данных для ${symbol}: ${error}`);
        // Создаем корректный объект MarketData при ошибке
        marketData[symbol] = {
          symbol,
          price: 0,
          volume: 0,
          change24h: 0,
          liquidity: 0,
        };
      }
    }
    return marketData;
  }

  /**
   * Ребалансировка портфеля
   */
  private async rebalancePortfolio(marketData: Record<string, MarketData>) {
    try {
      // Преобразуем MarketData в Record<string, number> (цены)
      const prices = Object.fromEntries(
        Object.entries(marketData).map(([symbol, data]) => [symbol, data.price])
      );

      await this.rebalancer.rebalance(prices);
    } catch (error) {
      logger.error(`Ошибка ребалансировки: ${error}`);
    }
  }

  /**
   * Проверяет необходимость ребалансировки (раз в неделю)
   */
  private isTimeForRebalance(): boolean {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0-6 (воскресенье-суббота)
    const hour = now.getHours();

    // Выполняем ребалансировку каждый понедельник в 8:00
    return dayOfWeek === 1 && hour === 8;
  }
}
