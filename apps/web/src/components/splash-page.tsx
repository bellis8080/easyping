'use client';

import { useRouter } from 'next/navigation';
import { Radio } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function SplashPage() {
  const router = useRouter();
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    // Trigger animations
    setShowContent(true);

    // Auto-redirect after 4 seconds
    const timer = setTimeout(() => {
      router.push('/login');
    }, 4000);

    return () => clearTimeout(timer);
  }, [router]);

  // Handle Enter key for immediate redirect
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        router.push('/login');
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
      <div className="text-center px-4">
        {/* Animated Logo */}
        <div
          className={`relative mx-auto mb-8 w-32 h-32 transition-all duration-700 ${
            showContent ? 'opacity-100 scale-100' : 'opacity-0 scale-50'
          }`}
        >
          <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center shadow-2xl ring-[6px] ring-orange-500">
            <Radio className="w-16 h-16 text-white" strokeWidth={2} />
          </div>
          {/* Pulse rings */}
          <div className="absolute inset-0 rounded-full bg-blue-500/30 animate-ping" />
          <div
            className="absolute inset-0 rounded-full bg-blue-500/20 animate-ping"
            style={{ animationDuration: '2s', animationDelay: '0.5s' }}
          />
        </div>

        {/* Brand Name */}
        <h1
          className={`text-5xl font-bold text-slate-900 mb-2 transition-all duration-700 delay-300 ${
            showContent
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 translate-y-4'
          }`}
        >
          EasyPing
        </h1>

        <p
          className={`text-xl text-slate-600 transition-all duration-700 delay-500 ${
            showContent
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 translate-y-4'
          }`}
        >
          AI-native service desk
        </p>
      </div>
    </div>
  );
}
