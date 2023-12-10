import ccxt from 'ccxt';
import ccxws from 'ccxws';
import _ from 'lodash';

export class CcxtAPI {
  constructor(exchange, options, configs) {
    this.exchange = exchange;
    this.configs = configs;
    const credentials = {
      apiKey: options.masterKey,
      secretKey: options.masterSecretKey,
      password: options?.passphrase || '',
      uID: options?.clientID || '',
      timeout: 60000,
      enableRateLimit: true,
      rateLimit: parseFloat(this.configs.bot.BR_RATE_LIMIT),
      options: { adjustForTimeDifference: true },
      recvWindow: 60000,
      nonce: function () { return this.milliseconds(); }
    };
    const credentialsUnLimited = {
      apiKey: options.masterKey,
      secretKey: options.masterSecretKey,
      password: options?.passphrase || '',
      uID: options?.clientID || '',
      timeout: 60000,
      enableRateLimit: false,
      options: { adjustForTimeDifference: true },
      recvWindow: 60000,
      nonce: function () { return this.milliseconds(); }
    };

    this.api = new ccxt[exchange](credentials);
    this.api2 = new ccxt[exchange](credentialsUnLimited);

    this.wss = [];
    this.snapshotCache = [];
  }

  async exchangeInfo() {
    return this.api.fetchMarkets().then((markets) => {
      let symbols = markets.map((market) => market.info);
      return { symbols };
    });
  }

  async marketBuyOrSell(method, symbol, quantity) {
    return this.api2.createOrder(symbol, 'market', method.toLowerCase(), quantity).then((order) => {
      order.orderId = order.id;
      order.executedQty = order.filled;
      order.cummulativeQuoteQty = order.cost;
      return order;
    });
  }

  async getBalances() {
    return this.api.fetchBalance().then(({ free, used }) => {
      let balances = {};
      Object.keys(free).forEach((asset) => {
        balances[asset] = {
          available: parseFloat(free[asset]),
          onOrder: parseFloat(used[asset]),
        };
      });
      return balances;
    });
  }
}