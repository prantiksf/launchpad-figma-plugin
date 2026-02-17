/**
 * API Client for Starter Kit Backend
 * 
 * This module provides functions to communicate with the centralized backend
 * instead of using figma.clientStorage (which is local-only).
 * 
 * IMPORTANT: Set the API_BASE_URL to your Heroku deployment URL
 */

// Heroku backend URL
const API_BASE_URL = process.env.STARTER_KIT_API_URL || 'https://starterkit-da8649ad6366.herokuapp.com';
const API_KEY = process.env.STARTER_KIT_API_KEY || '';

// Helper for making API requests
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(options.headers as Record<string, string>) };
  if (API_KEY) headers['X-API-Key'] = API_KEY;
  const response = await fetch(url, {
    headers,
    ...options,
  });
  
  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }
  
  return response.json();
}

// ============================================================================
// SHARED DATA (Team-wide)
// ============================================================================

// ---------- Templates ----------
export async function loadTemplates(): Promise<any[]> {
  return apiRequest<any[]>('/api/templates');
}

export async function saveTemplates(templates: any[]): Promise<void> {
  await apiRequest('/api/templates', {
    method: 'POST',
    body: JSON.stringify({ templates }),
  });
}

// ---------- Templates Last Refreshed ----------
export async function getTemplatesLastRefreshed(): Promise<number | null> {
  const result = await apiRequest<{ lastRefreshed: number | null }>('/api/templates-last-refreshed');
  return result.lastRefreshed;
}

export async function setTemplatesLastRefreshed(timestamp: number): Promise<void> {
  await apiRequest('/api/templates-last-refreshed', {
    method: 'POST',
    body: JSON.stringify({ lastRefreshed: timestamp }),
  });
}

// ---------- Saved Items ----------
export async function loadSavedItems(): Promise<any[]> {
  return apiRequest<any[]>('/api/saved-items');
}

export async function saveSavedItems(savedItems: any[]): Promise<void> {
  await apiRequest('/api/saved-items', {
    method: 'POST',
    body: JSON.stringify({ savedItems }),
  });
}

// ---------- Figma Links ----------
export async function loadFigmaLinks(): Promise<any[]> {
  return apiRequest<any[]>('/api/figma-links');
}

export async function saveFigmaLinks(links: any[]): Promise<void> {
  await apiRequest('/api/figma-links', {
    method: 'POST',
    body: JSON.stringify({ links }),
  });
}

// ---------- Cloud Figma Links ----------
export async function loadCloudFigmaLinks(): Promise<Record<string, any>> {
  return apiRequest<Record<string, any>>('/api/cloud-figma-links');
}

export async function saveCloudFigmaLinks(links: Record<string, any>): Promise<void> {
  await apiRequest('/api/cloud-figma-links', {
    method: 'POST',
    body: JSON.stringify({ links }),
  });
}

// ---------- Custom Clouds ----------
export async function loadCustomClouds(): Promise<any[]> {
  return apiRequest<any[]>('/api/custom-clouds');
}

export async function saveCustomClouds(clouds: any[]): Promise<void> {
  await apiRequest('/api/custom-clouds', {
    method: 'POST',
    body: JSON.stringify({ clouds }),
  });
}

// ---------- Editable Clouds ----------
export async function loadEditableClouds(): Promise<any | null> {
  return apiRequest<any | null>('/api/editable-clouds');
}

export async function saveEditableClouds(clouds: any): Promise<void> {
  await apiRequest('/api/editable-clouds', {
    method: 'POST',
    body: JSON.stringify({ clouds }),
  });
}

// ---------- Cloud Categories ----------
export async function loadCloudCategories(): Promise<Record<string, any>> {
  return apiRequest<Record<string, any>>('/api/cloud-categories');
}

export async function saveCloudCategories(categories: Record<string, any>): Promise<void> {
  await apiRequest('/api/cloud-categories', {
    method: 'POST',
    body: JSON.stringify({ categories }),
  });
}

// ---------- Status Symbols ----------
export async function loadStatusSymbols(): Promise<any[]> {
  return apiRequest<any[]>('/api/status-symbols');
}

export async function saveStatusSymbols(symbols: any[]): Promise<void> {
  await apiRequest('/api/status-symbols', {
    method: 'POST',
    body: JSON.stringify({ symbols }),
  });
}

// ---------- Cloud POCs ----------
export async function loadCloudPocs(): Promise<Record<string, any>> {
  return apiRequest<Record<string, any>>('/api/cloud-pocs');
}

export async function saveCloudPocs(pocs: Record<string, any>): Promise<void> {
  await apiRequest('/api/cloud-pocs', {
    method: 'POST',
    body: JSON.stringify({ pocs }),
  });
}

// ============================================================================
// USER-SPECIFIC DATA (Per Figma User)
// ============================================================================

// ---------- Default Cloud ----------
export async function loadDefaultCloud(figmaUserId: string): Promise<string | null> {
  const result = await apiRequest<{ cloudId: string | null }>(
    `/api/user/${figmaUserId}/default-cloud`
  );
  return result.cloudId;
}

export async function saveDefaultCloud(figmaUserId: string, cloudId: string | null): Promise<void> {
  await apiRequest(`/api/user/${figmaUserId}/default-cloud`, {
    method: 'POST',
    body: JSON.stringify({ cloudId }),
  });
}

// ---------- Onboarding State ----------
export async function loadOnboardingState(figmaUserId: string): Promise<{
  hasCompleted: boolean;
  skipSplash: boolean;
}> {
  return apiRequest(`/api/user/${figmaUserId}/onboarding`);
}

export async function saveOnboardingState(
  figmaUserId: string,
  state: { hasCompleted?: boolean; skipSplash?: boolean }
): Promise<void> {
  await apiRequest(`/api/user/${figmaUserId}/onboarding`, {
    method: 'POST',
    body: JSON.stringify(state),
  });
}

// ---------- Hidden Clouds ----------
export async function loadHiddenClouds(figmaUserId: string): Promise<string[]> {
  const result = await apiRequest<{ hiddenClouds: string[] }>(
    `/api/user/${figmaUserId}/hidden-clouds`
  );
  return result.hiddenClouds;
}

export async function saveHiddenClouds(figmaUserId: string, hiddenClouds: string[]): Promise<void> {
  await apiRequest(`/api/user/${figmaUserId}/hidden-clouds`, {
    method: 'POST',
    body: JSON.stringify({ hiddenClouds }),
  });
}

// ============================================================================
// UTILITY
// ============================================================================

/**
 * Check if the API backend is available
 */
export async function checkApiHealth(): Promise<boolean> {
  try {
    const result = await apiRequest<{ status: string }>('/health');
    return result.status === 'ok';
  } catch {
    return false;
  }
}

/**
 * Get the current API base URL
 */
export function getApiBaseUrl(): string {
  return API_BASE_URL;
}

/**
 * Set a custom API base URL (for testing or switching environments)
 */
export function setApiBaseUrl(url: string): void {
  // This would need to be implemented differently for runtime changes
  console.warn('setApiBaseUrl is not implemented for runtime changes. Set STARTER_KIT_API_URL env var instead.');
}
