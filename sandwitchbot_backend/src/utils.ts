import { BigNumber, ethers } from 'ethers';
import uniswapPairByteCode from './bytecode/uniswapPairByteCode';
import erc20ByteCode from './bytecode/erc20ByteCode';
import UniswapV2PairAbi from './abi/UniswapV2Pair.json';
import UniswapV2FactoryAbi from './abi/UniswapV2Factory.json';
import UniswapV2RouterAbi from './abi/UniswapV2Router.json';
import Erc20Abi from './abi/ERC20.json';
import { gasBribe, buyAmount, httpProviderUrl, privateKey, uniswapV2RouterAddress, uniswapV2FactoryAddress, wETHAddress, gasLimit } from './core/constants';
import DecodedTransactionProps from './types/DecodedTransactionProps';
import PairProps from './types/PairProps';
import AmountsProps from './types/AmountsProps';
import TokenProps from './types/TokenProps';

const READABLE_FORM_LEN = 6;

const provider = ethers.getDefaultProvider(httpProviderUrl);
const signer = new ethers.Wallet(privateKey, provider);

const uniswapV2Router = new ethers.Contract(uniswapV2RouterAddress, UniswapV2RouterAbi);

const uniswapV2Facotry = new ethers.Contract(uniswapV2FactoryAddress, UniswapV2FactoryAbi, provider);

const erc20Factory = new ethers.ContractFactory(Erc20Abi, erc20ByteCode, signer);

const getPair = async (token: string) => {
  const pairFactory = new ethers.ContractFactory(UniswapV2PairAbi, uniswapPairByteCode, signer);
  const pairAddress = await uniswapV2Facotry.getPair(wETHAddress, token);
  try {
    const pair = pairFactory.attach(pairAddress);
    const reserves = await pair.getReserves();
    return { token0: reserves._reserve0, token1: reserves._reserve1 };
  } catch (e) {
    return;
  }
};

const decodeSwap = async (input: string) => {
  const abiCoder = new ethers.utils.AbiCoder();
  const decodedParameters = abiCoder.decode(['address', 'uint256', 'uint256', 'bytes', 'bool'], input);
  const sub = input.substring(2).match(/.{1,64}/g);

  let path: string[] = [];
  let hasTwoPath = true;
  if (!sub) return;
  if (sub.length != 9) {
    const pathOne = '0x' + sub[sub.length - 2].substring(24);
    const pathTwo = '0x' + sub[sub.length - 1].substring(24);
    path = [pathOne, pathTwo];
  } else {
    hasTwoPath = false;
  }

  return {
    //@ts-expect-error
    recipient: parseInt(decodedParameters[(0, 16)]),
    amountIn: decodedParameters[1],
    minAmountOut: decodedParameters[2],
    path,
    hasTwoPath,
  };
};
const getAmountOut = (amountIn: BigNumber, reserveIn: BigNumber, reserveOut: BigNumber) => {
  const amountInWithFee = amountIn.mul(997); // Uniswap fee of 0.3%
  const numerator = amountInWithFee.mul(reserveOut);

  const denominator = reserveIn.mul(1000).add(amountInWithFee);
  const amountOut = numerator.div(denominator);
  return amountOut;
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const getAmountOutTaxToken = (isbuy: boolean, tax: number, amountIn: BigNumber, reserveIn: BigNumber, reserveOut: BigNumber) => {
  let amountInWithFee: BigNumber | undefined;
  if (isbuy) {
    amountInWithFee = amountIn.mul(9970); // Uniswap fee of 0.3%
  } else {
    amountInWithFee = amountIn.mul(9970 - tax);
  }

  const numerator = amountInWithFee?.mul(reserveOut);
  const denominator = reserveIn.mul(10000).add(amountInWithFee);
  let amountOut: BigNumber | undefined;
  if (isbuy) {
    amountOut = numerator
      .div(denominator)
      .mul(10000 - tax)
      .div(10000);
  } else {
    amountOut = numerator.div(denominator);
  }

  return amountOut;
};

const getAmounts = async (decoded: DecodedTransactionProps, txHash = ''): Promise<AmountsProps | undefined> => {
  const { transaction, amountIn, minAmountOut } = decoded;
  const pairs = await getPair(decoded.targetToken.address);
  if (!pairs) {
    console.log(`${txHash} Pair doesn't exist`);
    return;
  }
  const maxGasFee = transaction.maxFeePerGas ? transaction.maxFeePerGas.add(gasBribe ?? 0) : BigNumber.from(gasBribe);

  const priorityFee = transaction.maxPriorityFeePerGas ? transaction.maxPriorityFeePerGas.add(gasBribe ?? 0) : BigNumber.from(gasBribe);

  const firstAmountOut = getAmountOut(BigNumber.from(amountIn), pairs.token0, pairs.token1);

  const updatedReserveA = pairs.token0.add(amountIn);
  const updatedReserveB = pairs.token1.add(firstAmountOut.mul(997).div(1000));

  const secondBuyAmount = getAmountOut(amountIn, updatedReserveA, updatedReserveB);

  if (secondBuyAmount.lt(minAmountOut)) {
    console.log(`${txHash} Second Buy Small`);
    return;
  }
  const updatedReserveA2 = updatedReserveA.add(amountIn);
  const updatedReserveB2 = updatedReserveB.add(secondBuyAmount.mul(997).div(1000));

  const thirdAmountOut = getAmountOut(firstAmountOut, updatedReserveB2, updatedReserveA2);

  const wastedAmount = maxGasFee.add(BigNumber.from(maxGasFee)).mul(2).add(amountIn);
  const isProfit = thirdAmountOut.gt(wastedAmount);
  const profitAmount = thirdAmountOut.sub(wastedAmount);

  return {
    maxGasFee,
    priorityFee,
    firstAmountOut,
    secondBuyAmount,
    thirdAmountOut,
    isProfit,
    profitAmount,
  };
};

const getTokenDetail = async (address: string): Promise<TokenProps> => {
  const provider = new ethers.providers.JsonRpcProvider(httpProviderUrl);
  const tokenContract = new ethers.Contract(address, Erc20Abi, provider);
  const symbol = await tokenContract['symbol']();
  const decimals = await tokenContract['decimals']();
  return {
    address: address,
    symbol: symbol,
    decimals: decimals,
    active: true,
    taxToken: false,
    buyTax: 0,
    sellTax: 0,
    usdLimit: 0,
  };
};

const fromReadableAmount = (amount: number, decimals: number): BigNumber => {
  return ethers.utils.parseUnits(amount.toString(), decimals);
};

const toReadableAmount = (rawAmount: number, decimals: number): string => {
  return ethers.utils.formatUnits(rawAmount, decimals).slice(0, READABLE_FORM_LEN);
};

export { getPair, decodeSwap, getAmounts, toReadableAmount, fromReadableAmount, getTokenDetail, uniswapV2Router, erc20Factory };
