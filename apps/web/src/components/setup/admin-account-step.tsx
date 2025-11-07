'use client';

import { UseFormReturn } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AdminAccountData } from '@/lib/schemas/setup';

interface AdminAccountStepProps {
  form: UseFormReturn<AdminAccountData>;
}

export function AdminAccountStep({ form }: AdminAccountStepProps) {
  const {
    register,
    formState: { errors },
  } = form;

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="email">Admin Email *</Label>
        <Input
          id="email"
          type="email"
          {...register('email')}
          placeholder="admin@acme.com"
          className="mt-1"
        />
        {errors.email && (
          <p className="text-sm text-red-500 mt-1">{errors.email.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="fullName">Full Name *</Label>
        <Input
          id="fullName"
          {...register('fullName')}
          placeholder="John Doe"
          className="mt-1"
        />
        {errors.fullName && (
          <p className="text-sm text-red-500 mt-1">{errors.fullName.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="password">Password *</Label>
        <Input
          id="password"
          type="password"
          {...register('password')}
          placeholder="••••••••"
          className="mt-1"
        />
        {errors.password && (
          <p className="text-sm text-red-500 mt-1">{errors.password.message}</p>
        )}
        <p className="text-xs text-gray-500 mt-1">
          Minimum 8 characters required
        </p>
      </div>

      <div>
        <Label htmlFor="confirmPassword">Confirm Password *</Label>
        <Input
          id="confirmPassword"
          type="password"
          {...register('confirmPassword')}
          placeholder="••••••••"
          className="mt-1"
        />
        {errors.confirmPassword && (
          <p className="text-sm text-red-500 mt-1">
            {errors.confirmPassword.message}
          </p>
        )}
      </div>
    </div>
  );
}
