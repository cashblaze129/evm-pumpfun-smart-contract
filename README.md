# EVM PumpFun Smart Contract

A Solidity implementation of a PumpFun-style token launch platform with bonding curve mechanism for EVM-compatible blockchains.

## Overview

This project implements a decentralized token launch platform inspired by PumpFun, featuring:

- **Bonding Curve Mechanism**: Early buyers get better prices as tokens become more expensive over time
- **Automatic Graduation**: Tokens automatically graduate when they reach certain thresholds
- **Fee Structure**: Built-in trading fees and protocol fees
- **ERC20 Compatibility**: All tokens are standard ERC20 tokens
- **Creator Tracking**: Track all tokens created by each address

## Features

### Core Functionality
- ✅ Create new tokens with custom names, symbols, and metadata
- ✅ Buy tokens using ETH with bonding curve pricing
- ✅ Sell tokens back for ETH
- ✅ Automatic token graduation when price threshold is reached
- ✅ Fee collection (1% trading fee + 0.5% protocol fee)
- ✅ Emergency withdrawal function for contract owner

### Bonding Curve Formula
The bonding curve uses the constant product formula:
```
x * y = k
```
Where:
- `x` = Virtual ETH reserves
- `y` = Virtual token reserves  
- `k` = Constant product

### Token Graduation
Tokens automatically graduate when virtual token reserves reach 10% of the initial supply, making them available for listing on external DEXs.

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd evm-pumpfun
```

2. Install dependencies:
```bash
npm install
```

3. Create environment file:
```bash
cp env.example .env
```

4. Configure your environment variables in `.env`:
```env
TESTNET_RPC_URL=https://bsc-testnet.publicnode.com
MAINNET_RPC_URL=https://bsc.publicnode.com
PRIVATE_KEY=your_private_key_here
ETHERSCAN_API_KEY=your_etherscan_api_key_here
```

## Usage

### Compile Contracts
```bash
npm run compile
```

### Run Tests
```bash
npm test
```

### Deploy to Local Network
```bash
npx hardhat node
# In another terminal:
npm run deploy
```

### Deploy to Testnet
```bash
npm run deploy:testnet
```

### Deploy to Mainnet
```bash
npm run deploy:mainnet
```

## Contract Architecture

### PumpFun Contract
The main contract that handles:
- Token creation
- Token buying/selling
- Bonding curve calculations
- Fee management
- Token graduation

### PumpFunToken Contract
A custom ERC20 token contract that:
- Integrates with the PumpFun platform
- Allows the PumpFun contract to manage token transfers
- Maintains standard ERC20 functionality

## Key Functions

### Creating a Token
```solidity
function createToken(
    string memory name,
    string memory symbol,
    uint256 initialSupply,
    string memory metadataURI
) external returns (address)
```

### Buying Tokens
```solidity
function buyTokens(address tokenAddress) external payable
```

### Selling Tokens
```solidity
function sellTokens(address tokenAddress, uint256 tokenAmount) external
```

### Getting Token Price
```solidity
function getTokenPrice(address tokenAddress) external view returns (uint256)
```

## Bonding Curve Parameters

- **Virtual ETH Reserves**: 69,420,000,000 ETH
- **Virtual Token Reserves**: 1,000,000,000 tokens
- **Trading Fee**: 1%
- **Protocol Fee**: 0.5%
- **Graduation Threshold**: 10% of initial supply

## Security Features

- **ReentrancyGuard**: Prevents reentrancy attacks
- **Ownable**: Access control for admin functions
- **SafeMath**: Safe arithmetic operations
- **Input Validation**: Comprehensive input validation
- **Emergency Functions**: Emergency withdrawal capability

## Testing

The project includes comprehensive tests covering:
- Token creation
- Token buying/selling
- Price calculations
- Access control
- Edge cases and error conditions

Run tests with:
```bash
npm test
```

## Gas Optimization

The contracts are optimized for gas efficiency:
- Uses Solidity 0.8.19 with optimizer enabled
- Efficient storage layout
- Minimal external calls
- Optimized arithmetic operations

## Deployment

### Local Development
1. Start local Hardhat node: `npx hardhat node`
2. Deploy contracts: `npm run deploy`

### Testnet Deployment
1. Configure testnet RPC URL and private key in `.env`
2. Deploy: `npm run deploy:testnet`
3. Verify contract: `npx hardhat verify --network testnet <contract-address>`

### Mainnet Deployment
1. Configure mainnet RPC URL and private key in `.env`
2. Deploy: `npm run deploy:mainnet`
3. Verify contract: `npx hardhat verify --network mainnet <contract-address>`

## Supported Networks

This contract is compatible with all EVM-compatible networks including:
- Ethereum
- BSC (Binance Smart Chain)
- Polygon
- Avalanche
- Arbitrum
- Optimism
- And many more

## License

MIT License - see LICENSE file for details.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## Disclaimer

This is a smart contract implementation for educational and development purposes. Use at your own risk. Always audit contracts before deploying to mainnet.

## Support

For questions and support, please open an issue in the repository.
