import React, { useState, useEffect, useRef } from 'react';

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

// Onboarding component not used - using inline splash screen

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
  { id: 'all', label: 'All' },
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
  // Onboarding state
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState<boolean | null>(null);
  const [showSplash, setShowSplash] = useState(true);
  const [skipSplashOnLaunch, setSkipSplashOnLaunch] = useState(false);
  const [showMoreCloudsInSplash, setShowMoreCloudsInSplash] = useState(false);
  
  // Core state
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedClouds, setSelectedClouds] = useState<string[]>(['sales']);
  const [activeCategory, setActiveCategory] = useState('all');
  const [insertingId, setInsertingId] = useState<string | null>(null);
  const [expandedTemplate, setExpandedTemplate] = useState<string | null>(null);
  const [moveMenuOpen, setMoveMenuOpen] = useState<string | null>(null);
  const [selectedVariants, setSelectedVariants] = useState<Record<string, Record<string, string>>>({});
  const [selectedSlides, setSelectedSlides] = useState<Record<string, string[]>>({}); // For multi-select
  const [isScaffolding, setIsScaffolding] = useState(false);
  const [scaffoldExists, setScaffoldExists] = useState(false);
  const [showPagesCreatedMessage, setShowPagesCreatedMessage] = useState(false);
  const [isEditingScaffold, setIsEditingScaffold] = useState(false);
  const [isEditingStatusBadges, setIsEditingStatusBadges] = useState(false);
  const [selectedCoverVariant, setSelectedCoverVariant] = useState<{templateId: string; variantKey?: string; name: string} | null>(null);
  const [showCoverSelector, setShowCoverSelector] = useState(false);
  
  // Cloud POCs (Point of Contact) - per cloud
  interface CloudPOC {
    name: string;
    email: string;
  }
  const [cloudPOCs, setCloudPOCs] = useState<Record<string, CloudPOC[]>>({});
  
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
  
  // Figma Links feature (per cloud)
  const [cloudFigmaLinks, setCloudFigmaLinks] = useState<Record<string, Array<{id: string; name: string; url: string}>>>({});
  const [showLinksDropdown, setShowLinksDropdown] = useState(false);
  const [isAddingLink, setIsAddingLink] = useState(false);
  const [newLinkName, setNewLinkName] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  
  // Settings accordion state
  const [expandedSettingsSection, setExpandedSettingsSection] = useState<string | null>(null);
  
  // Cloud selector feature
  const [showCloudSelector, setShowCloudSelector] = useState(false);
  const [defaultCloud, setDefaultCloud] = useState<string | null>(null);
  const [hoveredCloud, setHoveredCloud] = useState<string | null>(null);
  const [showAddCloudModal, setShowAddCloudModal] = useState(false);
  const [newCloudName, setNewCloudName] = useState('');
  const [newCloudIcon, setNewCloudIcon] = useState<string | null>(null);
  
  // Delete confirmation
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  
  // Saved templates/variants (simple bookmark feature)
  // Format: [{templateId: string, variantKey?: string}, ...]
  const [savedItems, setSavedItems] = useState<Array<{templateId: string; variantKey?: string}>>([]);
  
  // Cloud visibility and per-cloud settings
  const [hiddenClouds, setHiddenClouds] = useState<string[]>([]);
  const [cloudCategories, setCloudCategories] = useState<Record<string, Array<{id: string; label: string}>>>({});
  
  // Drag and drop state
  const [draggedItem, setDraggedItem] = useState<{ type: string; index: number } | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  
  // Default categories (used for reset and initial state)
  const defaultCategories = [
    { id: 'all', label: 'All' },
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
  const [statusSymbols, setStatusSymbols] = useState(defaultStatusSymbols);
  
  // Refs for click-outside handling
  const linksDropdownRef = useRef<HTMLDivElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const cloudSelectorRef = useRef<HTMLDivElement>(null);
  const cloudIconInputRef = useRef<HTMLInputElement>(null);
  const splashMoreDropdownRef = useRef<HTMLDivElement>(null);
  const coverSelectorRef = useRef<HTMLDivElement>(null);
  const moveMenuRef = useRef<HTMLDivElement>(null);

  // Load templates and figma links from Figma's clientStorage on mount
  useEffect(() => {
    // Check if running in Figma or standalone browser
    const isInFigma = window.parent !== window;
    
    if (isInFigma) {
      parent.postMessage({ pluginMessage: { type: 'LOAD_ONBOARDING_STATE' } }, '*');
      parent.postMessage({ pluginMessage: { type: 'LOAD_TEMPLATES' } }, '*');
      parent.postMessage({ pluginMessage: { type: 'CHECK_SCAFFOLD_EXISTS' } }, '*');
      parent.postMessage({ pluginMessage: { type: 'LOAD_FIGMA_LINKS' } }, '*');
      parent.postMessage({ pluginMessage: { type: 'LOAD_DEFAULT_CLOUD' } }, '*');
      parent.postMessage({ pluginMessage: { type: 'LOAD_CUSTOM_CLOUDS' } }, '*');
      parent.postMessage({ pluginMessage: { type: 'LOAD_HIDDEN_CLOUDS' } }, '*');
      parent.postMessage({ pluginMessage: { type: 'LOAD_SAVED_TEMPLATES' } }, '*');
      parent.postMessage({ pluginMessage: { type: 'LOAD_CLOUD_CATEGORIES' } }, '*');
      parent.postMessage({ pluginMessage: { type: 'LOAD_STATUS_SYMBOLS' } }, '*');
      parent.postMessage({ pluginMessage: { type: 'LOAD_CLOUD_POCS' } }, '*');
    } else {
      // Browser preview - skip onboarding
      setHasCompletedOnboarding(true);
      setShowSplash(false);
    }
    
    // Fallback timeout - if no response in 2s, assume first-time user
    const timeout = setTimeout(() => {
      setIsLoading(false);
      // Use a setter function to access current state
      setHasCompletedOnboarding(prev => prev === null ? false : prev);
    }, 2000);
    
    return () => clearTimeout(timeout);
  }, []);

  // Add template flow
  const [view, setView] = useState<'home' | 'add' | 'scaffold' | 'settings'>('home');
  const [addStep, setAddStep] = useState<'instructions' | 'loading' | 'configure'>('instructions');
  const [capturedComponent, setCapturedComponent] = useState<ComponentInfo | null>(null);
  const [formName, setFormName] = useState('');
  const [formCloud, setFormCloud] = useState('sales');
  const [formCategory, setFormCategory] = useState('components');
  const [formDescription, setFormDescription] = useState('');
  const [formGoogleSlideLink, setFormGoogleSlideLink] = useState('');

  // ============ MESSAGE HANDLER ============
  useEffect(() => {
    function onMessage(event: MessageEvent) {
      const msg = event.data?.pluginMessage;
      if (!msg) return;

      switch (msg.type) {
        case 'TEMPLATES_LOADED':
          // Templates loaded from Figma's clientStorage
          setTemplates(msg.templates || []);
          setIsLoading(false);
          break;

        case 'TEMPLATES_SAVED':
          // Templates saved confirmation
          break;
          
        case 'SAVED_TEMPLATES_LOADED':
          // Handle both old format (array of strings) and new format (array of objects)
          const loaded = msg.savedItems || msg.savedIds || [];
          const normalized = Array.isArray(loaded) && loaded.length > 0 && typeof loaded[0] === 'string'
            ? loaded.map(id => ({ templateId: id }))
            : loaded;
          setSavedItems(normalized);
          break;

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

        case 'INSERT_SUCCESS':
          setInsertingId(null);
          break;

        case 'INSERT_ERROR':
          setInsertingId(null);
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
          
        case 'FIGMA_LINKS_LOADED':
          // Support both old format (array) and new format (object per cloud)
          if (msg.links && typeof msg.links === 'object' && !Array.isArray(msg.links)) {
            setCloudFigmaLinks(msg.links);
          } else if (Array.isArray(msg.links)) {
            // Migrate old format to new - assign to 'sales' as default
            setCloudFigmaLinks({ sales: msg.links });
          }
          break;

        case 'DEFAULT_CLOUD_LOADED':
          if (msg.cloudId) {
            setDefaultCloud(msg.cloudId);
            setSelectedClouds([msg.cloudId]);
          }
          break;

        case 'ONBOARDING_STATE_LOADED':
          setHasCompletedOnboarding(msg.hasCompleted || false);
          setSkipSplashOnLaunch(msg.skipSplash || false);
          // If skip splash is enabled, hide splash immediately
          if (msg.skipSplash && msg.hasCompleted) {
            setShowSplash(false);
          }
          break;

        case 'CUSTOM_CLOUDS_LOADED':
          if (msg.clouds && Array.isArray(msg.clouds)) {
            setCustomClouds(msg.clouds);
          }
          break;

        case 'HIDDEN_CLOUDS_LOADED':
          if (msg.hiddenClouds && Array.isArray(msg.hiddenClouds)) {
            setHiddenClouds(msg.hiddenClouds);
          }
          break;

        case 'CLOUD_CATEGORIES_LOADED':
          if (msg.categories && typeof msg.categories === 'object') {
            setCloudCategories(msg.categories);
          }
          break;

        case 'STATUS_SYMBOLS_LOADED':
          if (msg.symbols && Array.isArray(msg.symbols) && msg.symbols.length > 0) {
            setStatusSymbols(msg.symbols);
          }
          break;
        case 'CLOUD_POCS_LOADED':
          if (msg.pocs) setCloudPOCs(msg.pocs || {});
          break;

        case 'SCAFFOLD_EXISTS':
          setScaffoldExists(msg.exists);
          setIsScaffolding(false);
          break;
      }
    }

    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

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
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);


  // ============ ACTIONS ============
  
  // Filter templates
  const filteredTemplates = templates.filter(t => {
    const matchCloud = selectedClouds.includes(t.cloudId);
    
    if (activeCategory === 'saved') {
      // Show template if any variant is saved, or if template itself is saved
      return matchCloud && savedItems.some(s => s.templateId === t.id);
    }
    
    const matchCategory = activeCategory === 'all' || t.category === activeCategory;
    return matchCloud && matchCategory;
  });
  
  // Count saved items for the pill
  const savedCount = savedItems.length;

  // Get all cover options (templates + variants)
  const coverOptions: Array<{templateId: string; variantKey?: string; name: string; preview?: string}> = [];
  templates
    .filter(t => t.category === 'cover-pages' || t.name.toLowerCase().includes('cover'))
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
    
    // Update local state
    setTemplates(updated);
    
    // Navigate to the template's category tab
    setActiveCategory(formCategory);
    
    // Make sure the cloud filter includes the template's cloud
    if (!selectedClouds.includes(formCloud)) {
      setSelectedClouds([...selectedClouds, formCloud]);
    }
    
    // Scroll to the new template after render
    setTimeout(() => {
      const element = document.getElementById(`template-${newTemplateId}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Brief highlight effect
        element.classList.add('template-item--highlight');
        setTimeout(() => element.classList.remove('template-item--highlight'), 2000);
      }
    }, 100);
    
    // Save to Figma's clientStorage
    parent.postMessage({ pluginMessage: { type: 'SAVE_TEMPLATES', templates: updated } }, '*');
    
    // Show toast and go home
    parent.postMessage({ pluginMessage: { type: 'SHOW_TOAST', message: `"${capturedComponent.name}" added!` } }, '*');
    setView('home');
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

  // Delete template (with confirmation)
  function confirmDeleteTemplate(id: string) {
    setDeleteConfirmId(id);
    setMoveMenuOpen(null);
  }
  
  function deleteTemplate(id: string) {
    const updated = templates.filter(t => t.id !== id);
    setTemplates(updated);
    parent.postMessage({ pluginMessage: { type: 'SAVE_TEMPLATES', templates: updated } }, '*');
    // Also remove from saved (all variants of this template)
    const updatedSaved = savedItems.filter(item => item.templateId !== id);
    setSavedItems(updatedSaved);
    parent.postMessage({ pluginMessage: { type: 'SAVE_SAVED_TEMPLATES', savedItems: updatedSaved } }, '*');
    setDeleteConfirmId(null);
  }
  
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
    parent.postMessage({ pluginMessage: { type: 'SAVE_SAVED_TEMPLATES', savedItems: updated } }, '*');
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

  // Move template to different category
  function moveTemplateToCategory(templateId: string, newCategory: string) {
    const updated = templates.map(t => 
      t.id === templateId ? { ...t, category: newCategory } : t
    );
    setTemplates(updated);
    parent.postMessage({ pluginMessage: { type: 'SAVE_TEMPLATES', templates: updated } }, '*');
    setMoveMenuOpen(null);
    
    // Auto-switch to the new category to show the moved item
    setActiveCategory(newCategory);
  }

  // Export templates to JSON file
  function exportTemplates() {
    const data = {
      version: VERSION,
      exportedAt: new Date().toISOString(),
      templates: templates,
      figmaLinks: figmaLinks,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `starter-kit-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    parent.postMessage({ pluginMessage: { type: 'SHOW_TOAST', message: 'Templates exported!' } }, '*');
  }

  // Import templates from JSON file
  function importTemplates(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        if (data.templates && Array.isArray(data.templates)) {
          setTemplates(data.templates);
          parent.postMessage({ pluginMessage: { type: 'SAVE_TEMPLATES', templates: data.templates } }, '*');
          
          if (data.figmaLinks && Array.isArray(data.figmaLinks)) {
            setFigmaLinks(data.figmaLinks);
            parent.postMessage({ pluginMessage: { type: 'SAVE_FIGMA_LINKS', links: data.figmaLinks } }, '*');
          }
          
          parent.postMessage({ pluginMessage: { type: 'SHOW_TOAST', message: `Imported ${data.templates.length} templates!` } }, '*');
        } else {
          parent.postMessage({ pluginMessage: { type: 'SHOW_TOAST', message: 'Invalid backup file' } }, '*');
        }
      } catch {
        parent.postMessage({ pluginMessage: { type: 'SHOW_TOAST', message: 'Failed to parse file' } }, '*');
      }
    };
    reader.readAsText(file);
    // Reset input so same file can be imported again
    event.target.value = '';
  }

  // Get current cloud's figma links
  const currentCloudId = selectedClouds[0] || 'sales';
  const figmaLinks = cloudFigmaLinks[currentCloudId] || [];
  
  // Figma Links functions
  function addFigmaLink() {
    if (!newLinkName.trim() || !newLinkUrl.trim()) return;
    
    const newLink = {
      id: Date.now().toString(),
      name: newLinkName.trim(),
      url: newLinkUrl.trim()
    };
    
    const updatedLinks = [...figmaLinks, newLink];
    const updatedCloudLinks = { ...cloudFigmaLinks, [currentCloudId]: updatedLinks };
    setCloudFigmaLinks(updatedCloudLinks);
    parent.postMessage({ pluginMessage: { type: 'SAVE_FIGMA_LINKS', links: updatedCloudLinks } }, '*');
    
    setNewLinkName('');
    setNewLinkUrl('');
    setIsAddingLink(false);
  }
  
  function removeFigmaLink(id: string) {
    const updatedLinks = figmaLinks.filter(link => link.id !== id);
    const updatedCloudLinks = { ...cloudFigmaLinks, [currentCloudId]: updatedLinks };
    setCloudFigmaLinks(updatedCloudLinks);
    parent.postMessage({ pluginMessage: { type: 'SAVE_FIGMA_LINKS', links: updatedCloudLinks } }, '*');
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
    parent.postMessage({ pluginMessage: { type: 'SAVE_DEFAULT_CLOUD', cloudId } }, '*');
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
      parent.postMessage({ pluginMessage: { type: 'SAVE_CUSTOM_CLOUDS', clouds: updatedClouds } }, '*');
      parent.postMessage({ pluginMessage: { type: 'SAVE_DEFAULT_CLOUD', cloudId: newCloud.id } }, '*');
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

  // Custom clouds state
  const [customClouds, setCustomClouds] = useState<Array<{id: string; name: string; icon: string; isCustom?: boolean}>>([]);

  // Combined clouds list (default + custom)
  const allClouds = [...clouds, ...customClouds];
  
  // Visible clouds (excluding hidden ones)
  const visibleClouds = allClouds.filter(cloud => !hiddenClouds.includes(cloud.id));
  
  // Get categories for current selected cloud
  const baseCategories = selectedClouds[0] && cloudCategories[selectedClouds[0]] 
    ? cloudCategories[selectedClouds[0]] 
    : defaultCategories;
  
  // Add "Saved" icon pill at the end only when there are saved items
  const currentCategories = savedCount > 0 
    ? [...baseCategories, { id: 'saved', label: 'Saved', iconOnly: true }]
    : baseCategories;
  
  // Auto-fallback to "all" if saved category is empty
  useEffect(() => {
    if (activeCategory === 'saved' && savedCount === 0) {
      setActiveCategory('all');
    }
  }, [savedCount, activeCategory]);
    
  // Helper functions for settings
  function toggleCloudVisibility(cloudId: string) {
    const newHiddenClouds = hiddenClouds.includes(cloudId)
      ? hiddenClouds.filter(id => id !== cloudId)
      : [...hiddenClouds, cloudId];
    setHiddenClouds(newHiddenClouds);
    parent.postMessage({ pluginMessage: { type: 'SAVE_HIDDEN_CLOUDS', hiddenClouds: newHiddenClouds } }, '*');
  }
  
  function updateCloudCategories(cloudId: string, newCategories: Array<{id: string; label: string}>) {
    const updated = { ...cloudCategories, [cloudId]: newCategories };
    setCloudCategories(updated);
    parent.postMessage({ pluginMessage: { type: 'SAVE_CLOUD_CATEGORIES', categories: updated } }, '*');
  }
  
  function updateStatusSymbols(newSymbols: typeof statusSymbols) {
    setStatusSymbols(newSymbols);
    parent.postMessage({ pluginMessage: { type: 'SAVE_STATUS_SYMBOLS', symbols: newSymbols } }, '*');
  }
  
  function updateCloudPOCs(cloudId: string, pocs: CloudPOC[]) {
    const newPOCs = { ...cloudPOCs, [cloudId]: pocs };
    setCloudPOCs(newPOCs);
    parent.postMessage({ pluginMessage: { type: 'SAVE_CLOUD_POCS', pocs: newPOCs } }, '*');
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
      parent.postMessage({ pluginMessage: { type: 'SAVE_HIDDEN_CLOUDS', hiddenClouds: [] } }, '*');
      parent.postMessage({ pluginMessage: { type: 'SAVE_CLOUD_CATEGORIES', categories: {} } }, '*');
      parent.postMessage({ pluginMessage: { type: 'SAVE_DEFAULT_CLOUD', cloudId: 'sales' } }, '*');
      parent.postMessage({ pluginMessage: { type: 'SAVE_CUSTOM_CLOUDS', clouds: [] } }, '*');
      parent.postMessage({ pluginMessage: { type: 'SAVE_STATUS_SYMBOLS', symbols: defaultStatusSymbols } }, '*');
      parent.postMessage({ pluginMessage: { type: 'SAVE_FIGMA_LINKS', links: {} } }, '*');
      parent.postMessage({ pluginMessage: { type: 'SAVE_CLOUD_POCS', pocs: {} } }, '*');
    }
  }

  // Onboarding completion
  function completeOnboarding(selectedCloud: string, customCloud?: {id: string; name: string; icon: string; isCustom?: boolean}) {
    // If a custom cloud was added, save it first
    let updatedCustomClouds = customClouds;
    if (customCloud) {
      updatedCustomClouds = [...customClouds, customCloud];
      setCustomClouds(updatedCustomClouds);
      parent.postMessage({ pluginMessage: { type: 'SAVE_CUSTOM_CLOUDS', clouds: updatedCustomClouds } }, '*');
    }
    
    setHasCompletedOnboarding(true);
    setSelectedClouds([selectedCloud]);
    setDefaultCloud(selectedCloud);
    
    parent.postMessage({ pluginMessage: { type: 'SAVE_ONBOARDING_STATE', hasCompleted: true } }, '*');
    parent.postMessage({ pluginMessage: { type: 'SAVE_DEFAULT_CLOUD', cloudId: selectedCloud } }, '*');
    
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

  const VERSION = '1.9.0';

  // ============ RENDER ============
  
  // Show onboarding for first-time users
  if (hasCompletedOnboarding === false) {
  return (
      <Onboarding 
        onComplete={completeOnboarding}
        customClouds={customClouds}
      />
    );
  }

  // Splash screen functions
  function selectCloudFromSplash(cloudId: string) {
    setSelectedClouds([cloudId]);
    setDefaultCloud(cloudId);
    parent.postMessage({ pluginMessage: { type: 'SAVE_DEFAULT_CLOUD', cloudId } }, '*');
  }

  function enterFromSplash() {
    setShowSplash(false);
    if (!hasCompletedOnboarding) {
      setHasCompletedOnboarding(true);
      parent.postMessage({ pluginMessage: { type: 'SAVE_ONBOARDING_STATE', hasCompleted: true, skipSplash: skipSplashOnLaunch } }, '*');
    }
  }

  function toggleSkipSplash() {
    const newValue = !skipSplashOnLaunch;
    setSkipSplashOnLaunch(newValue);
    parent.postMessage({ pluginMessage: { type: 'SAVE_ONBOARDING_STATE', hasCompleted: true, skipSplash: newValue } }, '*');
  }

  // Show splash screen (launcher)
  if (showSplash && hasCompletedOnboarding !== null) {
    const displayedClouds = clouds.filter(c => !hiddenClouds.includes(c.id)).slice(0, 6); // First 6 visible default clouds
    const visibleCustomClouds = customClouds.filter(c => !hiddenClouds.includes(c.id));
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

        <button className="splash-screen__cta" onClick={enterFromSplash}>
          Get Started →
        </button>

        <label className="splash-screen__skip">
          <input 
            type="checkbox" 
            checked={skipSplashOnLaunch}
            onChange={toggleSkipSplash}
          />
          <span>Don't show this again</span>
        </label>

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
  
  // Loading state (before onboarding state is known)
  if (hasCompletedOnboarding === null) {
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
  
  if (isLoading) {
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
    <div className="app">
      {/* Header */}
      <div className="sticky-header">
        <header className="header">
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
                  Welcome to the {selectedClouds.length > 0 && clouds.find(c => c.id === selectedClouds[0]) ? (
                    <span className="header__cloud-name">{clouds.find(c => c.id === selectedClouds[0])!.name}</span>
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
                          onClick={() => { startAddFlow(); setShowMoreMenu(false); }}
                        >
                          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                          </svg>
                          Add pattern
                        </button>
                        <div className="header__dropdown-divider"></div>
                        <button 
                          className="header__dropdown-menu-item"
                          onClick={() => { setView('settings'); setShowMoreMenu(false); }}
                        >
                          <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
                            <path d="M8 4.754a3.246 3.246 0 1 0 0 6.492 3.246 3.246 0 0 0 0-6.492zM5.754 8a2.246 2.246 0 1 1 4.492 0 2.246 2.246 0 0 1-4.492 0z"/>
                            <path d="M9.796 1.343c-.527-1.79-3.065-1.79-3.592 0l-.094.319a.873.873 0 0 1-1.255.52l-.292-.16c-1.64-.892-3.433.902-2.54 2.541l.159.292a.873.873 0 0 1-.52 1.255l-.319.094c-1.79.527-1.79 3.065 0 3.592l.319.094a.873.873 0 0 1 .52 1.255l-.16.292c-.892 1.64.901 3.434 2.541 2.54l.292-.159a.873.873 0 0 1 1.255.52l.094.319c.527 1.79 3.065 1.79 3.592 0l.094-.319a.873.873 0 0 1 1.255-.52l.292.16c1.64.893 3.434-.902 2.54-2.541l-.159-.292a.873.873 0 0 1 .52-1.255l.319-.094c1.79-.527 1.79-3.065 0-3.592l-.319-.094a.873.873 0 0 1-.52-1.255l.16-.292c.893-1.64-.902-3.433-2.541-2.54l-.292.159a.873.873 0 0 1-1.255-.52l-.094-.319zm-2.633.283c.246-.835 1.428-.835 1.674 0l.094.319a1.873 1.873 0 0 0 2.693 1.115l.291-.16c.764-.415 1.6.42 1.184 1.185l-.159.292a1.873 1.873 0 0 0 1.116 2.692l.318.094c.835.246.835 1.428 0 1.674l-.319.094a1.873 1.873 0 0 0-1.115 2.693l.16.291c.415.764-.42 1.6-1.185 1.184l-.291-.159a1.873 1.873 0 0 0-2.693 1.116l-.094.318c-.246.835-1.428.835-1.674 0l-.094-.319a1.873 1.873 0 0 0-2.692-1.115l-.292.16c-.764.415-1.6-.42-1.184-1.185l.159-.291A1.873 1.873 0 0 0 1.945 8.93l-.319-.094c-.835-.246-.835-1.428 0-1.674l.319-.094A1.873 1.873 0 0 0 3.06 4.377l-.16-.292c-.415-.764.42-1.6 1.185-1.184l.292.159a1.873 1.873 0 0 0 2.692-1.115l.094-.319z"/>
                          </svg>
                          Settings
                        </button>
                        <div className="header__dropdown-divider"></div>
                        <button 
                          className="header__dropdown-menu-item"
                          onClick={() => { exportTemplates(); setShowMoreMenu(false); }}
                        >
                          <span>↓</span> Export Backup
                        </button>
                        <label className="header__dropdown-menu-item">
                          <span>↑</span> Import Backup
                          <input 
                            type="file" 
                            accept=".json" 
                            onChange={(e) => { importTemplates(e); setShowMoreMenu(false); }} 
                            style={{ display: 'none' }} 
                          />
                        </label>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="header__back-section">
                  <Button variant="neutral" size="small" onClick={goHome}>
                    ← Back
                  </Button>
                </div>
              )}
            </div>
          </div>
          
          {/* Subtitle (only on home) */}
          {view === 'home' && (
            <p className="header__subtitle">
              Design fast. Stay consistent. Use your team's kits—no resource hunting.
            </p>
          )}
          
          {/* POC Row (only on home) */}
          {view === 'home' && selectedClouds.length > 0 && (() => {
            const currentCloudId = selectedClouds[0];
            const currentCloud = clouds.find(c => c.id === currentCloudId);
            const pocs = cloudPOCs[currentCloudId] || [];
            const currentCloudLinks = cloudFigmaLinks[currentCloudId] || [];
            return pocs.length > 0 && (
              <div className="header__poc-row">
                <div className="header__poc-left">
                  <span className="header__poc-label">{currentCloud?.name || 'Cloud'} POC:</span>
                  <div className="header__poc-list">
                    {pocs.map((poc, index) => (
                      <a
                        key={index}
                        href={poc.email ? `slack://user?email=${encodeURIComponent(poc.email)}` : '#'}
                        className="header__poc-link"
                        onClick={(e) => {
                          if (!poc.email) {
                            e.preventDefault();
                          }
                        }}
                      >
                        {poc.name}
                      </a>
                    ))}
                  </div>
                </div>
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
                    <div className="header__dropdown header__dropdown--readonly">
                      <div className="header__dropdown-header">
                        <span className="header__dropdown-title">Important Figma links</span>
                      </div>
                      <div className="header__dropdown-links">
                        {currentCloudLinks.length > 0 ? (
                          currentCloudLinks.map(link => (
                            <div key={link.id} className="header__dropdown-link">
                              <button 
                                className="header__dropdown-link-btn"
                                onClick={() => openFigmaLink(link.url)}
                              >
                                {link.name}
                              </button>
                            </div>
                          ))
                        ) : (
                          <p className="header__dropdown-empty">No links added yet</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </header>

        {/* Category Pills (only on home) */}
        {view === 'home' && (
          <div className="category-pills">
            {currentCategories.map(cat => (
              <button
                key={cat.id}
                className={`category-pill ${cat.iconOnly ? 'category-pill--icon' : ''} ${activeCategory === cat.id ? 'category-pill--selected' : ''}`}
                data-category={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                title={cat.iconOnly ? 'Saved' : cat.label}
              >
                {cat.iconOnly ? (
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M2 2v13.5a.5.5 0 0 0 .74.439L8 13.069l5.26 2.87A.5.5 0 0 0 14 15.5V2a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z"/>
                  </svg>
                ) : (
                  cat.label
                )}
              </button>
            ))}
        </div>
        )}
        </div>

      {/* Content */}
      <div className="content">
        {view === 'scaffold' ? (
          <div className="scaffold-section scaffold-section--fixed-footer">
            <div className="scaffold-section__scrollable">
              <h3 className="scaffold-section__title">Create Page Structure</h3>
              <p className="scaffold-section__desc">
                {isEditingScaffold ? 'Edit your page structure below' : 'Creates the team page structure in your Figma file'}
              </p>
              
              {/* Editable or Read-only preview based on mode */}
              <div className={`scaffold-preview ${isEditingScaffold ? 'scaffold-preview--editable' : 'scaffold-preview--readonly'}`}>
                {scaffoldSections.map((section, sectionIndex) => (
                  <div key={section.id} className="scaffold-section-block">
                    {section.name ? (
                      <>
                        {sectionIndex > 0 && <div className="scaffold-preview__divider">───────────────────</div>}
                        {isEditingScaffold ? (
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
                            />
                            <button className="scaffold-section-header__delete" onClick={() => {
                              if (confirm(`Delete "${section.name}" section?`)) {
                                setScaffoldSections(scaffoldSections.filter((_, i) => i !== sectionIndex));
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
                        onDragStart={(e) => { if (isEditingScaffold) { setDraggedItem({ type: `page-${sectionIndex}`, index: pageIndex }); e.dataTransfer.effectAllowed = 'move'; }}}
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
                              const symbols = [...statusSymbols.map(s => s.symbol), null];
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
                      <button
                        className="scaffold-preview__add-page-btn"
                        onClick={() => {
                          const newSections = [...scaffoldSections];
                          const newPages = [...section.pages, { id: `page-${Date.now()}`, name: 'New Page', status: section.name ? '🟢' : null }];
                          newSections[sectionIndex] = { ...section, pages: newPages };
                          setScaffoldSections(newSections);
                        }}
                      >+ Add Page</button>
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
                    }}
                  >+ Add Section</button>
                )}
              </div>
              
              <div className={`scaffold-hint ${isEditingStatusBadges ? 'scaffold-hint--editing' : ''}`}>
                <div className="scaffold-hint__header">
                  <strong>Status:</strong>
                  {!isEditingStatusBadges && (
                    <span className="scaffold-hint__badges">
                      {statusSymbols.map((s, i) => (
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
                    {statusSymbols.map((status, index) => (
                      <div key={status.id} className="scaffold-hint__editor-row">
                        <input
                          type="text"
                          className="scaffold-hint__emoji-input"
                          value={status.symbol}
                          onChange={(e) => {
                            const newSymbols = [...statusSymbols];
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
                            const newSymbols = [...statusSymbols];
                            newSymbols[index] = { ...status, label: e.target.value };
                            updateStatusSymbols(newSymbols);
                          }}
                          placeholder="Label"
                        />
                        <button
                          className="scaffold-hint__delete-btn"
                          onClick={() => {
                            if (statusSymbols.length > 1) {
                              updateStatusSymbols(statusSymbols.filter((_, i) => i !== index));
                            }
                          }}
                          disabled={statusSymbols.length <= 1}
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
          <div className="settings-section">
            <div className="settings-header">
              <span className="settings-header__title">Settings</span>
              <button className="settings-header__reset" onClick={resetAllSettings}>
                Reset All
              </button>
          </div>

            <div className="settings-accordions">
                {/* Clouds & Teams Accordion */}
                <div className="settings-accordion">
                  <button 
                    className={`settings-accordion__header ${expandedSettingsSection === 'clouds' ? 'is-expanded' : ''}`}
                    onClick={() => setExpandedSettingsSection(expandedSettingsSection === 'clouds' ? null : 'clouds')}
                  >
                    <span className="settings-accordion__title">Clouds & Teams</span>
                    <span className="settings-accordion__subtitle">Set default cloud and manage categories</span>
                    <svg className="settings-accordion__chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="6 9 12 15 18 9"/>
                    </svg>
                  </button>
                  
                  {expandedSettingsSection === 'clouds' && (
                    <div className="settings-accordion__content">
                      <div className="settings-cloud-list">
                        {allClouds.map(cloud => (
                          <div key={cloud.id} className={`settings-cloud-row ${hiddenClouds.includes(cloud.id) ? 'is-hidden' : ''} ${defaultCloud === cloud.id ? 'is-expanded' : ''}`}>
                            <div className="settings-cloud-row__header">
                              <button
                                className={`settings-cloud-row__main ${defaultCloud === cloud.id ? 'is-default' : ''}`}
                                onClick={() => {
                                  if (!hiddenClouds.includes(cloud.id)) {
                                    setDefaultCloud(cloud.id);
                                    setSelectedClouds([cloud.id]);
                                    parent.postMessage({ pluginMessage: { type: 'SAVE_DEFAULT_CLOUD', cloudId: cloud.id } }, '*');
                                  }
                                }}
                              >
                                <img src={cloud.icon} alt={cloud.name} />
                                <span className="settings-cloud-row__name">{cloud.name}</span>
                                {defaultCloud === cloud.id && <span className="settings-cloud-row__badge">Default</span>}
                              </button>
                              {defaultCloud !== cloud.id && (
                                <button
                                  className={`settings-cloud-row__toggle ${hiddenClouds.includes(cloud.id) ? 'is-off' : 'is-on'}`}
                                  onClick={() => toggleCloudVisibility(cloud.id)}
                                  title={hiddenClouds.includes(cloud.id) ? 'Show cloud' : 'Hide cloud'}
                                >
                                  <svg viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                                    <circle cx="12" cy="12" r="3"/>
                                    {hiddenClouds.includes(cloud.id) && <path d="M1 1l22 22"/>}
                                  </svg>
                                </button>
            )}
          </div>
                            
                            {/* Nested Categories - only show for default cloud */}
                            {defaultCloud === cloud.id && (
                              <div className="settings-cloud-row__categories">
                                <div className="settings-categories-list settings-categories-list--nested">
                                  {(cloudCategories[cloud.id] || defaultCategories).map((cat, index) => (
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
                                          const cats = [...(cloudCategories[cloud.id] || defaultCategories)];
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
                                          const cats = [...(cloudCategories[cloud.id] || defaultCategories)];
                                          cats[index] = { ...cat, label: e.target.value };
                                          updateCloudCategories(cloud.id, cats);
                                        }}
                                      />
                                      {cat.id !== 'all' && (
                                        <button className="settings-category-item__delete" onClick={() => {
                                          const cats = (cloudCategories[cloud.id] || defaultCategories).filter((_, i) => i !== index);
                                          updateCloudCategories(cloud.id, cats);
                                        }}>×</button>
                                      )}
                                    </div>
                                  ))}
                                  <button
                                    className="settings-add-category-btn settings-add-category-btn--small"
                                    onClick={() => {
                                      const cats = [...(cloudCategories[cloud.id] || defaultCategories)];
                                      cats.push({ id: `custom-${Date.now()}`, label: 'New Category' });
                                      updateCloudCategories(cloud.id, cats);
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
                                      }}
                                    >+ Add POC</button>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                        <button className="settings-add-cloud-btn" onClick={() => setShowAddCloudModal(true)}>
                          + Add Cloud / Team
                        </button>
                      </div>
                </div>
              )}
            </div>

                {/* Page Structure Configuration - Accordion */}
                <div className="settings-accordion">
                  <button 
                    className={`settings-accordion__header ${expandedSettingsSection === 'page-structure' ? 'is-expanded' : ''}`}
                    onClick={() => setExpandedSettingsSection(expandedSettingsSection === 'page-structure' ? null : 'page-structure')}
                  >
                    <span className="settings-accordion__title">Page Structure Configuration</span>
                    <span className="settings-accordion__subtitle">Status symbols, sections & pages for your team</span>
                    <svg className="settings-accordion__chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="6 9 12 15 18 9"/>
                    </svg>
                  </button>
                  
                  {expandedSettingsSection === 'page-structure' && (
                    <div className="settings-accordion__content">
                      {/* Page Structure Preview */}
                      <div className="settings-subgroup">
                        <h5 className="settings-subgroup__title">Page Structure Preview</h5>
                        <p className="settings-subgroup__desc">Click "Create Pages" to add this structure to your file</p>
                        
                        <div className="scaffold-preview scaffold-preview--editable scaffold-preview--settings">
                          {scaffoldSections.map((section, sectionIndex) => (
                            <div key={section.id} className="scaffold-section-block">
                              {section.name ? (
                                <>
                                  {sectionIndex > 0 && <div className="scaffold-preview__divider">───────────────────</div>}
                                  <div 
                                    className={`scaffold-section-header ${draggedItem?.type === 'scaffold-section' && draggedItem.index === sectionIndex ? 'is-dragging' : ''} ${dragOverIndex === sectionIndex && draggedItem?.type === 'scaffold-section' ? 'is-drag-over' : ''}`}
                                    draggable={sectionIndex > 0}
                                    onDragStart={(e) => {
                                      if (sectionIndex > 0) {
                                        setDraggedItem({ type: 'scaffold-section', index: sectionIndex });
                                        e.dataTransfer.effectAllowed = 'move';
                                      }
                                    }}
                                    onDragEnd={() => { setDraggedItem(null); setDragOverIndex(null); }}
                                    onDragOver={(e) => {
                                      e.preventDefault();
                                      if (draggedItem?.type === 'scaffold-section' && draggedItem.index !== sectionIndex && sectionIndex > 0) {
                                        setDragOverIndex(sectionIndex);
                                      }
                                    }}
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
                                    />
                                    <button
                                      className="scaffold-section-header__delete"
                                      onClick={() => {
                                        if (confirm(`Delete "${section.name}" section?`)) {
                                          setScaffoldSections(scaffoldSections.filter((_, i) => i !== sectionIndex));
                                        }
                                      }}
                                    >×</button>
                                  </div>
                                </>
                              ) : null}
                              
                              {section.pages.map((page, pageIndex) => (
                                <div 
                                  key={page.id} 
                                  className={`scaffold-preview__item ${section.name ? 'scaffold-preview__item--indent' : ''}`}
                                  draggable
                                  onDragStart={(e) => { setDraggedItem({ type: `page-${sectionIndex}`, index: pageIndex }); e.dataTransfer.effectAllowed = 'move'; }}
                                  onDragEnd={() => { setDraggedItem(null); setDragOverIndex(null); }}
                                  onDragOver={(e) => { e.preventDefault(); if (draggedItem?.type === `page-${sectionIndex}` && draggedItem.index !== pageIndex) setDragOverIndex(pageIndex); }}
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
                                  <div className="gripper-handle gripper-handle--small">
                                    <svg className="gripper-handle__icon" viewBox="0 0 10 16" fill="currentColor">
                                      <circle cx="3" cy="2" r="1.5"/><circle cx="7" cy="2" r="1.5"/>
                                      <circle cx="3" cy="8" r="1.5"/><circle cx="7" cy="8" r="1.5"/>
                                      <circle cx="3" cy="14" r="1.5"/><circle cx="7" cy="14" r="1.5"/>
                                    </svg>
          </div>
                                  {section.name && (
                                    <button
                                      className="scaffold-preview__status-btn"
                                      onClick={() => {
                                        const symbols = [...statusSymbols.map(s => s.symbol), null];
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
                                  />
                                  {page.isRename && (
                                    <div className="scaffold-preview__cover-selector">
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
                                  {!page.isRename && (
                                    <button
                                      className="scaffold-preview__delete-btn"
                                      onClick={() => {
                                        const newSections = [...scaffoldSections];
                                        const newPages = section.pages.filter((_, i) => i !== pageIndex);
                                        newSections[sectionIndex] = { ...section, pages: newPages };
                                        setScaffoldSections(newSections);
                                      }}
                                    >×</button>
            )}
          </div>
                              ))}
                              
                              <button
                                className="scaffold-preview__add-page-btn"
                                onClick={() => {
                                  const newSections = [...scaffoldSections];
                                  const newPages = [...section.pages, { id: `page-${Date.now()}`, name: 'New Page', status: section.name ? '🟢' : null }];
                                  newSections[sectionIndex] = { ...section, pages: newPages };
                                  setScaffoldSections(newSections);
                                }}
                              >+ Add Page</button>
                            </div>
                          ))}
                          <button
                            className="scaffold-preview__add-section-btn"
                            onClick={() => {
                              setScaffoldSections([...scaffoldSections, {
                                id: `section-${Date.now()}`,
                                name: 'NEW SECTION',
                                pages: [{ id: `page-${Date.now()}`, name: 'New Page', status: '🟢' }]
                              }]);
                            }}
                          >+ Add Section</button>
                        </div>
                        
                        <div className={`scaffold-hint ${isEditingStatusBadges ? 'scaffold-hint--editing' : ''}`}>
                          <div className="scaffold-hint__header">
                            <strong>Status:</strong>
                            {!isEditingStatusBadges && (
                              <span className="scaffold-hint__badges">
                                {statusSymbols.map((s, i) => (
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
                              {statusSymbols.map((status, index) => (
                                <div key={status.id} className="scaffold-hint__editor-row">
                                  <input
                                    type="text"
                                    className="scaffold-hint__emoji-input"
                                    value={status.symbol}
                                    onChange={(e) => {
                                      const newSymbols = [...statusSymbols];
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
                                      const newSymbols = [...statusSymbols];
                                      newSymbols[index] = { ...status, label: e.target.value };
                                      updateStatusSymbols(newSymbols);
                                    }}
                                    placeholder="Label"
                                  />
                                  <button
                                    className="scaffold-hint__delete-btn"
                                    onClick={() => {
                                      if (statusSymbols.length > 1) {
                                        updateStatusSymbols(statusSymbols.filter((_, i) => i !== index));
                                      }
                                    }}
                                    disabled={statusSymbols.length <= 1}
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
                      </div>
                    </div>
                  )}
                </div>
            </div>
          </div>
        ) : view === 'add' ? (
          <div className="add-flow">
            {/* Step: Instructions */}
            {addStep === 'instructions' && (
              <Card bordered={false} shadow="none">
                <CardContent>
                  <h3 className="step-title">Prepare your template</h3>
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
                      options={categoryOptions}
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
        ) : templates.length === 0 ? (
          <EmptyState
            icon={<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>}
            title={`No ${activeCategory === 'all' ? 'templates' : categories.find(c => c.id === activeCategory)?.label.toLowerCase() || 'templates'} yet`}
            description={`Add your first ${activeCategory === 'all' ? 'template' : categories.find(c => c.id === activeCategory)?.label.toLowerCase().replace(/s$/, '') || 'template'} to get started`}
            action={<Button variant="brand-outline" onClick={startAddFlow}>Add Template</Button>}
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
                      <div className="template-item__preview">
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
                      <div className={`variant-grid__items variant-grid__items--${
                        displayVariants.length === 1 ? 'single' :
                        displayVariants.length === 2 ? 'duo' :
                        displayVariants.length === 4 ? 'quad' :
                        'default'
                      }`}>
                        {displayVariants.map(variant => {
                          const isSelected = selected.includes(variant.key);
                          return (
                            <div 
                              key={variant.key}
                              className={`variant-grid__item ${isSelected ? 'is-selected' : ''}`}
                              onClick={() => toggleSlideSelection(template.id, variant.key)}
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
                  <div className="template-item__preview">
                    <img src={template.preview} alt={template.name} />
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
                            {/* Save/Unsave - for component sets, this saves all variants */}
                            {template.isComponentSet && template.variants && template.variants.length > 1 ? (
                              <>
                                <div className="template-item__more-option template-item__more-option--header">
                                  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                                    <path d="M2 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v13.5a.5.5 0 0 1-.777.416L8 13.101l-5.223 2.815A.5.5 0 0 1 2 15.5V2zm2-1a1 1 0 0 0-1 1v12.566l4.723-2.482a.5.5 0 0 1 .554 0L13 14.566V2a1 1 0 0 0-1-1H4z"/>
                                  </svg>
                                  <span>Save variant</span>
                                  <svg className="template-item__more-chevron" width="10" height="10" viewBox="0 0 16 16" fill="currentColor">
                                    <path fillRule="evenodd" d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708z"/>
                                  </svg>
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
                                {isTemplateSaved(template.id) ? 'Saved' : 'Save'}
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
                              {categories.filter(c => c.id !== 'all' && c.id !== template.category).map(cat => (
                                <button
                                  key={cat.id}
                                  className="template-item__more-option"
                                  onClick={() => moveTemplateToCategory(template.id, cat.id)}
                                >
                                  {cat.label}
                                </button>
                              ))}
                            </div>
                            
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

      {/* Footer */}
      <footer className="app-footer">
        <span>Need help? prantik.banerjee@salesforce.com</span>
        <span>v{VERSION}</span>
      </footer>

      {/* Add Cloud Modal */}
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
      
      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="modal-overlay" onClick={() => setDeleteConfirmId(null)}>
          <div className="modal modal--small" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <h3 className="modal__title">Delete Template?</h3>
              <button className="modal__close" onClick={() => setDeleteConfirmId(null)}>×</button>
          </div>
            <div className="modal__body">
              <p className="modal__text">
                Are you sure you want to delete "<strong>{templates.find(t => t.id === deleteConfirmId)?.name}</strong>"? This action cannot be undone.
              </p>
        </div>
            <div className="modal__footer">
              <Button variant="neutral" onClick={() => setDeleteConfirmId(null)}>Cancel</Button>
              <Button 
                variant="destructive" 
                onClick={() => deleteTemplate(deleteConfirmId)}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
