import { Controller,  Get} from "@nestjs/common";
import { ApiTags } from '@nestjs/swagger';
import { LiveService } from './live.service';

@ApiTags('live')
@Controller('live')
export class LiveController {
  constructor(private readonly liveService: LiveService) {}

  @Get()
  async start() {
    return this.liveService.start();
  }
}