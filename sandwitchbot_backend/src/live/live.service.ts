import { Injectable } from '@nestjs/common';
import TokenProps from 'src/types/TokenProps';
import decodeTransaction from 'src/core/decodeTransaction';
import { ethers } from 'ethers';
import { httpProviderUrl, wssProviderUrl } from 'src/core/constants';
import { FirebaseService } from 'src/firebase/firebase.service';
import { getAmounts, toReadableAmount } from 'src/utils';
import PendinghistoryProps from 'src/types/PendinghistoryProps';
import sandwichTransaction from 'src/core/sandwichTransaction';
import { Server } from 'socket.io';
@Injectable()
export class LiveService {
  constructor(private firebaseService: FirebaseService) {}

  public botStatus = false;
  public server: Server = null;
  public fromList = Boolean(process.env.FROM_LIST) || true;

  async start() {
    const activedTokenLists: TokenProps[] = await this.firebaseService.findAll();
    const wssProvider = new ethers.providers.WebSocketProvider(wssProviderUrl);
    if (!this.botStatus) {
      wssProvider.on('pending', (txhash: string) => this.handleTranasaction(txhash, activedTokenLists));
      this.botStatus = true;
      console.log('started.....');
    }
  }

  async handleTranasaction(txHash: string, activedTokenLists: TokenProps[]) {
    const provider = new ethers.providers.JsonRpcProvider(httpProviderUrl);

    try {
      const targetTransaction = await provider.getTransaction(txHash);
      const decoded = await decodeTransaction(targetTransaction, activedTokenLists, txHash, this.fromList);
      if (!decoded) return;
      const transactionStatus = await getAmounts(decoded, txHash);
      console.log(txHash, transactionStatus);
      const pendingHistory: PendinghistoryProps = {
        txhash: txHash,
        token: decoded.targetToken.symbol,
        amount: ethers.utils.formatEther(decoded.amountIn),
        // amount: Math.abs(Number(toReadableAmount(Number(decoded.amountIn.toString()), 18))),
        isProfit: transactionStatus.isProfit,
        profit: ethers.utils.formatEther(transactionStatus.profitAmount),
        // profit: Math.abs(Number(toReadableAmount(Number(transactionStatus.profitAmount.toString()), 18))),
        createdAt: new Date().toISOString(),
      };
      console.log('pendingHistory', pendingHistory);

      const addingPendingHistory: any = await this.firebaseService.addTradeHistory(pendingHistory);
      // if (pendingHistory.isProfit) {
      //     const result = sandwichTransaction(decoded, transactionStatus)
      // }
    } catch (error) {}
  }

  getBotStatus() {
    this.server.emit('bot-status', { status: this.botStatus });
  }
}
