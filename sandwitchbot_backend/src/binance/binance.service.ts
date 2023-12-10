import { Injectable } from '@nestjs/common';
import { ethers } from 'ethers';

import {
  coinInfo,
  createNewOrder,
  exchangeInfo,
  getDepositAddress,
  getGasTracker,
  getOrderStatus,
  getSymbolPrice,
  getWalletStatus,
  getWithdrawHistory,
  OrderSide_LT,
  OrderType,
  withdraw,
} from 'src/utils/binance';
import { getProvider } from 'src/core/basic';
import { IToken } from '../types/token.interface';
import { toReadableAmount } from 'src/utils/uniswapV3';
import * as ERC20_ABI from '../utils/abi/erc20.abi.json';
import { FirebaseService } from '../firebase/firebase.service';

@Injectable()
export class BinanceService {
  constructor(private firebaseService: FirebaseService) {}

  async getHello() {
    return await getDepositAddress('USDT');
  }

  async getQuote(token: IToken) {
    const price = await getSymbolPrice(`${token.symbol}USDT`);
    return price.price;
  }

  async placeMarketOrder(token: IToken, orderDirection: OrderSide_LT, amount: number) {
    return await createNewOrder(`${token.symbol}USDT`, orderDirection, amount, OrderType.MARKET);
  }

  async getWithdrawHistory(coin: string, orderId: string) {
    return await getWithdrawHistory(coin, orderId);
  }

  async getDepositAddress(symbol: string) {
    return await getDepositAddress(symbol, 'ETH');
  }

  async withdraw(coin: string, amount: number, address: string = process.env.WALELT_ADDRESS) {
    return await withdraw(coin, amount, address, 'ETH');
  }

  async getExchangeInfo(token: IToken) {
    return await exchangeInfo(`${token.symbol}USDT`);
  }

  async getCoinInfo(token: IToken) {
    return await coinInfo(token.symbol);
  }

  async getOrderStatus(symbol: string, orderId: number) {
    return await getOrderStatus(symbol, orderId);
  }

  async getWalletStatus() {
    return await getWalletStatus();
  }

  async getGasTracker() {
    const provider = new ethers.providers.JsonRpcProvider(process.env.RPC);
    const feeData = await provider.getFeeData();
    return await getGasTracker();
  }

  async getTransactionReceipt(txHash: string, sentToken: IToken, receivedToken: IToken) {
    const provider = getProvider();
    const receipt = await provider.getTransactionReceipt(txHash);
    if (!receipt.status) return { receipt };
    else return this.parseReceipt(receipt, sentToken, receivedToken);
  }

  async getTxFromHash(txHash: string) {
    const provider = getProvider();
    const pendingTx = await provider.getTransaction(txHash);

    const iface = new ethers.utils.Interface(ERC20_ABI);
    const functionName = iface.getFunction(pendingTx.data.slice(0, 10)).name;

    const wsProvider = new ethers.providers.WebSocketProvider(process.env.WEBSOCKET_RPC_ADDRESS);

    const token = {
      active: true,
      address: '0x6c5ba91642f10282b576d91922ae6448c9d52f4e',
      symbol: 'PHA',
      decimals: 18,
      maxAmount: 10,
      minAmount: 0,
    };

    wsProvider.on('pending', async (txHash) => {
      if (txHash) {
        const pendingTx = await provider.getTransaction(txHash);
        if (pendingTx && (pendingTx?.to || '').toLowerCase() == token.address) {
          const iface = new ethers.utils.Interface(ERC20_ABI);
          const decodedArgs = iface.decodeFunctionData(pendingTx.data.slice(0, 10), pendingTx.data);
          const functionName = iface.getFunction(pendingTx.data.slice(0, 10)).name;
          if (functionName == 'transfer' && decodedArgs[0] == process.env.WALLET_ADDRESS) {
            const amount = Number(toReadableAmount(decodedArgs[1], token.decimals));
          }
        }
      }
    });

    return functionName;
  }

  parseReceipt(receipt: any, sentToken: IToken, receivedToken: IToken) {
    const iface = new ethers.utils.Interface(ERC20_ABI);

    const receiveLog = receipt.logs.find((log) => {
      if (log.topics[0] == '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef') {
        const event = iface.parseLog(log);
        if (event.args.to == process.env.WALLET_ADDRESS) {
          return true;
        }
      }
      return false;
    });
    const parseReceivedLog = iface.parseLog(receiveLog);

    const sendLog = receipt.logs.find((log) => {
      if (log.topics[0] == '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef') {
        const event = iface.parseLog(log);
        if (event.args.from == process.env.WALLET_ADDRESS) {
          return true;
        }
      }
      return false;
    });
    const parseSentLog = iface.parseLog(sendLog);

    const received = Number(toReadableAmount(parseReceivedLog.args.value, receivedToken.decimals));
    const sent = Number(toReadableAmount(parseSentLog.args.value, sentToken.decimals));
    const fee = (receipt.gasUsed.toNumber() * receipt.effectiveGasPrice.toNumber()) / 1000000000000000000;
    return { receipt, fee: fee, sent: sent, received: received };
  }
}
