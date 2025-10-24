'use client';

import { useState } from 'react';
import Image from 'next/image';
import { UserRole } from '@easyping/types';
import { canAssignRole } from '@/lib/auth/permissions';

interface User {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: string;
  created_at: string;
  last_seen_at: string | null;
}

interface UserManagementTableProps {
  users: User[];
  currentUserRole: UserRole;
  firstUserId: string;
}

function getRoleBadgeColor(role: string) {
  const colors = {
    owner: 'bg-purple-100 text-purple-800',
    manager: 'bg-blue-100 text-blue-800',
    agent: 'bg-green-100 text-green-800',
    end_user: 'bg-gray-100 text-gray-800',
  };
  return colors[role as keyof typeof colors] || colors.end_user;
}

function getRoleIcon(role: string) {
  const icons = {
    owner: (
      <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
        <path d="M10 2a5 5 0 00-5 5v2a2 2 0 00-2 2v5a2 2 0 002 2h10a2 2 0 002-2v-5a2 2 0 00-2-2H7V7a3 3 0 015.905-.75 1 1 0 001.937-.5A5.002 5.002 0 0010 2z" />
      </svg>
    ),
    manager: (
      <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
        <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
      </svg>
    ),
    agent: (
      <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
        <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
      </svg>
    ),
    end_user: (
      <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
          clipRule="evenodd"
        />
      </svg>
    ),
  };
  return icons[role as keyof typeof icons] || icons.end_user;
}

function formatRoleName(role: string) {
  return role.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase());
}

function formatDate(dateString: string | null) {
  if (!dateString) return 'Never';
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export default function UserManagementTable({
  users,
  currentUserRole,
  firstUserId,
}: UserManagementTableProps) {
  const [loadingUserId, setLoadingUserId] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    type: 'success' | 'error';
    message: string;
    userId?: string;
  } | null>(null);
  const [localUsers, setLocalUsers] = useState(users);

  const handleRoleChange = async (userId: string, newRole: string) => {
    setLoadingUserId(userId);

    // Optimistic UI update
    const originalUsers = [...localUsers];
    setLocalUsers(
      localUsers.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
    );

    try {
      const response = await fetch(`/api/users/${userId}/role`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: newRole }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update role');
      }

      const user = localUsers.find((u) => u.id === userId);
      setToast({
        type: 'success',
        message: `Role updated successfully. ${user?.full_name || user?.email} is now a ${formatRoleName(newRole)}`,
      });

      // Auto-dismiss success toast after 4 seconds
      setTimeout(() => setToast(null), 4000);
    } catch (error) {
      // Revert optimistic update
      setLocalUsers(originalUsers);

      setToast({
        type: 'error',
        message:
          error instanceof Error ? error.message : 'Failed to update role',
        userId,
      });
    } finally {
      setLoadingUserId(null);
    }
  };

  const retryRoleChange = () => {
    if (toast?.userId) {
      const user = localUsers.find((u) => u.id === toast.userId);
      if (user) {
        handleRoleChange(toast.userId, user.role);
      }
    }
    setToast(null);
  };

  return (
    <div>
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed right-4 top-4 z-50 flex items-center gap-3 rounded-lg px-4 py-3 shadow-lg ${
            toast.type === 'success'
              ? 'bg-green-50 text-green-800'
              : 'bg-red-50 text-red-800'
          }`}
          role="alert"
          aria-live="polite"
        >
          <span className="text-sm font-medium">{toast.message}</span>
          {toast.type === 'error' && (
            <button
              onClick={retryRoleChange}
              className="text-sm font-semibold underline hover:no-underline"
            >
              Retry
            </button>
          )}
          <button
            onClick={() => setToast(null)}
            className="ml-2 text-gray-500 hover:text-gray-700"
            aria-label="Dismiss notification"
          >
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
      )}

      {/* User Table */}
      <div className="mx-auto w-full max-w-screen-xl">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  User
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Email
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Role
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Last Seen
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {localUsers.map((user) => {
                const isFirstUser = user.id === firstUserId;
                const canChangeRole =
                  !isFirstUser &&
                  canAssignRole(currentUserRole, user.role as UserRole);

                return (
                  <tr
                    key={user.id}
                    className={`transition-colors hover:bg-gray-50 ${
                      isFirstUser ? 'bg-gray-50' : ''
                    }`}
                  >
                    {/* User Column */}
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 flex-shrink-0">
                          {user.avatar_url ? (
                            <Image
                              className="h-10 w-10 rounded-full"
                              src={user.avatar_url}
                              alt={user.full_name || user.email}
                              width={40}
                              height={40}
                            />
                          ) : (
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200 text-gray-600">
                              <span className="text-sm font-medium">
                                {(user.full_name ||
                                  user.email)[0].toUpperCase()}
                              </span>
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {user.full_name || 'No name'}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Email Column */}
                    <td className="px-4 py-4">
                      <div className="text-sm text-gray-500">{user.email}</div>
                    </td>

                    {/* Role Column */}
                    <td className="px-4 py-4">
                      <div className="relative">
                        {canChangeRole && currentUserRole === UserRole.OWNER ? (
                          <select
                            value={user.role}
                            onChange={(e) =>
                              handleRoleChange(user.id, e.target.value)
                            }
                            disabled={loadingUserId === user.id}
                            className={`inline-flex min-w-[200px] cursor-pointer items-center gap-2 rounded border border-transparent px-3 py-1.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${getRoleBadgeColor(
                              user.role
                            )} ${loadingUserId === user.id ? 'opacity-50' : ''}`}
                            aria-label={`Change role for ${user.full_name || user.email}`}
                          >
                            <option value="end_user">End User</option>
                            <option value="agent">Agent</option>
                            <option value="manager">Manager</option>
                            <option value="owner">Owner</option>
                          </select>
                        ) : (
                          <div
                            className={`group relative inline-flex items-center gap-2 rounded px-3 py-1.5 text-xs font-medium ${getRoleBadgeColor(
                              user.role
                            )}`}
                            aria-label={`Current role: ${formatRoleName(user.role)}`}
                          >
                            {getRoleIcon(user.role)}
                            <span>{formatRoleName(user.role)}</span>
                            {isFirstUser && (
                              <div className="invisible absolute bottom-full left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-xs text-white group-hover:visible">
                                Cannot change owner role
                              </div>
                            )}
                            {!isFirstUser &&
                              currentUserRole !== UserRole.OWNER && (
                                <div className="invisible absolute bottom-full left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-xs text-white group-hover:visible">
                                  Only owners can assign roles
                                </div>
                              )}
                          </div>
                        )}
                        {loadingUserId === user.id && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <svg
                              className="h-4 w-4 animate-spin text-gray-500"
                              fill="none"
                              viewBox="0 0 24 24"
                            >
                              <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                              />
                              <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                              />
                            </svg>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Last Seen Column */}
                    <td className="px-4 py-4">
                      <div className="text-sm text-gray-500">
                        {formatDate(user.last_seen_at)}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
