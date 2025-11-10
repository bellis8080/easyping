import { redirect } from 'next/navigation';

/**
 * Old dashboard route - redirects to site root for smart routing
 * Smart routing logic is handled in /app/page.tsx based on user role
 */
export default function OldDashboard() {
  redirect('/');
}
