'use client';

import { useState, useRef, useEffect } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { MessageCircle, Edit, CheckCircle, Send } from 'lucide-react';
import { SupportProfileData, AIConfigData } from '@/lib/schemas/setup';
import type { SupportProfile } from '@easyping/types';

interface SupportProfileStepProps {
  form: UseFormReturn<SupportProfileData>;
  aiConfig: AIConfigData;
  onProfileGenerated?: (profile: SupportProfile) => void;
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
];

interface InterviewMessage {
  role: 'echo' | 'user';
  content: string;
}

export function SupportProfileStep({
  form,
  aiConfig,
  onProfileGenerated,
}: SupportProfileStepProps) {
  const {
    register,
    setValue,
    formState: { errors },
  } = form;

  const isAIConfigured = aiConfig.provider && aiConfig.provider !== 'skip';

  // Interview state
  const [mode, setMode] = useState<'interview' | 'manual' | 'review'>(
    isAIConfigured ? 'interview' : 'manual'
  );
  const [conversation, setConversation] = useState<InterviewMessage[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [interviewComplete, setInterviewComplete] = useState(false);
  const [generatedProfile, setGeneratedProfile] =
    useState<SupportProfile | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation]);

  // Start interview when component mounts (if AI configured)
  useEffect(() => {
    if (isAIConfigured && mode === 'interview' && conversation.length === 0) {
      startInterview();
    }
  }, [isAIConfigured, mode]);

  const startInterview = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/setup/interview/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aiConfig }),
      });

      const data = await response.json();
      if (data.opening) {
        setConversation([{ role: 'echo', content: data.opening }]);
      }
    } catch (error) {
      console.error('Failed to start interview:', error);
      // Fall back to manual mode on error
      setMode('manual');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!userInput.trim() || isLoading) return;

    const newMessage: InterviewMessage = {
      role: 'user',
      content: userInput.trim(),
    };
    const updatedConversation = [...conversation, newMessage];
    setConversation(updatedConversation);
    setUserInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/setup/interview/continue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation: updatedConversation,
          aiConfig,
        }),
      });

      const data = await response.json();

      if (data.complete && data.profile) {
        // Interview complete - show generated profile for review
        setGeneratedProfile(data.profile);
        setInterviewComplete(true);
        setMode('review');

        // Update form with generated profile
        setValue('support_type', data.profile.support_type);
        setValue('description', data.profile.description);
        setValue('typical_users', data.profile.typical_users || '');
        setValue('systems_supported', data.profile.systems_supported || []);
        setValue('common_issues', data.profile.common_issues || []);
        setValue('ai_generated', true);

        onProfileGenerated?.(data.profile);
      } else if (data.nextQuestion) {
        // Add Echo's response to conversation
        setConversation([
          ...updatedConversation,
          { role: 'echo', content: data.nextQuestion },
        ]);
      }
    } catch (error) {
      console.error('Failed to continue interview:', error);
      // Add error message
      setConversation([
        ...updatedConversation,
        {
          role: 'echo',
          content:
            "I'm having trouble understanding. Could you tell me more about what your support team handles?",
        },
      ]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleSwitchToManual = () => {
    setMode('manual');
  };

  const handleEditProfile = () => {
    setMode('manual');
  };

  // Manual form mode
  if (mode === 'manual') {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-white">Support Profile</h3>
          {isAIConfigured && conversation.length === 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setMode('interview')}
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              Interview with Echo
            </Button>
          )}
        </div>

        <div>
          <Label htmlFor="support_type" className="text-white">
            Support Type *
          </Label>
          <Input
            id="support_type"
            {...register('support_type')}
            placeholder="e.g., IT Support, Customer Service, Product Support..."
            className="mt-1"
            list="support-type-suggestions"
          />
          <datalist id="support-type-suggestions">
            {SUPPORT_TYPE_SUGGESTIONS.map((suggestion) => (
              <option key={suggestion} value={suggestion} />
            ))}
          </datalist>
          {errors.support_type && (
            <p className="text-sm text-red-500 mt-1">
              {errors.support_type.message}
            </p>
          )}
          <p className="text-xs text-gray-300 mt-1">
            What type of support does your team provide? Type your own or select
            a suggestion.
          </p>
        </div>

        <div>
          <Label htmlFor="description" className="text-white">
            Description *
          </Label>
          <Textarea
            id="description"
            {...register('description')}
            placeholder="Describe what your support team handles, common requests, and how you help users..."
            className="mt-1 min-h-[100px]"
          />
          {errors.description && (
            <p className="text-sm text-red-500 mt-1">
              {errors.description.message}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="typical_users" className="text-white">
            Typical Users
          </Label>
          <Input
            id="typical_users"
            {...register('typical_users')}
            placeholder="e.g., Company employees, customers, partners..."
            className="mt-1"
          />
          <p className="text-xs text-gray-300 mt-1">
            Who typically submits support requests?
          </p>
        </div>

        <input type="hidden" {...register('ai_generated')} value="false" />
      </div>
    );
  }

  // Review mode - show generated profile
  if (mode === 'review' && generatedProfile) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-400" />
            <h3 className="text-lg font-medium text-white">
              Profile Generated
            </h3>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleEditProfile}
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
        </div>

        <div className="bg-slate-700/50 rounded-lg p-4 space-y-3">
          <div>
            <span className="text-sm text-gray-400">Support Type:</span>
            <p className="text-white font-medium">
              {generatedProfile.support_type}
            </p>
          </div>

          <div>
            <span className="text-sm text-gray-400">Description:</span>
            <p className="text-white">{generatedProfile.description}</p>
          </div>

          {generatedProfile.typical_users && (
            <div>
              <span className="text-sm text-gray-400">Typical Users:</span>
              <p className="text-white">{generatedProfile.typical_users}</p>
            </div>
          )}

          {generatedProfile.systems_supported &&
            generatedProfile.systems_supported.length > 0 && (
              <div>
                <span className="text-sm text-gray-400">
                  Systems Supported:
                </span>
                <p className="text-white">
                  {generatedProfile.systems_supported.join(', ')}
                </p>
              </div>
            )}

          {generatedProfile.common_issues &&
            generatedProfile.common_issues.length > 0 && (
              <div>
                <span className="text-sm text-gray-400">Common Issues:</span>
                <p className="text-white">
                  {generatedProfile.common_issues.join(', ')}
                </p>
              </div>
            )}
        </div>

        <p className="text-sm text-gray-400">
          Click &quot;Edit&quot; to make changes, or &quot;Next&quot; to
          continue with this profile.
        </p>
      </div>
    );
  }

  // Interview mode - chat interface
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-medium text-white">
          Tell Echo About Your Team
        </h3>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleSwitchToManual}
          className="text-gray-400 hover:text-white text-xs"
        >
          Skip to manual form
        </Button>
      </div>

      {/* Chat messages - scrollable area */}
      <div className="bg-slate-700/30 rounded-lg border border-slate-600 overflow-hidden">
        <div className="max-h-[280px] overflow-y-auto p-4 space-y-3">
          {conversation.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white rounded-br-md'
                    : 'bg-slate-600 text-white rounded-bl-md'
                }`}
              >
                {message.role === 'echo' && (
                  <span className="text-xs text-orange-400 font-semibold block mb-1">
                    Echo
                  </span>
                )}
                <p className="text-sm leading-relaxed">{message.content}</p>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-slate-600 rounded-2xl rounded-bl-md px-4 py-3">
                <span className="text-xs text-orange-400 font-semibold block mb-1">
                  Echo
                </span>
                <div className="flex items-center gap-1">
                  <span
                    className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: '0ms' }}
                  ></span>
                  <span
                    className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: '150ms' }}
                  ></span>
                  <span
                    className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: '300ms' }}
                  ></span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input area - separate from chat */}
      <div className="flex gap-2">
        <Input
          ref={inputRef}
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your response..."
          disabled={isLoading || interviewComplete}
          className="flex-1 bg-slate-700 border-slate-600"
        />
        <Button
          type="button"
          onClick={handleSendMessage}
          disabled={!userInput.trim() || isLoading || interviewComplete}
          className="bg-blue-600 hover:bg-blue-700 px-4"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>

      <p className="text-xs text-gray-400 text-center">
        Echo will ask a few questions to understand your support needs and
        suggest relevant categories.
      </p>
    </div>
  );
}
