# SecureChainPay - Quick Setup Checklist

Follow this checklist to get SecureChainPay up and running.

## ✅ Prerequisites
- [ ] Node.js 18+ installed
- [ ] MetaMask browser extension installed
- [ ] Sepolia ETH in your wallet ([Get from faucet](https://sepoliafaucet.com/))
- [ ] Supabase account created
- [ ] Alchemy or Infura account (for RPC)

## 🔧 Setup Steps

### 1. Project Setup
- [ ] Clone the repository
- [ ] Run `npm install`
- [ ] Copy `.env.example` to `.env`

### 2. Smart Contract Deployment
- [ ] Open [Remix IDE](https://remix.ethereum.org/)
- [ ] Create `SCPToken.sol` file in Remix
- [ ] Paste contract code from `contracts/SCPToken.sol`
- [ ] Compile with Solidity 0.8.20+
- [ ] Deploy to Sepolia testnet
- [ ] **Save SCP Token address**: `___________________________`
- [ ] Create `SecureChainPayment.sol` file in Remix
- [ ] Paste contract code from `contracts/SecureChainPayment.sol`
- [ ] Deploy with parameters:
  - SCP Token Address: (from above)
  - Chainlink Feed: `0x694AA1769357215DE4FAC081bf1f309aDC325306`
- [ ] **Save Payment Contract address**: `___________________________`

### 3. Supabase Setup
- [ ] Create new Supabase project
- [ ] Go to SQL Editor
- [ ] Run the schema from `supabase/schema.sql`
- [ ] **Save Supabase URL**: `___________________________`
- [ ] **Save Supabase Anon Key**: `___________________________`
- [ ] Verify tables created: `user_wallets`, `transactions`, `user_profiles`, `app_logs`
- [ ] Verify RLS is enabled on all tables

### 4. Environment Configuration
Update your `.env` file with:
- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `NEXT_PUBLIC_SEPOLIA_RPC_URL`
- [ ] `NEXT_PUBLIC_SCP_TOKEN_ADDRESS`
- [ ] `NEXT_PUBLIC_PAYMENT_CONTRACT_ADDRESS`

### 5. Testing
- [ ] Run `npm run dev`
- [ ] Open http://localhost:3000
- [ ] Sign up for an account
- [ ] Connect MetaMask wallet
- [ ] Switch to Sepolia network
- [ ] Claim tokens from faucet
- [ ] Approve tokens for spending
- [ ] Send a test payment to another address
- [ ] View transaction in history
- [ ] Verify transaction on Etherscan

## 🎯 Deployment Checklist (Production)

### Before Deploying to Production:
- [ ] Remove or restrict faucet function from SCP token
- [ ] Audit smart contracts professionally
- [ ] Set up proper environment variables in hosting platform
- [ ] Enable email verification in Supabase
- [ ] Configure custom domain
- [ ] Set up monitoring and alerts
- [ ] Test on mainnet with small amounts first
- [ ] Update RPC URLs for mainnet
- [ ] Deploy contracts to mainnet
- [ ] Update all contract addresses in .env

## 📝 Common Issues

### Issue: MetaMask not connecting
- [ ] Check MetaMask is installed
- [ ] Try refreshing the page
- [ ] Check browser console for errors

### Issue: Transactions failing
- [ ] Verify you're on Sepolia network
- [ ] Check you have Sepolia ETH for gas
- [ ] Ensure tokens are approved
- [ ] Check contract addresses are correct

### Issue: Database errors
- [ ] Verify Supabase URL and key
- [ ] Check RLS policies are set up
- [ ] Ensure user is authenticated
- [ ] Check browser console for specific errors

## 🔗 Useful Links

- [Remix IDE](https://remix.ethereum.org/)
- [Sepolia Faucet](https://sepoliafaucet.com/)
- [Sepolia Etherscan](https://sepolia.etherscan.io/)
- [Supabase Dashboard](https://app.supabase.com/)
- [Alchemy](https://www.alchemy.com/)
- [MetaMask Download](https://metamask.io/)
- [Chainlink Sepolia Feeds](https://docs.chain.link/data-feeds/price-feeds/addresses?network=ethereum&page=1#sepolia-testnet)

## 💡 Tips

1. **Keep your contract addresses safe** - Write them down as you deploy
2. **Use different accounts for testing** - Test sending between accounts
3. **Monitor gas prices** - Sepolia can be congested sometimes
4. **Check transaction status** - Use Etherscan to verify transactions
5. **Backup your .env file** - But never commit it to Git!

---

**Need help?** Check the main [README.md](./README.md) or open an issue on GitHub.
