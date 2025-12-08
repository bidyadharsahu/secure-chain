# Troubleshooting Guide

Common issues and their solutions for SecureChainPay.

## 🔌 Connection Issues

### MetaMask Not Detected

**Error**: "MetaMask is not installed"

**Solutions**:
1. Install MetaMask browser extension
2. Refresh the page after installation
3. Check if MetaMask is enabled for the site
4. Try a different browser
5. Clear browser cache and cookies

**Verification**:
```javascript
// In browser console
console.log(window.ethereum)
// Should output an object, not undefined
```

### Wallet Connection Fails

**Error**: "Failed to connect wallet"

**Solutions**:
1. Unlock MetaMask
2. Ensure MetaMask is not already connected to another dApp
3. Try disconnecting and reconnecting
4. Check if MetaMask is up to date
5. Restart browser

### Network Issues

**Error**: "Please switch to Sepolia testnet"

**Solutions**:
1. Click "Switch Network" button
2. Manually switch in MetaMask:
   - Open MetaMask
   - Click network dropdown
   - Select "Sepolia Test Network"
3. If Sepolia not visible:
   - Go to MetaMask Settings → Networks
   - Enable "Show test networks"

## 🔗 Smart Contract Issues

### Transaction Fails

**Error**: "Transaction failed"

**Common Causes & Solutions**:

1. **Insufficient Gas**
   - Increase gas limit in MetaMask
   - Check you have enough Sepolia ETH

2. **Insufficient Token Balance**
   - Check SCP token balance
   - Claim from faucet if needed

3. **Token Not Approved**
   - Click "Approve Tokens" button
   - Wait for approval transaction to confirm
   - Then retry payment

4. **Invalid Receiver Address**
   - Ensure address starts with "0x"
   - Verify address is 42 characters long
   - Check for typos

**Verification**:
```javascript
// Check if tokens are approved
// In browser console on dashboard
await window.ethereum.request({
  method: 'eth_call',
  params: [{
    to: 'SCP_TOKEN_ADDRESS',
    data: 'ALLOWANCE_FUNCTION_SELECTOR'
  }]
})
```

### Faucet Claim Fails

**Error**: "Faucet cooldown period not elapsed"

**Solutions**:
1. Wait 24 hours since last claim
2. Check if you're using the correct address
3. Verify contract deployment

**Error**: "Failed to claim from faucet"

**Solutions**:
1. Ensure you have Sepolia ETH for gas
2. Check you're on Sepolia network
3. Verify contract address is correct
4. Check contract hasn't run out of tokens (if applicable)

## 🗄️ Database Issues

### Data Not Saving

**Error**: "Failed to save transaction"

**Solutions**:
1. Check Supabase URL and key in `.env`
2. Verify RLS policies are set up correctly
3. Ensure user is authenticated
4. Check browser console for specific errors

**Verification**:
```javascript
// Test Supabase connection
import { supabase } from '@/lib/supabase/client';
const { data, error } = await supabase.from('transactions').select('count');
console.log(data, error);
```

### Transactions Not Appearing

**Error**: Transactions don't show in history

**Solutions**:
1. Check wallet is linked to user account
2. Verify transaction was confirmed on-chain
3. Refresh the page
4. Check Supabase RLS policies
5. Look for errors in browser console

**Debug Steps**:
```sql
-- In Supabase SQL Editor
SELECT * FROM user_wallets WHERE user_id = 'YOUR_USER_ID';
SELECT * FROM transactions WHERE sender_address = 'YOUR_WALLET_ADDRESS';
```

### RLS Policy Errors

**Error**: "new row violates row-level security policy"

**Solutions**:
1. Verify user is authenticated
2. Check policy conditions match your use case
3. Ensure wallet is linked to user
4. Review RLS policies in Supabase

**Fix RLS Issues**:
```sql
-- Temporarily disable RLS for testing (re-enable after!)
ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;

-- Re-enable
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
```

## 🎨 Frontend Issues

### Page Not Loading

**Error**: White screen or loading forever

**Solutions**:
1. Check browser console for errors
2. Verify all environment variables are set
3. Try clearing browser cache
4. Check if services are running:
   - Next.js dev server
   - Supabase
   - MetaMask

**Debug**:
```bash
# Check for TypeScript errors
npm run type-check

# Check for linting errors
npm run lint

# Rebuild
npm run build
```

### Styles Not Loading

**Error**: Page displays but without styles

**Solutions**:
1. Ensure Tailwind CSS is configured
2. Check `globals.css` is imported
3. Verify PostCSS config exists
4. Rebuild the project

```bash
npm run dev
```

### Authentication Issues

**Error**: "User not authenticated"

**Solutions**:
1. Sign out and sign in again
2. Check Supabase configuration
3. Verify email if required
4. Clear browser cookies
5. Check Supabase Auth settings

**Debug**:
```javascript
// Check auth state
import { supabase } from '@/lib/supabase/client';
const { data } = await supabase.auth.getSession();
console.log(data.session);
```

## 🌐 Network & RPC Issues

### RPC Error

**Error**: "Failed to fetch" or "Network error"

**Solutions**:
1. Check RPC URL in `.env`
2. Try different RPC provider:
   - Alchemy
   - Infura
   - QuickNode
3. Verify Sepolia network is operational
4. Check rate limits on your RPC provider

**Alternative RPCs**:
```env
# Alchemy
NEXT_PUBLIC_SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY

# Infura
NEXT_PUBLIC_SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_KEY

# Public (may be slow)
NEXT_PUBLIC_SEPOLIA_RPC_URL=https://rpc.sepolia.org
```

### Slow Transaction Confirmations

**Issue**: Transactions take long to confirm

**Solutions**:
1. Increase gas price in MetaMask
2. Check Sepolia network status
3. Wait - testnet can be slow
4. Use block explorer to track transaction

## 💰 Balance & Token Issues

### Balance Not Updating

**Issue**: Balance doesn't refresh after transaction

**Solutions**:
1. Refresh the page
2. Wait a few seconds for blockchain confirmation
3. Check transaction on Etherscan
4. Verify you're looking at correct address

### Can't See SCP Tokens in MetaMask

**Issue**: SCP tokens don't appear in MetaMask

**Solutions**:
1. Add token manually in MetaMask:
   - Click "Import tokens"
   - Enter SCP token contract address
   - Token symbol: SCP
   - Decimals: 18

### Wrong Token Balance

**Issue**: Balance shows incorrect amount

**Solutions**:
1. Check you're on the correct network
2. Verify contract address is correct
3. Clear MetaMask cache
4. Check balance on Etherscan

## 🔍 Debugging Tips

### Enable Detailed Logging

Add to your `.env.local`:
```env
NEXT_PUBLIC_ENABLE_DEBUG=true
```

### Browser Console

Always check browser console (F12) for:
- JavaScript errors
- Network requests
- Warning messages

### Useful Console Commands

```javascript
// Check current network
const provider = new ethers.BrowserProvider(window.ethereum);
const network = await provider.getNetwork();
console.log('Chain ID:', network.chainId);

// Check wallet connection
const accounts = await window.ethereum.request({ 
  method: 'eth_accounts' 
});
console.log('Connected:', accounts);

// Check contract exists
const code = await provider.getCode('CONTRACT_ADDRESS');
console.log('Contract deployed:', code !== '0x');
```

### Network Analysis

Use Etherscan to verify:
- Contract deployment
- Transaction status
- Token transfers
- Event emissions

## 🆘 Still Having Issues?

### Collect Information

Before asking for help, gather:
1. Error message (full text)
2. Browser console logs
3. Transaction hash (if applicable)
4. Your environment:
   - Browser & version
   - MetaMask version
   - Operating system
5. Steps to reproduce

### Get Help

1. Check [GitHub Issues](https://github.com/yourusername/secure-chain/issues)
2. Search existing issues
3. Create new issue with template
4. Join community Discord/Telegram
5. Check documentation

### Emergency Recovery

If all else fails:

1. **Export private keys** (from MetaMask)
2. **Backup `.env` file**
3. **Fresh installation**:
   ```bash
   rm -rf node_modules .next
   npm install
   npm run dev
   ```
4. **Redeploy contracts** if necessary
5. **Restore from backup**

## 📚 Additional Resources

- [Ethereum Documentation](https://ethereum.org/developers)
- [MetaMask Support](https://metamask.zendesk.com/)
- [Supabase Docs](https://supabase.com/docs)
- [Next.js Docs](https://nextjs.org/docs)
- [Chainlink Docs](https://docs.chain.link/)
- [Ethers.js Docs](https://docs.ethers.org/)

---

**Pro Tip**: Most issues can be resolved by checking the browser console and verifying environment variables!
