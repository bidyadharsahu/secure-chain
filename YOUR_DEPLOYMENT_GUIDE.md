# 🚀 Your SecureChainPay Deployment Guide

Your credentials have been configured! Follow these steps to complete the deployment.

## ✅ Step 1: Setup Supabase Database (5 minutes)

### Go to Supabase SQL Editor:
1. Open: https://aocicxbirzgsflxnyldq.supabase.co
2. Sign in to your Supabase account
3. Click on "SQL Editor" in the left sidebar
4. Click "New Query"

### Run the Database Schema:
1. Open the file: `supabase/schema.sql`
2. Copy ALL the contents (Ctrl+A, Ctrl+C)
3. Paste into Supabase SQL Editor
4. Click "Run" button (or press Ctrl+Enter)
5. Wait for "Success. No rows returned" message

### Verify Database Setup:
After running the schema, you should see these tables in "Table Editor":
- ✅ user_wallets
- ✅ transactions
- ✅ user_profiles
- ✅ app_logs

---

## ✅ Step 2: Deploy Smart Contracts (10 minutes)

### Your Wallet Address: 
`0x14778de48e79d587a57254341e608e0d0932fd20`

### Prerequisites:
1. ✅ Ensure you have Sepolia ETH in your wallet
   - Get free Sepolia ETH: https://sepoliafaucet.com/
   - Or: https://www.alchemy.com/faucets/ethereum-sepolia
   - Enter your address: `0x14778de48e79d587a57254341e608e0d0932fd20`

2. ✅ MetaMask installed and set to Sepolia network

### Deploy SCPToken Contract:

1. **Open Remix IDE**: https://remix.ethereum.org/

2. **Create SCPToken.sol**:
   - Click "contracts" folder
   - Click "Create New File"
   - Name it: `SCPToken.sol`
   - Copy contents from: `contracts/SCPToken.sol`
   - Paste into Remix

3. **Compile**:
   - Click "Solidity Compiler" tab (left sidebar)
   - Select compiler: `0.8.20` or higher
   - Click "Compile SCPToken.sol"
   - Wait for green checkmark ✅

4. **Deploy**:
   - Click "Deploy & Run Transactions" tab
   - Environment: Select "Injected Provider - MetaMask"
   - MetaMask will popup - click "Connect"
   - Ensure you're on "Sepolia" network
   - Contract: Select "SCPToken"
   - Click "Deploy" button (orange)
   - Confirm transaction in MetaMask
   - Wait for confirmation (~30 seconds)

5. **Save Address**:
   - After deployment, you'll see the contract under "Deployed Contracts"
   - Click the copy button next to the contract address
   - **IMPORTANT**: Save this address, we'll need it next!
   - Example: `0x1234...5678`

### Deploy SecureChainPayment Contract:

1. **Create SecureChainPayment.sol**:
   - In Remix, create new file: `SecureChainPayment.sol`
   - Copy contents from: `contracts/SecureChainPayment.sol`
   - Paste into Remix

2. **Compile**:
   - Click "Solidity Compiler" tab
   - Click "Compile SecureChainPayment.sol"
   - Wait for green checkmark ✅

3. **Deploy with Parameters**:
   - Click "Deploy & Run Transactions" tab
   - Contract: Select "SecureChainPayment"
   - You'll see two input fields for constructor:
   
   **Field 1 (_scpTokenAddress)**: Paste your SCPToken address from above
   **Field 2 (_priceFeedAddress)**: `0x694AA1769357215DE4FAC081bf1f309aDC325306`
   
   - Click "Deploy" (orange button)
   - Confirm in MetaMask
   - Wait for confirmation

4. **Save Address**:
   - Copy the deployed SecureChainPayment contract address
   - **IMPORTANT**: Save this address!

### Verify on Etherscan:
- SCPToken: https://sepolia.etherscan.io/address/YOUR_TOKEN_ADDRESS
- Payment Contract: https://sepolia.etherscan.io/address/YOUR_PAYMENT_ADDRESS

---

## ✅ Step 3: Update .env File

After deploying both contracts, update your `.env` file:

1. Open: `.env` file in the project root
2. Find these lines:
   ```
   NEXT_PUBLIC_SCP_TOKEN_ADDRESS=0x0000000000000000000000000000000000000000
   NEXT_PUBLIC_PAYMENT_CONTRACT_ADDRESS=0x0000000000000000000000000000000000000000
   ```
3. Replace with your actual contract addresses:
   ```
   NEXT_PUBLIC_SCP_TOKEN_ADDRESS=YOUR_SCPTOKEN_ADDRESS
   NEXT_PUBLIC_PAYMENT_CONTRACT_ADDRESS=YOUR_PAYMENT_CONTRACT_ADDRESS
   ```
4. Save the file

---

## ✅ Step 4: Test Locally

### Start Development Server:
```bash
npm run dev
```

### Open Application:
- URL: http://localhost:3000
- You should see the SecureChainPay landing page

### Test Flow:
1. **Sign Up**: Create an account with email/password
2. **Connect Wallet**: Click "Connect MetaMask"
3. **Approve Connection**: Confirm in MetaMask
4. **Claim Tokens**: Click "Claim 100 SCP (Faucet)" button
5. **Approve Tokens**: Click "Approve Tokens" button
6. **Send Payment**: Try sending tokens to another address

---

## ✅ Step 5: Deploy to Vercel (Optional)

### Quick Deploy:
1. Push code to GitHub:
   ```bash
   git add .
   git commit -m "Initial deployment"
   git push origin main
   ```

2. Go to: https://vercel.com/
3. Click "Import Project"
4. Select your GitHub repository
5. Add Environment Variables (from your `.env` file)
6. Click "Deploy"

---

## 📋 Your Configuration Summary

### Supabase:
- ✅ URL: https://aocicxbirzgsflxnyldq.supabase.co
- ✅ Anon Key: Configured in .env

### Alchemy:
- ✅ RPC: https://eth-sepolia.g.alchemy.com/v2/2o8bO42GpPHCqsAgiDle4

### Your Wallet:
- ✅ Address: 0x14778de48e79d587a57254341e608e0d0932fd20

### Contracts (To be filled after deployment):
- ⏳ SCP Token: `_________________________________`
- ⏳ Payment Contract: `_________________________________`

---

## 🆘 Need Help?

### Supabase Setup Issues:
- Make sure you're signed in to Supabase
- Ensure SQL query runs without errors
- Check "Table Editor" for created tables

### Contract Deployment Issues:
- Ensure you have Sepolia ETH
- Verify MetaMask is on Sepolia network
- Check Remix console for errors

### Application Issues:
- Restart dev server after updating .env
- Clear browser cache
- Check browser console for errors

---

## 📞 Next Steps After Deployment:

1. ✅ Test faucet functionality
2. ✅ Test sending payments
3. ✅ Verify transactions on Etherscan
4. ✅ Check transaction history in app
5. ✅ Invite friends to test!

---

**You're almost there! Complete Steps 1 & 2, then let me know your contract addresses!** 🚀
