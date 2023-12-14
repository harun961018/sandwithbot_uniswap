type TokenProps = {
  active: boolean;
  address: string;
  symbol: string;
  decimals: number;
  taxToken: boolean;
  buyTax: number;
  sellTax: number;
  usdLimit: number;
  };
  
  export default TokenProps;