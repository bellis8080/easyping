'use client';

import { useState, useEffect, useRef } from 'react';
import {
  User,
  Bell,
  Sparkles,
  FolderTree,
  Shield,
  Save,
  Loader2,
  Users,
  Building2,
  Plus,
  Pencil,
  Archive,
  ArchiveRestore,
  GripVertical,
  Route,
  Trash2,
  Clock,
} from 'lucide-react';
import UserManagementTable from './users/UserManagementTable';

type TabType =
  | 'profile'
  | 'notifications'
  | 'ai'
  | 'users'
  | 'supportProfile'
  | 'categories'
  | 'routing'
  | 'sla'
  | 'security';

interface TabConfig {
  id: TabType;
  label: string;
  icon: any;
}

const tabs: TabConfig[] = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'ai', label: 'AI Configuration', icon: Sparkles },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'supportProfile', label: 'Support Profile', icon: Building2 },
  { id: 'categories', label: 'Categories', icon: FolderTree },
  { id: 'routing', label: 'Routing Rules', icon: Route },
  { id: 'sla', label: 'SLA Policies', icon: Clock },
  { id: 'security', label: 'Security', icon: Shield },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('profile');
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch user role on mount
  useEffect(() => {
    async function fetchUserRole() {
      try {
        const response = await fetch('/api/user');
        if (response.ok) {
          const data = await response.json();
          setUserRole(data.role);
        }
      } catch (error) {
        console.error('Failed to fetch user role:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchUserRole();
  }, []);

  // Filter tabs based on user role
  const visibleTabs = tabs.filter((tab) => {
    // Only show AI Configuration, Users, and Support Profile tabs to owners
    if (tab.id === 'ai' || tab.id === 'users' || tab.id === 'supportProfile') {
      return userRole === 'owner';
    }
    // Show categories, routing, and SLA to managers and owners
    if (tab.id === 'categories' || tab.id === 'routing' || tab.id === 'sla') {
      return userRole === 'owner' || userRole === 'manager';
    }
    return true;
  });

  // Don't render tabs until we know the user's role
  if (loading) {
    return (
      <div className="flex h-screen bg-gradient-to-b from-slate-50 to-blue-50 overflow-hidden items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gradient-to-b from-slate-50 to-blue-50 overflow-hidden">
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 bg-gradient-to-r from-slate-800 via-slate-900 to-slate-950 border-b border-slate-700 shadow-xl px-6 py-5">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">Settings</h1>
            <p className="text-sm text-slate-400">
              Manage your account and preferences
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex">
          {/* Sidebar Tabs */}
          <div className="w-64 bg-white border-r border-slate-200 p-4">
            <nav className="space-y-1">
              {visibleTabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;

                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-left ${
                      isActive
                        ? 'bg-orange-500/10 text-orange-500 border-2 border-orange-500 shadow-lg shadow-orange-500/20'
                        : 'text-slate-700 hover:bg-slate-100 border-2 border-transparent'
                    }`}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    <span className="font-medium">{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-8">
            <div className="max-w-3xl">
              {activeTab === 'profile' && <ProfileTab />}
              {activeTab === 'notifications' && <NotificationsTab />}
              {activeTab === 'ai' && userRole === 'owner' && <AIConfigTab />}
              {activeTab === 'users' && userRole === 'owner' && <UsersTab />}
              {activeTab === 'supportProfile' && userRole === 'owner' && (
                <SupportProfileTab />
              )}
              {activeTab === 'categories' &&
                (userRole === 'owner' || userRole === 'manager') && (
                  <CategoriesTab />
                )}
              {activeTab === 'routing' &&
                (userRole === 'owner' || userRole === 'manager') && (
                  <RoutingTab />
                )}
              {activeTab === 'sla' &&
                (userRole === 'owner' || userRole === 'manager') && <SLATab />}
              {activeTab === 'security' && <SecurityTab />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: string;
  tenant_id: string;
  avatar_url: string | null;
  echo_enabled: boolean;
}

function ProfileTab() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState('');
  const [echoEnabled, setEchoEnabled] = useState(true);

  // Fetch user profile on mount
  useEffect(() => {
    async function fetchProfile() {
      try {
        const response = await fetch('/api/user');
        if (response.ok) {
          const data = await response.json();
          setProfile(data);
          setFullName(data.full_name || '');
          setEchoEnabled(data.echo_enabled ?? true);
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, []);

  const handleSave = async () => {
    if (!profile) return;

    setSaving(true);
    try {
      const response = await fetch('/api/user', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName,
          echo_enabled: echoEnabled,
        }),
      });

      if (response.ok) {
        const updatedProfile = await response.json();
        setProfile(updatedProfile);
        // Show success toast (would need to import toast from sonner)
      }
    } catch (error) {
      console.error('Error saving profile:', error);
    } finally {
      setSaving(false);
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'owner':
        return 'Owner';
      case 'manager':
        return 'Manager';
      case 'agent':
        return 'Support Agent';
      case 'user':
        return 'End User';
      default:
        return role;
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Check if user is an agent/manager/owner (can use Echo)
  const canUseEcho =
    profile?.role && ['agent', 'manager', 'owner'].includes(profile.role);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-12 text-slate-500">
        Failed to load profile
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">
          Profile Information
        </h2>
        <p className="text-sm text-slate-600">
          Update your personal information and preferences
        </p>
      </div>

      <div className="bg-white rounded-lg border-2 border-slate-200 p-6 shadow-lg space-y-6">
        {/* Avatar */}
        <div className="flex items-center gap-6">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-2xl">
            {getInitials(profile.full_name || 'U')}
          </div>
          <div>
            <button className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors">
              Change Avatar
            </button>
            <p className="text-xs text-slate-500 mt-2">
              JPG, PNG or GIF. Max 2MB.
            </p>
          </div>
        </div>

        {/* Form Fields */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Full Name
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Email
            </label>
            <input
              type="email"
              value={profile.email}
              disabled
              className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg bg-slate-50 text-slate-500"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Role
            </label>
            <input
              type="text"
              value={getRoleLabel(profile.role)}
              disabled
              className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg bg-slate-50 text-slate-500"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Timezone
            </label>
            <select className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent">
              <option>America/New_York (EST)</option>
              <option>America/Los_Angeles (PST)</option>
              <option>Europe/London (GMT)</option>
              <option>Asia/Tokyo (JST)</option>
            </select>
          </div>
        </div>

        {/* Echo Settings - Only for agents/managers/owners */}
        {canUseEcho && (
          <div className="pt-4 border-t border-slate-200">
            <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-orange-500" />
              AI Assistant Settings
            </h3>
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
              <div>
                <p className="font-medium text-slate-900">Enable Echo</p>
                <p className="text-sm text-slate-600">
                  Show AI-suggested responses in the inbox sidebar
                </p>
              </div>
              <button
                onClick={() => setEchoEnabled(!echoEnabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  echoEnabled ? 'bg-orange-500' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    echoEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        )}

        <div className="flex justify-end pt-4 border-t border-slate-200">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg font-semibold hover:from-orange-600 hover:to-orange-700 transition-all shadow-lg shadow-orange-500/30 hover:shadow-xl hover:shadow-orange-500/40 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

function NotificationsTab() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">
          Notification Preferences
        </h2>
        <p className="text-sm text-slate-600">
          Choose how you want to be notified
        </p>
      </div>

      <div className="bg-white rounded-lg border-2 border-slate-200 p-6 shadow-lg space-y-6">
        <div className="space-y-4">
          {/* Email Notifications */}
          <div className="flex items-start justify-between py-3 border-b border-slate-100">
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-slate-900 mb-1">
                Email Notifications
              </h3>
              <p className="text-xs text-slate-600">
                Receive notifications via email
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" defaultChecked />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-orange-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
            </label>
          </div>

          {/* New Ticket Assigned */}
          <div className="flex items-start justify-between py-3 border-b border-slate-100">
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-slate-900 mb-1">
                New Ticket Assigned
              </h3>
              <p className="text-xs text-slate-600">
                When a ticket is assigned to you
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" defaultChecked />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-orange-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
            </label>
          </div>

          {/* User Response */}
          <div className="flex items-start justify-between py-3 border-b border-slate-100">
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-slate-900 mb-1">
                User Response
              </h3>
              <p className="text-xs text-slate-600">
                When a user responds to your message
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" defaultChecked />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-orange-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
            </label>
          </div>

          {/* SLA Breach Warning */}
          <div className="flex items-start justify-between py-3 border-b border-slate-100">
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-slate-900 mb-1">
                SLA Breach Warning
              </h3>
              <p className="text-xs text-slate-600">
                When a ticket is at risk of breaching SLA
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" defaultChecked />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-orange-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
            </label>
          </div>

          {/* Echo Suggestions */}
          <div className="flex items-start justify-between py-3">
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-slate-900 mb-1">
                Show Echo Panel
              </h3>
              <p className="text-xs text-slate-600">
                Display Echo AI assistant suggestions
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" defaultChecked />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-orange-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
            </label>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-slate-200">
          <button className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg font-semibold hover:from-orange-600 hover:to-orange-700 transition-all shadow-lg shadow-orange-500/30 hover:shadow-xl hover:shadow-orange-500/40 transform hover:scale-105">
            <Save className="w-4 h-4" />
            Save Preferences
          </button>
        </div>
      </div>
    </div>
  );
}

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

function AIConfigTab() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [provider, setProvider] = useState('openai');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('gpt-4o-mini');
  const [embeddingModel, setEmbeddingModel] = useState(
    'text-embedding-3-small'
  );

  // Load current configuration
  useEffect(() => {
    async function loadConfig() {
      try {
        const response = await fetch('/api/ai-config');
        if (response.ok) {
          const data = await response.json();
          if (data.provider) setProvider(data.provider);
          if (data.apiKey) setApiKey(data.apiKey);
          if (data.model) setModel(data.model);
          if (data.embeddingModel) setEmbeddingModel(data.embeddingModel);
        }
      } catch (error) {
        console.error('Failed to load AI config:', error);
      } finally {
        setLoading(false);
      }
    }
    loadConfig();
  }, []);

  const handleTest = async () => {
    if (!apiKey) {
      alert('Please enter an API key');
      return;
    }

    setTesting(true);
    try {
      const response = await fetch('/api/ai-config/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, apiKey, model }),
      });

      const data = await response.json();
      if (data.success) {
        alert('Connection successful!');
      } else {
        alert(`Connection failed: ${data.error}`);
      }
    } catch (_error) {
      alert('Connection test failed');
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    if (!apiKey) {
      alert('Please enter an API key');
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
          model,
          embeddingModel: provider === 'openai' ? embeddingModel : undefined,
          enabled: true,
        }),
      });

      if (response.ok) {
        alert('AI configuration saved successfully');
        setTimeout(() => window.location.reload(), 1000);
      } else {
        const data = await response.json();
        alert(`Failed to save: ${data.error}`);
      }
    } catch (_error) {
      alert('Failed to save configuration');
    } finally {
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
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">
          AI Configuration
        </h2>
        <p className="text-sm text-slate-600">
          Configure your AI provider and API keys
        </p>
      </div>

      <div className="bg-white rounded-lg border-2 border-slate-200 p-6 shadow-lg space-y-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              AI Provider
            </label>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              <option value="openai">OpenAI (GPT-4)</option>
              <option value="anthropic">Anthropic (Claude 3.5 Sonnet)</option>
              <option value="azure">Azure OpenAI</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              API Key
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-..."
              className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
            <p className="text-xs text-slate-500 mt-2">
              Your API key is encrypted and never shared
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Model
            </label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              {provider === 'openai' && (
                <>
                  <option value="gpt-4-turbo">GPT-4 Turbo</option>
                  <option value="gpt-4o-mini">GPT-4o mini</option>
                  <option value="gpt-4o">GPT-4o</option>
                </>
              )}
              {provider === 'anthropic' && (
                <>
                  <option value="claude-3-haiku-20240307">
                    Claude 3 Haiku
                  </option>
                  <option value="claude-3-5-sonnet-20241022">
                    Claude 3.5 Sonnet
                  </option>
                  <option value="claude-3-opus-20240229">Claude 3 Opus</option>
                </>
              )}
              {provider === 'azure' && (
                <option value="">Enter deployment name above</option>
              )}
            </select>
          </div>

          {/* Embedding Model (OpenAI only) */}
          {provider === 'openai' && (
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Embedding Model
              </label>
              <select
                value={embeddingModel}
                onChange={(e) => setEmbeddingModel(e.target.value)}
                className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                {EMBEDDING_MODEL_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-500 mt-2">
                {EMBEDDING_MODEL_OPTIONS.find(
                  (opt) => opt.value === embeddingModel
                )?.description || 'Used for semantic search in Knowledge Base'}
              </p>
            </div>
          )}

          <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <Sparkles className="w-5 h-5 text-blue-600 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-blue-900">
                Test your connection
              </p>
              <p className="text-xs text-blue-700 mt-1">
                Verify your API key is working correctly
              </p>
            </div>
            <button
              onClick={handleTest}
              disabled={testing || !apiKey}
              className="ml-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {testing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Testing...
                </>
              ) : (
                'Test'
              )}
            </button>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-slate-200">
          <button
            onClick={handleSave}
            disabled={saving || !apiKey}
            className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg font-semibold hover:from-orange-600 hover:to-orange-700 transition-all shadow-lg shadow-orange-500/30 hover:shadow-xl hover:shadow-orange-500/40 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Configuration
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

interface SupportProfile {
  support_type: string;
  description: string;
  typical_users?: string;
  systems_supported?: string[];
  common_issues?: string[];
  ai_generated: boolean;
  created_at: string;
  updated_at: string;
}

// Common support type suggestions (user can type anything)
const SUPPORT_TYPE_SUGGESTIONS = [
  'IT Support',
  'HR Support',
  'Customer Service',
  'Product Support',
  'Facilities',
  'Sales Support',
  'Legal',
  'Finance',
  'General Support',
];

function SupportProfileTab() {
  const [profile, setProfile] = useState<SupportProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showInterviewModal, setShowInterviewModal] = useState(false);
  const [editForm, setEditForm] = useState({
    support_type: '',
    description: '',
    typical_users: '',
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const response = await fetch('/api/organization/profile');
      if (response.ok) {
        const data = await response.json();
        setProfile(data.support_profile);
        if (data.support_profile) {
          setEditForm({
            support_type: data.support_profile.support_type,
            description: data.support_profile.description,
            typical_users: data.support_profile.typical_users || '',
          });
        }
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!editForm.support_type.trim()) {
      alert('Support type is required');
      return;
    }
    if (!editForm.description.trim()) {
      alert('Description is required');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/organization/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          support_profile: {
            support_type: editForm.support_type,
            description: editForm.description.trim(),
            typical_users: editForm.typical_users.trim() || null,
            ai_generated: false,
            updated_at: new Date().toISOString(),
          },
        }),
      });

      if (response.ok) {
        await loadProfile();
        setIsEditing(false);
      } else {
        const error = await response.json();
        alert(`Failed to save: ${error.error}`);
      }
    } catch (error) {
      console.error('Failed to save profile:', error);
      alert('Failed to save profile');
    } finally {
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">
            Support Profile
          </h2>
          <p className="text-sm text-slate-600">
            Configure your organization&apos;s support profile
          </p>
        </div>
        {profile && !isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <Pencil className="w-4 h-4" />
            Edit
          </button>
        )}
      </div>

      <div className="bg-white rounded-lg border-2 border-slate-200 p-6 shadow-lg space-y-6">
        {!profile && !isEditing ? (
          <div className="text-center py-8">
            <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">
              No Support Profile Configured
            </h3>
            <p className="text-sm text-slate-600 mb-4">
              Set up your support profile to help Echo understand your
              organization&apos;s needs.
            </p>
            <button
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium transition-colors"
            >
              Create Profile
            </button>
          </div>
        ) : isEditing ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Support Type *
              </label>
              <input
                type="text"
                value={editForm.support_type}
                onChange={(e) =>
                  setEditForm({ ...editForm, support_type: e.target.value })
                }
                list="support-type-suggestions-settings"
                className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="e.g., IT Support, Customer Service, Product Support..."
              />
              <datalist id="support-type-suggestions-settings">
                {SUPPORT_TYPE_SUGGESTIONS.map((suggestion) => (
                  <option key={suggestion} value={suggestion} />
                ))}
              </datalist>
              <p className="text-xs text-slate-500 mt-1">
                Type your own or select a suggestion
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Description *
              </label>
              <textarea
                value={editForm.description}
                onChange={(e) =>
                  setEditForm({ ...editForm, description: e.target.value })
                }
                rows={4}
                className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
                placeholder="Describe what your support team handles..."
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Typical Users
              </label>
              <input
                type="text"
                value={editForm.typical_users}
                onChange={(e) =>
                  setEditForm({ ...editForm, typical_users: e.target.value })
                }
                className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="e.g., Company employees, customers..."
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
              <button
                onClick={() => {
                  setIsEditing(false);
                  if (profile) {
                    setEditForm({
                      support_type: profile.support_type,
                      description: profile.description,
                      typical_users: profile.typical_users || '',
                    });
                  }
                }}
                className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !editForm.description.trim()}
                className="flex items-center gap-2 px-6 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Profile
                  </>
                )}
              </button>
            </div>
          </div>
        ) : profile ? (
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="flex-1">
                <span className="text-sm font-medium text-slate-500">
                  Support Type
                </span>
                <p className="text-lg font-semibold text-slate-900">
                  {profile.support_type}
                </p>
              </div>
              {profile.ai_generated && (
                <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">
                  AI Generated
                </span>
              )}
            </div>

            <div>
              <span className="text-sm font-medium text-slate-500">
                Description
              </span>
              <p className="text-slate-900 mt-1">{profile.description}</p>
            </div>

            {profile.typical_users && (
              <div>
                <span className="text-sm font-medium text-slate-500">
                  Typical Users
                </span>
                <p className="text-slate-900 mt-1">{profile.typical_users}</p>
              </div>
            )}

            {profile.systems_supported &&
              profile.systems_supported.length > 0 && (
                <div>
                  <span className="text-sm font-medium text-slate-500">
                    Systems Supported
                  </span>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {profile.systems_supported.map((system, i) => (
                      <span
                        key={i}
                        className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-sm"
                      >
                        {system}
                      </span>
                    ))}
                  </div>
                </div>
              )}

            {profile.common_issues && profile.common_issues.length > 0 && (
              <div>
                <span className="text-sm font-medium text-slate-500">
                  Common Issues
                </span>
                <div className="flex flex-wrap gap-2 mt-1">
                  {profile.common_issues.map((issue, i) => (
                    <span
                      key={i}
                      className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-sm"
                    >
                      {issue}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Last updated:{' '}
                {new Date(profile.updated_at).toLocaleDateString()}
              </span>
              <button
                onClick={() => setShowInterviewModal(true)}
                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              >
                <Sparkles className="w-4 h-4" />
                Re-run AI Interview
              </button>
            </div>
          </div>
        ) : null}

        {/* AI Interview Modal */}
        {showInterviewModal && (
          <AIInterviewModal
            onClose={() => setShowInterviewModal(false)}
            onComplete={async (newProfile) => {
              // Save the new profile
              setSaving(true);
              try {
                const response = await fetch('/api/organization/profile', {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    support_profile: {
                      ...newProfile,
                      ai_generated: true,
                      updated_at: new Date().toISOString(),
                    },
                  }),
                });

                if (response.ok) {
                  await loadProfile();
                  setShowInterviewModal(false);
                } else {
                  const error = await response.json();
                  alert(`Failed to save: ${error.error}`);
                }
              } catch (error) {
                console.error('Failed to save profile:', error);
                alert('Failed to save profile');
              } finally {
                setSaving(false);
              }
            }}
          />
        )}
      </div>
    </div>
  );
}

interface Category {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string | null;
  sort_order: number;
  is_active: boolean;
  is_default: boolean;
}

const MAX_CATEGORIES = 20;

function CategoriesTab() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newCategory, setNewCategory] = useState({
    name: '',
    description: '',
    color: '#3B82F6',
  });
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  // Load categories
  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      // Include archived categories so we can show them in the archived section
      const response = await fetch('/api/categories?include_archived=true');
      if (response.ok) {
        const data = await response.json();
        setCategories(data);
      }
    } catch (error) {
      console.error('Failed to load categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const activeCategories = categories.filter((c) => c.is_active);
  const archivedCategories = categories.filter((c) => !c.is_active);
  const canAddMore = activeCategories.length < MAX_CATEGORIES;

  const handleAddCategory = async () => {
    if (!newCategory.name.trim() || !canAddMore) return;

    setSaving(true);
    try {
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newCategory.name.trim(),
          description: newCategory.description.trim(),
          color: newCategory.color,
          sort_order: (activeCategories.length + 1) * 10,
        }),
      });

      if (response.ok) {
        await loadCategories();
        setNewCategory({ name: '', description: '', color: '#3B82F6' });
        setIsAddingNew(false);
      } else {
        const error = await response.json();
        alert(`Failed to add category: ${error.error}`);
      }
    } catch (error) {
      console.error('Failed to add category:', error);
      alert('Failed to add category');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateCategory = async (category: Category) => {
    setSaving(true);
    try {
      const response = await fetch(`/api/categories/${category.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: category.name,
          description: category.description,
          color: category.color,
        }),
      });

      if (response.ok) {
        await loadCategories();
        setEditingCategory(null);
      } else {
        const error = await response.json();
        alert(`Failed to update category: ${error.error}`);
      }
    } catch (error) {
      console.error('Failed to update category:', error);
      alert('Failed to update category');
    } finally {
      setSaving(false);
    }
  };

  const handleArchiveCategory = async (categoryId: string) => {
    setSaving(true);
    try {
      const response = await fetch(`/api/categories/${categoryId}/archive`, {
        method: 'POST',
      });

      if (response.ok) {
        await loadCategories();
      } else {
        const error = await response.json();
        alert(`Failed to archive category: ${error.error}`);
      }
    } catch (error) {
      console.error('Failed to archive category:', error);
      alert('Failed to archive category');
    } finally {
      setSaving(false);
    }
  };

  const handleRestoreCategory = async (categoryId: string) => {
    if (!canAddMore) {
      alert(
        `Cannot restore: Maximum ${MAX_CATEGORIES} active categories allowed`
      );
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/categories/${categoryId}/restore`, {
        method: 'POST',
      });

      if (response.ok) {
        await loadCategories();
      } else {
        const error = await response.json();
        alert(`Failed to restore category: ${error.error}`);
      }
    } catch (error) {
      console.error('Failed to restore category:', error);
      alert('Failed to restore category');
    } finally {
      setSaving(false);
    }
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, categoryId: string) => {
    setDraggedId(categoryId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, categoryId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (categoryId !== draggedId) {
      setDragOverId(categoryId);
    }
  };

  const handleDragLeave = () => {
    setDragOverId(null);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setDragOverId(null);
  };

  const handleDrop = async (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    setDragOverId(null);

    if (!draggedId || draggedId === targetId) {
      setDraggedId(null);
      return;
    }

    // Calculate new order
    const sortedActive = [...activeCategories].sort(
      (a, b) => a.sort_order - b.sort_order
    );
    const draggedIndex = sortedActive.findIndex((c) => c.id === draggedId);
    const targetIndex = sortedActive.findIndex((c) => c.id === targetId);

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedId(null);
      return;
    }

    // Reorder locally first for immediate feedback
    const reordered = [...sortedActive];
    const [removed] = reordered.splice(draggedIndex, 1);
    reordered.splice(targetIndex, 0, removed);

    // Update local state immediately
    const newCategoryIds = reordered.map((c) => c.id);
    const updatedCategories = categories.map((cat) => {
      const newIndex = newCategoryIds.indexOf(cat.id);
      if (newIndex !== -1) {
        return { ...cat, sort_order: (newIndex + 1) * 10 };
      }
      return cat;
    });
    setCategories(updatedCategories);

    // Persist to server
    try {
      const response = await fetch('/api/categories/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categoryIds: newCategoryIds }),
      });

      if (!response.ok) {
        // Reload on error to restore server state
        await loadCategories();
      }
    } catch (error) {
      console.error('Failed to save category order:', error);
      await loadCategories();
    }

    setDraggedId(null);
  };

  // Sort active categories for display
  const sortedActiveCategories = [...activeCategories].sort(
    (a, b) => a.sort_order - b.sort_order
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">
            Ping Categories
          </h2>
          <p className="text-sm text-slate-600">
            Manage categories for organizing pings ({activeCategories.length}/
            {MAX_CATEGORIES} active)
          </p>
        </div>
        <button
          onClick={() => setShowArchived(!showArchived)}
          className="text-sm text-slate-600 hover:text-slate-900 flex items-center gap-2"
        >
          <Archive className="w-4 h-4" />
          {showArchived ? 'Hide' : 'Show'} Archived ({archivedCategories.length}
          )
        </button>
      </div>

      <div className="bg-white rounded-lg border-2 border-slate-200 p-6 shadow-lg space-y-4">
        {/* Active Categories */}
        {sortedActiveCategories.map((category) => (
          <div
            key={category.id}
            draggable={!editingCategory}
            onDragStart={(e) => handleDragStart(e, category.id)}
            onDragOver={(e) => handleDragOver(e, category.id)}
            onDragLeave={handleDragLeave}
            onDragEnd={handleDragEnd}
            onDrop={(e) => handleDrop(e, category.id)}
            className={`flex items-center justify-between p-4 border rounded-lg transition-all ${
              draggedId === category.id
                ? 'opacity-50 border-orange-500 bg-orange-50'
                : dragOverId === category.id
                  ? 'border-orange-500 border-2 shadow-md'
                  : 'border-slate-200 hover:border-orange-500 hover:shadow-md'
            }`}
          >
            {editingCategory?.id === category.id ? (
              <div className="flex-1 flex items-center gap-4">
                <input
                  type="color"
                  value={editingCategory.color}
                  onChange={(e) =>
                    setEditingCategory({
                      ...editingCategory,
                      color: e.target.value,
                    })
                  }
                  className="w-10 h-10 rounded cursor-pointer"
                />
                <div className="flex-1 space-y-2">
                  <input
                    type="text"
                    value={editingCategory.name}
                    onChange={(e) =>
                      setEditingCategory({
                        ...editingCategory,
                        name: e.target.value,
                      })
                    }
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="Category name"
                  />
                  <input
                    type="text"
                    value={editingCategory.description}
                    onChange={(e) =>
                      setEditingCategory({
                        ...editingCategory,
                        description: e.target.value,
                      })
                    }
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                    placeholder="Description (optional)"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleUpdateCategory(editingCategory)}
                    disabled={saving || !editingCategory.name.trim()}
                    className="px-3 py-1.5 text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 rounded transition-colors disabled:opacity-50"
                  >
                    {saving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      'Save'
                    )}
                  </button>
                  <button
                    onClick={() => setEditingCategory(null)}
                    className="px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <GripVertical
                    className={`w-5 h-5 text-slate-300 ${draggedId ? 'cursor-grabbing' : 'cursor-grab'}`}
                  />
                  <div
                    className="w-8 h-8 rounded flex items-center justify-center"
                    style={{ backgroundColor: category.color }}
                  >
                    <span className="text-white text-xs font-bold">
                      {category.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-slate-900">
                      {category.name}
                    </span>
                    {category.description && (
                      <p className="text-xs text-slate-500">
                        {category.description}
                      </p>
                    )}
                  </div>
                  {category.is_default && (
                    <span className="px-2 py-0.5 text-xs bg-slate-100 text-slate-600 rounded">
                      Default
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setEditingCategory(category)}
                    className="p-2 text-slate-600 hover:bg-slate-100 rounded transition-colors"
                    title="Edit"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  {!category.is_default && (
                    <button
                      onClick={() => handleArchiveCategory(category.id)}
                      disabled={saving}
                      className="p-2 text-slate-600 hover:bg-red-50 hover:text-red-600 rounded transition-colors"
                      title="Archive"
                    >
                      <Archive className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        ))}

        {/* Add New Category */}
        {isAddingNew ? (
          <div className="p-4 border-2 border-dashed border-orange-300 rounded-lg bg-orange-50">
            <div className="flex items-center gap-4">
              <input
                type="color"
                value={newCategory.color}
                onChange={(e) =>
                  setNewCategory({ ...newCategory, color: e.target.value })
                }
                className="w-10 h-10 rounded cursor-pointer"
              />
              <div className="flex-1 space-y-2">
                <input
                  type="text"
                  value={newCategory.name}
                  onChange={(e) =>
                    setNewCategory({ ...newCategory, name: e.target.value })
                  }
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Category name"
                  autoFocus
                />
                <input
                  type="text"
                  value={newCategory.description}
                  onChange={(e) =>
                    setNewCategory({
                      ...newCategory,
                      description: e.target.value,
                    })
                  }
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                  placeholder="Description (optional)"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleAddCategory}
                  disabled={saving || !newCategory.name.trim()}
                  className="px-4 py-2 text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  Add
                </button>
                <button
                  onClick={() => {
                    setIsAddingNew(false);
                    setNewCategory({
                      name: '',
                      description: '',
                      color: '#3B82F6',
                    });
                  }}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setIsAddingNew(true)}
            disabled={!canAddMore}
            className="w-full py-3 border-2 border-dashed border-slate-300 rounded-lg text-slate-600 hover:border-orange-500 hover:text-orange-500 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add New Category
          </button>
        )}

        {!canAddMore && (
          <p className="text-sm text-amber-600 text-center">
            Maximum {MAX_CATEGORIES} active categories reached. Archive some
            categories to add more.
          </p>
        )}

        {/* Archived Categories */}
        {showArchived && archivedCategories.length > 0 && (
          <div className="mt-6 pt-6 border-t border-slate-200">
            <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
              <Archive className="w-4 h-4" />
              Archived Categories
            </h3>
            <div className="space-y-2">
              {archivedCategories.map((category) => (
                <div
                  key={category.id}
                  className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg opacity-60"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-6 h-6 rounded"
                      style={{ backgroundColor: category.color }}
                    />
                    <span className="text-sm text-slate-600">
                      {category.name}
                    </span>
                  </div>
                  <button
                    onClick={() => handleRestoreCategory(category.id)}
                    disabled={saving || !canAddMore}
                    className="p-1.5 text-slate-600 hover:bg-slate-200 rounded transition-colors disabled:opacity-50"
                    title="Restore"
                  >
                    <ArchiveRestore className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface Team {
  id: string;
  name: string;
  description: string | null;
}

interface RoutingRule {
  id: string;
  category_id: string;
  rule_type: 'agent' | 'team';
  destination_agent_id: string | null;
  destination_team_id: string | null;
  priority: number;
  is_active: boolean;
  category: {
    id: string;
    name: string;
    color: string;
    icon: string | null;
  };
  destination_agent: {
    id: string;
    full_name: string;
    email: string;
    avatar_url: string | null;
  } | null;
  destination_team: {
    id: string;
    name: string;
    description: string | null;
  } | null;
}

interface AvailableCategory {
  id: string;
  name: string;
  color: string;
}

interface AvailableAgent {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
}

function RoutingTab() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [routingRules, setRoutingRules] = useState<RoutingRule[]>([]);
  const [availableCategories, setAvailableCategories] = useState<
    AvailableCategory[]
  >([]);
  const [availableAgents, setAvailableAgents] = useState<AvailableAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Routing rule form state
  const [isAddingRule, setIsAddingRule] = useState(false);
  const [editingRule, setEditingRule] = useState<RoutingRule | null>(null);
  const [ruleForm, setRuleForm] = useState({
    category_id: '',
    rule_type: 'team' as 'agent' | 'team',
    destination_agent_id: '',
    destination_team_id: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [teamsRes, rulesRes, categoriesRes, agentsRes] = await Promise.all([
        fetch('/api/teams'),
        fetch('/api/routing-rules'),
        fetch('/api/categories'),
        fetch('/api/agents'),
      ]);

      if (teamsRes.ok) setTeams(await teamsRes.json());
      if (rulesRes.ok) setRoutingRules(await rulesRes.json());
      if (categoriesRes.ok) setAvailableCategories(await categoriesRes.json());
      if (agentsRes.ok) setAvailableAgents(await agentsRes.json());
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Routing rules management
  const handleAddRule = async () => {
    if (!ruleForm.category_id) return;
    if (ruleForm.rule_type === 'team' && !ruleForm.destination_team_id) return;
    if (ruleForm.rule_type === 'agent' && !ruleForm.destination_agent_id)
      return;

    setSaving(true);
    try {
      const response = await fetch('/api/routing-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category_id: ruleForm.category_id,
          rule_type: ruleForm.rule_type,
          destination_agent_id:
            ruleForm.rule_type === 'agent'
              ? ruleForm.destination_agent_id
              : null,
          destination_team_id:
            ruleForm.rule_type === 'team' ? ruleForm.destination_team_id : null,
          is_active: true,
        }),
      });
      if (response.ok) {
        await loadData();
        setRuleForm({
          category_id: '',
          rule_type: 'team',
          destination_agent_id: '',
          destination_team_id: '',
        });
        setIsAddingRule(false);
      } else {
        const error = await response.json();
        alert(`Failed to create rule: ${error.error}`);
      }
    } catch (error) {
      console.error('Failed to create rule:', error);
      alert('Failed to create rule');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateRule = async () => {
    if (!editingRule) return;
    if (ruleForm.rule_type === 'team' && !ruleForm.destination_team_id) return;
    if (ruleForm.rule_type === 'agent' && !ruleForm.destination_agent_id)
      return;

    setSaving(true);
    try {
      const response = await fetch(`/api/routing-rules/${editingRule.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rule_type: ruleForm.rule_type,
          destination_agent_id:
            ruleForm.rule_type === 'agent'
              ? ruleForm.destination_agent_id
              : null,
          destination_team_id:
            ruleForm.rule_type === 'team' ? ruleForm.destination_team_id : null,
        }),
      });
      if (response.ok) {
        await loadData();
        setEditingRule(null);
        setRuleForm({
          category_id: '',
          rule_type: 'team',
          destination_agent_id: '',
          destination_team_id: '',
        });
      } else {
        const error = await response.json();
        alert(`Failed to update rule: ${error.error}`);
      }
    } catch (error) {
      console.error('Failed to update rule:', error);
      alert('Failed to update rule');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (!confirm('Are you sure you want to delete this routing rule?')) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/routing-rules/${ruleId}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        await loadData();
      } else {
        const error = await response.json();
        alert(`Failed to delete rule: ${error.error}`);
      }
    } catch (error) {
      console.error('Failed to delete rule:', error);
      alert('Failed to delete rule');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleRule = async (rule: RoutingRule) => {
    setSaving(true);
    try {
      const response = await fetch(`/api/routing-rules/${rule.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !rule.is_active }),
      });
      if (response.ok) {
        await loadData();
      }
    } catch (error) {
      console.error('Failed to toggle rule:', error);
    } finally {
      setSaving(false);
    }
  };

  // Get categories that don't have rules yet
  const categoriesWithoutRules = availableCategories.filter(
    (cat) => !routingRules.some((rule) => rule.category_id === cat.id)
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Routing Rules Section */}
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 mb-1">
            Routing Rules
          </h2>
          <p className="text-sm text-slate-600">
            Automatically assign pings to teams or agents based on category
          </p>
        </div>

        <div className="bg-white rounded-lg border-2 border-slate-200 p-6 shadow-lg space-y-4">
          {routingRules.length === 0 && !isAddingRule ? (
            <div className="text-center py-8">
              <Route className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">
                No Routing Rules
              </h3>
              <p className="text-sm text-slate-600 mb-4">
                Create routing rules to automatically assign pings to the right
                team or agent.
              </p>
              {categoriesWithoutRules.length > 0 && teams.length > 0 ? (
                <button
                  onClick={() => setIsAddingRule(true)}
                  className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium transition-colors"
                >
                  Create First Rule
                </button>
              ) : (
                <p className="text-xs text-slate-500">
                  {teams.length === 0
                    ? 'Create a team first to set up routing.'
                    : 'All categories already have routing rules.'}
                </p>
              )}
            </div>
          ) : (
            <>
              {routingRules.map((rule) => (
                <div
                  key={rule.id}
                  className={`flex items-center justify-between p-4 border rounded-lg transition-colors ${
                    rule.is_active
                      ? 'border-slate-200 hover:border-orange-300'
                      : 'border-slate-200 bg-slate-50 opacity-60'
                  }`}
                >
                  {editingRule?.id === rule.id ? (
                    <div className="flex-1 flex items-center gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-4 h-4 rounded"
                            style={{ backgroundColor: rule.category.color }}
                          />
                          <span className="font-medium text-slate-700">
                            {rule.category.name}
                          </span>
                          <span className="text-slate-400">→</span>
                        </div>
                        <div className="flex gap-2">
                          <select
                            value={ruleForm.rule_type}
                            onChange={(e) =>
                              setRuleForm({
                                ...ruleForm,
                                rule_type: e.target.value as 'agent' | 'team',
                              })
                            }
                            className="px-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                          >
                            <option value="team">Team</option>
                            <option value="agent">Agent</option>
                          </select>
                          {ruleForm.rule_type === 'team' ? (
                            <select
                              value={ruleForm.destination_team_id}
                              onChange={(e) =>
                                setRuleForm({
                                  ...ruleForm,
                                  destination_team_id: e.target.value,
                                })
                              }
                              className="flex-1 px-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                            >
                              <option value="">Select team...</option>
                              {teams.map((team) => (
                                <option key={team.id} value={team.id}>
                                  {team.name}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <select
                              value={ruleForm.destination_agent_id}
                              onChange={(e) =>
                                setRuleForm({
                                  ...ruleForm,
                                  destination_agent_id: e.target.value,
                                })
                              }
                              className="flex-1 px-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                            >
                              <option value="">Select agent...</option>
                              {availableAgents.map((agent) => (
                                <option key={agent.id} value={agent.id}>
                                  {agent.full_name}
                                </option>
                              ))}
                            </select>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={handleUpdateRule}
                          disabled={
                            saving ||
                            (ruleForm.rule_type === 'team'
                              ? !ruleForm.destination_team_id
                              : !ruleForm.destination_agent_id)
                          }
                          className="px-3 py-1.5 text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 rounded transition-colors disabled:opacity-50"
                        >
                          {saving ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            'Save'
                          )}
                        </button>
                        <button
                          onClick={() => {
                            setEditingRule(null);
                            setRuleForm({
                              category_id: '',
                              rule_type: 'team',
                              destination_agent_id: '',
                              destination_team_id: '',
                            });
                          }}
                          className="px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded flex items-center justify-center"
                          style={{ backgroundColor: rule.category.color }}
                        >
                          <span className="text-white text-xs font-bold">
                            {rule.category.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-slate-900">
                            {rule.category.name}
                          </span>
                          <span className="text-slate-400">→</span>
                          {rule.rule_type === 'team' &&
                          rule.destination_team ? (
                            <span className="text-slate-700 flex items-center gap-1">
                              <Users className="w-4 h-4" />
                              {rule.destination_team.name}
                            </span>
                          ) : rule.destination_agent ? (
                            <span className="text-slate-700 flex items-center gap-1">
                              <User className="w-4 h-4" />
                              {rule.destination_agent.full_name}
                            </span>
                          ) : (
                            <span className="text-slate-400">Unknown</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={rule.is_active}
                            onChange={() => handleToggleRule(rule)}
                            disabled={saving}
                          />
                          <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-orange-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-orange-500"></div>
                        </label>
                        <button
                          onClick={() => {
                            setEditingRule(rule);
                            setRuleForm({
                              category_id: rule.category_id,
                              rule_type: rule.rule_type,
                              destination_agent_id:
                                rule.destination_agent_id || '',
                              destination_team_id:
                                rule.destination_team_id || '',
                            });
                          }}
                          className="p-2 text-slate-600 hover:bg-slate-100 rounded transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteRule(rule.id)}
                          disabled={saving}
                          className="p-2 text-slate-600 hover:bg-red-50 hover:text-red-600 rounded transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}

              {/* Add New Rule */}
              {isAddingRule ? (
                <div className="p-4 border-2 border-dashed border-orange-300 rounded-lg bg-orange-50">
                  <div className="flex items-center gap-4">
                    <div className="flex-1 space-y-2">
                      <select
                        value={ruleForm.category_id}
                        onChange={(e) =>
                          setRuleForm({
                            ...ruleForm,
                            category_id: e.target.value,
                          })
                        }
                        className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                      >
                        <option value="">Select category...</option>
                        {categoriesWithoutRules.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.name}
                          </option>
                        ))}
                      </select>
                      <div className="flex gap-2">
                        <select
                          value={ruleForm.rule_type}
                          onChange={(e) =>
                            setRuleForm({
                              ...ruleForm,
                              rule_type: e.target.value as 'agent' | 'team',
                            })
                          }
                          className="px-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                        >
                          <option value="team">Route to Team</option>
                          <option value="agent">Route to Agent</option>
                        </select>
                        {ruleForm.rule_type === 'team' ? (
                          <select
                            value={ruleForm.destination_team_id}
                            onChange={(e) =>
                              setRuleForm({
                                ...ruleForm,
                                destination_team_id: e.target.value,
                              })
                            }
                            className="flex-1 px-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                          >
                            <option value="">Select team...</option>
                            {teams.map((team) => (
                              <option key={team.id} value={team.id}>
                                {team.name}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <select
                            value={ruleForm.destination_agent_id}
                            onChange={(e) =>
                              setRuleForm({
                                ...ruleForm,
                                destination_agent_id: e.target.value,
                              })
                            }
                            className="flex-1 px-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                          >
                            <option value="">Select agent...</option>
                            {availableAgents.map((agent) => (
                              <option key={agent.id} value={agent.id}>
                                {agent.full_name}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleAddRule}
                        disabled={
                          saving ||
                          !ruleForm.category_id ||
                          (ruleForm.rule_type === 'team'
                            ? !ruleForm.destination_team_id
                            : !ruleForm.destination_agent_id)
                        }
                        className="px-4 py-2 text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                      >
                        {saving ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Plus className="w-4 h-4" />
                        )}
                        Add
                      </button>
                      <button
                        onClick={() => {
                          setIsAddingRule(false);
                          setRuleForm({
                            category_id: '',
                            rule_type: 'team',
                            destination_agent_id: '',
                            destination_team_id: '',
                          });
                        }}
                        className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              ) : categoriesWithoutRules.length > 0 &&
                (teams.length > 0 || availableAgents.length > 0) ? (
                <button
                  onClick={() => setIsAddingRule(true)}
                  className="w-full py-3 border-2 border-dashed border-slate-300 rounded-lg text-slate-600 hover:border-orange-500 hover:text-orange-500 transition-colors font-medium flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Routing Rule
                </button>
              ) : categoriesWithoutRules.length === 0 &&
                routingRules.length > 0 ? (
                <p className="text-sm text-green-600 text-center py-2">
                  ✓ All categories have routing rules configured
                </p>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// SLA Policy types for the UI
interface SLAPolicy {
  id: string;
  tenant_id: string;
  name: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  first_response_minutes: number;
  resolution_minutes: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const PRIORITY_ORDER = ['urgent', 'high', 'normal', 'low'] as const;
const PRIORITY_LABELS: Record<string, string> = {
  urgent: 'Urgent',
  high: 'High',
  normal: 'Normal',
  low: 'Low',
};
const PRIORITY_COLORS: Record<string, string> = {
  urgent: 'bg-red-100 text-red-800 border-red-200',
  high: 'bg-orange-100 text-orange-800 border-orange-200',
  normal: 'bg-blue-100 text-blue-800 border-blue-200',
  low: 'bg-slate-100 text-slate-800 border-slate-200',
};

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  if (minutes < 1440) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }
  const days = Math.floor(minutes / 1440);
  const remainingHours = Math.floor((minutes % 1440) / 60);
  return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
}

function SLATab() {
  const [policies, setPolicies] = useState<SLAPolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingPolicy, setEditingPolicy] = useState<SLAPolicy | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formPriority, setFormPriority] = useState<
    'low' | 'normal' | 'high' | 'urgent'
  >('normal');
  const [formFirstResponse, setFormFirstResponse] = useState(480);
  const [formResolution, setFormResolution] = useState(1440);

  // Compute which priorities are already used by active policies
  const usedPriorities = new Set(
    policies.filter((p) => p.is_active).map((p) => p.priority)
  );
  const allPrioritiesCovered = usedPriorities.size >= 4;

  // Get the first available priority for new policies
  const getFirstAvailablePriority = ():
    | 'low'
    | 'normal'
    | 'high'
    | 'urgent' => {
    for (const p of PRIORITY_ORDER) {
      if (!usedPriorities.has(p)) return p;
    }
    return 'normal'; // fallback, shouldn't happen
  };

  // Fetch policies on mount
  useEffect(() => {
    fetchPolicies();
  }, []);

  async function fetchPolicies() {
    try {
      setLoading(true);
      const response = await fetch('/api/sla-policies');
      if (!response.ok) throw new Error('Failed to fetch SLA policies');
      const data = await response.json();
      // Sort by priority order
      const sorted = [...data].sort(
        (a, b) =>
          PRIORITY_ORDER.indexOf(a.priority) -
          PRIORITY_ORDER.indexOf(b.priority)
      );
      setPolicies(sorted);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  function openNewForm() {
    setEditingPolicy(null);
    setFormName('');
    setFormPriority(getFirstAvailablePriority());
    setFormFirstResponse(480);
    setFormResolution(1440);
    setShowForm(true);
  }

  function openEditForm(policy: SLAPolicy) {
    setEditingPolicy(policy);
    setFormName(policy.name);
    setFormPriority(policy.priority);
    setFormFirstResponse(policy.first_response_minutes);
    setFormResolution(policy.resolution_minutes);
    setShowForm(true);
  }

  async function handleSubmit() {
    if (!formName.trim()) {
      setError('Policy name is required');
      return;
    }
    if (formFirstResponse <= 0) {
      setError('First response time must be positive');
      return;
    }
    if (formResolution <= 0) {
      setError('Resolution time must be positive');
      return;
    }
    if (formResolution < formFirstResponse) {
      setError('Resolution time must be >= first response time');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const payload = {
        name: formName.trim(),
        priority: formPriority,
        first_response_minutes: formFirstResponse,
        resolution_minutes: formResolution,
      };

      let response;
      if (editingPolicy) {
        response = await fetch(`/api/sla-policies/${editingPolicy.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        response = await fetch('/api/sla-policies', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save SLA policy');
      }

      setShowForm(false);
      fetchPolicies();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(policyId: string) {
    try {
      setSaving(true);
      setError(null);

      const response = await fetch(`/api/sla-policies/${policyId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete SLA policy');
      }

      setDeleteConfirm(null);
      fetchPolicies();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">
            SLA Policies
          </h2>
          <p className="text-sm text-slate-600">
            Define response and resolution time targets for each priority level
          </p>
        </div>
        <div className="relative group">
          <button
            onClick={openNewForm}
            disabled={allPrioritiesCovered}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all ${
              allPrioritiesCovered
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:from-orange-600 hover:to-orange-700 shadow-lg shadow-orange-500/30'
            }`}
          >
            <Plus className="w-4 h-4" />
            Add Policy
          </button>
          {allPrioritiesCovered && (
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-slate-800 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              All priority levels have active policies
              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800" />
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Policy Form Modal */}
      {showForm && (
        <div className="bg-white rounded-lg border-2 border-orange-200 p-6 shadow-lg">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">
            {editingPolicy ? 'Edit SLA Policy' : 'New SLA Policy'}
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Policy Name
              </label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g., Urgent Priority SLA"
                className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Priority Level
              </label>
              <select
                value={formPriority}
                onChange={(e) =>
                  setFormPriority(
                    e.target.value as 'low' | 'normal' | 'high' | 'urgent'
                  )
                }
                disabled={!!editingPolicy}
                className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:bg-slate-100 disabled:cursor-not-allowed"
              >
                {PRIORITY_ORDER.map((p) => {
                  const isUsed = usedPriorities.has(p);
                  const isCurrentEdit = editingPolicy?.priority === p;
                  return (
                    <option
                      key={p}
                      value={p}
                      disabled={isUsed && !isCurrentEdit && !editingPolicy}
                    >
                      {PRIORITY_LABELS[p]}
                      {isUsed && !isCurrentEdit && !editingPolicy
                        ? ' (already exists)'
                        : ''}
                    </option>
                  );
                })}
              </select>
              {editingPolicy ? (
                <p className="text-xs text-slate-500 mt-1">
                  Priority cannot be changed after creation
                </p>
              ) : (
                <p className="text-xs text-slate-500 mt-1">
                  Only available priorities are shown
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                First Response Time (minutes)
              </label>
              <input
                type="number"
                value={formFirstResponse}
                onChange={(e) =>
                  setFormFirstResponse(parseInt(e.target.value) || 0)
                }
                min="1"
                className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
              <p className="text-xs text-slate-500 mt-1">
                = {formatDuration(formFirstResponse)}
              </p>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Resolution Time (minutes)
              </label>
              <input
                type="number"
                value={formResolution}
                onChange={(e) =>
                  setFormResolution(parseInt(e.target.value) || 0)
                }
                min="1"
                className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
              <p className="text-xs text-slate-500 mt-1">
                = {formatDuration(formResolution)}
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg font-semibold hover:from-orange-600 hover:to-orange-700 transition-all disabled:opacity-50"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {editingPolicy ? 'Save Changes' : 'Create Policy'}
            </button>
          </div>
        </div>
      )}

      {/* Policies List */}
      <div className="bg-white rounded-lg border-2 border-slate-200 shadow-lg overflow-hidden">
        {policies.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <Clock className="w-12 h-12 mx-auto mb-4 text-slate-300" />
            <p className="font-medium">No SLA policies defined</p>
            <p className="text-sm mt-1">
              Click "Add Policy" to create your first SLA policy
            </p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Policy Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Priority
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  First Response
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Resolution
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {policies.map((policy) => (
                <tr key={policy.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="font-medium text-slate-900">
                      {policy.name}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${PRIORITY_COLORS[policy.priority]}`}
                    >
                      {PRIORITY_LABELS[policy.priority]}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-slate-700">
                    {formatDuration(policy.first_response_minutes)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-slate-700">
                    {formatDuration(policy.resolution_minutes)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        policy.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {policy.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    {deleteConfirm === policy.id ? (
                      <div className="flex items-center justify-end gap-2">
                        <span className="text-sm text-slate-600">Delete?</span>
                        <button
                          onClick={() => handleDelete(policy.id)}
                          disabled={saving}
                          className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600"
                        >
                          Yes
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(null)}
                          className="px-2 py-1 text-xs bg-slate-200 text-slate-700 rounded hover:bg-slate-300"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditForm(policy)}
                          className="p-1.5 text-slate-500 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                          title="Edit policy"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(policy.id)}
                          className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete policy"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-800">
          <strong>Note:</strong> Changes to SLA policies apply to new pings
          only. Existing pings retain their original SLA targets.
        </p>
      </div>
    </div>
  );
}

function SecurityTab() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">
          Security Settings
        </h2>
        <p className="text-sm text-slate-600">
          Manage your password and security preferences
        </p>
      </div>

      <div className="bg-white rounded-lg border-2 border-slate-200 p-6 shadow-lg space-y-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Current Password
            </label>
            <input
              type="password"
              className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              New Password
            </label>
            <input
              type="password"
              className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Confirm New Password
            </label>
            <input
              type="password"
              className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="pt-4 border-t border-slate-200">
          <div className="flex items-start justify-between py-3">
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-slate-900 mb-1">
                Two-Factor Authentication
              </h3>
              <p className="text-xs text-slate-600">
                Add an extra layer of security to your account
              </p>
            </div>
            <button className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors">
              Enable 2FA
            </button>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-slate-200">
          <button className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg font-semibold hover:from-orange-600 hover:to-orange-700 transition-all shadow-lg shadow-orange-500/30 hover:shadow-xl hover:shadow-orange-500/40 transform hover:scale-105">
            <Save className="w-4 h-4" />
            Update Password
          </button>
        </div>
      </div>
    </div>
  );
}

function UsersTab() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserRole, setCurrentUserRole] = useState<string>('');
  const [firstUserId, setFirstUserId] = useState<string>('');

  useEffect(() => {
    async function loadUsers() {
      try {
        // Fetch current user
        const userResponse = await fetch('/api/user');
        const userData = await userResponse.json();
        setCurrentUserRole(userData.role);

        // Fetch all users
        const usersResponse = await fetch('/api/users');
        if (usersResponse.ok) {
          const usersData = await usersResponse.json();
          setUsers(usersData);
          // First user by creation date is the owner who can't have role changed
          if (usersData.length > 0) {
            const sortedUsers = [...usersData].sort(
              (a: any, b: any) =>
                new Date(a.created_at).getTime() -
                new Date(b.created_at).getTime()
            );
            setFirstUserId(sortedUsers[0].id);
          }
        }
      } catch (error) {
        console.error('Failed to load users:', error);
      } finally {
        setLoading(false);
      }
    }
    loadUsers();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">
          User Management
        </h2>
        <p className="text-sm text-slate-600">
          Manage users and assign roles within your organization
        </p>
      </div>

      {users.length === 0 ? (
        <div className="bg-white rounded-lg border-2 border-slate-200 p-12 text-center shadow-lg">
          <p className="text-slate-500">No users found in your organization.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border-2 border-slate-200 shadow-lg overflow-hidden">
          <UserManagementTable
            users={users}
            currentUserRole={currentUserRole as any}
            firstUserId={firstUserId}
          />
        </div>
      )}
    </div>
  );
}

// AI Interview Modal Component
interface AIInterviewModalProps {
  onClose: () => void;
  onComplete: (
    profile: Omit<SupportProfile, 'created_at' | 'updated_at'>
  ) => void;
}

interface InterviewMessage {
  role: 'echo' | 'user';
  content: string;
}

interface AIConfig {
  provider: 'openai' | 'anthropic' | 'azure' | 'skip';
  apiKey?: string;
  model?: string;
}

function AIInterviewModal({ onClose, onComplete }: AIInterviewModalProps) {
  const [messages, setMessages] = useState<InterviewMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [generatedProfile, setGeneratedProfile] =
    useState<SupportProfile | null>(null);
  const [aiConfig, setAiConfig] = useState<AIConfig | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load AI config and start interview on mount
  useEffect(() => {
    loadAIConfigAndStart();
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadAIConfigAndStart = async () => {
    setIsLoading(true);
    try {
      // First, load AI config
      const configResponse = await fetch('/api/ai-config');
      let config: AIConfig = { provider: 'skip' };
      if (configResponse.ok) {
        const data = await configResponse.json();
        config = {
          provider: data.provider || 'skip',
          apiKey: data.apiKey,
          model: data.model,
        };
        setAiConfig(config);
      }

      // Then start the interview
      const response = await fetch('/api/setup/interview/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ restart: true }),
      });

      if (response.ok) {
        const data = await response.json();
        // API returns { opening: ... }
        setMessages([{ role: 'echo', content: data.opening }]);
      } else {
        // If API fails, use default message
        setMessages([
          {
            role: 'echo',
            content:
              "Hi! I'd like to learn about your support team. What kind of support do you provide?",
          },
        ]);
      }
    } catch (error) {
      console.error('Failed to start interview:', error);
      setMessages([
        {
          role: 'echo',
          content:
            "Hi! I'd like to learn about your support team. What kind of support do you provide?",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading || !aiConfig) return;

    const userMessage = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await fetch('/api/setup/interview/continue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation: [...messages, { role: 'user', content: userMessage }],
          aiConfig: aiConfig,
        }),
      });

      if (response.ok) {
        const data = await response.json();

        if (data.complete && data.profile) {
          // Interview complete - show the generated profile
          setMessages((prev) => [
            ...prev,
            {
              role: 'echo',
              content:
                "Great! I've gathered enough information to create your support profile.",
            },
          ]);
          setGeneratedProfile(data.profile);
        } else if (data.nextQuestion) {
          // Continue with next question
          setMessages((prev) => [
            ...prev,
            { role: 'echo', content: data.nextQuestion },
          ]);
        } else {
          // Fallback
          setMessages((prev) => [
            ...prev,
            {
              role: 'echo',
              content: 'Could you tell me more about your support team?',
            },
          ]);
        }
      } else {
        const errorData = await response.json();
        console.error('Interview continue error:', errorData);
        setMessages((prev) => [
          ...prev,
          {
            role: 'echo',
            content:
              'I had trouble processing that. Could you tell me more about what your support team handles?',
          },
        ]);
      }
    } catch (error) {
      console.error('Failed to continue interview:', error);
      setMessages((prev) => [
        ...prev,
        {
          role: 'echo',
          content:
            "I didn't quite catch that. Could you tell me more about what your support team handles?",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">
                Echo AI Interview
              </h3>
              <p className="text-xs text-slate-500">
                Update your support profile
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] px-4 py-2 rounded-2xl ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white rounded-br-md'
                    : 'bg-slate-100 text-slate-900 rounded-bl-md'
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-slate-100 text-slate-500 px-4 py-2 rounded-2xl rounded-bl-md">
                <Loader2 className="w-4 h-4 animate-spin" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Generated Profile Preview */}
        {generatedProfile && (
          <div className="mx-4 mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-green-600" />
              <span className="font-medium text-green-800">
                Profile Generated
              </span>
            </div>
            <p className="text-sm text-green-700 mb-3">
              <strong>{generatedProfile.support_type}</strong>:{' '}
              {generatedProfile.description}
            </p>
            <button
              onClick={() => onComplete(generatedProfile)}
              className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
            >
              Use This Profile
            </button>
          </div>
        )}

        {/* Input */}
        {!generatedProfile && (
          <div className="p-4 border-t border-slate-200">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your response..."
                disabled={isLoading}
                className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-50"
              />
              <button
                onClick={sendMessage}
                disabled={isLoading || !input.trim()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Send
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
