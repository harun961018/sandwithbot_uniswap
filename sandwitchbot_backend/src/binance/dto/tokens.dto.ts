import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsBoolean, IsEthereumAddress } from 'class-validator';
export class TokensDto {
  @ApiProperty()
  @IsEthereumAddress()
  address: string;

  @ApiProperty()
  @IsString()
  symbol: string;

  @ApiProperty({ type: () => Boolean, default: true })
  @IsBoolean()
  active: boolean;
}
