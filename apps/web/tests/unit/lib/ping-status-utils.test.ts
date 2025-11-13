import { describe, it, expect } from 'vitest';
import {
  getStatusConfig,
  getStatusColor,
  getStatusLabel,
} from '@/lib/ping-status-utils';
import { PingStatus } from '@easyping/types';
import { Radio, Activity, Pause, CheckCircle2 } from 'lucide-react';

describe('ping-status-utils', () => {
  describe('getStatusConfig', () => {
    it('should return correct configuration for new status', () => {
      const config = getStatusConfig('new' as PingStatus);
      expect(config).toEqual({
        icon: Radio,
        label: 'New',
        color: 'text-purple-500',
        bgColor: 'bg-purple-500/10',
        borderColor: 'border-purple-500/30',
        ripple: true,
      });
    });

    it('should return correct configuration for in_progress status', () => {
      const config = getStatusConfig('in_progress' as PingStatus);
      expect(config).toEqual({
        icon: Activity,
        label: 'Active',
        color: 'text-blue-500',
        bgColor: 'bg-blue-500/10',
        borderColor: 'border-blue-500/30',
        pulse: true,
      });
    });

    it('should return correct configuration for waiting_on_user status', () => {
      const config = getStatusConfig('waiting_on_user' as PingStatus);
      expect(config).toEqual({
        icon: Pause,
        label: 'Waiting',
        color: 'text-orange-500',
        bgColor: 'bg-orange-500/10',
        borderColor: 'border-orange-500/30',
      });
    });

    it('should return correct configuration for resolved status', () => {
      const config = getStatusConfig('resolved' as PingStatus);
      expect(config).toEqual({
        icon: CheckCircle2,
        label: 'Resolved',
        color: 'text-emerald-500',
        bgColor: 'bg-emerald-500/10',
        borderColor: 'border-emerald-500/30',
      });
    });

    it('should return correct configuration for closed status', () => {
      const config = getStatusConfig('closed' as PingStatus);
      expect(config).toEqual({
        icon: CheckCircle2,
        label: 'Closed',
        color: 'text-slate-400',
        bgColor: 'bg-slate-100',
        borderColor: 'border-slate-300',
      });
    });
  });

  describe('getStatusColor', () => {
    it('should return correct color for new status', () => {
      expect(getStatusColor('new' as PingStatus)).toBe('bg-blue-500');
    });

    it('should return correct color for in_progress status', () => {
      expect(getStatusColor('in_progress' as PingStatus)).toBe('bg-yellow-500');
    });

    it('should return correct color for waiting_on_user status', () => {
      expect(getStatusColor('waiting_on_user' as PingStatus)).toBe(
        'bg-purple-500'
      );
    });

    it('should return correct color for resolved status', () => {
      expect(getStatusColor('resolved' as PingStatus)).toBe('bg-green-500');
    });

    it('should return correct color for closed status', () => {
      expect(getStatusColor('closed' as PingStatus)).toBe('bg-slate-500');
    });
  });

  describe('getStatusLabel', () => {
    it('should return correct label for new status', () => {
      expect(getStatusLabel('new' as PingStatus)).toBe('New');
    });

    it('should return correct label for in_progress status', () => {
      expect(getStatusLabel('in_progress' as PingStatus)).toBe('In Progress');
    });

    it('should return correct label for waiting_on_user status', () => {
      expect(getStatusLabel('waiting_on_user' as PingStatus)).toBe(
        'Waiting on User'
      );
    });

    it('should return correct label for resolved status', () => {
      expect(getStatusLabel('resolved' as PingStatus)).toBe('Resolved');
    });

    it('should return correct label for closed status', () => {
      expect(getStatusLabel('closed' as PingStatus)).toBe('Closed');
    });
  });
});
