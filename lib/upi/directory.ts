export interface UpiPayee {
  id: string;
  name: string;
  upiId: string;
  walletAddress: string;
  category: 'merchant' | 'person';
  bank: string;
  verified: boolean;
  aliases: string[];
  accent: string;
}

export const UPI_DIRECTORY: UpiPayee[] = [
  {
    id: 'bean-bloc',
    name: 'Bean Bloc Cafe',
    upiId: 'coffee@scp',
    walletAddress: '0x7Ef5A6135f1FD6a02593eEdC869c6D41D934Aef8',
    category: 'merchant',
    bank: 'Sepolia Merchant Bank',
    verified: true,
    aliases: ['bean', 'cafe', 'coffee'],
    accent: 'from-amber-500 to-orange-500',
  },
  {
    id: 'urban-grocery',
    name: 'Urban Blocks Grocery',
    upiId: 'grocer@scp',
    walletAddress: '0x4B0897b0513fdc7C541B6d9D7E929C4e5364D2dB',
    category: 'merchant',
    bank: 'Chain Commerce Co-op',
    verified: true,
    aliases: ['grocery', 'mart', 'urban'],
    accent: 'from-emerald-500 to-teal-500',
  },
  {
    id: 'anita-verma',
    name: 'Anita Verma',
    upiId: 'anita@scp',
    walletAddress: '0x583031D1113aD414F02576BD6afaBfb302140225',
    category: 'person',
    bank: 'Neo Payments',
    verified: true,
    aliases: ['ani', 'anita verma'],
    accent: 'from-sky-500 to-indigo-500',
  },
  {
    id: 'rahul-kumar',
    name: 'Rahul Kumar',
    upiId: 'rahul@scp',
    walletAddress: '0xdD2FD4581271e230360230F9337D5c0430Bf44C0',
    category: 'person',
    bank: 'Ledger Savings',
    verified: false,
    aliases: ['rahul', 'rk'],
    accent: 'from-fuchsia-500 to-pink-500',
  },
  {
    id: 'metro-cabs',
    name: 'Metro Cabs',
    upiId: 'metro@scp',
    walletAddress: '0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199',
    category: 'merchant',
    bank: 'FastPay Blockchain Bank',
    verified: true,
    aliases: ['cab', 'taxi', 'ride'],
    accent: 'from-violet-500 to-purple-500',
  },
];

export function normalizeUpiId(input: string): string {
  const value = input.trim().toLowerCase();
  if (!value) return '';
  if (value.includes('@')) return value;
  return `${value}@scp`;
}

export function getPayeeInitials(name: string): string {
  const tokens = name.split(' ').filter(Boolean);
  if (tokens.length === 0) return 'SC';
  if (tokens.length === 1) return tokens[0].slice(0, 2).toUpperCase();
  return `${tokens[0][0]}${tokens[1][0]}`.toUpperCase();
}

export function searchUpiPayees(query: string): UpiPayee[] {
  const normalized = normalizeUpiId(query);
  const plain = query.trim().toLowerCase();

  if (!plain) {
    return UPI_DIRECTORY.slice(0, 4);
  }

  return UPI_DIRECTORY.filter((payee) => {
    return (
      payee.upiId.includes(normalized) ||
      payee.name.toLowerCase().includes(plain) ||
      payee.aliases.some((alias) => alias.includes(plain))
    );
  }).sort((a, b) => Number(b.verified) - Number(a.verified));
}

export function resolveUpiPayee(input: string): UpiPayee | null {
  const normalized = normalizeUpiId(input);
  const plain = input.trim().toLowerCase();

  const exact = UPI_DIRECTORY.find((payee) => payee.upiId === normalized);
  if (exact) return exact;

  const alias = UPI_DIRECTORY.find(
    (payee) => payee.aliases.includes(plain) || payee.name.toLowerCase() === plain
  );

  return alias || null;
}

export function findPayeeByWallet(walletAddress: string): UpiPayee | null {
  const normalized = walletAddress.toLowerCase();
  return (
    UPI_DIRECTORY.find(
      (payee) => payee.walletAddress.toLowerCase() === normalized
    ) || null
  );
}
