# Staking MCP

A Model Context Protocol server for BNB staking and Venus Protocol lending/borrowing on BSC network.

## Features

- Lista DAO liquid staking (BNB → slisBNB)
- KernelDAO additional staking rewards
- Venus Protocol lending and borrowing
- Portfolio management and APY tracking
- Support for both Core and Liquid Staked BNB pools

## Installation & Setup

### 1. Install globally
```bash
npm install -g staking-mcp
```

### 2. Set up environment variables
Create a `.env` file in your working directory:
```bash
WALLET_PRIVATE_KEY=your_private_key_here
WALLET_ADDRESS=your_wallet_address_here
```

**⚠️ Security Note:** Keep your private key secure and never share it publicly.

### 3. Configure MCP Client

Add to your MCP client configuration (e.g., Claude Desktop):


**Alternative using npx:**
```json
{
  "mcpServers": {
    "bsc-defi": {
      "command": "node",
      "args": ["G:/beramcp/staking-mcp/index.js"],
      "env": {
        "WALLET_PRIVATE_KEY": "",
        "WALLET_ADDRESS": "",
        "LIFI_API_KEY": ""
      }
    }
  }
}
```

## Available Tools

### Staking Operations
- `listadaoStakeBNB` - Stake BNB to get slisBNB
- `listadaoUnstakeBNB` - Unstake slisBNB to get BNB
- `stakeslisBNBKernelDAO` - Stake slisBNB to KernelDAO for additional yield
- `unstakeslisBNBKernelDAO` - Unstake from KernelDAO

### Venus Protocol
- `venusLEND` - Lend assets to Venus Protocol
- `venusBORROW` - Borrow against collateral
- `venusREPAY` - Repay borrowed amounts
- `venusWITHDRAW` - Withdraw supplied collateral
- `venusPORTFOLIO` - View complete portfolio

### Information & Monitoring
- `getAPY` - Get current APY rates for DeFi pools
- `checkBNBBalance` - Check BNB balance
- `checkSlisBNBBalance` - Check slisBNB balance
- `checkKERNELDAOSTAKE` - Check KernelDAO staked balance

## Requirements

- Node.js 18+
- BSC wallet with BNB for gas fees
- Private key for transaction signing

## Security

- Your private key stays local and is never shared
- All transactions happen on-chain via BSC network
- Open source and auditable code

## Support

For issues and questions, please visit: [GitHub Issues](https://github.com/PlayAINetwork/bsc-yield/issues)