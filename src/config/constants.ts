// Константы для торговых операций
export const TRADING_CONSTANTS = {
  DEFAULT_SYMBOL: "BTCUSDT",
  MIN_TRADE_AMOUNT: 5, // Минимальная сумма в USDT для торговли
  ORDER_TYPES: ["MARKET", "LIMIT"] as const,
  EXECUTION_TIMEOUT: 5000, // Таймаут исполнения ордера (мс)
  PRICE_PRECISION: 2, // Точность цены
  AMOUNT_PRECISION: 6, // Точность количества
};

// Константы для нейросетевой стратегии
export const NEURAL_CONSTANTS = {
  BASE_PROMPT: `Ты профессиональный криптотрейдер. Основная цель - сохранить депозит и планомерно приумножить капитал.
Правила:
1. Рисковать не более 2% капитала в сделке
2. Не выделять >20% на один актив
3. Фиксировать прибыль: 25% при +5%, 50% при +10%
4. Избегать низколиквидных активов (<$1M объема)
5. При просадке >8% активировать консервативный режим`,
  DECISION_MAP: {
    BUY: ["купить", "покупать", "long"],
    SELL: ["продать", "продавать", "short"],
    HOLD: ["держать", "ожидать", "hold"],
  },
  MAX_HISTORY: 10, // Количество последних решений для анализа
  MIN_CONFIDENCE: 0.7,
};

// Константы для парсинга новостей
export const NEWS_CONSTANTS = {
  DEFAULT_SOURCES: [
    {
      name: "CryptoPanic",
      url: "https://cryptopanic.com",
      parser: "dynamic",
    },
    {
      name: "CoinTelegraph",
      url: "https://cointelegraph.com",
      parser: "static",
    },
  ] as const,
  MIN_RELEVANCE_SCORE: 0.5,
  MAX_ARTICLES: 20, // Максимальное количество статей для анализа
};

// Константы для портфеля
export const PORTFOLIO_CONSTANTS = {
  REBALANCE_INTERVAL: 604800000, // 7 дней
  MAX_ASSETS: 10, // Максимальное количество активов в портфеле
  STABLE_COIN: "USDT", // Основной стейблкоин
  MAX_ASSET_PERCENT: 0.2, // Максимальная доля актива в портфеле
};

// Константы для логгирования
export const LOG_LEVELS = {
  ERROR: "error",
  WARN: "warn",
  INFO: "info",
  DEBUG: "debug",
} as const;

// Константы для API
export const API_CONSTANTS = {
  BYBIT_RATE_LIMIT: 100, // Максимум 100 запросов в минуту
  REQUEST_TIMEOUT: 10000, // 10 секунд
  RETRY_ATTEMPTS: 3, // Количество попыток повтора запроса
};
