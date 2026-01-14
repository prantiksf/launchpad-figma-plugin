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

// Import cloud icons
import SalesCloudIcon from './assets/SalesCloud-icon.png';
import ServiceCloudIcon from './assets/ServiceCloud-icon.png';
import MarketingCloudIcon from './assets/MarketingCloud-icon.png';
import CommerceCloudIcon from './assets/CommerceCloud-icon.png';
import RevenueCloudIcon from './assets/RevenueCloud-icon.png';
import FieldServiceCloudIcon from './assets/FieldServiceCloud-icon.png';
import GoogleSlideIcon from './assets/googleslide-icon.svg';

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
  
  // Figma Links feature
  const [figmaLinks, setFigmaLinks] = useState<Array<{id: string; name: string; url: string}>>([]);
  const [showLinksDropdown, setShowLinksDropdown] = useState(false);
  const [isAddingLink, setIsAddingLink] = useState(false);
  const [newLinkName, setNewLinkName] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  
  // Refs for click-outside handling
  const linksDropdownRef = useRef<HTMLDivElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  // Load templates and figma links from Figma's clientStorage on mount
  useEffect(() => {
    parent.postMessage({ pluginMessage: { type: 'LOAD_TEMPLATES' } }, '*');
    parent.postMessage({ pluginMessage: { type: 'CHECK_SCAFFOLD_EXISTS' } }, '*');
    parent.postMessage({ pluginMessage: { type: 'LOAD_FIGMA_LINKS' } }, '*');
  }, []);

  // Add template flow
  const [view, setView] = useState<'home' | 'add' | 'scaffold'>('home');
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
          setFigmaLinks(msg.links || []);
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

  // Figma Links functions
  function addFigmaLink() {
    if (!newLinkName.trim() || !newLinkUrl.trim()) return;
    
    const newLink = {
      id: Date.now().toString(),
      name: newLinkName.trim(),
      url: newLinkUrl.trim()
    };
    
    const updatedLinks = [...figmaLinks, newLink];
    setFigmaLinks(updatedLinks);
    parent.postMessage({ pluginMessage: { type: 'SAVE_FIGMA_LINKS', links: updatedLinks } }, '*');
    
    setNewLinkName('');
    setNewLinkUrl('');
    setIsAddingLink(false);
  }
  
  function removeFigmaLink(id: string) {
    const updatedLinks = figmaLinks.filter(link => link.id !== id);
    setFigmaLinks(updatedLinks);
    parent.postMessage({ pluginMessage: { type: 'SAVE_FIGMA_LINKS', links: updatedLinks } }, '*');
  }
  
  function openFigmaLink(url: string) {
    window.open(url, '_blank');
    setShowLinksDropdown(false);
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
    
    parent.postMessage({ 
      pluginMessage: { 
        type: 'SCAFFOLD_FILE_STRUCTURE',
        coverComponentKey 
      } 
    }, '*');
  }

  const VERSION = '1.6.0';

  // ============ RENDER ============
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
          <div className="header__brand">
            <img src={SalesCloudIcon} alt="Starter Kit" className="header__icon" />
            <span className="header__title">Starter Kit</span>
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
              <Button variant="neutral" size="small" onClick={goHome}>
                ← Back
              </Button>
            )}
          </div>
        </header>

        {/* Category Pills (only on home) */}
        {view === 'home' && (
          <div className="category-pills">
            {categories.map(cat => (
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
          <div className="scaffold-section">
            <Card bordered={false} shadow="none">
              <CardContent>
                <h3 className="step-title">Create Page Structure</h3>
                <p className="scaffold-desc">
                  Sets up your file with the SCUX starter kit pattern:
                </p>
                <div className="scaffold-preview">
                  <div className="scaffold-preview__item">Cover Page <span className="scaffold-preview__note">(renames Page 1)</span></div>
                  <div className="scaffold-preview__item">Read Me</div>
                  <div className="scaffold-preview__divider">───────────────────</div>
                  <div className="scaffold-preview__section">CURRENT DESIGNS</div>
                  <div className="scaffold-preview__item scaffold-preview__item--indent">🟢 {'{Release}'} {'{Feature Name}'}</div>
                  <div className="scaffold-preview__item scaffold-preview__item--indent">🟡 {'{Release}'} {'{Feature Name}'} • Variation 2</div>
                  <div className="scaffold-preview__divider">───────────────────</div>
                  <div className="scaffold-preview__section">MILESTONES + E2E FLOWS/DEMOS</div>
                  <div className="scaffold-preview__item scaffold-preview__item--indent">🟢 {'{YYYY.MM.DD}'}_Product Demo</div>
                  <div className="scaffold-preview__divider">───────────────────</div>
                  <div className="scaffold-preview__section">ARCHIVED EXPLORATIONS</div>
                  <div className="scaffold-preview__item scaffold-preview__item--indent">{'{YYYY.MM.DD}'}_{'{Exploration Name}'}</div>
                  <div className="scaffold-preview__divider">───────────────────</div>
                  <div className="scaffold-preview__section">BELOW THE LINE</div>
                  <div className="scaffold-preview__item scaffold-preview__item--indent">❌ {'{Deprecated Feature}'}</div>
            </div>
                <p className="scaffold-hint">
                  <strong>Status:</strong> 🟢 Ready • 🟡 In Progress • ❌ Deprecated
                </p>
              </CardContent>
              <CardFooter>
                <Button 
                  variant="brand" 
                  fullWidth
                  onClick={() => { scaffoldFileStructure(); }}
                  loading={isScaffolding}
                >
                  Create Pages
                </Button>
              </CardFooter>
            </Card>
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
    </div>
  );
}

export default App;
