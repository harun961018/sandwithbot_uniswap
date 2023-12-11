import { CronJob } from 'cron';
import { Server } from 'socket.io';
import { ethers, utils } from 'ethers';
import { Injectable, Logger } from '@nestjs/common';
import { SwapRoute } from '@uniswap/smart-order-router';
import { getProvider, getTokenTransferApproval } from 'src/core/basic';
import { FACTORY_ADDRESS, computePoolAddress } from '@uniswap/v3-sdk';
import { SupportedChainId, Token, TradeType } from '@uniswap/sdk-core';
import { CronExpression, SchedulerRegistry } from '@nestjs/schedule';
import * as IUniswapV3PoolABI from '@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json';

import { ERC20_ABI } from '../core/constants';
import { OrderSide } from 'src/utils/binance';
import { IToken } from 'src/types/token.interface';
import { toReadableAmount } from 'src/utils/uniswapV3';
import { USDT_TOKEN, WETH_TOKEN } from '../core/constants';
import { FirebaseService } from '../firebase/firebase.service';
import { BinanceAction, IHistory, Platform, TradeStatus } from 'src/types/history.interface';

@Injectable()
export class LiveService {
  constructor(
    private firebaseService: FirebaseService,
    private schedulerRegistry: SchedulerRegistry,
  ) {}
  private readonly logger = new Logger(LiveService.name);
  public server: Server = null;
  public failCount = 0;
  public poolContracts = {};
  public botStatus = false;
  public priceQuoting = {};
  public hardStop = false;
  public slippage = '0.5';

  async startBot(slippage = '0.5', name = '') {
    this.slippage = slippage;
    this.failCount = 0;
    // Get enabled Tokens from Firebase
    const allTokens: IToken[] = await this.firebaseService.findAll();
    const allowedTokens: IToken[] = allTokens.filter((token: IToken) => token.active && (name == '' || name == token.symbol));

    allowedTokens.map((token) => {
      // Add Swap event listener to pool contact to catch big amount swap Events
      if (this.poolContracts[token.symbol] == undefined || this.poolContracts[token.symbol].length == 0) {
        this.swapEventSubscribe(token);
      }

      this.addCronJob(token.symbol, CronExpression.EVERY_5_SECONDS, async () => {
        this.getTokenQuote(token);
      });
    });
    this.botStatus = true;
    this.hardStop = false;
    const status = { status: true };
    this.server.emit('bot-status', status);
  }

  // eslint-disable-next-line @typescript-eslint/ban-types
  addCronJob(name: string, cronString: string, callback: Function) {
    const job = new CronJob(`${cronString}`, async () => {
      const job1 = this.schedulerRegistry.getCronJob(name);
      if (job1) {
        job1.stop(); // pausing the cron job
      }
      // This callback is getTokenQuote
      await callback();
      try {
        const job2 = this.schedulerRegistry.getCronJob(name);
        job2.start();
      } catch (e) {}
    });

    this.schedulerRegistry.addCronJob(name, job);
    job.start();

    this.logger.warn(`job ${name} added for each minute at ${cronString} seconds!`);
  }

  
  async getTokenQuote(token: IToken) {
    try {
      // If hardStop is true, this means user clicked "Hard Stop" button
      if(this.hardStop) {
        return;
      }
      // Lock price quoting for this token while it's in process of `price quoting` or `Trading`
      if (this.priceQuoting[token.symbol] == false) {
        return;
      }
      this.priceQuoting[token.symbol] = false;
      
      //Start getting price quote in Binance and Uniswap
      const timeStart = performance.now();
      const binanceQuote = await this.binanceService.getQuote(token);
      const withdrawInfo = await this.binanceService.getCoinInfo(token);
      const depositAddress = await this.binanceService.getDepositAddress(token.symbol);
      if (!withdrawInfo.network) return;

      const [uniswapV3Route, uniswapV3OutRoute, depositFee] = await Promise.all([
        this.uniswapV3Service.getRoute(
          token,
          USDT_TOKEN,
          Number((token.maxAmount * 0.999 - withdrawInfo.network.withdrawFee).toFixed(token.decimals)),
          TradeType.EXACT_INPUT,
          this.slippage
        ),
        this.uniswapV3Service.getSwapAndDepositRoute(token, USDT_TOKEN, token.maxAmount, depositAddress.address, TradeType.EXACT_OUTPUT,this.slippage),
        this.uniswapV3Service.getEstimateTranferFee(token, 0, process.env.WALLET_ADDRESS),
      ]);
      const timeEnd = performance.now();
      console.log(`cron ${token.symbol} run --${(timeEnd - timeStart) / 1000}s-- taken`, timeStart, timeEnd);
      if(this.hardStop) {
        return;
      }
      // Build returnData to show in frontend
      const returnData = this.buildReturnData(token, binanceQuote, uniswapV3OutRoute, uniswapV3Route, withdrawInfo, depositFee);
      if (this.failCount >= 1) {
        this.stopBot();
        return;
      }
      // If etaProfit > `benefitLimit` then excute Buy in Binance and Sell in Uniswap
      if ( false && this.botStatus && Number(returnData.buy.etaProfit) > Number(token.benefitLimit ? token.benefitLimit : 0)) {
        const newTrade: IHistory = this.buildBuyTrade(token, returnData, withdrawInfo);
        const firebaseKey = await this.firebaseService.addTradeHistory(newTrade);
        if (firebaseKey) {
          // There is no in-progress trade for this token
          this.executeAsyncBuyTrade(newTrade, uniswapV3Route, firebaseKey);
        } else {
          this.priceQuoting[token.symbol] = true;
        }
      } else if (false && this.botStatus && Number(returnData.sell.etaProfit) > Number(token.benefitLimit ? token.benefitLimit : 0)) {
        const newTrade: IHistory = this.buildSellTrade(token, returnData, depositFee);
        //check If token is withdraw possible or deposit possible
        const coinInfo = await this.binanceService.getCoinInfo(newTrade.token0);
        if (coinInfo == null) {
        } else if (
          (newTrade.linkAction.action == BinanceAction.Deposit && coinInfo.network.depositEnable) ||
          (newTrade.linkAction.action == BinanceAction.Withdraw && coinInfo.network.withdrawEnable)
        ) {
          const firebaseKey = await this.firebaseService.addTradeHistory(newTrade);
          if (firebaseKey) {
            // There is no in-progress trade for this token
            this.executeAsyncSellTrade(newTrade, uniswapV3OutRoute, firebaseKey);
          } else {
            this.priceQuoting[token.symbol] = true;
          }
        } else {
          console.log(`token ${newTrade.token0.symbol} ${newTrade.linkAction.action} disabled now`);
        }
      } else {
        this.priceQuoting[token.symbol] = true;
      }
      this.server.emit('price-signal', returnData);
    } catch (e) {
      console.log(e);
      this.deleteCron(token.symbol);
    }
  }


  buildBuyTrade(token: IToken, returnData: any, withdrawInfo: any) {
    return {
      token0: token,
      token1: USDT_TOKEN,
      start: {
        platform: Platform.Binance,
        action: OrderSide.BUY,
        amount: token.maxAmount,
        estimateFee: returnData.buy.binanceSwapFee.amount,
        realFee: 0,
        estimateQuote: returnData.buy.binance,
        realQuote: 0,
        status: TradeStatus.Init,
        executed: null,
        orderId: '',
        comment: '',
      },
      linkAction: {
        action: BinanceAction.Withdraw,
        estimateFee: withdrawInfo.network.withdrawFee,
        realFee: 0,
        estimateQuote: token.maxAmount - withdrawInfo.network.withdrawFee,
        realQuote: 0,
        status: TradeStatus.Init,
        executed: '',
        comment: '',
        orderId: '',
      },
      end: {
        platform: Platform.UniswapV3,
        action: OrderSide.SELL,
        amount: returnData.amount,
        estimateFee: Number(returnData.buy.uniV3Fee),
        realFee: 0,
        estimateQuote: Number(returnData.buy.uniV3),
        realQuote: 0,
        status: TradeStatus.Init,
        executed: null,
        orderId: '',
        comment: '',
      },
      totalStatus: TradeStatus.Init,
      createdAt: new Date().toISOString(),
    };
  }

  buildSellTrade(token: IToken, returnData: any, depositFee: any) {
    return {
      token0: token,
      token1: USDT_TOKEN,
      start: {
        platform: Platform.UniswapV3,
        action: OrderSide.BUY,
        amount: token.maxAmount,
        estimateFee: Number(returnData.sell.uniV3Fee),
        realFee: 0,
        estimateQuote: Number(returnData.sell.uniV3),
        realQuote: 0,
        status: TradeStatus.Init,
        orderId: '',
        comment: '',
        executed: '',
      },
      linkAction: {
        action: BinanceAction.Deposit,
        estimateFee: depositFee * 1800,
        realFee: 0,
        estimateQuote: token.maxAmount,
        realQuote: 0,
        status: TradeStatus.Init,
        orderId: '',
        executed: '',
        comment: '',
      },
      end: {
        platform: Platform.Binance,
        action: OrderSide.SELL,
        amount: token.maxAmount,
        estimateFee: returnData.sell.binanceSwapFee.amount,
        realFee: 0,
        estimateQuote: returnData.sell.binance,
        realQuote: 0,
        status: TradeStatus.Init,
        executed: null,
        orderId: '',
        comment: '',
      },
      totalStatus: TradeStatus.Init,
      createdAt: new Date().toISOString(),
    };
  }

  buildReturnData(token: IToken, binanceQuote: any, uniswapV3OutRoute: any, uniswapV3Route: any, withdrawInfo: any, depositFee: any) {
    return {
      symbol: token.symbol,
      amount: token.maxAmount,
      modified: new Date().toISOString().replace('T', ' ').substring(0, 19),
      sell: {
        binance: token.maxAmount * Number(binanceQuote), // Sell Token in binance
        binanceSwapFee: {
          amount: (token.maxAmount * Number(binanceQuote)) / 1000,
          currency: USDT_TOKEN,
        },
        uniV2: 0,
        uniV3: uniswapV3OutRoute.quote.toExact(), // Buy Token in uniswap
        uniV3Fee: uniswapV3OutRoute.estimatedGasUsedUSD.toExact(),
        etaProfit: (
          token.maxAmount * Number(binanceQuote) -
          Number(uniswapV3OutRoute.quote.toExact()) -
          (token.maxAmount * Number(binanceQuote)) / 1000 -
          depositFee * 1500 - //deposit fee
          Number(uniswapV3OutRoute.estimatedGasUsedUSD.toExact())
        ).toFixed(4),
      },
      buy: {
        binance: token.maxAmount * Number(binanceQuote), // Buy Token in binance
        binanceSwapFee: {
          amount: token.maxAmount / 1000,
          currency: token,
        },
        uniV2: 0,
        uniV3: uniswapV3Route.quote.toExact(), // Sell Token in uniswap
        uniV3Fee: uniswapV3Route.estimatedGasUsedUSD.toExact(),
        etaProfit: (
          Number(uniswapV3Route.quote.toExact()) -
          token.maxAmount * Number(binanceQuote) -
          (token.maxAmount * Number(binanceQuote)) / 1000 -
          withdrawInfo.network.withdrawFee * Number(binanceQuote) - //withdraw fee
          Number(uniswapV3Route.estimatedGasUsedUSD.toExact())
        ).toFixed(4),
      },
    };
  }

  //Buy in Binance and sell in Uniswap
  async executeAsyncBuyTrade(trade: IHistory, route: SwapRoute, firebaseKey: string) {
    let tokenApproval = 0;
    while (1) {
      if(this.hardStop) {
        break;
      }
      this.priceQuoting[trade.token0.symbol] = false;
      // Start Action
      if ([TradeStatus.Init, TradeStatus.Pending].includes(trade.start.status)) {
        const result1 = await this.executeSubTask(trade.token0, trade.token1, trade.linkAction, trade.start, route);
        trade.start = { ...trade.start, ...result1 };
        this.firebaseService.updateTradeHistory(firebaseKey, trade);
      }

      // Link Action is deposit
      if (trade.start.status == TradeStatus.Success && trade.linkAction.action == BinanceAction.Withdraw) {
        // Start Action Already successed, so now withdraw from binance
        if (trade.linkAction.status == TradeStatus.Init) {
          //Check binance balance if there is enough balance to withdraw
          const walletStatus = await this.binanceService.getWalletStatus();
          const balances = walletStatus.balances.filter((balance) => balance.asset == trade.token0.symbol);

          console.log('withdraw start-', Number(balances[0].free), Number(trade.start.amount) - Number(trade.start.realFee));

          if (balances && balances.length == 1 && Number(balances[0].free) >= Number(trade.start.amount) - Number(trade.start.realFee)) {
            if(this.hardStop) {
              break;
            }
            const withdrawOrder = await this.binanceService.withdraw(trade.token0.symbol, trade.start.amount - trade.start.realFee);
            if(this.hardStop) {
              break;
            }
            /* Approve */
            const token0 = new Token(SupportedChainId.MAINNET, trade.token0.address, trade.token0.decimals);
            if(tokenApproval == 0) {
              getTokenTransferApproval(token0);
              tokenApproval++;
            }
            if(this.hardStop) {
              break;
            }
            /* ************ */
            console.log('withdraw start--', withdrawOrder.status, withdrawOrder.data);

            if (withdrawOrder.status && withdrawOrder.status == 400) {
              trade.linkAction.comment = withdrawOrder.data.msg;
            } else {
              trade.linkAction.orderId = withdrawOrder.id || '';
              trade.linkAction.status = TradeStatus.Pending;
            }
            this.firebaseService.updateTradeHistory(firebaseKey, trade);
          }
        }
        if (trade.linkAction.status == TradeStatus.Pending) {
          if(this.hardStop) {
            break;
          }
          this.subscribeToBinanceTransfer(trade, firebaseKey, route);
          break;
          // this.subscribeToTokenTransfer(trade, firebaseKey, route);
          // break;

          // Get token amount in metamask wallet
          //   const walletBalance = await this.uniswapV3Service.getBalanceOfToken(trade.token0.address);
          //   console.log(
          //     'Number(walletBalance) >= trade.start.amount - trade.start.realFee',
          //     Number(walletBalance) / Math.pow(10, trade.token0.decimals),
          //     trade.start.amount - trade.start.realFee - trade.linkAction.estimateFee,
          //   );
          //   if (Number(walletBalance) >= trade.start.amount - trade.start.realFee - trade.linkAction.estimateFee) {
          //     console.log('withdraw sucessed', new Date());
          //     trade.linkAction.status = TradeStatus.Success;
          //     trade.linkAction.realQuote = trade.start.amount - trade.start.realFee;
          //   }
          //   this.firebaseService.updateTradeHistory(firebaseKey, trade);
        }
      }

      // End Action
      // if (trade.start.status == TradeStatus.Success && trade.linkAction.status == TradeStatus.Success) {
      //   if ([TradeStatus.Init, TradeStatus.Pending].includes(trade.end.status)) {
      //     let result2 = {};
      //     result2 = await this.executeSubTask(trade.token0, trade.token1, trade.linkAction, trade.end, route);
      //     trade.end = { ...trade.end, ...result2 };
      //   }
      // }

      //Total Status
      if (trade.start.status == TradeStatus.Success && trade.linkAction.status == TradeStatus.Success && trade.end.status == TradeStatus.Success) {
        trade.totalStatus = TradeStatus.Success;
        this.firebaseService.updateTradeHistory(firebaseKey, trade);
        this.priceQuoting[trade.token0.symbol] = true;
        break;
      } else if (trade.start.status == TradeStatus.Failed || trade.linkAction.status == TradeStatus.Failed || trade.end.status == TradeStatus.Failed) {
        trade.totalStatus = TradeStatus.Failed;
        this.failCount++;
        this.firebaseService.updateTradeHistory(firebaseKey, trade);
        this.priceQuoting[trade.token0.symbol] = true;
        break;
      }
    }
    return;
  }

  async subscribeToBinanceTransfer(trade, firebaseKey, route) {
    const wsProvider = new ethers.providers.WebSocketProvider(process.env.WEBSOCKET_RPC_ADDRESS);
    const provider = getProvider();
    if (!wsProvider) {
      throw new Error('No provider');
    }
    let xx = false;
    wsProvider.on('pending', async (txHash) => {
      if(this.hardStop) {
        wsProvider.removeAllListeners();
      }
      if (txHash && !this.hardStop) {
        if (!xx) {
          const pendingTx = await provider.getTransaction(txHash);
          if (pendingTx && (pendingTx?.to || '').toLowerCase() == trade.token0.address.toLowerCase()) {
            const iface = new ethers.utils.Interface(ERC20_ABI);
            const decodedArgs = iface.decodeFunctionData(pendingTx.data.slice(0, 10), pendingTx.data);
            const functionName = iface.getFunction(pendingTx.data.slice(0, 10)).name;

            if (functionName == 'transfer' && decodedArgs[0] == process.env.WALLET_ADDRESS) {
              xx = true;
              const amount = Number(toReadableAmount(decodedArgs[1], trade.token0.decimals));
              if (amount == trade.start.amount - trade.start.realFee - trade.linkAction.estimateFee) {
                let result2 = {};
                result2 = await this.executeSubTask(trade.token0, trade.token1, trade.linkAction, trade.end, route);
                trade.linkAction.status = TradeStatus.Success;
                trade.end = { ...trade.end, ...result2 };
                //Total Status
                if (trade.start.status == TradeStatus.Success && trade.linkAction.status == TradeStatus.Success && trade.end.status == TradeStatus.Success) {
                  trade.totalStatus = TradeStatus.Success;
                  await this.firebaseService.updateTradeHistory(firebaseKey, trade);
                  this.priceQuoting[trade.token0.symbol] = true;
                } else if (
                  trade.start.status == TradeStatus.Failed ||
                  trade.linkAction.status == TradeStatus.Failed ||
                  trade.end.status == TradeStatus.Failed
                ) {
                  trade.totalStatus = TradeStatus.Failed;
                  this.failCount++;
                  await this.firebaseService.updateTradeHistory(firebaseKey, trade);
                  this.priceQuoting[trade.token0.symbol] = true;
                }
                wsProvider.removeAllListeners();
              }
            }
          }
        }
      }
    });
  }

  async subscribeToTokenTransfer(trade, firebaseKey, route) {
    const provider = getProvider();
    const tokenContract = new ethers.Contract(trade.token0.address, ERC20_ABI, provider);
    tokenContract.on('Transfer', async (from, to) => {
      if (to !== process.env.WALLET_ADDRESS) {
        return;
      }
      let result2 = {};
      result2 = await this.executeSubTask(trade.token0, trade.token1, trade.linkAction, trade.end, route);
      trade.linkAction.status = TradeStatus.Success;
      trade.end = { ...trade.end, ...result2 };
      //Total Status
      if (trade.start.status == TradeStatus.Success && trade.linkAction.status == TradeStatus.Success && trade.end.status == TradeStatus.Success) {
        trade.totalStatus = TradeStatus.Success;
        this.firebaseService.updateTradeHistory(firebaseKey, trade);
        this.priceQuoting[trade.token0.symbol] = true;
      } else if (trade.start.status == TradeStatus.Failed || trade.linkAction.status == TradeStatus.Failed || trade.end.status == TradeStatus.Failed) {
        trade.totalStatus = TradeStatus.Failed;
        this.failCount++;
        this.firebaseService.updateTradeHistory(firebaseKey, trade);
        this.priceQuoting[trade.token0.symbol] = true;
      }
      // Remove the Transfer event listener
      tokenContract.removeAllListeners('Transfer');
    });
  }

  //Buy in Uniswap and sell in Binance
  async executeAsyncSellTrade(trade: IHistory, route: SwapRoute, firebaseKey: string) {
    if(this.hardStop) {
      return;
    }
    while (1) {
      if(this.hardStop) {
        break;
      }
      this.priceQuoting[trade.token0.symbol] = false;
      // Start Action and deposit together
      if ([TradeStatus.Init, TradeStatus.Pending].includes(trade.start.status)) {
        const result1 = await this.executeSubTask(trade.token0, trade.token1, trade.linkAction, trade.start, route);
        trade.start = { ...trade.start, ...result1 };
        trade.linkAction.status = TradeStatus.Success;
        this.firebaseService.updateTradeHistory(firebaseKey, trade);
      }

      // End Action
      if (trade.start.status == TradeStatus.Success && trade.linkAction.status == TradeStatus.Success) {
        if ([TradeStatus.Init, TradeStatus.Pending].includes(trade.end.status)) {
          // Get binance wallet status
          const walletStatus = await this.binanceService.getWalletStatus();
          const balances =
            walletStatus && walletStatus.balances && walletStatus.balances.length > 0
              ? walletStatus.balances.filter((balance) => balance.asset == trade.token0.symbol)
              : 0;

          console.log('deposit order status checking: ', balances);
          if(this.hardStop) {
            break;
          }
          if (balances && balances.length == 1 && balances[0].free >= trade.start.amount) {
            if(this.hardStop) {
              break;
            }
            let result2 = {};
            result2 = await this.executeSubTask(trade.token0, trade.token1, trade.linkAction, trade.end, route);
            trade.end = { ...trade.end, ...result2 };
          } else {
            if(this.hardStop) {
              break;
            }
            await this.sleep(2000);
          }
        }
      }

      //Total Status
      if (trade.start.status == TradeStatus.Success && trade.linkAction.status == TradeStatus.Success && trade.end.status == TradeStatus.Success) {
        trade.totalStatus = TradeStatus.Success;
        this.firebaseService.updateTradeHistory(firebaseKey, trade);
        this.priceQuoting[trade.token0.symbol] = true;
        break;
      } else if (trade.start.status == TradeStatus.Failed || trade.linkAction.status == TradeStatus.Failed || trade.end.status == TradeStatus.Failed) {
        trade.totalStatus = TradeStatus.Failed;
        this.failCount++;
        this.firebaseService.updateTradeHistory(firebaseKey, trade);
        this.priceQuoting[trade.token0.symbol] = true;
        break;
      }
    }
    return;
  }

  async executeSubTask(token: IToken, token1: IToken, linkAction: IHistory['linkAction'], task: IHistory['start'], route: SwapRoute = null) {
    // Binance Init: excute swap
    if (task.platform == Platform.Binance) {
      let resBinance: any;
      if (task.status == TradeStatus.Init) {
        if(this.hardStop) {
          return;
        }
        resBinance = await this.binanceService.placeMarketOrder(token, task.action, task.amount);
      } else if (task.status == TradeStatus.Pending) {
        if(this.hardStop) {
          return;
        }
        resBinance = await this.binanceService.getOrderStatus(`${token.symbol}${token1.symbol}`, Number(task.orderId));
      }
      if(this.hardStop) {
        return;
      }
      // Handle response
      if (!resBinance) {
        return {};
      } else if (resBinance.status == 400) {
        return { status: TradeStatus.Failed, comment: resBinance.data.msg };
      } else if (resBinance.status == 'FILLED') {
        return {
          orderId: resBinance.orderId,
          status: TradeStatus.Success,
          realQuote: resBinance.cummulativeQuoteQty,
          realFee: resBinance.fills.reduce((acc: number, cur: any) => {
            return acc + Number(cur.commission);
          }, 0),
        };
      } else {
        return { status: TradeStatus.Pending, orderId: resBinance.orderId };
      }
      // Uniswap Init: excute trade in uniswap
    } else if (task.platform == Platform.UniswapV3 && task.status == TradeStatus.Init) {
      // const route = await this.uniswapV3Service.getRoute(
      //   token,
      //   token1,
      //   task.action == OrderSide.SELL ? linkAction.realQuote - linkAction.estimateFee : task.amount,
      //   task.action == OrderSide.SELL ? TradeType.EXACT_INPUT : TradeType.EXACT_OUTPUT,
      // );
      if(this.hardStop) {
        return;
      }
      const resUniswap = await this.uniswapV3Service.executeRoute(route);
      if (resUniswap != null && resUniswap.status && task.action == OrderSide.SELL) {
        const detailedTxStatus = this.binanceService.parseReceipt(
          resUniswap,
          task.action == OrderSide.SELL ? token : token1,
          task.action == OrderSide.SELL ? token1 : token,
        );
        return {
          orderId: resUniswap.transactionHash,
          realFee: detailedTxStatus.fee,
          realQuote: task.action == OrderSide.SELL ? detailedTxStatus.received : detailedTxStatus.sent,
          status: TradeStatus.Success,
        };
      } else if (resUniswap != null && resUniswap.status) {
        return { status: TradeStatus.Success };
      } else {
        return { status: TradeStatus.Failed, comment: resUniswap.logsBloom };
      }
    }
  }

  deleteCron(name: string) {
    try {
      this.schedulerRegistry.deleteCronJob(name);
      this.logger.warn(`job ${name} deleted!`);
    } catch (e) {
      console.log('error in delete cron');
    }
  }

  async getBotStatus() {
    let flag = false;
    const allTokens: IToken[] = await this.firebaseService.findAll();
    const allowedTokens: IToken[] = allTokens.filter((token: IToken) => token.active);

    allowedTokens.map((token) => {
      if (this.poolContracts[token.symbol] && this.poolContracts[token.symbol].length > 0) {
        flag = true;
      }
    });
    const status = { status: flag, slippage: this.slippage };
    this.server.emit('bot-status', status);
    return status;
  }

  getCrons() {
    const jobs = this.schedulerRegistry.getCronJobs();
    return jobs;
  }

  async handleEventListener(from: string, token0: IToken, token1: IToken, amount0: any, amount1: any, res: any) {
    // Amount1 is the amount of main token's : PHA-ETH the main token is ETH, PHA-USDT: the main token is USDT
    let swapAmount = 0;
    if (token0.address < token1.address) {
      swapAmount = Math.abs(Number(toReadableAmount(amount0.toString(), token0.decimals)));
    } else {
      swapAmount = Math.abs(Number(toReadableAmount(amount1.toString(), token0.decimals)));
    }
    console.log(`swap amount: ${swapAmount} ${token0.symbol}`);
    if (!token0.monitLimit || token0.monitLimit <= swapAmount) {
      this.getTokenQuote(token0);
    }
  }

  async stopBot(name = '') {
    const filter = {
      topics: [utils.id('Swap(address,address,int256,int256,uint160,uint128,int24)')],
    };
    const allTokens: IToken[] = await this.firebaseService.findAll();
    const allowedTokens: IToken[] = allTokens.filter((token: IToken) => token.active && (name == '' || name == token.symbol));

    allowedTokens.map((token) => {
      if (this.poolContracts[token.symbol] && this.poolContracts[token.symbol].length > 0) {
        this.poolContracts[token.symbol].map((poolContract) => {
          poolContract.removeAllListeners(filter);
        });
        this.poolContracts[token.symbol] = [];
      }
      console.log(`Token ${token.symbol} Stopped`, this.poolContracts[token.symbol]?.length);
    });
    this.failCount = 0;

    this.getCrons().forEach((value, key) => {
      if ((name == '' || name == key) && key != 'fetch_trade_log') {
        this.deleteCron(key);
      }
    });
    this.botStatus = false;
    const status = { status: false };
    this.server.emit('bot-status', status);
  }

  async swapEventSubscribe(token0: IToken) {
    const testProvider = new ethers.providers.WebSocketProvider(process.env.WEBSOCKET_RPC_ADDRESS);
    if (!testProvider) {
      throw new Error('No provider');
    }
    const token1 = USDT_TOKEN;
    const token2 = WETH_TOKEN;
    const tokenA = new Token(SupportedChainId.MAINNET, token0.address, token0.decimals);
    const tokenB = new Token(SupportedChainId.MAINNET, token1.address, token1.decimals);
    const tokenC = new Token(SupportedChainId.MAINNET, token2.address, token2.decimals);
    const fees = [100, 500, 3000, 10000];
    const filter = {
      topics: [utils.id('Swap(address,address,int256,int256,uint160,uint128,int24)')],
    };
    // Token0-ETH POOL
    fees.map((fee) => {
      const currentPoolAddress = computePoolAddress({
        factoryAddress: FACTORY_ADDRESS,
        tokenA: tokenA,
        tokenB: tokenC,
        fee: fee,
      });
      const poolContract = new ethers.Contract(currentPoolAddress, IUniswapV3PoolABI.abi, testProvider);
      poolContract.on(filter, (send, receive, amount0, amount1, ...res) => {
        this.handleEventListener(`from ${token0.symbol}-${token2.symbol}(${fee}) Pool`, token0, token2, amount0, amount1, res);
      });

      if (this.poolContracts[token0.symbol] == undefined) {
        this.poolContracts[token0.symbol] = [poolContract];
      } else {
        this.poolContracts[token0.symbol] = [...this.poolContracts[token0.symbol], poolContract];
      }
    });
    // Token0-ETH USDT POOL
    fees.map((fee) => {
      const currentPoolAddress = computePoolAddress({
        factoryAddress: FACTORY_ADDRESS,
        tokenA: tokenA,
        tokenB: tokenB,
        fee: fee,
      });
      const poolContract = new ethers.Contract(currentPoolAddress, IUniswapV3PoolABI.abi, testProvider);
      poolContract.on(filter, (send, receive, amount0, amount1, ...res) => {
        this.handleEventListener(`from ${token0.symbol}-${token1.symbol}(${fee}) Pool`, token0, token1, amount0, amount1, res);
      });

      if (this.poolContracts[token0.symbol] == undefined) {
        this.poolContracts[token0.symbol] = [poolContract];
      } else {
        this.poolContracts[token0.symbol] = [...this.poolContracts[token0.symbol], poolContract];
      }
    });
    console.log(`Token ${token0.symbol} Created`, this.poolContracts[token0.symbol].length);
  }

  async sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async handleHardStop(name = '') {
    const filter = {
      topics: [utils.id('Swap(address,address,int256,int256,uint160,uint128,int24)')],
    };
    const allTokens: IToken[] = await this.firebaseService.findAll();
    const allowedTokens: IToken[] = allTokens.filter((token: IToken) => token.active && (name == '' || name == token.symbol));

    allowedTokens.map((token) => {
      if (this.poolContracts[token.symbol] && this.poolContracts[token.symbol].length > 0) {
        this.poolContracts[token.symbol].map((poolContract) => {
          poolContract.removeAllListeners(filter);
        });
        this.poolContracts[token.symbol] = [];
      }
      console.log(`Token ${token.symbol} Stopped`, this.poolContracts[token.symbol]?.length);
    });
    this.failCount = 0;
    this.getCrons().forEach((value, key) => {
      if ((name == '' || name == key) && key != 'fetch_trade_log') {
        
        this.deleteCron(key);
      }
    });
    this.botStatus = false;

    this.hardStop = true;
    const status = { status: false };
    this.server.emit('bot-status', status);
  }
}