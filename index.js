const { McpServer } = require("@modelcontextprotocol/sdk/server/mcp.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");
const { z } = require("zod");
const { ethers } = require("ethers");

const CHAIN_CONFIG = {
  chainId: 56,
  rpcUrl: "https://bsc.llamarpc.com",
  name: "BSC",
  nativeToken: {
    symbol: "BNB",
    name: "BNB",
    decimals: 18
  }
};

const CONTRACTS = {
  STAKE_MANAGER: {
    address: "0x1adB950d8bB3dA4bE104211D5AB038628e477fE6",
    abi: [
      "function deposit() payable",
      "function claimWithdraw(uint256 _withdrawalId)",
      "function requestWithdraw(uint256 _amount) returns (uint256)",
      "function getTotalPooledBnb() view returns (uint256)",
      "function getTotalShares() view returns (uint256)",
      "function getSharesByPooledBnb(uint256 _bnbAmount) view returns (uint256)",
      "function getPooledBnbByShares(uint256 _sharesAmount) view returns (uint256)",
      "function sharesOf(address _account) view returns (uint256)",
      "event Deposited(address indexed sender, uint256 amount, uint256 shares)",
      "event WithdrawRequested(address indexed user, uint256 amount, uint256 withdrawalId)"
    ]
  },
  SLISBNB_TOKEN: {
    address: "0xB0b84D294e0C75A6abe60171b70edEb2EFd14A1B",
    abi: [
      "function balanceOf(address owner) view returns (uint256)",
      "function approve(address spender, uint256 amount) returns (bool)",
      "function allowance(address owner, address spender) view returns (uint256)",
      "function symbol() view returns (string)",
      "function decimals() view returns (uint8)",
      "function totalSupply() view returns (uint256)",
      "function transfer(address to, uint256 amount) returns (bool)"
    ]
  },
  KERNEL_DAO: {
    address: "0xb32dF5B33dBCCA60437EC17b27842c12bFE83394",
    abi: [
      "function stake(address asset, uint256 amount, string calldata referralId) external",
      "function stakeNative(string calldata referralId) external payable",
      "function unstake(address asset, uint256 amount, string calldata referralId) external",
      "function unstakeNative(uint256 amount, string calldata referralId) external",
      "function balanceOf(address asset, address owner) external view returns (uint256)",
      "event Staked(address indexed user, address indexed asset, uint256 amount)",
      "event Unstaked(address indexed user, address indexed asset, uint256 amount)"
    ]
  }
};

const MIN_BNB_STAKE = ethers.parseEther("0.0001");

const WALLET_PRIVATE_KEY = process.env.WALLET_PRIVATE_KEY;
const WALLET_ADDRESS = process.env.WALLET_ADDRESS;

const server = new McpServer({
  name: "BNB Staking Workflow MCP",
  version: "1.0.0",
  description: "MCP server for automated BNB staking workflow to slisBNB and KernelDAO"
});

function getProvider() {
  try {
    return new ethers.JsonRpcProvider(CHAIN_CONFIG.rpcUrl);
  } catch (error) {
    throw new Error(`Failed to connect to BSC: ${error.message}`);
  }
}

function formatBalance(balance, decimals = 18) {
  return ethers.formatUnits(balance, decimals);
}

function isValidAddress(address) {
  return ethers.isAddress(address);
}

function getWallet() {
  if (!WALLET_PRIVATE_KEY) {
    throw new Error("WALLET_PRIVATE_KEY not set in environment");
  }
  
  const provider = getProvider();
  const wallet = new ethers.Wallet(WALLET_PRIVATE_KEY, provider);
  
  if (WALLET_ADDRESS && wallet.address.toLowerCase() !== WALLET_ADDRESS.toLowerCase()) {
    throw new Error("WALLET_ADDRESS does not match the private key");
  }
  
  return wallet;
}

// Tool 1: Stake BNB to get slisBNB
server.tool(
  "STAKE_BNB_TO_SLISBNB",
  "Stake BNB to Lista DAO to get slisBNB tokens",
  {
    amountBNB: z.string().optional().describe("Amount of BNB to stake (optional, defaults to all available minus gas)")
  },
  async ({ amountBNB }) => {
    try {
      const wallet = getWallet();
      const walletAddress = wallet.address;

      const bnbBalance = await wallet.provider.getBalance(walletAddress);
      const formattedBalance = formatBalance(bnbBalance);

      if (bnbBalance < MIN_BNB_STAKE) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              status: "error",
              step: "CHECK_BNB_BALANCE",
              message: "Insufficient BNB balance",
              required: formatBalance(MIN_BNB_STAKE),
              current: formattedBalance,
              walletAddress
            }, null, 2)
          }]
        };
      }

      let stakeAmount;
      if (amountBNB) {
        stakeAmount = ethers.parseEther(amountBNB);
        if (stakeAmount > bnbBalance) {
          return {
            content: [{
              type: "text",
              text: JSON.stringify({
                status: "error",
                message: "Requested stake amount exceeds available balance",
                requested: amountBNB,
                available: formattedBalance
              }, null, 2)
            }]
          };
        }
      } else {
        const gasReserve = ethers.parseEther("0.0001");
        stakeAmount = bnbBalance - gasReserve;
      }

      const slisBNBToken = new ethers.Contract(
        CONTRACTS.SLISBNB_TOKEN.address,
        CONTRACTS.SLISBNB_TOKEN.abi,
        wallet
      );
      
      const initialSlisBNBBalance = await slisBNBToken.balanceOf(walletAddress);

      const stakeManager = new ethers.Contract(
        CONTRACTS.STAKE_MANAGER.address,
        CONTRACTS.STAKE_MANAGER.abi,
        wallet
      );

      console.log(`Staking ${formatBalance(stakeAmount)} BNB via deposit()...`);
      const stakeTx = await stakeManager.deposit({ value: stakeAmount });
      const stakeReceipt = await stakeTx.wait();
      console.log(`Staking transaction confirmed: ${stakeReceipt.hash}`);

      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const newSlisBNBBalance = await slisBNBToken.balanceOf(walletAddress);
      const slisBNBReceived = newSlisBNBBalance - initialSlisBNBBalance;

      if (slisBNBReceived <= 0n) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              status: "error",
              step: "CHECK_SLISBNB_BALANCE",
              message: "Failed to receive slisBNB from staking",
              stakeTxHash: stakeReceipt.hash,
              walletAddress,
              initialBalance: formatBalance(initialSlisBNBBalance),
              newBalance: formatBalance(newSlisBNBBalance)
            }, null, 2)
          }]
        };
      }

      console.log(`Received ${formatBalance(slisBNBReceived)} slisBNB`);

      const result = {
        status: "success",
        message: "Successfully staked BNB to Lista DAO and received slisBNB",
        step1_completed: {
          amountStaked: formatBalance(stakeAmount),
          slisBNBReceived: formatBalance(slisBNBReceived),
          txHash: stakeReceipt.hash,
          blockNumber: stakeReceipt.blockNumber,
          gasUsed: stakeReceipt.gasUsed.toString()
        },
        walletAddress,
        timestamp: new Date().toISOString(),
        nextStep: "Execute STAKE_SLISBNB_TO_KERNELDAO to complete the workflow"
      };

      console.log("Automatically executing KernelDAO staking...");
      const kernelResult = await executeKernelDAOStaking(wallet, slisBNBReceived);
      
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            ...result,
            step2_auto_executed: kernelResult
          }, null, 2)
        }]
      };

    } catch (error) {
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            status: "error",
            message: `BNB to slisBNB staking failed: ${error.message}`,
            details: error.stack
          }, null, 2)
        }]
      };
    }
  }
);

// Tool 2: Stake slisBNB to KernelDAO
server.tool(
  "STAKE_SLISBNB_TO_KERNELDAO",
  "Stake slisBNB tokens to KernelDAO",
  {
    amount: z.string().optional().describe("Amount of slisBNB to stake (optional, defaults to all available)")
  },
  async ({ amount }) => {
    try {
      const wallet = getWallet();
      return await executeKernelDAOStaking(wallet, amount);
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            status: "error",
            message: `slisBNB to KernelDAO staking failed: ${error.message}`,
            details: error.stack
          }, null, 2)
        }]
      };
    }
  }
);

async function executeKernelDAOStaking(wallet, slisBNBAmount = null) {
  const walletAddress = wallet.address;

  const slisBNBToken = new ethers.Contract(
    CONTRACTS.SLISBNB_TOKEN.address,
    CONTRACTS.SLISBNB_TOKEN.abi,
    wallet
  );

  let stakeAmount;
  if (slisBNBAmount && typeof slisBNBAmount === 'bigint') {
    stakeAmount = slisBNBAmount;
  } else if (slisBNBAmount && typeof slisBNBAmount === 'string') {
    stakeAmount = ethers.parseEther(slisBNBAmount);
  } else {
    const slisBNBBalance = await slisBNBToken.balanceOf(walletAddress);
    stakeAmount = slisBNBBalance;
  }

  if (stakeAmount <= 0n) {
    return {
      status: "error",
      message: "No slisBNB balance available for staking",
      walletAddress
    };
  }

  const kernelDAO = new ethers.Contract(
    CONTRACTS.KERNEL_DAO.address,
    CONTRACTS.KERNEL_DAO.abi,
    wallet
  );

  console.log("Approving KernelDAO to spend slisBNB...");
  const approveTx = await slisBNBToken.approve(
    CONTRACTS.KERNEL_DAO.address,
    stakeAmount
  );
  await approveTx.wait();

  console.log(`Staking ${formatBalance(stakeAmount)} slisBNB on KernelDAO...`);
  const kernelStakeTx = await kernelDAO.stake(
    CONTRACTS.SLISBNB_TOKEN.address,
    stakeAmount,
    "" 
  );
  const kernelStakeReceipt = await kernelStakeTx.wait();
  console.log(`KernelDAO staking transaction confirmed: ${kernelStakeReceipt.hash}`);

  const kernelStakedBalance = await kernelDAO.balanceOf(
    CONTRACTS.SLISBNB_TOKEN.address,
    walletAddress
  );

  return {
    status: "success",
    message: "Successfully staked slisBNB to KernelDAO",
    kerneldao_staking: {
      amountStaked: formatBalance(stakeAmount),
      txHash: kernelStakeReceipt.hash,
      blockNumber: kernelStakeReceipt.blockNumber,
      totalStakedInKernel: formatBalance(kernelStakedBalance),
      gasUsed: kernelStakeReceipt.gasUsed.toString()
    },
    walletAddress,
    timestamp: new Date().toISOString()
  };
}

// Tool: Check BNB balance
server.tool(
  "CHECK_BNB_BALANCE",
  "Check BNB balance (uses configured wallet or provided address)",
  {
    walletAddress: z.string().optional().describe("Wallet address to check (optional, uses configured wallet if not provided)")
  },
  async ({ walletAddress }) => {
    try {
      const addressToCheck = walletAddress || WALLET_ADDRESS || (WALLET_PRIVATE_KEY ? getWallet().address : null);
      
      if (!addressToCheck) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              status: "error",
              message: "No wallet address provided and no wallet configured"
            }, null, 2)
          }]
        };
      }

      if (!isValidAddress(addressToCheck)) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              status: "error",
              message: "Invalid wallet address format",
              walletAddress: addressToCheck
            }, null, 2)
          }]
        };
      }

      const provider = getProvider();
      const balance = await provider.getBalance(addressToCheck);
      const formattedBalance = formatBalance(balance);

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            walletAddress: addressToCheck,
            balance: {
              BNB: formattedBalance,
              wei: balance.toString()
            },
            hasMinimumForStaking: balance >= MIN_BNB_STAKE,
            minimumRequired: formatBalance(MIN_BNB_STAKE),
            chain: CHAIN_CONFIG.name,
            isConfiguredWallet: addressToCheck === (WALLET_ADDRESS || (WALLET_PRIVATE_KEY ? getWallet().address : null)),
            timestamp: new Date().toISOString()
          }, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            status: "error",
            message: `Failed to check balance: ${error.message}`
          }, null, 2)
        }]
      };
    }
  }
);

// Tool: Check slisBNB balance
server.tool(
  "CHECK_SLISBNB_BALANCE",
  "Check slisBNB token balance",
  {
    walletAddress: z.string().optional().describe("Wallet address to check (optional, uses configured wallet if not provided)")
  },
  async ({ walletAddress }) => {
    try {
      const addressToCheck = walletAddress || WALLET_ADDRESS || (WALLET_PRIVATE_KEY ? getWallet().address : null);
      
      if (!addressToCheck) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              status: "error",
              message: "No wallet address provided and no wallet configured"
            }, null, 2)
          }]
        };
      }

      if (!isValidAddress(addressToCheck)) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              status: "error",
              message: "Invalid wallet address format",
              walletAddress: addressToCheck
            }, null, 2)
          }]
        };
      }

      const provider = getProvider();
      const slisBNBToken = new ethers.Contract(
        CONTRACTS.SLISBNB_TOKEN.address,
        CONTRACTS.SLISBNB_TOKEN.abi,
        provider
      );

      const balance = await slisBNBToken.balanceOf(addressToCheck);
      const decimals = await slisBNBToken.decimals();
      const formattedBalance = formatBalance(balance, decimals);

      const stakeManager = new ethers.Contract(
        CONTRACTS.STAKE_MANAGER.address,
        CONTRACTS.STAKE_MANAGER.abi,
        provider
      );
      
      let shares = "0";
      try {
        const sharesBalance = await stakeManager.sharesOf(addressToCheck);
        shares = sharesBalance.toString();
      } catch (e) {
      }

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            walletAddress: addressToCheck,
            token: {
              symbol: "slisBNB",
              address: CONTRACTS.SLISBNB_TOKEN.address,
              balance: formattedBalance,
              rawBalance: balance.toString(),
              decimals: Number(decimals)
            },
            stakerShares: shares,
            hasBalance: balance > 0n,
            timestamp: new Date().toISOString()
          }, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            status: "error",
            message: `Failed to check slisBNB balance: ${error.message}`
          }, null, 2)
        }]
      };
    }
  }
);

// Tool: Check KernelDAO staked balance
server.tool(
  "CHECK_KERNELDAO_STAKE",
  "Check staked balance on KernelDAO",
  {
    walletAddress: z.string().optional().describe("Wallet address to check (optional, uses configured wallet if not provided)")
  },
  async ({ walletAddress }) => {
    try {
      const addressToCheck = walletAddress || WALLET_ADDRESS || (WALLET_PRIVATE_KEY ? getWallet().address : null);
      
      if (!addressToCheck) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              status: "error",
              message: "No wallet address provided and no wallet configured"
            }, null, 2)
          }]
        };
      }

      if (!isValidAddress(addressToCheck)) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              status: "error",
              message: "Invalid wallet address format",
              walletAddress: addressToCheck
            }, null, 2)
          }]
        };
      }

      const provider = getProvider();
      const kernelDAO = new ethers.Contract(
        CONTRACTS.KERNEL_DAO.address,
        CONTRACTS.KERNEL_DAO.abi,
        provider
      );

      const stakedBalance = await kernelDAO.balanceOf(
        CONTRACTS.SLISBNB_TOKEN.address,
        addressToCheck
      );
      const formattedBalance = formatBalance(stakedBalance);

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            walletAddress: addressToCheck,
            kernelDAO: {
              contractAddress: CONTRACTS.KERNEL_DAO.address,
              stakedBalance: formattedBalance,
              rawBalance: stakedBalance.toString()
            },
            hasStake: stakedBalance > 0n,
            timestamp: new Date().toISOString()
          }, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            status: "error",
            message: `Failed to check KernelDAO stake: ${error.message}`
          }, null, 2)
        }]
      };
    }
  }
);

// Tool: Get staking status summary
server.tool(
  "GET_STAKING_STATUS",
  "Get complete staking status across BNB, slisBNB, and KernelDAO",
  {
    walletAddress: z.string().optional().describe("Wallet address to check (optional, uses configured wallet if not provided)")
  },
  async ({ walletAddress }) => {
    try {
      const addressToCheck = walletAddress || WALLET_ADDRESS || (WALLET_PRIVATE_KEY ? getWallet().address : null);
      
      if (!addressToCheck) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              status: "error",
              message: "No wallet address provided and no wallet configured"
            }, null, 2)
          }]
        };
      }

      if (!isValidAddress(addressToCheck)) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              status: "error",
              message: "Invalid wallet address format",
              walletAddress: addressToCheck
            }, null, 2)
          }]
        };
      }

      const provider = getProvider();
      
      const [bnbBalance, slisBNBContract, kernelDAOContract, stakeManagerContract] = await Promise.all([
        provider.getBalance(addressToCheck),
        new ethers.Contract(CONTRACTS.SLISBNB_TOKEN.address, CONTRACTS.SLISBNB_TOKEN.abi, provider),
        new ethers.Contract(CONTRACTS.KERNEL_DAO.address, CONTRACTS.KERNEL_DAO.abi, provider),
        new ethers.Contract(CONTRACTS.STAKE_MANAGER.address, CONTRACTS.STAKE_MANAGER.abi, provider)
      ]);

      const [slisBNBBalance, kernelStakedBalance] = await Promise.all([
        slisBNBContract.balanceOf(addressToCheck),
        kernelDAOContract.balanceOf(CONTRACTS.SLISBNB_TOKEN.address, addressToCheck)
      ]);

      let shares = "0";
      try {
        const sharesBalance = await stakeManagerContract.sharesOf(addressToCheck);
        shares = sharesBalance.toString();
      } catch (e) {
      }

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            walletAddress: addressToCheck,
            balances: {
              BNB: {
                balance: formatBalance(bnbBalance),
                hasMinimumForStaking: bnbBalance >= MIN_BNB_STAKE
              },
              slisBNB: {
                balance: formatBalance(slisBNBBalance),
                hasBalance: slisBNBBalance > 0n,
                stakerShares: shares
              },
              kernelDAO: {
                stakedBalance: formatBalance(kernelStakedBalance),
                hasStake: kernelStakedBalance > 0n
              }
            },
            readyForWorkflow: bnbBalance >= MIN_BNB_STAKE,
            isConfiguredWallet: addressToCheck === (WALLET_ADDRESS || getWallet().address),
            timestamp: new Date().toISOString()
          }, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            status: "error",
            message: `Failed to get staking status: ${error.message}`
          }, null, 2)
        }]
      };
    }
  }
);

// Start the server
async function startServer() {
  try {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.log("BNB Staking Workflow MCP server started successfully");
    
    if (WALLET_PRIVATE_KEY) {
      try {
        const wallet = getWallet();
        console.log(`Configured wallet address: ${wallet.address}`);
      } catch (error) {
        console.error(`Wallet configuration error: ${error.message}`);
      }
    } else {
      console.log("No wallet configured. Set WALLET_PRIVATE_KEY in environment to enable transactions.");
    }
  } catch (error) {
    console.error(`Failed to start server: ${error.message}`);
    process.exit(1);
  }
}

startServer();