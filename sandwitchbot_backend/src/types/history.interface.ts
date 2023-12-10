import { IToken } from './token.interface';
import { OrderSide } from 'src/utils/binance';

export enum Platform {
  Binance = 'Binance',
  UniswapV3 = 'UniswapV3',
}
export enum BinanceAction {
  Withdraw = 'Withdraw',
  Deposit = 'Deposit',
}

export enum TradeStatus {
  Pending = 'Pending',
  Failed = 'Failed',
  Success = 'Success',
  Init = 'Init',
}

export interface IHistory {
  token0: IToken;
  token1: IToken;
  start: {
    platform: Platform;
    action: OrderSide;
    amount: number;
    estimateFee: number;
    realFee: number;
    estimateQuote: number;
    realQuote: number;
    status: TradeStatus;
    orderId: string;
    comment: string;
    executed: string;
  };
  linkAction: {
    action: BinanceAction;
    estimateFee: number;
    realFee: number;
    estimateQuote: number;
    realQuote: number;
    status: TradeStatus;
    orderId: string;
    comment: string;
    executed: string;
  };
  end: {
    platform: Platform;
    action: OrderSide;
    amount: number;
    estimateFee: number;
    realFee: number;
    estimateQuote: number;
    realQuote: number;
    status: TradeStatus;
    executed: string;
    orderId: string;
    comment: string;
  };
  totalStatus: TradeStatus;
  createdAt: string;
}
