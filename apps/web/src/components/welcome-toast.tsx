'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';

export function WelcomeToast() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [hasShownToast, setHasShownToast] = useState(false);

  useEffect(() => {
    const welcome = searchParams.get('welcome');

    if (welcome === 'true' && !hasShownToast) {
      setHasShownToast(true);

      // Fetch user data and show toast
      const showToast = async () => {
        try {
          const supabase = createClient();
          const {
            data: { user },
          } = await supabase.auth.getUser();

          if (!user) return;

          const { data: profile } = await supabase
            .from('users')
            .select('full_name, role')
            .eq('id', user.id)
            .single();

          const { data: org } = await supabase
            .from('organizations')
            .select('name')
            .single();

          if (profile) {
            const userName =
              profile.full_name || user.email?.split('@')[0] || 'there';
            const orgName = org?.name || 'EasyPing';
            const greeting = `Welcome back, ${userName}!`;
            let description = `${orgName} Service Desk`;

            if (profile.role === 'agent') {
              description = 'Your inbox is ready.';
            } else if (profile.role === 'manager' || profile.role === 'owner') {
              description = 'System overview is ready.';
            }

            toast.success(greeting, { description, duration: 5000 });

            // Wait a bit before removing the param to ensure toast is shown
            setTimeout(() => {
              const url = new URL(window.location.href);
              url.searchParams.delete('welcome');
              router.replace(url.pathname, { scroll: false });
            }, 100);
          }
        } catch (error) {
          console.error('[WelcomeToast] Error showing welcome toast:', error);
        }
      };

      showToast();
    }
  }, [searchParams, router, hasShownToast]);

  return null;
}
