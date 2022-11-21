export const Common_ABI = [
  {
    "inputs": [],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "tokenAddress",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "tokenReverse",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "usdtReverse",
        "type": "uint256"
      }
    ],
    "name": "_calTokenPrice",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "tokenPrice",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "priceDecimals",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "swapRouter",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "tokenAddress",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "usdtAddress",
        "type": "address"
      }
    ],
    "name": "_getTokenPrice",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "tokenPrice",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "priceDecimals",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "tokenReserve",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "claimETH",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "token",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "claimToken",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "swapRouter",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "tokenA",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "tokenB",
        "type": "address"
      }
    ],
    "name": "getReserves",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "reverseA",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "reverseB",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "tokenAddress",
        "type": "address"
      }
    ],
    "name": "getTokenInfo",
    "outputs": [
      {
        "internalType": "string",
        "name": "symbol",
        "type": "string"
      },
      {
        "internalType": "uint256",
        "name": "decimals",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "totalSupply",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address[]",
        "name": "tokenAddress",
        "type": "address[]"
      }
    ],
    "name": "getTokenInfos",
    "outputs": [
      {
        "internalType": "string[]",
        "name": "symbol",
        "type": "string[]"
      },
      {
        "internalType": "uint256[]",
        "name": "decimals",
        "type": "uint256[]"
      },
      {
        "internalType": "uint256[]",
        "name": "totalSupply",
        "type": "uint256[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "swapRouter",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "tokenAddress",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "usdtAddress",
        "type": "address"
      },
      {
        "internalType": "address[]",
        "name": "others",
        "type": "address[]"
      }
    ],
    "name": "getTokenPrice",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "tokenPrice",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "priceDecimals",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "pairOther",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "maxTokenReserve",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "otherReverse",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "swapRouter",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "otherTokenAddress",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "usdtAddress",
        "type": "address"
      }
    ],
    "name": "getUsdtReverse",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "usdtReserve",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "owner",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "stateMutability": "payable",
    "type": "receive"
  }
]