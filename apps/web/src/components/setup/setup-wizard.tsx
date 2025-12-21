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
import { SupportProfileStep } from './support-profile-step';
import { CategoriesStep } from './categories-step';
import {
  organizationSchema,
  adminAccountSchema,
  aiConfigSchema,
  supportProfileSchema,
  categoriesSchema,
  type OrganizationData,
  type AdminAccountData,
  type AIConfigData,
  type SupportProfileData,
  type CategoriesData,
} from '@/lib/schemas/setup';
import type { SupportProfile } from '@easyping/types';

const STEPS = [
  'Organization',
  'Admin Account',
  'AI Config',
  'Support Profile',
  'Categories',
];

export function SetupWizard() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedProfile, setGeneratedProfile] =
    useState<SupportProfile | null>(null);

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
      embeddingModel: 'text-embedding-3-small',
    },
  });

  const profileForm = useForm<SupportProfileData>({
    resolver: zodResolver(supportProfileSchema),
    defaultValues: {
      support_type: 'general',
      description: '',
      typical_users: '',
      systems_supported: [],
      common_issues: [],
      ai_generated: false,
    },
  });

  const categoriesForm = useForm<CategoriesData>({
    resolver: zodResolver(categoriesSchema),
    defaultValues: {
      categories: [],
    },
  });

  const handleProfileGenerated = (profile: SupportProfile) => {
    setGeneratedProfile(profile);
  };

  const handleNext = async () => {
    console.log('handleNext called, currentStep:', currentStep);
    let isValid = false;

    if (currentStep === 1) {
      console.log('Triggering org form validation');
      isValid = await orgForm.trigger();
      console.log(
        'Org form valid:',
        isValid,
        'Errors:',
        orgForm.formState.errors
      );
    } else if (currentStep === 2) {
      console.log('Triggering admin form validation');
      isValid = await adminForm.trigger();
      console.log('Admin form valid:', isValid);
    } else if (currentStep === 3) {
      console.log('Triggering AI form validation');
      isValid = await aiForm.trigger();
      console.log('AI form valid:', isValid);
    } else if (currentStep === 4) {
      console.log('Triggering profile form validation');
      isValid = await profileForm.trigger();
      console.log('Profile form valid:', isValid);
    } else if (currentStep === 5) {
      console.log('Triggering categories form validation');
      // Categories step is optional - allow empty categories
      isValid = true;
      console.log('Categories form valid:', isValid);
    }

    console.log('Form validation result:', isValid);
    if (isValid) {
      if (currentStep < 5) {
        console.log('Moving to next step');
        setCurrentStep(currentStep + 1);
      } else {
        console.log('Submitting form');
        await handleSubmit();
      }
    } else {
      console.log('Form validation failed, staying on current step');
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
        supportProfile: profileForm.getValues(),
        categories: categoriesForm.getValues(),
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
    <Card className="w-full bg-white dark:bg-slate-800 shadow-xl border-2 border-orange-500">
      <div className="p-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-white mb-2">
            Welcome to EasyPing
          </h1>
          <p className="text-gray-300">
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
          {currentStep === 4 && (
            <SupportProfileStep
              form={profileForm}
              aiConfig={aiForm.getValues()}
              onProfileGenerated={handleProfileGenerated}
            />
          )}
          {currentStep === 5 && (
            <CategoriesStep
              form={categoriesForm}
              supportProfile={
                generatedProfile || {
                  support_type: profileForm.getValues().support_type,
                  description: profileForm.getValues().description,
                  typical_users: profileForm.getValues().typical_users || '',
                  ai_generated: profileForm.getValues().ai_generated,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                }
              }
              aiConfig={aiForm.getValues()}
            />
          )}
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
          <Button
            type="button"
            onClick={handleNext}
            disabled={isSubmitting}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isSubmitting
              ? 'Setting up...'
              : currentStep === 5
                ? 'Complete Setup'
                : 'Next'}
          </Button>
        </div>
      </div>
    </Card>
  );
}
