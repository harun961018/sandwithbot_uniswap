import { CacheModule, Module } from '@nestjs/common';
import { LiveService } from './live.service';
import { LiveGateway } from './live.gateway';
import { UniswapV3Service } from 'src/uniswapV3/uniswapV3.service';
import { FirebaseService } from 'src/firebase/firebase.service';
import { BinanceService } from 'src/binance/binance.service';

@Module({
  imports: [
    CacheModule.register({
      isGlobal: true,
    }),
  ],
  providers: [LiveGateway, LiveService, FirebaseService, UniswapV3Service, BinanceService],
})
export class LiveModule {}
