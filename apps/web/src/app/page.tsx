import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import SplashPage from '@/components/splash-page';

export const dynamic = 'force-dynamic';

async function getPostAuthLandingPage(userId: string, role: string) {
  const supabase = await createClient();

  // Agents → Inbox
  if (role === 'agent') {
    return '/inbox';
  }

  // Managers/Owners → Analytics
  if (role === 'manager' || role === 'owner') {
    return '/dashboard/analytics';
  }

  // End users → Context-based
  if (role === 'end_user') {
    const { count, error } = await supabase
      .from('tickets')
      .select('*', { count: 'exact', head: true })
      .eq('created_by', userId);

    // If error or count is null/undefined, default to /pings/new (safer for new users)
    if (error) {
      console.error('Error checking ticket count:', error);
      return '/pings/new';
    }

    return (count ?? 0) === 0 ? '/pings/new' : '/pings';
  }

  // Fallback
  return '/pings';
}

export default async function RootPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // If authenticated, smart redirect
  if (user) {
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile) {
      const landingPage = await getPostAuthLandingPage(user.id, profile.role);
      const params = await searchParams;
      const welcome = params.welcome === 'true';

      // Pass welcome param through to landing page
      const redirectUrl = welcome ? `${landingPage}?welcome=true` : landingPage;
      redirect(redirectUrl);
    }
  }

  // Show splash for unauthenticated users
  return <SplashPage />;
}
