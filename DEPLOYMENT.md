# Deployment Guide for SecureChainPay

This guide covers deploying SecureChainPay to production environments.

## 📋 Pre-Deployment Checklist

### Smart Contracts
- [ ] Contracts audited by professional security firm
- [ ] Faucet function removed or restricted
- [ ] All test/debug functions removed
- [ ] Gas optimization completed
- [ ] Deploy to mainnet testnet first (Goerli/Sepolia)
- [ ] Verify contracts on Etherscan

### Frontend
- [ ] All environment variables configured
- [ ] Error handling implemented
- [ ] Loading states added
- [ ] Mobile responsiveness tested
- [ ] Cross-browser compatibility verified
- [ ] Performance optimization completed

### Database
- [ ] Backups configured
- [ ] RLS policies reviewed
- [ ] Indexes optimized
- [ ] Connection pooling configured
- [ ] Monitoring set up

## 🚀 Deployment Options

### Option 1: Vercel (Recommended for Next.js)

#### Step 1: Prepare Repository
```bash
git add .
git commit -m "Prepare for deployment"
git push origin main
```

#### Step 2: Deploy to Vercel
1. Go to [vercel.com](https://vercel.com)
2. Click "New Project"
3. Import your GitHub repository
4. Configure project:
   - Framework Preset: Next.js
   - Root Directory: ./
   - Build Command: `npm run build`
   - Output Directory: .next

#### Step 3: Add Environment Variables
In Vercel dashboard, add:
```
NEXT_PUBLIC_SUPABASE_URL=your_production_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_production_key
NEXT_PUBLIC_SEPOLIA_RPC_URL=your_rpc_url
NEXT_PUBLIC_SCP_TOKEN_ADDRESS=your_token_address
NEXT_PUBLIC_PAYMENT_CONTRACT_ADDRESS=your_payment_address
NEXT_PUBLIC_CHAINLINK_ETH_USD_FEED=0x694AA1769357215DE4FAC081bf1f309aDC325306
```

#### Step 4: Deploy
- Click "Deploy"
- Wait for build to complete
- Your app will be live at `your-project.vercel.app`

#### Step 5: Custom Domain (Optional)
1. Go to Project Settings → Domains
2. Add your custom domain
3. Configure DNS records as instructed
4. Wait for SSL certificate

### Option 2: Netlify

#### Step 1: Build Configuration
Create `netlify.toml`:
```toml
[build]
  command = "npm run build"
  publish = ".next"

[[plugins]]
  package = "@netlify/plugin-nextjs"
```

#### Step 2: Deploy
1. Connect repository to Netlify
2. Configure build settings
3. Add environment variables
4. Deploy

### Option 3: AWS Amplify

#### Step 1: Install Amplify CLI
```bash
npm install -g @aws-amplify/cli
amplify configure
```

#### Step 2: Initialize
```bash
amplify init
amplify add hosting
amplify publish
```

### Option 4: Self-Hosted (VPS)

#### Prerequisites
- Ubuntu 20.04+ server
- Node.js 18+
- Nginx
- PM2

#### Step 1: Server Setup
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2
sudo npm install -g pm2

# Install Nginx
sudo apt install -y nginx
```

#### Step 2: Clone and Build
```bash
cd /var/www
git clone your-repo.git secure-chain-pay
cd secure-chain-pay
npm install
npm run build
```

#### Step 3: Configure Environment
```bash
nano .env
# Add all production environment variables
```

#### Step 4: Start with PM2
```bash
pm2 start npm --name "secure-chain-pay" -- start
pm2 save
pm2 startup
```

#### Step 5: Configure Nginx
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

#### Step 6: Enable SSL with Let's Encrypt
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

## 🔐 Production Security

### Environment Variables
- Never commit `.env` to Git
- Use different keys for production
- Rotate keys regularly
- Use secret management services (AWS Secrets Manager, etc.)

### Smart Contracts
- Use multi-signature wallets for admin functions
- Implement timelock for critical updates
- Set up monitoring for unusual activity
- Have emergency pause functionality

### Database
- Enable SSL connections
- Use strong passwords
- Implement IP whitelisting
- Regular backups to different regions
- Monitor query performance

### Frontend
- Enable HTTPS only
- Configure CSP headers
- Implement rate limiting
- Use DDoS protection (Cloudflare)
- Monitor error logs

## 📊 Monitoring & Analytics

### Application Monitoring
```bash
# Install monitoring tools
npm install --save @sentry/nextjs
```

Configure Sentry in `next.config.js`:
```javascript
const { withSentryConfig } = require('@sentry/nextjs');

module.exports = withSentryConfig(
  nextConfig,
  {
    silent: true,
    org: "your-org",
    project: "secure-chain-pay",
  }
);
```

### Uptime Monitoring
- Use UptimeRobot or Pingdom
- Monitor critical endpoints
- Set up alerts for downtime

### Analytics
- Google Analytics
- Plausible (privacy-friendly)
- Custom event tracking

## 🔄 CI/CD Pipeline

### GitHub Actions Example
Create `.github/workflows/deploy.yml`:
```yaml
name: Deploy to Production

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v2
    
    - name: Setup Node.js
      uses: actions/setup-node@v2
      with:
        node-version: '18'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run tests
      run: npm test
    
    - name: Build
      run: npm run build
    
    - name: Deploy to Vercel
      uses: amondnet/vercel-action@v20
      with:
        vercel-token: ${{ secrets.VERCEL_TOKEN }}
        vercel-org-id: ${{ secrets.ORG_ID }}
        vercel-project-id: ${{ secrets.PROJECT_ID }}
```

## 🧪 Testing Before Production

### Testnet Deployment
1. Deploy to Sepolia/Goerli first
2. Run full test suite
3. Perform security audit
4. Load testing
5. User acceptance testing

### Mainnet Deployment
1. Deploy contracts to mainnet
2. Verify on Etherscan
3. Update frontend environment variables
4. Test with small amounts first
5. Gradual rollout

## 📈 Scaling Considerations

### Database
- Enable connection pooling
- Use read replicas for queries
- Implement caching (Redis)
- Archive old transactions

### Frontend
- Enable CDN caching
- Optimize images (Next.js Image component)
- Code splitting
- Lazy loading components

### Smart Contracts
- Optimize gas usage
- Batch operations where possible
- Consider Layer 2 solutions

## 🆘 Emergency Procedures

### Contract Issues
1. Pause contract (if implemented)
2. Notify users via all channels
3. Investigate issue
4. Deploy fix to testnet
5. Audit fix
6. Deploy to mainnet
7. Resume operations

### Database Issues
1. Switch to read-only mode
2. Restore from backup
3. Verify data integrity
4. Resume write operations

### Frontend Issues
1. Rollback to previous version
2. Fix issue
3. Test thoroughly
4. Redeploy

## 📞 Support & Maintenance

### Regular Maintenance
- Weekly dependency updates
- Monthly security audits
- Quarterly performance reviews
- Regular backup testing

### User Support
- Set up support email
- Create FAQ documentation
- Monitor social media
- Quick response to critical issues

## 🎯 Post-Deployment Checklist

- [ ] All services running
- [ ] SSL certificates valid
- [ ] Environment variables set
- [ ] Monitoring active
- [ ] Backups configured
- [ ] Domain DNS configured
- [ ] Analytics tracking
- [ ] Error logging working
- [ ] Security headers set
- [ ] Performance optimized
- [ ] Documentation updated
- [ ] Team notified

---

**Remember**: Always test thoroughly on testnets before mainnet deployment!
