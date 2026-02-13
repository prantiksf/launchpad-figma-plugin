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

import { useState, useEffect, useCallback } from 'react';

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

/**
 * Get list of backups for a data type
 */
export async function getBackups(dataKey: string, limit: number = 20): Promise<BackupInfo[]> {
  const result = await apiRequest<{ backups: BackupInfo[] }>(`/api/backups/${dataKey}?limit=${limit}`);
  return result.backups;
}

/**
 * Get a specific backup with its data
 */
export async function getBackupById(dataKey: string, backupId: number): Promise<BackupData> {
  return apiRequest<BackupData>(`/api/backups/${dataKey}/${backupId}`);
}

/**
 * Restore from a backup
 */
export async function restoreFromBackup(dataKey: string, backupId: number): Promise<{ success: boolean; itemCount: number }> {
  return apiRequest(`/api/backups/${dataKey}/${backupId}/restore`, { method: 'POST' });
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

// Helper for API requests
async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: { 'Content-Type': 'application/json', ...options.headers },
      ...options,
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API Error ${response.status} for ${endpoint}:`, errorText);
      throw new Error(`API Error: ${response.status} - ${errorText.substring(0, 100)}`);
    }
    
    return response.json();
  } catch (error) {
    console.error(`Failed to fetch ${API_BASE_URL}${endpoint}:`, error);
    throw error;
  }
}

// ============================================================================
// SHARED DATA HOOKS (Team-wide)
// ============================================================================

/**
 * Hook for templates (shared team-wide)
 */
export function useTemplates(figmaUserId?: string | null) {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false); // Track if initial data was loaded

  useEffect(() => {
    apiRequest<any[]>('/api/templates')
      .then(data => {
        setTemplates(data);
        setHasLoaded(true); // Mark as loaded after first successful fetch
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const save = useCallback(async (newTemplates: any[]) => {
    // CRITICAL: Prevent saving empty array before initial data loads
    // This protects against race conditions wiping the database
    if (!hasLoaded && newTemplates.length === 0) {
      console.warn('⚠️ Blocking save of empty templates - initial data not loaded yet');
      return;
    }
    
    // Additional safety: warn if trying to save empty when we had data
    if (newTemplates.length === 0) {
      console.warn('⚠️ Warning: Saving empty templates array to backend');
    }
    
    setTemplates(newTemplates);
    try {
      await apiRequest('/api/templates', {
        method: 'POST',
        body: JSON.stringify({ templates: newTemplates, userId: figmaUserId }),
      });
      console.log('✓ Templates saved to backend:', newTemplates.length);
    } catch (error) {
      console.error('✗ Failed to save templates:', error);
      throw error;
    }
  }, [hasLoaded, figmaUserId]);

  return { templates, setTemplates: save, loading };
}

/**
 * Hook for saved items (shared team-wide)
 */
export function useSavedItems() {
  const [savedItems, setSavedItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    apiRequest<any[]>('/api/saved-items')
      .then(data => {
        setSavedItems(data);
        setHasLoaded(true);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const save = useCallback(async (newItems: any[]) => {
    // Prevent saving empty array before initial data loads
    if (!hasLoaded && newItems.length === 0) {
      console.warn('⚠️ Blocking save of empty saved items - initial data not loaded yet');
      return;
    }
    setSavedItems(newItems);
    await apiRequest('/api/saved-items', {
      method: 'POST',
      body: JSON.stringify({ savedItems: newItems }),
    });
  }, [hasLoaded]);

  return { savedItems, setSavedItems: save, loading };
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
 */
export function useCustomClouds() {
  const [clouds, setClouds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiRequest<any[]>('/api/custom-clouds')
      .then(setClouds)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const save = useCallback(async (newClouds: any[]) => {
    setClouds(newClouds);
    await apiRequest('/api/custom-clouds', {
      method: 'POST',
      body: JSON.stringify({ clouds: newClouds }),
    });
  }, []);

  return { clouds, setClouds: save, loading };
}

/**
 * Hook for editable clouds config (shared team-wide)
 */
export function useEditableClouds() {
  const [editableClouds, setEditableClouds] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiRequest<any | null>('/api/editable-clouds')
      .then(setEditableClouds)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const save = useCallback(async (newClouds: any) => {
    setEditableClouds(newClouds);
    await apiRequest('/api/editable-clouds', {
      method: 'POST',
      body: JSON.stringify({ clouds: newClouds }),
    });
  }, []);

  return { editableClouds, setEditableClouds: save, loading };
}

/**
 * Hook for cloud categories (shared team-wide)
 */
export function useCloudCategories() {
  const [categories, setCategories] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiRequest<Record<string, any>>('/api/cloud-categories')
      .then(setCategories)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const save = useCallback(async (newCategories: Record<string, any>) => {
    setCategories(newCategories);
    await apiRequest('/api/cloud-categories', {
      method: 'POST',
      body: JSON.stringify({ categories: newCategories }),
    });
  }, []);

  return { categories, setCategories: save, loading };
}

/**
 * Hook for status symbols (shared team-wide)
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
      .catch(() => setSymbols(defaultSymbols)) // Fallback to defaults on error
      .finally(() => setLoading(false));
  }, []);

  const save = useCallback(async (newSymbols: any[]) => {
    setSymbols(newSymbols);
    await apiRequest('/api/status-symbols', {
      method: 'POST',
      body: JSON.stringify({ symbols: newSymbols }),
    });
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
    if (!figmaUserId) return;
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
    if (!figmaUserId) return;
    apiRequest<{ hasCompleted: boolean; skipSplash: boolean }>(`/api/user/${figmaUserId}/onboarding`)
      .then(setState)
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
    if (!figmaUserId) return;
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
  const savedItems = useSavedItems();
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
