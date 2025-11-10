import { toast } from 'sonner';

/**
 * Show welcome toast notification based on user role and login status
 *
 * @param userName - User's full name
 * @param organizationName - Organization name
 * @param role - User's role (agent, manager, owner, end_user)
 * @param isFirstLogin - Whether this is the user's first login
 */
export function showWelcomeToast(
  userName: string,
  organizationName: string,
  role: string,
  isFirstLogin: boolean = false
) {
  if (isFirstLogin) {
    toast.success(`Welcome to EasyPing, ${userName}!`, {
      description: `${organizationName} Service Desk`,
      duration: 5000,
    });
    return;
  }

  // Role-specific welcome back messages
  const greeting = `Welcome back, ${userName}!`;
  let description = `${organizationName} Service Desk`;

  if (role === 'agent') {
    description = 'Your inbox is ready.';
  } else if (role === 'manager' || role === 'owner') {
    description = 'System overview is ready.';
  }

  toast.success(greeting, {
    description,
    duration: 5000,
  });
}
