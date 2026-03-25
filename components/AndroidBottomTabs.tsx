'use client';

import type { ReactNode } from 'react';

export type BottomTabKey = 'home' | 'scan' | 'history' | 'profile';

type TabItem = {
  key: BottomTabKey;
  label: string;
  icon: ReactNode;
};

const TAB_ITEMS: TabItem[] = [
  {
    key: 'home',
    label: 'Home',
    icon: (
      <svg viewBox="0 0 24 24" className="w-4 h-4 mx-auto" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 11.5L12 4l9 7.5" />
        <path d="M5 10.5V20h14v-9.5" />
      </svg>
    ),
  },
  {
    key: 'scan',
    label: 'Scan',
    icon: (
      <svg viewBox="0 0 24 24" className="w-4 h-4 mx-auto" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="4" y="6" width="16" height="12" rx="2" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    ),
  },
  {
    key: 'history',
    label: 'History',
    icon: (
      <svg viewBox="0 0 24 24" className="w-4 h-4 mx-auto" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M8 6h11v14H5V9l3-3z" />
        <path d="M8 6v3H5" />
      </svg>
    ),
  },
  {
    key: 'profile',
    label: 'Profile',
    icon: (
      <svg viewBox="0 0 24 24" className="w-4 h-4 mx-auto" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="8" r="3.5" />
        <path d="M5 20c1.3-3 4-4.5 7-4.5s5.7 1.5 7 4.5" />
      </svg>
    ),
  },
];

interface AndroidBottomTabsProps {
  activeTab: BottomTabKey;
  onChange: (tab: BottomTabKey) => void;
}

export function AndroidBottomTabs({ activeTab, onChange }: AndroidBottomTabsProps) {
  return (
    <div className="fixed bottom-3 left-0 right-0 px-4 md:px-0 z-40">
      <div className="wallet-shell mx-auto rounded-3xl border border-[var(--cloud-200)] bg-white/95 p-2 shadow-xl backdrop-blur">
        <div className="grid grid-cols-4 gap-1 relative">
          {TAB_ITEMS.map((tab) => {
            const isActive = activeTab === tab.key;

            return (
              <button
                key={tab.key}
                onClick={() => onChange(tab.key)}
                className="relative py-2 rounded-2xl text-center"
              >
                <div
                  className={`absolute inset-0 rounded-2xl transition-all duration-300 ${
                    isActive ? 'bg-[var(--ink-900)] opacity-100 scale-100' : 'opacity-0 scale-95'
                  }`}
                />
                <div
                  className={`relative z-10 transition-all duration-300 ${
                    isActive ? 'text-white -translate-y-0.5' : 'text-[var(--ink-700)]'
                  }`}
                >
                  <div>{tab.icon}</div>
                  <p className="text-[11px] mt-1 font-semibold">{tab.label}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
