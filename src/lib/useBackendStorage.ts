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

// Helper for API requests
async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!response.ok) throw new Error(`API Error: ${response.status}`);
  return response.json();
}

// ============================================================================
// SHARED DATA HOOKS (Team-wide)
// ============================================================================

/**
 * Hook for templates (shared team-wide)
 */
export function useTemplates() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiRequest<any[]>('/api/templates')
      .then(setTemplates)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const save = useCallback(async (newTemplates: any[]) => {
    setTemplates(newTemplates);
    await apiRequest('/api/templates', {
      method: 'POST',
      body: JSON.stringify({ templates: newTemplates }),
    });
  }, []);

  return { templates, setTemplates: save, loading };
}

/**
 * Hook for saved items (shared team-wide)
 */
export function useSavedItems() {
  const [savedItems, setSavedItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiRequest<any[]>('/api/saved-items')
      .then(setSavedItems)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const save = useCallback(async (newItems: any[]) => {
    setSavedItems(newItems);
    await apiRequest('/api/saved-items', {
      method: 'POST',
      body: JSON.stringify({ savedItems: newItems }),
    });
  }, []);

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
  const [symbols, setSymbols] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiRequest<any[]>('/api/status-symbols')
      .then(setSymbols)
      .catch(console.error)
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
