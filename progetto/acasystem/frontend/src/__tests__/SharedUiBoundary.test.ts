import { describe, expect, it } from 'vitest';
import * as previous from '../components/primitives';
import * as shared from '../../../ui/primitives';
import * as previousToast from '../hooks/context/ToastContext';
import * as sharedToast from '../../../ui/toast/ToastContext';
import { ToastHost as previousHost } from '../components/system/toast/ToastHost';
import { ToastHost as sharedHost } from '../../../ui/toast/ToastHost';
import * as previousVisibility from '../hooks/launcher/PageVisibilityContext';
import * as sharedVisibility from '../../../ui/navigation/PageVisibilityContext';
import * as previousStage from '../hooks/launcher/useStagedScene';
import * as sharedStage from '../../../ui/navigation/useStagedScene';
import { AppShell as previousShell } from '../templates/app-shell/AppShell';
import { AppShell as sharedShell } from '../../../ui/layout/AppShell';
import { Pager as previousPager } from '../templates/launcher/Pager';
import { Pager as sharedPager } from '../../../ui/navigation/Pager';
import { PageIndicator as previousIndicator } from '../components/system/page-indicator/PageIndicator';
import { PageIndicator as sharedIndicator } from '../../../ui/navigation/PageIndicator';
import { afterNextFrame as previousFrame } from '../utils/launcher/afterFrame';
import { afterNextFrame as sharedFrame } from '../../../ui/navigation/afterFrame';
import { afterTransition as previousTransition } from '../components/primitives/motion';
import { afterTransition as sharedTransition } from '../../../ui/primitives/motion';

describe('confine UI comune e percorsi compatibili', () => {
  it('mantiene identiche tutte le primitive, incluso il contatore dello scroll lock', () => {
    for (const key of Object.keys(shared) as (keyof typeof shared)[]) {
      expect(previous[key], key).toBe(shared[key]);
    }
  });

  it('condivide provider, contesti e sorgenti di stage anche con import storici', () => {
    expect(previousToast.ToastProvider).toBe(sharedToast.ToastProvider);
    expect(previousToast.useToast).toBe(sharedToast.useToast);
    expect(previousHost).toBe(sharedHost);
    for (const key of Object.keys(sharedVisibility) as (keyof typeof sharedVisibility)[]) {
      expect(previousVisibility[key], key).toBe(sharedVisibility[key]);
    }
    for (const key of Object.keys(sharedStage) as (keyof typeof sharedStage)[]) {
      expect(previousStage[key], key).toBe(sharedStage[key]);
    }
    const epoch = previousVisibility.pagerSizeEpoch();
    sharedVisibility.markPagerResized();
    expect(previousVisibility.pagerSizeEpoch()).toBe(epoch + 1);
  });

  it('mantiene gli stessi componenti di navigazione e coordinatori del movimento', () => {
    expect(previousShell).toBe(sharedShell);
    expect(previousPager).toBe(sharedPager);
    expect(previousIndicator).toBe(sharedIndicator);
    expect(previousFrame).toBe(sharedFrame);
    expect(previousTransition).toBe(sharedTransition);
  });
});
