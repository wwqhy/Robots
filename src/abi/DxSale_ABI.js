export const DxSale_ABI = [
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "name": "presaleOwners",
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
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "presales",
    "outputs": [
      {
        "internalType": "bool",
        "name": "exists",
        "type": "bool"
      },
      {
        "internalType": "uint256",
        "name": "createdOn",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "presaleInfoAddr",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "tokenAddress",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "presaleAddress",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "governor",
        "type": "address"
      },
      {
        "internalType": "bool",
        "name": "active",
        "type": "bool"
      },
      {
        "internalType": "uint256",
        "name": "startTime",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "endTime",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "govPercentage",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "uniswapDep",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "uniswapPercentage",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "uniswapRate",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "lp_locked",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
]