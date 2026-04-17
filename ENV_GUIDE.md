# Environment Variables Configuration Guide

This guide explains all environment variables needed for SecureChainPay.

## 📋 Required Variables

### 1. Supabase Configuration

#### NEXT_PUBLIC_SUPABASE_URL
- **Description**: Your Supabase project URL
- **Where to find**: Supabase Dashboard → Settings → API
- **Format**: `https://xxxxxxxxxxxxx.supabase.co`
- **Example**: `https://abcdefghijklmnop.supabase.co`

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
```

#### NEXT_PUBLIC_SUPABASE_ANON_KEY
- **Description**: Public anonymous key for client-side Supabase access
- **Where to find**: Supabase Dashboard → Settings → API → "anon public"
- **Format**: Long JWT token starting with `eyJ`
- **Security**: Safe to expose (public key)

```env
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

⚠️ **Note**: NEVER use the `service_role` key on the frontend!

---

### 2. Ethereum Configuration

#### NEXT_PUBLIC_SEPOLIA_RPC_URL
- **Description**: RPC endpoint for connecting to Sepolia testnet
- **Providers**:
  - Alchemy: `https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY`
  - Infura: `https://sepolia.infura.io/v3/YOUR_API_KEY`
  - QuickNode: Your QuickNode Sepolia endpoint
  - Public: `https://rpc.sepolia.org` (may be slow)

**Getting an API Key**:

**Alchemy** (Recommended):
1. Go to [alchemy.com](https://www.alchemy.com/)
2. Sign up for free account
3. Create new app → Select "Sepolia"
4. Copy HTTP URL

**Infura**:
1. Go to [infura.io](https://infura.io/)
2. Sign up for free account
3. Create new API key
4. Select "Sepolia" network
5. Copy endpoint

```env
NEXT_PUBLIC_SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_ALCHEMY_KEY
```

#### NEXT_PUBLIC_SCP_TOKEN_ADDRESS
- **Description**: Deployed SCPToken contract address
- **When to set**: After deploying SCPToken.sol via Remix
- **Format**: Ethereum address (42 characters, starts with 0x)
- **Example**: `0x1234567890123456789012345678901234567890`

```env
NEXT_PUBLIC_SCP_TOKEN_ADDRESS=0x...
```

**How to get**:
1. Deploy SCPToken.sol in Remix IDE
2. Copy the deployed contract address
3. Paste here

⚠️ **Required for live payments**: without this value, the app blocks token transfers.

#### NEXT_PUBLIC_PAYMENT_CONTRACT_ADDRESS
- **Description**: Deployed SecureChainPayment contract address
- **When to set**: After deploying SecureChainPayment.sol via Remix
- **Format**: Ethereum address (42 characters, starts with 0x)

```env
NEXT_PUBLIC_PAYMENT_CONTRACT_ADDRESS=0x...
```

**How to get**:
1. Deploy SecureChainPayment.sol in Remix IDE
2. Copy the deployed contract address
3. Paste here

⚠️ **Required for live payments**: without this value, the app blocks payment execution.

---

### 3. Chainlink Configuration

#### NEXT_PUBLIC_CHAINLINK_ETH_USD_FEED
- **Description**: Chainlink ETH/USD price feed contract on Sepolia
- **Value**: `0x694AA1769357215DE4FAC081bf1f309aDC325306`
- **Network**: Sepolia Testnet
- **Don't change**: This is the official Chainlink feed address

```env
NEXT_PUBLIC_CHAINLINK_ETH_USD_FEED=0x694AA1769357215DE4FAC081bf1f309aDC325306
```

**Other Chainlink Feeds** (if you want to experiment):
- BTC/USD: `0x1b44F3514812d835EB1BDB0acB33d3fA3351Ee43`
- LINK/USD: `0xc59E3633BAAC79493d908e63626716e204A45EdF`

More feeds: [Chainlink Sepolia Feeds](https://docs.chain.link/data-feeds/price-feeds/addresses?network=ethereum&page=1#sepolia-testnet)

---

### 4. Optional Configuration

#### NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID
- **Description**: WalletConnect project ID (for future RainbowKit integration)
- **When needed**: If implementing WalletConnect
- **Where to get**: [WalletConnect Cloud](https://cloud.walletconnect.com/)
- **Currently**: Optional, not used yet

```env
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id_here
```

---

## 📝 Complete .env Template

```env
# ==============================================
# SUPABASE CONFIGURATION
# ==============================================
# Your Supabase project URL
# Find at: https://app.supabase.com/project/_/settings/api
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co

# Your Supabase anonymous/public key
# Find at: https://app.supabase.com/project/_/settings/api
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# ==============================================
# ETHEREUM CONFIGURATION
# ==============================================
# Sepolia RPC URL (get from Alchemy, Infura, etc.)
NEXT_PUBLIC_SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY

# Deployed SCP Token contract address (deploy via Remix)
NEXT_PUBLIC_SCP_TOKEN_ADDRESS=0x0000000000000000000000000000000000000000

# Deployed Payment contract address (deploy via Remix)
NEXT_PUBLIC_PAYMENT_CONTRACT_ADDRESS=0x0000000000000000000000000000000000000000

# ==============================================
# CHAINLINK CONFIGURATION
# ==============================================
# Chainlink ETH/USD price feed on Sepolia (DO NOT CHANGE)
NEXT_PUBLIC_CHAINLINK_ETH_USD_FEED=0x694AA1769357215DE4FAC081bf1f309aDC325306

# ==============================================
# OPTIONAL CONFIGURATION
# ==============================================
# WalletConnect Project ID (optional - for future use)
# NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=
```

---

## 🔒 Security Best Practices

### DO ✅
- Use different values for development and production
- Keep `.env` file in `.gitignore`
- Use environment variables in hosting platform (Vercel, Netlify, etc.)
- Rotate keys regularly
- Use `.env.local` for local development

### DON'T ❌
- Never commit `.env` to Git
- Never share your `.env` file
- Never use `service_role` key on frontend
- Never hardcode secrets in code
- Never expose private keys

---

## 🔍 Verification Checklist

After setting up, verify:

- [ ] Supabase connection works
  ```javascript
  // Test in browser console
  import { supabase } from '@/lib/supabase/client';
  await supabase.from('transactions').select('count');
  ```

- [ ] RPC connection works
  ```javascript
  // Test in browser console
  const provider = new ethers.BrowserProvider(window.ethereum);
  await provider.getNetwork();
  ```

- [ ] Contract addresses are valid
  ```javascript
  // Check contract is deployed
  const code = await provider.getCode('YOUR_CONTRACT_ADDRESS');
  console.log(code !== '0x'); // Should be true
  ```

---

## 🐛 Troubleshooting

### "Supabase client error"
- ✅ Check URL format (must include https://)
- ✅ Verify anon key is complete
- ✅ Ensure no extra spaces

### "RPC error" or "Network error"
- ✅ Verify RPC URL is correct
- ✅ Check API key is active
- ✅ Try different RPC provider
- ✅ Check rate limits

### "Contract not found"
- ✅ Ensure contract is deployed
- ✅ Verify you're on Sepolia network
- ✅ Check address is correct (42 chars, starts with 0x)
- ✅ Verify on Etherscan

### "Environment variable undefined"
- ✅ Restart dev server after changing `.env`
- ✅ Check variable name spelling
- ✅ Ensure `NEXT_PUBLIC_` prefix for client-side vars
- ✅ Clear Next.js cache: `rm -rf .next`

---

## 📱 Different Environments

### Development (.env.local)
```env
NEXT_PUBLIC_SUPABASE_URL=https://dev-project.supabase.co
# ... development values
```

### Production (.env.production)
```env
NEXT_PUBLIC_SUPABASE_URL=https://prod-project.supabase.co
# ... production values
```

### Vercel/Netlify
- Add variables in dashboard
- Environment: Production/Preview/Development
- Don't prefix with `NEXT_PUBLIC_` in dashboard (Next.js handles it)

---

## 🔗 Helpful Resources

- [Supabase API Settings](https://app.supabase.com/)
- [Alchemy Dashboard](https://dashboard.alchemy.com/)
- [Infura Dashboard](https://infura.io/dashboard)
- [Chainlink Price Feeds](https://docs.chain.link/data-feeds/price-feeds/addresses)
- [Sepolia Etherscan](https://sepolia.etherscan.io/)
- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)

---

**Need Help?** Check [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for common issues!
