import { Injectable } from '@nestjs/common';
import { ethers } from 'ethers';
import { Trade } from '@uniswap/v3-sdk';
import { CurrencyAmount, Percent, Token, TradeType, SupportedChainId } from '@uniswap/sdk-core';
import { AlphaRouter, ChainId, SwapOptionsSwapRouter02, SwapRoute, SwapType } from '@uniswap/smart-order-router';

import { IToken } from '../types/token.interface';
import { FirebaseService } from '../firebase/firebase.service';
import { fromReadableAmount, toReadableAmount } from '../utils/uniswapV3';
import { ERC20_ABI, V3_SWAP_ROUTER_ADDRESS } from '../core/constants';
import { getTokenTransferApproval, sendTransaction, TransactionState } from '../core/basic';

export type TokenTrade = Trade<Token, Token, TradeType>;

@Injectable()
export class UniswapV3Service {
  provider: any;
  router: any;
  constructor(private firebaseService: FirebaseService) {
    this.provider = new ethers.providers.JsonRpcProvider(process.env.RPC);
  }

  public poolContracts = {};

  async getRoute(tokenA: IToken, tokenB: IToken, inAmount: number, type: number = TradeType.EXACT_INPUT, slippage = '0.5'): Promise<SwapRoute> {
    let convertedSlippage = 50;
    if(slippage == '0.1') {
      convertedSlippage = 10;
    } else if(slippage == '1') {
      convertedSlippage = 100;
    }
    const token0 = new Token(SupportedChainId.MAINNET, tokenA.address, tokenA.decimals);
    const token1 = new Token(SupportedChainId.MAINNET, tokenB.address, tokenB.decimals);

    const router = new AlphaRouter({
      chainId: ChainId.MAINNET,
      provider: this.provider,
    });

    const options: SwapOptionsSwapRouter02 = {
      recipient: process.env.WALLET_ADDRESS,
      slippageTolerance: new Percent(convertedSlippage, 10_000),
      deadline: Math.floor(Date.now() / 1000 + 1800),
      type: SwapType.SWAP_ROUTER_02,
    };

    const route = await router.route(CurrencyAmount.fromRawAmount(token0, fromReadableAmount(inAmount, token0.decimals).toString()), token1, type, options);
    return route;
  }

  async getSwapAndDepositRoute(
    tokenA: IToken,
    tokenB: IToken,
    inAmount: number,
    depositAddress: string,
    type: number = TradeType.EXACT_OUTPUT,
    slippage = '0.5'
  ): Promise<SwapRoute> {
    let convertedSlippage = 50;
    if(slippage == '0.1') {
      convertedSlippage = 10;
    } else if(slippage == '1') {
      convertedSlippage = 100;
    }

    const token0 = new Token(SupportedChainId.MAINNET, tokenA.address, tokenA.decimals);
    const token1 = new Token(SupportedChainId.MAINNET, tokenB.address, tokenB.decimals);

    const router = new AlphaRouter({
      chainId: ChainId.MAINNET,
      provider: this.provider,
    });

    const options: SwapOptionsSwapRouter02 = {
      recipient: depositAddress,
      slippageTolerance: new Percent(convertedSlippage, 10_000),
      deadline: Math.floor(Date.now() / 1000 + 1800),
      type: SwapType.SWAP_ROUTER_02,
    };

    const route = await router.route(CurrencyAmount.fromRawAmount(token0, fromReadableAmount(inAmount, token0.decimals).toString()), token1, type, options);
    return route;
  }

  async executeRoute(route: SwapRoute): Promise<ethers.providers.TransactionReceipt> {
    const walletAddress = process.env.WALLET_ADDRESS;
    const provider = this.provider;
    const feeData = await provider.getFeeData();
    if (!walletAddress || !provider) {
      throw new Error('Cannot execute a trade without a connected wallet');
    }
    try {
      const res = await sendTransaction({
        data: route.methodParameters?.calldata,
        to: V3_SWAP_ROUTER_ADDRESS,
        value: route?.methodParameters?.value,
        from: walletAddress,
        gasLimit: route.estimatedGasUsed.add(route.estimatedGasUsed).add(route.estimatedGasUsed).add(route.estimatedGasUsed).add(route.estimatedGasUsed),
        maxFeePerGas: feeData.maxFeePerGas,
        maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
      });
      return res;
    } catch (e) {
      return { status: 0, logsBloom: e.message } as ethers.providers.TransactionReceipt;
    }
  }

  async executeRoute1(route: SwapRoute, gasPrice): Promise<ethers.providers.TransactionReceipt> {
    const walletAddress = process.env.WALLET_ADDRESS;
    const provider = this.provider;
    const feeData = await provider.getFeeData();
    if (!walletAddress || !provider) {
      throw new Error('Cannot execute a trade without a connected wallet');
    }
    try {
      const res = await sendTransaction({
        data: route.methodParameters?.calldata,
        to: V3_SWAP_ROUTER_ADDRESS,
        value: route?.methodParameters?.value,
        from: walletAddress,
        gasLimit: route.estimatedGasUsed.add(route.estimatedGasUsed).add(route.estimatedGasUsed),
        gasPrice: gasPrice,
        maxFeePerGas: feeData.maxFeePerGas,
        maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
      });
      return res;
    } catch (e) {
      return { status: 0, logsBloom: e.message } as ethers.providers.TransactionReceipt;
    }
  }

  async executeRouteWithRawRoute(route: any, tokenA: IToken): Promise<ethers.providers.TransactionReceipt> {
    const token0 = new Token(SupportedChainId.MAINNET, tokenA.address, tokenA.decimals);
    const walletAddress = process.env.WALLET_ADDRESS;
    const provider = this.provider;
    const feeData = await provider.getFeeData();
    if (!walletAddress || !provider) {
      throw new Error('Cannot execute a trade without a connected wallet.');
    }
    await getTokenTransferApproval(token0);

    try {
      const res = await sendTransaction({
        data: route.methodParameters?.calldata,
        to: V3_SWAP_ROUTER_ADDRESS,
        value: route?.methodParameters?.value,
        from: walletAddress,
        gasLimit: route.estimatedGasUsed.add(route.estimatedGasUsed).add(route.estimatedGasUsed).add(route.estimatedGasUsed),
        maxFeePerGas: feeData.maxFeePerGas,
        maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
      });
      return res;
    } catch (e) {
      return { status: 0, logsBloom: e.message } as ethers.providers.TransactionReceipt;
    }
  }

  async getEstimateTranferFee(token: IToken, amount: number, toAddress: string): Promise<any> {
    const token0 = new Token(SupportedChainId.MAINNET, token.address, token.decimals);
    const provider = this.provider;
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    if (!provider || !wallet) {
      console.log('No Provider Found');
      return TransactionState.Failed;
    }

    try {
      const tokenContract = new ethers.Contract(token0.address, ERC20_ABI, wallet);

      const estimation = await tokenContract.estimateGas.transfer(toAddress, fromReadableAmount(amount, token0.decimals).toString());
      const feeData = await provider.getFeeData();
      const txGasPrice = estimation.mul(feeData.maxFeePerGas);
      return toReadableAmount(txGasPrice.toNumber(), 18);
    } catch (e) {
      console.error(e);
      return TransactionState.Failed;
    }
  }

  async tranfer(token0: IToken, amount: number, toAddress: string): Promise<ethers.providers.TransactionReceipt> {
    const token = new Token(SupportedChainId.MAINNET, token0.address, token0.decimals);
    const provider = new ethers.providers.JsonRpcProvider(process.env.RPC);
    const fromAddress = process.env.WALLET_ADDRESS;
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    if (!provider || !wallet) {
      console.log('No Provider Found');
      return null;
    }

    try {
      const tokenContract = new ethers.Contract(token.address, ERC20_ABI, wallet);
      const transaction = await tokenContract.populateTransaction.transfer(toAddress, fromReadableAmount(amount, token.decimals).toString());
      return sendTransaction({
        ...transaction,
        from: fromAddress,
        gasLimit: 210000,
      });
    } catch (e) {
      console.error(e);
      return null;
    }
  }

  async getTotalSupply(address: string) {
    const provider = this.provider;
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    const tokenContract = new ethers.Contract(address, ERC20_ABI, wallet);
    const xx = await tokenContract.functions['allowance'](wallet.getAddress(), V3_SWAP_ROUTER_ADDRESS);
    return xx.toString();
  }

  async getBalanceOfToken(address: string) {
    const provider = this.provider;
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

    const tokenContract = new ethers.Contract(address, ERC20_ABI, wallet);
    const xx = await tokenContract.functions['balanceOf'](wallet.getAddress());

    return xx.toString();
  }

  async handleEventListener(from: string, token0: any, token1: any, amount0: any, amount1: any, res: any) {
    // Amount1 is the amount of main token's : PHA-ETH the main token is ETH, PHA-USDT: the main token is USDT
    // console.log(from, token0.symbol, token1.symbol, amount0, amount1, res);
    let swapAmount = 0;
    if (token0.address < token1.address) {
      swapAmount = Math.abs(Number(toReadableAmount(amount0.toString(), token0.decimals)));
    } else {
      swapAmount = Math.abs(Number(toReadableAmount(amount1.toString(), token0.decimals)));
    }
    console.log(from, `swap amount: ${swapAmount} ${token0.symbol}`);
  }
}
