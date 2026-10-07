import { Wifi, Settings, Check, type LucideIcon } from 'lucide-react';
import type { Translate } from '@/@types/dashboard';

export interface OnboardingStep {
  key: 'connection' | 'preferences' | 'finish';
  label: string;
  icon: LucideIcon;
}

export const buildOnboardingSteps = (t: Translate): OnboardingStep[] => [
  { key: 'connection', label: t('onboarding.step.connection'), icon: Wifi },
  { key: 'preferences', label: t('onboarding.step.preferences'), icon: Settings },
  { key: 'finish', label: t('onboarding.step.finish'), icon: Check },
];

export const validateUrl = (url: unknown): boolean => {
  if (!url) return false;
  try {
    const parsed = new URL(String(url));
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};
