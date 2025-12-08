# SecureChainPay 🔐

A full-fledged blockchain payment dApp for sending and receiving ERC-20 tokens (SCP - SecureChainPay Token) on the Ethereum Sepolia testnet. Built with Next.js, TypeScript, Solidity, Chainlink, and Supabase.

![SecureChainPay](https://img.shields.io/badge/Blockchain-Payment%20dApp-purple)
![Ethereum](https://img.shields.io/badge/Ethereum-Sepolia-blue)
![Next.js](https://img.shields.io/badge/Next.js-14-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![Solidity](https://img.shields.io/badge/Solidity-0.8.20-orange)

## 🌟 Features

### Core Functionality
- **User Authentication**: Supabase-powered email/password authentication
- **Wallet Integration**: MetaMask wallet connection with user-wallet mapping
- **ERC-20 Payments**: Send and receive SCP tokens on Sepolia testnet
- **Transaction History**: Complete on-chain and off-chain transaction records
- **Chainlink Price Feeds**: Real-time ETH/USD price data
- **Faucet System**: Get test SCP tokens for development
- **Network Detection**: Automatic Sepolia network detection and switching

### Technical Features
- **Smart Contracts**: 
  - ERC-20 SCP Token with faucet functionality
  - Payment contract with Chainlink integration
  - Event-driven architecture for off-chain indexing
- **Database**: PostgreSQL (Supabase) with Row Level Security
- **Wallet Support**: MetaMask with ethers.js v6
- **Responsive Design**: Mobile-first UI with Tailwind CSS
- **Real-time Updates**: Automatic balance and transaction updates

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 14 (App Router), TypeScript, Tailwind CSS |
| **Wallet** | MetaMask, ethers.js v6 |
| **Smart Contracts** | Solidity 0.8.20, OpenZeppelin, Chainlink |
| **Database** | Supabase (PostgreSQL) |
| **Blockchain** | Ethereum Sepolia Testnet |
| **Development** | Remix IDE (for contracts) |
| **Oracles** | Chainlink Price Feeds |

## 📋 Prerequisites

Before you begin, ensure you have:

- **Node.js** 18+ and npm/yarn installed
- **MetaMask** browser extension installed
- **Sepolia ETH** for gas fees ([Get from faucet](https://sepoliafaucet.com/))
- **Supabase Account** ([Sign up here](https://supabase.com))
- **Alchemy/Infura Account** for RPC access (optional but recommended)

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/secure-chain.git
cd secure-chain
```

### 2. Install Dependencies

```bash
npm install
# or
yarn install
```

### 3. Deploy Smart Contracts

Follow the detailed instructions in [contracts/README.md](./contracts/README.md):

1. Open [Remix IDE](https://remix.ethereum.org/)
2. Deploy `SCPToken.sol` to Sepolia
3. Deploy `SecureChainPayment.sol` with:
   - SCP Token address from step 2
   - Chainlink ETH/USD feed: `0x694AA1769357215DE4FAC081bf1f309aDC325306`
4. Save both contract addresses

### 4. Set Up Supabase

Follow the instructions in [supabase/README.md](./supabase/README.md):

1. Create a new Supabase project
2. Run the SQL schema from `supabase/schema.sql`
3. Copy your project URL and anon key

### 5. Configure Environment Variables

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Update the `.env` file with your values:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# Ethereum Configuration
NEXT_PUBLIC_SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_ALCHEMY_KEY
NEXT_PUBLIC_SCP_TOKEN_ADDRESS=0x... # Your deployed SCP token address
NEXT_PUBLIC_PAYMENT_CONTRACT_ADDRESS=0x... # Your deployed payment contract address

# Chainlink Price Feed (ETH/USD on Sepolia)
NEXT_PUBLIC_CHAINLINK_ETH_USD_FEED=0x694AA1769357215DE4FAC081bf1f309aDC325306

# WalletConnect Project ID (optional - for future RainbowKit integration)
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your-project-id
```

### 6. Run the Development Server

```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📖 Usage Guide

### First-Time Setup

1. **Sign Up**: Create an account on the landing page
2. **Verify Email**: Check your email and verify your account (if enabled)
3. **Sign In**: Log in with your credentials
4. **Connect MetaMask**: Click "Connect MetaMask" button
5. **Switch Network**: If prompted, switch to Sepolia testnet
6. **Claim Tokens**: Use the faucet to get 100 SCP tokens
7. **Approve Tokens**: Click "Approve Tokens" to allow the payment contract to spend your SCP

### Sending a Payment

1. Navigate to the **Dashboard**
2. Fill in the **Send Payment** form:
   - **Receiver Address**: Ethereum address (0x...)
   - **Amount**: Number of SCP tokens
   - **Note**: Optional message
3. Click **Send Payment**
4. Confirm the transaction in MetaMask
5. Wait for confirmation (transaction appears in Recent Transactions)

### Viewing Transaction History

1. Click **Transactions** in the header
2. View all your transactions with:
   - Filter by Sent/Received/All
   - Pagination for large histories
   - Links to Etherscan for verification
3. Click any transaction hash to view details on Etherscan

## 🏛️ Architecture

### Smart Contract Architecture

```
SCPToken.sol
├── ERC20 Standard Implementation
├── Ownable (for admin functions)
├── Faucet System (100 SCP per 24h)
└── Minting Capability

SecureChainPayment.sol
├── Payment Processing
├── Chainlink Price Feed Integration
├── Transaction Metadata Storage
├── Platform Fee Mechanism
└── Event Emissions for Indexing
```

### Database Schema

```sql
user_wallets
├── id (UUID)
├── user_id (FK to auth.users)
├── wallet_address (unique)
└── timestamps

transactions
├── id (UUID)
├── tx_hash (unique)
├── sender_address
├── receiver_address
├── amount
├── note
├── status (pending/confirmed/failed)
├── eth_usd_price
└── timestamps
```

### Frontend Structure

```
app/
├── page.tsx                 # Landing page with auth
├── dashboard/
│   └── page.tsx            # Main dashboard
├── transactions/
│   └── page.tsx            # Transaction history
└── layout.tsx              # Root layout with providers

lib/
├── web3/
│   └── index.ts            # Web3 utilities
├── supabase/
│   ├── client.ts           # Supabase client
│   └── database.ts         # Database operations
└── contracts/
    ├── SCPTokenABI.ts
    └── SecureChainPaymentABI.ts

contexts/
├── AuthContext.tsx         # Authentication state
└── Web3Context.tsx         # Web3 state
```

## 🔒 Security Considerations

### Smart Contracts
- ✅ Uses OpenZeppelin audited contracts
- ✅ ReentrancyGuard on payment functions
- ✅ Access control with Ownable
- ⚠️ Faucet function should be removed for mainnet
- ⚠️ Audit required before production use

### Frontend
- ✅ Input validation on all forms
- ✅ Network verification before transactions
- ✅ Error handling for all async operations
- ✅ Secure environment variable handling

### Database
- ✅ Row Level Security (RLS) enabled
- ✅ Prepared statements (automatic with Supabase)
- ✅ User-wallet ownership verification
- ✅ Minimal data exposure through policies

## 🧪 Testing

### Testing the Faucet

```bash
# In the dashboard, click "Claim 100 SCP (Faucet)"
# Wait for transaction confirmation
# Check your balance updated
```

### Testing Payments

1. Create two accounts (or use two different MetaMask addresses)
2. Claim tokens from faucet on both
3. Approve tokens on sender account
4. Send tokens from Account A to Account B
5. Verify transaction appears on both accounts
6. Check Etherscan for on-chain verification

### Testing Chainlink Integration

The ETH/USD price is displayed on the dashboard and recorded with each transaction. Verify:
- Price updates when you reload the page
- Transactions store the price at time of send
- Price is visible in transaction history

## 🐛 Troubleshooting

### "MetaMask is not installed"
- Install MetaMask browser extension
- Refresh the page after installation

### "Please switch to Sepolia testnet"
- Click "Switch Network" button
- Or manually switch in MetaMask

### "Failed to claim from faucet"
- Check if 24 hours have passed since last claim
- Ensure you have Sepolia ETH for gas
- Verify you're on the correct network

### "Token transfer failed"
- Click "Approve Tokens" first
- Ensure you have sufficient SCP balance
- Verify receiver address is valid

### "RPC Error" or "Network Error"
- Check your RPC URL in `.env`
- Try using a different RPC provider
- Verify Sepolia network is operational

### Transactions Not Appearing in Database
- Check Supabase RLS policies
- Verify wallet is linked to user account
- Check browser console for errors

## 📊 Environment Variables Reference

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Yes | `https://xxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key | Yes | `eyJhbGc...` |
| `NEXT_PUBLIC_SEPOLIA_RPC_URL` | Ethereum RPC endpoint | Yes | `https://eth-sepolia...` |
| `NEXT_PUBLIC_SCP_TOKEN_ADDRESS` | Deployed SCP token address | Yes | `0x1234...` |
| `NEXT_PUBLIC_PAYMENT_CONTRACT_ADDRESS` | Payment contract address | Yes | `0x5678...` |
| `NEXT_PUBLIC_CHAINLINK_ETH_USD_FEED` | Chainlink price feed | Yes | `0x694A...` |

## 🛣️ Roadmap

- [ ] Add support for multiple ERC-20 tokens
- [ ] Implement transaction receipt downloads
- [ ] Add user profile customization
- [ ] Integrate WalletConnect for mobile wallets
- [ ] Add transaction notifications
- [ ] Implement batch payments
- [ ] Add mainnet support (after audit)
- [ ] Create mobile app version
- [ ] Add fiat on-ramp integration
- [ ] Implement recurring payments

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📧 Support

For questions or issues:
- Open an issue on GitHub
- Check existing documentation
- Review Supabase and Chainlink documentation

## 🙏 Acknowledgments

- [OpenZeppelin](https://openzeppelin.com/) for secure smart contract libraries
- [Chainlink](https://chain.link/) for decentralized oracle networks
- [Supabase](https://supabase.com/) for backend infrastructure
- [Next.js](https://nextjs.org/) for the React framework
- [ethers.js](https://docs.ethers.org/) for Ethereum interactions

## ⚠️ Disclaimer

This project is for educational and demonstration purposes. It runs on Ethereum's Sepolia testnet using test tokens with no real value. Do not deploy to mainnet without:

1. Comprehensive security audit
2. Proper testing and QA
3. Legal compliance review
4. Removing development features (like faucet)

---

**Built with ❤️ using Next.js, Solidity, Chainlink, and Supabase**
