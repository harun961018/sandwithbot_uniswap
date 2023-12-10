import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { BinanceService } from './binance.service';
import { FirebaseService } from '../firebase/firebase.service';

import { OrderSide } from 'binance-api-node';
import { USDT_TOKEN } from 'src/core/constants';

@ApiTags('Binance')
@Controller('binance')
export class BinanceController {
  constructor(private readonly binanceService: BinanceService, private readonly firebaseService: FirebaseService) {}

  @Get()
  getHello(): Promise<any> {
    return this.binanceService.getHello();
  }

  @Get('executeSwapExample')
  executeSwapExample(): Promise<any> {
    const token = {
      active: true,
      address: '0x6c5ba91642f10282b576d91922ae6448c9d52f4e',
      symbol: 'PHA',
      decimals: 18,
      maxAmount: 10,
      minAmount: 0,
    };

    return this.binanceService.placeMarketOrder(token, OrderSide.SELL, 70);
  }

  @Get('executeWithdrawExample')
  executeWithdrawExample(): Promise<any> {
    const token = {
      active: true,
      address: '0x6c5ba91642f10282b576d91922ae6448c9d52f4e',
      symbol: 'PHA',
      decimals: 18,
      maxAmount: 10,
      minAmount: 0,
    };

    return this.binanceService.withdraw(token.symbol, 32);
  }

  @Get('getWithdrawHistoryExample')
  getWithdrawHistoryExample(): Promise<any> {
    const orderId = 'a0e9edb5a26b4ad383cd56fe12dcc1ef';
    return this.binanceService.getWithdrawHistory('PHA', orderId);
  }

  @Get('getQuoteExample')
  getQuoteExample(): Promise<any> {
    const token = {
      active: true,
      address: '0x6c5ba91642f10282b576d91922ae6448c9d52f4e',
      symbol: 'PHA',
      decimals: 18,
      maxAmount: 10,
      minAmount: 0,
    };

    return this.binanceService.getQuote(token);
  }

  @Get('getExchangeInfo')
  getExchangeInfo(): Promise<any> {
    const token = {
      active: true,
      address: '0x6c5ba91642f10282b576d91922ae6448c9d52f4e',
      symbol: 'PHA',
      decimals: 18,
      maxAmount: 10,
      minAmount: 0,
    };
    return this.binanceService.getExchangeInfo(token);
  }

  @Get('getCoinInfo')
  getCoinInfo(): Promise<any> {
    const token = {
      active: true,
      address: '0x6c5ba91642f10282b576d91922ae6448c9d52f4e',
      symbol: 'PHA',
      decimals: 18,
      maxAmount: 10,
      minAmount: 0,
    };
    return this.binanceService.getCoinInfo(token);
  }
  @Get('getWalletStatus')
  getWalletStatus(): Promise<any> {
    return this.binanceService.getWalletStatus();
  }

  @Get('getOrderStatus')
  getOrderStatus(): Promise<any> {
    return this.binanceService.getOrderStatus('PHAUSDT', 108148394);
  }

  @Get('getGasTracker')
  getGasTracker(): Promise<any> {
    return this.binanceService.getGasTracker();
  }

  @Get('getTransactionReceipt')
  getTransactionReceipt(): Promise<any> {
    const token = {
      active: true,
      address: '0x6c5ba91642f10282b576d91922ae6448c9d52f4e',
      symbol: 'PHA',
      decimals: 18,
      maxAmount: 10,
      minAmount: 0,
    };
    return this.binanceService.getTransactionReceipt('0x3e5d7812fb0048c90a02f0741d73cf4e2d6f46cd82b7e48d35c9a986b701841d', USDT_TOKEN, token);
  }

  @Get('getTxFromHash')
  getTxFromHash(): Promise<any> {
    return this.binanceService.getTxFromHash('0x3e5d7812fb0048c90a02f0741d73cf4e2d6f46cd82b7e48d35c9a986b701841d');
  }
}
