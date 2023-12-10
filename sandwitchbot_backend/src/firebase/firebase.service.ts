import { Injectable } from '@nestjs/common';
import { initializeApp } from '@firebase/app';
import * as firebase from '@firebase/database';

import { IToken } from 'src/types/token.interface';
import { IHistory, TradeStatus } from 'src/types/history.interface';

@Injectable()
export class FirebaseService {
  private readonly db: firebase.Database;
  constructor() {
    const app = initializeApp({
      apiKey: process.env.FIREBASE_API_KEY,
      appId: process.env.FIREBASE_API_ID,
      authDomain: process.env.FIREBASE_AUTH_DOMAIN,
      databaseURL: process.env.FIREBASE_DATABASE_URL,
      measurementId: process.env.FIREBASE_MEASUREMENT_ID,
      messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
      projectId: process.env.FIREBASE_PROJECT_ID,
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    });
    this.db = firebase.getDatabase(app);
  }

  async findAll(): Promise<IToken[]> {
    const dbref = firebase.ref(this.db, process.env.FIREBASE_COLLECTION_NAME);
    const collections = await firebase.get(dbref);

    return Object.values(collections.val());
  }

  async getTradeHistory(): Promise<{ key: string; value: IHistory }> {
    const historyRef = firebase.ref(this.db, process.env.FIREBASE_TRADE_HISTORY);
    const res = (await firebase.get(historyRef)).val();
    if (!res) return null;

    const keys: Array<string> = Object.keys(res);
    const pendingTrades = keys.filter((key) => res[key].totalStatus != TradeStatus.Success && res[key].totalStatus != TradeStatus.Failed);
    if (pendingTrades.length > 0) {
      return { key: pendingTrades[0], value: res[pendingTrades[0]] };
    }
    return null;
  }

  async addTradeHistory(history: IHistory): Promise<any> {
    const historyRef = firebase.ref(this.db, process.env.FIREBASE_TRADE_HISTORY);
    const res = (await firebase.get(historyRef)).val();

    if (!res) {
      const snap = await firebase.push(historyRef, history);
      return snap.key;
    }

    const docs: Array<IHistory> = Object.values(res);
    const pendingTrades = docs.filter(
      (doc) => doc.totalStatus != TradeStatus.Success && doc.totalStatus != TradeStatus.Failed && doc.token0.address == history.token0.address,
    );

    if (pendingTrades.length > 0) {
      console.log('Trading is already in execution progress');
      return false;
    } else {
      console.log('One new trading is opened');
      const snap = await firebase.push(historyRef, history);
      return snap.key;
    }
  }

  async updateTradeHistory(key: string, history: any): Promise<void> {
    const historyRef = firebase.ref(this.db, `${process.env.FIREBASE_TRADE_HISTORY}/${key}`);
    await firebase.update(historyRef, history);
  }
}
