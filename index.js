#!/usr/bin/env node

const { McpServer } = require("@modelcontextprotocol/sdk/server/mcp.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");
const { z } = require("zod");
const { ethers } = require("ethers");
const https = require('https');

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

const DEFI_POOL_IDS = {
  // Lista DAO Liquid Staking
  slisBNB: {
    id: "50bb5f69-85ea-4f70-81da-3661a1633fc4",
    protocol: "Lista DAO",
    type: "Liquid Staking"
  },

  // Venus Protocol Lending Pools
  ETH: {
    id: "de8928ad-d03a-423d-92d7-3c4648e3ffd2",
    protocol: "Venus",
    type: "Lending"
  },
  DAI: {
    id: "406b11b4-c4f9-4253-bfd3-388c208a4ecd",
    protocol: "Venus",
    type: "Lending"
  },
  lisUSD: {
    id: "9f44dab4-eaba-4f79-b86d-648e010edf0c",
    protocol: "Venus",
    type: "Lending"
  },
  USDT: {
    id: "9f3a6015-5045-4471-ba65-ad3dc7c38269",
    protocol: "Venus",
    type: "Lending"
  },
  USDC: {
    id: "89eba1e5-1b1b-47b6-958b-38138a04c244",
    protocol: "Venus",
    type: "Lending"
  },
  USD1: {
    id: "406b11b4-c4f9-4253-bfd3-388c208a4ecd",
    protocol: "Venus",
    type: "Lending"
  },
  WBNB: {
    id: "747b58ab-aefd-42e1-a312-01ad5a0ab7f5",
    protocol: "Venus",
    type: "Lending"
  },
  SolvBTC: {
    id: "870e5485-c1f2-4a14-b014-286d0a833bf6",
    protocol: "Venus",
    type: "Lending"
  }
};

const VENUS_CORE_POOL = {
  comptroller: "0xfD36E2c2a6789Db23113685031d7F16329158384",
  venusLens: "0xe4C455cBf870A86399043B8A36A669FfA1583e95"
};

const LIQUID_STAKED_BNB_POOL = {
  comptroller: "0xd933909A4a2b7A4638903028f44D1d38ce27c352",
  swapRouter: "0x5f0ce69Aa564468492e860e8083BB001e4eb8d56",
  nativeTokenGateway: "0x24896601A4bf1b6a27E51Cb3eff750Bd9FE00d08",
  venusLens: "0xe4C455cBf870A86399043B8A36A669FfA1583e95"
};

const LIQUID_STAKED_MARKETS = {
  slisBNB: {
    underlying: "0xB0b84D294e0C75A6abe60171b70edEb2EFd14A1B",
    vToken: "0xd3CC9d8f3689B83c91b7B59cAB4946B063EB894A",
    symbol: "slisBNB",
    decimals: 18
  },
  WBNB: {
    underlying: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
    vToken: "0xe10E80B7FD3a29fE46E16C30CC8F4dd938B742e2",
    symbol: "WBNB",
    decimals: 18
  }
};

const VENUS_MARKETS = {
  ETH: {
    underlying: "0x2170Ed0880ac9A755fd29B2688956BD959F933F8",
    vToken: "0xf508fCD89b8bd15579dc79A6827cB4686A3592c8",
    symbol: "ETH",
    decimals: 18
  },
  BTC: {
    underlying: "0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c",
    vToken: "0x882C173bC7Ff3b7786CA16dfeD3DFFfb9Ee7847B",
    symbol: "BTCB",
    decimals: 18
  },
  USDT: {
    underlying: "0x55d398326f99059fF775485246999027B3197955",
    vToken: "0xfD5840Cd36d94D7229439859C0112a4185BC0255",
    symbol: "USDT",
    decimals: 18
  },
  USDC: {
    underlying: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d",
    vToken: "0xecA88125a5ADbe82614ffC12D0DB554E2e2867C8",
    symbol: "USDC",
    decimals: 18
  },
  DAI: {
    underlying: "0x1AF3F329e8BE154074D8769D1FFa4eE058B1DBc3",
    vToken: "0x334b3eCB4DCa3593BCCC3c7EBD1A1C1d1780FBF1",
    symbol: "DAI",
    decimals: 18
  },
  lisUSD: {
    underlying: "0x0782b6d8c4551B9760e74c0545a9bCD90bdc41E5",
    vToken: "0x689E0daB47Ab16bcae87Ec18491692BF621Dc6Ab",
    symbol: "lisUSD",
    decimals: 18
  },
  USD1: {
    underlying: "0x8d0D000Ee44948FC98c9B98A4FA4921476f08B0d",
    vToken: "0x0C1DA220D301155b87318B90692Da8dc43B67340",
    symbol: "USD1",
    decimals: 18
  },
  SolvBTC: {
    underlying: "0x4aae823a6a0b376De6A78e74eCC5b079d38cBCf7",
    vToken: "0xf841cb62c19fCd4fF5CD0AaB5939f3140BaaC3Ea",
    symbol: "SolvBTC",
    decimals: 18
  },
};

// Contract ABIs
const CONTRACTS = {
  COMPTROLLER: {
    abi: [
      "function enterMarkets(address[] calldata vTokens) returns (uint256[] memory)",
      "function exitMarket(address vToken) returns (uint256)",
      "function getAccountLiquidity(address account) view returns (uint256 error, uint256 liquidity, uint256 shortfall)",
      "function markets(address vToken) view returns (bool isListed, uint256 collateralFactorMantissa, bool isComped)",
      "function getAssetsIn(address account) view returns (address[] memory)",
      "function checkMembership(address account, address vToken) view returns (bool)",
      "function getAllMarkets() view returns (address[] memory)"
    ]
  },
  VTOKEN: {
    abi: [
      "function mint(uint256 mintAmount) returns (uint256)",
      "function redeem(uint256 redeemTokens) returns (uint256)",
      "function redeemUnderlying(uint256 redeemAmount) returns (uint256)",
      "function borrow(uint256 borrowAmount) returns (uint256)",
      "function repayBorrow(uint256 repayAmount) returns (uint256)",
      "function balanceOf(address owner) view returns (uint256)",
      "function balanceOfUnderlying(address owner) returns (uint256)",
      "function borrowBalanceCurrent(address account) returns (uint256)",
      "function exchangeRateCurrent() returns (uint256)",
      "function getCash() view returns (uint256)",
      "function supplyRatePerBlock() view returns (uint256)",
      "function borrowRatePerBlock() view returns (uint256)",
      "function totalSupply() view returns (uint256)",
      "function totalBorrows() view returns (uint256)",
      "function underlying() view returns (address)"
    ]
  },
  VENUS_LENS: {
    abi: [
      "function vTokenBalancesAll(address[] calldata vTokens, address account) view returns (tuple(address vToken, uint256 balanceOf, uint256 borrowBalanceCurrent, uint256 balanceOfUnderlying, uint256 tokenBalance, uint256 tokenAllowance)[] memory)",
      "function vTokenMetadataAll(address[] calldata vTokens) view returns (tuple(address vToken, uint256 exchangeRateCurrent, uint256 supplyRatePerBlock, uint256 borrowRatePerBlock, uint256 reserveFactorMantissa, uint256 totalBorrows, uint256 totalReserves, uint256 totalSupply, uint256 totalCash, bool isListed, uint256 collateralFactorMantissa, address underlyingAssetAddress, uint256 vTokenDecimals, uint256 underlyingDecimals)[] memory)"
    ]
  },
  ERC20: {
    abi: [
      "function approve(address spender, uint256 amount) returns (bool)",
      "function balanceOf(address owner) view returns (uint256)",
      "function decimals() view returns (uint8)",
      "function symbol() view returns (string)",
      "function allowance(address owner, address spender) view returns (uint256)"
    ]
  },

  // Native staking contracts
  STAKE_HUB: {
    address: "0x0000000000000000000000000000000000002002",
    abi: [
      "function delegate(address operatorAddress, bool delegateVotePower) payable",
      "function undelegate(address operatorAddress, uint256 shares)",
      "function claim(address operatorAddress, uint256 requestNumber)",
      "function getValidatorCreditContract(address operatorAddress) view returns (address)",
      "function getValidatorBasicInfo(address operatorAddress) view returns (uint256 createdTime, bool jailed, uint256 jailUntil)",
      "event Delegated(address indexed operatorAddress, address indexed delegator, uint256 shares, uint256 bnbAmount)",
      "event Undelegated(address indexed operatorAddress, address indexed delegator, uint256 shares, uint256 bnbAmount)"
    ]
  },
  STAKE_CREDIT: {
    abi: [
      "function getPooledBNB(address account) view returns (uint256)",
      "function getPooledBNBByShares(uint256 shares) view returns (uint256)",
      "function getSharesByPooledBNB(uint256 bnbAmount) view returns (uint256)",
      "function balanceOf(address account) view returns (uint256)"
    ]
  },

  // Lista DAO contracts
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

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            resolve({
              ok: true,
              json: () => JSON.parse(data)
            });
          } catch (e) {
            reject(new Error('Failed to parse JSON'));
          }
        } else {
          resolve({
            ok: false,
            status: res.statusCode
          });
        }
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

const MIN_BNB_STAKE = ethers.parseEther("0.0001");

const WALLET_PRIVATE_KEY = process.env.WALLET_PRIVATE_KEY;
const WALLET_ADDRESS = process.env.WALLET_ADDRESS;

const server = new McpServer({
  name: "BNB Complete DeFi MCP",
  version: "1.0.0",
  description: "MCP server for BNB staking and Venus Protocol lending/borrowing"
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

async function getLiquidStakedVTokens() {
  const provider = getProvider();
  const comptroller = new ethers.Contract(
    LIQUID_STAKED_BNB_POOL.comptroller,
    CONTRACTS.COMPTROLLER.abi,
    provider
  );

  try {
    const allMarkets = await comptroller.getAllMarkets();

    for (const vTokenAddress of allMarkets) {
      const vToken = new ethers.Contract(
        vTokenAddress,
        CONTRACTS.VTOKEN.abi,
        provider
      );

      try {
        const underlyingAddress = await vToken.underlying();

        for (const [key, market] of Object.entries(LIQUID_STAKED_MARKETS)) {
          if (market.underlying.toLowerCase() === underlyingAddress.toLowerCase()) {
            market.vToken = vTokenAddress;
            break;
          }
        }
      } catch (e) {
      }
    }
  } catch (error) {
    console.error("Failed to fetch liquid staked vTokens:", error);
  }
}

//getAPY
server.tool(
  "getAPY",
  "Fetch current Annual Percentage Yield (APY) rates for BNB DeFi pools from DeFiLlama, including Lista DAO liquid staking and Venus Protocol lending pools",
  {
    pool: z.enum(["all", "slisBNB", "ETH", "DAI", "lisUSD", "USDT", "USDC", "USD1"]).describe("Pool to check APY for")
  },
  async ({ pool }) => {
    try {
      const results = {};

      const poolsToFetch = pool === "all"
        ? Object.entries(DEFI_POOL_IDS)
        : [[pool, DEFI_POOL_IDS[pool]]];

      for (const [poolName, poolInfo] of poolsToFetch) {
        try {
          console.log(`Fetching APY for ${poolName}...`);

          const response = await httpsGet(`https://yields.llama.fi/chart/${poolInfo.id}`);

          if (!response.ok) {
            results[poolName] = {
              status: "error",
              message: `Failed to fetch data: HTTP ${response.status}`
            };
            continue;
          }

          const responseData = await response.json();

          if (responseData.status === "success" && responseData.data && responseData.data.length > 0) {
            const latestData = responseData.data[responseData.data.length - 1];

            results[poolName] = {
              status: "success",
              poolId: poolInfo.id,
              protocol: poolInfo.protocol,
              poolType: poolInfo.type,
              apy: latestData.apy !== null ? `${latestData.apy.toFixed(3)}%` : "0%",
              apyBase: latestData.apyBase !== null ? `${latestData.apyBase.toFixed(3)}%` : "N/A",
              apyReward: latestData.apyReward !== null ? `${latestData.apyReward.toFixed(3)}%` : "N/A",
              tvlUsd: latestData.tvlUsd ? `$${(latestData.tvlUsd / 1000000).toFixed(2)}M` : "N/A",
              timestamp: latestData.timestamp
            };
          } else {
            results[poolName] = {
              status: "error",
              message: "No data available"
            };
          }
        } catch (error) {
          results[poolName] = {
            status: "error",
            message: error.message
          };
        }
      }

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            status: "success",
            requestedPool: pool,
            results: results,
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
            message: `Failed to fetch APY data: ${error.message}`
          }, null, 2)
        }]
      };
    }
  }
);

// Venus Lend
server.tool(
  "venusLEND",
  "Lend assets as collateral to Venus Protocol lending pools on BSC network to earn lending yield and enable borrowing capacity",
  {
    asset: z.enum(["ETH", "BTC", "USDT", "USDC", "DAI", "lisUSD", "USD1", "slisBNB", "ankrBNB", "asBNB", "BNBx", "PT-clisBNB", "stkBNB", "WBNB"]).describe("Asset to lend"),
    amount: z.string().describe("Amount to lend (e.g., '1.5' for 1.5 tokens)"),
    pool: z.enum(["core", "liquid"]).optional().describe("Pool to use (defaults to 'core' for regular assets, 'liquid' for liquid staked assets)")
  },
  async ({ asset, amount, pool }) => {
    try {
      const wallet = getWallet();
      const walletAddress = wallet.address;

      let market;
      let isLiquidPool = false;

      if (LIQUID_STAKED_MARKETS[asset]) {
        isLiquidPool = true;
        market = LIQUID_STAKED_MARKETS[asset];

        if (!market.vToken) {
          await getLiquidStakedVTokens();
          if (!market.vToken) {
            return {
              content: [{
                type: "text",
                text: JSON.stringify({
                  status: "error",
                  message: "Could not find vToken address for this liquid staked asset"
                }, null, 2)
              }]
            };
          }
        }
      } else {
        market = VENUS_MARKETS[asset];
      }

      if (!market) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              status: "error",
              message: "Unsupported asset"
            }, null, 2)
          }]
        };
      }

      const token = new ethers.Contract(
        market.underlying,
        CONTRACTS.ERC20.abi,
        wallet
      );

      const vToken = new ethers.Contract(
        market.vToken,
        CONTRACTS.VTOKEN.abi,
        wallet
      );

      const balance = await token.balanceOf(walletAddress);
      const lendAmount = ethers.parseUnits(amount, market.decimals);

      if (lendAmount > balance) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              status: "error",
              message: "Insufficient balance",
              requested: amount,
              available: formatBalance(balance, market.decimals),
              asset: asset
            }, null, 2)
          }]
        };
      }

      const currentAllowance = await token.allowance(walletAddress, market.vToken);

      if (currentAllowance < lendAmount) {
        console.log(`Approving ${asset} for Venus lending...`);
        const approveTx = await token.approve(market.vToken, lendAmount);
        await approveTx.wait();
        console.log("Approval confirmed");
      }

      const initialVTokenBalance = await vToken.balanceOf(walletAddress);

      console.log(`Lending ${amount} ${asset} to Venus ${isLiquidPool ? 'Liquid Staked BNB' : 'Core'} Pool...`);
      const mintTx = await vToken.mint(lendAmount);
      const receipt = await mintTx.wait();

      const newVTokenBalance = await vToken.balanceOf(walletAddress);
      const vTokensReceived = newVTokenBalance - initialVTokenBalance;

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            status: "success",
            message: `Successfully lent ${amount} ${asset} to Venus ${isLiquidPool ? 'Liquid Staked BNB' : 'Core'} Pool`,
            transaction: {
              asset: asset,
              amountLent: amount,
              vTokensReceived: formatBalance(vTokensReceived, 8),
              txHash: receipt.hash,
              blockNumber: receipt.blockNumber,
              gasUsed: receipt.gasUsed.toString()
            },
            market: {
              pool: isLiquidPool ? "Liquid Staked BNB Pool" : "Core Pool",
              vTokenAddress: market.vToken
            },
            walletAddress,
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
            message: `Venus lending failed: ${error.message}`,
            details: error.stack
          }, null, 2)
        }]
      };
    }
  }
);

// Venus Borrow
server.tool(
  "venusBORROW",
  "Borrow assets against supplied collateral from Venus Protocol lending pools on BSC network using your collateral.",
  {
    asset: z.enum(["ETH", "BTC", "USDT", "USDC", "DAI", "lisUSD", "USD1", "slisBNB"]).describe("Asset to borrow"),
    amount: z.string().describe("Amount to borrow (e.g., '0.0005' for 0.0005 tokens)")
  },
  async ({ asset, amount }) => {
    try {
      const wallet = getWallet();
      const walletAddress = wallet.address;

      const bnbBalance = await wallet.provider.getBalance(walletAddress);
      if (bnbBalance < ethers.parseEther("0.001")) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              status: "error",
              message: "Insufficient BNB for gas fees. Need at least 0.001 BNB"
            }, null, 2)
          }]
        };
      }

      let market, comptrollerAddress, isLiquidPool = false;

      if (LIQUID_STAKED_MARKETS[asset]) {
        market = LIQUID_STAKED_MARKETS[asset];
        comptrollerAddress = LIQUID_STAKED_BNB_POOL.comptroller;
        isLiquidPool = true;

        if (!market.vToken) {
          await getLiquidStakedVTokens();
        }
      } else {
        market = VENUS_MARKETS[asset];
        comptrollerAddress = VENUS_CORE_POOL.comptroller;
      }

      if (!market) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              status: "error",
              message: "Unsupported asset for borrowing"
            }, null, 2)
          }]
        };
      }

      const comptrollerABI = [
        "function enterMarkets(address[] calldata vTokens) returns (uint256[] memory)",
        "function getAccountLiquidity(address account) external view returns (uint256, uint256, uint256)",
        "function getAssetsIn(address account) external view returns (address[] memory)"
      ];

      const vToken = new ethers.Contract(market.vToken, CONTRACTS.VTOKEN.abi, wallet);
      const comptroller = new ethers.Contract(comptrollerAddress, comptrollerABI, wallet);

      const assetsIn = await comptroller.getAssetsIn(walletAddress);
      const isMarketEntered = assetsIn.some(addr =>
        addr.toLowerCase() === market.vToken.toLowerCase()
      );

      if (!isMarketEntered) {
        console.log("Entering market as collateral...");
        try {
          const enterTx = await comptroller.enterMarkets([market.vToken]);
          await enterTx.wait();
          console.log("Market entered successfully");
        } catch (enterError) {
          return {
            content: [{
              type: "text",
              text: JSON.stringify({
                status: "error",
                message: "Failed to enter market as collateral",
                details: enterError.message
              }, null, 2)
            }]
          };
        }
      }

      let liquidity, shortfall;
      try {
        const [error, liquidityResult, shortfallResult] = await comptroller.getAccountLiquidity(walletAddress);

        if (error !== 0n) {
          return {
            content: [{
              type: "text",
              text: JSON.stringify({
                status: "error",
                message: "Error getting account liquidity",
                errorCode: error.toString()
              }, null, 2)
            }]
          };
        }

        liquidity = liquidityResult;
        shortfall = shortfallResult;
      } catch (liquidityError) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              status: "error",
              message: "Failed to get account liquidity",
              details: liquidityError.message,
              suggestion: "Make sure you have supplied collateral first"
            }, null, 2)
          }]
        };
      }

      if (shortfall > 0n) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              status: "error",
              message: "Account is in shortfall - cannot borrow",
              shortfall: formatBalance(shortfall, 18)
            }, null, 2)
          }]
        };
      }

      if (liquidity === 0n) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              status: "error",
              message: "No borrowing capacity available",
              suggestion: "Supply more collateral first"
            }, null, 2)
          }]
        };
      }

      const borrowAmount = ethers.parseUnits(amount, market.decimals);

      const liquidityInAsset = liquidity;

      if (borrowAmount > liquidityInAsset) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              status: "error",
              message: "Borrow amount exceeds available liquidity",
              requested: amount,
              availableLiquidity: formatBalance(liquidity, 18),
              suggestion: "Try borrowing a smaller amount"
            }, null, 2)
          }]
        };
      }

      let gasEstimate;
      try {
        gasEstimate = await vToken.borrow.estimateGas(borrowAmount);
        gasEstimate = (gasEstimate * 120n) / 100n;
      } catch (gasError) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              status: "error",
              message: "Borrow transaction would fail",
              details: gasError.message,
              suggestions: [
                "Check if you have sufficient collateral",
                "Try borrowing a smaller amount",
                "Ensure the market has sufficient liquidity"
              ]
            }, null, 2)
          }]
        };
      }

      const feeData = await wallet.provider.getFeeData();
      const txOptions = {
        gasLimit: gasEstimate,
        gasPrice: feeData.gasPrice || ethers.parseUnits("3", "gwei")
      };

      console.log(`Borrowing ${amount} ${asset} from Venus ${isLiquidPool ? 'Liquid Staked BNB' : 'Core'} Pool...`);

      const borrowTx = await vToken.borrow(borrowAmount, txOptions);
      const receipt = await borrowTx.wait();

      const [, newLiquidity] = await comptroller.getAccountLiquidity(walletAddress);

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            status: "success",
            message: `Successfully borrowed ${amount} ${asset}`,
            transaction: {
              asset,
              amountBorrowed: amount,
              txHash: receipt.hash,
              gasUsed: receipt.gasUsed.toString(),
              pool: isLiquidPool ? "Liquid Staked BNB Pool" : "Core Pool"
            },
            borrowInfo: {
              remainingLiquidity: formatBalance(newLiquidity, 18),
              vTokenAddress: market.vToken
            },
            timestamp: new Date().toISOString()
          }, null, 2)
        }]
      };

    } catch (error) {
      let message = "Borrowing failed";

      if (error.message.includes("insufficient funds")) {
        message = "Insufficient BNB for gas fees";
      } else if (error.message.includes("execution reverted")) {
        message = "Transaction reverted - check collateral ratio";
      } else if (error.message.includes("borrow cap")) {
        message = "Borrow cap reached for this asset";
      }

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            status: "error",
            message,
            originalError: error.message
          }, null, 2)
        }]
      };
    }
  }
);

// Venus Repay
server.tool(
  "venusREPAY",
  "Repay borrowed amounts to Venus Protocol lending pools on BSC network to reduce debt position and free up collateral",
  {
    asset: z.enum(["ETH", "BTC", "USDT", "USDC", "DAI", "lisUSD", "USD1", "slisBNB"]).describe("Asset to repay"),
    amount: z.string().describe("Amount to repay (e.g., '100' for 100 tokens, or 'max' for full repayment)")
  },
  async ({ asset, amount }) => {
    try {
      const wallet = getWallet();
      const walletAddress = wallet.address;

      let market;
      let isLiquidPool = false;

      if (LIQUID_STAKED_MARKETS[asset]) {
        isLiquidPool = true;
        market = LIQUID_STAKED_MARKETS[asset];
        if (!market.vToken) {
          await getLiquidStakedVTokens();
        }
      } else {
        market = VENUS_MARKETS[asset];
      }

      if (!market) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              status: "error",
              message: "Unsupported asset"
            }, null, 2)
          }]
        };
      }

      const token = new ethers.Contract(
        market.underlying,
        CONTRACTS.ERC20.abi,
        wallet
      );

      const vToken = new ethers.Contract(
        market.vToken,
        CONTRACTS.VTOKEN.abi,
        wallet
      );

      let repayAmount;
      if (amount === "max" || amount.toLowerCase() === "max") {
        repayAmount = ethers.MaxUint256;
      } else {
        repayAmount = ethers.parseUnits(amount, market.decimals);
      }

      if (repayAmount !== ethers.MaxUint256) {
        const tokenBalance = await token.balanceOf(walletAddress);
        if (tokenBalance < repayAmount) {
          return {
            content: [{
              type: "text",
              text: JSON.stringify({
                status: "error",
                message: "Insufficient token balance",
                required: formatBalance(repayAmount, market.decimals) + " " + asset,
                available: formatBalance(tokenBalance, market.decimals) + " " + asset
              }, null, 2)
            }]
          };
        }
      }

      const currentAllowance = await token.allowance(walletAddress, market.vToken);
      if (repayAmount !== ethers.MaxUint256 && currentAllowance < repayAmount) {
        console.log(`Approving ${asset}...`);
        const approveTx = await token.approve(market.vToken, repayAmount);
        await approveTx.wait();
      } else if (repayAmount === ethers.MaxUint256) {
        console.log(`Approving max ${asset}...`);
        const approveTx = await token.approve(market.vToken, ethers.MaxUint256);
        await approveTx.wait();
      }

      console.log(`Repaying ${amount === "max" ? "max" : formatBalance(repayAmount, market.decimals)} ${asset}...`);
      const repayTx = await vToken.repayBorrow(repayAmount, {
        gasLimit: 500000
      });

      const receipt = await repayTx.wait();

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            status: "success",
            message: `Successfully repaid ${asset}`,
            transaction: {
              asset: asset,
              amount: amount === "max" ? "max" : formatBalance(repayAmount, market.decimals),
              txHash: receipt.hash,
              blockNumber: receipt.blockNumber,
              gasUsed: receipt.gasUsed.toString()
            },
            pool: isLiquidPool ? "Liquid Staked BNB Pool" : "Core Pool",
            walletAddress,
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
            message: `Repayment failed: ${error.message}`,
            suggestion: "Make sure you have enough tokens and BNB for gas"
          }, null, 2)
        }]
      };
    }
  }
);

// Venus Withdraw 
server.tool(
  "venusWITHDRAW",
  "Withdraw previously supplied collateral from Venus Protocol lending pools on BSC network while maintaining healthy collateral ratio",
  {
    asset: z.enum(["ETH", "BTC", "USDT", "USDC", "DAI", "lisUSD", "USD1", "slisBNB"]).describe("Asset to withdraw"),
    amount: z.string().describe("Amount to withdraw (e.g., '1.5' for 1.5 tokens, or 'max' for maximum)")
  },
  async ({ asset, amount }) => {
    try {
      const wallet = getWallet();
      const walletAddress = wallet.address;

      const bnbBalance = await wallet.provider.getBalance(walletAddress);
      if (bnbBalance < ethers.parseEther("0.001")) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              status: "error",
              message: "Insufficient BNB for gas fees. Need at least 0.001 BNB"
            }, null, 2)
          }]
        };
      }

      let market, comptrollerAddress, isLiquidPool = false;

      if (LIQUID_STAKED_MARKETS[asset]) {
        market = LIQUID_STAKED_MARKETS[asset];
        comptrollerAddress = LIQUID_STAKED_BNB_POOL.comptroller;
        isLiquidPool = true;

        if (!market.vToken) {
          await getLiquidStakedVTokens();
        }
      } else {
        market = VENUS_MARKETS[asset];
        comptrollerAddress = VENUS_CORE_POOL.comptroller;
      }

      if (!market) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              status: "error",
              message: "Unsupported asset"
            }, null, 2)
          }]
        };
      }

      const vToken = new ethers.Contract(market.vToken, CONTRACTS.VTOKEN.abi, wallet);
      const comptroller = new ethers.Contract(comptrollerAddress, CONTRACTS.COMPTROLLER.abi, wallet);

      const vTokenBalance = await vToken.balanceOf(walletAddress);
      if (vTokenBalance === 0n) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              status: "error",
              message: "No supplied balance for this asset"
            }, null, 2)
          }]
        };
      }

      let withdrawAmount, useRedeem = false;

      if (amount === "max") {
        const [error, liquidity, shortfall] = await comptroller.getAccountLiquidity(walletAddress);
        if (shortfall > 0n) {
          return {
            content: [{
              type: "text",
              text: JSON.stringify({
                status: "error",
                message: "Account in shortfall, cannot withdraw"
              }, null, 2)
            }]
          };
        }
        withdrawAmount = vTokenBalance;
        useRedeem = true;
      } else {
        withdrawAmount = ethers.parseUnits(amount, market.decimals);
      }

      let gasEstimate;
      try {
        gasEstimate = useRedeem ?
          await vToken.redeem.estimateGas(withdrawAmount) :
          await vToken.redeemUnderlying.estimateGas(withdrawAmount);
        gasEstimate = (gasEstimate * 120n) / 100n;
      } catch {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              status: "error",
              message: "Transaction would fail - insufficient collateral or liquidity"
            }, null, 2)
          }]
        };
      }

      const feeData = await wallet.provider.getFeeData();
      const txOptions = {
        gasLimit: gasEstimate,
        gasPrice: feeData.gasPrice || ethers.parseUnits("3", "gwei")
      };

      const tx = useRedeem ?
        await vToken.redeem(withdrawAmount, txOptions) :
        await vToken.redeemUnderlying(withdrawAmount, txOptions);

      const receipt = await tx.wait();

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            status: "success",
            message: `Successfully withdrew ${asset}`,
            transaction: {
              asset,
              txHash: receipt.hash,
              gasUsed: receipt.gasUsed.toString()
            },
            timestamp: new Date().toISOString()
          }, null, 2)
        }]
      };

    } catch (error) {
      let message = "Withdrawal failed";

      if (error.message.includes("insufficient funds")) {
        message = "Insufficient BNB for gas fees";
      } else if (error.message.includes("execution reverted")) {
        message = "Transaction reverted - check collateral";
      }

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            status: "error",
            message,
            details: error.message
          }, null, 2)
        }]
      };
    }
  }
);

// Venus Portfolio Data
server.tool(
  "venusPORTFOLIO",
  "Retrieve comprehensive Venus Protocol portfolio overview including all supplied collateral and borrowed positions across Core and Liquid Staked BNB pools on BSC network",
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

      const provider = getProvider();


      const vTokenABI = [
        "function balanceOf(address owner) view returns (uint256)",
        "function borrowBalanceStored(address account) view returns (uint256)",
        "function exchangeRateStored() view returns (uint256)"
      ];

      await getLiquidStakedVTokens();

      const portfolio = {
        corePool: {
          supplies: [],
          borrows: []
        },
        liquidStakedPool: {
          supplies: [],
          borrows: []
        }
      };

      for (const [symbol, market] of Object.entries(VENUS_MARKETS)) {
        const vToken = new ethers.Contract(market.vToken, vTokenABI, provider);

        try {
          const vTokenBalance = await vToken.balanceOf(addressToCheck);
          if (vTokenBalance > 0n) {
            let underlyingAmount = "N/A";
            try {
              const exchangeRate = await vToken.exchangeRateStored();
              underlyingAmount = formatBalance((vTokenBalance * exchangeRate) / ethers.parseUnits("1", 18), market.decimals);
            } catch { }

            portfolio.corePool.supplies.push({
              asset: symbol,
              vTokenBalance: formatBalance(vTokenBalance, 8),
              underlyingAmount: underlyingAmount
            });
          }
        } catch { }

        try {
          const borrowBalance = await vToken.borrowBalanceStored(addressToCheck);
          if (borrowBalance > 0n) {
            portfolio.corePool.borrows.push({
              asset: symbol,
              amount: formatBalance(borrowBalance, market.decimals)
            });
          }
        } catch { }
      }

      for (const [symbol, market] of Object.entries(LIQUID_STAKED_MARKETS)) {
        if (!market.vToken) continue;

        const vToken = new ethers.Contract(market.vToken, vTokenABI, provider);

        try {
          const vTokenBalance = await vToken.balanceOf(addressToCheck);
          if (vTokenBalance > 0n) {
            let underlyingAmount = "N/A";
            try {
              const exchangeRate = await vToken.exchangeRateStored();
              underlyingAmount = formatBalance((vTokenBalance * exchangeRate) / ethers.parseUnits("1", 18), market.decimals);
            } catch { }

            portfolio.liquidStakedPool.supplies.push({
              asset: symbol,
              vTokenBalance: formatBalance(vTokenBalance, 8),
              underlyingAmount: underlyingAmount
            });
          }
        } catch { }

        try {
          const borrowBalance = await vToken.borrowBalanceStored(addressToCheck);
          if (borrowBalance > 0n) {
            portfolio.liquidStakedPool.borrows.push({
              asset: symbol,
              amount: formatBalance(borrowBalance, market.decimals)
            });
          }
        } catch { }
      }

      let coreLiquidity = null;
      let liquidLiquidity = null;

      try {
        const comptrollerABI = ["function getAccountLiquidity(address account) view returns (uint256 error, uint256 liquidity, uint256 shortfall)"];
        const coreComptroller = new ethers.Contract(VENUS_CORE_POOL.comptroller, comptrollerABI, provider);
        const result = await coreComptroller.getAccountLiquidity(addressToCheck);
        if (result[0] === 0n) {
          coreLiquidity = {
            available: formatBalance(result[1], 18),
            shortfall: formatBalance(result[2], 18)
          };
        }
      } catch { }

      try {
        const comptrollerABI = ["function getAccountLiquidity(address account) view returns (uint256 error, uint256 liquidity, uint256 shortfall)"];
        const liquidComptroller = new ethers.Contract(LIQUID_STAKED_BNB_POOL.comptroller, comptrollerABI, provider);
        const result = await liquidComptroller.getAccountLiquidity(addressToCheck);
        if (result[0] === 0n) {
          liquidLiquidity = {
            available: formatBalance(result[1], 18),
            shortfall: formatBalance(result[2], 18)
          };
        }
      } catch { }

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            status: "success",
            walletAddress: addressToCheck,
            corePool: {
              supplies: portfolio.corePool.supplies,
              borrows: portfolio.corePool.borrows,
              liquidity: coreLiquidity,
              summary: {
                totalSupplied: portfolio.corePool.supplies.length,
                totalBorrowed: portfolio.corePool.borrows.length
              }
            },
            liquidStakedBNBPool: {
              supplies: portfolio.liquidStakedPool.supplies,
              borrows: portfolio.liquidStakedPool.borrows,
              liquidity: liquidLiquidity,
              summary: {
                totalSupplied: portfolio.liquidStakedPool.supplies.length,
                totalBorrowed: portfolio.liquidStakedPool.borrows.length
              }
            },
            hasActivePositions: (portfolio.corePool.supplies.length + portfolio.corePool.borrows.length +
              portfolio.liquidStakedPool.supplies.length + portfolio.liquidStakedPool.borrows.length) > 0,
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
            message: `Failed to fetch portfolio: ${error.message}`
          }, null, 2)
        }]
      };
    }
  }
);

async function getValidatorCreditContract(provider, operatorAddress) {
  const stakeHub = new ethers.Contract(
    CONTRACTS.STAKE_HUB.address,
    CONTRACTS.STAKE_HUB.abi,
    provider
  );

  return await stakeHub.getValidatorCreditContract(operatorAddress);
}

// Stake BNB to get slisBNB
server.tool(
  "listadaoStakeBNB",
  "Stake BNB tokens on Lista DAO liquid staking protocol to receive slisBNB liquid staking tokens on BSC network",
  {
    amountBNB: z.string().describe("Amount of BNB to stake (e.g., '0.1' for 0.1 BNB)")
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
              message: "Insufficient BNB balance",
              required: formatBalance(MIN_BNB_STAKE),
              current: formattedBalance,
              walletAddress
            }, null, 2)
          }]
        };
      }

      const stakeAmount = ethers.parseEther(amountBNB);
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

      console.log(`Staking ${formatBalance(stakeAmount)} BNB on Lista DAO...`);
      const stakeTx = await stakeManager.deposit({ value: stakeAmount });
      const stakeReceipt = await stakeTx.wait();
      console.log(`Staking transaction confirmed: ${stakeReceipt.hash}`);

      await new Promise(resolve => setTimeout(resolve, 3000));

      const newSlisBNBBalance = await slisBNBToken.balanceOf(walletAddress);
      const slisBNBReceived = newSlisBNBBalance - initialSlisBNBBalance;

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            status: "success",
            message: "Successfully staked BNB on Lista DAO",
            transaction: {
              amountStaked: formatBalance(stakeAmount),
              slisBNBReceived: formatBalance(slisBNBReceived),
              txHash: stakeReceipt.hash,
              blockNumber: stakeReceipt.blockNumber,
              gasUsed: stakeReceipt.gasUsed.toString()
            },
            balances: {
              slisBNB: formatBalance(newSlisBNBBalance)
            },
            walletAddress,
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
            message: `Lista DAO staking failed: ${error.message}`,
            details: error.stack
          }, null, 2)
        }]
      };
    }
  }
);

// Unstake slisBNB to get BNB
server.tool(
  "listadaoUnstakeBNB",
  "Unstake slisBNB from Lista DAO - handles approval and requests withdrawal",
  {
    amountSlisBNB: z.string().describe("Amount of slisBNB to unstake (minimum 0.001)")
  },
  async ({ amountSlisBNB }) => {
    try {
      const wallet = getWallet();
      const walletAddress = wallet.address;

      const MIN_UNSTAKE_AMOUNT = ethers.parseEther("0.001");
      const unstakeAmount = ethers.parseEther(amountSlisBNB);
      
      if (unstakeAmount < MIN_UNSTAKE_AMOUNT) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              status: "error",
              message: "Amount below minimum unstake requirement",
              requested: amountSlisBNB,
              minimum: "0.001 slisBNB",
              suggestion: "Please unstake at least 0.001 slisBNB"
            }, null, 2)
          }]
        };
      }

      const slisBNBToken = new ethers.Contract(
        CONTRACTS.SLISBNB_TOKEN.address,
        CONTRACTS.SLISBNB_TOKEN.abi,
        wallet
      );

      const slisBNBBalance = await slisBNBToken.balanceOf(walletAddress);
      
      if (unstakeAmount > slisBNBBalance) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              status: "error",
              message: "Insufficient slisBNB balance",
              requested: amountSlisBNB,
              available: formatBalance(slisBNBBalance)
            }, null, 2)
          }]
        };
      }

      const stakeManager = new ethers.Contract(
        CONTRACTS.STAKE_MANAGER.address,
        CONTRACTS.STAKE_MANAGER.abi,
        wallet
      );

      console.log(`Checking allowance for ${amountSlisBNB} slisBNB...`);
      const currentAllowance = await slisBNBToken.allowance(walletAddress, CONTRACTS.STAKE_MANAGER.address);
      
      let approvalTxHash = null;
      if (currentAllowance < unstakeAmount) {
        console.log(`Insufficient allowance. Approving ${amountSlisBNB} slisBNB...`);
        const approveTx = await slisBNBToken.approve(CONTRACTS.STAKE_MANAGER.address, unstakeAmount);
        const approvalReceipt = await approveTx.wait();
        approvalTxHash = approvalReceipt.hash;
        console.log(`Approval successful: ${approvalTxHash}`);
      } else {
        console.log(`Sufficient allowance already exists: ${formatBalance(currentAllowance)}`);
      }

      console.log(`Requesting withdrawal of ${amountSlisBNB} slisBNB...`);
      
      const requestTx = await stakeManager.requestWithdraw(unstakeAmount);
      const requestReceipt = await requestTx.wait();
      
      let withdrawalId = null;
      const withdrawRequestedTopic = ethers.id("WithdrawRequested(address,uint256,uint256)");
      
      for (const log of requestReceipt.logs) {
        if (log.topics[0] === withdrawRequestedTopic && log.address.toLowerCase() === CONTRACTS.STAKE_MANAGER.address.toLowerCase()) {
          const data = ethers.AbiCoder.defaultAbiCoder().decode(
            ["uint256", "uint256"], 
            log.data
          );
          withdrawalId = data[1].toString();
          break;
        }
      }

      if (!withdrawalId) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              status: "success",
              message: "Withdrawal request successful! You can claim your BNB after the unbonding period (7-8 days)",
              transactions: {
                approval: approvalTxHash ? { txHash: approvalTxHash } : null,
                request: { txHash: requestReceipt.hash }
              },
              amount: amountSlisBNB,
              note: "Your slisBNB is now in the unstaking queue",
              nextStep: "Return in 7-8 days to claim your BNB",
              timestamp: new Date().toISOString()
            }, null, 2)
          }]
        };
      }

      try {
        console.log(`Attempting to claim withdrawal ${withdrawalId}...`);
        const claimTx = await stakeManager.claimWithdraw(withdrawalId);
        const claimReceipt = await claimTx.wait();
        
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              status: "success",
              message: "Successfully unstaked slisBNB",
              transactions: {
                approval: approvalTxHash ? { txHash: approvalTxHash } : null,
                request: {
                  txHash: requestReceipt.hash,
                  withdrawalId: withdrawalId
                },
                claim: {
                  txHash: claimReceipt.hash
                }
              },
              amount: amountSlisBNB,
              timestamp: new Date().toISOString()
            }, null, 2)
          }]
        };
        
      } catch (claimError) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              status: "success", 
              message: "Withdrawal request successful! You can claim your BNB after the unbonding period (7-8 days)",
              withdrawalId: withdrawalId,
              transactions: {
                approval: approvalTxHash ? { txHash: approvalTxHash } : null,
                request: { txHash: requestReceipt.hash }
              },
              amount: amountSlisBNB,
              note: "Your slisBNB is now in the unstaking queue",
              nextStep: `Return in 7-8 days to claim your BNB using withdrawal ID: ${withdrawalId}`,
              timestamp: new Date().toISOString()
            }, null, 2)
          }]
        };
      }

    } catch (error) {
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            status: "error",
            message: `Unstaking failed: ${error.message}`
          }, null, 2)
        }]
      };
    }
  }
);

// Stake slisBNB to KernelDAO
server.tool(
  "stakeslisBNBKernelDAO",
  "Stake slisBNB liquid staking tokens to KernelDAO protocol on BSC network to earn additional yield on your Lista DAO staked positions",
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

//Unstake from kernelDAO
server.tool(
  "unstakeslisBNBKernelDAO",
  "Unstake slisBNB tokens from KernelDAO protocol on BSC network to retrieve your liquid staking tokens back to wallet",
  {
    amountSlisBNB: z.string().describe("Amount of slisBNB to unstake from KernelDAO (e.g., '0.1' for 0.1 slisBNB)")
  },
  async ({ amountSlisBNB }) => {
    try {
      const wallet = getWallet();
      const walletAddress = wallet.address;

      const kernelDAO = new ethers.Contract(
        CONTRACTS.KERNEL_DAO.address,
        CONTRACTS.KERNEL_DAO.abi,
        wallet
      );

      const stakedBalance = await kernelDAO.balanceOf(
        CONTRACTS.SLISBNB_TOKEN.address,
        walletAddress
      );
      const unstakeAmount = ethers.parseEther(amountSlisBNB);

      if (unstakeAmount > stakedBalance) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              status: "error",
              message: "Insufficient staked balance on KernelDAO",
              requested: amountSlisBNB,
              available: formatBalance(stakedBalance)
            }, null, 2)
          }]
        };
      }

      console.log(`Unstaking ${formatBalance(unstakeAmount)} slisBNB from KernelDAO...`);
      const unstakeTx = await kernelDAO.unstake(
        CONTRACTS.SLISBNB_TOKEN.address,
        unstakeAmount,
        ""
      );
      const unstakeReceipt = await unstakeTx.wait();

      const slisBNBToken = new ethers.Contract(
        CONTRACTS.SLISBNB_TOKEN.address,
        CONTRACTS.SLISBNB_TOKEN.abi,
        wallet
      );
      const slisBNBBalance = await slisBNBToken.balanceOf(walletAddress);
      const remainingStaked = await kernelDAO.balanceOf(
        CONTRACTS.SLISBNB_TOKEN.address,
        walletAddress
      );

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            status: "success",
            message: "Successfully unstaked slisBNB from KernelDAO",
            transaction: {
              amountUnstaked: formatBalance(unstakeAmount),
              txHash: unstakeReceipt.hash,
              blockNumber: unstakeReceipt.blockNumber,
              gasUsed: unstakeReceipt.gasUsed.toString()
            },
            balances: {
              slisBNBInWallet: formatBalance(slisBNBBalance),
              remainingStakedInKernel: formatBalance(remainingStaked)
            },
            walletAddress,
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
            message: `KernelDAO unstaking failed: ${error.message}`,
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

// Check BNB balance
server.tool(
  "checkBNBBalance",
  "Check BNB native token balance for any wallet address on BSC network. ",
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

// Check slisBNB balance
server.tool(
  "checkSlisBNBBalance",
  "Check slisBNB liquid staking token balance and staker shares for any wallet address on BSC network from Lista DAO protocol",
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
  "checkKERNELDAOSTAKE",
  "Check staked slisBNB balance on KernelDAO protocol for any wallet address on BSC network to view additional staking positions",
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