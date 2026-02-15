import React, { useState, useEffect, useLayoutEffect, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';

// Import Design System Components
import { 
  Button, 
  Input, 
  Card,
  CardContent,
  CardFooter,
  Badge, 
  Spinner,
  EmptyState,
  RadioGroup,
} from './design-system/components';

// Import Onboarding component
import Onboarding from './components/Onboarding';

// Import backend storage hooks
import {
  useTemplates,
  useSavedItems,
  useFigmaLinks,
  useCloudFigmaLinks,
  useCustomClouds,
  useEditableClouds,
  useCloudCategories,
  useStatusSymbols,
  useCloudPocs,
  useDefaultCloud,
  useOnboardingState,
  useHiddenClouds,
  useHousekeepingRules,
  // Backup functions
  getBackups,
  getBackupKeys,
  getBackupById,
  restoreFromBackup,
  createManualBackup,
  BackupInfo,
  // Activity log functions
  getActivityLog,
  restoreFromActivityLog,
  logActivityFromClient,
  getActivityStats,
  getTemplateAddMetadata,
  ActivityLogEntry,
} from './lib/useBackendStorage';

// Import API functions for in-place refresh (reload breaks Figma plugin)
import { loadCustomClouds, loadEditableClouds } from './lib/api';

// Import cloud icons
import SalesCloudIcon from './assets/SalesCloud-icon.png';
import ServiceCloudIcon from './assets/ServiceCloud-icon.png';
import MarketingCloudIcon from './assets/MarketingCloud-icon.png';
import CommerceCloudIcon from './assets/CommerceCloud-icon.png';
import RevenueCloudIcon from './assets/RevenueCloud-icon.png';
import FieldServiceCloudIcon from './assets/FieldServiceCloud-icon.png';
import GoogleSlideIcon from './assets/googleslide-icon.svg';
import StarterKitIcon from './assets/Starter Kit _icon.png';
import StarterKitIllustration from './assets/starterkit_illustration.png';
import ActivityEmptyIllustration from './assets/Empty state.png';

// ============ CONSTANTS ============
const clouds = [
  { id: 'sales', name: 'Sales', icon: SalesCloudIcon },
  { id: 'service', name: 'Service', icon: ServiceCloudIcon },
  { id: 'marketing', name: 'Marketing', icon: MarketingCloudIcon },
  { id: 'commerce', name: 'Commerce', icon: CommerceCloudIcon },
  { id: 'revenue', name: 'Revenue', icon: RevenueCloudIcon },
  { id: 'fieldservice', name: 'Field Service', icon: FieldServiceCloudIcon },
];

const categories = [
  { id: 'team-housekeeping', label: 'Team Housekeeping' },
  { id: 'all', label: 'All Assets' },
  { id: 'cover-pages', label: 'Covers' },
  { id: 'components', label: 'Components' },
  { id: 'slides', label: 'Slides' },
  { id: 'resources', label: 'Resources' },
];

const categoryOptions = [
  { value: 'cover-pages', label: 'Cover Page' },
  { value: 'components', label: 'Component' },
  { value: 'slides', label: 'Slide' },
  { value: 'resources', label: 'Resource' },
];

const categoryLabels: Record<string, string> = {
  'cover-pages': 'Cover',
  'components': 'Component',
  'slides': 'Slide',
  'resources': 'Resource',
};

// Helper to format time as "2:30 PM"
function formatTime(date: Date): string {
  const h = date.getHours();
  const m = date.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, '0')} ${ampm}`;
}

// Helper to format date only (no time) - e.g. "Jan 15, 2025"
function formatDateOnly(date: Date): string {
  const d = date.getDate();
  const m = date.toLocaleString('en', { month: 'short' });
  const y = date.getFullYear();
  return `${m} ${d}, ${y}`;
}

// Helper function to format activity timestamp: Just Now, Today at time, Yesterday at time, dd/mm/yyyy at time
function formatActivityTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  
  // Just Now - within 5 minutes
  if (diffMins < 5) return 'Just Now';
  
  // Check if same day
  const isToday = date.toDateString() === now.toDateString();
  if (isToday) return `Today at ${formatTime(date)}`;
  
  // Check if yesterday
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return `Yesterday at ${formatTime(date)}`;
  
  // dd/mm/yyyy at time
  const d = date.getDate().toString().padStart(2, '0');
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const y = date.getFullYear();
  return `${d}/${m}/${y} at ${formatTime(date)}`;
}

// ============ TYPES ============
interface VariantInfo {
  name: string;
  displayName: string;
  key: string;
  preview: string | null;
}

interface Template {
  id: string;
  name: string;
  category: string;
  description: string;
  componentKey: string;
  size: { width: number; height: number };
  cloudId: string;
  preview?: string;
  isComponentSet?: boolean;
  variants?: VariantInfo[];
  variantCount?: number;
  googleSlideLink?: string;
}

interface ComponentInfo {
  name: string;
  key: string;
  id: string;
  width: number;
  height: number;
  preview?: string;
  isComponentSet?: boolean;
  variants?: VariantInfo[];
  variantCount?: number;
}

// ============ STORAGE ============
// Note: localStorage doesn't work in Figma plugins (data: URL restriction)
// We use Figma's clientStorage via message passing instead

// ============ MAIN COMPONENT ============
export function App() {
  // Figma user ID and name (from PLUGIN_READY message) - needed for user-specific data
  const [figmaUserId, setFigmaUserId] = useState<string | null>(null);
  const [figmaUserName, setFigmaUserName] = useState<string | null>(null);
  
  // Onboarding state
  const [showSplash, setShowSplash] = useState(true);
  const [showMoreCloudsInSplash, setShowMoreCloudsInSplash] = useState(false);
  // Safety: force show UI after 5s to prevent infinite loading (e.g. API down, PLUGIN_READY delayed)
  const [forceShowAfterTimeout, setForceShowAfterTimeout] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setForceShowAfterTimeout(true), 5000);
    return () => clearTimeout(t);
  }, []);
  
  // Backend data hooks (shared team-wide)
  const { templates, setTemplates, loading: templatesLoading, refetch: refetchTemplates } = useTemplates(figmaUserName);
  const { savedItems, setSavedItems, loading: savedItemsLoading } = useSavedItems();
  const { links: figmaLinks, setLinks: setFigmaLinks, loading: figmaLinksLoading } = useFigmaLinks();
  const { cloudLinks: cloudFigmaLinks, setCloudLinks: setCloudFigmaLinks, loading: cloudLinksLoading } = useCloudFigmaLinks();
  const { clouds: customClouds, setClouds: setCustomClouds, loading: customCloudsLoading } = useCustomClouds();
  const { editableClouds, setEditableClouds, loading: editableCloudsLoading } = useEditableClouds();
  const { categories: cloudCategories, setCategories: setCloudCategories, loading: categoriesLoading } = useCloudCategories();
  const cloudCategoriesRef = useRef(cloudCategories);
  cloudCategoriesRef.current = cloudCategories;
  const { symbols: statusSymbols, setSymbols: setStatusSymbols, loading: statusSymbolsLoading } = useStatusSymbols();
  const { pocs: cloudPOCs, setPocs: setCloudPOCs, loading: pocsLoading } = useCloudPocs();
  
  // User-specific hooks (per Figma user)
  const { defaultCloud, setDefaultCloud, loading: defaultCloudLoading } = useDefaultCloud(figmaUserId);
  const { hasCompleted: hasCompletedOnboarding, skipSplash: skipSplashOnLaunch, setOnboardingState, loading: onboardingLoading } = useOnboardingState(figmaUserId);
  const { hiddenClouds, setHiddenClouds, loading: hiddenCloudsLoading } = useHiddenClouds(figmaUserId);
  
  // Combined loading state
  const isLoading = templatesLoading || savedItemsLoading || figmaLinksLoading || cloudLinksLoading || 
                    customCloudsLoading || editableCloudsLoading || categoriesLoading || 
                    statusSymbolsLoading || pocsLoading || defaultCloudLoading || 
                    onboardingLoading || hiddenCloudsLoading;

  // Define early so message handlers and callbacks can use them (before any early returns)
  const editableArr = Array.isArray(editableClouds) ? editableClouds : clouds;
  const allClouds = [...editableArr, ...(customClouds ?? [])];
  const safeHiddenClouds = hiddenClouds ?? [];
  const safeCloudCategories = cloudCategories ?? {};
  // Core UI state
  const setIsLoading = (loading: boolean) => {
    // This is now handled by hooks, but keeping for compatibility
  };
  // Don't initialize with default - wait for defaultCloud to load to prevent flash
  const [selectedClouds, setSelectedClouds] = useState<string[]>([]);
  const [cloudSelectionReady, setCloudSelectionReady] = useState(false);
  const [activeCategory, setActiveCategory] = useState('team-housekeeping');
  const [insertingId, setInsertingId] = useState<string | null>(null);
  const [refreshingId, setRefreshingId] = useState<string | null>(null);
  const [isBackgroundSyncing, setIsBackgroundSyncing] = useState(false);
  const [expandedTemplate, setExpandedTemplate] = useState<string | null>(null);
  const [moveMenuOpen, setMoveMenuOpen] = useState<string | null>(null);
  const [createSectionForTemplate, setCreateSectionForTemplate] = useState<string | null>(null);
  const [newSectionName, setNewSectionName] = useState('');
  const [selectedVariants, setSelectedVariants] = useState<Record<string, Record<string, string>>>({});
  const [selectedSlides, setSelectedSlides] = useState<Record<string, string[]>>({}); // For multi-select
  const [isScaffolding, setIsScaffolding] = useState(false);
  const [scaffoldExists, setScaffoldExists] = useState(false);
  const [showPagesCreatedMessage, setShowPagesCreatedMessage] = useState(false);
  const [isEditingScaffold, setIsEditingScaffold] = useState(false);
  const [isEditingStatusBadges, setIsEditingStatusBadges] = useState(false);
  const [selectedCoverVariant, setSelectedCoverVariant] = useState<{templateId: string; variantKey?: string; name: string} | null>(null);
  const [showCoverSelector, setShowCoverSelector] = useState(false);
  
  // Asset hover popover - show larger preview after 2s delay for all asset types (variants + single templates)
  const [variantPopover, setVariantPopover] = useState<{
    templateId: string;
    templateName: string;
    variant?: VariantInfo;
    preview: string;
    displayName: string;
  } | null>(null);
  const [variantPopoverVisible, setVariantPopoverVisible] = useState(false);
  const variantPopoverShowTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const variantPopoverHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const variantPopoverRef = useRef<HTMLDivElement | null>(null);
  const variantPopoverVisibleRef = useRef(false);
  variantPopoverVisibleRef.current = variantPopoverVisible;
  const variantPopoverVariantKeyRef = useRef<string | null>(null);
  variantPopoverVariantKeyRef.current = variantPopover?.variant?.key ?? null;
  const [variantPopoverHighResPreview, setVariantPopoverHighResPreview] = useState<string | null>(null);
  
  // Click outside to dismiss variant popover
  useEffect(() => {
    if (!variantPopoverVisible || !variantPopover) return;
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (variantPopoverRef.current && !variantPopoverRef.current.contains(target)) {
        setVariantPopoverVisible(false);
        setVariantPopover(null);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [variantPopoverVisible, variantPopover]);

  // Request high-res preview when popover becomes visible (only for variants; runs in Figma plugin)
  useEffect(() => {
    if (!variantPopoverVisible || !variantPopover) {
      setVariantPopoverHighResPreview(null);
      return;
    }
    setVariantPopoverHighResPreview(null);
    const isInFigma = typeof window !== 'undefined' && window.parent !== window && typeof (window.parent as any).postMessage === 'function';
    if (isInFigma && variantPopover.variant) {
      (window.parent as any).postMessage({
        pluginMessage: {
          type: 'REQUEST_VARIANT_PREVIEW',
          payload: { variantKey: variantPopover.variant.key },
        },
      }, '*');
    }
  }, [variantPopoverVisible, variantPopover?.variant?.key]);

  // Cleanup variant popover timers on unmount
  useEffect(() => {
    return () => {
      if (variantPopoverShowTimerRef.current) clearTimeout(variantPopoverShowTimerRef.current);
      if (variantPopoverHideTimerRef.current) clearTimeout(variantPopoverHideTimerRef.current);
    };
  }, []);
  
  // Cloud POCs (Point of Contact) - per cloud
  interface CloudPOC {
    name: string;
    email: string;
  }
  // cloudPOCs now comes from useCloudPocs hook above
  
  // Editable scaffold structure - organized by sections
  interface ScaffoldPage {
    id: string;
    name: string;
    status: string | null;
    isRename?: boolean;
  }
  
  interface ScaffoldSection {
    id: string;
    name: string;
    pages: ScaffoldPage[];
    isDivider?: boolean; // Special flag for divider-only sections
  }
  
  // Default scaffold sections (for reset)
  const defaultScaffoldSections: ScaffoldSection[] = [
    {
      id: 'top',
      name: '',
      pages: [
        { id: 'cover', name: 'Cover Page', status: null, isRename: true },
        { id: 'readme', name: 'Read Me', status: null },
      ]
    },
    {
      id: 'current',
      name: 'CURRENT DESIGNS',
      pages: [
        { id: 'current1', name: '{Release} {Feature Name}', status: '🟢' },
        { id: 'current2', name: '{Release} {Feature Name} • Explorations', status: '🟡' },
        { id: 'current3', name: '{Release} {Feature Name 2}', status: '🟢' },
      ]
    },
    {
      id: 'milestones',
      name: 'MILESTONES + E2E FLOWS/DEMOS',
      pages: [
        { id: 'milestone1', name: '{YYYY.MM.DD}_Product Demo', status: '🟢' },
        { id: 'milestone2', name: '{YYYY.MM.DD}_Customer Demo', status: '🟢' },
        { id: 'milestone3', name: '{YYYY.MM.DD}_Sprint Review', status: '🟡' },
      ]
    },
    {
      id: 'archived',
      name: 'ARCHIVED EXPLORATIONS',
      pages: [
        { id: 'archive1', name: '{YYYY.MM.DD}_{Exploration Name}', status: null },
        { id: 'archive2', name: '{YYYY.MM.DD}_{Previous Iteration}', status: null },
        { id: 'archive3', name: '{YYYY.MM.DD}_{Deprecated Flow}', status: null },
      ]
    },
    {
      id: 'btl',
      name: 'BELOW THE LINE',
      pages: [
        { id: 'btl1', name: '{Deprecated Feature}', status: '❌' },
        { id: 'btl2', name: '{Old Component Library}', status: '❌' },
      ]
    },
  ];
  
  // Undo/Redo history for scaffold sections
  const [history, setHistory] = useState<ScaffoldSection[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const isUndoRedoRef = useRef(false);
  const isInitialMountRef = useRef(true);
  
  const [scaffoldSections, setScaffoldSections] = useState<ScaffoldSection[]>([
    {
      id: 'top',
      name: '',  // No header for top-level pages
      pages: [
        { id: 'cover', name: 'Cover Page', status: null, isRename: true },
        { id: 'readme', name: 'Read Me', status: null },
      ]
    },
    {
      id: 'current',
      name: 'CURRENT DESIGNS',
      pages: [
        { id: 'current1', name: '{Release} {Feature Name}', status: '🟢' },
        { id: 'current2', name: '{Release} {Feature Name} • Explorations', status: '🟡' },
        { id: 'current3', name: '{Release} {Feature Name 2}', status: '🟢' },
      ]
    },
    {
      id: 'milestones',
      name: 'MILESTONES + E2E FLOWS/DEMOS',
      pages: [
        { id: 'milestone1', name: '{YYYY.MM.DD}_Product Demo', status: '🟢' },
        { id: 'milestone2', name: '{YYYY.MM.DD}_Customer Demo', status: '🟢' },
        { id: 'milestone3', name: '{YYYY.MM.DD}_Sprint Review', status: '🟡' },
      ]
    },
    {
      id: 'archived',
      name: 'ARCHIVED EXPLORATIONS',
      pages: [
        { id: 'archive1', name: '{YYYY.MM.DD}_{Exploration Name}', status: null },
        { id: 'archive2', name: '{YYYY.MM.DD}_{Previous Iteration}', status: null },
        { id: 'archive3', name: '{YYYY.MM.DD}_{Deprecated Flow}', status: null },
      ]
    },
    {
      id: 'btl',
      name: 'BELOW THE LINE',
      pages: [
        { id: 'btl1', name: '{Deprecated Feature}', status: '❌' },
        { id: 'btl2', name: '{Old Component Library}', status: '❌' },
      ]
    },
  ]);
  
  // Undo/Redo functions
  const undo = () => {
    if (historyIndex > 0) {
      isUndoRedoRef.current = true;
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setScaffoldSections(JSON.parse(JSON.stringify(history[newIndex])));
    }
  };
  
  const redo = () => {
    if (historyIndex < history.length - 1) {
      isUndoRedoRef.current = true;
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setScaffoldSections(JSON.parse(JSON.stringify(history[newIndex])));
    }
  };
  
  // Initialize history on first mount
  useEffect(() => {
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      setHistory([JSON.parse(JSON.stringify(scaffoldSections))]);
      setHistoryIndex(0);
    }
  }, []);
  
  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }
      
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key === 'z') {
        e.preventDefault();
        undo();
      } else if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'z') {
        e.preventDefault();
        redo();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [historyIndex, history]);
  
  // Save state to history when scaffoldSections changes (but not from undo/redo)
  useEffect(() => {
    if (isUndoRedoRef.current) {
      isUndoRedoRef.current = false;
      return;
    }
    
    if (isInitialMountRef.current) {
      return; // Skip initial mount
    }
    
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(JSON.parse(JSON.stringify(scaffoldSections)));
    // Limit history to 50 items
    if (newHistory.length > 50) {
      newHistory.shift();
    } else {
      setHistoryIndex(newHistory.length - 1);
    }
    setHistory(newHistory);
  }, [scaffoldSections]);

  // Figma Links feature (per cloud) - now from useCloudFigmaLinks hook
  const [showLinksDropdown, setShowLinksDropdown] = useState(false);
  const [isAddingLink, setIsAddingLink] = useState(false);
  const [newLinkName, setNewLinkName] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  // Load dark mode preference on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('starterkit-darkmode');
      if (saved === 'true') {
        setIsDarkMode(true);
      }
    } catch (e) {
      // localStorage not available
    }
  }, []);
  
  // Save dark mode preference
  useEffect(() => {
    try {
      localStorage.setItem('starterkit-darkmode', String(isDarkMode));
    } catch (e) {
      // localStorage not available
    }
  }, [isDarkMode]);
  
  // Settings accordion state
  const [expandedSettingsSection, setExpandedSettingsSection] = useState<string | null>('clouds');
  
  // Expanded cloud state - only one cloud expanded at a time
  const [expandedCloudId, setExpandedCloudId] = useState<string | null>(null);
  
  // Cloud selector feature
  const [showCloudSelector, setShowCloudSelector] = useState(false);
  // defaultCloud now comes from useDefaultCloud hook above
  const [hoveredCloud, setHoveredCloud] = useState<string | null>(null);
  const [showAddCloudModal, setShowAddCloudModal] = useState(false);
  const [newCloudName, setNewCloudName] = useState('');
  const [newCloudIcon, setNewCloudIcon] = useState<string | null>(null);
  
  // Delete confirmation
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [showTrashModal, setShowTrashModal] = useState(false);
  
  // Cloud trash - stores deleted clouds with all their associated data
  const [deletedClouds, setDeletedClouds] = useState<Array<{
    cloud: any;
    templates: any[];
    categories: any[];
    links: any[];
    pocs: any[];
    deletedAt: number;
  }>>([]);
  const [showCloudTrashModal, setShowCloudTrashModal] = useState(false);
  const [deleteCloudConfirmId, setDeleteCloudConfirmId] = useState<string | null>(null);
  
  // Backup & Restore state
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [backupList, setBackupList] = useState<BackupInfo[]>([]);
  const [backupLoading, setBackupLoading] = useState(false);
  const [backupRestoring, setBackupRestoring] = useState<number | null>(null);
  
  // Version History state (simplified: most recent backup summary only)
  const [showDataRecoveryModal, setShowDataRecoveryModal] = useState(false);
  const [latestBackupSummary, setLatestBackupSummary] = useState<{
    clouds: number;
    assets: number;
    sections: number;
    backupDate: string;
    backupsToRestore: { dataKey: string; backupId: number }[];
    details?: Array<{ cloudId: string; cloudName: string; icon: string; components: number; sections: number }>;
  } | null>(null);
  const [dataRecoveryLoading, setDataRecoveryLoading] = useState(false);
  const [dataRecoveryError, setDataRecoveryError] = useState<string | null>(null);
  const [dataRecoveryRestoring, setDataRecoveryRestoring] = useState(false);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  // Activity Log state
  const [showActivityHistoryModal, setShowActivityHistoryModal] = useState(false);
  const [activityLog, setActivityLog] = useState<ActivityLogEntry[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [selectedActivities, setSelectedActivities] = useState<Set<number>>(new Set());
  const [activityRestoring, setActivityRestoring] = useState(false);
  const [activityHistoryCloudFilter, setActivityHistoryCloudFilter] = useState<string>('');
  const [showActivityHistoryCloudSelector, setShowActivityHistoryCloudSelector] = useState(false);
  const [activityHistoryTimeFilter, setActivityHistoryTimeFilter] = useState<'7d' | '30d' | 'all'>('all');
  const [showActivityHistoryTimeFilter, setShowActivityHistoryTimeFilter] = useState(false);
  const [activityHistorySortBy, setActivityHistorySortBy] = useState<'recency' | 'types' | 'designer'>('recency');
  const [activityHistoryGroupBy, setActivityHistoryGroupBy] = useState<'all' | 'none'>('none');
  const [showActivityHistorySort, setShowActivityHistorySort] = useState(false);
  const [activityHistoryStats, setActivityHistoryStats] = useState<{ componentsAdded: number; componentsReused: number; designersEngaged: number } | null>(null);
  const [backupCreating, setBackupCreating] = useState(false);
  const [celebrationStats, setCelebrationStats] = useState<{ componentsAdded: number; componentsReused: number; designersEngaged: number } | null>(null);
  const [templateAddMetadata, setTemplateAddMetadata] = useState<Record<string, { userName: string | null; createdAt: string }>>({});
  
  // Saved templates/variants (simple bookmark feature)
  // Format: [{templateId: string, variantKey?: string}, ...]
  // savedItems now comes from useSavedItems hook above
  
  // Plugin branding from selected frame
  const [pluginBranding, setPluginBranding] = useState<string | null>(null);
  const [frameName, setFrameName] = useState<string | null>(null);
  
  // Cloud visibility and per-cloud settings
  // hiddenClouds and cloudCategories now come from hooks above
  
  // Drag and drop state
  const [draggedItem, setDraggedItem] = useState<{ type: string; index: number } | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  
  // Default categories (used for reset and initial state)
  const defaultCategories = [
    { id: 'team-housekeeping', label: 'Team Housekeeping' },
    { id: 'all', label: 'All Assets' },
    { id: 'cover-pages', label: 'Covers' },
    { id: 'components', label: 'Components' },
    { id: 'slides', label: 'Slides' },
    { id: 'resources', label: 'Resources' },
  ];
  
  // Status symbols for scaffold pages
  const defaultStatusSymbols = [
    { id: 'ready', symbol: '🟢', label: 'Ready' },
    { id: 'progress', symbol: '🟡', label: 'In Progress' },
    { id: 'deprecated', symbol: '❌', label: 'Deprecated' },
  ];
  // statusSymbols now comes from useStatusSymbols hook above (with default fallback)
  
  // Refs for click-outside handling
  const linksDropdownRef = useRef<HTMLDivElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const cloudSelectorRef = useRef<HTMLDivElement>(null);
  const cloudIconInputRef = useRef<HTMLInputElement>(null);
  const splashMoreDropdownRef = useRef<HTMLDivElement>(null);
  const coverSelectorRef = useRef<HTMLDivElement>(null);
  const moveMenuRef = useRef<HTMLDivElement>(null);
  const activityHistoryCloudSelectorRef = useRef<HTMLDivElement>(null);
  const activityHistoryTimeFilterRef = useRef<HTMLDivElement>(null);
  const activityHistorySortRef = useRef<HTMLDivElement>(null);
  const templatesRef = useRef<Template[]>([]);
  const categoryPillsRef = useRef<HTMLDivElement>(null);

  // Keep templatesRef in sync for message handler
  useEffect(() => {
    templatesRef.current = templates;
  }, [templates]);

  // Migration function: Copy data from figma.clientStorage to backend
  const migrateFromClientStorage = async () => {
    const isInFigma = window.parent !== window && typeof parent.postMessage === 'function';
    if (!isInFigma) return false;

    return new Promise<boolean>((resolve) => {
      let migrationComplete = false;
      const migrationTimeout = setTimeout(() => {
        if (!migrationComplete) {
          console.log('Migration timeout - proceeding without migration');
          resolve(false);
        }
      }, 5000);

      const migrationHandler = async (event: MessageEvent) => {
        const msg = event.data?.pluginMessage;
        if (msg?.type === 'MIGRATION_DATA') {
          window.removeEventListener('message', migrationHandler);
          migrationComplete = true;
          clearTimeout(migrationTimeout);

          try {
            console.log('🔄 Checking migration from clientStorage to backend...');
            
            // IMPORTANT: Only migrate if backend is empty to avoid overwriting
            // Backend data takes precedence over local clientStorage
            
            // Migrate templates when backend is empty (sync local/published plugin to database)
            if (msg.templates && msg.templates.length > 0 && templates.length === 0) {
              setTemplates(msg.templates);
              console.log(`✓ Migrated ${msg.templates.length} templates from local to database`);
            }

            // Migrate saved items when backend is empty
            if (msg.savedItems && msg.savedItems.length > 0 && savedItems.length === 0) {
              setSavedItems(msg.savedItems);
              console.log(`✓ Migrated ${msg.savedItems.length} saved items from local to database`);
            }

            // Migrate figma links
            if (msg.figmaLinks && (Array.isArray(msg.figmaLinks) || Object.keys(msg.figmaLinks).length > 0)) {
              if (Array.isArray(msg.figmaLinks)) {
                setCloudFigmaLinks({ sales: msg.figmaLinks });
              } else {
                setCloudFigmaLinks(msg.figmaLinks);
              }
              console.log('✓ Migrated Figma links');
            }

            // Migrate cloud-specific links
            if (msg.cloudFigmaLinks && Object.keys(msg.cloudFigmaLinks).length > 0) {
              setCloudFigmaLinks(msg.cloudFigmaLinks);
              console.log('✓ Migrated cloud-specific Figma links');
            }

            // Migrate custom clouds
            if (msg.customClouds && msg.customClouds.length > 0) {
              setCustomClouds(msg.customClouds);
              console.log(`✓ Migrated ${msg.customClouds.length} custom clouds`);
            }

            // Migrate editable clouds
            if (msg.editableClouds) {
              setEditableClouds(msg.editableClouds);
              console.log('✓ Migrated editable clouds');
            }

            // Migrate cloud categories - merge clientStorage into backend (don't overwrite existing)
            if (msg.cloudCategories && Object.keys(msg.cloudCategories).length > 0) {
              const current = cloudCategoriesRef.current;
              const merged = { ...current };
              let changed = false;
              for (const [cloudId, cats] of Object.entries(msg.cloudCategories)) {
                const arr = Array.isArray(cats) ? cats : [];
                if (arr.length > 0 && (!merged[cloudId] || merged[cloudId].length === 0)) {
                  merged[cloudId] = arr;
                  changed = true;
                }
              }
              if (changed) {
                setCloudCategories(merged);
                console.log('✓ Migrated cloud categories from local');
              }
            }

            // Migrate status symbols
            if (msg.statusSymbols && msg.statusSymbols.length > 0) {
              setStatusSymbols(msg.statusSymbols);
              console.log(`✓ Migrated ${msg.statusSymbols.length} status symbols`);
            }

            // Migrate cloud POCs
            if (msg.cloudPOCs && Object.keys(msg.cloudPOCs).length > 0) {
              setCloudPOCs(msg.cloudPOCs);
              console.log('✓ Migrated cloud POCs');
            }

            // Migrate user preferences (if user ID is available)
            if (figmaUserId) {
              if (msg.defaultCloud) {
                setDefaultCloud(msg.defaultCloud);
                console.log(`✓ Migrated default cloud: ${msg.defaultCloud}`);
              }
              if (msg.onboardingState) {
                setOnboardingState({
                  hasCompleted: msg.onboardingState.hasCompleted || false,
                  skipSplash: msg.onboardingState.skipSplash || false
                });
                console.log('✓ Migrated onboarding state');
              }
              if (msg.hiddenClouds && msg.hiddenClouds.length > 0) {
                setHiddenClouds(msg.hiddenClouds);
                console.log(`✓ Migrated ${msg.hiddenClouds.length} hidden clouds`);
              }
            }

            console.log('✅ Migration complete!');
            resolve(true);
          } catch (error) {
            console.error('❌ Migration error:', error);
            resolve(false);
          }
        }
      };

      window.addEventListener('message', migrationHandler);
      
      // Request migration data from plugin sandbox
      parent.postMessage({ pluginMessage: { type: 'MIGRATE_FROM_CLIENT_STORAGE' } }, '*');
    });
  };

  // Load templates and figma links from Figma's clientStorage on mount
  useEffect(() => {
    // Check if running in Figma or standalone browser
    const isInFigma = window.parent !== window && typeof parent.postMessage === 'function';
    
    // Add error handler
    const handleError = (error: ErrorEvent) => {
      console.error('Plugin error:', error);
      setIsLoading(false);
      // hasCompletedOnboarding comes from hook, no need to set here
      setShowSplash(false);
    };
    
    window.addEventListener('error', handleError);
    
    // Function to send initialization messages (only for scaffold check and frame branding)
    const sendInitMessages = () => {
      if (!isInFigma) return;
      
      try {
        // Only send messages that still need plugin sandbox (not data loading)
        parent.postMessage({ pluginMessage: { type: 'CHECK_SCAFFOLD_EXISTS' } }, '*');
        parent.postMessage({ pluginMessage: { type: 'GET_SELECTED_FRAME_BRANDING' } }, '*');
      } catch (error) {
        console.error('Failed to send initial messages:', error);
      }
    };
    
    if (isInFigma) {
      // Wait for PLUGIN_READY signal to get user ID
      // This ensures code.ts is fully loaded (critical for published plugins)
      const readyHandler = async (event: MessageEvent) => {
        const msg = event.data?.pluginMessage;
        if (msg?.type === 'PLUGIN_READY') {
          window.removeEventListener('message', readyHandler);
          // Capture Figma user ID and name for user-specific data
          if (msg.user?.id) {
            setFigmaUserId(msg.user.id);
          }
          if (msg.user?.name) {
            setFigmaUserName(msg.user.name);
          }
          
          // Try to migrate existing data from clientStorage to backend
          await migrateFromClientStorage();
          
          // Small delay to ensure code.ts message handlers are registered
          setTimeout(sendInitMessages, 50);
        }
      };
      
      window.addEventListener('message', readyHandler);
      
      // Fallback: if PLUGIN_READY doesn't arrive in 1s, send anyway
      setTimeout(() => {
        window.removeEventListener('message', readyHandler);
        sendInitMessages();
      }, 1000);
    } else {
      // Browser preview - skip onboarding
      setOnboardingState({ hasCompleted: true });
      setShowSplash(false);
      setIsLoading(false);
    }
    
    // Fallback timeout - if no response in 3s, assume first-time user and show UI
    // Note: Don't auto-dismiss splash - let user click "Get Started"
    const timeout = setTimeout(() => {
      setIsLoading(false);
      // hasCompletedOnboarding comes from hook, no need to set here
      // Don't setShowSplash(false) here - let user interact with splash screen
    }, 3000);
    
    return () => {
      clearTimeout(timeout);
      window.removeEventListener('error', handleError);
    };
  }, []);

  // Add template flow
  const [view, setView] = useState<'home' | 'add' | 'scaffold' | 'settings' | 'frame-details' | 'housekeeping-admin'>('home');
  const [frameDetails, setFrameDetails] = useState<any>(null);
  const [frameDetailsError, setFrameDetailsError] = useState<string | null>(null);
  const [frameDetailsLoading, setFrameDetailsLoading] = useState(false);
  
  // Housekeeping admin state - persisted to backend
  const { rules: housekeepingRules, setRules: saveHousekeepingRules, loading: housekeepingLoading } = useHousekeepingRules();
  const [editingRule, setEditingRule] = useState<any>(null);
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [ruleForm, setRuleForm] = useState({ title: '', description: '', hasComplianceCheck: false, links: [] as { label: string; action: string }[] });
  const [newLinkLabel, setNewLinkLabel] = useState('');
  const [deleteConfirmRule, setDeleteConfirmRule] = useState<string | null>(null);

  // Housekeeping functions
  function addRule() {
    setEditingRule(null);
    setRuleForm({ title: '', description: '', hasComplianceCheck: false, links: [] });
    setShowRuleModal(true);
  }

  function editRule(rule: any) {
    setEditingRule(rule);
    setRuleForm({ 
      title: rule.title, 
      description: rule.description, 
      hasComplianceCheck: rule.hasComplianceCheck,
      links: [...rule.links]
    });
    setShowRuleModal(true);
  }

  function saveRule() {
    if (!ruleForm.title.trim()) return;
    
    let newRules: any[];
    if (editingRule) {
      newRules = housekeepingRules.map(r => 
        r.id === editingRule.id 
          ? { ...r, title: ruleForm.title, description: ruleForm.description, hasComplianceCheck: ruleForm.hasComplianceCheck, links: ruleForm.links }
          : r
      );
    } else {
      const newRule = {
        id: `rule-${Date.now()}`,
        title: ruleForm.title,
        description: ruleForm.description,
        hasComplianceCheck: ruleForm.hasComplianceCheck,
        links: ruleForm.links
      };
      newRules = [...housekeepingRules, newRule];
    }
    saveHousekeepingRules(newRules);
    setShowRuleModal(false);
    setEditingRule(null);
  }

  function deleteRule(ruleId: string) {
    setDeleteConfirmRule(ruleId);
  }
  
  function confirmDeleteRule() {
    if (deleteConfirmRule) {
      const newRules = housekeepingRules.filter(r => r.id !== deleteConfirmRule);
      saveHousekeepingRules(newRules);
      setDeleteConfirmRule(null);
    }
  }

  function moveRule(index: number, direction: 'up' | 'down') {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= housekeepingRules.length) return;
    
    const newRules = [...housekeepingRules];
    [newRules[index], newRules[newIndex]] = [newRules[newIndex], newRules[index]];
    saveHousekeepingRules(newRules);
  }

  function addLinkToRule() {
    if (!newLinkLabel.trim()) return;
    setRuleForm(form => ({
      ...form,
      links: [...form.links, { label: newLinkLabel.trim(), action: 'scaffold' }]
    }));
    setNewLinkLabel('');
  }

  function removeLinkFromRule(index: number) {
    setRuleForm(form => ({
      ...form,
      links: form.links.filter((_, i) => i !== index)
    }));
  }
  const [showWelcomeScreen, setShowWelcomeScreen] = useState(true);
  const [contentRefreshKey, setContentRefreshKey] = useState(0);
  const [scrollToTemplateId, setScrollToTemplateId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    'frame-guidelines': false,
    'page-structure': false,
    'starter-kit-info': false,
  });

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  // Sync expandedSections when housekeeping rules load (backend may have different rule ids)
  useEffect(() => {
    setExpandedSections(prev => {
      const next = { ...prev };
      let changed = false;
      housekeepingRules.forEach(rule => {
        if (rule?.id && !(rule.id in next)) {
          next[rule.id] = false;
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [housekeepingRules]);
  const [addStep, setAddStep] = useState<'instructions' | 'loading' | 'configure'>('instructions');
  const [capturedComponent, setCapturedComponent] = useState<ComponentInfo | null>(null);
  const [formName, setFormName] = useState('');
  const [formCloud, setFormCloud] = useState('sales');
  const [formCategory, setFormCategory] = useState('components');
  const [formDescription, setFormDescription] = useState('');
  const [formGoogleSlideLink, setFormGoogleSlideLink] = useState('');

  // Dynamic category options based on selected cloud
  const formCategoryOptions = useMemo(() => {
    const defaultCats = [
      { id: 'cover-pages', label: 'Covers' },
      { id: 'components', label: 'Components' },
      { id: 'slides', label: 'Slides' },
      { id: 'resources', label: 'Resources' },
    ];
    const cloudCats = (cloudCategories ?? {})[formCloud] || defaultCats;
    // Filter out non-selectable categories (team-housekeeping, all, saved)
    return cloudCats
      .filter(cat => !['team-housekeeping', 'all', 'saved'].includes(cat.id))
      .map(cat => ({ value: cat.id, label: cat.label }));
  }, [formCloud, cloudCategories]);

  // Reset formCategory when formCloud changes if current category doesn't exist in new cloud
  useEffect(() => {
    const validCategories = formCategoryOptions.map(opt => opt.value);
    if (!validCategories.includes(formCategory) && validCategories.length > 0) {
      setFormCategory(validCategories[0]);
    }
  }, [formCloud, formCategoryOptions, formCategory]);

  // ============ MESSAGE HANDLER ============
  useEffect(() => {
    function onMessage(event: MessageEvent) {
      const msg = event.data?.pluginMessage;
      if (!msg) return;

      switch (msg.type) {
        case 'PLUGIN_READY':
          // Plugin is ready - capture user ID and name if provided
          console.log('Plugin ready signal received');
          if (msg.user?.id) {
            setFigmaUserId(msg.user.id);
          }
          if (msg.user?.name) {
            setFigmaUserName(msg.user.name);
          }
          break;
          
        case 'SELECTED_FRAME_BRANDING_LOADED':
          setPluginBranding(msg.branding || null);
          setFrameName(msg.frameName || null);
          break;
          
        case 'FRAME_DETAILS_RESULT':
          setFrameDetailsLoading(false);
          if (msg.error) {
            setFrameDetailsError(msg.error);
            setFrameDetails(null);
          } else {
            setFrameDetails(msg.details);
            setFrameDetailsError(null);
          }
          break;
          
        // Data loading messages removed - now handled by backend hooks
        // Templates, savedItems, etc. are loaded automatically via hooks

        case 'COMPONENT_INFO':
          // Successfully captured component - including variant data!
          setCapturedComponent({
            name: msg.name,
            key: msg.key,
            id: msg.id,
            width: msg.width,
            height: msg.height,
            preview: msg.preview,
            isComponentSet: msg.isComponentSet,
            variants: msg.variants,
            variantCount: msg.variantCount,
          });
          setFormName(msg.name); // Set editable name
          setAddStep('configure');
          break;

        case 'COMPONENT_ERROR':
          // Failed to capture - go back to instructions
          setAddStep('instructions');
          break;

        case 'INSERT_SUCCESS': {
          setInsertingId(null);
          const count = msg.count ?? 1;
          const templateName = msg.templateName || 'Component';
          const cloudId = msg.cloudId || selectedClouds[0] || undefined;
          const cloudName = msg.cloudName || (() => {
            const arr = Array.isArray(editableClouds) ? editableClouds : clouds;
            const all = [...arr, ...(customClouds ?? [])];
            return all.find((c: any) => c.id === cloudId)?.name;
          })();
          const template = templatesRef.current.find((t: Template) => t.id === msg.templateId);
          const preview = template?.preview ?? (template?.variants?.[0] as { preview?: string } | undefined)?.preview;
          const assetData: { preview?: string; nodeId?: string } = {};
          if (preview) assetData.preview = preview;
          if (msg.nodeId) assetData.nodeId = msg.nodeId;
          logActivityFromClient({
            action: 'component_insert',
            assetId: msg.templateId || `insert-${Date.now()}`,
            assetName: count > 1 ? `${templateName} (${count} items)` : templateName,
            cloudId,
            cloudName,
            userName: msg.userName ?? figmaUserName ?? undefined,
            assetData: Object.keys(assetData).length > 0 ? assetData : undefined,
          });
          fetchCelebrationStats();
          break;
        }

        case 'INSERT_ERROR':
          setInsertingId(null);
          break;

        case 'TEMPLATE_REFRESHED':
          // Update template with new preview and data
          setRefreshingId(null);
          // Use functional update to get latest templates (avoid stale closure)
          setTemplates(prevTemplates => {
            // Safety check - don't update if templates is empty
            if (!prevTemplates || prevTemplates.length === 0) {
              console.warn('Skipping refresh update - templates is empty');
              return prevTemplates;
            }
            return prevTemplates.map(t => {
              if (t.id === msg.templateId) {
                return {
                  ...t,
                  preview: msg.preview,
                  size: msg.size,
                  ...(msg.variants && { variants: msg.variants }),
                  ...(msg.variantCount && { variantCount: msg.variantCount }),
                };
              }
              return t;
            });
          });
          break;

        case 'TEMPLATE_REFRESH_ERROR':
          setRefreshingId(null);
          break;

        case 'VARIANT_PREVIEW_RESULT':
          if (variantPopoverVariantKeyRef.current === msg.variantKey) {
            setVariantPopoverHighResPreview(msg.imageData || null);
          }
          break;

        case 'VARIANT_PREVIEW_ERROR':
          setVariantPopoverHighResPreview(null);
          break;

        case 'ALL_TEMPLATES_REFRESHED':
          // Update all refreshed templates
          setIsBackgroundSyncing(false);
          if (msg.templates && msg.templates.length > 0) {
            const refreshedMap = new Map(msg.templates.map((t: any) => [t.id, t]));
            // Use functional update to get latest templates (avoid stale closure)
            setTemplates(prevTemplates => {
              // Safety check - don't update if templates is empty
              if (!prevTemplates || prevTemplates.length === 0) {
                console.warn('Skipping bulk refresh update - templates is empty');
                return prevTemplates;
              }
              return prevTemplates.map(t => {
                const refreshed = refreshedMap.get(t.id);
                if (refreshed) {
                  return {
                    ...t,
                    preview: refreshed.preview,
                    size: refreshed.size,
                    ...(refreshed.variants && { variants: refreshed.variants }),
                    ...(refreshed.variantCount && { variantCount: refreshed.variantCount }),
                  };
                }
                return t;
              });
            });
            // Update last refreshed timestamp (disabled for now)
            // setTemplatesLastRefreshed(Date.now()).catch(console.error);
          }
          break;

        case 'SCAFFOLD_SUCCESS':
          setIsScaffolding(false);
          setScaffoldExists(true);
          setShowPagesCreatedMessage(true);
          setView('home'); // Go back to home after creating
          // Hide message after 3 seconds
          setTimeout(() => setShowPagesCreatedMessage(false), 3000);
          break;

        case 'SCAFFOLD_ERROR':
          setIsScaffolding(false);
          break;
          
        // All data loading messages removed - now handled by backend hooks
        // Data is automatically loaded when hooks mount

        case 'SCAFFOLD_EXISTS':
          setScaffoldExists(msg.exists);
          setIsScaffolding(false);
          break;
      }
    }

    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  // Sync selectedClouds with defaultCloud when it loads
  // If no defaultCloud exists, default to 'sales' after loading completes
  // Only run once when defaultCloudLoading becomes false
  useEffect(() => {
    if (!defaultCloudLoading && !cloudSelectionReady) {
      if (defaultCloud) {
        // User has a saved default cloud
        setSelectedClouds([defaultCloud]);
        setCloudSelectionReady(true);
      } else {
        // No default cloud saved, use 'sales' as fallback
        setSelectedClouds(['sales']);
        setCloudSelectionReady(true);
      }
    }
  }, [defaultCloud, defaultCloudLoading, cloudSelectionReady]);

  // Auto-refresh disabled for now - use manual refresh instead
  // TODO: Re-enable after testing
  /*
  const REFRESH_THRESHOLD_MS = 24 * 60 * 60 * 1000;
  const hasCheckedFreshness = useRef(false);
  useEffect(() => {
    // Auto-refresh logic here
  }, []);
  */

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (linksDropdownRef.current && !linksDropdownRef.current.contains(event.target as Node)) {
        setShowLinksDropdown(false);
        setIsAddingLink(false);
      }
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
        setShowMoreMenu(false);
      }
      if (cloudSelectorRef.current && !cloudSelectorRef.current.contains(event.target as Node)) {
        setShowCloudSelector(false);
        setHoveredCloud(null);
      }
      if (splashMoreDropdownRef.current && !splashMoreDropdownRef.current.contains(event.target as Node)) {
        setShowMoreCloudsInSplash(false);
      }
      if (coverSelectorRef.current && !coverSelectorRef.current.contains(event.target as Node)) {
        setShowCoverSelector(false);
      }
      if (moveMenuRef.current && !moveMenuRef.current.contains(event.target as Node)) {
        setMoveMenuOpen(null);
      }
      if (activityHistoryCloudSelectorRef.current && !activityHistoryCloudSelectorRef.current.contains(event.target as Node)) {
        setShowActivityHistoryCloudSelector(false);
      }
      if (activityHistoryTimeFilterRef.current && !activityHistoryTimeFilterRef.current.contains(event.target as Node)) {
        setShowActivityHistoryTimeFilter(false);
      }
      if (activityHistorySortRef.current && !activityHistorySortRef.current.contains(event.target as Node)) {
        setShowActivityHistorySort(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);


  // Fetch celebration stats (components added, reused, designers)
  const fetchCelebrationStats = async () => {
    try {
      const stats = await getActivityStats();
      setCelebrationStats(stats);
    } catch {
      // Silently ignore - stats are optional
    }
  };

  // Load celebration stats on mount
  useEffect(() => {
    fetchCelebrationStats();
  }, []);

  // Fetch template add metadata (who added, when) for main library display
  const fetchTemplateAddMetadata = async () => {
    try {
      const metadata = await getTemplateAddMetadata();
      setTemplateAddMetadata(metadata);
    } catch {
      // Silently ignore - metadata is optional
    }
  };

  useEffect(() => {
    if (templates.length > 0) {
      fetchTemplateAddMetadata();
    }
  }, [templates.length]);

  // ============ ACTIONS ============
  
  // Semantic search helper - searches across multiple fields
  const searchTemplates = (query: string) => {
    if (!query.trim()) return [];
    const q = query.toLowerCase().trim();
    const words = q.split(/\s+/);
    
    return templates.filter(t => {
      const cloud = clouds.find(c => c.id === t.cloudId);
      const cloudName = cloud?.name.toLowerCase() || '';
      const categoryLabel = categoryLabels[t.category]?.toLowerCase() || t.category.toLowerCase();
      
      // Combine all searchable text
      const searchableText = [
        t.name.toLowerCase(),
        t.description?.toLowerCase() || '',
        categoryLabel,
        cloudName,
        t.category.toLowerCase(),
        // Also search variant names if component set
        ...(t.variants?.map(v => v.displayName.toLowerCase()) || [])
      ].join(' ');
      
      // Check if all words match (AND search for better results)
      return words.every(word => searchableText.includes(word));
    });
  };
  
  // Generate search suggestions - filtered by selected cloud and includes variants
  const searchSuggestions = React.useMemo(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) return [];
    
    const q = searchQuery.toLowerCase();
    const suggestions: Array<{type: 'template' | 'variant' | 'category'; label: string; value: string; icon?: string; templateId?: string; variantKey?: string; categoryId?: string}> = [];
    
    // Filter templates by selected cloud first
    const cloudFilteredTemplates = templates.filter(t => selectedClouds.includes(t.cloudId));
    
    // Search within cloud-filtered templates
    cloudFilteredTemplates.forEach(t => {
      const cloud = clouds.find(c => c.id === t.cloudId);
      const searchableText = [t.name.toLowerCase(), t.description?.toLowerCase() || ''].join(' ');
      
      // Check if template name matches
      if (searchableText.includes(q)) {
        suggestions.push({
          type: 'template',
          label: t.name,
          value: t.name,
          icon: cloud?.icon,
          templateId: t.id,
          categoryId: t.category
        });
      }
      
      // Check variants if component set
      if (t.isComponentSet && t.variants) {
        t.variants.forEach(variant => {
          if (variant.displayName.toLowerCase().includes(q) || variant.name.toLowerCase().includes(q)) {
            suggestions.push({
              type: 'variant',
              label: variant.displayName,
              value: variant.displayName,
              icon: cloud?.icon,
              templateId: t.id,
              variantKey: variant.key,
              categoryId: t.category
            });
          }
        });
      }
    });
    
    // Add matching categories (these are global, not cloud-specific)
    categories.filter(c => c.label.toLowerCase().includes(q) && c.id !== 'all' && c.id !== 'team-housekeeping' && c.id !== 'saved').forEach(c => {
      suggestions.push({
        type: 'category',
        label: `${c.label} category`,
        value: c.label,
        categoryId: c.id
      });
    });
    
    // Remove duplicates and limit
    const uniqueSuggestions = suggestions.filter((s, index, self) => 
      index === self.findIndex(t => t.label === s.label && t.type === s.type)
    );
    
    return uniqueSuggestions.slice(0, 10);
  }, [searchQuery, templates, clouds, selectedClouds]);
  
  // Function to navigate to a search result
  const navigateToSearchResult = (suggestion: typeof searchSuggestions[0]) => {
    setSearchQuery('');
    setShowSearchSuggestions(false);
    setShowWelcomeScreen(false);
    
    if (suggestion.type === 'category' && suggestion.categoryId) {
      // Navigate to category tab
      setActiveCategory(suggestion.categoryId);
      // Scroll pill into view
      setTimeout(() => {
        const pillElement = document.querySelector(`[data-category="${suggestion.categoryId}"]`);
        if (pillElement) {
          pillElement.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
      }, 100);
    } else if (suggestion.templateId) {
      // Navigate to template's category and scroll to it
      if (suggestion.categoryId) {
        setActiveCategory(suggestion.categoryId);
      }
      // Scroll to template and pill after a short delay for DOM to update
      setTimeout(() => {
        // Scroll pill into view first
        if (suggestion.categoryId) {
          const pillElement = document.querySelector(`[data-category="${suggestion.categoryId}"]`);
          if (pillElement) {
            pillElement.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
          }
        }
        // Then scroll to template
        const element = document.getElementById(`template-${suggestion.templateId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          // Add highlight effect
          element.classList.add('template-item--highlighted');
          setTimeout(() => {
            element.classList.remove('template-item--highlighted');
          }, 2000);
        }
      }, 150);
    }
  };
  
  // Filter templates (exclude deleted)
  const filteredTemplates = templates.filter(t => {
    // Exclude deleted templates
    if (t.deleted) return false;
    
    const matchCloud = selectedClouds.includes(t.cloudId);
    
    // Apply search filter if there's a search query - ignores category
    if (searchQuery.trim()) {
      const cloud = clouds.find(c => c.id === t.cloudId);
      const cloudName = cloud?.name.toLowerCase() || '';
      const categoryLabel = categoryLabels[t.category]?.toLowerCase() || t.category.toLowerCase();
      const q = searchQuery.toLowerCase().trim();
      const words = q.split(/\s+/);
      
      const searchableText = [
        t.name.toLowerCase(),
        t.description?.toLowerCase() || '',
        categoryLabel,
        cloudName,
        t.category.toLowerCase(),
        ...(t.variants?.map(v => v.displayName.toLowerCase()) || [])
      ].join(' ');
      
      const matchSearch = words.every(word => searchableText.includes(word));
      return matchCloud && matchSearch;
    }
    
    if (activeCategory === 'team-housekeeping') {
      // Team Housekeeping shows welcome/accordion screen, no templates
      return false;
    }
    
    if (activeCategory === 'saved') {
      // Show template if any variant is saved, or if template itself is saved
      return matchCloud && savedItems.some(s => s.templateId === t.id);
    }
    
    const matchCategory = activeCategory === 'all' || t.category === activeCategory;
    
    return matchCloud && matchCategory;
  });
  
  // Count saved items for the pill
  const savedCount = savedItems.length;

  // Get all cover options (templates + variants) - filtered by selected cloud
  const coverOptions: Array<{templateId: string; variantKey?: string; name: string; preview?: string}> = [];
  templates
    .filter(t => {
      const isCover = t.category === 'cover-pages' || t.name.toLowerCase().includes('cover');
      const matchCloud = selectedClouds.length > 0 ? selectedClouds.includes(t.cloudId) : true;
      return isCover && matchCloud;
    })
    .forEach(template => {
      if (template.isComponentSet && template.variants && template.variants.length > 0) {
        // Add each variant as an option
        template.variants.forEach(variant => {
          coverOptions.push({
            templateId: template.id,
            variantKey: variant.key,
            name: variant.displayName || variant.name,
            preview: variant.preview
          });
        });
      } else {
        // Single component
        coverOptions.push({
          templateId: template.id,
          name: template.name,
          preview: template.preview
        });
      }
    });
  
  // Set default cover if none selected and covers exist
  if (!selectedCoverVariant && coverOptions.length > 0) {
    // Find "Default" variant or use first option
    const defaultOption = coverOptions.find(o => 
      o.name.toLowerCase() === 'default' || o.name.toLowerCase().includes('default')
    ) || coverOptions[0];
    setSelectedCoverVariant(defaultOption);
  }

  // Toggle cloud filter
  function toggleCloud(id: string) {
    setSelectedClouds(prev => {
      if (prev.includes(id)) {
        return prev.length > 1 ? prev.filter(c => c !== id) : prev;
      }
      return [...prev, id];
    });
  }

  // Start add flow
  function startAddFlow() {
    setView('add');
    setAddStep('instructions');
    setCapturedComponent(null);
    setFormName('');
    setFormCloud('sales');
    setFormCategory('components');
    setFormDescription('');
    setFormGoogleSlideLink('');
  }

  // Go back to home
  function goHome() {
    setView('home');
  }

  // Capture component from Figma selection
  function captureComponent() {
    setAddStep('loading');
    parent.postMessage({ pluginMessage: { type: 'GET_COMPONENT_INFO' } }, '*');
  }

  // Save new template
  function saveTemplate() {
    if (!capturedComponent) return;

    const newTemplateId = `t-${Date.now()}`;
    const newTemplate: Template = {
      id: newTemplateId,
      name: formName || capturedComponent.name,
      category: formCategory,
      description: formDescription || `${categoryLabels[formCategory]} for ${clouds.find(c => c.id === formCloud)?.name} Cloud`,
      componentKey: capturedComponent.key,
      size: { width: Math.round(capturedComponent.width), height: Math.round(capturedComponent.height) },
      cloudId: formCloud,
      preview: capturedComponent.preview,
      isComponentSet: capturedComponent.isComponentSet,
      variants: capturedComponent.variants,
      variantCount: capturedComponent.variantCount,
      googleSlideLink: formGoogleSlideLink || undefined,
    };

    const updated = [...templates, newTemplate];
    
    // Update local state and save to backend (setTemplates does both)
    setTemplates(updated);
    
    // Switch to the cloud and category where the template was saved
    setSelectedClouds([formCloud]);
    setActiveCategory(formCategory);
    setShowWelcomeScreen(false); // Ensure welcome screen is hidden to show templates
    
    // Set as default cloud if not already set
    const currentDefaultCloud = selectedClouds[0];
    if (currentDefaultCloud !== formCloud) {
      setDefaultCloud(formCloud);
    }
    
    // Show toast and go home
    parent.postMessage({ pluginMessage: { type: 'SHOW_TOAST', message: `"${capturedComponent.name}" added!` } }, '*');
    setView('home');
    
    // Scroll to the new template and category pill after view transition completes
    setTimeout(() => {
      // Scroll category pill into view first
      const pillElement = document.querySelector(`[data-category="${formCategory}"]`);
      if (pillElement) {
        pillElement.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
      
      // Then scroll to the template
      const element = document.getElementById(`template-${newTemplateId}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Brief highlight effect
        element.classList.add('template-item--highlight');
        setTimeout(() => element.classList.remove('template-item--highlight'), 2000);
      }
    }, 300);
  }

  // Insert template to canvas
  function insertTemplate(template: Template) {
    setInsertingId(template.id);

    // Get selected slides for multi-select mode
    const selected = selectedSlides[template.id] || [];
    
    // If it's a component set with variants
    if (template.isComponentSet && template.variants && template.variants.length > 0) {
      // If no slides selected, use first one
      let keysToInsert = selected.length > 0 
        ? selected 
        : [template.variants[0].key];
      
      // Sort by original order in component set (not selection order)
      const originalOrder = template.variants.map(v => v.key);
      keysToInsert = keysToInsert.sort((a, b) => {
        return originalOrder.indexOf(a) - originalOrder.indexOf(b);
      });
      
      // Get display names for notification (also in order)
      const slideNames = keysToInsert.map(key => {
        const variant = template.variants?.find(v => v.key === key);
        return variant?.displayName || key;
      });
      
      // Send message to insert all selected slides
      parent.postMessage({
        pluginMessage: {
          type: 'IMPORT_MULTIPLE_COMPONENTS',
          payload: { 
            templateId: template.id, 
            templateName: template.name, 
            componentKeys: keysToInsert,
            slideNames: slideNames,
            cloudId: template.cloudId,
            cloudName: allClouds.find(c => c.id === template.cloudId)?.name,
          },
        },
      }, '*');
    } else {
      // Simple single component insert
      parent.postMessage({
        pluginMessage: {
          type: 'IMPORT_COMPONENT',
          payload: { 
            templateId: template.id, 
            templateName: template.name, 
            componentKey: template.componentKey,
            cloudId: template.cloudId,
            cloudName: allClouds.find(c => c.id === template.cloudId)?.name,
          },
        },
      }, '*');
    }
  }

  // Toggle variant panel
  function toggleVariantPanel(templateId: string) {
    setExpandedTemplate(prev => prev === templateId ? null : templateId);
  }

  // Update variant selection
  function updateVariantSelection(templateId: string, property: string, value: string) {
    setSelectedVariants(prev => ({
      ...prev,
      [templateId]: {
        ...(prev[templateId] || {}),
        [property]: value,
      }
    }));
  }

  // Toggle slide selection for multi-select
  function toggleSlideSelection(templateId: string, slideName: string) {
    setSelectedSlides(prev => {
      const current = prev[templateId] || [];
      const isSelected = current.includes(slideName);
      return {
        ...prev,
        [templateId]: isSelected 
          ? current.filter(s => s !== slideName)
          : [...current, slideName],
      };
    });
  }

  // Select all slides for a template
  function selectAllSlides(templateId: string, allSlides: string[]) {
    setSelectedSlides(prev => ({
      ...prev,
      [templateId]: [...allSlides],
    }));
  }

  // Deselect all slides
  function deselectAllSlides(templateId: string) {
    setSelectedSlides(prev => ({
      ...prev,
      [templateId]: [],
    }));
  }

  // Delete template (soft delete - moves to trash)
  function confirmDeleteTemplate(id: string) {
    setDeleteConfirmId(id);
    setMoveMenuOpen(null);
  }
  
  function deleteTemplate(id: string) {
    // Safety check: verify template exists
    const templateExists = templates.find(t => t.id === id);
    if (!templateExists) {
      console.error('🛑 Template not found for soft delete:', id);
      setDeleteConfirmId(null);
      return;
    }
    
    // Soft delete - mark as deleted instead of removing
    const updated = templates.map(t => 
      t.id === id ? { ...t, deleted: true, deletedAt: Date.now() } : t
    );
    
    // Safety check: verify count is unchanged (soft delete shouldn't change count)
    if (updated.length !== templates.length) {
      console.error('🛑 Template count mismatch after soft delete');
      return;
    }
    
    setTemplates(updated);
    // Also remove from saved (all variants of this template)
    const updatedSaved = savedItems.filter(item => item.templateId !== id);
    setSavedItems(updatedSaved);
    setDeleteConfirmId(null);
  }
  
  // Restore deleted template
  function restoreTemplate(id: string) {
    // Safety check: verify template exists
    const templateExists = templates.find(t => t.id === id);
    if (!templateExists) {
      console.error('🛑 Template not found for restore:', id);
      return;
    }
    
    const updated = templates.map(t => 
      t.id === id ? { ...t, deleted: false, deletedAt: undefined } : t
    );
    
    // Safety check: verify count is unchanged
    if (updated.length !== templates.length) {
      console.error('🛑 Template count mismatch after restore');
      return;
    }
    
    setTemplates(updated);
  }
  
  // Permanently delete template
  function permanentlyDeleteTemplate(id: string) {
    // Safety check: verify template exists
    const templateToDelete = templates.find(t => t.id === id);
    if (!templateToDelete) {
      console.error('🛑 Template not found for permanent delete:', id);
      return;
    }
    
    // Only allow permanent delete if template is already soft-deleted
    if (!templateToDelete.deleted) {
      console.error('🛑 Cannot permanently delete non-trashed template');
      return;
    }
    
    const updated = templates.filter(t => t.id !== id);
    
    // Safety check: verify exactly 1 template was removed
    if (updated.length !== templates.length - 1) {
      console.error('🛑 Unexpected count change during permanent delete');
      return;
    }
    
    setTemplates(updated);
  }
  
  // Get deleted templates
  const deletedTemplates = templates.filter(t => t.deleted);
  
  // Save/Unsave template or variant
  function toggleSaveTemplate(templateId: string, variantKey?: string) {
    const item = { templateId, variantKey };
    const isSaved = savedItems.some(s => 
      s.templateId === templateId && s.variantKey === variantKey
    );
    const updated = isSaved 
      ? savedItems.filter(s => !(s.templateId === templateId && s.variantKey === variantKey))
      : [...savedItems, item];
    setSavedItems(updated);
    setMoveMenuOpen(null);
  }
  
  function isTemplateSaved(templateId: string, variantKey?: string) {
    return savedItems.some(s => 
      s.templateId === templateId && s.variantKey === variantKey
    );
  }
  
  function isAnyVariantSaved(templateId: string) {
    return savedItems.some(s => s.templateId === templateId);
  }
  
  function getSavedVariantsCount(templateId: string) {
    return savedItems.filter(s => s.templateId === templateId).length;
  }

  // Refresh template preview from published component
  function refreshTemplate(template: Template) {
    setRefreshingId(template.id);
    setMoveMenuOpen(null);
    parent.postMessage({
      pluginMessage: {
        type: 'REFRESH_TEMPLATE',
        payload: {
          templateId: template.id,
          componentKey: template.componentKey,
          isComponentSet: template.isComponentSet,
        },
      },
    }, '*');
  }

  // Move template to different category
  function moveTemplateToCategory(templateId: string, newCategory: string) {
    const updated = templates.map(t => 
      t.id === templateId ? { ...t, category: newCategory } : t
    );
    setTemplates(updated);
    setMoveMenuOpen(null);
    
    // Auto-switch to the new category to show the moved item
    setActiveCategory(newCategory);
    
    // Scroll pill and template into view
    setTimeout(() => {
      const pillElement = document.querySelector(`[data-category="${newCategory}"]`);
      if (pillElement) {
        pillElement.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
      const element = document.getElementById(`template-${templateId}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        element.classList.add('template-item--highlight');
        setTimeout(() => element.classList.remove('template-item--highlight'), 2000);
      }
    }, 200);
  }
  
  // Create new section and move template to it
  function createSectionAndMoveTemplate() {
    if (!createSectionForTemplate || !newSectionName.trim()) return;
    
    const template = templates.find(t => t.id === createSectionForTemplate);
    if (!template) return;
    
    const cloudId = template.cloudId || selectedClouds[0];
    const newCategoryId = newSectionName.trim().toLowerCase().replace(/\s+/g, '-');
    
    // Get current categories for this cloud
    const currentCategories = (cloudCategories ?? {})[cloudId] || baseCategories.filter(c => c.id !== 'all' && c.id !== 'saved');
    
    // Check if category already exists
    if (currentCategories.some(c => c.id === newCategoryId)) {
      // Just move to existing category
      moveTemplateToCategory(createSectionForTemplate, newCategoryId);
    } else {
      // Add new category to the cloud
      const newCategory = { id: newCategoryId, label: newSectionName.trim() };
      const updatedCategories = [...currentCategories, newCategory];
      
      // Update cloud categories
      const updated = { ...cloudCategories, [cloudId]: updatedCategories };
      setCloudCategories(updated);
      
      // Move template to new category
      const updatedTemplates = templates.map(t => 
        t.id === createSectionForTemplate ? { ...t, category: newCategoryId } : t
      );
      setTemplates(updatedTemplates);
      
      // Auto-switch to the new category
      setActiveCategory(newCategoryId);
      
      // Scroll pill and template into view
      setTimeout(() => {
        const pillElement = document.querySelector(`[data-category="${newCategoryId}"]`);
        if (pillElement) {
          pillElement.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
        const element = document.getElementById(`template-${createSectionForTemplate}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          element.classList.add('template-item--highlight');
          setTimeout(() => element.classList.remove('template-item--highlight'), 2000);
        }
      }, 200);
    }
    
    // Reset state
    setCreateSectionForTemplate(null);
    setNewSectionName('');
    setMoveMenuOpen(null);
  }

  // Export/Import functions removed - data is now automatically synced via backend

  // Get current cloud's figma links
  const currentCloudId = selectedClouds[0] || 'sales';
  const currentCloudFigmaLinks = cloudFigmaLinks[currentCloudId] || [];
  
  // Figma Links functions
  function addFigmaLink() {
    if (!newLinkName.trim() || !newLinkUrl.trim()) return;
    
    const newLink = {
      id: Date.now().toString(),
      name: newLinkName.trim(),
      url: newLinkUrl.trim()
    };
    
    const updatedLinks = [...currentCloudFigmaLinks, newLink];
    const updatedCloudLinks = { ...cloudFigmaLinks, [currentCloudId]: updatedLinks };
    setCloudFigmaLinks(updatedCloudLinks);
    
    setNewLinkName('');
    setNewLinkUrl('');
    setIsAddingLink(false);
  }
  
  function removeFigmaLink(id: string) {
    const updatedLinks = currentCloudFigmaLinks.filter(link => link.id !== id);
    const updatedCloudLinks = { ...cloudFigmaLinks, [currentCloudId]: updatedLinks };
    setCloudFigmaLinks(updatedCloudLinks);
  }
  
  function openFigmaLink(url: string) {
    window.open(url, '_blank');
    setShowLinksDropdown(false);
  }

  // Cloud selector functions
  function selectCloud(cloudId: string) {
    setSelectedClouds([cloudId]);
    setShowCloudSelector(false);
    setHoveredCloud(null);
  }

  function makeDefaultCloud(cloudId: string) {
    setDefaultCloud(cloudId);
    setSelectedClouds([cloudId]);
      setDefaultCloud(cloudId);
    const cloudName = allClouds.find(c => c.id === cloudId)?.name || cloudId;
    parent.postMessage({ pluginMessage: { type: 'SHOW_TOAST', message: `${cloudName} set as default` } }, '*');
    setShowCloudSelector(false);
    setHoveredCloud(null);
  }

  // Add cloud from header dropdown
  function handleCloudIconUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setNewCloudIcon(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  }

  function saveNewCloud() {
    if (newCloudName.trim() && newCloudIcon) {
      const newCloud = {
        id: `custom-${Date.now()}`,
        name: newCloudName.trim(),
        icon: newCloudIcon,
        isCustom: true,
      };
      const updatedClouds = [...customClouds, newCloud];
      setCustomClouds(updatedClouds);
      setSelectedClouds([newCloud.id]);
      setDefaultCloud(newCloud.id);
      // Seed default categories for new cloud so they persist in DB
      const defaultCats = [
        { id: 'team-housekeeping', label: 'Team Housekeeping' },
        { id: 'all', label: 'All Assets' },
        { id: 'cover-pages', label: 'Covers' },
        { id: 'components', label: 'Components' },
        { id: 'slides', label: 'Slides' },
        { id: 'resources', label: 'Resources' },
      ];
      setCloudCategories({ ...cloudCategories, [newCloud.id]: defaultCats });
      parent.postMessage({ pluginMessage: { type: 'SHOW_TOAST', message: `${newCloud.name} added!` } }, '*');
      
      // Reset form
      setNewCloudName('');
      setNewCloudIcon(null);
      setShowAddCloudModal(false);
      setShowCloudSelector(false);
    }
  }

  function cancelAddCloud() {
    setNewCloudName('');
    setNewCloudIcon(null);
    setShowAddCloudModal(false);
  }

  // editableArr, allClouds, safeHiddenClouds, safeCloudCategories defined early above (before early returns)

  // Visible clouds (excluding hidden ones)
  const visibleClouds = allClouds.filter(cloud => !safeHiddenClouds.includes(cloud.id));
  
  // Get categories for current selected cloud
  const baseCategories = selectedClouds[0] && safeCloudCategories[selectedClouds[0]] 
    ? safeCloudCategories[selectedClouds[0]] 
    : defaultCategories;
  
  // Add "Saved" icon + label pill at the end only when there are saved items
  const currentCategories = savedCount > 0 
    ? [...baseCategories, { id: 'saved', label: 'Saved', iconAndLabel: true }]
    : baseCategories;

  // Category pills overflow: when 2nd row fills, show +x and expand as accordion
  const [categoryPillsExpanded, setCategoryPillsExpanded] = useState(false);
  const [categoryPillsOverflowCount, setCategoryPillsOverflowCount] = useState(0);
  const categoryPillsCategoriesKey = currentCategories.map(c => c.id).join(',');
  const prevCategoriesKeyRef = useRef(categoryPillsCategoriesKey);
  useEffect(() => {
    if (prevCategoriesKeyRef.current !== categoryPillsCategoriesKey) {
      prevCategoriesKeyRef.current = categoryPillsCategoriesKey;
      setCategoryPillsOverflowCount(0);
      setCategoryPillsExpanded(false);
    }
  }, [categoryPillsCategoriesKey]);
  useLayoutEffect(() => {
    if (view !== 'home') return;
    // Only measure when expanded or when showing all pills (overflowCount 0)
    // When collapsed, don't re-measure to avoid feedback loop
    if (!categoryPillsExpanded && categoryPillsOverflowCount > 0) return;
    const el = categoryPillsRef.current;
    if (!el) return;
    const containerRect = el.getBoundingClientRect();
    const rowHeight = 36; // pill ~28px + gap 8px
    const maxBottom = containerRect.top + rowHeight * 2;
    let overflowCount = 0;
    for (let i = 0; i < el.children.length; i++) {
      const child = el.children[i] as HTMLElement;
      if (child.classList.contains('category-pill--overflow') || child.classList.contains('category-pills__show-less')) continue;
      if (child.getBoundingClientRect().bottom > maxBottom + 4) overflowCount++;
    }
    setCategoryPillsOverflowCount(overflowCount);
  }, [view, currentCategories, categoryPillsExpanded, categoryPillsOverflowCount]);

  // When collapsed, show one fewer pill so +x fits on row 2 (never goes to row 3)
  const visibleCategories = categoryPillsOverflowCount > 0 && !categoryPillsExpanded
    ? currentCategories.slice(0, Math.max(0, currentCategories.length - categoryPillsOverflowCount - 1))
    : currentCategories;
  const hiddenCount = currentCategories.length - visibleCategories.length;
  
  // Auto-fallback to "all" if saved category is empty
  useEffect(() => {
    if (activeCategory === 'saved' && savedCount === 0) {
      setActiveCategory('all');
    }
  }, [savedCount, activeCategory]);
  
  // Show welcome screen when Team Housekeeping is selected
  useEffect(() => {
    if (activeCategory === 'team-housekeeping') {
      setShowWelcomeScreen(true);
    }
  }, [activeCategory]);

  // Scroll to template when navigating from Activity Log
  useEffect(() => {
    if (!scrollToTemplateId || view !== 'home') return;
    const tryScroll = (attempt = 0) => {
      const el = document.getElementById(`template-${scrollToTemplateId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setScrollToTemplateId(null);
      } else if (attempt < 20) {
        setTimeout(() => tryScroll(attempt + 1), 150);
      } else {
        setScrollToTemplateId(null);
      }
    };
    const t = setTimeout(() => tryScroll(), 200);
    return () => clearTimeout(t);
  }, [scrollToTemplateId, view, contentRefreshKey]);
    
  // Helper functions for settings
  function toggleCloudVisibility(cloudId: string) {
    const current = hiddenClouds ?? [];
    const newHiddenClouds = current.includes(cloudId)
      ? current.filter(id => id !== cloudId)
      : [...current, cloudId];
    setHiddenClouds(newHiddenClouds);
  }
  
  function updateCloudCategories(cloudId: string, newCategories: Array<{id: string; label: string}>) {
    const updated = { ...(cloudCategories ?? {}), [cloudId]: newCategories };
    setCloudCategories(updated);
  }
  
  function updateStatusSymbols(newSymbols: typeof statusSymbols) {
    setStatusSymbols(newSymbols);
  }
  
  function updateCloudPOCs(cloudId: string, pocs: CloudPOC[]) {
    const newPOCs = { ...(cloudPOCs ?? {}), [cloudId]: pocs };
    setCloudPOCs(newPOCs);
  }
  
  // Delete cloud - moves to trash with all associated data
  function deleteCloud(cloudId: string) {
    const cloud = allClouds.find(c => c.id === cloudId);
    if (!cloud) return;
    
    // Gather all associated data
    const cloudTemplates = templates.filter(t => t.cloudId === cloudId);
    const cloudCats = (cloudCategories ?? {})[cloudId] || [];
    const cloudLinks = cloudFigmaLinks[cloudId] || [];
    const cloudPocsList = (cloudPOCs ?? {})[cloudId] || [];
    
    // Add to trash
    setDeletedClouds(prev => [...prev, {
      cloud,
      templates: cloudTemplates,
      categories: cloudCats,
      links: cloudLinks,
      pocs: cloudPocsList,
      deletedAt: Date.now(),
    }]);
    
    // Remove from active data
    if (cloud.isCustom) {
      setCustomClouds((customClouds ?? []).filter(c => c.id !== cloudId));
    } else {
      // For default clouds, just hide them
      setHiddenClouds([...(hiddenClouds ?? []), cloudId]);
    }
    
    // Soft delete templates (mark as deleted)
    const updatedTemplates = templates.map(t => 
      t.cloudId === cloudId ? { ...t, deleted: true, deletedAt: Date.now() } : t
    );
    setTemplates(updatedTemplates);
    
    // Clear associated data
    const newCategories = { ...(cloudCategories ?? {}) };
    delete newCategories[cloudId];
    setCloudCategories(newCategories);
    
    const newLinks = { ...(cloudFigmaLinks ?? {}) };
    delete newLinks[cloudId];
    setCloudFigmaLinks(newLinks);
    
    const newPOCs = { ...(cloudPOCs ?? {}) };
    delete newPOCs[cloudId];
    setCloudPOCs(newPOCs);
    
    // If deleted cloud was default, switch to first available
    if (defaultCloud === cloudId) {
      const firstAvailable = allClouds.find(c => c.id !== cloudId && !(hiddenClouds ?? []).includes(c.id));
      if (firstAvailable) {
        setDefaultCloud(firstAvailable.id);
        setSelectedClouds([firstAvailable.id]);
      }
    }
    
    setDeleteCloudConfirmId(null);
    parent.postMessage({ pluginMessage: { type: 'SHOW_TOAST', message: `${cloud.name} moved to trash` } }, '*');
  }
  
  // Restore cloud from trash with all associated data
  function restoreCloud(deletedCloudData: typeof deletedClouds[0]) {
    const { cloud, templates: cloudTemplates, categories, links, pocs } = deletedCloudData;
    
    // Restore cloud
    if (cloud.isCustom) {
      setCustomClouds([...(customClouds ?? []), cloud]);
    } else {
      setHiddenClouds((hiddenClouds ?? []).filter(id => id !== cloud.id));
    }
    
    // Restore templates
    const restoredTemplateIds = new Set(cloudTemplates.map(t => t.id));
    const updatedTemplates = templates.map(t => 
      restoredTemplateIds.has(t.id) ? { ...t, deleted: false, deletedAt: undefined } : t
    );
    setTemplates(updatedTemplates);
    
    // Restore categories
    if (categories.length > 0) {
      setCloudCategories({ ...cloudCategories, [cloud.id]: categories });
    }
    
    // Restore links
    if (links.length > 0) {
      setCloudFigmaLinks({ ...(cloudFigmaLinks ?? {}), [cloud.id]: links });
    }
    
    // Restore POCs
    if (pocs.length > 0) {
      setCloudPOCs({ ...(cloudPOCs ?? {}), [cloud.id]: pocs });
    }
    
    // Remove from trash
    setDeletedClouds(deletedClouds.filter(d => d.cloud.id !== cloud.id));
    
    parent.postMessage({ pluginMessage: { type: 'SHOW_TOAST', message: `${cloud.name} restored` } }, '*');
  }
  
  // Permanently delete cloud from trash
  function permanentlyDeleteCloud(cloudId: string) {
    const cloudData = deletedClouds.find(d => d.cloud.id === cloudId);
    if (!cloudData) {
      console.error('🛑 Cloud not found in trash:', cloudId);
      return;
    }
    
    // Safety check: only delete templates that are already soft-deleted
    const templateIds = new Set(cloudData.templates.map(t => t.id));
    const templatesToDelete = templates.filter(t => templateIds.has(t.id) && t.deleted);
    
    if (templatesToDelete.length !== cloudData.templates.length) {
      console.warn('⚠️ Some templates were already restored, skipping those');
    }
    
    // Calculate expected count
    const expectedCount = templates.length - templatesToDelete.length;
    const updated = templates.filter(t => !(templateIds.has(t.id) && t.deleted));
    
    // Safety check: verify count matches expectation
    if (updated.length !== expectedCount) {
      console.error('🛑 Unexpected count change during cloud permanent delete');
      return;
    }
    
    setTemplates(updated);
    
    // Remove from trash
    setDeletedClouds(deletedClouds.filter(d => d.cloud.id !== cloudId));
  }
  
  // ============ BACKUP & RESTORE FUNCTIONS ============
  
  async function loadBackups() {
    setBackupLoading(true);
    try {
      const backups = await getBackups('templates', 20);
      setBackupList(backups);
    } catch (error) {
      console.error('Failed to load backups:', error);
      parent.postMessage({ pluginMessage: { type: 'SHOW_TOAST', message: 'Failed to load backups' } }, '*');
    } finally {
      setBackupLoading(false);
    }
  }
  
  async function handleRestoreBackup(backupId: number) {
    if (!confirm('Restore from this backup? Your current data will be backed up first.')) return;
    
    setBackupRestoring(backupId);
    try {
      await restoreFromBackup('templates', backupId);
      // Reload the page to get fresh data
      parent.postMessage({ pluginMessage: { type: 'SHOW_TOAST', message: 'Backup restored! Reloading...' } }, '*');
      setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
      console.error('Failed to restore backup:', error);
      parent.postMessage({ pluginMessage: { type: 'SHOW_TOAST', message: 'Failed to restore backup' } }, '*');
    } finally {
      setBackupRestoring(null);
    }
  }
  
  async function handleCreateBackup() {
    setBackupCreating(true);
    try {
      await createManualBackup('templates', figmaUserName || undefined);
      parent.postMessage({ pluginMessage: { type: 'SHOW_TOAST', message: 'Backup created successfully!' } }, '*');
      // Reload backup list
      loadBackups();
    } catch (error) {
      console.error('Failed to create backup:', error);
      parent.postMessage({ pluginMessage: { type: 'SHOW_TOAST', message: 'Failed to create backup' } }, '*');
    } finally {
      setBackupCreating(false);
    }
  }
  
  function openBackupModal() {
    setShowBackupModal(true);
    loadBackups();
  }
  
  // ============ DATA RECOVERY FUNCTIONS ============
  
  async function loadLatestBackupSummary() {
    setDataRecoveryLoading(true);
    setDataRecoveryError(null);
    try {
      const keys = await getBackupKeys();
      const SAFE_RESTORE_TYPES = ['custom_clouds', 'templates', 'editable_clouds', 'cloud_categories'];
      let cloudCount = 0, assets = 0, sections = 0;
      let latestDate: Date | null = null;
      const backupsToRestore: { dataKey: string; backupId: number }[] = [];
      const backupIds: Record<string, number> = {};

      for (const keyInfo of keys) {
        const dataKey = keyInfo.data_key;
        if (!SAFE_RESTORE_TYPES.includes(dataKey)) continue;
        const backups = await getBackups(dataKey, 1);
        if (backups.length === 0) continue;
        const latest = backups[0];
        const itemCount = latest.itemCount ?? (latest as any).item_count ?? 0;
        const createdAt = latest.createdAt ?? (latest as any).created_at;
        const date = createdAt ? new Date(createdAt) : new Date();
        if (!latestDate || date.getTime() > latestDate.getTime()) latestDate = date;

        if (dataKey === 'templates' && itemCount === 0) continue;
        backupsToRestore.push({ dataKey, backupId: latest.id });
        backupIds[dataKey] = latest.id;

        if (dataKey === 'custom_clouds') cloudCount = itemCount;
        else if (dataKey === 'templates') assets = itemCount;
      }

      const backupDate = latestDate && !isNaN(latestDate.getTime())
        ? formatActivityTime(latestDate)
        : 'Unknown';

      // Fetch backup data to build per-cloud details table (source of truth for summary)
      const details: Array<{ cloudId: string; cloudName: string; icon: string; components: number; sections: number }> = [];
      const componentCountByCloud: Record<string, number> = {};
      const sectionCountByCloud: Record<string, number> = {};
      const cloudMap: Record<string, { name: string; icon: string }> = {};

      // Default clouds for icons/names
      clouds.forEach((c: { id: string; name: string; icon: string }) => {
        cloudMap[c.id] = { name: c.name, icon: c.icon };
      });

      try {
        if (backupIds.templates) {
          const tBackup = await getBackupById('templates', backupIds.templates);
          const tData = Array.isArray(tBackup.data) ? tBackup.data : [];
          tData.forEach((t: { cloudId?: string; isComponentSet?: boolean; variants?: unknown[]; variantCount?: number }) => {
            const cid = t.cloudId || 'sales';
            const count = t.isComponentSet && Array.isArray(t.variants) && t.variants.length > 0
              ? t.variants.length
              : (t.variantCount && t.variantCount > 0 ? t.variantCount : 1);
            componentCountByCloud[cid] = (componentCountByCloud[cid] || 0) + count;
          });
        }
        if (backupIds.custom_clouds) {
          const cBackup = await getBackupById('custom_clouds', backupIds.custom_clouds);
          const cData = Array.isArray(cBackup.data) ? cBackup.data : [];
          cData.forEach((c: { id: string; name: string; icon?: string }) => {
            cloudMap[c.id] = { name: c.name, icon: c.icon || SalesCloudIcon };
          });
        }
        // Section count = cloud categories (Team Housekeeping, Covers, Components, Slides, Resources, etc.)
        if (backupIds.cloud_categories) {
          const ccBackup = await getBackupById('cloud_categories', backupIds.cloud_categories);
          const ccData = ccBackup.data;
          if (ccData && typeof ccData === 'object' && !Array.isArray(ccData)) {
            for (const [cloudId, cats] of Object.entries(ccData)) {
              const arr = Array.isArray(cats) ? cats : [];
              sectionCountByCloud[cloudId] = arr.length;
            }
          }
        }

        // Include all clouds we know about (from components, sections, or cloud map)
        const allCloudIds = new Set([
          ...Object.keys(componentCountByCloud),
          ...Object.keys(sectionCountByCloud),
          ...Object.keys(cloudMap),
        ]);
        allCloudIds.forEach(cid => {
          const comp = componentCountByCloud[cid] || 0;
          const secs = sectionCountByCloud[cid] ?? 0;
          const info = cloudMap[cid] || { name: cid, icon: SalesCloudIcon };
          details.push({ cloudId: cid, cloudName: info.name, icon: info.icon, components: comp, sections: secs });
        });
        details.sort((a, b) => a.cloudName.localeCompare(b.cloudName));

        // Use details as source of truth for summary so table and summary always match
        cloudCount = details.length;
        assets = details.reduce((s, d) => s + d.components, 0);
        sections = details.reduce((s, d) => s + d.sections, 0);
      } catch (_) {
        // Details are optional; summary uses backup item_counts
      }

      setLatestBackupSummary({
        clouds: cloudCount,
        assets,
        sections,
        backupDate,
        backupsToRestore,
        details: details.length > 0 ? details : undefined,
      });
    } catch (error) {
      console.error('Failed to load backup summary:', error);
      setDataRecoveryError('Unable to load backups. Check your connection and try again.');
      setLatestBackupSummary(null);
    } finally {
      setDataRecoveryLoading(false);
    }
  }

  function openDataRecoveryModal() {
    setShowDataRecoveryModal(true);
    setLatestBackupSummary(null);
    loadLatestBackupSummary();
  }

  async function handleDataRecoveryRestore() {
    if (!latestBackupSummary || latestBackupSummary.backupsToRestore.length === 0) return;
    setShowRestoreConfirm(true);
  }

  async function confirmDataRecoveryRestore() {
    if (!latestBackupSummary || latestBackupSummary.backupsToRestore.length === 0) return;
    setShowRestoreConfirm(false);
    setDataRecoveryRestoring(true);
    try {
      const errors: string[] = [];
      for (const { dataKey, backupId } of latestBackupSummary.backupsToRestore) {
        try {
          await restoreFromBackup(dataKey, backupId, true);
        } catch (err) {
          console.error(`Failed to restore ${dataKey}:`, err);
          errors.push(`${dataKey}: ${(err as Error).message}`);
        }
      }
      if (errors.length > 0) {
        parent.postMessage({ pluginMessage: { type: 'SHOW_TOAST', message: `Restore had errors: ${errors.join('; ')}` } }, '*');
        setDataRecoveryError(`Some restores failed. You may need to refresh. ${errors.join('; ')}`);
        return;
      }
      parent.postMessage({ pluginMessage: { type: 'SHOW_TOAST', message: 'Backup restored!' } }, '*');
      setShowDataRecoveryModal(false);
      setDataRecoveryError(null);
      // In-place refresh - sanitize data to prevent null/undefined causing white screen
      try {
        const [customData, editableData] = await Promise.all([
          loadCustomClouds().then((d) => (Array.isArray(d) ? d : [])),
          loadEditableClouds().then((d) => (d != null ? d : null)),
        ]);
        setCustomClouds(customData);
        setEditableClouds(editableData);
        await refetchTemplates();
      } catch (refreshErr) {
        console.error('Refresh after restore:', refreshErr);
        parent.postMessage({ pluginMessage: { type: 'SHOW_TOAST', message: 'Data refreshed. If something looks wrong, close and reopen the plugin.' } }, '*');
      }
    } catch (error) {
      console.error('Failed to restore:', error);
      parent.postMessage({ pluginMessage: { type: 'SHOW_TOAST', message: 'Failed to restore backup' } }, '*');
      setDataRecoveryError('Restore failed. Your data was backed up before the attempt.');
    } finally {
      setDataRecoveryRestoring(false);
    }
  }
  
  // ============ ACTIVITY HISTORY FUNCTIONS ============
  
async function loadActivityLog(cloudId?: string) {
    setActivityLoading(true);
    try {
      const activities = await getActivityLog(100, (cloudId ?? activityHistoryCloudFilter) || undefined);
      setActivityLog(activities);
   } catch (error) {
      console.error('Failed to load activity log:', error);
      parent.postMessage({ pluginMessage: { type: 'SHOW_TOAST', message: 'Failed to load activity history' } }, '*');
    } finally {
      setActivityLoading(false);
    }
  }
  
  async function fetchActivityHistoryStats(cloudId?: string) {
    try {
      const stats = await getActivityStats(cloudId || undefined);
      setActivityHistoryStats(stats);
    } catch {
      setActivityHistoryStats(null);
    }
  }

  function openActivityHistoryModal() {
    const initialCloud = defaultCloud || visibleClouds[0]?.id || 'sales';
    setShowActivityHistoryModal(true);
    setSelectedActivities(new Set());
    setActivityHistoryCloudFilter(initialCloud);
    loadActivityLog(initialCloud);
    fetchActivityHistoryStats(initialCloud);
  }
  
  function toggleActivitySelection(activityId: number) {
    setSelectedActivities(prev => {
      const next = new Set(prev);
      if (next.has(activityId)) {
        next.delete(activityId);
      } else {
        next.add(activityId);
      }
      return next;
    });
  }
  
  function selectAllRestorableActivities() {
    const restorable = activityLog.filter(a => 
      (a.action === 'delete' || a.action === 'delete_forever') && !a.isRestored
    );
    setSelectedActivities(new Set(restorable.map(a => a.id)));
  }
  
  async function handleRestoreSelected() {
    if (selectedActivities.size === 0) return;
    
    setActivityRestoring(true);
    try {
      const result = await restoreFromActivityLog(Array.from(selectedActivities), figmaUserName || undefined);
      parent.postMessage({ pluginMessage: { type: 'SHOW_TOAST', message: result.message } }, '*');
      
      setShowActivityHistoryModal(false);
      setSelectedActivities(new Set());
      // Refresh data without full page reload (reload breaks Figma plugin)
      await refetchTemplates();
      const cloudId = activityHistoryCloudFilter || defaultCloud || visibleClouds[0]?.id || 'sales';
      loadActivityLog(cloudId);
      fetchActivityHistoryStats(cloudId);
    } catch (error) {
      console.error('Failed to restore items:', error);
      parent.postMessage({ pluginMessage: { type: 'SHOW_TOAST', message: 'Failed to restore items' } }, '*');
    } finally {
      setActivityRestoring(false);
    }
  }
  
  function getActivityActionLabel(action: string): string {
    switch (action) {
      case 'add': return 'Added to library';
      case 'update': return 'Updated';
      case 'delete': return 'Moved to Trash';
      case 'delete_forever': return 'Deleted Forever';
      case 'restore': return 'Restored';
      case 'page_structure': return 'Page structure';
      case 'section_create': return 'Section created';
      case 'section_update': return 'Section updated';
      case 'section_delete': return 'Section deleted';
      case 'poc_add': return 'POC added';
      case 'poc_update': return 'POC updated';
      case 'poc_delete': return 'POC removed';
      case 'component_insert': return 'Component inserted';
      default: return action.replace(/_/g, ' ');
    }
  }
  
  function getActivityBadgeClass(action: string): string {
    switch (action) {
      case 'add': return 'activity-badge--added';
      case 'update': return 'activity-badge--updated';
      case 'delete': return 'activity-badge--deleted';
      case 'delete_forever': return 'activity-badge--deleted-forever';
      case 'restore': return 'activity-badge--restored';
      case 'page_structure': return 'activity-badge--scaffold';
      case 'section_create': return 'activity-badge--added';
      case 'section_update': return 'activity-badge--updated';
      case 'section_delete': return 'activity-badge--deleted';
      case 'poc_add': return 'activity-badge--added';
      case 'poc_update': return 'activity-badge--updated';
      case 'poc_delete': return 'activity-badge--deleted';
      case 'component_insert': return 'activity-badge--added';
      default: return 'activity-badge--updated';
    }
  }
  
  function resetAllSettings() {
    if (confirm('Reset all settings to default? This will:\n• Show all clouds\n• Reset categories to default\n• Clear custom clouds\n• Reset default cloud\n• Reset status symbols\n• Reset page structure\n• Clear cloud POCs')) {
      setHiddenClouds([]);
      setCloudCategories({});
      setDefaultCloud('sales');
      setSelectedClouds(['sales']);
      setCustomClouds([]);
      setStatusSymbols(defaultStatusSymbols);
      setScaffoldSections(defaultScaffoldSections);
      setCloudFigmaLinks({});
      setCloudPOCs({});
      setHiddenClouds([]);
      setCloudCategories({});
      setDefaultCloud('sales');
      setCustomClouds([]);
      setStatusSymbols(defaultStatusSymbols);
      setCloudFigmaLinks({});
      setCloudPOCs({});
    }
  }

  // Onboarding completion
  function completeOnboarding(selectedCloud: string, customCloud?: {id: string; name: string; icon: string; isCustom?: boolean}) {
    // If a custom cloud was added, save it first
    let updatedCustomClouds = customClouds;
    if (customCloud) {
      updatedCustomClouds = [...customClouds, customCloud];
      setCustomClouds(updatedCustomClouds);
    }
    
    // Set selected cloud and default
    setSelectedClouds([selectedCloud]);
    setDefaultCloud(selectedCloud);
    
    // Mark onboarding as completed (this will hide the onboarding screen)
    setOnboardingState({ hasCompleted: true });
    
    // Hide splash screen
    setShowSplash(false);
    
    const cloudName = customCloud?.name || clouds.find(c => c.id === selectedCloud)?.name || selectedCloud;
    parent.postMessage({ pluginMessage: { type: 'SHOW_TOAST', message: `Welcome! Showing ${cloudName} templates` } }, '*');
  }

  // Scaffold file structure
  function scaffoldFileStructure() {
    setIsScaffolding(true);
    
    // Use selected cover variant directly
    let coverComponentKey: string | undefined;
    
    if (selectedCoverVariant) {
      if (selectedCoverVariant.variantKey) {
        // Direct variant key
        coverComponentKey = selectedCoverVariant.variantKey;
      } else {
        // Single component - get its key
        const template = templates.find(t => t.id === selectedCoverVariant.templateId);
        coverComponentKey = template?.componentKey;
      }
      console.log('Using selected cover:', selectedCoverVariant.name, 'key:', coverComponentKey);
    }
    
    // Find cover template for logging
    const coverTemplate = selectedCoverVariant 
      ? templates.find(t => t.id === selectedCoverVariant.templateId) 
      : null;
    
    console.log('Found cover template:', coverTemplate?.name, 'category:', coverTemplate?.category);
    console.log('Has variants:', coverTemplate?.isComponentSet, 'count:', coverTemplate?.variants?.length);
    console.log('Final cover component key:', coverComponentKey);
    
    // Build pages list from editable scaffold sections
    const pages: Array<{ name: string; isRename: boolean }> = [];
    
    scaffoldSections.forEach((section, sectionIndex) => {
      // Add divider before sections (except first and top-level)
      if (sectionIndex > 0 && section.name) {
        pages.push({ name: '───────────────────', isRename: false });
      }
      
      // Add section header if it has a name
      if (section.name) {
        pages.push({ name: section.name, isRename: false });
      }
      
      // Add pages in this section
      section.pages.forEach(page => {
        pages.push({
          name: page.status ? `${page.status} ${page.name}` : page.name,
          isRename: page.isRename || false
        });
      });
    });
    
    parent.postMessage({ 
      pluginMessage: { 
        type: 'SCAFFOLD_FILE_STRUCTURE',
        coverComponentKey,
        pages
      } 
    }, '*');
  }

  // Get frame details (navigates to frame details view)
  function getFrameDetails() {
    setFrameDetailsLoading(true);
    setFrameDetailsError(null);
    setFrameDetails(null);
    setView('frame-details');
    
    const isInFigma = window.parent !== window && typeof parent.postMessage === 'function';
    if (isInFigma) {
      parent.postMessage({ pluginMessage: { type: 'GET_FRAME_DETAILS' } }, '*');
    } else {
      setFrameDetailsError('This feature only works in Figma');
      setFrameDetailsLoading(false);
    }
  }

  // Simple markdown renderer for descriptions
  function renderMarkdown(text: string) {
    if (!text) return null;
    
    // Split by lines first to handle line breaks
    const lines = text.split('\n');
    
    return lines.map((line, lineIndex) => {
      // Process inline formatting
      let parts: (string | JSX.Element)[] = [line];
      
      // Bold: **text** or __text__
      parts = parts.flatMap((part, i) => {
        if (typeof part !== 'string') return part;
        const boldRegex = /\*\*(.+?)\*\*|__(.+?)__/g;
        const result: (string | JSX.Element)[] = [];
        let lastIndex = 0;
        let match;
        while ((match = boldRegex.exec(part)) !== null) {
          if (match.index > lastIndex) {
            result.push(part.substring(lastIndex, match.index));
          }
          result.push(<strong key={`b-${lineIndex}-${match.index}`}>{match[1] || match[2]}</strong>);
          lastIndex = match.index + match[0].length;
        }
        if (lastIndex < part.length) {
          result.push(part.substring(lastIndex));
        }
        return result.length > 0 ? result : [part];
      });
      
      // Italic: _text_ (but not __)
      parts = parts.flatMap((part, i) => {
        if (typeof part !== 'string') return part;
        const italicRegex = /(?<![_\w])_([^_]+)_(?![_\w])/g;
        const result: (string | JSX.Element)[] = [];
        let lastIndex = 0;
        let match;
        while ((match = italicRegex.exec(part)) !== null) {
          if (match.index > lastIndex) {
            result.push(part.substring(lastIndex, match.index));
          }
          result.push(<em key={`i-${lineIndex}-${match.index}`}>{match[1]}</em>);
          lastIndex = match.index + match[0].length;
        }
        if (lastIndex < part.length) {
          result.push(part.substring(lastIndex));
        }
        return result.length > 0 ? result : [part];
      });
      
      // Links: [text](url)
      parts = parts.flatMap((part, i) => {
        if (typeof part !== 'string') return part;
        const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
        const result: (string | JSX.Element)[] = [];
        let lastIndex = 0;
        let match;
        while ((match = linkRegex.exec(part)) !== null) {
          if (match.index > lastIndex) {
            result.push(part.substring(lastIndex, match.index));
          }
          result.push(
            <a 
              key={`l-${lineIndex}-${match.index}`} 
              href={match[2]} 
              target="_blank" 
              rel="noopener noreferrer"
              style={{ color: 'var(--slds-g-color-brand-base-50)', textDecoration: 'underline' }}
            >
              {match[1]}
            </a>
          );
          lastIndex = match.index + match[0].length;
        }
        if (lastIndex < part.length) {
          result.push(part.substring(lastIndex));
        }
        return result.length > 0 ? result : [part];
      });
      
      return (
        <span key={lineIndex}>
          {parts}
          {lineIndex < lines.length - 1 && <br />}
        </span>
      );
    });
  }

  // Check frame compliance inline (doesn't navigate)
  function checkFrameCompliance() {
    setFrameDetailsLoading(true);
    setFrameDetailsError(null);
    setFrameDetails(null);
    
    const isInFigma = window.parent !== window && typeof parent.postMessage === 'function';
    if (isInFigma) {
      parent.postMessage({ pluginMessage: { type: 'GET_FRAME_DETAILS' } }, '*');
    } else {
      setFrameDetailsError('This feature only works in Figma');
      setFrameDetailsLoading(false);
    }
  }

  const VERSION = '1.15.1';

  // Safety: after 10s, force show UI even if loading (prevents stuck blank screen)
  useEffect(() => {
    if (forceShowAfterTimeout && (selectedClouds.length === 0 || !cloudSelectionReady)) {
      setSelectedClouds(prev => (prev.length === 0 ? ['sales'] : prev));
      setCloudSelectionReady(true);
      setShowSplash(false);
    }
  }, [forceShowAfterTimeout, selectedClouds.length, cloudSelectionReady]);

  // ============ RENDER ============
  
  // Wait for onboarding state to load before rendering anything (prevents flash)
  if (!forceShowAfterTimeout && (onboardingLoading || hasCompletedOnboarding === null)) {
    return (
      <div className="splash-screen">
        <div className="splash-screen__logo">
          <img src={StarterKitIcon} alt="Starter Kit" className="splash-screen__icon" />
          <h1 className="splash-screen__title">
            <span className="onboarding__title-gradient">starter</span>
            <span className="onboarding__title-kit">KIT</span>
          </h1>
        </div>
        <div className="splash-screen__spinner">
          <Spinner size="small" />
        </div>
      </div>
    );
  }
  
  // Show onboarding for first-time users
  if (hasCompletedOnboarding === false) {
    return (
      <Onboarding 
        onComplete={completeOnboarding}
        customClouds={customClouds}
      />
    );
  }

  // Show loading state while waiting for splash screen data to sync (prevents UI snap)
  // Don't render splash screen until cloudSelectionReady is true AND selectedClouds is set
  // Skip when forceShowAfterTimeout to prevent stuck blank screen
  if (!forceShowAfterTimeout && showSplash && hasCompletedOnboarding === true && 
      (!cloudSelectionReady || selectedClouds.length === 0 || customCloudsLoading || hiddenCloudsLoading || defaultCloudLoading)) {
    return (
      <div className="splash-screen">
        <div className="splash-screen__logo">
          <img src={StarterKitIcon} alt="Starter Kit" className="splash-screen__icon" />
          <h1 className="splash-screen__title">
            <span className="onboarding__title-gradient">starter</span>
            <span className="onboarding__title-kit">KIT</span>
          </h1>
        </div>
        <div className="splash-screen__spinner">
          <Spinner size="small" />
        </div>
      </div>
    );
  }

  // Splash screen functions
  function selectCloudFromSplash(cloudId: string) {
    setSelectedClouds([cloudId]);
    setDefaultCloud(cloudId);
  }

  function enterFromSplash() {
    setShowSplash(false);
    if (!hasCompletedOnboarding) {
      setOnboardingState({ hasCompleted: true, skipSplash: false });
    }
  }

  // Show splash screen (launcher) - only after ALL data is loaded and synced (prevents UI snap)
  // This check ensures cloudSelectionReady is true AND selectedClouds has a value
  if (showSplash && hasCompletedOnboarding === true && cloudSelectionReady && selectedClouds.length > 0 && 
      !customCloudsLoading && !hiddenCloudsLoading && !defaultCloudLoading) {
    const displayedClouds = clouds.filter(c => !safeHiddenClouds.includes(c.id)).slice(0, 6); // First 6 visible default clouds
    const visibleCustomClouds = (customClouds ?? []).filter(c => !safeHiddenClouds.includes(c.id));
    const hasMoreClouds = visibleCustomClouds.length > 0;
    
    return (
      <div className="splash-screen splash-screen--launcher">
        <div className="splash-screen__logo">
          <img src={StarterKitIcon} alt="Starter Kit" className="splash-screen__icon" />
          <h1 className="splash-screen__title">
            <span className="onboarding__title-gradient">starter</span>
            <span className="onboarding__title-kit">KIT</span>
            </h1>
          <p className="splash-screen__tagline">Get, Set Go with your design assets</p>
          </div>
        
        <img src={StarterKitIllustration} alt="Starter Kit" className="splash-screen__illustration" />

        <div className="splash-screen__selection">
          <p className="splash-screen__label">Select your cloud</p>
          
          <div className="splash-screen__clouds">
            {displayedClouds.map(cloud => (
              <button
                key={cloud.id}
                className={`splash-screen__cloud-btn ${selectedClouds[0] === cloud.id ? 'is-selected' : ''}`}
                onClick={() => selectCloudFromSplash(cloud.id)}
                title={cloud.name}
              >
                <img src={cloud.icon} alt={cloud.name} />
              </button>
            ))}
            
            {/* More clouds dropdown */}
            <div className="splash-screen__more-container" ref={splashMoreDropdownRef}>
              <button 
                className={`splash-screen__cloud-btn splash-screen__more-btn ${showMoreCloudsInSplash ? 'is-open' : ''}`}
                onClick={() => setShowMoreCloudsInSplash(!showMoreCloudsInSplash)}
                title="More clouds"
              >
                <span>•••</span>
              </button>
              
              {showMoreCloudsInSplash && (
                <div className="splash-screen__more-dropdown">
                  {visibleCustomClouds.length > 0 && (
                    <>
                      <div className="splash-screen__dropdown-label">Your Clouds</div>
                      {visibleCustomClouds.map(cloud => (
                        <button
                          key={cloud.id}
                          className={`splash-screen__dropdown-item ${selectedClouds[0] === cloud.id ? 'is-selected' : ''}`}
                          onClick={() => { selectCloudFromSplash(cloud.id); setShowMoreCloudsInSplash(false); }}
                        >
                          <img src={cloud.icon} alt={cloud.name} />
                          <span>{cloud.name}</span>
                        </button>
                      ))}
                    </>
                  )}
                  <button 
                    className="splash-screen__dropdown-add"
                    onClick={() => { setShowMoreCloudsInSplash(false); setShowAddCloudModal(true); }}
                  >
                    <span>+</span>
                    <span>Add Cloud / Team</span>
                  </button>
        </div>
              )}
        </div>
          </div>
        </div>

        {/* Only show button when cloud selection is ready (prevents flash/reload) */}
        {cloudSelectionReady && selectedClouds.length > 0 && (
          <button className="splash-screen__cta" onClick={enterFromSplash}>
            Get Started →
          </button>
        )}

        <span className="splash-screen__version">v{VERSION}</span>

        {/* Add Cloud Modal (for splash screen) */}
        {showAddCloudModal && (
          <div className="modal-overlay" onClick={cancelAddCloud}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal__header">
                <h3 className="modal__title">Add Cloud / Team</h3>
                <button className="modal__close" onClick={cancelAddCloud}>×</button>
            </div>
              <div className="modal__body">
                <div 
                  className="modal__icon-upload"
                  onClick={() => cloudIconInputRef.current?.click()}
                >
                  {newCloudIcon ? (
                    <img src={newCloudIcon} alt="Icon" className="modal__uploaded-icon" />
                  ) : (
                    <div className="modal__icon-placeholder">
                      <span>+</span>
                      <span className="modal__icon-hint">Upload Icon</span>
                    </div>
                  )}
                  <input
                    ref={cloudIconInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleCloudIconUpload}
                    style={{ display: 'none' }}
                  />
                </div>
              <Input
                  label="Cloud or Team Name"
                  placeholder="e.g. Data Cloud, My Team"
                  value={newCloudName}
                  onChange={(e) => setNewCloudName(e.target.value)}
                />
              </div>
              <div className="modal__footer">
                <Button variant="neutral" onClick={cancelAddCloud}>Cancel</Button>
                <Button 
                  variant="brand" 
                  onClick={saveNewCloud}
                  disabled={!newCloudName.trim() || !newCloudIcon}
                >
                  Add Cloud
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
  
  // Show loading state while data is loading (but onboarding state is known)
  // Skip when forceShowAfterTimeout to prevent stuck blank screen
  if (!forceShowAfterTimeout && isLoading) {
    return (
      <div className="app">
        <div className="loading-state">
          <Spinner size="large" />
          <p className="loading-state__text">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`app ${view === 'settings' ? 'view-settings' : ''} ${isDarkMode ? 'dark-mode' : ''}`}>
      {/* Header Container - Fixed, Non-scrollable */}
      <div className="header-container">
        <div className="sticky-header">
        <header className="header">
          {/* Plugin Branding from Selected Frame - Hidden for now */}
          {false && pluginBranding && (
            <div className="header__branding">
              <img 
                src={pluginBranding} 
                alt={frameName || 'Plugin Branding'} 
                className="header__branding-image"
              />
            </div>
          )}
          <div className="header__row">
            <div className="header__left-group" ref={cloudSelectorRef}>
              <img 
                src={allClouds.find(c => c.id === selectedClouds[0])?.icon || SalesCloudIcon} 
                alt="Cloud" 
                className="header__logo" 
              />
              <button 
                className="header__cloud-selector"
                onClick={() => setShowCloudSelector(!showCloudSelector)}
              >
                <span className="header__welcome-text">
                  Welcome to the {selectedClouds.length > 0 && allClouds.find(c => c.id === selectedClouds[0]) ? (
                    <span className="header__cloud-name">{allClouds.find(c => c.id === selectedClouds[0])!.name}</span>
                  ) : ''} Starter Kit
                </span>
                <svg className="header__dropdown-caret" width="10" height="6" viewBox="0 0 10 6" fill="currentColor">
                  <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                </svg>
              </button>
              
              {showCloudSelector && !showAddCloudModal && (
              <div className="cloud-selector-dropdown">
                <div className="cloud-selector-dropdown__header">Select Cloud</div>
                {visibleClouds.map(cloud => (
                  <div 
                    key={cloud.id}
                    className={`cloud-selector-dropdown__item ${selectedClouds[0] === cloud.id ? 'is-selected' : ''}`}
                    onMouseEnter={() => setHoveredCloud(cloud.id)}
                    onMouseLeave={() => setHoveredCloud(null)}
                    onClick={() => selectCloud(cloud.id)}
                  >
                    <img src={cloud.icon} alt={cloud.name} className="cloud-selector-dropdown__icon" />
                    <span className="cloud-selector-dropdown__name">{cloud.name}</span>
                    {defaultCloud === cloud.id && (
                      <span className="cloud-selector-dropdown__default-badge">Default</span>
                    )}
                    {hoveredCloud === cloud.id && defaultCloud !== cloud.id && (
                      <button 
                        className="cloud-selector-dropdown__make-default"
                        onClick={(e) => { e.stopPropagation(); makeDefaultCloud(cloud.id); }}
                      >
                        Make Default
                      </button>
                    )}
            </div>
                ))}
                <div 
                  className="cloud-selector-dropdown__add"
                  onClick={() => setShowAddCloudModal(true)}
                >
                  <span className="cloud-selector-dropdown__add-icon">+</span>
                  <span>Add Cloud / Team</span>
              </div>
              </div>
            )}
            </div>
            
            <div className="header__actions">
              {view === 'home' ? (
                <>
                  {/* Dark Mode Toggle */}
                  <button 
                    className="header__icon-btn header__dark-toggle"
                    onClick={() => setIsDarkMode(!isDarkMode)}
                    title={isDarkMode ? 'Light mode' : 'Dark mode'}
                  >
                    {isDarkMode ? (
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2">
                        <circle cx="8" cy="8" r="3"/>
                        <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M3.05 12.95l1.41-1.41M11.54 4.46l1.41-1.41"/>
                      </svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2">
                        <path d="M13.5 10.5A6 6 0 015.5 2.5 6 6 0 1013.5 10.5z"/>
                      </svg>
                    )}
                  </button>
                  
                  {/* More Menu (Export/Import) */}
                  <div className="header__dropdown-container" ref={moreMenuRef}>
                    <button 
                      className="header__icon-btn"
                      onClick={() => setShowMoreMenu(!showMoreMenu)}
                      title="More options"
                    >
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                        <circle cx="8" cy="3" r="1.5"/>
                        <circle cx="8" cy="8" r="1.5"/>
                        <circle cx="8" cy="13" r="1.5"/>
                      </svg>
                    </button>
                    
                    {showMoreMenu && (
                      <div className="header__dropdown header__dropdown--compact">
                        <button 
                          className="header__dropdown-menu-item"
                          onClick={() => { setView('settings'); setExpandedCloudId(defaultCloud); setShowMoreMenu(false); }}
                        >
                          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="2" y="3" width="12" height="2" rx="0.5"/>
                            <rect x="2" y="6" width="12" height="2" rx="0.5"/>
                            <rect x="2" y="9" width="12" height="2" rx="0.5"/>
                            <rect x="2" y="12" width="8" height="2" rx="0.5"/>
                          </svg>
                          Manage Clouds and Sections
                        </button>
                        <button 
                          className="header__dropdown-menu-item"
                          onClick={(e) => { 
                            e.preventDefault();
                            e.stopPropagation();
                            setShowMoreMenu(false);
                            setView('housekeeping-admin');
                          }}
                        >
                          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="2" y="2" width="12" height="12" rx="2"/>
                            <path d="M5 5h6M5 8h6M5 11h4"/>
                          </svg>
                          Team Housekeeping
                        </button>
                        <button 
                          className="header__dropdown-menu-item"
                          onClick={() => { startAddFlow(); setShowMoreMenu(false); }}
                        >
                          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                          </svg>
                          Add asset
                        </button>
                        <button 
                          className="header__dropdown-menu-item"
                          onClick={() => { setView('scaffold'); setShowMoreMenu(false); }}
                        >
                          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M2 2h12v12H2V2zm1 1v10h10V3H3zm1 1h8v1H4V4zm0 2h8v1H4V6zm0 2h8v1H4V8zm0 2h5v1H4v-1z"/>
                          </svg>
                          Create Pages
                        </button>
                        {deletedTemplates.length > 0 && (
                          <>
                            <div className="header__dropdown-divider"></div>
                            <button 
                              className="header__dropdown-menu-item"
                              onClick={() => { setShowTrashModal(true); setShowMoreMenu(false); }}
                            >
                              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                                <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
                                <path fillRule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
                              </svg>
                              Trash ({deletedTemplates.length})
                            </button>
                          </>
                        )}
                        <div className="header__dropdown-divider"></div>
                        <button 
                          className="header__dropdown-menu-item"
                          onClick={() => { openActivityHistoryModal(); setShowMoreMenu(false); }}
                        >
                          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"/>
                            <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z"/>
                          </svg>
                          Activity Log
                        </button>
                        <button 
                          className="header__dropdown-menu-item"
                          onClick={() => { openDataRecoveryModal(); setShowMoreMenu(false); }}
                        >
                          <svg width="14" height="14" viewBox="-2 -2 28 28" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                            <path d="M12 2L3 7v6c0 5.5 3.8 10.7 9 12 5.2-1.3 9-6.5 9-12V7l-9-5z"/>
                          </svg>
                          Version History
                        </button>
                      </div>
                    )}
                  </div>
                </>
              ) : null}
            </div>
          </div>
          
          {/* Subtitle and POC row - below cloud selector, only on home */}
          {view === 'home' && (
            <>
              <p className="header__subtitle">Get set, go with team-ready kits—fast and consistent.</p>
              <div className="header__poc-row">
                <div className="header__poc-left">
                  <span className="header__poc-label">
                    {selectedClouds.length > 0 && allClouds.find(c => c.id === selectedClouds[0])
                      ? `${allClouds.find(c => c.id === selectedClouds[0])!.name} POC: `
                      : 'POC: '}
                  </span>
                  <span className="header__poc-list">
                    <button type="button" className="header__poc-link">Justin Carter</button>
                    <span className="header__poc-separator">|</span>
                    <button type="button" className="header__poc-link">Prantik Banerjee</button>
                  </span>
                </div>
                {selectedClouds.length > 0 && (
                  <div className="header__dropdown-container" ref={linksDropdownRef}>
                    <button 
                      className="header__icon-btn header__icon-btn--figma"
                      onClick={() => setShowLinksDropdown(!showLinksDropdown)}
                      title="important team figma links"
                    >
                      <svg width="14" height="14" viewBox="0 0 38 57" fill="currentColor">
                        <path fillRule="evenodd" clipRule="evenodd" d="M19 28.5C19 23.2533 23.2533 19 28.5 19C33.7467 19 38 23.2533 38 28.5C38 33.7467 33.7467 38 28.5 38C23.2533 38 19 33.7467 19 28.5Z" fill="#1ABCFE"/>
                        <path fillRule="evenodd" clipRule="evenodd" d="M0 47.5C0 42.2533 4.25329 38 9.5 38H19V47.5C19 52.7467 14.7467 57 9.5 57C4.25329 57 0 52.7467 0 47.5Z" fill="#0ACF83"/>
                        <path fillRule="evenodd" clipRule="evenodd" d="M19 0V19H28.5C33.7467 19 38 14.7467 38 9.5C38 4.25329 33.7467 0 28.5 0H19Z" fill="#FF7262"/>
                        <path fillRule="evenodd" clipRule="evenodd" d="M0 9.5C0 14.7467 4.25329 19 9.5 19H19V0H9.5C4.25329 0 0 4.25329 0 9.5Z" fill="#F24E1E"/>
                        <path fillRule="evenodd" clipRule="evenodd" d="M0 28.5C0 33.7467 4.25329 38 9.5 38H19V19H9.5C4.25329 19 0 23.2533 0 28.5Z" fill="#A259FF"/>
                      </svg>
                    </button>
                    {showLinksDropdown && (
                      <div className="header__dropdown">
                        <div className="header__dropdown-header">
                          <span className="header__dropdown-title">Important Figma links</span>
                          <button 
                            className="header__dropdown-add"
                            onClick={() => setIsAddingLink(!isAddingLink)}
                          >
                            {isAddingLink ? '×' : '+'}
                          </button>
                        </div>
                        {isAddingLink && (
                          <div className="header__dropdown-form">
                            <input
                              type="text"
                              placeholder="Link name"
                              value={newLinkName}
                              onChange={(e) => setNewLinkName(e.target.value)}
                              className="header__dropdown-input"
                            />
                            <input
                              type="text"
                              placeholder="Figma URL"
                              value={newLinkUrl}
                              onChange={(e) => setNewLinkUrl(e.target.value)}
                              className="header__dropdown-input"
                            />
                            <button 
                              className="header__dropdown-save"
                              onClick={() => {
                                const currentCloudId = selectedClouds[0];
                                if (!newLinkName.trim() || !newLinkUrl.trim()) return;
                                const newLink = { id: Date.now().toString(), name: newLinkName.trim(), url: newLinkUrl.trim() };
                                const currentLinks = cloudFigmaLinks[currentCloudId] || [];
                                const updatedLinks = [...currentLinks, newLink];
                                const updatedCloudLinks = { ...cloudFigmaLinks, [currentCloudId]: updatedLinks };
                                setCloudFigmaLinks(updatedCloudLinks);
                                parent.postMessage({ pluginMessage: { type: 'SAVE_CLOUD_FIGMA_LINKS', links: updatedCloudLinks } }, '*');
                                setNewLinkName('');
                                setNewLinkUrl('');
                                setIsAddingLink(false);
                              }}
                            >
                              Save
                            </button>
                          </div>
                        )}
                        <div className="header__dropdown-links">
                          {(cloudFigmaLinks[selectedClouds[0]] || []).length === 0 && !isAddingLink ? (
                            <p className="header__dropdown-empty">No links added yet</p>
                          ) : (
                            (cloudFigmaLinks[selectedClouds[0]] || []).map(link => (
                              <div key={link.id} className="header__dropdown-link">
                                <button 
                                  className="header__dropdown-link-btn"
                                  onClick={() => openFigmaLink(link.url)}
                                >
                                  {link.name}
                                </button>
                                <button 
                                  className="header__dropdown-link-delete"
                                  onClick={() => {
                                    const currentCloudId = selectedClouds[0];
                                    const currentLinks = cloudFigmaLinks[currentCloudId] || [];
                                    const updatedLinks = currentLinks.filter(l => l.id !== link.id);
                                    const updatedCloudLinks = { ...cloudFigmaLinks, [currentCloudId]: updatedLinks };
                                    setCloudFigmaLinks(updatedCloudLinks);
                                    parent.postMessage({ pluginMessage: { type: 'SAVE_CLOUD_FIGMA_LINKS', links: updatedCloudLinks } }, '*');
                                  }}
                                >
                                  ×
                                </button>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </header>

        {/* Search Bar (only on home) */}
        {view === 'home' && (
          <div className="home-search-section">
            <div className="home-search-wrapper">
              <svg className="home-search-icon" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2">
                <circle cx="7" cy="7" r="4.5"/>
                <path d="M10.5 10.5l3 3"/>
              </svg>
              <input
                ref={searchInputRef}
                type="text"
                className="home-search-input"
                placeholder="What do you want to get started with ?"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowSearchSuggestions(true);
                  setSelectedSuggestionIndex(-1);
                  if (e.target.value.trim()) {
                    setShowWelcomeScreen(false);
                    // Don't change category - search works across all
                  } else {
                    setShowWelcomeScreen(true);
                    setActiveCategory('team-housekeeping');
                  }
                }}
                onFocus={() => {
                  if (searchQuery.trim()) {
                    setShowSearchSuggestions(true);
                  }
                }}
                onBlur={() => {
                  // Delay to allow click on suggestion
                  setTimeout(() => setShowSearchSuggestions(false), 200);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setSelectedSuggestionIndex(prev => 
                      prev < searchSuggestions.length - 1 ? prev + 1 : prev
                    );
                  } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setSelectedSuggestionIndex(prev => prev > 0 ? prev - 1 : -1);
                  } else if (e.key === 'Enter' && selectedSuggestionIndex >= 0) {
                    e.preventDefault();
                    const suggestion = searchSuggestions[selectedSuggestionIndex];
                    if (suggestion) {
                      navigateToSearchResult(suggestion);
                    }
                  } else if (e.key === 'Escape') {
                    setShowSearchSuggestions(false);
                  }
                }}
              />
              {/* Search Suggestions Dropdown */}
              {showSearchSuggestions && searchSuggestions.length > 0 && (
                <div className="search-suggestions">
                  {/* Header showing which cloud we're searching in */}
                  <div className="search-suggestions__header">
                    Searching within {clouds.find(c => c.id === selectedClouds[0])?.name || 'All Clouds'}
                  </div>
                  {searchSuggestions.map((suggestion, index) => (
                    <button
                      key={`${suggestion.type}-${suggestion.value}`}
                      className={`search-suggestion ${index === selectedSuggestionIndex ? 'search-suggestion--selected' : ''}`}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        navigateToSearchResult(suggestion);
                      }}
                      onMouseEnter={() => setSelectedSuggestionIndex(index)}
                    >
                      <span className="search-suggestion__label">{suggestion.label}</span>
                      <span className="search-suggestion__type">
                        {suggestion.type === 'variant' ? 'Variant' : suggestion.type === 'template' ? 'Template' : 'Category'}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Category Pills (only on home) */}
        {view === 'home' && (
          <div
            ref={categoryPillsRef}
            className="category-pills"
          >
            {visibleCategories.map(cat => (
              <button
                key={cat.id}
                className={`category-pill ${cat.iconAndLabel ? 'category-pill--icon-label' : ''} ${activeCategory === cat.id ? 'category-pill--selected' : ''}`}
                data-category={cat.id}
                onClick={() => {
                  setActiveCategory(cat.id);
                  if (cat.id !== 'team-housekeeping') {
                    setShowWelcomeScreen(false);
                  } else {
                    setShowWelcomeScreen(true);
                  }
                }}
                title={cat.label}
              >
                {cat.iconAndLabel ? (
                  <>
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M2 2v13.5a.5.5 0 0 0 .74.439L8 13.069l5.26 2.87A.5.5 0 0 0 14 15.5V2a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z"/>
                    </svg>
                    <span>{cat.label}</span>
                  </>
                ) : (
                  cat.label
                )}
              </button>
            ))}
            {categoryPillsOverflowCount > 0 && !categoryPillsExpanded && (
              <button
                type="button"
                className="category-pill category-pill--overflow"
                onClick={() => setCategoryPillsExpanded(true)}
              >
                +{hiddenCount}
              </button>
            )}
            {categoryPillsOverflowCount > 0 && categoryPillsExpanded && (
              <button
                type="button"
                className="category-pills__show-less"
                onClick={() => setCategoryPillsExpanded(false)}
              >
                Show less
              </button>
            )}
          </div>
        )}
        </div>
      </div>

      {/* Content Container - Scrollable */}
      <div className="content-container">
        <div className={`content ${view === 'scaffold' ? 'content--scaffold' : ''}`} key={view === 'home' ? `home-${contentRefreshKey}` : 'scaffold'}>
        {view === 'scaffold' ? (
          <div className="scaffold-section scaffold-section--fixed-footer">
            <div className="scaffold-section__scrollable">
              <button 
                className="scaffold-section__back"
                onClick={() => setView('home')}
              >
                <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                  <path fillRule="evenodd" d="M15 8a.5.5 0 0 0-.5-.5H2.707l3.147-3.146a.5.5 0 1 0-.708-.708l-4 4a.5.5 0 0 0 0 .708l4 4a.5.5 0 0 0 .708-.708L2.707 8.5H14.5A.5.5 0 0 0 15 8z"/>
                </svg>
                Back
              </button>
              <h3 className="scaffold-section__title">Create Page Structure</h3>
              <p className="scaffold-section__desc">
                {isEditingScaffold ? 'Edit your page structure below' : 'Creates the team page structure in your Figma file'}
              </p>
              
              {/* Editable or Read-only preview based on mode */}
              <div className={`scaffold-preview ${isEditingScaffold ? 'scaffold-preview--editable' : 'scaffold-preview--readonly'}`}>
                {scaffoldSections.map((section, sectionIndex) => (
                  <div key={section.id} className="scaffold-section-block">
                    {(section.name || section.isDivider || (!section.name && section.pages.length === 0)) ? (
                      <>
                        {sectionIndex > 0 && (
                          <div 
                            className="scaffold-preview__divider"
                            style={{ position: 'relative' }}
                          >
                            {isEditingScaffold && (
                              <div style={{ 
                                position: 'absolute', 
                                right: 0, 
                                top: '50%', 
                                transform: 'translateY(-50%)',
                                display: 'flex',
                                gap: '4px',
                                opacity: 0,
                                transition: 'opacity 0.15s ease'
                              }}
                              className="scaffold-divider__actions"
                              >
                                {(section.isDivider || (!section.name && section.pages.length === 0)) ? (
                                  // Delete button for divider-only sections (check both isDivider flag and empty name with no pages)
                                  <button
                                    className="scaffold-divider__delete"
                                    onClick={() => {
                                      setScaffoldSections(scaffoldSections.filter((_, i) => i !== sectionIndex));
                                    }}
                                    title="Delete divider"
                                    style={{
                                      background: 'none',
                                      border: 'none',
                                      cursor: 'pointer',
                                      padding: '2px 6px',
                                      borderRadius: '4px',
                                      color: 'var(--slds-g-color-neutral-base-60)',
                                      display: 'flex',
                                      alignItems: 'center',
                                      fontSize: '16px',
                                      lineHeight: '1',
                                      transition: 'all 0.15s ease'
                                    }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.background = 'var(--slds-g-color-error-base-40)';
                                      e.currentTarget.style.color = 'white';
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.background = 'none';
                                      e.currentTarget.style.color = 'var(--slds-g-color-neutral-base-60)';
                                    }}
                                  >×</button>
                                ) : (
                                  // Duplicate button for regular sections
                                  <button
                                    className="scaffold-divider__duplicate"
                                    onClick={() => {
                                      // Duplicate the section above this divider
                                      const sectionToDuplicate = scaffoldSections[sectionIndex - 1];
                                      const duplicatedSection: ScaffoldSection = {
                                        id: `section-${Date.now()}`,
                                        name: `${sectionToDuplicate.name} (Copy)`,
                                        pages: sectionToDuplicate.pages.map(page => ({
                                          ...page,
                                          id: `page-${Date.now()}-${Math.random()}`
                                        }))
                                      };
                                      const newSections = [...scaffoldSections];
                                      newSections.splice(sectionIndex, 0, duplicatedSection);
                                      setScaffoldSections(newSections);
                                    }}
                                    title="Duplicate section above"
                                    style={{
                                      background: 'none',
                                      border: 'none',
                                      cursor: 'pointer',
                                      padding: '2px 4px',
                                      borderRadius: '4px',
                                      color: 'var(--slds-g-color-neutral-base-60)',
                                      display: 'flex',
                                      alignItems: 'center'
                                    }}
                                  >
                                    <svg width="12" height="12" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                                      <path d="M9.33333 0.583252H2.33333C1.6875 0.583252 1.16667 1.10409 1.16667 1.74992V9.33325H2.33333V1.74992H9.33333V0.583252ZM11.6667 2.91659H4.66667C4.02083 2.91659 3.5 3.43742 3.5 4.08325V11.6666C3.5 12.3124 4.02083 12.8333 4.66667 12.8333H11.6667C12.3125 12.8333 12.8333 12.3124 12.8333 11.6666V4.08325C12.8333 3.43742 12.3125 2.91659 11.6667 2.91659ZM11.6667 11.6666H4.66667V4.08325H11.6667V11.6666Z" fill="currentColor"/>
                                    </svg>
                                  </button>
                                )}
                              </div>
                            )}
                            ───────────────────
                          </div>
                        )}
                        {(section.isDivider || (!section.name && section.pages.length === 0)) ? (
                          // Divider-only section - no header, just the divider line above
                          null
                        ) : isEditingScaffold ? (
                          <div 
                            className={`scaffold-section-header ${draggedItem?.type === 'scaffold-section' && draggedItem.index === sectionIndex ? 'is-dragging' : ''}`}
                            draggable={sectionIndex > 0}
                            onDragStart={(e) => { if (sectionIndex > 0) { setDraggedItem({ type: 'scaffold-section', index: sectionIndex }); e.dataTransfer.effectAllowed = 'move'; }}}
                            onDragEnd={() => { setDraggedItem(null); setDragOverIndex(null); }}
                            onDragOver={(e) => { e.preventDefault(); if (draggedItem?.type === 'scaffold-section' && draggedItem.index !== sectionIndex && sectionIndex > 0) setDragOverIndex(sectionIndex); }}
                            onDragLeave={() => setDragOverIndex(null)}
                            onDrop={(e) => {
                              e.preventDefault();
                              if (draggedItem?.type === 'scaffold-section' && draggedItem.index !== sectionIndex) {
                                const newSections = [...scaffoldSections];
                                const [removed] = newSections.splice(draggedItem.index, 1);
                                newSections.splice(sectionIndex, 0, removed);
                                setScaffoldSections(newSections);
                              }
                              setDraggedItem(null); setDragOverIndex(null);
                            }}
                          >
                            <div className="gripper-handle">
                              <svg className="gripper-handle__icon" viewBox="0 0 10 16" fill="currentColor">
                                <circle cx="3" cy="2" r="1.5"/><circle cx="7" cy="2" r="1.5"/>
                                <circle cx="3" cy="8" r="1.5"/><circle cx="7" cy="8" r="1.5"/>
                                <circle cx="3" cy="14" r="1.5"/><circle cx="7" cy="14" r="1.5"/>
                              </svg>
                            </div>
                            <input
                              type="text"
                              className="scaffold-section-header__input"
                              value={section.name}
                              onChange={(e) => {
                                const newSections = [...scaffoldSections];
                                newSections[sectionIndex] = { ...section, name: e.target.value };
                                setScaffoldSections(newSections);
                              }}
                              onMouseDown={(e) => {
                                // Allow text selection in input fields
                                e.stopPropagation();
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  // Add new section after current one
                                  const newSections = [...scaffoldSections];
                                  const newSection: ScaffoldSection = {
                                    id: `section-${Date.now()}`,
                                    name: 'NEW SECTION',
                                    pages: [{ id: `page-${Date.now()}`, name: 'New Page', status: '🟢' }]
                                  };
                                  newSections.splice(sectionIndex + 1, 0, newSection);
                                  setScaffoldSections(newSections);
                                  // Focus the new input after a brief delay
                                  setTimeout(() => {
                                    const inputs = document.querySelectorAll('.scaffold-section-header__input');
                                    const newInput = inputs[sectionIndex + 1] as HTMLInputElement;
                                    if (newInput) {
                                      newInput.focus();
                                      newInput.select();
                                    }
                                  }, 10);
                                }
                              }}
                            />
                            <button 
                              className="scaffold-section-header__duplicate" 
                              onClick={() => {
                                const duplicatedSection: ScaffoldSection = {
                                  id: `section-${Date.now()}`,
                                  name: `${section.name} (Copy)`,
                                  pages: section.pages.map(page => ({
                                    ...page,
                                    id: `page-${Date.now()}-${Math.random()}`
                                  }))
                                };
                                const newSections = [...scaffoldSections];
                                newSections.splice(sectionIndex + 1, 0, duplicatedSection);
                                setScaffoldSections(newSections);
                              }}
                              title="Duplicate section"
                            >
                              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M9.33333 0.583252H2.33333C1.6875 0.583252 1.16667 1.10409 1.16667 1.74992V9.33325H2.33333V1.74992H9.33333V0.583252ZM11.6667 2.91659H4.66667C4.02083 2.91659 3.5 3.43742 3.5 4.08325V11.6666C3.5 12.3124 4.02083 12.8333 4.66667 12.8333H11.6667C12.3125 12.8333 12.8333 12.3124 12.8333 11.6666V4.08325C12.8333 3.43742 12.3125 2.91659 11.6667 2.91659ZM11.6667 11.6666H4.66667V4.08325H11.6667V11.6666Z" fill="currentColor"/>
                              </svg>
                            </button>
                            <button className="scaffold-section-header__delete" onClick={() => {
                              if (confirm(`Delete "${section.name}" section?`)) {
                                setScaffoldSections(scaffoldSections.filter((_, i) => i !== sectionIndex));
                                const cloud = allClouds.find(c => c.id === selectedClouds[0]);
                                logActivityFromClient({ action: 'page_structure', assetId: 'scaffold-section-delete', assetName: `Deleted section "${section.name}"`, cloudId: selectedClouds[0] || undefined, cloudName: cloud?.name, userName: figmaUserName || undefined });
                              }
                            }}>×</button>
                          </div>
                        ) : (
                          <div className="scaffold-section-header scaffold-section-header--readonly">
                            <span className="scaffold-section-header__name">{section.name}</span>
                </div>
              )}
                      </>
                    ) : null}
                    
                    {section.pages.map((page, pageIndex) => (
                      <div 
                        key={page.id} 
                        className={`scaffold-preview__item ${section.name ? 'scaffold-preview__item--indent' : ''} ${!isEditingScaffold ? 'scaffold-preview__item--readonly' : ''}`}
                        draggable={isEditingScaffold}
                        onDragStart={(e) => { 
                          // Only start drag if not clicking on input field
                          const target = e.target as HTMLElement;
                          if (target.tagName === 'INPUT' || target.closest('input')) {
                            e.preventDefault();
                            return;
                          }
                          if (isEditingScaffold) { 
                            setDraggedItem({ type: `page-${sectionIndex}`, index: pageIndex }); 
                            e.dataTransfer.effectAllowed = 'move'; 
                          }
                        }}
                        onDragEnd={() => { setDraggedItem(null); setDragOverIndex(null); }}
                        onDragOver={(e) => { if (isEditingScaffold) { e.preventDefault(); if (draggedItem?.type === `page-${sectionIndex}` && draggedItem.index !== pageIndex) setDragOverIndex(pageIndex); }}}
                        onDragLeave={() => setDragOverIndex(null)}
                        onDrop={(e) => {
                          e.preventDefault();
                          if (draggedItem?.type === `page-${sectionIndex}` && draggedItem.index !== pageIndex) {
                            const newSections = [...scaffoldSections];
                            const newPages = [...section.pages];
                            const [removed] = newPages.splice(draggedItem.index, 1);
                            newPages.splice(pageIndex, 0, removed);
                            newSections[sectionIndex] = { ...section, pages: newPages };
                            setScaffoldSections(newSections);
                          }
                          setDraggedItem(null); setDragOverIndex(null);
                        }}
                      >
                        {isEditingScaffold && (
                          <div className="gripper-handle gripper-handle--small">
                            <svg className="gripper-handle__icon" viewBox="0 0 10 16" fill="currentColor">
                              <circle cx="3" cy="2" r="1.5"/><circle cx="7" cy="2" r="1.5"/>
                              <circle cx="3" cy="8" r="1.5"/><circle cx="7" cy="8" r="1.5"/>
                              <circle cx="3" cy="14" r="1.5"/><circle cx="7" cy="14" r="1.5"/>
                            </svg>
            </div>
                        )}
                        {section.name && isEditingScaffold && (
                          <button
                            className="scaffold-preview__status-btn"
                            onClick={() => {
                              const symbols = [...(statusSymbols ?? []).map(s => s.symbol), null];
                              const currentIdx = page.status ? symbols.indexOf(page.status) : symbols.length - 1;
                              const nextIdx = (currentIdx + 1) % symbols.length;
                              const newSections = [...scaffoldSections];
                              const newPages = [...section.pages];
                              newPages[pageIndex] = { ...page, status: symbols[nextIdx] };
                              newSections[sectionIndex] = { ...section, pages: newPages };
                              setScaffoldSections(newSections);
                            }}
                          >{page.status || '+'}</button>
                        )}
                        {!isEditingScaffold && page.status && <span className="scaffold-preview__status">{page.status}</span>}
                        {isEditingScaffold ? (
                          <input
                            type="text"
                            className="scaffold-preview__input"
                            value={page.name}
                            onChange={(e) => {
                              const newSections = [...scaffoldSections];
                              const newPages = [...section.pages];
                              newPages[pageIndex] = { ...page, name: e.target.value };
                              newSections[sectionIndex] = { ...section, pages: newPages };
                              setScaffoldSections(newSections);
                            }}
                            onMouseDown={(e) => {
                              // Allow text selection in input fields
                              e.stopPropagation();
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                // Add new page after current one
                                const newSections = [...scaffoldSections];
                                const newPages = [...section.pages];
                                const newPage = { id: `page-${Date.now()}`, name: 'New Page', status: section.name ? '🟢' : null };
                                newPages.splice(pageIndex + 1, 0, newPage);
                                newSections[sectionIndex] = { ...section, pages: newPages };
                                setScaffoldSections(newSections);
                                // Focus the new input after a brief delay
                                setTimeout(() => {
                                  const inputs = document.querySelectorAll('.scaffold-preview__input');
                                  const newInput = inputs[pageIndex + 1] as HTMLInputElement;
                                  if (newInput) {
                                    newInput.focus();
                                    newInput.select();
                                  }
                                }, 10);
                              }
                            }}
                            autoFocus={page.name === 'New Page' && pageIndex === section.pages.length - 1}
                          />
                        ) : (
                          <span className="scaffold-preview__name">{page.name}</span>
                        )}
                        {page.isRename && (
                          <div className="scaffold-preview__cover-selector" ref={coverSelectorRef}>
                            <button 
                              className="scaffold-preview__cover-btn"
                              onClick={() => setShowCoverSelector(!showCoverSelector)}
                            >
                              {selectedCoverVariant?.name || 'Select Cover'}
                              <svg viewBox="0 0 12 12" fill="currentColor" width="10" height="10">
                                <path d="M2 4l4 4 4-4"/>
                              </svg>
                            </button>
                            {showCoverSelector && (
                              <div className="scaffold-preview__cover-dropdown">
                                <div 
                                  className={`scaffold-preview__cover-option ${!selectedCoverVariant ? 'is-selected' : ''}`}
                                  onClick={() => { setSelectedCoverVariant(null); setShowCoverSelector(false); }}
                                >
                                  None (no auto-insert)
                                </div>
                                {coverOptions.map((option, idx) => (
                                  <div 
                                    key={`${option.templateId}-${option.variantKey || idx}`}
                                    className={`scaffold-preview__cover-option ${selectedCoverVariant?.templateId === option.templateId && selectedCoverVariant?.variantKey === option.variantKey ? 'is-selected' : ''}`}
                                    onClick={() => { setSelectedCoverVariant(option); setShowCoverSelector(false); }}
                                  >
                                    {option.preview && <img src={option.preview} alt="" className="scaffold-preview__cover-thumb" />}
                                    <span>{option.name}</span>
                                  </div>
                                ))}
                                {coverOptions.length === 0 && (
                                  <div className="scaffold-preview__cover-empty">No cover templates saved yet</div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                        {isEditingScaffold && !page.isRename && (
                          <button className="scaffold-preview__delete-btn" onClick={() => {
                            const newSections = [...scaffoldSections];
                            const newPages = section.pages.filter((_, i) => i !== pageIndex);
                            newSections[sectionIndex] = { ...section, pages: newPages };
                            setScaffoldSections(newSections);
                          }}>×</button>
                        )}
            </div>
                    ))}
                    
                    {isEditingScaffold && (
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <button
                          className="scaffold-preview__add-page-btn"
                          onClick={() => {
                            const newSections = [...scaffoldSections];
                            const newPages = [...section.pages, { id: `page-${Date.now()}`, name: 'New Page', status: section.name ? '🟢' : null }];
                            newSections[sectionIndex] = { ...section, pages: newPages };
                            setScaffoldSections(newSections);
                          }}
                        >+ Add Page</button>
                        {sectionIndex > 0 && (
                          <button
                            className="scaffold-preview__add-divider-btn"
                            onClick={() => {
                              // Add a new divider section after current section
                              const newSections = [...scaffoldSections];
                              newSections.splice(sectionIndex + 1, 0, {
                                id: `divider-${Date.now()}`,
                                name: '', // Empty name - divider line only
                                pages: [],
                                isDivider: true // Flag to trigger divider display and hide header
                              });
                              setScaffoldSections(newSections);
                            }}
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              padding: '4px 8px',
                              fontSize: '11px',
                              color: 'var(--slds-g-color-neutral-base-50)',
                              borderRadius: '4px',
                              transition: 'all 0.15s ease'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = 'var(--slds-g-color-neutral-base-95)';
                              e.currentTarget.style.color = 'var(--slds-g-color-neutral-base-50)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'none';
                              e.currentTarget.style.color = 'var(--slds-g-color-neutral-base-50)';
                            }}
                          >+ Add Divider</button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
                
                {isEditingScaffold && (
                  <button
                    className="scaffold-preview__add-section-btn"
                    onClick={() => {
                      setScaffoldSections([...scaffoldSections, {
                        id: `section-${Date.now()}`,
                        name: 'NEW SECTION',
                        pages: [{ id: `page-${Date.now()}`, name: 'New Page', status: '🟢' }]
                      }]);
                      const cloud = allClouds.find(c => c.id === selectedClouds[0]);
                      logActivityFromClient({ action: 'page_structure', assetId: 'scaffold-section-add', assetName: 'Added page section', cloudId: selectedClouds[0] || undefined, cloudName: cloud?.name, userName: figmaUserName || undefined });
                    }}
                  >+ Add Section</button>
                )}
              </div>
            </div>

            {/* Status section above footer */}
            <div className={`scaffold-status-bar ${isEditingStatusBadges ? 'scaffold-status-bar--editing' : ''}`}>
              <div className="scaffold-hint__header">
                <strong>Status:</strong>
                {!isEditingStatusBadges && (
                  <span className="scaffold-hint__badges">
                    {(statusSymbols ?? []).map((s, i) => (
                      <span key={s.id}>
                        {i > 0 && <span className="scaffold-hint__separator"> • </span>}
                        <span className="scaffold-hint__status">{s.symbol}&nbsp;{s.label}</span>
                      </span>
                    ))}
                  </span>
                )}
                <button 
                  className="scaffold-hint__edit-btn"
                  onClick={() => setIsEditingStatusBadges(!isEditingStatusBadges)}
                >
                  {isEditingStatusBadges ? 'Done' : 'Edit'}
                </button>
              </div>

              {isEditingStatusBadges && (
                <div className="scaffold-hint__editor">
                  {(statusSymbols ?? []).map((status, index) => (
                    <div key={status.id} className="scaffold-hint__editor-row">
                      <input
                        type="text"
                        className="scaffold-hint__emoji-input"
                        value={status.symbol}
                        onChange={(e) => {
                          const newSymbols = [...(statusSymbols ?? [])];
                          newSymbols[index] = { ...status, symbol: e.target.value };
                          updateStatusSymbols(newSymbols);
                        }}
                        maxLength={2}
                      />
                      <input
                        type="text"
                        className="scaffold-hint__label-input"
                        value={status.label}
                        onChange={(e) => {
                          const newSymbols = [...(statusSymbols ?? [])];
                          newSymbols[index] = { ...status, label: e.target.value };
                          updateStatusSymbols(newSymbols);
                        }}
                        placeholder="Label"
                      />
                      <button
                        className="scaffold-hint__delete-btn"
                        onClick={() => {
                          if ((statusSymbols ?? []).length > 1) {
                            updateStatusSymbols((statusSymbols ?? []).filter((_, i) => i !== index));
                          }
                        }}
                        disabled={(statusSymbols ?? []).length <= 1}
                      >×</button>
                    </div>
                  ))}
                  <button
                    className="scaffold-hint__add-btn"
                    onClick={() => {
                      updateStatusSymbols([
                        ...statusSymbols,
                        { id: `symbol-${Date.now()}`, symbol: '⭐', label: 'New Status' }
                      ]);
                    }}
                  >+ Add Status</button>
                </div>
              )}
            </div>

            {/* Fixed Footer with CTAs */}
            <div className="scaffold-section__footer">
              <Button 
                variant="brand"
                onClick={() => { scaffoldFileStructure(); }}
                loading={isScaffolding}
                disabled={scaffoldExists || isEditingScaffold}
              >
                {scaffoldExists ? 'Already Exists' : 'Insert Pages'}
              </Button>
              <Button 
                variant={isEditingScaffold ? 'brand-outline' : 'neutral'}
                onClick={() => setIsEditingScaffold(!isEditingScaffold)}
              >
                {isEditingScaffold ? 'Done Editing' : 'Edit'}
              </Button>
            </div>
            </div>
        ) : view === 'settings' ? (
          <div className="settings-scroll-container">
            <div className="settings-header">
              <div className="settings-header__left">
                <button className="settings-header__back" onClick={goHome} title="Back">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M19 12H5M12 19l-7-7 7-7"/>
                  </svg>
                </button>
                <span className="settings-header__title">Manage Clouds and Sections</span>
              </div>
              <div className="settings-header__actions">
                <button className="settings-header__backup" onClick={openActivityHistoryModal}>
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"/>
                    <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z"/>
                  </svg>
                  Activity Log
                </button>
                {deletedClouds.length > 0 && (
                  <button className="settings-header__trash" onClick={() => setShowCloudTrashModal(true)}>
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
                      <path fillRule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
                    </svg>
                    Trash ({deletedClouds.length})
                  </button>
                )}
              </div>
            </div>
            <div className="settings-section">
              <div className="settings-cloud-list">
                        {allClouds.map(cloud => {
                          const isExpanded = expandedCloudId === cloud.id;
                          return (
                          <div key={cloud.id} className={`settings-cloud-row ${safeHiddenClouds.includes(cloud.id) ? 'is-hidden' : ''} ${isExpanded ? 'is-expanded' : ''}`}>
                            <div 
                              className="settings-cloud-row__header"
                              onClick={() => {
                                // Toggle: if clicking the same cloud, collapse it; otherwise expand this one and collapse others
                                setExpandedCloudId(isExpanded ? null : cloud.id);
                              }}
                              style={{ cursor: 'pointer' }}
                            >
                              <div className="settings-cloud-row__main-wrapper">
                                {/* Subtle chevron next to icon */}
                                <svg 
                                  className={`settings-cloud-row__chevron ${isExpanded ? 'is-expanded' : ''}`}
                                  viewBox="0 0 24 24" 
                                  fill="none" 
                                  stroke="currentColor" 
                                  strokeWidth="1.5"
                                >
                                  <polyline points="6 9 12 15 18 9"/>
                                </svg>
                                <label className="settings-cloud-row__icon-upload">
                                  <input
                                    type="file"
                                    accept="image/*"
                                    style={{ display: 'none' }}
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) {
                                        const reader = new FileReader();
                                        reader.onload = (event) => {
                                          const iconUrl = event.target?.result as string;
                                          if (cloud.isCustom) {
                                            const updatedCustom = (customClouds ?? []).map(c => 
                                              c.id === cloud.id ? { ...c, icon: iconUrl } : c
                                            );
                                            setCustomClouds(updatedCustom);
                                          } else if (Array.isArray(editableClouds)) {
                                            const updated = editableClouds.map(c => 
                                              c.id === cloud.id ? { ...c, icon: iconUrl } : c
                                            );
                                            setEditableClouds(updated);
                                            parent.postMessage({ pluginMessage: { type: 'SAVE_EDITABLE_CLOUDS', clouds: updated } }, '*');
                                          }
                                        };
                                        reader.readAsDataURL(file);
                                      }
                                    }}
                                  />
                                  <img src={cloud.icon} alt={cloud.name} className="settings-cloud-row__icon" />
                                  <div className="settings-cloud-row__icon-overlay">📷</div>
                                </label>
                                <input
                                  type="text"
                                  className="settings-cloud-row__name-input"
                                  value={cloud.name}
                                  onChange={(e) => {
                                    if (cloud.isCustom) {
                                      const updatedCustom = (customClouds ?? []).map(c => 
                                        c.id === cloud.id ? { ...c, name: e.target.value } : c
                                      );
                                      setCustomClouds(updatedCustom);
                                      parent.postMessage({ pluginMessage: { type: 'SAVE_CUSTOM_CLOUDS', clouds: updatedCustom } }, '*');
                                    } else if (Array.isArray(editableClouds)) {
                                      const updated = editableClouds.map(c => 
                                        c.id === cloud.id ? { ...c, name: e.target.value } : c
                                      );
                                      setEditableClouds(updated);
                                      parent.postMessage({ pluginMessage: { type: 'SAVE_EDITABLE_CLOUDS', clouds: updated } }, '*');
                                    }
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                />
                                <button
                                  className={`settings-cloud-row__set-default ${defaultCloud === cloud.id ? 'is-default' : ''}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (!safeHiddenClouds.includes(cloud.id)) {
                                      setDefaultCloud(cloud.id);
                                      setSelectedClouds([cloud.id]);
                                      const cloudName = allClouds.find(c => c.id === cloud.id)?.name || cloud.id;
                                      parent.postMessage({ pluginMessage: { type: 'SHOW_TOAST', message: `${cloudName} set as default` } }, '*');
                                    }
                                  }}
                                  disabled={safeHiddenClouds.includes(cloud.id)}
                                >
                                  {defaultCloud === cloud.id ? (
                                    <span className="settings-cloud-row__badge">Default</span>
                                  ) : (
                                    <span className="settings-cloud-row__set-default-text">Set Default</span>
                                  )}
                                </button>
                              </div>
                              {/* Visibility toggle - always visible */}
                              <button
                                className={`settings-cloud-row__toggle ${safeHiddenClouds.includes(cloud.id) ? 'is-off' : 'is-on'}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleCloudVisibility(cloud.id);
                                }}
                                title={safeHiddenClouds.includes(cloud.id) ? 'Show cloud' : 'Hide cloud'}
                              >
                                <svg viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                                  <circle cx="12" cy="12" r="3"/>
                                  {safeHiddenClouds.includes(cloud.id) && <path d="M1 1l22 22"/>}
                                </svg>
                              </button>
                              {/* Delete cloud button - only for custom clouds or if not default */}
                              {(cloud.isCustom || defaultCloud !== cloud.id) && (
                                <button
                                  className="settings-cloud-row__delete"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDeleteCloudConfirmId(cloud.id);
                                  }}
                                  title="Delete cloud"
                                >
                                  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                                    <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
                                    <path fillRule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
                                  </svg>
                                </button>
                              )}
                          </div>
                            
                            {/* Nested Categories - only show when expanded */}
                            {isExpanded && (
                              <div className="settings-cloud-row__categories">
                                <div className="settings-categories-list settings-categories-list--nested">
                                  {(safeCloudCategories[cloud.id] || defaultCategories).map((cat, index) => (
                                    <div 
                                      key={cat.id} 
                                      className={`settings-category-item ${draggedItem?.type === 'category' && draggedItem.index === index ? 'is-dragging' : ''} ${dragOverIndex === index && draggedItem?.type === 'category' ? 'is-drag-over' : ''}`}
                                      draggable
                                      onDragStart={(e) => { setDraggedItem({ type: 'category', index }); e.dataTransfer.effectAllowed = 'move'; }}
                                      onDragEnd={() => { setDraggedItem(null); setDragOverIndex(null); }}
                                      onDragOver={(e) => { e.preventDefault(); if (draggedItem?.type === 'category' && draggedItem.index !== index) setDragOverIndex(index); }}
                                      onDragLeave={() => setDragOverIndex(null)}
                                      onDrop={(e) => {
                                        e.preventDefault();
                                        if (draggedItem?.type === 'category' && draggedItem.index !== index) {
                                          const cats = [...(safeCloudCategories[cloud.id] || defaultCategories)];
                                          const [removed] = cats.splice(draggedItem.index, 1);
                                          cats.splice(index, 0, removed);
                                          updateCloudCategories(cloud.id, cats);
                                        }
                                        setDraggedItem(null); setDragOverIndex(null);
                                      }}
                                    >
                                      <div className="gripper-handle gripper-handle--small">
                                        <svg className="gripper-handle__icon" viewBox="0 0 10 16" fill="currentColor">
                                          <circle cx="3" cy="2" r="1.5"/><circle cx="7" cy="2" r="1.5"/>
                                          <circle cx="3" cy="8" r="1.5"/><circle cx="7" cy="8" r="1.5"/>
                                          <circle cx="3" cy="14" r="1.5"/><circle cx="7" cy="14" r="1.5"/>
                                        </svg>
                                      </div>
                                      <input
                                        type="text"
                                        className="settings-category-item__input"
                                        value={cat.label}
                                        onChange={(e) => {
                                          const cats = [...(safeCloudCategories[cloud.id] || defaultCategories)];
                                          cats[index] = { ...cat, label: e.target.value };
                                          updateCloudCategories(cloud.id, cats);
                                        }}
                                        onBlur={() => {
                                          if (cat.label.trim()) {
                                            logActivityFromClient({ action: 'section_update', assetId: cat.id, assetName: cat.label, cloudId: cloud.id, cloudName: cloud.name, userName: figmaUserName || undefined });
                                          }
                                        }}
                                      />
                                      {cat.id !== 'all' && (
                                        <button className="settings-category-item__delete" onClick={() => {
                                          logActivityFromClient({ action: 'section_delete', assetId: cat.id, assetName: cat.label, cloudId: cloud.id, cloudName: cloud.name, userName: figmaUserName || undefined });
                                          const cats = (safeCloudCategories[cloud.id] || defaultCategories).filter((_, i) => i !== index);
                                          updateCloudCategories(cloud.id, cats);
                                        }}>×</button>
                                      )}
                                    </div>
                                  ))}
                                  <button
                                    className="settings-add-category-btn settings-add-category-btn--small"
                                    onClick={() => {
                                      const newId = `custom-${Date.now()}`;
                                      const cats = [...(safeCloudCategories[cloud.id] || defaultCategories)];
                                      cats.push({ id: newId, label: 'New Category' });
                                      updateCloudCategories(cloud.id, cats);
                                      logActivityFromClient({ action: 'section_create', assetId: newId, assetName: 'New Category', cloudId: cloud.id, cloudName: cloud.name, userName: figmaUserName || undefined });
                                    }}
                                  >+ Add Category</button>
                                </div>
                              </div>
                            )}
                            
                            {/* POC Management - only show for default cloud */}
                            {defaultCloud === cloud.id && (
                              <div className="settings-cloud-row__pocs">
                                <div className="settings-pocs-list">
                                  {(cloudPOCs[cloud.id] || []).map((poc, index) => (
                                    <div key={index} className="settings-poc-item">
                                      <input
                                        type="text"
                                        className="settings-poc-item__input"
                                        placeholder="Name"
                                        value={poc.name}
                                        onChange={(e) => {
                                          const pocs = [...(cloudPOCs[cloud.id] || [])];
                                          pocs[index] = { ...poc, name: e.target.value };
                                          updateCloudPOCs(cloud.id, pocs);
                                        }}
                                      />
                                      <input
                                        type="email"
                                        className="settings-poc-item__input"
                                        placeholder="Email"
                                        value={poc.email}
                                        onChange={(e) => {
                                          const pocs = [...(cloudPOCs[cloud.id] || [])];
                                          pocs[index] = { ...poc, email: e.target.value };
                                          updateCloudPOCs(cloud.id, pocs);
                                        }}
                                      />
                                      <button 
                                        className="settings-poc-item__delete" 
                                        onClick={() => {
                                          logActivityFromClient({ action: 'poc_delete', assetId: `poc-${index}`, assetName: poc.name || poc.email || 'POC', cloudId: cloud.id, cloudName: cloud.name, userName: figmaUserName || undefined });
                                          const pocs = (cloudPOCs[cloud.id] || []).filter((_, i) => i !== index);
                                          updateCloudPOCs(cloud.id, pocs);
                                        }}
                                      >×</button>
                                    </div>
                                  ))}
                                  {(cloudPOCs[cloud.id] || []).length < 2 && (
                                    <button
                                      className="settings-add-poc-btn"
                                      onClick={() => {
                                        const pocs = [...(cloudPOCs[cloud.id] || [])];
                                        pocs.push({ name: '', email: '' });
                                        updateCloudPOCs(cloud.id, pocs);
                                        logActivityFromClient({ action: 'poc_add', assetId: `poc-${Date.now()}`, assetName: 'POC added', cloudId: cloud.id, cloudName: cloud.name, userName: figmaUserName || undefined });
                                      }}
                                    >+ Add POC</button>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                        })}
                        <button className="settings-add-cloud-btn" onClick={() => setShowAddCloudModal(true)}>
                          + Add Cloud / Team
                        </button>
                      </div>
            </div>
          </div>
        ) : view === 'add' ? (
          <div className="add-flow">
            {/* Step: Instructions */}
            {addStep === 'instructions' && (
              <Card bordered={false} shadow="none">
                <CardContent>
                  <div className="add-flow__header">
                    <button className="add-flow__back" onClick={goHome} title="Back">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M19 12H5M12 19l-7-7 7-7"/>
                      </svg>
                    </button>
                    <h3 className="step-title">Prepare your template</h3>
                  </div>
                  <div className="checklist">
                    <div className="checklist__item">
                      <span className="checklist__bullet">1</span>
                      Select your template frame in Figma
                    </div>
                    <div className="checklist__item">
                      <span className="checklist__bullet">2</span>
                      Convert to Component <kbd>⌘⌥K</kbd>
                    </div>
                    <div className="checklist__item">
                      <span className="checklist__bullet">3</span>
                      Publish to Team Library
                    </div>
            </div>
                </CardContent>
                <CardFooter>
                  <Button variant="neutral" fullWidth onClick={captureComponent}>
                    Add to Library
                </Button>
                </CardFooter>
              </Card>
            )}

            {/* Step: Loading */}
            {addStep === 'loading' && (
              <div className="loading-state">
                <Spinner size="large" />
                <p className="loading-state__text">Getting component info...</p>
          </div>
            )}

            {/* Step: Configure */}
            {addStep === 'configure' && capturedComponent && (
              <Card>
                <CardContent>
                  <div className="form-field">
                    <Input 
                      label="Frame Name"
                      value={formName} 
                      onChange={(e) => setFormName(e.target.value)} 
                    />
                    <div className="frame-info__meta">
                      <span className="frame-info__size">{Math.round(capturedComponent.width)} × {Math.round(capturedComponent.height)}</span>
                      {capturedComponent.isComponentSet && (
                        <Badge variant="info" size="small">{capturedComponent.variantCount} variants</Badge>
                      )}
              </div>
            </div>

                  {/* Show variant properties if component set */}
                  {capturedComponent.isComponentSet && capturedComponent.variantProperties && (
                    <div className="form-field">
                      <label className="form-field__label">Properties</label>
                      <div className="variant-props">
                        {Object.entries(capturedComponent.variantProperties).map(([prop, values]) => (
                          <div key={prop} className="variant-prop">
                            <span className="variant-prop__name">{prop}</span>
                            <span className="variant-prop__values">{values.join(', ')}</span>
                          </div>
                        ))}
          </div>
        </div>
              )}
                  
                  <div className="form-field">
                    <label className="form-field__label">Select Cloud</label>
                    <div className="cloud-pills">
                      {clouds.map(cloud => (
                        <button
                          key={cloud.id}
                          className={`pill pill--${cloud.id} ${formCloud === cloud.id ? 'pill--selected' : ''}`}
                          onClick={() => setFormCloud(cloud.id)}
                        >
                          <span className="pill__icon">
                            <img src={cloud.icon} alt={cloud.name} />
                          </span>
                          {cloud.name}
                        </button>
                      ))}
            </div>
          </div>

                  <div className="form-field">
                    <RadioGroup
                      name="templateType"
                      label="Select Type"
                      options={formCategoryOptions}
                      value={formCategory}
                      onChange={setFormCategory}
                      direction="horizontal"
              />
            </div>

                  <div className="form-field">
                    <Input
                      label="Description"
                      placeholder="Brief description..."
                      value={formDescription}
                      onChange={(e) => setFormDescription(e.target.value)}
              />
            </div>

                  <div className="form-field">
                    <div className="google-slide-input">
                      <img src={GoogleSlideIcon} alt="Google Slides" className="google-slide-input__icon" />
                      <Input
                        label="Google Slides Link"
                        placeholder="https://docs.google.com/presentation/..."
                        value={formGoogleSlideLink}
                        onChange={(e) => setFormGoogleSlideLink(e.target.value)}
                      />
            </div>
          </div>
                </CardContent>
                <CardFooter>
                  <Button variant="neutral" onClick={() => setAddStep('instructions')}>Cancel</Button>
                  <Button variant="brand" onClick={saveTemplate}>Add Template</Button>
                </CardFooter>
              </Card>
            )}
          </div>
        ) : view === 'frame-details' ? (
          <div className="frame-details-view">
            <div className="frame-details-view__header">
              <button 
                className="frame-details-view__back"
                onClick={() => setView('home')}
                title="Back"
              >
                <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                  <path fillRule="evenodd" d="M15 8a.5.5 0 0 0-.5-.5H2.707l3.147-3.146a.5.5 0 1 0-.708-.708l-4 4a.5.5 0 0 0 0 .708l4 4a.5.5 0 0 0 .708-.708L2.707 8.5H14.5A.5.5 0 0 0 15 8z"/>
                </svg>
                Back
              </button>
              <h3 className="frame-details-view__title">Frame Details</h3>
            </div>
            
            {frameDetailsLoading ? (
              <div className="frame-details-view__loading">
                <Spinner size="small" />
                <p>Analyzing selected frame...</p>
              </div>
            ) : frameDetailsError ? (
              <Card>
                <CardContent>
                  <div className="frame-details-view__error">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"/>
                      <path d="M12 8v4M12 16h.01"/>
                    </svg>
                    <p>{frameDetailsError}</p>
                    <Button 
                      variant="brand-outline" 
                      size="small"
                      onClick={getFrameDetails}
                    >
                      Try Again
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : frameDetails ? (
              <div className="frame-details-view__content">
                <Card>
                  <CardContent>
                    <div className="frame-details-section">
                      <h4 className="frame-details-section__title">Basic Information</h4>
                      <div className="frame-details-grid">
                        <div className="frame-details-item">
                          <span className="frame-details-item__label">Name</span>
                          <span className="frame-details-item__value">{frameDetails.name}</span>
                        </div>
                        <div className="frame-details-item">
                          <span className="frame-details-item__label">Type</span>
                          <span className="frame-details-item__value">{frameDetails.type}</span>
                        </div>
                        <div className="frame-details-item">
                          <span className="frame-details-item__label">Dimensions</span>
                          <span className="frame-details-item__value">{frameDetails.width} × {frameDetails.height}px</span>
                        </div>
                        <div className="frame-details-item">
                          <span className="frame-details-item__label">Aspect Ratio</span>
                          <span className="frame-details-item__value">{frameDetails.aspectRatio}:1</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent>
                    <div className="frame-details-section">
                      <h4 className="frame-details-section__title">Guidelines Compliance</h4>
                      <div className="frame-details-compliance">
                        <div className={`frame-details-compliance-item ${frameDetails.is16x9 ? 'is-compliant' : 'is-non-compliant'}`}>
                          <div className="frame-details-compliance-item__icon">
                            {frameDetails.is16x9 ? (
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M20 6L9 17l-5-5"/>
                              </svg>
                            ) : (
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10"/>
                                <path d="M12 8v4M12 16h.01"/>
                              </svg>
                            )}
                          </div>
                          <div className="frame-details-compliance-item__content">
                            <span className="frame-details-compliance-item__label">16:9 Aspect Ratio</span>
                            <span className="frame-details-compliance-item__status">
                              {frameDetails.is16x9 ? 'Compliant' : 'Not compliant'}
                            </span>
                          </div>
                        </div>
                        
                        <div className={`frame-details-compliance-item ${frameDetails.hasAutoLayout ? 'is-compliant' : 'is-non-compliant'}`}>
                          <div className="frame-details-compliance-item__icon">
                            {frameDetails.hasAutoLayout ? (
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M20 6L9 17l-5-5"/>
                              </svg>
                            ) : (
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10"/>
                                <path d="M12 8v4M12 16h.01"/>
                              </svg>
                            )}
                          </div>
                          <div className="frame-details-compliance-item__content">
                            <span className="frame-details-compliance-item__label">Auto Layout</span>
                            <span className="frame-details-compliance-item__status">
                              {frameDetails.hasAutoLayout ? 'Enabled' : 'Not enabled'}
                            </span>
                          </div>
                        </div>
                        
                        <div className={`frame-details-compliance-item ${frameDetails.matchesRecommendedResolution ? 'is-compliant' : 'is-non-compliant'}`}>
                          <div className="frame-details-compliance-item__icon">
                            {frameDetails.matchesRecommendedResolution ? (
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M20 6L9 17l-5-5"/>
                              </svg>
                            ) : (
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10"/>
                                <path d="M12 8v4M12 16h.01"/>
                              </svg>
                            )}
                          </div>
                          <div className="frame-details-compliance-item__content">
                            <span className="frame-details-compliance-item__label">Recommended Resolution</span>
                            <span className="frame-details-compliance-item__status">
                              {frameDetails.matchesRecommendedResolution 
                                ? '1600×900 or 1920×1080' 
                                : 'Not 1600×900 or 1920×1080'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {frameDetails.layoutProps && (
                  <Card>
                    <CardContent>
                      <div className="frame-details-section">
                        <h4 className="frame-details-section__title">Auto Layout Properties</h4>
                        <div className="frame-details-grid">
                          <div className="frame-details-item">
                            <span className="frame-details-item__label">Layout Mode</span>
                            <span className="frame-details-item__value">{frameDetails.layoutProps.layoutMode}</span>
                          </div>
                          <div className="frame-details-item">
                            <span className="frame-details-item__label">Primary Axis</span>
                            <span className="frame-details-item__value">{frameDetails.layoutProps.primaryAxisSizingMode}</span>
                          </div>
                          <div className="frame-details-item">
                            <span className="frame-details-item__label">Counter Axis</span>
                            <span className="frame-details-item__value">{frameDetails.layoutProps.counterAxisSizingMode}</span>
                          </div>
                          <div className="frame-details-item">
                            <span className="frame-details-item__label">Padding</span>
                            <span className="frame-details-item__value">
                              {frameDetails.layoutProps.paddingTop} / {frameDetails.layoutProps.paddingRight} / {frameDetails.layoutProps.paddingBottom} / {frameDetails.layoutProps.paddingLeft}
                            </span>
                          </div>
                          <div className="frame-details-item">
                            <span className="frame-details-item__label">Item Spacing</span>
                            <span className="frame-details-item__value">{frameDetails.layoutProps.itemSpacing}px</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : null}
          </div>
        ) : view === 'housekeeping-admin' ? (
          <div className="housekeeping-admin">
            <div className="housekeeping-admin__header">
              <button 
                className="housekeeping-admin__back"
                onClick={() => setView('home')}
              >
                <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                  <path fillRule="evenodd" d="M15 8a.5.5 0 0 0-.5-.5H2.707l3.147-3.146a.5.5 0 1 0-.708-.708l-4 4a.5.5 0 0 0 0 .708l4 4a.5.5 0 0 0 .708-.708L2.707 8.5H14.5A.5.5 0 0 0 15 8z"/>
                </svg>
                Back
              </button>
              <h3 className="housekeeping-admin__title">Team Housekeeping</h3>
              <p className="housekeeping-admin__subtitle">Manage rules and guidelines for your team</p>
            </div>

            <div className="housekeeping-admin__content">
              <div className="housekeeping-admin__section-header">
                <span className="housekeeping-admin__section-title">RULES ({housekeepingRules.length})</span>
                <button className="housekeeping-admin__add-btn" onClick={addRule}>
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M8 3v10M3 8h10"/>
                  </svg>
                  Add Rule
                </button>
              </div>

              <div className="housekeeping-admin__rules">
                {housekeepingRules.map((rule, index) => (
                  <div key={rule.id} className="housekeeping-rule">
                    <div 
                      className="housekeeping-rule__gripper"
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('text/plain', index.toString());
                        e.currentTarget.parentElement?.classList.add('is-dragging');
                      }}
                      onDragEnd={(e) => {
                        e.currentTarget.parentElement?.classList.remove('is-dragging');
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.currentTarget.parentElement?.classList.add('drag-over');
                      }}
                      onDragLeave={(e) => {
                        e.currentTarget.parentElement?.classList.remove('drag-over');
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.currentTarget.parentElement?.classList.remove('drag-over');
                        const fromIndex = parseInt(e.dataTransfer.getData('text/plain'));
                        if (fromIndex !== index) {
                          const newRules = [...housekeepingRules];
                          const [moved] = newRules.splice(fromIndex, 1);
                          newRules.splice(index, 0, moved);
                          saveHousekeepingRules(newRules);
                        }
                      }}
                      title="Drag to reorder"
                    >
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                        <circle cx="5" cy="3" r="1.5"/>
                        <circle cx="11" cy="3" r="1.5"/>
                        <circle cx="5" cy="8" r="1.5"/>
                        <circle cx="11" cy="8" r="1.5"/>
                        <circle cx="5" cy="13" r="1.5"/>
                        <circle cx="11" cy="13" r="1.5"/>
                      </svg>
                    </div>
                    <div className="housekeeping-rule__content">
                      <div className="housekeeping-rule__header">
                        <h4 className="housekeeping-rule__title">{rule.title}</h4>
                        <div className="housekeeping-rule__actions">
                          <button className="housekeeping-rule__action" title="Edit" onClick={() => editRule(rule)}>
                            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M12 2l2 2-8 8H4v-2l8-8z"/>
                            </svg>
                          </button>
                          <button className="housekeeping-rule__action housekeeping-rule__action--danger" title="Delete" onClick={() => deleteRule(rule.id)}>
                            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M3 4h10M6 4V3h4v1M5 4v9h6V4"/>
                            </svg>
                          </button>
                        </div>
                      </div>
                      <p className="housekeeping-rule__description">{rule.description}</p>
                      {rule.links.length > 0 && (
                        <div className="housekeeping-rule__links">
                          <span className="housekeeping-rule__links-label">Buttons:</span>
                          {rule.links.map((link, i) => (
                            <span key={i} className="housekeeping-rule__link-tag">{link.label}</span>
                          ))}
                        </div>
                      )}
                      {rule.hasComplianceCheck && (
                        <div className="housekeeping-rule__badge">
                          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M3 8l3 3 7-7"/>
                          </svg>
                          Has compliance check
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="housekeeping-admin__info">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm0 3a1 1 0 1 1 0 2 1 1 0 0 1 0-2zm2 8H6v-1h1V8H6V7h3v4h1v1z"/>
                </svg>
                <span>Rules appear as accordion sections in the Team Housekeeping tab. Each rule can have a header, description, and optional action buttons.</span>
              </div>
            </div>

            {/* Add/Edit Rule Modal */}
            {showRuleModal && (
              <div className="rule-modal-overlay" onClick={() => setShowRuleModal(false)}>
                <div className="rule-modal" onClick={(e) => e.stopPropagation()}>
                  <div className="rule-modal__header">
                    <h3 className="rule-modal__title">{editingRule ? 'Edit Rule' : 'Add New Rule'}</h3>
                    <button className="rule-modal__close" onClick={() => setShowRuleModal(false)}>
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M4 4l8 8M12 4l-8 8"/>
                      </svg>
                    </button>
                  </div>
                  <div className="rule-modal__content">
                    <div className="rule-modal__field">
                      <label className="rule-modal__label">Title</label>
                      <input
                        type="text"
                        className="rule-modal__input"
                        placeholder="Enter rule title"
                        value={ruleForm.title}
                        onChange={(e) => setRuleForm({ ...ruleForm, title: e.target.value })}
                      />
                    </div>
                    <div className="rule-modal__field">
                      <label className="rule-modal__label">Description</label>
                      <div className="rich-editor">
                        <div className="rich-editor__toolbar">
                          <button 
                            type="button"
                            className="rich-editor__btn"
                            title="Bold - wraps selected text or inserts placeholder"
                            onClick={() => {
                              const textarea = document.getElementById('rule-description') as HTMLTextAreaElement;
                              if (textarea) {
                                const start = textarea.selectionStart;
                                const end = textarea.selectionEnd;
                                const text = ruleForm.description;
                                const selected = text.substring(start, end);
                                const replacement = selected ? `**${selected}**` : '**bold**';
                                const newText = text.substring(0, start) + replacement + text.substring(end);
                                setRuleForm({ ...ruleForm, description: newText });
                                setTimeout(() => {
                                  textarea.focus();
                                  const newPos = start + replacement.length;
                                  textarea.setSelectionRange(newPos, newPos);
                                }, 0);
                              }
                            }}
                          >
                            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                              <path d="M4 2h5a3 3 0 012.1 5.2A3.5 3.5 0 019.5 14H4V2zm2 5h3a1 1 0 100-2H6v2zm0 5h3.5a1.5 1.5 0 000-3H6v3z"/>
                            </svg>
                          </button>
                          <button 
                            type="button"
                            className="rich-editor__btn"
                            title="Italic - wraps selected text or inserts placeholder"
                            onClick={() => {
                              const textarea = document.getElementById('rule-description') as HTMLTextAreaElement;
                              if (textarea) {
                                const start = textarea.selectionStart;
                                const end = textarea.selectionEnd;
                                const text = ruleForm.description;
                                const selected = text.substring(start, end);
                                const replacement = selected ? `_${selected}_` : '_italic_';
                                const newText = text.substring(0, start) + replacement + text.substring(end);
                                setRuleForm({ ...ruleForm, description: newText });
                                setTimeout(() => {
                                  textarea.focus();
                                  const newPos = start + replacement.length;
                                  textarea.setSelectionRange(newPos, newPos);
                                }, 0);
                              }
                            }}
                          >
                            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                              <path d="M6 2h6v2h-2l-2 8h2v2H4v-2h2l2-8H6V2z"/>
                            </svg>
                          </button>
                          <button 
                            type="button"
                            className="rich-editor__btn"
                            title="Underline - wraps selected text or inserts placeholder"
                            onClick={() => {
                              const textarea = document.getElementById('rule-description') as HTMLTextAreaElement;
                              if (textarea) {
                                const start = textarea.selectionStart;
                                const end = textarea.selectionEnd;
                                const text = ruleForm.description;
                                const selected = text.substring(start, end);
                                const replacement = selected ? `__${selected}__` : '__underline__';
                                const newText = text.substring(0, start) + replacement + text.substring(end);
                                setRuleForm({ ...ruleForm, description: newText });
                                setTimeout(() => {
                                  textarea.focus();
                                  const newPos = start + replacement.length;
                                  textarea.setSelectionRange(newPos, newPos);
                                }, 0);
                              }
                            }}
                          >
                            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                              <path d="M4 2v6a4 4 0 108 0V2h2v6a6 6 0 11-12 0V2h2zM2 15h12v-1H2v1z"/>
                            </svg>
                          </button>
                          <div className="rich-editor__divider"></div>
                          <button 
                            type="button"
                            className="rich-editor__btn"
                            title="Bullet List - adds bullet point"
                            onClick={() => {
                              const textarea = document.getElementById('rule-description') as HTMLTextAreaElement;
                              if (textarea) {
                                const start = textarea.selectionStart;
                                const text = ruleForm.description;
                                const beforeCursor = text.substring(0, start);
                                const needsNewline = beforeCursor.length > 0 && !beforeCursor.endsWith('\n');
                                const insertion = (needsNewline ? '\n' : '') + '• ';
                                const newText = text.substring(0, start) + insertion + text.substring(start);
                                setRuleForm({ ...ruleForm, description: newText });
                                setTimeout(() => {
                                  textarea.focus();
                                  const newPos = start + insertion.length;
                                  textarea.setSelectionRange(newPos, newPos);
                                }, 0);
                              }
                            }}
                          >
                            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                              <circle cx="2.5" cy="4" r="1.5"/>
                              <circle cx="2.5" cy="8" r="1.5"/>
                              <circle cx="2.5" cy="12" r="1.5"/>
                              <path d="M6 3h9v2H6zM6 7h9v2H6zM6 11h9v2H6z"/>
                            </svg>
                          </button>
                          <button 
                            type="button"
                            className="rich-editor__btn"
                            title="Numbered List - adds numbered item"
                            onClick={() => {
                              const textarea = document.getElementById('rule-description') as HTMLTextAreaElement;
                              if (textarea) {
                                const start = textarea.selectionStart;
                                const text = ruleForm.description;
                                const beforeCursor = text.substring(0, start);
                                const lines = beforeCursor.split('\n');
                                let lastNum = 0;
                                for (const line of lines) {
                                  const match = line.match(/^(\d+)\./);
                                  if (match) lastNum = parseInt(match[1]);
                                }
                                const needsNewline = beforeCursor.length > 0 && !beforeCursor.endsWith('\n');
                                const insertion = (needsNewline ? '\n' : '') + `${lastNum + 1}. `;
                                const newText = text.substring(0, start) + insertion + text.substring(start);
                                setRuleForm({ ...ruleForm, description: newText });
                                setTimeout(() => {
                                  textarea.focus();
                                  const newPos = start + insertion.length;
                                  textarea.setSelectionRange(newPos, newPos);
                                }, 0);
                              }
                            }}
                          >
                            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                              <path d="M2 3h1v3H2V5H1V4h1V3zM1 8h2v.5H2v1h1V10H1V8zM1 12v.5h1v.5H1v1h2v-3H1v1zM5 3h10v2H5zM5 7h10v2H5zM5 11h10v2H5z"/>
                            </svg>
                          </button>
                          <div className="rich-editor__divider"></div>
                          <button 
                            type="button"
                            className="rich-editor__btn"
                            title="Link - inserts link with URL"
                            onClick={() => {
                              const textarea = document.getElementById('rule-description') as HTMLTextAreaElement;
                              const url = prompt('Enter URL:');
                              if (url && textarea) {
                                const start = textarea.selectionStart;
                                const end = textarea.selectionEnd;
                                const text = ruleForm.description;
                                const selected = text.substring(start, end);
                                const linkText = selected || 'link text';
                                const replacement = `[${linkText}](${url})`;
                                const newText = text.substring(0, start) + replacement + text.substring(end);
                                setRuleForm({ ...ruleForm, description: newText });
                                setTimeout(() => {
                                  textarea.focus();
                                  const newPos = start + replacement.length;
                                  textarea.setSelectionRange(newPos, newPos);
                                }, 0);
                              }
                            }}
                          >
                            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                              <path d="M7 9l2-2M5.5 10.5l-1 1a2 2 0 002.8 2.8l1-1M10.5 5.5l1-1a2 2 0 00-2.8-2.8l-1 1"/>
                            </svg>
                          </button>
                        </div>
                        <textarea
                          id="rule-description"
                          className="rich-editor__textarea"
                          placeholder="Enter description..."
                          value={ruleForm.description}
                          onChange={(e) => setRuleForm({ ...ruleForm, description: e.target.value })}
                        />
                      </div>
                    </div>
                    {/* Only show compliance check when editing an existing rule that has it */}
                    {editingRule && editingRule.hasComplianceCheck && (
                      <div className="rule-modal__field">
                        <label className="rule-modal__checkbox-label">
                          <input
                            type="checkbox"
                            checked={ruleForm.hasComplianceCheck}
                            onChange={(e) => setRuleForm({ ...ruleForm, hasComplianceCheck: e.target.checked })}
                          />
                          <span>Has compliance check (Frame & Resolution)</span>
                        </label>
                      </div>
                    )}
                    <div className="rule-modal__field">
                      <label className="rule-modal__label">Action Buttons</label>
                      <div className="rule-modal__links">
                        {ruleForm.links.map((link, i) => (
                          <div key={i} className="rule-modal__link-item">
                            <span>{link.label}</span>
                            <button onClick={() => removeLinkFromRule(i)}>
                              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M4 4l8 8M12 4l-8 8"/>
                              </svg>
                            </button>
                          </div>
                        ))}
                      </div>
                      <div className="rule-modal__add-link">
                        <input
                          type="text"
                          placeholder="Button label"
                          value={newLinkLabel}
                          onChange={(e) => setNewLinkLabel(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && addLinkToRule()}
                        />
                        <button onClick={addLinkToRule}>Add</button>
                      </div>
                    </div>
                  </div>
                  <div className="rule-modal__footer">
                    <button className="rule-modal__cancel" onClick={() => setShowRuleModal(false)}>Cancel</button>
                    <button className="rule-modal__save" onClick={saveRule} disabled={!ruleForm.title.trim()}>
                      {editingRule ? 'Save Changes' : 'Add Rule'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteConfirmRule && (
              <div className="delete-confirm-overlay" onClick={() => setDeleteConfirmRule(null)}>
                <div className="delete-confirm-modal" onClick={(e) => e.stopPropagation()}>
                  <div className="delete-confirm-modal__icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 6h18M8 6V4h8v2M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6"/>
                    </svg>
                  </div>
                  <h3 className="delete-confirm-modal__title">Delete Rule?</h3>
                  <p className="delete-confirm-modal__message">
                    This will permanently delete "{housekeepingRules.find(r => r.id === deleteConfirmRule)?.title}". This action cannot be undone.
                  </p>
                  <div className="delete-confirm-modal__actions">
                    <button className="delete-confirm-modal__cancel" onClick={() => setDeleteConfirmRule(null)}>
                      Cancel
                    </button>
                    <button className="delete-confirm-modal__delete" onClick={confirmDeleteRule}>
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : view === 'home' && (activeCategory === 'team-housekeeping' || showWelcomeScreen) ? (
          <div className="welcome-screen">
            {/* Dynamic Accordion Cards based on housekeepingRules */}
            <div className="welcome-screen__accordions">
              {housekeepingRules.map((rule) => (
                <div key={rule.id} className={`welcome-accordion ${expandedSections[rule.id] ? 'welcome-accordion--expanded' : ''}`}>
                  <button 
                    className="welcome-accordion__header"
                    onClick={() => toggleSection(rule.id)}
                  >
                    <h3 className="welcome-accordion__title">{rule.title}</h3>
                    <svg 
                      className="welcome-accordion__chevron" 
                      width="16" 
                      height="16" 
                      viewBox="0 0 16 16" 
                      fill="none" 
                      stroke="currentColor" 
                      strokeWidth="1.5"
                    >
                      <path d="M4 6l4 4 4-4"/>
                    </svg>
                  </button>
                  <div className="welcome-accordion__content">
                    <div className="welcome-accordion__content-inner">
                      <div className="welcome-accordion__text">{renderMarkdown(rule.description)}</div>
                      
                      {/* Compliance Check Button (for rules with hasComplianceCheck) */}
                      {rule.hasComplianceCheck && (
                        <>
                          <button 
                            className="welcome-accordion__check-btn"
                            onClick={() => checkFrameCompliance()}
                            disabled={frameDetailsLoading}
                          >
                            {frameDetailsLoading ? 'Checking...' : 'Check selected frame'}
                          </button>

                          {/* Inline Compliance Results */}
                          {frameDetailsError && (
                            <div className="welcome-accordion__error">
                              {frameDetailsError}
                            </div>
                          )}

                          {frameDetails && (
                            <div className="welcome-accordion__compliance">
                              <div className="compliance-header">
                                <span>GUIDELINES COMPLIANCE</span>
                                <button 
                                  className="compliance-header__dismiss"
                                  onClick={() => setFrameDetails(null)}
                                >
                                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                                    <path d="M4 4l8 8M12 4l-8 8"/>
                                  </svg>
                                </button>
                              </div>
                              
                              <div className={`compliance-item ${frameDetails.is16x9 ? 'compliance-item--success' : 'compliance-item--error'}`}>
                                <div className={`compliance-item__icon ${frameDetails.is16x9 ? 'compliance-item__icon--success' : 'compliance-item__icon--error'}`}>
                                  {frameDetails.is16x9 ? (
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                      <path d="M20 6L9 17l-5-5"/>
                                    </svg>
                                  ) : (
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                      <circle cx="12" cy="12" r="10"/>
                                      <path d="M12 8v4M12 16h.01"/>
                                    </svg>
                                  )}
                                </div>
                                <div className="compliance-item__content">
                                  <div className="compliance-item__title">16:9 Aspect Ratio</div>
                                  <div className="compliance-item__status">{frameDetails.is16x9 ? 'Compliant' : `Current: ${frameDetails.aspectRatio}`}</div>
                                </div>
                              </div>

                              <div className={`compliance-item ${frameDetails.hasAutoLayout ? 'compliance-item--success' : 'compliance-item--error'}`}>
                                <div className={`compliance-item__icon ${frameDetails.hasAutoLayout ? 'compliance-item__icon--success' : 'compliance-item__icon--error'}`}>
                                  {frameDetails.hasAutoLayout ? (
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                      <path d="M20 6L9 17l-5-5"/>
                                    </svg>
                                  ) : (
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                      <circle cx="12" cy="12" r="10"/>
                                      <path d="M12 8v4M12 16h.01"/>
                                    </svg>
                                  )}
                                </div>
                                <div className="compliance-item__content">
                                  <div className="compliance-item__title">Auto Layout</div>
                                  <div className="compliance-item__status">{frameDetails.hasAutoLayout ? 'Enabled' : 'Not enabled'}</div>
                                </div>
                              </div>

                              <div className={`compliance-item ${frameDetails.matchesRecommendedResolution ? 'compliance-item--success' : 'compliance-item--error'}`}>
                                <div className={`compliance-item__icon ${frameDetails.matchesRecommendedResolution ? 'compliance-item__icon--success' : 'compliance-item__icon--error'}`}>
                                  {frameDetails.matchesRecommendedResolution ? (
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                      <path d="M20 6L9 17l-5-5"/>
                                    </svg>
                                  ) : (
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                      <circle cx="12" cy="12" r="10"/>
                                      <path d="M12 8v4M12 16h.01"/>
                                    </svg>
                                  )}
                                </div>
                                <div className="compliance-item__content">
                                  <div className="compliance-item__title">Recommended Resolution</div>
                                  <div className="compliance-item__status">
                                    {frameDetails.matchesRecommendedResolution 
                                      ? `${frameDetails.width}×${frameDetails.height}` 
                                      : `Current: ${frameDetails.width}×${frameDetails.height}`}
                                  </div>
                                  <div className="compliance-item__hint">Recommended for web: 1600×900 or 1920×1080</div>
                                </div>
                              </div>
                            </div>
                          )}
                        </>
                      )}

                      {/* Action Buttons (for rules with links) */}
                      {rule.links.length > 0 && (
                        <div className="welcome-accordion__options">
                          {rule.links.map((link, i) => (
                            <button 
                              key={i}
                              className="welcome-accordion__option"
                              onClick={() => setView('scaffold')}
                            >
                              {link.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : templates.length === 0 ? (
          <EmptyState
            icon={<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>}
            title={`No ${activeCategory === 'all' ? 'templates' : categories.find(c => c.id === activeCategory)?.label.toLowerCase() || 'templates'} yet`}
            description={`Add your first ${activeCategory === 'all' ? 'template' : categories.find(c => c.id === activeCategory)?.label.toLowerCase().replace(/s$/, '') || 'template'} to get started. If you expected data, try Version History.`}
            action={
              <div className="empty-state__actions">
                <Button variant="brand-outline" onClick={startAddFlow}>Add Template</Button>
                <button type="button" className="empty-state__recovery-link" onClick={() => setShowDataRecoveryModal(true)}>
                  Version History
                </button>
              </div>
            }
          />
        ) : filteredTemplates.length === 0 ? (
          <EmptyState
            icon={<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 5v14H5V5h14m0-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-4.86 8.86l-3 3.87L9 13.14 6 17h12l-3.86-5.14z"/></svg>}
            title={`No ${activeCategory === 'all' ? 'templates' : categories.find(c => c.id === activeCategory)?.label.toLowerCase() || 'templates'} found`}
            description="Try selecting different clouds or categories"
          />
        ) : (
          filteredTemplates.map(template => {
            const cloud = clouds.find(c => c.id === template.cloudId);
            return (
              <div key={template.id} id={`template-${template.id}`} className="template-item">
                <div className="template-item__header">
                  {cloud && <img src={cloud.icon} alt={cloud.name} className="template-item__icon" />}
                  <span className="template-item__title">{template.name}</span>
                  {isAnyVariantSaved(template.id) && activeCategory !== 'saved' && (
                    <span className="template-item__saved-badge" title={`${getSavedVariantsCount(template.id)} saved`}>
                      <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M2 2v13.5a.5.5 0 0 0 .74.439L8 13.069l5.26 2.87A.5.5 0 0 0 14 15.5V2a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z"/>
                      </svg>
                      {template.isComponentSet && getSavedVariantsCount(template.id) > 1 && (
                        <span className="template-item__saved-count">{getSavedVariantsCount(template.id)}</span>
                      )}
                    </span>
                  )}
                  {template.googleSlideLink ? (
                    <a 
                      href={template.googleSlideLink} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="template-item__slide-link"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <img src={GoogleSlideIcon} alt="Google Slides" />
                    </a>
                  ) : (
                    <span className="template-item__size">{template.size.width}×{template.size.height}</span>
                  )}
          </div>
          {(() => {
            const meta = templateAddMetadata[template.id];
            const hasUser = meta?.userName?.trim();
            const hasDate = meta?.createdAt;
            if (!hasUser && !hasDate) return null;
            return (
              <div className="template-item__meta">
                {hasUser && (
                  <span className="template-item__meta-added">Added by {meta.userName}</span>
                )}
                {hasDate && (
                  <span className="template-item__meta-time">
                    {formatDateOnly(new Date(meta.createdAt))}
                  </span>
                )}
              </div>
            );
          })()}
          
                {/* Variant Grid - Visual slide selector */}
                {template.isComponentSet && template.variants && template.variants.length > 1 && (() => {
                  // Filter variants: in saved category, only show saved variants
                  const displayVariants = activeCategory === 'saved'
                    ? template.variants.filter(v => isTemplateSaved(template.id, v.key))
                    : template.variants;
                  
                  // If only one variant saved in saved category, show as full preview
                  if (activeCategory === 'saved' && displayVariants.length === 1 && displayVariants[0].preview) {
                    const savedVariant = displayVariants[0];
                    return (
                      <div
                        className="template-item__preview"
                        onMouseEnter={() => {
                          if (variantPopoverHideTimerRef.current) {
                            clearTimeout(variantPopoverHideTimerRef.current);
                            variantPopoverHideTimerRef.current = null;
                          }
                          setVariantPopover({
                            templateId: template.id,
                            templateName: template.name,
                            variant: savedVariant,
                            preview: savedVariant.preview || '',
                            displayName: savedVariant.displayName,
                          });
                          if (!variantPopoverVisibleRef.current) {
                            if (variantPopoverShowTimerRef.current) clearTimeout(variantPopoverShowTimerRef.current);
                            variantPopoverShowTimerRef.current = setTimeout(() => {
                              setVariantPopoverVisible(true);
                              variantPopoverShowTimerRef.current = null;
                            }, 2000);
                          }
                        }}
                        onMouseLeave={() => {
                          if (variantPopoverHideTimerRef.current) clearTimeout(variantPopoverHideTimerRef.current);
                          variantPopoverHideTimerRef.current = setTimeout(() => {
                            setVariantPopoverVisible(false);
                            setVariantPopover(null);
                            variantPopoverHideTimerRef.current = null;
                          }, 200);
                        }}
                      >
                        <img src={savedVariant.preview} alt={savedVariant.displayName} />
                        <button 
                          className="template-item__preview-saved"
                          onClick={(e) => { e.stopPropagation(); toggleSaveTemplate(template.id, savedVariant.key); }}
                          title="Unsave"
                        >
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M2 2v13.5a.5.5 0 0 0 .74.439L8 13.069l5.26 2.87A.5.5 0 0 0 14 15.5V2a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z"/>
                          </svg>
                        </button>
                      </div>
                    );
                  }
                  
                  const selected = selectedSlides[template.id] || [];
                  const allSelected = selected.length === displayVariants.length;
                  
                  return (
                    <div className="variant-grid">
                      {activeCategory !== 'saved' && (
                        <div className="variant-grid__header">
                          <span className="variant-grid__title">
                            {selected.length > 0 ? `${selected.length} selected` : 'Click to select'}
                          </span>
                          <button 
                            className="variant-grid__toggle-all"
                            onClick={() => allSelected 
                              ? deselectAllSlides(template.id) 
                              : selectAllSlides(template.id, displayVariants.map(v => v.key))
                            }
                          >
                            {allSelected ? 'Clear' : 'Select All'}
                          </button>
                        </div>
                      )}
                      <div 
                        className={`variant-grid__items variant-grid__items--${
                          displayVariants.length === 1 ? 'single' :
                          displayVariants.length === 2 ? 'duo' :
                          displayVariants.length === 4 ? 'quad' :
                          'default'
                        }`}
                        onMouseLeave={() => {
                          if (variantPopoverHideTimerRef.current) clearTimeout(variantPopoverHideTimerRef.current);
                          variantPopoverHideTimerRef.current = setTimeout(() => {
                            setVariantPopoverVisible(false);
                            setVariantPopover(null);
                            variantPopoverHideTimerRef.current = null;
                          }, 200);
                        }}
                      >
                        {displayVariants.map(variant => {
                          const isSelected = selected.includes(variant.key);
                          return (
                            <div 
                              key={variant.key}
                              className={`variant-grid__item ${isSelected ? 'is-selected' : ''}`}
                              onClick={() => toggleSlideSelection(template.id, variant.key)}
                              onMouseEnter={() => {
                                if (variantPopoverHideTimerRef.current) {
                                  clearTimeout(variantPopoverHideTimerRef.current);
                                  variantPopoverHideTimerRef.current = null;
                                }
                                setVariantPopover({
                                  templateId: template.id,
                                  templateName: template.name,
                                  variant,
                                  preview: variant.preview || '',
                                  displayName: variant.displayName,
                                });
                                if (variantPopoverVisibleRef.current) {
                                  // Already visible - just update content, no delay (prevents jumping)
                                } else {
                                  if (variantPopoverShowTimerRef.current) clearTimeout(variantPopoverShowTimerRef.current);
                                  variantPopoverShowTimerRef.current = setTimeout(() => {
                                    setVariantPopoverVisible(true);
                                    variantPopoverShowTimerRef.current = null;
                                  }, 2000);
                                }
                              }}
                            >
                              <div className="variant-grid__thumb-wrapper">
                                {variant.preview ? (
                                  <img 
                                    src={variant.preview} 
                                    alt={variant.displayName}
                                    className="variant-grid__thumb"
                                  />
                                ) : (
                                  <div className="variant-grid__thumb variant-grid__thumb--empty">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" opacity="0.3">
                                      <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
                                    </svg>
                                  </div>
                                )}
                                {isTemplateSaved(template.id, variant.key) && (
                                  <button 
                                    className="variant-grid__saved"
                                    onClick={(e) => { e.stopPropagation(); toggleSaveTemplate(template.id, variant.key); }}
                                    title="Unsave"
                                  >
                                    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                                      <path d="M2 2v13.5a.5.5 0 0 0 .74.439L8 13.069l5.26 2.87A.5.5 0 0 0 14 15.5V2a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z"/>
                                    </svg>
                                  </button>
                                )}
                              </div>
                              <span className="variant-grid__name">{variant.displayName}</span>
                              {isSelected && (
                                <div className="variant-grid__check">
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
                                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                                  </svg>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
            </div>
                  );
                })()}

                {/* Only show main preview for single components, not component sets */}
                {template.preview && !(template.isComponentSet && template.variants && template.variants.length > 1) && (
                  <div
                    className={`template-item__preview ${refreshingId === template.id ? 'template-item__preview--refreshing' : ''}`}
                    onMouseEnter={() => {
                      if (variantPopoverHideTimerRef.current) {
                        clearTimeout(variantPopoverHideTimerRef.current);
                        variantPopoverHideTimerRef.current = null;
                      }
                      setVariantPopover({
                        templateId: template.id,
                        templateName: template.name,
                        preview: template.preview,
                        displayName: template.name,
                      });
                      if (!variantPopoverVisibleRef.current) {
                        if (variantPopoverShowTimerRef.current) clearTimeout(variantPopoverShowTimerRef.current);
                        variantPopoverShowTimerRef.current = setTimeout(() => {
                          setVariantPopoverVisible(true);
                          variantPopoverShowTimerRef.current = null;
                        }, 2000);
                      }
                    }}
                    onMouseLeave={() => {
                      if (variantPopoverHideTimerRef.current) clearTimeout(variantPopoverHideTimerRef.current);
                      variantPopoverHideTimerRef.current = setTimeout(() => {
                        setVariantPopoverVisible(false);
                        setVariantPopover(null);
                        variantPopoverHideTimerRef.current = null;
                      }, 200);
                    }}
                  >
                    <img src={template.preview} alt={template.name} />
                    {refreshingId === template.id && (
                      <div className="template-item__refresh-overlay">
                        <svg className="template-item__refresh-spinner" width="24" height="24" viewBox="0 0 16 16" fill="currentColor">
                          <path fillRule="evenodd" d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"/>
                          <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z"/>
                        </svg>
                      </div>
                    )}
                    {isTemplateSaved(template.id) && (
                      <button 
                        className="template-item__preview-saved"
                        onClick={(e) => { e.stopPropagation(); toggleSaveTemplate(template.id); }}
                        title="Unsave"
                      >
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                          <path d="M2 2v13.5a.5.5 0 0 0 .74.439L8 13.069l5.26 2.87A.5.5 0 0 0 14 15.5V2a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z"/>
                        </svg>
                      </button>
                    )}
          </div>
                )}

                <div className="template-item__footer">
                  <p className="template-item__desc">{template.description}</p>
              <Button 
                    variant="brand-outline" 
                    size="small"
                    onClick={() => insertTemplate(template)}
                    loading={insertingId === template.id}
                  >
                    Insert
              </Button>
                  <div className="template-item__more" ref={moveMenuOpen === template.id ? moveMenuRef : null}>
                    <button 
                      className="template-item__more-btn" 
                      onClick={() => setMoveMenuOpen(moveMenuOpen === template.id ? null : template.id)}
                    >
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M3 9.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z"/>
                      </svg>
                    </button>
                    {moveMenuOpen === template.id && (
                      <div className="template-item__more-dropdown">
                        {activeCategory === 'saved' ? (
                          /* When viewing Saved category - only Unsave option */
                          <>
                            {template.isComponentSet && template.variants && template.variants.length > 1 ? (
                              /* Component set - show unsave for each saved variant */
                              template.variants
                                .filter(v => isTemplateSaved(template.id, v.key))
                                .map(variant => (
                                  <button
                                    key={variant.key}
                                    className="template-item__more-option"
                                    onClick={() => toggleSaveTemplate(template.id, variant.key)}
                                  >
                                    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                                      <path d="M2 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v13.5a.5.5 0 0 1-.777.416L8 13.101l-5.223 2.815A.5.5 0 0 1 2 15.5V2zm2-1a1 1 0 0 0-1 1v12.566l4.723-2.482a.5.5 0 0 1 .554 0L13 14.566V2a1 1 0 0 0-1-1H4z"/>
                                    </svg>
                                    Unsave {variant.displayName}
                                  </button>
                                ))
                            ) : (
                              /* Single component */
                              <button
                                className="template-item__more-option"
                                onClick={() => toggleSaveTemplate(template.id)}
                              >
                                <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                                  <path d="M2 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v13.5a.5.5 0 0 1-.777.416L8 13.101l-5.223 2.815A.5.5 0 0 1 2 15.5V2zm2-1a1 1 0 0 0-1 1v12.566l4.723-2.482a.5.5 0 0 1 .554 0L13 14.566V2a1 1 0 0 0-1-1H4z"/>
                                </svg>
                                Unsave
                              </button>
                            )}
                          </>
                        ) : (
                          /* Normal view - all options */
                          <>
                            {/* Save/Unsave */}
                            {template.isComponentSet && template.variants && template.variants.length > 1 ? (
                              /* Component set - show Save variant with submenu */
                              <>
                                <button
                                  className={`template-item__more-option ${isAnyVariantSaved(template.id) ? 'is-saved' : ''}`}
                                  onClick={() => {
                                    // If any variant is saved, unsave all; otherwise save all
                                    const allSaved = template.variants.every(v => isTemplateSaved(template.id, v.key));
                                    template.variants.forEach(variant => {
                                      if (allSaved) {
                                        // Unsave all
                                        if (isTemplateSaved(template.id, variant.key)) {
                                          toggleSaveTemplate(template.id, variant.key);
                                        }
                                      } else {
                                        // Save all unsaved variants
                                        if (!isTemplateSaved(template.id, variant.key)) {
                                          toggleSaveTemplate(template.id, variant.key);
                                        }
                                      }
                                    });
                                  }}
                                >
                                  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                                    {isAnyVariantSaved(template.id) ? (
                                      <path d="M2 2v13.5a.5.5 0 0 0 .74.439L8 13.069l5.26 2.87A.5.5 0 0 0 14 15.5V2a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z"/>
                                    ) : (
                                      <path d="M2 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v13.5a.5.5 0 0 1-.777.416L8 13.101l-5.223 2.815A.5.5 0 0 1 2 15.5V2zm2-1a1 1 0 0 0-1 1v12.566l4.723-2.482a.5.5 0 0 1 .554 0L13 14.566V2a1 1 0 0 0-1-1H4z"/>
                                    )}
                                  </svg>
                                  {isAnyVariantSaved(template.id) ? 'Unsave all' : 'Save all'}
                                </button>
                                <div className="template-item__more-divider"></div>
                                <div className="template-item__more-option template-item__more-option--header">
                                  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                                    <path d="M2 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v13.5a.5.5 0 0 1-.777.416L8 13.101l-5.223 2.815A.5.5 0 0 1 2 15.5V2zm2-1a1 1 0 0 0-1 1v12.566l4.723-2.482a.5.5 0 0 1 .554 0L13 14.566V2a1 1 0 0 0-1-1H4z"/>
                                  </svg>
                                  <span>Save variant</span>
                                </div>
                                <div className="template-item__more-submenu">
                                  {template.variants.map(variant => (
                                    <button
                                      key={variant.key}
                                      className={`template-item__more-option ${isTemplateSaved(template.id, variant.key) ? 'is-saved' : ''}`}
                                      onClick={() => toggleSaveTemplate(template.id, variant.key)}
                                    >
                                      {isTemplateSaved(template.id, variant.key) && (
                                        <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                                          <path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z"/>
                                        </svg>
                                      )}
                                      {variant.displayName}
                                    </button>
                                  ))}
                                </div>
                              </>
                            ) : (
                              /* Single component - simple Save/Unsave */
                              <button
                                className={`template-item__more-option ${isTemplateSaved(template.id) ? 'is-saved' : ''}`}
                                onClick={() => toggleSaveTemplate(template.id)}
                              >
                                <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                                  {isTemplateSaved(template.id) ? (
                                    <path d="M2 2v13.5a.5.5 0 0 0 .74.439L8 13.069l5.26 2.87A.5.5 0 0 0 14 15.5V2a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z"/>
                                  ) : (
                                    <path d="M2 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v13.5a.5.5 0 0 1-.777.416L8 13.101l-5.223 2.815A.5.5 0 0 1 2 15.5V2zm2-1a1 1 0 0 0-1 1v12.566l4.723-2.482a.5.5 0 0 1 .554 0L13 14.566V2a1 1 0 0 0-1-1H4z"/>
                                  )}
                                </svg>
                                {isTemplateSaved(template.id) ? 'Unsave' : 'Save'}
                              </button>
                            )}
                            
                            <div className="template-item__more-divider"></div>
                            
                            {/* Move to Category */}
                            <div className="template-item__more-option template-item__more-option--header">
                              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                                <path fillRule="evenodd" d="M1 8a.5.5 0 0 1 .5-.5h11.793l-3.147-3.146a.5.5 0 0 1 .708-.708l4 4a.5.5 0 0 1 0 .708l-4 4a.5.5 0 0 1-.708-.708L13.293 8.5H1.5A.5.5 0 0 1 1 8z"/>
                              </svg>
                              <span>Move to</span>
                              <svg className="template-item__more-chevron" width="10" height="10" viewBox="0 0 16 16" fill="currentColor">
                                <path fillRule="evenodd" d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708z"/>
                              </svg>
                            </div>
                            <div className="template-item__more-submenu">
                              {(() => {
                                const moveToCats = baseCategories.filter(c => c.id !== 'all' && c.id !== 'saved' && c.id !== template.category);
                                if (!moveToCats.some(c => c.id === 'resources')) {
                                  moveToCats.push({ id: 'resources', label: 'Resources' });
                                }
                                return moveToCats.map(cat => (
                                  <button
                                    key={cat.id}
                                    className="template-item__more-option"
                                    onClick={() => moveTemplateToCategory(template.id, cat.id)}
                                  >
                                    {cat.label}
                                  </button>
                                ));
                              })()}
                            </div>
                            
                            {/* Create New Section - same hierarchy as Refresh/Delete */}
                            <button
                              className="template-item__more-option template-item__more-option--create"
                              onClick={() => {
                                setCreateSectionForTemplate(template.id);
                                setMoveMenuOpen(null);
                              }}
                            >
                              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                                <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/>
                              </svg>
                              Create New Section
                            </button>
                            
                            <div className="template-item__more-divider"></div>
                            
                            {/* Refresh Preview */}
                            <button
                              className="template-item__more-option"
                              onClick={() => refreshTemplate(template)}
                              disabled={refreshingId === template.id}
                            >
                              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                                <path fillRule="evenodd" d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"/>
                                <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z"/>
                              </svg>
                              {refreshingId === template.id ? 'Refreshing...' : 'Refresh Preview'}
                            </button>
                            
                            <div className="template-item__more-divider"></div>
                            
                            {/* Delete */}
                            <button
                              className="template-item__more-option template-item__more-option--danger"
                              onClick={() => confirmDeleteTemplate(template.id)}
                            >
                              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                                <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
                                <path fillRule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
                              </svg>
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
            </div>
          </div>
            );
          })
        )}
        </div>
      </div>

      {/* Variant grid hover popover - larger preview after 2s delay, fixed at top of plugin */}
      {variantPopoverVisible && variantPopover && typeof document !== 'undefined' && document.body && createPortal(
        <div
          ref={variantPopoverRef}
          className="variant-grid-popover"
          style={{
            position: 'fixed',
            left: '50%',
            top: 12,
            transform: 'translateX(-50%)',
            zIndex: 1000,
          }}
          onMouseEnter={() => {
            if (variantPopoverHideTimerRef.current) {
              clearTimeout(variantPopoverHideTimerRef.current);
              variantPopoverHideTimerRef.current = null;
            }
          }}
          onMouseLeave={() => {
            variantPopoverHideTimerRef.current = setTimeout(() => {
              setVariantPopoverVisible(false);
              setVariantPopover(null);
              variantPopoverHideTimerRef.current = null;
            }, 200);
          }}
        >
          <div className="variant-grid-popover__content">
            <div className="variant-grid-popover__preview">
              {(variantPopover.variant ? variantPopoverHighResPreview : null) || variantPopover.preview ? (
                <img src={(variantPopover.variant ? variantPopoverHighResPreview : null) || variantPopover.preview || ''} alt={variantPopover.displayName} />
              ) : (
                <div className="variant-grid-popover__empty">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor" opacity="0.3">
                    <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
                  </svg>
                </div>
              )}
            </div>
            <div className="variant-grid-popover__meta">
              <span className="variant-grid-popover__name">{variantPopover.displayName}</span>
              <span className="variant-grid-popover__template">{variantPopover.templateName}</span>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Footer - Fixed at bottom for all views */}
      <footer className="app-footer">
        <span>Need help? prantik.banerjee@salesforce.com</span>
        {isBackgroundSyncing ? (
          <span className="app-footer__syncing">
            <svg className="app-footer__sync-icon" width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
              <path fillRule="evenodd" d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"/>
              <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z"/>
            </svg>
            Syncing...
          </span>
        ) : (
          <span>v{VERSION}</span>
        )}
      </footer>
      
      {/* Modals - Outside scroll container - Fixed position */}
      {showAddCloudModal && (
        <div className="modal-overlay" onClick={cancelAddCloud}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <h3 className="modal__title">Add Cloud / Team</h3>
              <button className="modal__close" onClick={cancelAddCloud}>×</button>
            </div>
            <div className="modal__body">
              <div 
                className="modal__icon-upload"
                onClick={() => cloudIconInputRef.current?.click()}
              >
                {newCloudIcon ? (
                  <img src={newCloudIcon} alt="Icon" className="modal__uploaded-icon" />
                ) : (
                  <div className="modal__icon-placeholder">
                    <span>+</span>
                    <span className="modal__icon-hint">Upload Icon</span>
                  </div>
                )}
                <input
                  ref={cloudIconInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleCloudIconUpload}
                  style={{ display: 'none' }}
                />
              </div>
              <Input
                label="Cloud or Team Name"
                placeholder="e.g. Data Cloud, My Team"
                value={newCloudName}
                onChange={(e) => setNewCloudName(e.target.value)}
              />
            </div>
            <div className="modal__footer">
              <Button variant="neutral" onClick={cancelAddCloud}>Cancel</Button>
              <Button 
                variant="brand" 
                onClick={saveNewCloud}
                disabled={!newCloudName.trim() || !newCloudIcon}
              >
                Add Cloud
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Create New Section Modal */}
      {createSectionForTemplate && (
        <div className="modal-overlay" onClick={() => { setCreateSectionForTemplate(null); setNewSectionName(''); }}>
          <div className="modal modal--small" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <h3 className="modal__title">Create New Section</h3>
              <button className="modal__close" onClick={() => { setCreateSectionForTemplate(null); setNewSectionName(''); }}>×</button>
            </div>
            <div className="modal__body">
              <p className="modal__text" style={{ marginBottom: '12px' }}>
                Enter a name for the new section. "<strong>{templates.find(t => t.id === createSectionForTemplate)?.name}</strong>" will be moved to this section.
              </p>
              <Input
                label="Section Name"
                placeholder="e.g., Icons, Patterns, Templates..."
                value={newSectionName}
                onChange={(e) => setNewSectionName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newSectionName.trim()) {
                    createSectionAndMoveTemplate();
                  }
                }}
                autoFocus
              />
            </div>
            <div className="modal__footer">
              <Button variant="neutral" onClick={() => { setCreateSectionForTemplate(null); setNewSectionName(''); }}>Cancel</Button>
              <Button 
                variant="brand" 
                onClick={createSectionAndMoveTemplate}
                disabled={!newSectionName.trim()}
              >
                Create & Move
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {deleteConfirmId && (
        <div className="modal-overlay" onClick={() => setDeleteConfirmId(null)}>
          <div className="modal modal--small" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <h3 className="modal__title">Move to Trash?</h3>
              <button className="modal__close" onClick={() => setDeleteConfirmId(null)}>×</button>
            </div>
            <div className="modal__body">
              <p className="modal__text">
                "<strong>{templates.find(t => t.id === deleteConfirmId)?.name}</strong>" will be moved to trash. You can restore it later from the menu.
              </p>
            </div>
            <div className="modal__footer">
              <Button variant="neutral" onClick={() => setDeleteConfirmId(null)}>Cancel</Button>
              <Button 
                variant="destructive" 
                onClick={() => deleteTemplate(deleteConfirmId)}
              >
                Move to Trash
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Trash Modal */}
      {showTrashModal && (
        <div className="modal-overlay" onClick={() => setShowTrashModal(false)}>
          <div className="modal modal--trash" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <h3 className="modal__title">Trash ({deletedTemplates.length})</h3>
              <button className="modal__close" onClick={() => setShowTrashModal(false)}>×</button>
            </div>
            <div className="modal__body">
              {deletedTemplates.length === 0 ? (
                <p className="modal__text">No deleted items</p>
              ) : (
                <div className="trash-list">
                  {deletedTemplates.map(template => (
                    <div key={template.id} className="trash-item">
                      <div className="trash-item__preview">
                        {template.preview ? (
                          <img src={template.preview} alt={template.name} />
                        ) : (
                          <div className="trash-item__preview-placeholder">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                              <rect x="3" y="3" width="18" height="18" rx="2" />
                              <circle cx="8.5" cy="8.5" r="1.5" />
                              <path d="M21 15l-5-5L5 21" />
                            </svg>
                          </div>
                        )}
                      </div>
                      <div className="trash-item__info">
                        <span className="trash-item__name">{template.name}</span>
                        <span className="trash-item__category">{categoryLabels[template.category] || template.category}</span>
                      </div>
                      <div className="trash-item__actions">
                        <Button 
                          variant="brand-outline" 
                          size="small"
                          onClick={() => { restoreTemplate(template.id); }}
                        >
                          Restore
                        </Button>
                        <Button 
                          variant="destructive" 
                          size="small"
                          onClick={() => permanentlyDeleteTemplate(template.id)}
                        >
                          Delete Forever
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Cloud Delete Confirmation Modal */}
      {deleteCloudConfirmId && (
        <div className="modal-overlay" onClick={() => setDeleteCloudConfirmId(null)}>
          <div className="modal modal--small" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <h3 className="modal__title">Delete Cloud?</h3>
              <button className="modal__close" onClick={() => setDeleteCloudConfirmId(null)}>×</button>
            </div>
            <div className="modal__body">
              <p className="modal__text">
                This will move "<strong>{allClouds.find(c => c.id === deleteCloudConfirmId)?.name}</strong>" and all its assets, categories, links, and POCs to trash. You can restore it later.
              </p>
            </div>
            <div className="modal__footer">
              <Button variant="neutral" onClick={() => setDeleteCloudConfirmId(null)}>Cancel</Button>
              <Button 
                variant="destructive" 
                onClick={() => deleteCloud(deleteCloudConfirmId)}
              >
                Move to Trash
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Activity Log Modal */}
      {showActivityHistoryModal && (
        <div className={`modal-overlay modal-overlay--activity-history ${isDarkMode ? 'dark-mode' : ''}`} onClick={() => setShowActivityHistoryModal(false)}>
          <div className="modal modal--activity-history" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header modal__header--activity-history">
              <div className="modal__header-top">
                <h3 className="modal__title">Activity Log</h3>
                <button className="modal__close" onClick={() => setShowActivityHistoryModal(false)}>×</button>
              </div>
              <p className="activity-history__description activity-history__description--above-divider">
                Everything stays safe. Restore deleted items without affecting others.
              </p>
            </div>
            <div className="modal__body">
              <div className="activity-history__intro">
                <div className="activity-history__filter">
                <div className="activity-history__cloud-switcher" ref={activityHistoryCloudSelectorRef}>
                  <button
                    className="activity-history__cloud-switcher-btn"
                    onClick={() => setShowActivityHistoryCloudSelector(!showActivityHistoryCloudSelector)}
                  >
                    <img
                      src={(allClouds.find(c => c.id === activityHistoryCloudFilter) ?? allClouds[0])?.icon || SalesCloudIcon}
                      alt="Cloud"
                      className="activity-history__cloud-switcher-icon"
                    />
                    <span className="activity-history__cloud-switcher-text">
                      {(allClouds.find(c => c.id === activityHistoryCloudFilter) ?? allClouds[0])?.name || 'Sales Cloud'}
                    </span>
                    <svg className="activity-history__cloud-switcher-caret" width="10" height="6" viewBox="0 0 10 6" fill="currentColor">
                      <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                    </svg>
                  </button>
                  {showActivityHistoryCloudSelector && (
                    <div className="cloud-selector-dropdown cloud-selector-dropdown--activity-history">
                      <div className="cloud-selector-dropdown__header">Select Cloud</div>
                      {visibleClouds.map(cloud => (
                        <div
                          key={cloud.id}
                          className={`cloud-selector-dropdown__item ${activityHistoryCloudFilter === cloud.id ? 'is-selected' : ''}`}
                          onClick={() => {
                            setActivityHistoryCloudFilter(cloud.id);
                            loadActivityLog(cloud.id);
                            fetchActivityHistoryStats(cloud.id);
                            setShowActivityHistoryCloudSelector(false);
                          }}
                        >
                          <img src={cloud.icon} alt={cloud.name} className="cloud-selector-dropdown__icon" />
                          <span className="cloud-selector-dropdown__name">{cloud.name}</span>
                          {defaultCloud === cloud.id && (
                            <span className="cloud-selector-dropdown__default-badge">Default</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="activity-history__time-filter" ref={activityHistoryTimeFilterRef}>
                  <button
                    className="activity-history__time-filter-btn"
                    onClick={() => setShowActivityHistoryTimeFilter(!showActivityHistoryTimeFilter)}
                  >
                    <span className="activity-history__time-filter-text">
                      {activityHistoryTimeFilter === '7d' ? 'Last 7 days' : activityHistoryTimeFilter === '30d' ? 'Last 30 days' : 'All time'}
                    </span>
                    <svg className="activity-history__time-filter-caret" width="10" height="6" viewBox="0 0 10 6" fill="currentColor">
                      <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                    </svg>
                  </button>
                  {showActivityHistoryTimeFilter && (
                    <div className="cloud-selector-dropdown cloud-selector-dropdown--activity-history cloud-selector-dropdown--time-filter">
                      {[
                        { value: '7d' as const, label: 'Last 7 days' },
                        { value: '30d' as const, label: 'Last 30 days' },
                        { value: 'all' as const, label: 'All time' },
                      ].map(opt => (
                        <div
                          key={opt.value}
                          className={`cloud-selector-dropdown__item ${activityHistoryTimeFilter === opt.value ? 'is-selected' : ''}`}
                          onClick={() => {
                            setActivityHistoryTimeFilter(opt.value);
                            setShowActivityHistoryTimeFilter(false);
                          }}
                        >
                          <span className="cloud-selector-dropdown__name">{opt.label}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="activity-history__sort" ref={activityHistorySortRef}>
                  <button
                    className="activity-history__sort-btn"
                    onClick={() => setShowActivityHistorySort(!showActivityHistorySort)}
                    title="Sort & group"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 6h18M7 12h10M10 18h4"/>
                    </svg>
                  </button>
                  {showActivityHistorySort && (
                    <div className="cloud-selector-dropdown cloud-selector-dropdown--activity-history cloud-selector-dropdown--sort">
                      <div className="cloud-selector-dropdown__header">Sort by</div>
                      {[
                        { value: 'recency' as const, label: 'Recency' },
                        { value: 'types' as const, label: 'Types' },
                        { value: 'designer' as const, label: 'Designer name' },
                      ].map(opt => (
                        <div
                          key={opt.value}
                          className={`cloud-selector-dropdown__item ${activityHistorySortBy === opt.value ? 'is-selected' : ''}`}
                          onClick={() => {
                            setActivityHistorySortBy(opt.value);
                          }}
                        >
                          <span className="cloud-selector-dropdown__name">{opt.label}</span>
                        </div>
                      ))}
                      <div className="activity-history__sort-toggle-row" onClick={e => e.stopPropagation()}>
                        <label className="slds-checkbox_toggle activity-history__slds-toggle">
                          <input
                            type="checkbox"
                            checked={activityHistoryGroupBy === 'all'}
                            onChange={e => setActivityHistoryGroupBy(e.target.checked ? 'all' : 'none')}
                          />
                          <span className="slds-form-element__label">Group by tags</span>
                          <span className="slds-checkbox_faux" aria-hidden="true" />
                        </label>
                      </div>
                    </div>
                  )}
                </div>
                </div>
                <div className="activity-history__kpi">
                  <span>{(activityHistoryStats ?? celebrationStats)?.componentsAdded ?? 0} added</span>
                  <span className="activity-history__kpi-sep">:</span>
                  <span>{(activityHistoryStats ?? celebrationStats)?.componentsReused ?? 0} reused</span>
                  <span className="activity-history__kpi-sep">:</span>
                  <span>{(activityHistoryStats ?? celebrationStats)?.designersEngaged ?? 0} {(activityHistoryStats ?? celebrationStats)?.designersEngaged === 1 ? 'designer' : 'designers'} engaged</span>
                </div>
              </div>
              
              <div className={`activity-history__content ${selectedActivities.size > 0 ? 'activity-history__content--has-actions' : ''}`}>
              {activityLoading ? (
                <div className="activity-history__loading activity-history__loading--shimmer">
                  {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="activity-history__shimmer-item">
                      <div className="activity-history__shimmer-checkbox" />
                      <div className="activity-history__shimmer-preview" />
                      <div className="activity-history__shimmer-content">
                        <div className="activity-history__shimmer-line activity-history__shimmer-line--short" />
                        <div className="activity-history__shimmer-line activity-history__shimmer-line--medium" />
                        <div className="activity-history__shimmer-line activity-history__shimmer-line--long" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : activityLog.length === 0 ? (
                <div className="activity-history__empty">
                  <img src={ActivityEmptyIllustration} alt="" className="activity-history__empty-illustration" />
                  <h3 className="activity-history__empty-title">No activity yet</h3>
                  <p className="activity-history__empty-description">Activities are logged automatically when you add, update, or delete items.</p>
                </div>
              ) : (() => {
                const now = Date.now();
                let filteredActivityLog = activityLog.filter(a => {
                  if (activityHistoryTimeFilter === 'all') return true;
                  const d = new Date(a.createdAt).getTime();
                  if (activityHistoryTimeFilter === '7d') return d >= now - 7 * 24 * 60 * 60 * 1000;
                  if (activityHistoryTimeFilter === '30d') return d >= now - 30 * 24 * 60 * 60 * 1000;
                  return true;
                });
                filteredActivityLog = [...filteredActivityLog].sort((a, b) => {
                  if (activityHistorySortBy === 'recency') {
                    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                  }
                  if (activityHistorySortBy === 'types') {
                    return (a.action || '').localeCompare(b.action || '');
                  }
                  if (activityHistorySortBy === 'designer') {
                    return (a.userName || '').localeCompare(b.userName || '');
                  }
                  return 0;
                });
                const getTagLabel = (action: string) => getActivityActionLabel(action);
                const renderActivityItem = (activity: ActivityLogEntry) => {
                  const date = new Date(activity.createdAt);
                  const timestamp = formatActivityTime(date);
                  const isRestorable = (activity.action === 'delete' || activity.action === 'delete_forever') && !activity.isRestored;
                  const isSelected = selectedActivities.has(activity.id);
                  const storedPreview = activity.assetData?.preview;
                  const templatePreview = ['add', 'update', 'component_insert'].includes(activity.action) && activity.assetId
                    ? (templates.find(t => t.id === activity.assetId)?.preview ?? (templates.find(t => t.id === activity.assetId)?.variants?.[0] as { preview?: string } | undefined)?.preview)
                    : undefined;
                  const preview = storedPreview ?? templatePreview;
                  const nodeId = activity.assetData?.nodeId as string | undefined;
                  const canGoToComponent = !isRestorable && nodeId;
                  const canFocusTemplate = !isRestorable && !nodeId && activity.assetId && activity.cloudId && ['add', 'update', 'component_insert', 'restore'].includes(activity.action);
                  const handleActivityClick = () => {
                    if (canGoToComponent) {
                      parent.postMessage({ pluginMessage: { type: 'SELECT_NODE', nodeId } }, '*');
                      setShowActivityHistoryModal(false);
                    } else if (canFocusTemplate) {
                      const template = templates.find(t => t.id === activity.assetId);
                      const templateCategory = template?.category ?? activity.category ?? 'all';
                      const categoriesForCloud = (cloudCategories ?? {})[activity.cloudId!] || defaultCategories;
                      const validCategory = categoriesForCloud.some(c => c.id === templateCategory) ? templateCategory : 'all';
                      setSelectedClouds([activity.cloudId!]);
                      setView('home');
                      setShowWelcomeScreen(false);
                      setActiveCategory(validCategory);
                      setContentRefreshKey(k => k + 1);
                      setScrollToTemplateId(activity.assetId!);
                      setShowActivityHistoryModal(false);
                    }
                  };
                  return (
                    <div className={`activity-item ${isRestorable ? 'activity-item--restorable' : ''} ${isSelected ? 'activity-item--selected' : ''} ${(canGoToComponent || canFocusTemplate) ? 'activity-item--clickable' : ''}`}
                      key={activity.id}
                      onClick={isRestorable ? () => toggleActivitySelection(activity.id) : (canGoToComponent || canFocusTemplate) ? handleActivityClick : undefined}
                    >
                      <div className="activity-item__checkbox">
                        <input type="checkbox" checked={isSelected} onChange={isRestorable ? () => toggleActivitySelection(activity.id) : undefined} onClick={(e) => e.stopPropagation()} disabled={!isRestorable} />
                      </div>
                      <div className="activity-item__preview">
                        {preview ? <img src={preview} alt={activity.assetName} /> : (
                          <div className="activity-item__preview-placeholder">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>
                          </div>
                        )}
                      </div>
                      <div className="activity-item__content">
                        <div className="activity-item__header">
                          <span className={`activity-badge ${getActivityBadgeClass(activity.action)}`}>{getActivityActionLabel(activity.action)}</span>
                          <span className="activity-item__timestamp">{timestamp}</span>
                        </div>
                        <div className="activity-item__name">{activity.assetName}</div>
                        <div className="activity-item__meta">
                          {activity.cloudName && <span>{activity.cloudName}</span>}
                          {activity.cloudName && activity.userName && <span> • </span>}
                          {activity.userName && <span>by {activity.userName}</span>}
                        </div>
                      </div>
                    </div>
                  );
                };
                const tagOrder = ['add', 'update', 'component_insert', 'restore', 'delete', 'delete_forever', 'page_structure', 'section_create', 'section_update', 'section_delete', 'poc_add', 'poc_update', 'poc_delete'];
                return filteredActivityLog.length === 0 ? (
                  <div className="activity-history__empty">
                    <img src={ActivityEmptyIllustration} alt="" className="activity-history__empty-illustration" />
                    <h3 className="activity-history__empty-title">No activity in this period</h3>
                    <p className="activity-history__empty-description">Try selecting a different time range.</p>
                  </div>
                ) : (
                <div className="activity-list">
                  {activityHistoryGroupBy === 'all' ? (
                    (() => {
                      const grouped = filteredActivityLog.reduce<Record<string, ActivityLogEntry[]>>((acc, a) => {
                        const tag = a.action || 'other';
                        if (!acc[tag]) acc[tag] = [];
                        acc[tag].push(a);
                        return acc;
                      }, {});
                      const orderedTags = [...new Set([...tagOrder.filter(t => grouped[t]), ...Object.keys(grouped).filter(k => !tagOrder.includes(k))])];
                      return orderedTags.map(tag => (
                        <div key={tag} className="activity-history__group">
                          <div className="activity-history__group-header">{getTagLabel(tag)}</div>
                          {grouped[tag].map(a => renderActivityItem(a))}
                        </div>
                      ));
                    })()
                  ) : (
                    filteredActivityLog.map(a => renderActivityItem(a))
                  )}
                </div>
              );
            })()}
            
            {selectedActivities.size > 0 && (
              <div className="activity-history__footer">
                <div className="activity-history__actions activity-history__actions--animated">
                  <Button 
                    variant="brand" 
                    size="small"
                    className="activity-history__action-btn"
                    onClick={handleRestoreSelected}
                    disabled={activityRestoring}
                  >
                    {activityRestoring ? 'Restoring...' : `Restore Selected (${selectedActivities.size})`}
                  </Button>
                  <Button 
                    variant="neutral" 
                    size="small"
                    className="activity-history__action-btn"
                    onClick={() => setSelectedActivities(new Set())}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Version History Modal */}
      {showDataRecoveryModal && (
        <div className={`modal-overlay modal-overlay--activity-history ${isDarkMode ? 'dark-mode' : ''}`} onClick={() => setShowDataRecoveryModal(false)}>
          <div className="modal modal--activity-history modal--data-recovery" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header modal__header--activity-history">
              <div className="modal__header-top">
                <div className="data-recovery__title-row">
                  <span className="data-recovery__title-icon" aria-hidden>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                    </svg>
                  </span>
                  <h3 className="modal__title">Version History</h3>
                </div>
                <button className="modal__close" onClick={() => setShowDataRecoveryModal(false)} aria-label="Close">×</button>
              </div>
              <p className="activity-history__description activity-history__description--above-divider">
                Restore from your most recent backup.
              </p>
            </div>
            <div className="modal__body">
              {dataRecoveryError ? (
                <div className="data-recovery__error">
                  <p>{dataRecoveryError}</p>
                  <Button variant="brand-outline" size="small" onClick={loadLatestBackupSummary}>
                    Retry
                  </Button>
                </div>
              ) : dataRecoveryLoading ? (
                <div className="data-recovery__loading">
                  <Spinner size="small" />
                  <span>Loading backups...</span>
                </div>
              ) : !latestBackupSummary || latestBackupSummary.backupsToRestore.length === 0 ? (
                <div className="data-recovery__empty">
                  <div className="data-recovery__empty-icon">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                    </svg>
                  </div>
                  <h3 className="data-recovery__empty-title">No backups yet</h3>
                  <p className="data-recovery__empty-description">Save templates or customize clouds to create your first backup.</p>
                </div>
              ) : (
                <div className="version-history__simplified">
                  <div className="version-history__summary">
                    <div className="version-history__summary-row">
                      <span className="version-history__summary-count">{latestBackupSummary.clouds}</span>
                      <span className="version-history__summary-label">clouds</span>
                    </div>
                    <div className="version-history__summary-row">
                      <span className="version-history__summary-count">{latestBackupSummary.assets}</span>
                      <span className="version-history__summary-label">assets</span>
                    </div>
                    <div className="version-history__summary-row">
                      <span className="version-history__summary-count">{latestBackupSummary.sections}</span>
                      <span className="version-history__summary-label">sections</span>
                    </div>
                  </div>
                  <div className="version-history__scroll">
                    {latestBackupSummary.details && latestBackupSummary.details.length > 0 && (
                      <div className="version-history__details">
                        <table className="version-history__details-table">
                          <thead>
                            <tr>
                              <th>Cloud</th>
                              <th>Components</th>
                              <th>Sections</th>
                            </tr>
                          </thead>
                          <tbody>
                            {latestBackupSummary.details.map(row => (
                              <tr key={row.cloudId}>
                                <td>
                                  <span className="version-history__details-cloud">
                                    <img src={row.icon || SalesCloudIcon} alt="" className="version-history__details-icon" />
                                    {row.cloudName}
                                  </span>
                                </td>
                                <td>{row.components}</td>
                                <td>{row.sections}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                  <div className="version-history__footer">
                    <p className="version-history__backup-date">Backup: {latestBackupSummary.backupDate}</p>
                    <p className="version-history__assurance">Don&apos;t worry — your data is safe with us. We&apos;ll back up your current state before restoring.</p>
                    <Button
                      variant="brand"
                      size="medium"
                      className="version-history__cta"
                      onClick={() => setShowRestoreConfirm(true)}
                      disabled={dataRecoveryRestoring}
                    >
                      {dataRecoveryRestoring ? 'Restoring...' : 'Backup and Restore'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Restore Confirmation Modal - on top of Version History */}
      {showRestoreConfirm && (
        <div className="restore-confirm-overlay" onClick={() => setShowRestoreConfirm(false)}>
          <div className="restore-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <p className="restore-confirm-modal__message">Restore from your most recent backup? Your current data will be backed up first.</p>
            <div className="restore-confirm-modal__actions">
              <button className="restore-confirm-modal__cancel" onClick={() => setShowRestoreConfirm(false)}>Cancel</button>
              <button className="restore-confirm-modal__ok" onClick={confirmDataRecoveryRestore}>OK</button>
            </div>
          </div>
        </div>
      )}
      
      {/* Cloud Trash Modal */}
      {showCloudTrashModal && (
        <div className="modal-overlay" onClick={() => setShowCloudTrashModal(false)}>
          <div className="modal modal--trash" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <h3 className="modal__title">Cloud Trash ({deletedClouds.length})</h3>
              <button className="modal__close" onClick={() => setShowCloudTrashModal(false)}>×</button>
            </div>
            <div className="modal__body">
              {deletedClouds.length === 0 ? (
                <p className="modal__text">No deleted clouds</p>
              ) : (
                <div className="trash-list">
                  {deletedClouds.map(deletedCloud => (
                    <div key={deletedCloud.cloud.id} className="trash-item">
                      <div className="trash-item__preview" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <img src={deletedCloud.cloud.icon} alt={deletedCloud.cloud.name} style={{ width: 48, height: 48, objectFit: 'contain' }} />
                      </div>
                      <div className="trash-item__info">
                        <span className="trash-item__name">{deletedCloud.cloud.name}</span>
                        <span className="trash-item__category">
                          {deletedCloud.templates.length} assets, {deletedCloud.categories.length} categories
                        </span>
                      </div>
                      <div className="trash-item__actions">
                        <Button 
                          variant="brand-outline" 
                          size="small"
                          onClick={() => restoreCloud(deletedCloud)}
                        >
                          Restore All
                        </Button>
                        <Button 
                          variant="destructive" 
                          size="small"
                          onClick={() => permanentlyDeleteCloud(deletedCloud.cloud.id)}
                        >
                          Delete Forever
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
