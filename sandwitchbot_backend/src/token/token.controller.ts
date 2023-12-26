import { Controller, Get, Param } from '@nestjs/common';
import { TokenService } from './token.service';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Token')
@Controller('token')
export class TokenController {
  constructor(private readonly tokenService: TokenService) {}

  @Get('approve/:address')
  approve(@Param('address') address: string) {
    return this.tokenService.approve(address);
  }
}
