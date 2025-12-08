import { redirect } from 'next/navigation';
import { getUserProfile } from '@/lib/auth/helpers';
import { AIConfigClient } from './ai-config-client';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export default async function AISettingsPage() {
  const userProfile = await getUserProfile();

  if (!userProfile) {
    redirect('/login');
  }

  // Check if user is owner
  if (userProfile.role !== 'owner') {
    redirect('/dashboard?error=insufficient_permissions');
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">AI Configuration</h1>
        <p className="mt-2 text-sm text-gray-600">
          Configure AI provider settings and API keys for your organization
        </p>
      </div>

      <AIConfigClient />
    </div>
  );
}
