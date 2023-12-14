import { CacheModule, Module } from '@nestjs/common';
import { LiveService } from './live.service';
// import { LiveGateway } from './live.gateway';
import { FirebaseService } from 'src/firebase/firebase.service';
import { FireBaseModule } from 'src/firebase/firebase.module';
import { LiveController } from './live.controller';

@Module({
  imports: [
    CacheModule.register({
      isGlobal: true,
    }),
  ],
  controllers: [LiveController],
  providers: [LiveService, FirebaseService],

})
export class LiveModule {}
