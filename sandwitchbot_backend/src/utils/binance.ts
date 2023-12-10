import axios from 'axios';
import { createHmac } from 'node:crypto';
import * as qs from 'qs';

export type OrderSide_LT = 'BUY' | 'SELL';

export const enum OrderSide {
  BUY = 'BUY',
  SELL = 'SELL',
}

export type OrderType_LT =
  | 'LIMIT'
  | 'LIMIT_MAKER'
  | 'MARKET'
  | 'STOP'
  | 'STOP_MARKET'
  | 'STOP_LOSS_LIMIT'
  | 'TAKE_PROFIT_LIMIT'
  | 'TAKE_PROFIT_MARKET'
  | 'TRAILING_STOP_MARKET';

export const enum OrderType {
  LIMIT = 'LIMIT',
  LIMIT_MAKER = 'LIMIT_MAKER',
  MARKET = 'MARKET',
  STOP = 'STOP',
  STOP_MARKET = 'STOP_MARKET',
  STOP_LOSS_LIMIT = 'STOP_LOSS_LIMIT',
  TAKE_PROFIT_LIMIT = 'TAKE_PROFIT_LIMIT',
  TAKE_PROFIT_MARKET = 'TAKE_PROFIT_MARKET',
  TRAILING_STOP_MARKET = 'TRAILING_STOP_MARKET',
}

export const privateRequest = async (data: any, endPoint: string, method: string) => {
  const dataQueryString = qs.stringify(data);
  const signature = buildSign(dataQueryString);
  const requestConfig = {
    method: method,
    url: process.env.BINANCE_HOST_URL + endPoint + '?' + dataQueryString + '&signature=' + signature,
    headers: {
      'X-MBX-APIKEY': process.env.BINANCE_API_KEY,
    },
  };

  try {
    const response = await axios(requestConfig);
    return response.data;
  } catch (err) {
    return err.response;
  }
};

export const publicRequest = async (data: any, endPoint: string, method: string) => {
  const dataQueryString = qs.stringify(data);
  const requestConfig = {
    method: method,
    url: process.env.BINANCE_HOST_URL + endPoint + '?' + dataQueryString,
  };

  try {
    const response = await axios(requestConfig);
    return response.data;
  } catch (err) {
    console.log(err);
    return err;
  }
};

const buildSign = (data: any): string => {
  return createHmac('sha256', process.env.BINANCE_SECRET).update(data).digest('hex');
};

export const getSymbolPrice = async (symbol: string) => {
  const data = {
    symbol,
  };

  return await publicRequest(data, '/api/v3/ticker/price', 'GET');
};

export const getDepositAddress = async (coin: string, network = 'ETH') => {
  const data = {
    coin,
    network,
    recvWindow: 20000,
    timestamp: Date.now(),
  };

  return await privateRequest(data, '/sapi/v1/capital/deposit/address', 'GET');
};

export const createNewOrder = async (symbol: string, side: OrderSide_LT, quantity: number, type: OrderType_LT) => {
  const data = {
    symbol,
    side,
    type,
    quantity,
    recvWindow: 20000,
    timestamp: Date.now(),
  };

  return await privateRequest(data, '/api/v3/order', 'POST');
};

export const withdraw = async (coin: string, amount: number, address: string = process.env.WALLET_ADDRESS, network = 'ETH') => {
  const data = {
    coin,
    network,
    address,
    amount,
    recvWindow: 20000,
    timestamp: Date.now(),
  };

  return await privateRequest(data, '/sapi/v1/capital/withdraw/apply', 'POST');
};

export const getWithdrawHistory = async (coin = 'USDT', orderId = '') => {
  const data = {
    timestamp: Date.now(),
    coin,
  };
  const res = await privateRequest(data, '/sapi/v1/capital/withdraw/history', 'GET');
  return res.filter((item) => orderId == '' || item.id == orderId);
};

export const exchangeInfo = async (symbol) => {
  const data = {
    symbol,
  };
  return await publicRequest(data, '/api/v3/exchangeInfo', 'GET');
};

export const coinInfo = async (symbol = 'BTC') => {
  try {
    const data = {
      timestamp: Date.now(),
      recvWindow: 20000,
    };
    const response = await privateRequest(data, '/sapi/v1/capital/config/getall', 'GET');
    if (response) {
      const coinInfo = response.find((item) => item.coin == symbol);
      if (coinInfo.networkList) {
        const result = {
          ...coinInfo,
          network: coinInfo.networkList.find((item) => item.network == 'ETH'),
        };
        return result;
      }
    }
    return null;
  } catch (e) {
    console.log(e);
    return null;
  }
};

export const getOrderStatus = async (symbol: string, orderId: number) => {
  const data = {
    symbol,
    orderId,
    timestamp: Date.now(),
    recvWindow: 20000,
  };
  return await privateRequest(data, '/api/v3/order', 'GET');
};

export const getWalletStatus = async () => {
  const data = {
    recvWindow: 20000,
    timestamp: Date.now(),
  };
  return await privateRequest(data, '/api/v3/account', 'GET');
};

export const getGasTracker = async () => {
  const response = await axios({
    method: 'GET',
    url: process.env.ETHERSCAN_BASE_URL + '/api' + '?' + `module=gastracker&action=gasoracle&apikey=${process.env.ETHERSCAN_API_KEY}`,
  });
  return response.data;
};
