'use client';

import { UseFormReturn } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { AIConfigData } from '@/lib/schemas/setup';

interface AIConfigStepProps {
  form: UseFormReturn<AIConfigData>;
}

const DEFAULT_MODELS = {
  openai: 'gpt-3.5-turbo',
  anthropic: 'claude-3-haiku-20240307',
  azure: 'gpt-35-turbo',
  skip: '',
};

export function AIConfigStep({ form }: AIConfigStepProps) {
  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = form;

  const selectedProvider = watch('provider');
  const showApiKeyInput = selectedProvider && selectedProvider !== 'skip';

  // Set default model when provider changes
  const handleProviderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const provider = e.target.value as keyof typeof DEFAULT_MODELS;
    setValue('provider', provider);
    setValue('model', DEFAULT_MODELS[provider]);
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="provider" className="text-white">
          AI Provider
        </Label>
        <Select
          id="provider"
          {...register('provider')}
          onChange={handleProviderChange}
          className="mt-1"
        >
          <option value="skip">Skip for now</option>
          <option value="openai">OpenAI</option>
          <option value="anthropic">Anthropic</option>
          <option value="azure">Azure OpenAI</option>
        </Select>
        <p className="text-xs text-gray-300 mt-1">
          AI features enable automatic ticket categorization and response
          suggestions
        </p>
      </div>

      {showApiKeyInput && (
        <>
          <div>
            <Label htmlFor="apiKey" className="text-white">
              API Key *
            </Label>
            <Input
              id="apiKey"
              type="password"
              {...register('apiKey')}
              placeholder="sk-..."
              className="mt-1"
            />
            {errors.apiKey && (
              <p className="text-sm text-red-500 mt-1">
                {errors.apiKey.message}
              </p>
            )}
            <p className="text-xs text-gray-300 mt-1">
              Your API key is encrypted before storage
            </p>
          </div>

          <div>
            <Label htmlFor="model" className="text-white">
              Model
            </Label>
            <Input
              id="model"
              {...register('model')}
              placeholder={DEFAULT_MODELS[selectedProvider] || ''}
              className="mt-1"
            />
            <p className="text-xs text-gray-300 mt-1">
              Leave empty to use the default model
            </p>
          </div>
        </>
      )}

      {!showApiKeyInput && (
        <div className="bg-blue-900/30 border border-blue-500/30 rounded-md p-4 text-sm text-blue-200">
          You can configure AI features later in Settings → AI Configuration
        </div>
      )}
    </div>
  );
}
