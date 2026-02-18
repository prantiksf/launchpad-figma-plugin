/**
 * useBackendStorage Hook
 * 
 * Drop-in replacement for figma.clientStorage that uses the backend API.
 * This hook provides the same interface but stores data centrally.
 * 
 * SETUP:
 * 1. Deploy the backend to Heroku
 * 2. Set your Heroku URL below in API_BASE_URL
 * 3. Replace localStorage calls in App.tsx with this hook
 */

import { useState, useEffect, useCallback, useRef } from 'react';

// Heroku backend URL
const API_BASE_URL = 'https://starterkit-da8649ad6366.herokuapp.com';

// ============================================================================
// BACKUP & RESTORE API FUNCTIONS
// ============================================================================

export interface BackupInfo {
  id: number;
  itemCount: number;
  action: string;
  createdBy: string | null;
  createdAt: string;
}

export interface BackupData extends BackupInfo {
  dataKey: string;
  data: any;
}

export interface BackupKeyInfo {
  data_key: string;
  backup_count: string;
  latest_backup: string;
}

type BackupRequestOptions = { figmaUserId?: string | null };

/**
 * Get all backup keys (data types that have backups) with latest backup info
 */
export async function getBackupKeys(): Promise<BackupKeyInfo[]> {
  const result = await apiRequest<{ backupTypes: BackupKeyInfo[] }>('/api/backups');
  return result.backupTypes;
}

/**
 * Get list of backups for a data type
 */
export async function getBackups(dataKey: string, limit: number = 20, options: BackupRequestOptions = {}): Promise<BackupInfo[]> {
  const headers: Record<string, string> = {};
  if (options.figmaUserId) headers['X-Figma-User-Id'] = String(options.figmaUserId);
  const result = await apiRequest<{ backups: BackupInfo[] }>(`/api/backups/${dataKey}?limit=${limit}`, {
    headers,
  });
  return result.backups;
}

/**
 * Get a specific backup with its data
 */
export async function getBackupById(dataKey: string, backupId: number, options: BackupRequestOptions = {}): Promise<BackupData> {
  const headers: Record<string, string> = {};
  if (options.figmaUserId) headers['X-Figma-User-Id'] = String(options.figmaUserId);
  return apiRequest<BackupData>(`/api/backups/${dataKey}/${backupId}`, { headers });
}

/**
 * Restore from a backup
 * @param merge - If true, merge backup with current data (never erase). If false, full replace.
 */
export async function restoreFromBackup(
  dataKey: string,
  backupId: number,
  merge: boolean = false,
  options: BackupRequestOptions = {}
): Promise<{ success: boolean; itemCount: number }> {
  const headers: Record<string, string> = {};
  if (options.figmaUserId) headers['X-Figma-User-Id'] = String(options.figmaUserId);
  return apiRequest(`/api/backups/${dataKey}/${backupId}/restore?merge=${merge}`, { method: 'POST', headers });
}

/**
 * Create a manual backup
 */
export async function createManualBackup(dataKey: string, userId?: string): Promise<{ success: boolean; itemCount: number }> {
  return apiRequest(`/api/backups/${dataKey}/create`, { 
    method: 'POST',
    body: JSON.stringify({ userId })
  });
}

// ============================================================================
// ACTIVITY LOG API FUNCTIONS
// ============================================================================

export interface ActivityLogEntry {
  id: number;
  action: 'add' | 'update' | 'delete' | 'delete_forever' | 'restore' | 'page_structure' | 'section_create' | 'section_update' | 'section_delete' | 'poc_add' | 'poc_update' | 'poc_delete' | 'component_insert';
  assetId: string;
  assetName: string;
  assetData: any;
  cloudId: string | null;
  cloudName: string | null;
  category: string | null;
  userName: string | null;
  isRestored: boolean;
  createdAt: string;
}

export interface LogActivityParams {
  action: string;
  assetId: string;
  assetName: string;
  cloudId?: string | null;
  cloudName?: string | null;
  userName?: string | null;
  assetData?: any;
}

/**
 * Log activity from frontend (page structure, sections, POCs)
 */
export async function logActivityFromClient(params: LogActivityParams): Promise<void> {
  try {
    await apiRequest(`/api/activity-log`, {
      method: 'POST',
      body: JSON.stringify(params)
    });
  } catch (error) {
    console.error('Failed to log activity:', error);
  }
}

/**
 * Get activity log entries
 * @param limit - Max entries to return
 * @param cloudId - Optional cloud ID to filter by
 */
export async function getActivityLog(limit: number = 100, cloudId?: string | null): Promise<ActivityLogEntry[]> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (cloudId) params.set('cloudId', cloudId);
  const result = await apiRequest<{ activities: ActivityLogEntry[] }>(`/api/activity-log?${params}`);
  return result.activities;
}

/**
 * Restore selected items from activity log
 */
export async function restoreFromActivityLog(activityIds: number[], userName?: string): Promise<{ success: boolean; restoredCount: number; message: string }> {
  return apiRequest(`/api/activity-log/restore`, {
    method: 'POST',
    body: JSON.stringify({ activityIds, userName })
  });
}

/**
 * Get celebration stats (components added, reused, designers engaged)
 * @param cloudId - Optional cloud ID to filter stats by cloud
 */
export async function getActivityStats(cloudId?: string | null): Promise<{ componentsAdded: number; componentsReused: number; designersEngaged: number }> {
  const params = cloudId ? `?cloudId=${encodeURIComponent(cloudId)}` : '';
  return apiRequest(`/api/activity-log/stats${params}`);
}

/**
 * Get template add metadata - who added each template and when
 * Returns { [assetId]: { userName, createdAt } }
 */
export async function getTemplateAddMetadata(cloudId?: string | null): Promise<Record<string, { userName: string | null; createdAt: string }>> {
  const params = cloudId ? `?cloudId=${encodeURIComponent(cloudId)}` : '';
  return apiRequest(`/api/activity-log/template-metadata${params}`);
}

// ============================================================================
// ROBUST STORAGE: Retry + ClientStorage Fallback
// ============================================================================

const isInFigma = typeof window !== 'undefined' && window.parent !== window && typeof (window.parent as any).postMessage === 'function';

const API_KEY = typeof process !== 'undefined' && process.env && process.env.STARTER_KIT_API_KEY ? process.env.STARTER_KIT_API_KEY : '';

/** API request with retry (3 attempts, exponential backoff) */
async function apiRequestWithRetry<T>(endpoint: string, options: RequestInit = {}, attempt = 1): Promise<T> {
  const maxAttempts = 3;
  const delayMs = Math.min(1000 * Math.pow(2, attempt - 1), 8000);
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(options.headers as Record<string, string>) };
  if (API_KEY) headers['X-API-Key'] = API_KEY;
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers,
      ...options,
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error: ${response.status} - ${errorText.substring(0, 100)}`);
    }
    return response.json();
  } catch (error) {
    if (attempt < maxAttempts) {
      await new Promise(r => setTimeout(r, delayMs));
      return apiRequestWithRetry<T>(endpoint, options, attempt + 1);
    }
    throw error;
  }
}

const LAST_KNOWN_GOOD_KEY = 'starter-kit-last-known-good';
const LAST_KNOWN_GOOD_SAVED_ITEMS_PREFIX = 'starter-kit-last-known-good-saved-items:';

/** Save to Figma clientStorage (backup + fallback when API fails) */
function saveToClientStorage(type: string, data: any, isFallback = false): void {
  if (isInFigma) {
    try {
      const msg: any = type === 'custom-clouds' ? { type: 'SAVE_CUSTOM_CLOUDS', clouds: data } :
        type === 'cloud-categories' ? { type: 'SAVE_CLOUD_CATEGORIES', categories: data } :
        type === 'editable-clouds' ? { type: 'SAVE_EDITABLE_CLOUDS', clouds: data } :
        type === 'status-symbols' ? { type: 'SAVE_STATUS_SYMBOLS', symbols: data } :
        type === 'templates' ? { type: 'SAVE_TEMPLATES', templates: data } :
        type === 'saved-items' ? { type: 'SAVE_SAVED_TEMPLATES', savedItems: data } : null;
      if (msg) {
        (window.parent as any).postMessage({ pluginMessage: msg }, '*');
        if (isFallback) console.log(`✓ Saved to local storage (API unavailable): ${type}`);
      }
    } catch (e) {
      console.error('Failed to save to clientStorage:', e);
    }
  } else {
    try {
      if (type === 'templates' || type === 'saved-items') {
        localStorage.setItem(`starter-kit-${type}`, JSON.stringify(data || []));
      }
    } catch (e) {
      console.error('Failed to save to localStorage:', e);
    }
  }
}

/** Load from Figma clientStorage when API unavailable */
function loadFromClientStorage<T>(type: string): Promise<T> {
  if (!isInFigma && (type === 'templates' || type === 'saved-items')) {
    try {
      const raw = localStorage.getItem(`starter-kit-${type}`);
      const data = raw ? JSON.parse(raw) : [];
      return Promise.resolve(data as T);
    } catch {
      return Promise.resolve([] as T);
    }
  }
  if (!isInFigma) {
    return Promise.resolve((type === 'custom-clouds' ? [] : type === 'cloud-categories' ? {} : type === 'editable-clouds' ? null : []) as T);
  }
  return new Promise((resolve) => {
    const loadType = type === 'custom-clouds' ? 'LOAD_CUSTOM_CLOUDS' :
      type === 'cloud-categories' ? 'LOAD_CLOUD_CATEGORIES' :
      type === 'editable-clouds' ? 'LOAD_EDITABLE_CLOUDS' :
      type === 'status-symbols' ? 'LOAD_STATUS_SYMBOLS' :
      type === 'templates' ? 'LOAD_TEMPLATES' :
      type === 'saved-items' ? 'LOAD_SAVED_TEMPLATES' : '';
    const expectType = type === 'custom-clouds' ? 'CUSTOM_CLOUDS_LOADED' :
      type === 'cloud-categories' ? 'CLOUD_CATEGORIES_LOADED' :
      type === 'editable-clouds' ? 'EDITABLE_CLOUDS_LOADED' :
      type === 'status-symbols' ? 'STATUS_SYMBOLS_LOADED' :
      type === 'templates' ? 'TEMPLATES_LOADED' :
      type === 'saved-items' ? 'SAVED_TEMPLATES_LOADED' : '';
    const getData = (msg: any) => type === 'custom-clouds' ? (msg.clouds ?? []) :
      type === 'cloud-categories' ? (msg.categories ?? {}) :
      type === 'editable-clouds' ? (msg.clouds ?? null) :
      type === 'status-symbols' ? (msg.symbols ?? []) :
      type === 'templates' ? (msg.templates ?? []) :
      type === 'saved-items' ? (msg.savedItems ?? []) : [];
    const fallback = (type === 'custom-clouds' || type === 'templates' || type === 'saved-items' ? [] : type === 'cloud-categories' ? {} : type === 'editable-clouds' ? null : []) as T;
    if (!loadType || !expectType) {
      resolve(fallback);
      return;
    }
    const handler = (e: MessageEvent) => {
      const msg = e.data?.pluginMessage;
      if (msg?.type === expectType) {
        window.removeEventListener('message', handler);
        console.log(`✓ Loaded from local storage (fallback): ${type}`);
        resolve(getData(msg) as T);
      }
    };
    window.addEventListener('message', handler);
    (window.parent as any).postMessage({ pluginMessage: { type: loadType } }, '*');
    setTimeout(() => {
      window.removeEventListener('message', handler);
      resolve(fallback);
    }, 2000);
  });
}

/** Store lastKnownGood for detecting data loss when API returns empty */
function saveLastKnownGood(updates: { templatesCount?: number; savedItemsCount?: number }): void {
  try {
    if (typeof localStorage !== 'undefined') {
      const existing = loadLastKnownGood();
      const merged = {
        templatesCount: updates.templatesCount ?? existing?.templatesCount ?? 0,
        savedItemsCount: updates.savedItemsCount ?? existing?.savedItemsCount ?? 0,
        timestamp: Date.now()
      };
      localStorage.setItem(LAST_KNOWN_GOOD_KEY, JSON.stringify(merged));
    }
  } catch {}
}

/** Load lastKnownGood from storage */
function loadLastKnownGood(): { templatesCount: number; savedItemsCount: number } | null {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(LAST_KNOWN_GOOD_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return { templatesCount: parsed.templatesCount ?? 0, savedItemsCount: parsed.savedItemsCount ?? 0 };
      }
    }
  } catch {}
  return null;
}

function getSavedItemsLastKnownGoodKey(figmaUserId: string): string {
  return `${LAST_KNOWN_GOOD_SAVED_ITEMS_PREFIX}${figmaUserId}`;
}

function saveLastKnownGoodSavedItems(figmaUserId: string, count: number): void {
  try {
    if (typeof localStorage !== 'undefined' && figmaUserId) {
      const key = getSavedItemsLastKnownGoodKey(figmaUserId);
      localStorage.setItem(key, JSON.stringify({ savedItemsCount: count ?? 0, timestamp: Date.now() }));
    }
  } catch {}
}

function loadLastKnownGoodSavedItems(figmaUserId: string): { savedItemsCount: number } | null {
  try {
    if (typeof localStorage !== 'undefined' && figmaUserId) {
      const raw = localStorage.getItem(getSavedItemsLastKnownGoodKey(figmaUserId));
      if (raw) {
        const parsed = JSON.parse(raw);
        return { savedItemsCount: parsed.savedItemsCount ?? 0 };
      }
    }
  } catch {}
  return null;
}

// Alias for backwards compatibility
async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  return apiRequestWithRetry<T>(endpoint, options);
}

// ============================================================================
// SHARED DATA HOOKS (Team-wide)
// ============================================================================

function showToast(message: string, isError = false): void {
  try {
    if (typeof (window.parent as any).postMessage === 'function') {
      (window.parent as any).postMessage({
        pluginMessage: { type: 'SHOW_TOAST', message, options: { error: isError } }
      }, '*');
    }
  } catch {}
}

/**
 * Hook for templates (shared team-wide)
 * Robust: clientStorage fallback, optimistic save, background retry, lastKnownGood
 */
export function useTemplates(figmaUserName?: string | null) {
  const [templates, setTemplatesState] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [usingFallback, setUsingFallback] = useState(false);
  const lastKnownCount = useRef<number>(0);
  const retryRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const localDataRef = useRef<any[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await apiRequest<any[]>('/api/templates');
        if (cancelled) return;
        const safe = Array.isArray(data) ? data : [];
        const lastGood = loadLastKnownGood();
        if (safe.length === 0 && lastGood && lastGood.templatesCount > 0) {
          const cached = await loadFromClientStorage<any[]>('templates');
          if (Array.isArray(cached) && cached.length > 0) {
            setTemplatesState(cached);
            lastKnownCount.current = cached.length;
            localDataRef.current = cached;
            setHasLoaded(true);
            setUsingFallback(true);
            showToast('Server returned empty - using your saved data. Syncing when connection is back.');
            saveToClientStorage('templates', cached);
            saveLastKnownGood({ templatesCount: cached.length });
            try {
              await apiRequest('/api/templates', { method: 'POST', body: JSON.stringify({ templates: cached }) });
              setUsingFallback(false);
            } catch {}
            return;
          }
        }
        setTemplatesState(safe);
        lastKnownCount.current = safe.length;
        localDataRef.current = safe;
        setHasLoaded(true);
        saveToClientStorage('templates', data);
        saveLastKnownGood({ templatesCount: data.length });
      } catch {
        if (cancelled) return;
        const cached = await loadFromClientStorage<any[]>('templates');
        if (Array.isArray(cached) && cached.length > 0) {
          setTemplatesState(cached);
          lastKnownCount.current = cached.length;
          localDataRef.current = cached;
          setHasLoaded(true);
          setUsingFallback(true);
          showToast('Using cached data. Syncing when connection is back.');
        } else {
          setTemplatesState([]);
          localDataRef.current = [];
          setHasLoaded(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!usingFallback) return;
    const retry = async () => {
      try {
        const data = await apiRequest<any[]>('/api/templates');
        const safe = Array.isArray(data) ? data : [];
        if (safe.length === 0 && localDataRef.current.length > 0) {
          await apiRequest('/api/templates', {
            method: 'POST',
            body: JSON.stringify({ templates: localDataRef.current }),
          });
          const refetched = await apiRequest<any[]>('/api/templates');
          const refetchedSafe = Array.isArray(refetched) ? refetched : [];
          setTemplatesState(refetchedSafe);
          lastKnownCount.current = refetchedSafe.length;
          localDataRef.current = refetchedSafe;
          saveToClientStorage('templates', refetchedSafe);
          saveLastKnownGood({ templatesCount: refetchedSafe.length });
        } else {
          setTemplatesState(safe);
          lastKnownCount.current = safe.length;
          localDataRef.current = safe;
          saveToClientStorage('templates', data);
          saveLastKnownGood({ templatesCount: data.length });
        }
        setUsingFallback(false);
        if (retryRef.current) {
          clearInterval(retryRef.current);
          retryRef.current = null;
        }
        showToast('Synced with server');
      } catch {}
    };
    const id = setInterval(retry, 30000);
    retryRef.current = id;
    const onVisibility = () => { if (document.visibilityState === 'visible') retry(); };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      if (retryRef.current) clearInterval(retryRef.current);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [usingFallback]);

  const save = useCallback(async (newTemplates: any[] | ((prev: any[]) => any[])) => {
    // Support React-style updater: setTemplates(prev => next)
    if (typeof newTemplates === 'function') {
      setTemplatesState(prev => {
        const raw = newTemplates(prev);
        if (!Array.isArray(raw)) return prev;
        const next = raw.filter(t => t?.id && t?.name);
        if (next.length !== raw.length) {
          console.warn('🛑 BLOCKED: Updater produced invalid templates');
          return prev;
        }
        const currentCount = lastKnownCount.current;
        if (currentCount > 0 && next.length === 0) {
          console.warn('🛑 BLOCKED: Updater would clear all templates');
          return prev;
        }
        if (currentCount >= 3 && next.length < currentCount - 2) {
          console.warn('🛑 BLOCKED: Updater suspicious bulk delete');
          return prev;
        }
        lastKnownCount.current = next.length;
        localDataRef.current = next;
        saveToClientStorage('templates', next);
        saveLastKnownGood({ templatesCount: next.length });
        apiRequest('/api/templates', {
          method: 'POST',
          body: JSON.stringify({ templates: next, userName: figmaUserName }),
        }).catch(console.error);
        return next;
      });
      return;
    }
    if (!newTemplates || !Array.isArray(newTemplates)) {
      console.error('🛑 BLOCKED: Invalid templates data (not an array)');
      return;
    }
    if (!hasLoaded) {
      console.warn('⚠️ BLOCKED: Cannot save before initial data loaded');
      return;
    }
    const validTemplates = newTemplates.filter(t => t?.id && t?.name);
    if (validTemplates.length !== newTemplates.length) {
      console.error(`🛑 BLOCKED: ${newTemplates.length - validTemplates.length} templates missing id/name`);
      return;
    }
    const currentCount = lastKnownCount.current;
    const newCount = newTemplates.length;
    if (currentCount > 0 && newCount === 0) {
      console.error(`🛑 BLOCKED: Attempted to clear all ${currentCount} templates`);
      return;
    }
    if (currentCount >= 3 && newCount < currentCount - 2) {
      console.error(`🛑 BLOCKED: Suspicious bulk deletion (${currentCount} -> ${newCount})`);
      return;
    }
    setTemplatesState(newTemplates);
    lastKnownCount.current = newCount;
    if (usingFallback) localDataRef.current = newTemplates;
    saveToClientStorage('templates', newTemplates);
    try {
      await apiRequest('/api/templates', {
        method: 'POST',
        body: JSON.stringify({ templates: newTemplates, userName: figmaUserName }),
      });
      saveLastKnownGood({ templatesCount: newCount });
      console.log('✓ Templates saved to backend:', newTemplates.length);
    } catch (error: any) {
      console.error('✗ Failed to save templates:', error);
      if (error?.message?.includes('400')) {
        apiRequest<any[]>('/api/templates')
          .then(data => {
            const safe = Array.isArray(data) ? data : [];
            if (safe.length === 0 && lastKnownCount.current > 0) {
              const cached = localDataRef.current.length > 0 ? localDataRef.current : null;
              if (cached && cached.length > 0) {
                setTemplatesState(cached);
                lastKnownCount.current = cached.length;
                saveToClientStorage('templates', cached);
                showToast('Server rejected change - kept your data.');
                return;
              }
            }
            setTemplatesState(safe);
            lastKnownCount.current = safe.length;
            localDataRef.current = safe;
            saveToClientStorage('templates', safe);
          })
          .catch(console.error);
      }
    }
  }, [hasLoaded, figmaUserName, usingFallback]);

  const refetch = useCallback(async () => {
    try {
      const data = await apiRequest<any[]>('/api/templates');
      const safe = Array.isArray(data) ? data : [];
      if (safe.length === 0 && lastKnownCount.current > 0) {
        const cached = await loadFromClientStorage<any[]>('templates');
        if (Array.isArray(cached) && cached.length > 0) {
          setTemplatesState(cached);
          lastKnownCount.current = cached.length;
          localDataRef.current = cached;
          saveToClientStorage('templates', cached);
          showToast('Server returned empty - kept your data. Try again later.');
          return;
        }
      }
      setTemplatesState(safe);
      lastKnownCount.current = safe.length;
      localDataRef.current = safe;
      saveToClientStorage('templates', safe);
      saveLastKnownGood({ templatesCount: safe.length });
      setUsingFallback(false);
    } catch (e) {
      console.error('Failed to refetch templates:', e);
    }
  }, []);

  return { templates, setTemplates: save, loading, refetch, usingFallback };
}

/**
 * Hook for saved items (shared team-wide)
 * Robust: clientStorage fallback, optimistic save, background retry
 */
export function useSavedItems(figmaUserId?: string | null) {
  const [savedItems, setSavedItemsState] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [usingFallback, setUsingFallback] = useState(false);
  const retryRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const localDataRef = useRef<any[]>([]);
  const lastKnownCountRef = useRef(0);
  const migratedRef = useRef(false);
  const refetch = useCallback(async () => {
    try {
      if (!figmaUserId) {
        // No user ID - can't fetch from database
        setSavedItemsState([]);
        localDataRef.current = [];
        lastKnownCountRef.current = 0;
        setHasLoaded(true);
        return;
      }
      // Refetch from database - database is source of truth
      const data = await apiRequest<any[]>('/api/saved-items', {
        headers: { 'X-Figma-User-Id': String(figmaUserId) }
      });
      const safe = Array.isArray(data) ? data : [];
      setSavedItemsState(safe);
      localDataRef.current = safe;
      lastKnownCountRef.current = safe.length;
      setHasLoaded(true);
      saveToClientStorage('saved-items', safe);
      saveLastKnownGood({ savedItemsCount: safe.length });
    } catch (e) {
      console.error('Failed to refetch saved items from database:', e);
      // Don't restore from cache - database is source of truth
    }
  }, [figmaUserId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // If we don't have the user id yet, wait for it
        // Database requires user ID - don't load from cache
        if (!figmaUserId) {
          // Wait for user ID - don't load from cache (database is source of truth)
          setSavedItemsState([]);
          localDataRef.current = [];
          lastKnownCountRef.current = 0;
          setHasLoaded(true);
          return;
        }

        // DATABASE IS THE SOURCE OF TRUTH - No migration, no cache restoration
        // Every save/unsave writes to DB, every load reads from DB
        console.log(`🔄 Loading saved items from database for user ${figmaUserId}...`);
        try {
          const data = await apiRequest<any[]>('/api/saved-items', {
            headers: { 'X-Figma-User-Id': String(figmaUserId) }
          });
          if (cancelled) return;
          const safe = Array.isArray(data) ? data : [];
          console.log(`✅ Loaded ${safe.length} saved items from database for user ${figmaUserId}`);
          console.log(`✅ Loaded data:`, JSON.stringify(safe, null, 2));

          // Use whatever database returns - it's the truth
          // If database has items → user saved them
          // If database is empty → user unsaved them (or never saved)
          // NO migration, NO cache restoration - database is the only source
          setSavedItemsState(safe);
          localDataRef.current = safe;
          lastKnownCountRef.current = safe.length;
          setHasLoaded(true);
          saveToClientStorage('saved-items', safe); // Sync cache with database (for offline fallback only)
          saveLastKnownGood({ savedItemsCount: safe.length });
          setUsingFallback(false);
          
          // Log final state
          console.log(`✓ Final state: ${safe.length} items in state, ref has ${lastKnownCountRef.current}`);
        } catch (error) {
          if (cancelled) return;
          console.error('Failed to load saved items from database:', error);
          // Database unavailable (local testing or offline) - use local storage as fallback
          // But mark as fallback so we sync when database is back
          const cached = await loadFromClientStorage<any[]>('saved-items');
          const safeCached = Array.isArray(cached) ? cached : [];
          console.log(`Using local storage fallback: ${safeCached.length} items`);
          setSavedItemsState(safeCached);
          localDataRef.current = safeCached;
          lastKnownCountRef.current = safeCached.length;
          setHasLoaded(true);
          setUsingFallback(true);
          showToast('Using local storage - will sync with database when available.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [figmaUserId]);

  useEffect(() => {
    if (!usingFallback) return;
    if (!figmaUserId) return;
    const id = setInterval(async () => {
      try {
        // Retry loading from database - database is source of truth
        const data = await apiRequest<any[]>('/api/saved-items', {
          headers: { 'X-Figma-User-Id': String(figmaUserId) }
        });
        const safe = Array.isArray(data) ? data : [];
        // Use whatever database returns - it's the truth
        setSavedItemsState(safe);
        localDataRef.current = safe;
        lastKnownCountRef.current = safe.length;
        saveToClientStorage('saved-items', safe);
        saveLastKnownGood({ savedItemsCount: safe.length });
        setUsingFallback(false);
        if (retryRef.current) {
          clearInterval(retryRef.current);
          retryRef.current = null;
        }
        showToast('Synced with database');
      } catch (error) {
        console.error('Retry failed:', error);
        // Keep using fallback - don't restore from cache
      }
    }, 30000);
    retryRef.current = id;
    return () => {
      if (retryRef.current) clearInterval(retryRef.current);
    };
  }, [usingFallback, figmaUserId]);

  const save = useCallback(async (newItems: any[] | ((prev: any[]) => any[])) => {
    console.log(`💾 save() called: hasLoaded=${hasLoaded}, figmaUserId=${figmaUserId}, newItems type=${typeof newItems}`);
    
    if (!hasLoaded) {
      console.warn('⚠️ BLOCKED: Cannot save saved items before initial load');
      return;
    }

    const validateAndMaybePersist = async (next: any[], prev: any[]): Promise<any[]> => {
      console.log(`🔍 validateAndMaybePersist called: prev=${prev.length}, next=${next.length}`);
      
      if (!Array.isArray(next)) {
        console.error('🛑 BLOCKED: Invalid saved items data - not an array');
        return prev;
      }
      const validItems = next.filter(item => item && typeof item === 'object' && item.templateId);
      if (validItems.length !== next.length) {
        console.error(`🛑 BLOCKED: ${next.length - validItems.length} saved items missing templateId`);
        console.error(`Invalid items:`, next.filter(item => !item || typeof item !== 'object' || !item.templateId));
        return prev;
      }

      const currentCount = lastKnownCountRef.current;
      const newCount = next.length;
      console.log(`🔍 Validation: currentCount=${currentCount}, newCount=${newCount}`);
      
      // Allow 1->0 and 2->0 (user intentionally unsaving the last items),
      // but block large wipes that look accidental.
      if (currentCount >= 3 && newCount === 0) {
        console.error(`🛑 BLOCKED: Attempted to clear all ${currentCount} saved items`);
        return prev;
      }
      if (currentCount >= 3 && newCount < currentCount - 2) {
        console.error(`🛑 BLOCKED: Suspicious bulk deletion of saved items (${currentCount} -> ${newCount})`);
        return prev;
      }
      
      console.log(`✓ Validation passed, proceeding to save...`);

      // CRITICAL: Every save/unsave MUST write to database FIRST
      // Database is the source of truth - no exceptions
      if (!figmaUserId) {
        console.warn('⚠️ No user ID - saving locally only, will sync when user ID available');
        // No user ID - save locally only, will sync when user ID available
        lastKnownCountRef.current = newCount;
        if (usingFallback) localDataRef.current = next;
        saveToClientStorage('saved-items', next);
        saveLastKnownGood({ savedItemsCount: newCount });
        setSavedItemsState(next);
        return next;
      }

      // CRITICAL: Save to database FIRST - await to ensure it completes
      // Then verify by reading back - only update state with verified data
      console.log(`💾 Saving ${next.length} items to database for user ${figmaUserId}...`);
      console.log(`💾 Items being saved:`, JSON.stringify(next, null, 2));
      try {
        const response = await apiRequest('/api/saved-items', {
          method: 'POST',
          headers: { 'X-Figma-User-Id': String(figmaUserId) },
          body: JSON.stringify({ savedItems: next }),
        });
        console.log(`✅ Save API call succeeded`);
        
        // CRITICAL: Immediately verify by reading back from database
        // Use the verified data as the source of truth
        const verifyData = await apiRequest<any[]>('/api/saved-items', {
          headers: { 'X-Figma-User-Id': String(figmaUserId) }
        });
        const verified = Array.isArray(verifyData) ? verifyData : [];
        console.log(`✓ Verified: Database has ${verified.length} items after save`);
        console.log(`✓ Verified data:`, JSON.stringify(verified, null, 2));
        
        // Update state with VERIFIED data from database (not optimistic update)
        setSavedItemsState(verified);
        localDataRef.current = verified;
        lastKnownCountRef.current = verified.length;
        saveToClientStorage('saved-items', verified);
        saveLastKnownGood({ savedItemsCount: verified.length });
        setUsingFallback(false);
        
        return verified;
      } catch (error: any) {
        console.error('✗ Failed to save saved items to database:', error);
        // If save failed, reload from database to get current state
        // Don't trust local state - database is source of truth
        try {
          const dbData = await apiRequest<any[]>('/api/saved-items', {
            headers: { 'X-Figma-User-Id': String(figmaUserId) }
          });
          const safe = Array.isArray(dbData) ? dbData : [];
          console.log(`Reloaded from database after save error: ${safe.length} items`);
          setSavedItemsState(safe);
          localDataRef.current = safe;
          lastKnownCountRef.current = safe.length;
          saveToClientStorage('saved-items', safe);
          saveLastKnownGood({ savedItemsCount: safe.length });
          setUsingFallback(false);
          return safe;
        } catch (reloadError) {
          console.error('✗ Failed to reload from database:', reloadError);
          // Database unavailable - mark as fallback, keep local state
          setUsingFallback(true);
          return prev; // Return previous state if we can't verify
        }
      }
    };

    // NO OPTIMISTIC UPDATES - Wait for database save and verification
    // Support React-style updater: setSavedItems(prev => next)
    if (typeof newItems === 'function') {
      // Use functional update to get latest state
      setSavedItemsState(prev => {
        const next = newItems(prev);
        console.log(`🔄 Save requested: ${prev.length} -> ${next.length} items`);
        // Persist and update state with verified result
        // validateAndMaybePersist will update state after verification
        validateAndMaybePersist(next, prev).catch((error) => {
          console.error('❌ Error in validateAndMaybePersist:', error);
          // On error, revert to previous state
          setSavedItemsState(() => prev);
        });
        // Return previous state temporarily - will be updated by validateAndMaybePersist after DB verification
        return prev;
      });
      return;
    }

    // Direct array - wait for database save and verification
    // Use functional update to get latest savedItems value
    setSavedItemsState(currentSavedItems => {
      console.log(`🔄 Save requested: ${currentSavedItems.length} -> ${newItems.length} items`);
      validateAndMaybePersist(newItems, currentSavedItems).catch((error) => {
        console.error('❌ Error in validateAndMaybePersist:', error);
        // On error, keep current state
      });
      // Return current state temporarily - will be updated by validateAndMaybePersist
      return currentSavedItems;
    });
  }, [hasLoaded, usingFallback, figmaUserId]);

  return { savedItems, setSavedItems: save, loading, usingFallback, refetch };
}

/**
 * Hook for Figma links (shared team-wide)
 */
export function useFigmaLinks() {
  const [links, setLinks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiRequest<any[]>('/api/figma-links')
      .then(setLinks)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const save = useCallback(async (newLinks: any[]) => {
    setLinks(newLinks);
    await apiRequest('/api/figma-links', {
      method: 'POST',
      body: JSON.stringify({ links: newLinks }),
    });
  }, []);

  return { links, setLinks: save, loading };
}

/**
 * Hook for cloud-specific Figma links (shared team-wide)
 */
export function useCloudFigmaLinks() {
  const [cloudLinks, setCloudLinks] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiRequest<Record<string, any>>('/api/cloud-figma-links')
      .then(setCloudLinks)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const save = useCallback(async (newLinks: Record<string, any>) => {
    setCloudLinks(newLinks);
    await apiRequest('/api/cloud-figma-links', {
      method: 'POST',
      body: JSON.stringify({ links: newLinks }),
    });
  }, []);

  return { cloudLinks, setCloudLinks: save, loading };
}

/**
 * Hook for custom clouds (shared team-wide)
 * Robust: retries API, falls back to clientStorage when API fails
 */
export function useCustomClouds() {
  const [clouds, setClouds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiRequest<any[]>('/api/custom-clouds')
      .then(setClouds)
      .catch(async () => {
        const fallback = await loadFromClientStorage<any[]>('custom-clouds');
        setClouds(fallback ?? []);
      })
      .finally(() => setLoading(false));
  }, []);

  const save = useCallback(async (newClouds: any[]) => {
    setClouds(newClouds);
    try {
      await apiRequest('/api/custom-clouds', {
        method: 'POST',
        body: JSON.stringify({ clouds: newClouds }),
      });
      saveToClientStorage('custom-clouds', newClouds); // Always backup locally
    } catch (error) {
      console.error('API save failed, using local storage fallback:', error);
      saveToClientStorage('custom-clouds', newClouds, true);
    }
  }, []);

  return { clouds, setClouds: save, loading };
}

/**
 * Hook for editable clouds config (shared team-wide)
 * Robust: retries API, falls back to clientStorage when API fails
 */
export function useEditableClouds() {
  const [editableClouds, setEditableClouds] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiRequest<any | null>('/api/editable-clouds')
      .then(setEditableClouds)
      .catch(async () => {
        const fallback = await loadFromClientStorage<any | null>('editable-clouds');
        setEditableClouds(fallback ?? null);
      })
      .finally(() => setLoading(false));
  }, []);

  const save = useCallback(async (newClouds: any) => {
    setEditableClouds(newClouds);
    try {
      await apiRequest('/api/editable-clouds', {
        method: 'POST',
        body: JSON.stringify({ clouds: newClouds }),
      });
      saveToClientStorage('editable-clouds', newClouds); // Always backup locally
    } catch (error) {
      console.error('API save failed, using local storage fallback:', error);
      saveToClientStorage('editable-clouds', newClouds, true);
    }
  }, []);

  return { editableClouds, setEditableClouds: save, loading };
}

const DEFAULT_CATEGORIES = [
  { id: 'team-housekeeping', label: 'Team Housekeeping' },
  { id: 'all', label: 'All Assets' },
  { id: 'cover-pages', label: 'Covers' },
  { id: 'components', label: 'Components' },
  { id: 'slides', label: 'Slides' },
  { id: 'resources', label: 'Resources' },
];

const BUILT_IN_CLOUD_IDS = ['sales', 'service', 'marketing', 'commerce', 'revenue', 'fieldservice'];

/**
 * Hook for cloud categories (shared team-wide)
 * Robust: retries API, falls back to clientStorage when API fails
 * Seeds defaults when backend returns empty so Select Type and Settings always show categories
 */
export function useCloudCategories() {
  const [categories, setCategories] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiRequest<Record<string, any>>('/api/cloud-categories')
      .then((data) => {
        const isEmpty = !data || Object.keys(data).length === 0 ||
          !Object.values(data).some((arr: any) => Array.isArray(arr) && arr.length > 0);
        if (isEmpty) {
          const seeded: Record<string, any> = {};
          for (const cloudId of BUILT_IN_CLOUD_IDS) {
            seeded[cloudId] = [...DEFAULT_CATEGORIES];
          }
          setCategories(seeded);
          apiRequest('/api/cloud-categories', {
            method: 'POST',
            body: JSON.stringify({ categories: seeded }),
          }).catch(() => saveToClientStorage('cloud-categories', seeded, true));
        } else {
          setCategories(data || {});
        }
      })
      .catch(async () => {
        const fallback = await loadFromClientStorage<Record<string, any>>('cloud-categories');
        setCategories(fallback ?? {});
      })
      .finally(() => setLoading(false));
  }, []);

  const save = useCallback(async (newCategories: Record<string, any>) => {
    setCategories(newCategories);
    try {
      await apiRequest('/api/cloud-categories', {
        method: 'POST',
        body: JSON.stringify({ categories: newCategories }),
      });
      saveToClientStorage('cloud-categories', newCategories); // Always backup locally
    } catch (error) {
      console.error('API save failed, using local storage fallback:', error);
      saveToClientStorage('cloud-categories', newCategories, true);
    }
  }, []);

  return { categories, setCategories: save, loading };
}

/**
 * Hook for status symbols (shared team-wide)
 * Robust: retries API, falls back to clientStorage when API fails
 */
export function useStatusSymbols() {
  const defaultSymbols = [
    { id: 'ready', symbol: '🟢', label: 'Ready' },
    { id: 'progress', symbol: '🟡', label: 'In Progress' },
    { id: 'deprecated', symbol: '❌', label: 'Deprecated' },
  ];
  const [symbols, setSymbols] = useState<any[]>(defaultSymbols);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiRequest<any[]>('/api/status-symbols')
      .then(loaded => setSymbols(loaded.length > 0 ? loaded : defaultSymbols))
      .catch(async () => {
        const fallback = await loadFromClientStorage<any[]>('status-symbols');
        setSymbols(fallback?.length ? fallback : defaultSymbols);
      })
      .finally(() => setLoading(false));
  }, []);

  const save = useCallback(async (newSymbols: any[]) => {
    setSymbols(newSymbols);
    try {
      await apiRequest('/api/status-symbols', {
        method: 'POST',
        body: JSON.stringify({ symbols: newSymbols }),
      });
      saveToClientStorage('status-symbols', newSymbols); // Always backup locally
    } catch (error) {
      console.error('API save failed, using local storage fallback:', error);
      saveToClientStorage('status-symbols', newSymbols, true);
    }
  }, []);

  return { symbols, setSymbols: save, loading };
}

/**
 * Hook for cloud POCs (shared team-wide)
 */
export function useCloudPocs() {
  const [pocs, setPocs] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiRequest<Record<string, any>>('/api/cloud-pocs')
      .then(setPocs)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const save = useCallback(async (newPocs: Record<string, any>) => {
    setPocs(newPocs);
    await apiRequest('/api/cloud-pocs', {
      method: 'POST',
      body: JSON.stringify({ pocs: newPocs }),
    });
  }, []);

  return { pocs, setPocs: save, loading };
}

/**
 * Hook for housekeeping rules (shared team-wide)
 */
export function useHousekeepingRules() {
  const defaultRules = [
    { 
      id: 'frame-guidelines', 
      title: 'Frame & Resolution Guidelines',
      description: 'All designs are made at 16:9 aspect ratio and built with Auto Layout for our screens. Additionally, it is strongly recommended to build designs to 1600×900 or 1920×1080 resolutions, these are 16:9 aspect ratio resolutions.',
      hasComplianceCheck: true,
      links: []
    },
    { 
      id: 'page-structure', 
      title: 'Page Structure',
      description: 'Starting with a blank Figma file? Use page structures to get your team\'s way of maintaining Figma files supaaaa fast! Need to customize? Contact your team POCs to edit or add page structures.',
      hasComplianceCheck: false,
      links: [
        { label: 'Exploratory Work', action: 'scaffold' },
        { label: 'Release Work', action: 'scaffold' }
      ]
    },
    { 
      id: 'starter-kit-info', 
      title: 'What is part of Starter Kit and whats not',
      description: 'Starter Kit contains only defined, team-approved components to help you get started fast.',
      hasComplianceCheck: false,
      links: []
    }
  ];
  
  const [rules, setRules] = useState<any[]>(defaultRules);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiRequest<any[]>('/api/housekeeping-rules')
      .then(loaded => setRules(loaded.length > 0 ? loaded : defaultRules))
      .catch(() => setRules(defaultRules))
      .finally(() => setLoading(false));
  }, []);

  const save = useCallback(async (newRules: any[]) => {
    setRules(newRules);
    try {
      await apiRequest('/api/housekeeping-rules', {
        method: 'POST',
        body: JSON.stringify({ rules: newRules }),
      });
      console.log('✓ Housekeeping rules saved:', newRules.length);
    } catch (error) {
      console.error('✗ Failed to save housekeeping rules:', error);
    }
  }, []);

  return { rules, setRules: save, loading };
}

// ============================================================================
// USER-SPECIFIC DATA HOOKS (Per Figma User)
// ============================================================================

/**
 * Hook for user's default cloud preference
 * @param figmaUserId - The Figma user ID (get from plugin message)
 */
export function useDefaultCloud(figmaUserId: string | null) {
  const [defaultCloud, setDefaultCloud] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!figmaUserId) {
      setLoading(false);
      return;
    }
    apiRequest<{ cloudId: string | null }>(`/api/user/${figmaUserId}/default-cloud`)
      .then(res => setDefaultCloud(res.cloudId))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [figmaUserId]);

  const save = useCallback(async (cloudId: string | null) => {
    if (!figmaUserId) return;
    setDefaultCloud(cloudId);
    await apiRequest(`/api/user/${figmaUserId}/default-cloud`, {
      method: 'POST',
      body: JSON.stringify({ cloudId }),
    });
  }, [figmaUserId]);

  return { defaultCloud, setDefaultCloud: save, loading };
}

/**
 * Hook for user's onboarding state
 * @param figmaUserId - The Figma user ID
 */
export function useOnboardingState(figmaUserId: string | null) {
  const [state, setState] = useState({ hasCompleted: false, skipSplash: false });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!figmaUserId) {
      // Keep loading=true while waiting for user ID - prevents showing onboarding
      // before we can fetch real state (avoids flash of "Get Started" for returning users)
      const fallback = setTimeout(() => setLoading(false), 2500);
      return () => clearTimeout(fallback);
    }
    apiRequest<{ hasCompleted: boolean; skipSplash: boolean }>(`/api/user/${figmaUserId}/onboarding`)
      .then((apiState) => {
        setState((prev) => ({
          // Prefer true: don't overwrite migration-set hasCompleted with stale API false
          hasCompleted: prev.hasCompleted || apiState.hasCompleted,
          skipSplash: apiState.skipSplash ?? prev.skipSplash,
        }));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [figmaUserId]);

  const save = useCallback(async (newState: { hasCompleted?: boolean; skipSplash?: boolean }) => {
    if (!figmaUserId) return;
    setState(prev => ({ ...prev, ...newState }));
    await apiRequest(`/api/user/${figmaUserId}/onboarding`, {
      method: 'POST',
      body: JSON.stringify(newState),
    });
  }, [figmaUserId]);

  return { ...state, setOnboardingState: save, loading };
}

/**
 * Hook for user's hidden clouds
 * @param figmaUserId - The Figma user ID
 */
export function useHiddenClouds(figmaUserId: string | null) {
  const [hiddenClouds, setHiddenClouds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!figmaUserId) {
      setLoading(false);
      return;
    }
    apiRequest<{ hiddenClouds: string[] }>(`/api/user/${figmaUserId}/hidden-clouds`)
      .then(res => setHiddenClouds(res.hiddenClouds))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [figmaUserId]);

  const save = useCallback(async (newHiddenClouds: string[]) => {
    if (!figmaUserId) return;
    setHiddenClouds(newHiddenClouds);
    await apiRequest(`/api/user/${figmaUserId}/hidden-clouds`, {
      method: 'POST',
      body: JSON.stringify({ hiddenClouds: newHiddenClouds }),
    });
  }, [figmaUserId]);

  return { hiddenClouds, setHiddenClouds: save, loading };
}

// ============================================================================
// COMBINED HOOK (All data in one place)
// ============================================================================

/**
 * Combined hook that loads all backend data
 * This can be used as a drop-in replacement during migration
 */
export function useBackendData(figmaUserId: string | null) {
  const templates = useTemplates();
  const savedItems = useSavedItems(figmaUserId);
  const figmaLinks = useFigmaLinks();
  const cloudFigmaLinks = useCloudFigmaLinks();
  const customClouds = useCustomClouds();
  const editableClouds = useEditableClouds();
  const cloudCategories = useCloudCategories();
  const statusSymbols = useStatusSymbols();
  const cloudPocs = useCloudPocs();
  const defaultCloud = useDefaultCloud(figmaUserId);
  const onboarding = useOnboardingState(figmaUserId);
  const hiddenClouds = useHiddenClouds(figmaUserId);

  const loading = 
    templates.loading ||
    savedItems.loading ||
    figmaLinks.loading ||
    cloudFigmaLinks.loading ||
    customClouds.loading ||
    editableClouds.loading ||
    cloudCategories.loading ||
    statusSymbols.loading ||
    cloudPocs.loading ||
    defaultCloud.loading ||
    onboarding.loading ||
    hiddenClouds.loading;

  return {
    loading,
    // Shared data
    templates: templates.templates,
    setTemplates: templates.setTemplates,
    savedItems: savedItems.savedItems,
    setSavedItems: savedItems.setSavedItems,
    figmaLinks: figmaLinks.links,
    setFigmaLinks: figmaLinks.setLinks,
    cloudFigmaLinks: cloudFigmaLinks.cloudLinks,
    setCloudFigmaLinks: cloudFigmaLinks.setCloudLinks,
    customClouds: customClouds.clouds,
    setCustomClouds: customClouds.setClouds,
    editableClouds: editableClouds.editableClouds,
    setEditableClouds: editableClouds.setEditableClouds,
    cloudCategories: cloudCategories.categories,
    setCloudCategories: cloudCategories.setCategories,
    statusSymbols: statusSymbols.symbols,
    setStatusSymbols: statusSymbols.setSymbols,
    cloudPocs: cloudPocs.pocs,
    setCloudPocs: cloudPocs.setPocs,
    // User-specific data
    defaultCloud: defaultCloud.defaultCloud,
    setDefaultCloud: defaultCloud.setDefaultCloud,
    hasCompletedOnboarding: onboarding.hasCompleted,
    skipSplash: onboarding.skipSplash,
    setOnboardingState: onboarding.setOnboardingState,
    hiddenClouds: hiddenClouds.hiddenClouds,
    setHiddenClouds: hiddenClouds.setHiddenClouds,
  };
}
