# Smart Contracts for SecureChainPay

This directory contains the Solidity smart contracts for SecureChainPay.

## Contracts

### 1. SCPToken.sol
ERC-20 token contract for SecureChainPay Token (SCP).

**Features:**
- Standard ERC-20 implementation
- Initial supply: 1,000,000 SCP
- Faucet function for demo (100 SCP per claim, 24-hour cooldown)
- Owner can mint additional tokens

### 2. SecureChainPayment.sol
Main payment contract that handles SCP token transfers with metadata.

**Features:**
- Send payments with optional notes
- Integration with Chainlink ETH/USD price feed
- Transaction history on-chain
- Platform fee mechanism (optional)
- Event emissions for off-chain indexing

## Deployment Instructions (Remix IDE)

### Prerequisites
1. MetaMask installed and configured
2. Sepolia testnet ETH (get from https://sepoliafaucet.com/)
3. Access to Remix IDE (https://remix.ethereum.org/)

### Step 1: Deploy SCPToken

1. Open Remix IDE
2. Create a new file `SCPToken.sol` and paste the contract code
3. Go to the "Solidity Compiler" tab
4. Select compiler version `0.8.20` or higher
5. Click "Compile SCPToken.sol"
6. Go to "Deploy & Run Transactions" tab
7. Set Environment to "Injected Provider - MetaMask"
8. Ensure MetaMask is connected to Sepolia testnet
9. Select `SCPToken` from the contract dropdown
10. Click "Deploy"
11. Confirm the transaction in MetaMask
12. **Save the deployed contract address** - you'll need this for:
    - `.env` file (`NEXT_PUBLIC_SCP_TOKEN_ADDRESS`)
    - Deploying SecureChainPayment contract

### Step 2: Deploy SecureChainPayment

1. Create a new file `SecureChainPayment.sol` in Remix
2. Paste the contract code
3. Compile the contract (same compiler version)
4. In "Deploy & Run Transactions" tab:
   - Select `SecureChainPayment` contract
   - Enter constructor parameters:
     - `_scpTokenAddress`: The SCP token contract address from Step 1
     - `_priceFeedAddress`: Chainlink ETH/USD feed on Sepolia: `0x694AA1769357215DE4FAC081bf1f309aDC325306`
5. Click "Deploy"
6. Confirm the transaction in MetaMask
7. **Save the deployed contract address** for `.env` file (`NEXT_PUBLIC_PAYMENT_CONTRACT_ADDRESS`)

### Step 3: Verify Deployment

After deployment, verify the contracts are working:

1. **Test SCPToken:**
   - Call `balanceOf` with your address - should show initial supply
   - Call `claimFromFaucet` to get 100 test tokens
   - Check `balanceOf` again to confirm

2. **Test SecureChainPayment:**
   - Call `getLatestPrice` - should return ETH/USD price
   - Call `scpToken` - should return your SCP token address

### Step 4: Approve Token Spending

Before making payments through the SecureChainPayment contract:

1. In Remix, interact with `SCPToken` contract
2. Call `approve` function:
   - `spender`: SecureChainPayment contract address
   - `amount`: A large number (e.g., 1000000000000000000000 for 1000 tokens)
3. Confirm in MetaMask

### Step 5: Update .env File

Copy `.env.example` to `.env` and add your deployed addresses:

```
NEXT_PUBLIC_SCP_TOKEN_ADDRESS=0x...
NEXT_PUBLIC_PAYMENT_CONTRACT_ADDRESS=0x...
```

## Contract ABIs

After compilation in Remix, you can find the ABI in:
1. Solidity Compiler tab
2. Click "ABI" button to copy
3. Save to `lib/contracts/` directory in the frontend

## Chainlink Price Feed (Sepolia)

- ETH/USD: `0x694AA1769357215DE4FAC081bf1f309aDC325306`
- Returns price with 8 decimals

## Testing on Sepolia

1. Use the faucet function to get test SCP tokens
2. Test sending payments through the SecureChainPayment contract
3. Monitor transactions on Sepolia Etherscan

## Security Considerations

- These contracts are for educational/demo purposes
- Audit before using in production
- The faucet function should be removed/restricted for mainnet deployment
- Platform fees are set to 0% by default

## OpenZeppelin & Chainlink Dependencies

When deploying via Remix, imports are automatically resolved:
- OpenZeppelin Contracts v5.0.0
- Chainlink Contracts v0.8.0

For local development with Hardhat/Foundry:
```bash
npm install @openzeppelin/contracts @chainlink/contracts
```
