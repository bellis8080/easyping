'use client';

import { useState } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LegacySelect as Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { AlertCircle, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { AIConfigData } from '@/lib/schemas/setup';

interface AIConfigStepProps {
  form: UseFormReturn<AIConfigData>;
}

// Cost-optimized default models (updated from Story 3.1)
const DEFAULT_MODELS = {
  openai: 'gpt-4o-mini', // Updated from gpt-3.5-turbo (60% cheaper)
  anthropic: 'claude-3-haiku-20240307', // Already cost-optimized
  azure: '', // Custom deployment name (user-provided)
  skip: '',
};

// Model options for each provider
const MODEL_OPTIONS = {
  openai: [
    {
      value: 'gpt-4o-mini',
      label: 'GPT-4o mini (recommended)',
      cost: '$0.15/$0.60 per M tokens',
    },
    { value: 'gpt-4', label: 'GPT-4', cost: 'Higher cost, higher quality' },
    { value: 'gpt-4-turbo', label: 'GPT-4 Turbo', cost: 'Fast GPT-4 variant' },
  ],
  anthropic: [
    {
      value: 'claude-3-haiku-20240307',
      label: 'Claude 3 Haiku (recommended)',
      cost: '$0.25/$1.25 per M tokens',
    },
    {
      value: 'claude-3-5-sonnet-20241022',
      label: 'Claude 3.5 Sonnet',
      cost: '$2/$10 per M tokens',
    },
    {
      value: 'claude-3-opus-20240229',
      label: 'Claude 3 Opus',
      cost: 'Highest quality, most expensive',
    },
  ],
};

// OpenAI embedding model options
const EMBEDDING_MODEL_OPTIONS = [
  {
    value: 'text-embedding-3-small',
    label: 'text-embedding-3-small (recommended)',
    description: '1536 dimensions, best price/performance',
  },
  {
    value: 'text-embedding-3-large',
    label: 'text-embedding-3-large',
    description: '3072 dimensions, higher quality',
  },
  {
    value: 'text-embedding-ada-002',
    label: 'text-embedding-ada-002 (legacy)',
    description: '1536 dimensions, older model',
  },
];

export function AIConfigStep({ form }: AIConfigStepProps) {
  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = form;

  const selectedProvider = watch('provider');
  const selectedModel = watch('model');
  const selectedEmbeddingModel = watch('embeddingModel');
  const apiKey = watch('apiKey');
  const showApiKeyInput = selectedProvider && selectedProvider !== 'skip';

  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  // Set default model when provider changes
  const handleProviderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const provider = e.target.value as keyof typeof DEFAULT_MODELS;
    setValue('provider', provider);
    setValue('model', DEFAULT_MODELS[provider]);
    // Set default embedding model for OpenAI
    if (provider === 'openai') {
      setValue('embeddingModel', 'text-embedding-3-small');
    }
    setTestResult(null); // Clear previous test results
  };

  // Handle model selection change
  const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setValue('model', e.target.value);
  };

  // Handle embedding model selection change
  const handleEmbeddingModelChange = (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    setValue('embeddingModel', e.target.value);
  };

  // Test API connection (optional during setup)
  const handleTestConnection = async () => {
    if (!apiKey || !selectedProvider || selectedProvider === 'skip') {
      return;
    }

    setTestingConnection(true);
    setTestResult(null);

    try {
      const response = await fetch('/api/ai-config/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: selectedProvider,
          apiKey,
          model:
            selectedModel ||
            DEFAULT_MODELS[selectedProvider as keyof typeof DEFAULT_MODELS],
        }),
      });

      const data = await response.json();

      if (data.success) {
        setTestResult({
          success: true,
          message: data.message || 'Connection successful!',
        });
      } else {
        setTestResult({
          success: false,
          message: data.error || 'Connection failed',
        });
      }
    } catch (error) {
      setTestResult({
        success: false,
        message:
          error instanceof Error ? error.message : 'Connection test failed',
      });
    } finally {
      setTestingConnection(false);
    }
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
          AI features enable automatic ping categorization and response
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
              Model {selectedProvider !== 'azure' && '*'}
            </Label>
            {selectedProvider === 'azure' ? (
              <>
                <Input
                  id="model"
                  {...register('model')}
                  placeholder="your-deployment-name"
                  className="mt-1"
                />
                <p className="text-xs text-gray-300 mt-1">
                  Enter your Azure OpenAI deployment name
                </p>
              </>
            ) : (
              <>
                <Select
                  id="model"
                  value={
                    selectedModel ||
                    DEFAULT_MODELS[
                      selectedProvider as keyof typeof DEFAULT_MODELS
                    ]
                  }
                  onChange={handleModelChange}
                  className="mt-1"
                >
                  {MODEL_OPTIONS[
                    selectedProvider as keyof typeof MODEL_OPTIONS
                  ]?.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
                <p className="text-xs text-gray-300 mt-1">
                  {MODEL_OPTIONS[
                    selectedProvider as keyof typeof MODEL_OPTIONS
                  ]?.find(
                    (opt) =>
                      opt.value ===
                      (selectedModel ||
                        DEFAULT_MODELS[
                          selectedProvider as keyof typeof DEFAULT_MODELS
                        ])
                  )?.cost || 'Cost-optimized model recommended'}
                </p>
              </>
            )}
          </div>

          {/* Embedding Model Selection (OpenAI only) */}
          {selectedProvider === 'openai' && (
            <div>
              <Label htmlFor="embeddingModel" className="text-white">
                Embedding Model
              </Label>
              <Select
                id="embeddingModel"
                value={selectedEmbeddingModel || 'text-embedding-3-small'}
                onChange={handleEmbeddingModelChange}
                className="mt-1"
              >
                {EMBEDDING_MODEL_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
              <p className="text-xs text-gray-300 mt-1">
                {EMBEDDING_MODEL_OPTIONS.find(
                  (opt) =>
                    opt.value ===
                    (selectedEmbeddingModel || 'text-embedding-3-small')
                )?.description || 'Used for semantic search in Knowledge Base'}
              </p>
            </div>
          )}

          {/* Anthropic embeddings warning */}
          {selectedProvider === 'anthropic' && (
            <div className="bg-amber-900/30 border border-amber-500/30 rounded-md p-4 flex gap-3">
              <AlertCircle className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-200">
                <p className="font-medium mb-1">
                  Note: Anthropic Embeddings Limitation
                </p>
                <p className="text-amber-300/90">
                  Anthropic does not provide embeddings. For semantic search
                  features (KB article suggestions), you will need to configure
                  OpenAI separately for embeddings.
                </p>
              </div>
            </div>
          )}

          {/* Optional test connection button */}
          <div className="space-y-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleTestConnection}
              disabled={!apiKey || testingConnection}
              className="w-full"
            >
              {testingConnection ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Testing connection...
                </>
              ) : (
                'Test Connection (optional)'
              )}
            </Button>

            {testResult && (
              <div
                className={`flex items-start gap-2 p-3 rounded-md text-sm ${
                  testResult.success
                    ? 'bg-green-900/30 border border-green-500/30 text-green-200'
                    : 'bg-red-900/30 border border-red-500/30 text-red-200'
                }`}
              >
                {testResult.success ? (
                  <CheckCircle2 className="h-4 w-4 flex-shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                )}
                <span>{testResult.message}</span>
              </div>
            )}
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
