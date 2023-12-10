import { IsDefined } from 'class-validator';
import { TokenTrade } from '../uniswapV3.service';

export class TokenTradeDTO {
  @IsDefined()
  trade: TokenTrade;
}
