# BHG-Flash-Swap-bot-Ethereum version

This is Multi Dex arbitrage bot between uniswap sushiswap and defiswap.
## Usage
======================

1. input variable to src/components/config.js
    please input you wallet address and wallet private key.
```
    export const walletAddress = ""
    export const walletPrivate = ""
    export const web3url = "https://mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161"
    export const uniswap = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D"
    export const sushiswap = "0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F"
    export const wethaddress = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"
    export const autoProfit = "0.1" 
    export const autoAmount = "1"
    export const autotime = "30000"
    export const autoGasLimit = "500000"
    export const autoGasValue = "50"
    export const autoSlippage = "100"
```

1. install Dapp's enviroments(node_module) 
```
$ npm install
```
2. run dapp
```
$ npm run start

```

next step run Dapp and input your token address to be listed.
3.  input trade amount and press get amount buttton for getting price of tokens from each Dex.
4.  input your wallet address and private key.(if you don't input your wallet address and private key to address)
5.  Press start auto trade button and, in modal input interval, slippage and profit limit. and start.
6.  in log channel you can check about transaction's detail informations
This Dapp for mainnet, So if you want test on testnet please modifiy some variables. web3url, and other addresses.