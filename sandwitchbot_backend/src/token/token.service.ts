import { Injectable } from '@nestjs/common';
import { BigNumber, ethers } from 'ethers';
import { httpProviderUrl, uniswapV2RouterAddress } from 'src/core/constants';
import { fromReadableAmount } from 'src/utils';
import Erc20Abi from '../abi/ERC20.json';

@Injectable()
export class TokenService {
  async approve(address: string) {
    console.log(address);
    const provider = ethers.getDefaultProvider(httpProviderUrl);
    const tokenContract = new ethers.Contract(address, Erc20Abi, provider);
    const wallet = new ethers.Wallet(process.env.MAINNET_WALLET_PRIVATE_KEY, provider);
    const transaction = await tokenContract.populateTransaction.approve(uniswapV2RouterAddress, fromReadableAmount(2000000, 18).toString());
    if (transaction.value) {
      transaction.value = BigNumber.from(transaction.value);
    }
    await wallet.sendTransaction({
      ...transaction,
      gasLimit: 210000,
      from: await wallet.getAddress(),
    });
    return 'sucess';
  }
}
