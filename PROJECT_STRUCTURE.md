# Project Structure

```
secure-chain/
├── app/                          # Next.js App Router
│   ├── dashboard/
│   │   └── page.tsx             # Dashboard page
│   ├── transactions/
│   │   └── page.tsx             # Transaction history page
│   ├── globals.css              # Global styles
│   ├── layout.tsx               # Root layout
│   ├── page.tsx                 # Landing page
│   └── providers.tsx            # Context providers wrapper
│
├── components/                   # Reusable React components
│   ├── NetworkBanner.tsx        # Network warning component
│   └── index.ts                 # Component exports
│
├── contexts/                     # React Context providers
│   ├── AuthContext.tsx          # Authentication state
│   └── Web3Context.tsx          # Web3/wallet state
│
├── contracts/                    # Solidity smart contracts
│   ├── SCPToken.sol             # ERC-20 token contract
│   ├── SecureChainPayment.sol   # Payment contract
│   └── README.md                # Contract deployment guide
│
├── lib/                         # Utility libraries
│   ├── contracts/
│   │   ├── SCPTokenABI.ts       # SCP Token ABI
│   │   └── SecureChainPaymentABI.ts  # Payment contract ABI
│   ├── supabase/
│   │   ├── client.ts            # Supabase client & types
│   │   └── database.ts          # Database operations
│   └── web3/
│       └── index.ts             # Web3 utilities
│
├── supabase/                     # Database configuration
│   ├── schema.sql               # Database schema
│   └── README.md                # Supabase setup guide
│
├── types/                        # TypeScript type definitions
│   └── ethereum.d.ts            # Ethereum/MetaMask types
│
├── .env.example                 # Environment variables template
├── .gitignore                   # Git ignore rules
├── CONTRIBUTING.md              # Contribution guidelines
├── LICENSE                      # MIT License
├── README.md                    # Main documentation
├── SETUP_CHECKLIST.md          # Quick setup guide
├── next.config.js              # Next.js configuration
├── package.json                # Dependencies
├── postcss.config.js           # PostCSS configuration
├── tailwind.config.ts          # Tailwind CSS configuration
└── tsconfig.json               # TypeScript configuration
```

## Key Files

### Smart Contracts
- `contracts/SCPToken.sol` - ERC-20 token with faucet
- `contracts/SecureChainPayment.sol` - Payment processor with Chainlink

### Frontend Pages
- `app/page.tsx` - Landing page with authentication
- `app/dashboard/page.tsx` - Main dashboard with payment form
- `app/transactions/page.tsx` - Transaction history

### Core Libraries
- `lib/web3/index.ts` - Web3 provider, contracts, utilities
- `lib/supabase/client.ts` - Supabase client setup
- `lib/supabase/database.ts` - Database CRUD operations

### State Management
- `contexts/AuthContext.tsx` - User authentication
- `contexts/Web3Context.tsx` - Wallet connection & network

### Configuration
- `.env` - Environment variables (create from .env.example)
- `supabase/schema.sql` - Database schema
