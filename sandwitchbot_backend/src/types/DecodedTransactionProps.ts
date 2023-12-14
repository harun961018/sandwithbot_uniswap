import { BigNumber, Transaction } from "ethers";
import TokenProps from "./TokenProps";

type DecodedTransactionProps = {
  transaction: Transaction;
  amountIn: BigNumber;
  minAmountOut: BigNumber;
  targetToken: TokenProps | undefined;
  // targetToken: string;
};

export default DecodedTransactionProps;