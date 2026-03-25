import type { Metadata } from 'next';
import { Sora, Space_Grotesk } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

const sora = Sora({ subsets: ['latin'], variable: '--font-sora' });
const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], variable: '--font-space-grotesk' });

export const metadata: Metadata = {
  title: 'SecureChainPay - Blockchain Payment Platform',
  description: 'Send and receive SCP tokens securely on the Ethereum Sepolia testnet',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${sora.variable} ${spaceGrotesk.variable} font-[var(--font-sora)]`}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
