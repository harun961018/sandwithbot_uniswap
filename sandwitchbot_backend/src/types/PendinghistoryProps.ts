import { BigNumber } from 'ethers';
type PendinghistoryProps = {
  txhash: string;
  token: string;
  amount: string;
  isProfit: boolean;
  profit: string;
  createdAt?: string;
};

export default PendinghistoryProps;
