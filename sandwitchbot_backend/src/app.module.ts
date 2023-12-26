import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { FireBaseModule } from './firebase/firebase.module';
import { FirebaseService } from './firebase/firebase.service';
import { LiveService } from './live/live.service';
import { LiveModule } from './live/live.module';
import { TokenModule } from './token/token.module';
@Module({
  imports: [ScheduleModule.forRoot(), ConfigModule.forRoot(), FireBaseModule, LiveModule, TokenModule],
  controllers: [AppController],
  providers: [AppService, FirebaseService, LiveService]
})
export class AppModule {}
