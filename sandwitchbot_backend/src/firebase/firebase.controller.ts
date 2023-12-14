import { Controller, Get, Put } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { FirebaseService } from './firebase.service';
import PendinghistoryProps from 'src/types/PendinghistoryProps';

@ApiTags('firebase')
@Controller('firebase')
export class FirebaseController {
  constructor(private readonly firebaseService: FirebaseService) {}

  @Get()
  async findAll() {
    return await this.firebaseService.findAll();
  }
  @Put()
  async addPendingHistory(pendingHistory: PendinghistoryProps) {
    return await this.firebaseService.addTradeHistory(pendingHistory)
  }
}
