import { useState, useCallback, useEffect, useRef } from 'react';
import type { ProfileRecord } from '@/@types/api';
import type { PagesConfig } from '@/@types/dashboard';
import type { HaUser } from '@/@types/ha';
import type { DashboardExport, SnapshotContextSetters } from '@/@types/snapshot';
import {
  fetchProfiles as apiFetchProfiles,
  createProfile as apiCreateProfile,
  updateProfile as apiUpdateProfile,
  deleteProfile as apiDeleteProfile,
} from '@/api/profileApi';
import { useSettingsSync } from '@/hooks/useSettingsSync';
import { collectSnapshot, applySnapshot, isValidSnapshot } from '@/api/snapshot';
import { errorMessage, isObject, type UnknownRecord } from '@/validators/guards';
import { unwrapImportedSnapshot } from '@/validators/snapshot';

function cloneJson<T>(value: T | null | undefined, fallback: T): T {
  try {
    return globalThis.structuredClone(value ?? fallback);
  } catch {
    return globalThis.structuredClone(fallback);
  }
}

const DEFAULT_PAGES: PagesConfig = { header: [], pages: ['home'], home: [] };

/** Configurazione delle pagine come oggetto modificabile (liste di id e altri campi). */
type PagesConfigDraft = Record<string, unknown>;

const listAt = (config: PagesConfigDraft, key: string): unknown[] | null => {
  const value = config[key];
  return Array.isArray(value) ? value : null;
};

function normalizePagesConfig(
  candidate: unknown,
  fallback: unknown
): { pagesConfig: PagesConfigDraft; notes: string[] } {
  const notes: string[] = [];
  const fallbackConfig: PagesConfigDraft = cloneJson<PagesConfigDraft>(
    isObject(fallback) ? fallback : null,
    { ...DEFAULT_PAGES }
  );

  if (!isObject(candidate)) {
    notes.push('Profile page layout was missing, so current pages were kept.');
    return { pagesConfig: fallbackConfig, notes };
  }

  const next: PagesConfigDraft = cloneJson<PagesConfigDraft>(candidate, fallbackConfig);
  if (!Array.isArray(next.header)) {
    const fallbackHeader = listAt(fallbackConfig, 'header');
    next.header = fallbackHeader ? [...fallbackHeader] : [];
  }

  const detectedPages = Object.keys(next).filter(
    (key) => Array.isArray(next[key]) && !['header', 'settings', 'automations'].includes(key)
  );

  const fallbackPages = listAt(fallbackConfig, 'pages');
  let pages: unknown[];
  const nextPages = listAt(next, 'pages');
  if (!nextPages || nextPages.length === 0) {
    const restoredPages = fallbackPages && fallbackPages.length > 0 ? [...fallbackPages] : ['home'];
    pages = detectedPages.length > 0 ? detectedPages : restoredPages;
    notes.push('Profile page list was rebuilt.');
  } else {
    pages = nextPages;
  }

  pages = pages.filter((id) => typeof id !== 'string' || !['settings', 'automations'].includes(id));

  if (!pages.includes('home')) {
    pages = ['home', ...pages];
  }

  if (pages.length === 1 && pages[0] === 'home') {
    const extraDetected = detectedPages.filter((id) => id !== 'home');
    if (extraDetected.length > 0) {
      pages = ['home', ...extraDetected];
      notes.push('Recovered additional pages from profile data.');
    }
  }

  if (pages.length === 0) {
    pages = fallbackPages && fallbackPages.length > 0 ? [...fallbackPages] : ['home'];
    notes.push('No valid pages were found; previous pages were restored.');
  }

  next.pages = pages;
  pages.forEach((pageId) => {
    const key = String(pageId);
    if (!Array.isArray(next[key])) {
      const fallbackList = listAt(fallbackConfig, key);
      next[key] = fallbackList ? [...fallbackList] : [];
    }
  });

  return { pagesConfig: next, notes };
}

/** Istantanea pronta da applicare: copia profonda con il layout delle pagine normalizzato. */
function prepareSnapshotForApply(
  data: UnknownRecord,
  currentPagesConfig: unknown
): { snapshot: UnknownRecord; notes: string[] } {
  const layout: UnknownRecord = {
    ...cloneJson<UnknownRecord>(isObject(data.layout) ? data.layout : null, {}),
  };
  const snapshot: UnknownRecord = {
    ...cloneJson<UnknownRecord>(data, {}),
    layout,
  };

  const { pagesConfig, notes } = normalizePagesConfig(layout.pagesConfig, currentPagesConfig);
  layout.pagesConfig = pagesConfig;
  return { snapshot, notes };
}

export interface UseProfilesOptions {
  haUser: HaUser | null | undefined;
  contextSetters: SnapshotContextSetters;
  prefetchProfiles?: boolean;
}

/**
 * Hook for managing server-side profiles and templates.
 *
 * @param options.haUser - HA user from HomeAssistantContext
 * @param options.contextSetters - combined setters from PageContext + ConfigContext
 * @param options.prefetchProfiles - fetch profiles immediately
 */
export function useProfiles({
  haUser,
  contextSetters,
  prefetchProfiles = true,
}: UseProfilesOptions) {
  const [profiles, setProfiles] = useState<ProfileRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadSummary, setLoadSummary] = useState<string | null>(null);
  const [backendAvailable, setBackendAvailable] = useState(true);
  const contextSettersRef = useRef(contextSetters);
  contextSettersRef.current = contextSetters;
  const autoSync = useSettingsSync({
    haUserId: haUser?.id,
    contextSettersRef,
    autoBootstrap: prefetchProfiles,
  });

  // ── Load profiles when haUser changes ──
  const refreshProfiles = useCallback(async () => {
    if (!haUser?.id) return;
    try {
      const data = await apiFetchProfiles(haUser.id);
      setProfiles(data);
      setBackendAvailable(true);
    } catch (err) {
      console.warn('Failed to fetch profiles:', err);
      setBackendAvailable(false);
    }
  }, [haUser?.id]);

  useEffect(() => {
    if (!prefetchProfiles) return;
    refreshProfiles();
  }, [refreshProfiles, prefetchProfiles]);

  // ── Save current dashboard as a new profile ──
  const saveProfile = useCallback(
    async (name: string, deviceLabel = '') => {
      if (!haUser?.id) throw new Error('No HA user');
      setLoading(true);
      setError(null);
      try {
        const snapshot = collectSnapshot();
        if (!isValidSnapshot(snapshot)) {
          throw new Error('Invalid snapshot data');
        }
        const profile = await apiCreateProfile({
          ha_user_id: haUser.id,
          name,
          device_label: deviceLabel || null,
          data: snapshot,
        });
        setProfiles((prev) => [profile, ...prev]);
        return profile;
      } catch (err) {
        setError(errorMessage(err) ?? null);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [haUser?.id]
  );

  // ── Overwrite an existing profile with current dashboard ──
  const overwriteProfile = useCallback(
    async (profileId: string, name: string) => {
      if (!haUser?.id) throw new Error('No HA user');
      setLoading(true);
      setError(null);
      try {
        const snapshot = collectSnapshot();
        if (!isValidSnapshot(snapshot)) {
          throw new Error('Invalid snapshot data');
        }
        const updated = await apiUpdateProfile(profileId, {
          ha_user_id: haUser.id,
          name,
          data: snapshot,
        });
        setProfiles((prev) => prev.map((p) => (p.id === profileId ? updated : p)));
        return updated;
      } catch (err) {
        setError(errorMessage(err) ?? null);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [haUser?.id]
  );

  // ── Load a profile onto this device ──
  const loadProfile = useCallback((profile: ProfileRecord | null | undefined) => {
    setError(null);
    setLoadSummary(null);

    const profileData = profile?.data;
    if (!profileData || !isObject(profileData)) {
      setError('Profile data is missing or invalid.');
      return;
    }

    const currentSnapshot = collectSnapshot();
    const currentPagesConfig = currentSnapshot?.layout?.pagesConfig;
    const { snapshot, notes } = prepareSnapshotForApply(profileData, currentPagesConfig);

    applySnapshot(snapshot, contextSettersRef.current);

    if (notes.length > 0) {
      setLoadSummary(notes.join(' '));
    }
  }, []);

  const importDashboard = useCallback((snapshotCandidate: unknown) => {
    setError(null);
    setLoadSummary(null);

    const payload = unwrapImportedSnapshot(snapshotCandidate);
    if (!payload || !isValidSnapshot(payload)) {
      const importError = new Error('Invalid snapshot data');
      setError(importError.message);
      throw importError;
    }

    const currentSnapshot = collectSnapshot();
    const currentPagesConfig = currentSnapshot?.layout?.pagesConfig;
    const { snapshot, notes } = prepareSnapshotForApply(payload, currentPagesConfig);

    applySnapshot(snapshot, contextSettersRef.current);

    if (notes.length > 0) {
      setLoadSummary(notes.join(' '));
    }
  }, []);

  const exportDashboard = useCallback((): DashboardExport => {
    setError(null);
    const snapshot = collectSnapshot();
    if (!isValidSnapshot(snapshot)) {
      const exportError = new Error('Invalid snapshot data');
      setError(exportError.message);
      throw exportError;
    }

    return {
      format: 'tunet-dashboard-export',
      version: 1,
      exported_at: new Date().toISOString(),
      data: snapshot,
    };
  }, []);

  // ── Edit profile name/label (no data change) ──
  const editProfile = useCallback(
    async (profileId: string, name: string, deviceLabel?: string | null) => {
      if (!haUser?.id) throw new Error('No HA user');
      setLoading(true);
      setError(null);
      try {
        const updated = await apiUpdateProfile(profileId, {
          ha_user_id: haUser.id,
          name,
          device_label: deviceLabel || null,
        });
        setProfiles((prev) => prev.map((p) => (p.id === profileId ? updated : p)));
        return updated;
      } catch (err) {
        setError(errorMessage(err) ?? null);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [haUser?.id]
  );

  // ── Delete a profile ──
  const removeProfile = useCallback(
    async (profileId: string) => {
      if (!haUser?.id) throw new Error('No HA user');
      setLoading(true);
      setError(null);
      try {
        await apiDeleteProfile(profileId, haUser.id);
        setProfiles((prev) => prev.filter((p) => p.id !== profileId));
      } catch (err) {
        setError(errorMessage(err) ?? null);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [haUser?.id]
  );

  // ── Start blank (reset dashboard layout) ──
  const startBlank = useCallback(() => {
    const current = collectSnapshot();
    const blank = {
      version: 1,
      layout: {
        pagesConfig: { header: [], pages: ['home'], home: [] },
        cardSettings: {},
        hiddenCards: [],
        customNames: {},
        customIcons: {},
        pageSettings: {},
        gridColumns: 4,
        gridGapH: 20,
        gridGapV: 20,
        cardBorderRadius: 16,
        headerSettings: { showTitle: true, showClock: true, showDate: true },
        headerTitle: '',
        headerScale: 1,
        sectionSpacing: { headerToStatus: 16, statusToNav: 24, navToGrid: 24 },
        statusPillsConfig: [],
      },
      appearance: current.appearance,
    };
    applySnapshot(blank, contextSettersRef.current);
  }, []);

  return {
    profiles,
    loading,
    error,
    loadSummary,
    backendAvailable,
    saveProfile,
    overwriteProfile,
    editProfile,
    loadProfile,
    importDashboard,
    exportDashboard,
    removeProfile,
    startBlank,
    refreshProfiles,
    isValidSnapshot,
    autoSync,
  };
}
