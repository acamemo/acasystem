import type { LucideIcon } from 'lucide-react';

export interface OnboardingStep {
  key: 'connection' | 'preferences' | 'finish';
  label: string;
  icon: LucideIcon;
}

export const validateUrl = (url: unknown): boolean => {
  if (!url) return false;
  try {
    const parsed = new URL(String(url));
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};
