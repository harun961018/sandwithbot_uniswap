import { Module } from '@nestjs/common';
import { CcxtModule } from 'nestjs-ccxt';
import { BinanceController } from './binance.controller';
import { BinanceService } from './binance.service';
import { FirebaseService } from 'src/firebase/firebase.service';

@Module({
  imports: [CcxtModule.forRoot()],
  controllers: [BinanceController],
  providers: [BinanceService, FirebaseService],
})
export class BinanceModule {}
