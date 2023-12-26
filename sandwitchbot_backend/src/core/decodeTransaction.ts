import { BigNumber, Transaction, ethers } from 'ethers';
import UniswapUniversalRouterV3Abi from '../abi/UniswapUniversalRouterV3.json';
import UniswapV2RouterAbi from '../abi/UniswapV2Router.json';
import { httpProviderUrl, uniswapUniversalRouterAddress, uniswapV2RouterAddress, wETHAddress } from './constants';
import { decodeSwap, getTokenDetail } from '../utils';
import DecodedTransactionProps from '../types/DecodedTransactionProps';
import BaseTransactionParamerterProps from '../types/BaseTransactionParamerterProps';
import TokenProps from '../types/TokenProps';
import { transcode } from 'buffer';

const uniswapV3Interface = new ethers.utils.Interface(UniswapUniversalRouterV3Abi);

const uniswapV2Interface = new ethers.utils.Interface(UniswapV2RouterAbi);

const uniswapUniversalTransaction = async (
  transaction: Transaction,
  activedTokenLists: TokenProps[],
  txHash = '',
  fromList = true,
): Promise<BaseTransactionParamerterProps | undefined> => {
  let decoded;
  try {
    decoded = uniswapV3Interface.parseTransaction(transaction);
  } catch (e) {
    console.log(`${txHash} Parse Failed`);
    return;
  }

  if (!decoded.args.commands.includes('08')) {
    console.log(`${txHash} Uni Not 08`);
    return;
  }
  const swapPositionInCommands = decoded.args.commands.substring(2).indexOf('08') / 2;
  const inputPosition = decoded.args.inputs[swapPositionInCommands];

  decoded = await decodeSwap(inputPosition);

  if (!decoded) {
    console.log(`${txHash} Uni decode swap Failed`);
    return;
  }
  if (!decoded.hasTwoPath) {
    console.log(`${txHash} Uni decode hasTwoPath`);
    return;
  }
  if (decoded.path[0].toLowerCase() != wETHAddress.toLowerCase()) {
    console.log(`${txHash} Uni Not WETH`);
    return;
  }
  let targetToken;
  if (fromList) {
    targetToken = checkTransactionForTarget(decoded.path[1], activedTokenLists);
  } else {
    try {
      targetToken = await getTokenDetail(decoded.path[1]);
    } catch (e) {
      console.log('get token info error', e);
      return;
    }
  }

  if (!targetToken) {
    console.log(`${txHash} not in active token list`);
    return;
  }
  return {
    amountIn: decoded.amountIn,
    minAmountOut: decoded.minAmountOut,
    targetToken: targetToken,
  };
};

const uniswapV2Transaction = async (
  transaction: Transaction,
  activedTokenLists: TokenProps[],
  txHash = '',
  fromList = true,
): Promise<BaseTransactionParamerterProps | undefined> => {
  let decoded;
  try {
    decoded = uniswapV2Interface.parseTransaction(transaction);
  } catch (e) {
    console.log(`${txHash} V2 Parse Failed`);
    return;
  }

  if (decoded.args.path[0].toLowerCase() != wETHAddress.toLowerCase()) {
    console.log(`${txHash} V2 Not WETH`);
    return;
  }
  let targetToken;
  if (fromList) {
    targetToken = checkTransactionForTarget(decoded.args.path[1], activedTokenLists);
  } else {
    try {
      targetToken = await getTokenDetail(decoded.args.path[1]);
    } catch (e) {
      console.log('get token info error', e);
      return;
    }
  }

  if (!targetToken) {
    console.log(`${txHash} V2 Not In TokenList`);
    return;
  }
  return {
    amountIn: decoded.amountIn,
    minAmountOut: decoded.args.amountOutMin,
    targetToken: targetToken,
  };
};

const decodeTransaction = async (transaction: Transaction, activedTokenLists: TokenProps[], txHash = '', fromList = true): Promise<any | undefined> => {
  if (!transaction || !transaction.to) return;
  // if (Number(transaction.value) == 0) return;
  if (transaction.to.toLowerCase() != uniswapV2RouterAddress.toLowerCase() && transaction.to.toLowerCase() != uniswapUniversalRouterAddress.toLowerCase()) {
    // console.log(`${txHash} is not V2 or Universal`);
    return;
  }
  const universalRouter: boolean = transaction.to.toLowerCase() == uniswapV2RouterAddress.toLowerCase() ? false : true;
  let decoded: BaseTransactionParamerterProps | undefined;
  console.log(`${txHash} ${universalRouter ? 'Uni' : 'V2'}`);
  if (universalRouter) {
    decoded = await uniswapUniversalTransaction(transaction, activedTokenLists, txHash, fromList);
  } else {
    decoded = await uniswapV2Transaction(transaction, activedTokenLists, txHash, fromList);
  }

  if (decoded == undefined) {
    return;
  }
  return {
    transaction,
    amountIn: decoded?.amountIn,
    minAmountOut: decoded?.minAmountOut || BigNumber.from(0),
    targetToken: decoded?.targetToken,
  };
};

const checkTransactionForTarget = (addresses: string, tokenList: TokenProps[]): TokenProps | undefined => {
  for (const token of tokenList) {
    if (token.address.toLowerCase() == addresses.toLowerCase()) {
      return token;
    }
  }
  return undefined;
};

export default decodeTransaction;
