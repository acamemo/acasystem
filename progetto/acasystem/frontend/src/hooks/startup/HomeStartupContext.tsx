import {
  createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState,
  type ReactNode, type RefObject,
} from 'react';
import { Button, Spinner, StatusMessage } from '@/components/primitives';
import { useReducedMotion } from '@/hooks/launcher/useViewport';
import { afterAnimation } from '@/utils/launcher/motion';

export type StartupStage = 'access' | 'profile' | 'home';
export interface StartupSignal {
  status: 'pending' | 'ready' | 'recovery' | 'outside';
  scope?: string;
  generation?: string;
  message?: string;
  retry?: () => void;
}
type OwnedSignal = StartupSignal & { owner: object };
type Phase = 'inactive' | 'preparing' | 'entering' | 'ready';
interface Presentation {
  phase: Phase;
  cycle: number;
  loader: boolean;
  prolonged: boolean;
  error: string;
  retry: (() => void) | undefined;
}
interface StartupApi {
  assetFallbacks: RefObject<{ font: boolean; photo: boolean }>;
  canPresent: () => boolean;
  publish: (stage: StartupStage, owner: object, signal: StartupSignal | null) => void;
  entered: (cycle: number) => void;
  element: RefObject<HTMLDivElement | null>;
  restoreFocus: RefObject<HTMLElement | null>;
}
const ApiContext = createContext<StartupApi | null>(null);
const PresentationContext = createContext<Presentation | null>(null);
const ReadyContext = createContext(true);

export const useOptionalHomeStartup = () => useContext(ApiContext);
export const useHomeStartupReady = () => useContext(ReadyContext);

/** Presentation acknowledgements only: owners retain all data, permissions and cancellation. */
export function useHomeStartupSignal(stage: StartupStage, signal: StartupSignal | null) {
  const api = useOptionalHomeStartup();
  const owner = useRef({});
  const status = signal?.status, scope = signal?.scope, generation = signal?.generation;
  const message = signal?.message, retry = signal?.retry;
  useLayoutEffect(() => {
    api?.publish(stage, owner.current, status ? { status, scope, generation, message, retry } : null);
    return () => api?.publish(stage, owner.current, null);
  }, [api, stage, status, scope, generation, message, retry]);
}

export function HomeStartupProvider({ eligible, identityManaged = true, children }: {
  eligible: boolean; identityManaged?: boolean; children: ReactNode;
}) {
  const eligibleRef = useRef(eligible); eligibleRef.current = eligible;
  const canPresent = useCallback(() => eligibleRef.current, []);
  const [signals, setSignals] = useState<Partial<Record<StartupStage, OwnedSignal>>>({});
  const liveSignals = useRef(signals);
  const [phase, setPhase] = useState<Phase>('inactive');
  const [cycle, setCycle] = useState(0);
  const [loader, setLoader] = useState(false);
  const [prolonged, setProlonged] = useState(false);
  const completed = useRef(false);
  const assetFallbacks = useRef({ font: false, photo: false });
  useEffect(() => () => {
    document.documentElement.removeAttribute('data-aca-home-font-fallback');
    document.documentElement.removeAttribute('data-aca-home-photo-fallback');
  }, []);
  const acceptedScope = useRef('');
  const element = useRef<HTMLDivElement | null>(null);
  const restoreFocus = useRef<HTMLElement | null>(null);
  const latest = useRef({ phase, cycle });
  latest.current = { phase, cycle };
  const publish = useCallback<StartupApi['publish']>((stage, owner, signal) => {
    const current = liveSignals.current;
    const update = () => {
      if (!signal) {
        if (current[stage]?.owner !== owner) return current;
        const next = { ...current }; delete next[stage]; return next;
      }
      const previous = current[stage];
      if (previous?.owner === owner && previous.status === signal.status && previous.scope === signal.scope
        && previous.generation === signal.generation && previous.message === signal.message && previous.retry === signal.retry) return current;
      if (!completed.current && typeof performance?.mark === 'function') {
        performance.mark(`aca-home:${latest.current.cycle}:${stage}:${signal.status}`);
      }
      return { ...current, [stage]: { ...signal, owner } };
    };
    const next = update();
    if (next !== current) { liveSignals.current = next; setSignals(next); }
  }, []);
  const entered = useCallback((entryCycle: number) => {
    if (latest.current.cycle !== entryCycle || latest.current.phase !== 'entering') return;
    setPhase('ready'); completed.current = true;
  }, []);
  const api = useMemo(() => ({ assetFallbacks, canPresent, publish, entered, element, restoreFocus }), [canPresent, publish, entered]);
  const access = signals.access, profile = signals.profile, home = signals.home;
  const scope = profile?.scope ?? home?.scope ?? '';
  const outside = !eligible || (identityManaged && (access?.status === 'outside' || profile?.status === 'outside'
    || !access || (access.status === 'ready' && !profile)));
  const selected = identityManaged && access?.status !== 'ready' ? access
    : identityManaged && profile?.status !== 'ready' ? profile : home;
  const available = !outside && (!identityManaged || access?.status === 'ready' && profile?.status === 'ready'
    && Boolean(access.scope && profile.scope?.startsWith(`${access.scope}:`)) && home?.scope === profile.scope) && home?.status === 'ready';
  const recovery = selected?.status === 'recovery' ? selected : null;
  const waiting = !outside && !completed.current && phase !== 'entering' && !available;
  const previousEligible = useRef(eligible);
  const previousOwnerOutside = useRef(false);
  const previousProfileStatus = useRef(profile?.status);
  useLayoutEffect(() => {
    // Descendants publish in layout effects: use the current acknowledgements, not an older
    // render's availability when a route/retry and a pending signal commit together.
    const current = liveSignals.current;
    const currentOutside = !eligible || (identityManaged && (current.access?.status === 'outside'
      || current.profile?.status === 'outside' || !current.access || current.access.status === 'ready' && !current.profile));
    const currentAvailable = !currentOutside && (!identityManaged || current.access?.status === 'ready'
      && current.profile?.status === 'ready' && Boolean(current.access.scope && current.profile.scope?.startsWith(`${current.access.scope}:`))
      && current.home?.scope === current.profile.scope) && current.home?.status === 'ready';
    const currentScope = current.profile?.scope ?? current.home?.scope ?? '';
    const ownerOutside = identityManaged && (current.access?.status === 'outside' || current.profile?.status === 'outside');
    const enteredOutside = ownerOutside && !previousOwnerOutside.current;
    previousOwnerOutside.current = ownerOutside;
    if (enteredOutside) {
      completed.current = false;
      setCycle((value) => value + 1); setLoader(false); setProlonged(false); setPhase('inactive');
      return;
    }
    const preparingProfile = current.profile?.status === 'pending' && previousProfileStatus.current === 'ready';
    previousProfileStatus.current = current.profile?.status;
    if (preparingProfile && completed.current) {
      completed.current = false; setCycle((value) => value + 1);
      setPhase(currentOutside ? 'inactive' : 'preparing'); setLoader(false); setProlonged(false); return;
    }
    if (currentScope && acceptedScope.current && acceptedScope.current !== currentScope) {
      acceptedScope.current = currentScope; completed.current = false;
      setCycle((value) => value + 1); setPhase(currentOutside ? 'inactive' : 'preparing');
      setLoader(false); setProlonged(false); return;
    }
    if (currentScope) acceptedScope.current = currentScope;
    if (!eligible && previousEligible.current && !completed.current) {
      setCycle((value) => value + 1); setLoader(false); setProlonged(false);
    }
    previousEligible.current = eligible;
    if (completed.current) { if (phase !== 'ready') setPhase('ready'); return; }
    if (currentOutside) { if (phase !== 'inactive') setPhase('inactive'); return; }
    if (currentAvailable) { if (phase !== 'entering') setPhase('entering'); }
    else if (phase !== 'entering' && phase !== 'preparing') setPhase('preparing');
  }, [scope, eligible, outside, available, phase, profile?.status]);
  useEffect(() => {
    if (!waiting) return undefined;
    const show = setTimeout(() => setLoader(true), 150);
    const slow = setTimeout(() => setProlonged(true), 10_000);
    return () => { clearTimeout(show); clearTimeout(slow); };
  }, [waiting, cycle]);
  const retry = selected?.retry;
  const retryCurrent = useCallback(() => {
    if (!retry) return;
    setCycle((value) => value + 1); setLoader(false); setProlonged(false);
    retry();
  }, [retry]);
  const presentation = useMemo<Presentation>(() => ({ phase: outside ? 'inactive' : phase, cycle,
    loader: loader && !outside, prolonged: prolonged && waiting,
    error: recovery?.message ?? '', retry: retry ? retryCurrent : undefined,
  }), [phase, cycle, loader, outside, prolonged, waiting, recovery?.message, retry, retryCurrent]);
  const ready = phase === 'ready';
  useEffect(() => { performance?.mark?.(`aca-home:${cycle}:phase:${phase}`); }, [cycle, phase]);
  useEffect(() => {
    if (!ready) return;
    const previous = restoreFocus.current;
    restoreFocus.current = null;
    if (previous && !previous.isConnected && document.hasFocus()
      && (document.activeElement === document.body || document.activeElement === previous)) {
      element.current?.focus({ preventScroll: true });
    }
  }, [ready]);
  return <ApiContext.Provider value={api}><ReadyContext.Provider value={ready}>
    <PresentationContext.Provider value={presentation}>{children}<HomeStartupPresenter /></PresentationContext.Provider>
  </ReadyContext.Provider></ApiContext.Provider>;
}

function HomeStartupPresenter() {
  const view = useContext(PresentationContext)!;
  const api = useOptionalHomeStartup()!;
  const retryRef = useRef<HTMLButtonElement | null>(null);
  const [exitDone, setExitDone] = useState(false);
  const wasVisible = useRef(false);
  const visibleCycle = useRef(view.cycle);
  if (visibleCycle.current !== view.cycle || view.phase === 'inactive') {
    visibleCycle.current = view.cycle; wasVisible.current = false;
  }
  if (view.phase === 'preparing' && (view.loader || view.error || view.prolonged)) wasVisible.current = true;
  const leaving = view.phase === 'entering' && wasVisible.current && !exitDone;
  useLayoutEffect(() => {
    if (view.phase !== 'entering') { setExitDone(false); return undefined; }
    if (!wasVisible.current) return undefined;
    const timer = setTimeout(() => { setExitDone(true); wasVisible.current = false; }, 96);
    return () => clearTimeout(timer);
  }, [view.phase, view.cycle]);
  if (view.phase === 'inactive' || view.phase === 'ready' || view.phase === 'entering' && !leaving) return null;
  if (!view.loader && !view.error && !view.prolonged && !leaving) return null;
  return <div className="aca-home-loader" data-home-loader-state={leaving ? 'leaving' : undefined}
    inert={leaving || undefined} aria-hidden={leaving || undefined}>
    {view.error || view.prolonged ? <StatusMessage className="aca-home-loader__recovery"
      message={view.error || 'La preparazione sta richiedendo più tempo del dovuto'}>
      {view.retry && <Button ref={retryRef} variant="primary" onFocus={(event) => { api.restoreFocus.current = event.currentTarget; }}
        onBlur={(event) => { if (event.relatedTarget && event.relatedTarget !== document.body) api.restoreFocus.current = null; }}
        onClick={view.retry}>Riprova</Button>}
    </StatusMessage> : <><Spinner /><span className="sr-only" role="status">Preparazione di ACA…</span></>}
  </div>;
}

/** Keeps Home measurable; the unchanged child element does not rerender on loader timers. */
export function HomeStartupView({ children, measured, onElement }: {
  children: ReactNode; measured: boolean; onElement?: (element: HTMLElement | null) => void;
}) {
  const api = useOptionalHomeStartup();
  const view = useContext(PresentationContext);
  const reduced = useReducedMotion();
  const host = useRef<HTMLDivElement | null>(null);
  const attach = useCallback((node: HTMLDivElement | null) => {
    host.current = node;
    if (api) api.element.current = node;
    onElement?.(node);
  }, [api, onElement]);
  useEffect(() => {
    if (!api || view?.phase !== 'entering') return undefined;
    return afterAnimation(host.current, ['aca-home-in', 'aca-home-in-reduced'], reduced ? 120 : 280,
      () => api.entered(view.cycle));
  }, [api, view?.phase, view?.cycle, reduced]);
  if (!api || !view) return children;
  const interactive = view.phase === 'ready' && measured;
  const phase = view.phase === 'inactive' ? 'preparing' : view.phase;
  return <div ref={attach}
    className="aca-home-entry" data-home-phase={phase} tabIndex={-1} aria-label="Home"
    inert={!interactive || undefined} aria-hidden={!interactive || undefined} aria-busy={!interactive || undefined}>
    <div className="aca-home-entry__content">{children}</div>
  </div>;
}

interface Measurement { key: string; pageId: string | null; report: (key: string, ready: boolean) => void }
export const HomeMeasurementContext = createContext<Measurement | null>(null);
export const useHomeMeasurement = () => useContext(HomeMeasurementContext);
export const useHomeMeasurementKey = () => useHomeMeasurement()?.key;
