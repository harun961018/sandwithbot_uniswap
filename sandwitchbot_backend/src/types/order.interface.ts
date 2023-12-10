export interface IOrder {
  symbol: string;
  type: 'Market';
  side: 'buy' | 'sell';
  amount: number;
  price?: number;
}
