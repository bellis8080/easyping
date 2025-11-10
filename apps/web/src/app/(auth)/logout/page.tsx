'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { LogOut, Loader2 } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default function LogoutPage() {
  const router = useRouter();

  useEffect(() => {
    const signOut = async () => {
      const supabase = createClient();
      await supabase.auth.signOut();

      // Short delay for visual feedback
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Redirect to splash page after sign out
      window.location.href = '/';
    };

    signOut();
  }, [router]);

  return (
    <Card className="w-full bg-white dark:bg-slate-800 shadow-xl border-2 border-orange-500">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <div className="relative w-16 h-16 rounded-full bg-orange-500/10 flex items-center justify-center">
            <LogOut className="w-8 h-8 text-orange-500" />
          </div>
        </div>
        <CardTitle className="text-white">Signing out</CardTitle>
        <CardDescription>
          You&apos;re being signed out of your account
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center py-8">
          <Loader2 className="w-8 h-8 text-orange-500 animate-spin mb-4" />
          <p className="text-sm text-gray-400">See you next time!</p>
        </div>
      </CardContent>
    </Card>
  );
}
