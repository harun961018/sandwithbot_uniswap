import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { UniswapV3Service } from './uniswapV3.service';
import { FirebaseService } from '../firebase/firebase.service';

import { USDT_TOKEN } from 'src/core/constants';
import { TradeType } from '@uniswap/sdk-core';

@ApiTags('UniswapV3')
@Controller('uniswapV3')
export class UniswapV3Controller {
  constructor(private readonly uniswapV3Service: UniswapV3Service, private readonly firebaseService: FirebaseService) {}

  @Get('getEstimateTranferFee')
  async getEstimateTranferFee(): Promise<any> {
    const tokenA = {
      active: true,
      address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
      symbol: 'WETH',
      decimals: 18,
      maxAmount: 10,
      minAmount: 0,
    };
    return await this.uniswapV3Service.getEstimateTranferFee(tokenA, 1, '0x05B52407d39dC7D03cA76DdbE92FCAa849bfD3b7');
  }

  @Get('transfer')
  async transfer(): Promise<any> {
    const tokenA = {
      active: true,
      address: '0x6c5bA91642F10282b576d91922Ae6448C9d52f4E',
      symbol: 'PHA',
      decimals: 18,
      maxAmount: 10,
      minAmount: 0,
    };
    return await this.uniswapV3Service.tranfer(tokenA, 1, '0x64CE01E0Db961CF57422119225Ae4c029026E403');
  }

  @Get('executeSwapExample')
  async executeSwapExample(): Promise<any> {
    // token swap  sell 5 PHA and buy USDT example
    const tokenA = {
      active: true,
      address: '0x6c5bA91642F10282b576d91922Ae6448C9d52f4E',
      symbol: 'PHA',
      decimals: 18,
      maxAmount: 10,
      minAmount: 0,
    };
    const route = await this.uniswapV3Service.getRoute(tokenA, USDT_TOKEN, 70, TradeType.EXACT_INPUT);
    const est = {
      quote: route.quote.toExact(),
      fee: route.estimatedGasUsedUSD.toExact(),
    };
    const time1 = performance.now();
    const res = await this.uniswapV3Service.executeRoute(route);
    const time2 = performance.now();
    return { est, res, time: time2 - time1 };
  }

  @Get('getTotalSupplyExample')
  async getTotalSupplyExample(): Promise<any> {
    return await this.uniswapV3Service.getTotalSupply('0x6c5bA91642F10282b576d91922Ae6448C9d52f4E');
  }
}
