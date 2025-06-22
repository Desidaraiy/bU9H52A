// Тип для источников новостей
export type NewsSource = {
  name: string;
  url: string;
  parser: "static" | "dynamic";
};

// Тип для торгового решения
export type TradeDecision = {
  symbol: string;
  action: TradeDecisionAction;
  confidence: number;
  potentialProfit: number;
  price: number; // Обязательное поле
  amount?: number; // Опциональное поле
  reason?: string;
};
// Тип для рыночных данных
export type MarketData = {
  symbol: string;
  price: number;
  volume: number;
  change24h: number;
  liquidity?: number;
};
export interface Holding {
  symbol: string;
  amount: number;
  entryPrice: number;
  entryTime: Date;
}

export type TradeDecisionAction = "BUY" | "SELL" | "HOLD";
