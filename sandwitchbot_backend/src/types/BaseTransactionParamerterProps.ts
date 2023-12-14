import { BigNumber } from "ethers";
import TokenProps from "./TokenProps";

type BaseTransactionParamerterProps = {
  amountIn: BigNumber;
  minAmountOut: BigNumber;
  // targetToken: string;
  targetToken: TokenProps | undefined;
};

export default BaseTransactionParamerterProps;