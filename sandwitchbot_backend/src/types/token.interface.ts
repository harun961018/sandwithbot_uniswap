export interface IToken {
  active: boolean;
  address: string;
  symbol: string;
  decimals: number;
  maxAmount?: number;
  minAmount?: number;
  monitLimit?: number;
  benefitLimit?: number;
}
