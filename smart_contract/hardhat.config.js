require('@nomiclabs/hardhat-waffle');

module.exports = {
  solidity: '0.8.0',
  networks: {
    ropsten: {
      url: 'https://eth-ropsten.alchemyapi.io/v2/ta9V3fI9bEUNbGrfy3PAS0dgCv6kmRiE',
      accounts: ['1977998f3df0950eba34d4235952dd863bc7ba8505e4d083a121808e5d241a29'],
    },
  },
};