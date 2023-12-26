import { BigNumber } from 'ethers';
type PendinghistoryProps = {
  txhash: string;
  token: string;
  amount: BigNumber;
  isProfit: boolean;
  profit: BigNumber;
};

export default PendinghistoryProps;
