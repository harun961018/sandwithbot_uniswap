
import { Injectable } from '@nestjs/common';
import TokenProps from 'src/types/TokenProps';
import decodeTransaction from 'src/core/decodeTransaction';
import { ethers } from 'ethers';
import { httpProviderUrl, wssProviderUrl } from 'src/core/constants';
import { FirebaseService } from 'src/firebase/firebase.service';
import { getAmounts } from 'src/utils';
import PendinghistoryProps from 'src/types/PendinghistoryProps';
import sandwichTransaction from 'src/core/sandwichTransaction';
@Injectable()
export class LiveService {
   constructor(private firebaseService: FirebaseService) {
    
   }
   
   async start() {
    const activedTokenLists: TokenProps[] = await this.firebaseService.findAll()
    // const wssProvider = new ethers.providers.WebSocketProvider(wssProviderUrl)
    // wssProvider.on("pending", (txhash:string) => this.handleTranasaction(txhash, activedTokenLists));
    this.handleTranasaction("0x59478cd2f33c678008da0ef36d8c3af2e2415cda3019807635cbd73902b35934", activedTokenLists)
   }

   async handleTranasaction (txHash: string,  activedTokenLists: TokenProps[]) {
    const provider = new ethers.providers.JsonRpcProvider(httpProviderUrl)
    
    try {
        console.log("hashg", txHash)
        const targetTransaction = await provider.getTransaction(txHash);
        const decoded = await decodeTransaction(targetTransaction, activedTokenLists)
        const transactionStatus =await getAmounts(decoded);
        console.log("transactionStatus", transactionStatus)
        const pendingHistory: PendinghistoryProps = {
            txhash: txHash,
            token: decoded.targetToken.symbol,
            amount: decoded.amountIn,
            isProfit: transactionStatus.isProfit,
            profit: transactionStatus.profitAmount
        }

        const addingPendingHistory: any = await this.firebaseService.addTradeHistory(pendingHistory)
        if (pendingHistory.isProfit) {
            const result = sandwichTransaction(decoded, transactionStatus)
        }

    } catch(error) {
        console.log(error)
    }

   } 
}