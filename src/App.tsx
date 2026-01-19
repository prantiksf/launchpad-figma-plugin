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
  const [selectedVariants, setSelectedVariants] = useState<Record<string, Record<string, string>>>({});
  const [selectedSlides, setSelectedSlides] = useState<Record<string, string[]>>({}); // For multi-select
  const [isScaffolding, setIsScaffolding] = useState(false);
  const [scaffoldExists, setScaffoldExists] = useState(false);
  const [showPagesCreatedMessage, setShowPagesCreatedMessage] = useState(false);
  const [isEditingScaffold, setIsEditingScaffold] = useState(false);
  const [isEditingStatusBadges, setIsEditingStatusBadges] = useState(false);
  
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
      parent.postMessage({ pluginMessage: { type: 'LOAD_CLOUD_CATEGORIES' } }, '*');
      parent.postMessage({ pluginMessage: { type: 'LOAD_STATUS_SYMBOLS' } }, '*');
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
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);


  // ============ ACTIONS ============
  
  // Filter templates
  const filteredTemplates = templates.filter(t => {
    const matchCloud = selectedClouds.includes(t.cloudId);
    const matchCategory = activeCategory === 'all' || t.category === activeCategory;
    return matchCloud && matchCategory;
  });

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

  // Delete template
  function deleteTemplate(id: string) {
    const updated = templates.filter(t => t.id !== id);
    setTemplates(updated);
    parent.postMessage({ pluginMessage: { type: 'SAVE_TEMPLATES', templates: updated } }, '*');
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
  const currentCategories = selectedClouds[0] && cloudCategories[selectedClouds[0]] 
    ? cloudCategories[selectedClouds[0]] 
    : defaultCategories;
    
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
  
  function resetAllSettings() {
    if (confirm('Reset all settings to default? This will:\n• Show all clouds\n• Reset categories to default\n• Clear custom clouds\n• Reset default cloud\n• Reset status symbols\n• Reset page structure')) {
      setHiddenClouds([]);
      setCloudCategories({});
      setDefaultCloud('sales');
      setSelectedClouds(['sales']);
      setCustomClouds([]);
      setStatusSymbols(defaultStatusSymbols);
      setScaffoldSections(defaultScaffoldSections);
      setCloudFigmaLinks({});
      parent.postMessage({ pluginMessage: { type: 'SAVE_HIDDEN_CLOUDS', hiddenClouds: [] } }, '*');
      parent.postMessage({ pluginMessage: { type: 'SAVE_CLOUD_CATEGORIES', categories: {} } }, '*');
      parent.postMessage({ pluginMessage: { type: 'SAVE_DEFAULT_CLOUD', cloudId: 'sales' } }, '*');
      parent.postMessage({ pluginMessage: { type: 'SAVE_CUSTOM_CLOUDS', clouds: [] } }, '*');
      parent.postMessage({ pluginMessage: { type: 'SAVE_STATUS_SYMBOLS', symbols: defaultStatusSymbols } }, '*');
      parent.postMessage({ pluginMessage: { type: 'SAVE_FIGMA_LINKS', links: {} } }, '*');
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
    
    // Find cover template - prefer component sets over single components
    // First try to find a component set with 'cover' in name, then fall back to any cover
    const coverTemplates = templates.filter(t => 
      t.category === 'cover-pages' || t.name.toLowerCase().includes('cover')
    );
    
    // Prefer component sets (they have more variants to choose from)
    const coverTemplate = coverTemplates.find(t => t.isComponentSet) || coverTemplates[0];
    
    console.log('Found cover template:', coverTemplate?.name, 'category:', coverTemplate?.category);
    console.log('Has variants:', coverTemplate?.isComponentSet, 'count:', coverTemplate?.variants?.length);
    
    let coverComponentKey: string | undefined;
    if (coverTemplate?.isComponentSet && coverTemplate?.variants && coverTemplate.variants.length > 0) {
      // Find the "Default" variant
      const defaultVariant = coverTemplate.variants.find(v => 
        v.displayName.toLowerCase() === 'default' || 
        v.name.toLowerCase().includes('default')
      );
      console.log('Default variant found:', defaultVariant?.displayName, 'key:', defaultVariant?.key);
      coverComponentKey = defaultVariant?.key || coverTemplate.variants[0]?.key;
      console.log('Using component key:', coverComponentKey);
    } else if (coverTemplate) {
      // Single component cover
      coverComponentKey = coverTemplate.componentKey;
      console.log('Using single component key:', coverComponentKey);
    }
    
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
          <div className="header__brand" ref={cloudSelectorRef}>
            <button 
              className="header__cloud-selector"
              onClick={() => setShowCloudSelector(!showCloudSelector)}
            >
              <img 
                src={allClouds.find(c => c.id === selectedClouds[0])?.icon || SalesCloudIcon} 
                alt="Cloud" 
                className="header__icon" 
              />
              <span className="header__title">Starter Kit</span>
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
                {showPagesCreatedMessage && (
                  <span className="header__success-msg">✓ Pages Created</span>
                )}
                {!scaffoldExists && (
                  <button 
                    className="header__text-btn"
                    onClick={() => setView('scaffold')}
                  >
                    Create Pages
                  </button>
                )}
                
                {/* Figma Links Dropdown */}
                <div className="header__dropdown-container" ref={linksDropdownRef}>
                  <button 
                    className="header__icon-btn"
                    onClick={() => setShowLinksDropdown(!showLinksDropdown)}
                    title="Figma Links"
                  >
                    <svg width="16" height="16" viewBox="0 0 38 57" fill="currentColor">
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
                        <span className="header__dropdown-title">Figma Links</span>
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
                            onClick={addFigmaLink}
                          >
                            Save
                          </button>
            </div>
                      )}
                      
                      <div className="header__dropdown-links">
                        {figmaLinks.length === 0 && !isAddingLink ? (
                          <p className="header__dropdown-empty">No links added yet</p>
                        ) : (
                          figmaLinks.map(link => (
                            <div key={link.id} className="header__dropdown-link">
                              <button 
                                className="header__dropdown-link-btn"
                                onClick={() => openFigmaLink(link.url)}
                              >
                                {link.name}
                              </button>
                              <button 
                                className="header__dropdown-link-delete"
                                onClick={() => removeFigmaLink(link.id)}
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

                <button className="header__icon-btn header__icon-btn--add" onClick={startAddFlow} title="Add Template">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
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
                        onClick={() => { setView('settings'); setShowMoreMenu(false); }}
                      >
                        <span>⚙</span> Settings
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
                <span className="header__view-title">
                  {view === 'settings' ? 'Settings' : view === 'scaffold' ? 'Create Pages' : view === 'add' ? 'Add Template' : ''}
                </span>
              </div>
            )}
          </div>
        </header>

        {/* Category Pills (only on home) */}
        {view === 'home' && (
          <div className="category-pills">
            {currentCategories.map(cat => (
              <button
                key={cat.id}
                className={`category-pill ${activeCategory === cat.id ? 'category-pill--selected' : ''}`}
                onClick={() => setActiveCategory(cat.id)}
              >
                {cat.label}
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
                        {page.isRename && <span className="scaffold-preview__note">(renames Page 1)</span>}
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
                      {/* Status Symbols */}
                      <div className="settings-subgroup">
                        <h5 className="settings-subgroup__title">Status Symbols</h5>
                        <div className="settings-symbols-list">
                    {statusSymbols.map((status, index) => (
                      <div 
                        key={status.id} 
                        className={`settings-symbol-item ${draggedItem?.type === 'symbol' && draggedItem.index === index ? 'is-dragging' : ''} ${dragOverIndex === index && draggedItem?.type === 'symbol' ? 'is-drag-over' : ''}`}
                        draggable
                        onDragStart={(e) => {
                          setDraggedItem({ type: 'symbol', index });
                          e.dataTransfer.effectAllowed = 'move';
                        }}
                        onDragEnd={() => {
                          setDraggedItem(null);
                          setDragOverIndex(null);
                        }}
                        onDragOver={(e) => {
                          e.preventDefault();
                          if (draggedItem?.type === 'symbol' && draggedItem.index !== index) {
                            setDragOverIndex(index);
                          }
                        }}
                        onDragLeave={() => setDragOverIndex(null)}
                        onDrop={(e) => {
                          e.preventDefault();
                          if (draggedItem?.type === 'symbol' && draggedItem.index !== index) {
                            const newSymbols = [...statusSymbols];
                            const [removed] = newSymbols.splice(draggedItem.index, 1);
                            newSymbols.splice(index, 0, removed);
                            updateStatusSymbols(newSymbols);
                          }
                          setDraggedItem(null);
                          setDragOverIndex(null);
                        }}
                      >
                        <div className="gripper-handle">
                          <svg className="gripper-handle__icon" viewBox="0 0 10 16" fill="currentColor">
                            <circle cx="3" cy="2" r="1.5"/>
                            <circle cx="7" cy="2" r="1.5"/>
                            <circle cx="3" cy="8" r="1.5"/>
                            <circle cx="7" cy="8" r="1.5"/>
                            <circle cx="3" cy="14" r="1.5"/>
                            <circle cx="7" cy="14" r="1.5"/>
                          </svg>
                        </div>
                        <input
                          type="text"
                          className="settings-symbol-item__emoji"
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
                          className="settings-symbol-item__label"
                          value={status.label}
                          onChange={(e) => {
                            const newSymbols = [...statusSymbols];
                            newSymbols[index] = { ...status, label: e.target.value };
                            updateStatusSymbols(newSymbols);
                          }}
                          placeholder="Label"
                        />
                        <button
                          className="settings-symbol-item__delete"
                          onClick={() => {
                            if (statusSymbols.length > 1) {
                              updateStatusSymbols(statusSymbols.filter((_, i) => i !== index));
                            }
                          }}
                          disabled={statusSymbols.length <= 1}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    <button
                      className="settings-add-symbol-btn"
                      onClick={() => {
                        updateStatusSymbols([
                          ...statusSymbols,
                          { id: `symbol-${Date.now()}`, symbol: '⭐', label: 'New Status' }
                        ]);
                      }}
                          >
                            + Add Status
                          </button>
                        </div>
                      </div>
                      
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
                                  {page.isRename && <span className="scaffold-preview__note">(renames Page 1)</span>}
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
                        
                        <p className="scaffold-hint">
                          <strong>Status:</strong>{' '}
                          {statusSymbols.map((s, i) => (
                            <span key={s.id}>
                              {i > 0 && <span className="scaffold-hint__separator"> • </span>}
                              <span className="scaffold-hint__status">{s.symbol}&nbsp;{s.label}</span>
                            </span>
                          ))}
            </p>
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
                  <button className="template-item__delete" onClick={() => deleteTemplate(template.id)}>×</button>
      </div>

                {/* Only show main preview for single components, not component sets */}
                {template.preview && !(template.isComponentSet && template.variants && template.variants.length > 1) && (
                  <div className="template-item__preview">
                    <img src={template.preview} alt={template.name} />
                  </div>
                )}

                {/* Variant Grid - Visual slide selector */}
                {template.isComponentSet && template.variants && template.variants.length > 1 && (() => {
                  const selected = selectedSlides[template.id] || [];
                  const allSelected = selected.length === template.variants.length;
                  
                  return (
                    <div className="variant-grid">
                      <div className="variant-grid__header">
                        <span className="variant-grid__title">
                          {selected.length > 0 ? `${selected.length} selected` : 'Click to select'}
                        </span>
                        <button 
                          className="variant-grid__toggle-all"
                          onClick={() => allSelected 
                            ? deselectAllSlides(template.id) 
                            : selectAllSlides(template.id, template.variants!.map(v => v.key))
                          }
                        >
                          {allSelected ? 'Clear' : 'Select All'}
                        </button>
          </div>
                      <div className={`variant-grid__items variant-grid__items--${
                        template.variants.length === 1 ? 'single' :
                        template.variants.length === 2 ? 'duo' :
                        template.variants.length === 4 ? 'quad' :
                        'default'
                      }`}>
                        {template.variants.map(variant => {
                          const isSelected = selected.includes(variant.key);
                          return (
                            <div 
                              key={variant.key}
                              className={`variant-grid__item ${isSelected ? 'is-selected' : ''}`}
                              onClick={() => toggleSlideSelection(template.id, variant.key)}
                            >
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
    </div>
  );
}

export default App;
