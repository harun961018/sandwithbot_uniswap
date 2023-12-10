import { Module } from '@nestjs/common';
import { CcxtModule } from 'nestjs-ccxt';
import { UniswapV3Controller } from './uniswapV3.controller';
import { UniswapV3Service } from './uniswapV3.service';
import { FirebaseService } from 'src/firebase/firebase.service';

@Module({
  imports: [CcxtModule.forRoot()],
  controllers: [UniswapV3Controller],
  providers: [UniswapV3Service, FirebaseService],
})
export class UniswapV3Module {}
