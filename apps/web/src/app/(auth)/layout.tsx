import { ReactNode } from 'react';
import type { Metadata } from 'next';
import { Radio } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Authentication - EasyPing',
  description:
    'Sign in or create an account to access EasyPing - AI-native, chat-first service desk',
};

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 p-4">
      <div className="w-full max-w-md">
        {/* Logo - centered above login card */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-600 mb-3 ring-4 ring-orange-500/30">
            <Radio className="w-10 h-10 text-white" strokeWidth={2} />
            {/* Ping animation */}
            <div className="absolute inset-0 rounded-full bg-blue-500/30 animate-ping" />
            <div
              className="absolute inset-0 rounded-full bg-blue-500/20 animate-ping"
              style={{ animationDuration: '2s', animationDelay: '0.5s' }}
            />
          </div>
          <h1 className="text-3xl font-bold text-white">EasyPing</h1>
          <p className="text-sm text-gray-400 mt-1">AI-native service desk</p>
        </div>

        {/* Downward arrow decoration */}
        <div className="flex justify-center mb-6">
          <svg
            className="w-8 h-8 text-orange-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 14l-7 7m0 0l-7-7m7 7V3"
            />
          </svg>
        </div>

        {/* Auth forms */}
        {children}

        {/* Footer */}
        <p className="mt-8 text-center text-sm text-gray-400">
          © 2025 EasyPing. Open-source under AGPLv3.
        </p>
      </div>
    </div>
  );
}
