/* eslint-disable @typescript-eslint/no-unused-vars */
import { Logger } from '@nestjs/common';
import { Socket, Server } from 'socket.io';
import { LiveService } from './live.service';
import { SchedulerRegistry } from '@nestjs/schedule';
import { SubscribeMessage, WebSocketGateway, WebSocketServer, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';

@WebSocketGateway({ cors: '*:*' })
export class LiveGateway implements OnGatewayConnection, OnGatewayDisconnect {
  constructor(private schedulerRegistry: SchedulerRegistry, private readonly liveService: LiveService) {}

  @WebSocketServer()
  server: Server;

  private logger: Logger = new Logger('LiveGateway');

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  handleConnection(client: Socket, ...args: any[]) {
    this.logger.log(`Client connected: ${client.id}`);
    // this.liveService.getBotStatus();
  }

  @SubscribeMessage('message')
  handleMessage(client: any, payload: any): string {
    return 'Hello world!';
  }

  @SubscribeMessage('start')
  handleStart(client: any, payload: any): string {
    this.liveService.start();
    return 'false';
  }
}
