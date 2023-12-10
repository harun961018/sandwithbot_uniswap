import { Token } from '@uniswap/sdk-core';
import * as IUniswapV3PoolABI from '@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json';
import { computePoolAddress, FeeAmount, FACTORY_ADDRESS } from '@uniswap/v3-sdk';
import { BigNumber, ethers } from 'ethers';

const READABLE_FORM_LEN = 6;

export function getTokenPair(token1: string, token2: string): string {
  const tokenPair = token1 + '/' + token2;
  return tokenPair;
}

export interface PoolInfo {
  token0: string;
  token1: string;
  fee: number;
  tickSpacing: number;
  sqrtPriceX96: ethers.BigNumber;
  liquidity: ethers.BigNumber;
  tick: number;
}

export interface CurrentConfig {
  tokens: {
    in: Token;
    out: Token;
    poolFee: FeeAmount;
  };
}

export async function getPoolInfo(currentConfig: CurrentConfig): Promise<PoolInfo> {
  const provider = new ethers.providers.JsonRpcProvider(process.env.RPC);
  if (!provider) {
    throw new Error('No provider');
  }
  const currentPoolAddress = computePoolAddress({
    factoryAddress: FACTORY_ADDRESS,
    tokenA: currentConfig.tokens.in,
    tokenB: currentConfig.tokens.out,
    fee: currentConfig.tokens.poolFee,
  });

  const poolContract = new ethers.Contract(currentPoolAddress, IUniswapV3PoolABI.abi, provider);

  const [token0, token1, fee, tickSpacing, liquidity, slot0] = await Promise.all([
    poolContract.token0(),
    poolContract.token1(),
    poolContract.fee(),
    poolContract.tickSpacing(),
    poolContract.liquidity(),
    poolContract.slot0(),
  ]);

  return {
    token0,
    token1,
    fee,
    tickSpacing,
    liquidity,
    sqrtPriceX96: slot0[0],
    tick: slot0[1],
  };
}

export const fromReadableAmount = (amount: number, decimals: number): BigNumber => {
  return ethers.utils.parseUnits(amount.toString(), decimals);
};

export function toReadableAmount(rawAmount: number, decimals: number): string {
  return ethers.utils.formatUnits(rawAmount, decimals).slice(0, READABLE_FORM_LEN);
}
