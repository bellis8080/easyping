'use client';

import { UseFormReturn } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { OrganizationData } from '@/lib/schemas/setup';

interface OrganizationStepProps {
  form: UseFormReturn<OrganizationData>;
}

export function OrganizationStep({ form }: OrganizationStepProps) {
  const {
    register,
    formState: { errors },
  } = form;

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="name">Organization Name *</Label>
        <Input
          id="name"
          {...register('name')}
          placeholder="Acme Corp IT"
          className="mt-1"
        />
        {errors.name && (
          <p className="text-sm text-red-500 mt-1">{errors.name.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="domain">Domain (Optional)</Label>
        <Input
          id="domain"
          {...register('domain')}
          placeholder="acme.com"
          className="mt-1"
        />
        {errors.domain && (
          <p className="text-sm text-red-500 mt-1">{errors.domain.message}</p>
        )}
        <p className="text-xs text-gray-500 mt-1">
          Used for email matching and branding
        </p>
      </div>
    </div>
  );
}
