import { ethers, BigNumber } from 'ethers';
import { Currency, CurrencyAmount, Token, TradeType } from '@uniswap/sdk-core';
import { Route, SwapQuoter } from '@uniswap/v3-sdk';

import * as ERC20_ABI from '../utils/abi/erc20.abi.json';
import { fromReadableAmount } from '../utils/uniswapV3';
import { QUOTER_CONTRACT_ADDRESS, TOKEN_AMOUNT_TO_APPROVE_FOR_TRANSFER, V3_SWAP_ROUTER_ADDRESS } from './constants';

export enum TransactionState {
  Failed = 'Failed',
  New = 'New',
  Rejected = 'Rejected',
  Sending = 'Sending',
  Sent = 'Sent',
}

export function getProvider(): ethers.providers.Provider | null {
  return new ethers.providers.JsonRpcProvider(process.env.RPC);
}

export function getWallet(): ethers.Wallet {
  const provider = getProvider();
  return new ethers.Wallet(process.env.PRIVATE_KEY, provider);
}

export async function getEstimateGas(transaction: ethers.providers.TransactionRequest): Promise<ethers.BigNumber> {
  if (transaction.value) {
    transaction.value = BigNumber.from(transaction.value);
  }
  const wallet = getWallet();
  const gas = await wallet.estimateGas(transaction);
  return gas;
}

export async function sendTransaction(transaction: ethers.providers.TransactionRequest): Promise<ethers.providers.TransactionReceipt> {
  if (transaction.value) {
    transaction.value = BigNumber.from(transaction.value);
  }
  return sendTransactionViaWallet(transaction);
}

export async function sendTransactionViaWallet(transaction: ethers.providers.TransactionRequest): Promise<ethers.providers.TransactionReceipt> {
  const provider = getProvider();
  if (!provider) {
    return null;
  }
  if (transaction.value) {
    transaction.value = BigNumber.from(transaction.value);
  }
  const wallet = getWallet();
  const txRes = await wallet.sendTransaction(transaction);

  let receipt = null;

  while (receipt === null) {
    try {
      receipt = await provider.getTransactionReceipt(txRes.hash);

      if (receipt === null) {
        continue;
      }
    } catch (e) {
      console.log(`Receipt error:`, e);
      break;
    }
  }
  return receipt;

  // Transaction was successful if status === 1
  // if (receipt) {
  //   return TransactionState.Sent;
  // } else {
  //   return TransactionState.Failed;
  // }
}

export async function getOutputQuote(route: Route<Currency, Currency>, tokenIn: Token, tokenInAmount: number) {
  const provider = getProvider();

  if (!provider) {
    throw new Error('Provider required to get pool state');
  }

  const { calldata } = await SwapQuoter.quoteCallParameters(
    route,
    CurrencyAmount.fromRawAmount(tokenIn, fromReadableAmount(tokenInAmount, tokenIn.decimals).toString()),
    TradeType.EXACT_INPUT,
    {
      useQuoterV2: true,
    },
  );

  const quoteCallReturnData = await provider.call({
    to: QUOTER_CONTRACT_ADDRESS,
    data: calldata,
  });

  return ethers.utils.defaultAbiCoder.decode(['uint256'], quoteCallReturnData);
}

export async function getTokenTransferApproval(token: Token): Promise<boolean> {
  const provider = getProvider();
  const address = getWallet();
  if (!provider || !address) {
    console.log('No Provider Found');
    return null;
  }

  try {
    const tokenContract = new ethers.Contract(token.address, ERC20_ABI, provider);

    const allowanceCount = await tokenContract.functions['allowance'](address.getAddress(), V3_SWAP_ROUTER_ADDRESS);
    if (Number(allowanceCount.toString()) > 0) {
      return true;
    }

    const transaction = await tokenContract.populateTransaction.approve(
      V3_SWAP_ROUTER_ADDRESS,
      fromReadableAmount(TOKEN_AMOUNT_TO_APPROVE_FOR_TRANSFER, token.decimals).toString(),
    );
    const res = await sendTransaction({
      ...transaction,
      gasLimit: 210000,
      from: await address.getAddress(),
    });
    if (res && res.status) {
      return true;
    } else {
      return false;
    }
  } catch (e) {
    console.error(e);
    return null;
  }
}
