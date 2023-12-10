type TokenProps = {
    address: string;
    name: string ;
    decimal: number;
    isTax: boolean;
    isStable: boolean;
    buyTax: number;
    sellTax: number;
  };
  
  export default TokenProps;