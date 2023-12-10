import { CacheModule, Module } from '@nestjs/common';
import { LiveService } from './live.service';
import { LiveGateway } from './live.gateway';
import { FirebaseService } from 'src/firebase/firebase.service';

@Module({
  imports: [
    CacheModule.register({
      isGlobal: true,
    }),
  ],
  providers: [LiveGateway, LiveService, FirebaseService],
})
export class LiveModule {}
