'use client';

import { useState } from 'react';
import { User, Bell, Sparkles, FolderTree, Shield, Save } from 'lucide-react';

type TabType = 'profile' | 'notifications' | 'ai' | 'categories' | 'security';

interface TabConfig {
  id: TabType;
  label: string;
  icon: any;
}

const tabs: TabConfig[] = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'ai', label: 'AI Configuration', icon: Sparkles },
  { id: 'categories', label: 'Categories', icon: FolderTree },
  { id: 'security', label: 'Security', icon: Shield },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('profile');

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
              {tabs.map((tab) => {
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
              {activeTab === 'ai' && <AIConfigTab />}
              {activeTab === 'categories' && <CategoriesTab />}
              {activeTab === 'security' && <SecurityTab />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProfileTab() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">
          Profile Information
        </h2>
        <p className="text-sm text-slate-600">
          Update your personal information and avatar
        </p>
      </div>

      <div className="bg-white rounded-lg border-2 border-slate-200 p-6 shadow-lg space-y-6">
        {/* Avatar */}
        <div className="flex items-center gap-6">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-2xl">
            JD
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
              defaultValue="John Doe"
              className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Email
            </label>
            <input
              type="email"
              defaultValue="john.doe@company.com"
              className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Role
            </label>
            <input
              type="text"
              defaultValue="Support Agent"
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

        <div className="flex justify-end pt-4 border-t border-slate-200">
          <button className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg font-semibold hover:from-orange-600 hover:to-orange-700 transition-all shadow-lg shadow-orange-500/30 hover:shadow-xl hover:shadow-orange-500/40 transform hover:scale-105">
            <Save className="w-4 h-4" />
            Save Changes
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

function AIConfigTab() {
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
            <select className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent">
              <option>OpenAI (GPT-4)</option>
              <option>Anthropic (Claude 3.5 Sonnet)</option>
              <option>Azure OpenAI</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              API Key
            </label>
            <input
              type="password"
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
            <select className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent">
              <option>GPT-4 Turbo</option>
              <option>GPT-3.5 Turbo</option>
              <option>GPT-4o</option>
            </select>
          </div>

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
            <button className="ml-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors">
              Test
            </button>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-slate-200">
          <button className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg font-semibold hover:from-orange-600 hover:to-orange-700 transition-all shadow-lg shadow-orange-500/30 hover:shadow-xl hover:shadow-orange-500/40 transform hover:scale-105">
            <Save className="w-4 h-4" />
            Save Configuration
          </button>
        </div>
      </div>
    </div>
  );
}

function CategoriesTab() {
  const categories = [
    'Hardware',
    'Software',
    'Network',
    'Access',
    'Password Reset',
    'Other',
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">
          Ticket Categories
        </h2>
        <p className="text-sm text-slate-600">
          Manage categories for ticket organization
        </p>
      </div>

      <div className="bg-white rounded-lg border-2 border-slate-200 p-6 shadow-lg space-y-4">
        {categories.map((category, index) => (
          <div
            key={category}
            className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:border-orange-500 hover:shadow-md transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-xs">
                {index + 1}
              </div>
              <span className="font-medium text-slate-900">{category}</span>
            </div>
            <div className="flex items-center gap-2">
              <button className="px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded transition-colors">
                Edit
              </button>
              {category !== 'Other' && (
                <button className="px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded transition-colors">
                  Archive
                </button>
              )}
            </div>
          </div>
        ))}

        <button className="w-full py-3 border-2 border-dashed border-slate-300 rounded-lg text-slate-600 hover:border-orange-500 hover:text-orange-500 transition-colors font-medium">
          + Add New Category
        </button>
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
