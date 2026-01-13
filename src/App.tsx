import React, { useState, useEffect } from 'react';

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

  // Load templates from Figma's clientStorage on mount
  useEffect(() => {
    parent.postMessage({ pluginMessage: { type: 'LOAD_TEMPLATES' } }, '*');
    parent.postMessage({ pluginMessage: { type: 'CHECK_SCAFFOLD_EXISTS' } }, '*');
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
          setView('home'); // Go back to home after creating
          break;

        case 'SCAFFOLD_ERROR':
          setIsScaffolding(false);
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

  // Scaffold file structure
  function scaffoldFileStructure() {
    setIsScaffolding(true);
    
    // Find cover template and get the "Default" variant key
    const coverTemplate = templates.find(t => 
      t.category === 'cover-pages' && t.isComponentSet && t.variants
    );
    
    let coverComponentKey: string | undefined;
    if (coverTemplate?.variants) {
      // Find the "Default" variant
      const defaultVariant = coverTemplate.variants.find(v => 
        v.displayName.toLowerCase() === 'default' || v.name.toLowerCase().includes('default')
      );
      coverComponentKey = defaultVariant?.key || coverTemplate.variants[0]?.key;
    } else if (coverTemplate) {
      // Single component cover
      coverComponentKey = coverTemplate.componentKey;
    }
    
    parent.postMessage({ 
      pluginMessage: { 
        type: 'SCAFFOLD_FILE_STRUCTURE',
        coverComponentKey 
      } 
    }, '*');
  }

  const VERSION = '1.0.0';

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
                <button 
                  className="header__text-btn"
                  onClick={() => setView('scaffold')}
                  disabled={scaffoldExists}
                >
                  {scaffoldExists ? '✓ Pages Created' : 'Create Pages'}
                </button>
                <Button variant="neutral" size="small" onClick={startAddFlow}>
                  + Add
                </Button>
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
