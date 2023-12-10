require("dotenv").config();
import TokenProps from "./types/TokenProps";
// const isMainnet = process.argv[2] == "mainnet";
const isMainnet = 1;
const chainId = isMainnet ? 1 : 5;

const privateKey = isMainnet
  ? process.env.MAINNET_WALLET_PRIVATE_KEY
  : process.env.TESTNET_WALLET_PRIVATE_KEY;

const httpProviderUrl = isMainnet
  ? process.env.MAINNET_NODE_URL
  : process.env.TESTNET_NODE_URL;

const wssProviderUrl = isMainnet
  ? process.env.MAINNET_NODE_URL_WSS
  : process.env.TESTNET_NODE_URL_WSS;

const uniswapUniversalRouterAddress = isMainnet
  ? "0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD"
  : "0x4648a43B2C14Da09FdF82B161150d3F634f40491";

const uniswapV2RouterAddress = isMainnet
  ? "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D"
  : "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";

const wETHAddress = isMainnet
  ? "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"
  : "0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6";

const uniswapV2FactoryAddress = isMainnet
  ? "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f"
  : "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984";

const gasBribe = process.env.GAS_BRIBE_IN_GWEI;
const buyAmount = process.env.BUY_AMOUNT_IN_WEI;
const gasLimit = process.env.GAS_LIMIT;

const tokenList: TokenProps[] = [
  {
    address: "0x2D9D7c64F6c00e16C28595ec4EbE4065ef3A250b",
    name: "GHY",
    decimal: 9,
    isTax: true,
    isStable: true,
    buyTax:20,
    sellTax: 20,   
  },
  {
    address: "0x2388821b40F3Ab780F09e97b42b7b577d37A6d5E",
    name: "Grok X",
    decimal: 18,
    isTax: true,
    isStable: true,
    buyTax: 0,
    sellTax:0,
  },
]


export {
  isMainnet,
  chainId,
  privateKey,
  wssProviderUrl,
  httpProviderUrl,
  uniswapUniversalRouterAddress,
  wETHAddress,
  uniswapV2FactoryAddress,
  uniswapV2RouterAddress,
  gasBribe,
  buyAmount,
  gasLimit,
  tokenList,
};
