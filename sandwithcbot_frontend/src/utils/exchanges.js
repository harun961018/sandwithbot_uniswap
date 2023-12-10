export const Exchanges = {
  binance: {
    CCXT: {
      apiKey: process.env.REACT_APP_BINANCE_API_KEY,
      secret: process.env.REACT_APP_BINANCE_SECRET_KEY,
      password: '',
      uid: '',
      options: {},
    },
    ORDERBOOK_FETCHING_INTERVAL: 200,
    SCANNING: {
      DEPTH: 20,
      WHITELIST: [],
    },
    EXECUTION: {
      ENABLED: false,
      CAP: 1,
      STRATEGY: 'linear',
      TEMPLATE: ['BUY', 'SELL', 'SELL'],
      FEE: 0.075,
      THRESHOLD: {
        PROFIT: 0.0,
        AGE: 25,
      },
    },
  }
}

export const DefaultConfig = {
  exchanges: Exchanges,
  EXECUTION: {
    ENABLED: false,
    CAP: 1,
    STRATEGY: 'linear',
    TEMPLATE: ['BUY', 'SELL', 'SELL'],
    FEE: 0.075,
    THRESHOLD: {
      PROFIT: 0.0,
      AGE: 25,
    },
  },
  INVESTMENT: {
    BTC: {
      MIN: 0.0001,
      MAX: 0.00015,
      STEP: 0.005,
    },
  },
  HUD: {
    ENABLED: false,
    ROWS: 10,
    REFRESH_RATE: 500,
  },

  LOG: {
    LEVEL: 'debug',
    PRETTY_PRINT: { colorize: false },
    STATUS_UPDATE_INTERVAL: 2,
  },
};