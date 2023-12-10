require('babel-register');
require('babel-polyfill');
var HDWalletProvider = require("truffle-hdwallet-provider");
const MNEMONIC = '75333e7ecb1038c31a3d206f054ab9863593ee02d763ae828becc4c346545c7e';

module.exports = {
  // networks: {
  //   development: {
  //     host: "127.0.0.1",
  //     port: 7545,
  //     network_id: "*" // Match any network id
  //   },
  //   ropsten: {
  //     provider: function() {
  //       return new HDWalletProvider(MNEMONIC, "https://ropsten.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161")
  //     },
  //     networkCheckTimeout: 100000,
  //     network_id: 3,
  //     gas: 4000000      //make sure this gas allocation isn't over 4M, which is the max
  //   }
  // },
  networks: {
    development: {
      host: "localhost",
      port: 7545,
      network_id: "*" // Match any network id
    },
    ropsten:  {
      network_id: 3,
      host: "localhost",
      port:  8545,
      gas:   2900000
    }
  },
  rpc: {
    host: 'localhost',
    post:8080
  },
  contracts_directory: './src/contracts/',
  contracts_build_directory: './src/abis/',
  compilers: {
    solc: {
      version : "0.4.18",
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  }
}
