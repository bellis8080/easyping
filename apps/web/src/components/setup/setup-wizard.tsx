'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { StepIndicator } from './step-indicator';
import { OrganizationStep } from './organization-step';
import { AdminAccountStep } from './admin-account-step';
import { AIConfigStep } from './ai-config-step';
import {
  organizationSchema,
  adminAccountSchema,
  aiConfigSchema,
  type OrganizationData,
  type AdminAccountData,
  type AIConfigData,
} from '@/lib/schemas/setup';

const STEPS = ['Organization', 'Admin Account', 'AI Config'];

export function SetupWizard() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Separate forms for each step
  const orgForm = useForm<OrganizationData>({
    resolver: zodResolver(organizationSchema),
    defaultValues: {
      name: '',
      domain: '',
    },
  });

  const adminForm = useForm<AdminAccountData>({
    resolver: zodResolver(adminAccountSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
      fullName: '',
    },
  });

  const aiForm = useForm<AIConfigData>({
    resolver: zodResolver(aiConfigSchema),
    defaultValues: {
      provider: 'skip',
      apiKey: '',
      model: '',
    },
  });

  const handleNext = async () => {
    let isValid = false;

    if (currentStep === 1) {
      isValid = await orgForm.trigger();
    } else if (currentStep === 2) {
      isValid = await adminForm.trigger();
    } else if (currentStep === 3) {
      isValid = await aiForm.trigger();
    }

    if (isValid) {
      if (currentStep < 3) {
        setCurrentStep(currentStep + 1);
      } else {
        await handleSubmit();
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      setError(null);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const setupData = {
        organization: orgForm.getValues(),
        admin: adminForm.getValues(),
        aiConfig: aiForm.getValues(),
      };

      const response = await fetch('/api/setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(setupData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Setup failed');
      }

      // Redirect to dashboard on success
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-2xl p-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome to EasyPing
          </h1>
          <p className="text-gray-600">
            Let&apos;s set up your service desk in just a few steps
          </p>
        </div>

        <StepIndicator currentStep={currentStep} steps={STEPS} />

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md text-red-800 text-sm">
            {error}
          </div>
        )}

        <div className="mb-8">
          {currentStep === 1 && <OrganizationStep form={orgForm} />}
          {currentStep === 2 && <AdminAccountStep form={adminForm} />}
          {currentStep === 3 && <AIConfigStep form={aiForm} />}
        </div>

        <div className="flex justify-between">
          <Button
            type="button"
            onClick={handleBack}
            disabled={currentStep === 1 || isSubmitting}
            variant="outline"
          >
            Back
          </Button>
          <Button type="button" onClick={handleNext} disabled={isSubmitting}>
            {isSubmitting
              ? 'Setting up...'
              : currentStep === 3
                ? 'Complete Setup'
                : 'Next'}
          </Button>
        </div>
      </Card>
    </div>
  );
}
