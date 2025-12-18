'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LegacySelect as Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  Sparkles,
} from 'lucide-react';

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

interface ToastMessage {
  type: 'success' | 'error';
  message: string;
}

export function AIConfigClient() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  // Form state
  const [enabled, setEnabled] = useState(false);
  const [provider, setProvider] = useState<string>('');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('');

  // Load current configuration
  useEffect(() => {
    async function loadConfig(): Promise<void> {
      try {
        const response = await fetch('/api/ai-config');

        if (!response.ok) {
          throw new Error('Failed to load AI configuration');
        }

        const data = await response.json();

        setEnabled(data.enabled || false);
        setProvider(data.provider || '');
        setApiKey(data.apiKey || '');
        setModel(data.model || '');
      } catch (error) {
        setToast({
          type: 'error',
          message:
            error instanceof Error
              ? error.message
              : 'Failed to load AI configuration',
        });
      } finally {
        setLoading(false);
      }
    }

    loadConfig();
  }, []);

  // Auto-dismiss toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [toast]);

  // Handle provider change
  const handleProviderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newProvider = e.target.value;
    setProvider(newProvider);

    // Set default model
    if (newProvider === 'openai') {
      setModel('gpt-4o-mini');
    } else if (newProvider === 'anthropic') {
      setModel('claude-3-haiku-20240307');
    } else if (newProvider === 'azure') {
      setModel('');
    }

    setTestResult(null);
  };

  // Test connection
  const handleTestConnection = async () => {
    console.log('Test connection clicked', {
      provider,
      apiKey: apiKey ? '***' : null,
    });

    if (!apiKey || !provider) {
      setToast({
        type: 'error',
        message: 'Please provide an API key and select a provider',
      });
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      const response = await fetch('/api/ai-config/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, apiKey, model: model || undefined }),
      });

      const data = await response.json();

      if (data.success) {
        setTestResult({ success: true, message: data.message });
        setToast({ type: 'success', message: data.message });
      } else {
        setTestResult({ success: false, message: data.error });
        setToast({ type: 'error', message: data.error });
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Connection test failed';
      setTestResult({ success: false, message });
      setToast({ type: 'error', message });
    } finally {
      setTesting(false);
    }
  };

  // Save configuration
  const handleSave = async () => {
    console.log('Save button clicked', {
      enabled,
      provider,
      apiKey: apiKey ? '***' : null,
    });

    if (!enabled) {
      setToast({
        type: 'error',
        message: 'Enable AI features to save configuration',
      });
      return;
    }

    if (!provider || !apiKey) {
      setToast({ type: 'error', message: 'Provider and API key are required' });
      return;
    }

    setSaving(true);

    try {
      const response = await fetch('/api/ai-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          apiKey,
          model:
            model ||
            (provider === 'openai'
              ? 'gpt-4o-mini'
              : provider === 'anthropic'
                ? 'claude-3-haiku-20240307'
                : ''),
          enabled,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save AI configuration');
      }

      setToast({
        type: 'success',
        message: 'AI configuration saved successfully',
      });

      // Reload after 1 second to get fresh encrypted key
      setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
      setToast({
        type: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'Failed to save AI configuration',
      });
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      {/* Toast notification */}
      {toast && (
        <div
          className={`mb-4 flex items-center gap-2 rounded-lg p-4 ${
            toast.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="h-5 w-5" />
          ) : (
            <XCircle className="h-5 w-5" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm space-y-6">
        {/* Enable AI Features Toggle */}
        <div className="flex items-center justify-between rounded-lg border border-gray-200 p-4 bg-gray-50">
          <div className="flex items-center gap-3">
            <Sparkles className="h-5 w-5 text-blue-600" />
            <div>
              <Label
                htmlFor="enabled"
                className="text-base font-medium cursor-pointer"
              >
                Enable AI Features
              </Label>
              <p className="text-sm text-gray-500">
                {enabled
                  ? 'AI features: Enabled ✅'
                  : 'AI features: Disabled ⚠️'}
              </p>
            </div>
          </div>
          <Switch
            id="enabled"
            checked={enabled}
            onCheckedChange={(checked) => {
              console.log('Switch toggled:', checked);
              setEnabled(checked);
            }}
          />
        </div>

        {enabled && (
          <>
            {/* Provider Selection */}
            <div>
              <Label htmlFor="provider">AI Provider *</Label>
              <Select
                id="provider"
                value={provider}
                onChange={handleProviderChange}
                className="mt-1"
              >
                <option value="" disabled>
                  Select a provider
                </option>
                <option value="openai">OpenAI</option>
                <option value="anthropic">Anthropic</option>
                <option value="azure">Azure OpenAI</option>
              </Select>
            </div>

            {/* API Key */}
            {provider && (
              <div>
                <Label htmlFor="apiKey">API Key *</Label>
                <div className="relative mt-1">
                  <Input
                    id="apiKey"
                    type={showApiKey ? 'text' : 'password'}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="sk-..."
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showApiKey ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Your API key is encrypted before storage
                </p>
              </div>
            )}

            {/* Model Selection */}
            {provider && provider !== 'azure' && (
              <div>
                <Label htmlFor="model">Model *</Label>
                <Select
                  id="model"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="mt-1"
                >
                  {MODEL_OPTIONS[provider as keyof typeof MODEL_OPTIONS]?.map(
                    (option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    )
                  )}
                </Select>
                <p className="text-xs text-gray-500 mt-1">
                  {MODEL_OPTIONS[provider as keyof typeof MODEL_OPTIONS]?.find(
                    (opt) => opt.value === model
                  )?.cost || 'Cost-optimized model recommended'}
                </p>
              </div>
            )}

            {/* Azure Deployment Name */}
            {provider === 'azure' && (
              <div>
                <Label htmlFor="model">Deployment Name *</Label>
                <Input
                  id="model"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder="your-deployment-name"
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Enter your Azure OpenAI deployment name
                </p>
              </div>
            )}

            {/* Anthropic Embeddings Warning */}
            {provider === 'anthropic' && (
              <div className="bg-amber-50 border border-amber-200 rounded-md p-4 flex gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-amber-800">
                  <p className="font-medium mb-1">
                    Note: Anthropic Embeddings Limitation
                  </p>
                  <p>
                    Anthropic does not provide embeddings. For semantic search
                    features (KB article suggestions), you will need to
                    configure OpenAI separately for embeddings.
                  </p>
                </div>
              </div>
            )}

            {/* Test Connection Button */}
            {apiKey && provider && (
              <div className="space-y-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleTestConnection}
                  disabled={testing}
                  className="w-full"
                >
                  {testing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Testing connection...
                    </>
                  ) : (
                    'Test Connection'
                  )}
                </Button>

                {testResult && (
                  <div
                    className={`flex items-start gap-2 p-3 rounded-md text-sm ${
                      testResult.success
                        ? 'bg-green-50 border border-green-200 text-green-800'
                        : 'bg-red-50 border border-red-200 text-red-800'
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
            )}
          </>
        )}

        {/* Save Button */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <Button onClick={handleSave} disabled={saving || !enabled}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Configuration'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
