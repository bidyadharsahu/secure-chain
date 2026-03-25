declare module 'next/navigation' {
  export function useRouter(): {
    push: (href: string) => void;
    replace: (href: string) => void;
    back: () => void;
  };

  export function useSearchParams(): {
    get: (name: string) => string | null;
  };
}

declare module 'next/link' {
  import * as React from 'react';

  export interface LinkProps {
    href: string;
    className?: string;
    children?: React.ReactNode;
    [key: string]: unknown;
  }

  const Link: React.ComponentType<LinkProps>;
  export default Link;
}
