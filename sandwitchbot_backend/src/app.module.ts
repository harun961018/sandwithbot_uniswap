import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { FireBaseModule } from './firebase/firebase.module';
import { LiveModule } from './live/live.module';

@Module({
  imports: [ScheduleModule.forRoot(), ConfigModule.forRoot(), BinanceModule, FireBaseModule, UniswapV3Module, LiveModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
