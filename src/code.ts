// Launchpad - Figma Plugin
// Helps designers quickly insert pre-built templates from Team Library

const STORAGE_KEY = 'launchpad_templates';
const PLUGIN_VERSION = '1.11.0';

// Build identifiers injected at build time - these make each build unique
// This ensures Figma's CDN recognizes each build as a new version
declare const BUILD_TIMESTAMP: string;
declare const BUILD_HASH: string;

// Use build hash in execution to ensure code.js content is unique
const BUILD_ID = typeof BUILD_HASH !== 'undefined' ? BUILD_HASH : Date.now().toString(36);
const BUILD_TIME = typeof BUILD_TIMESTAMP !== 'undefined' ? BUILD_TIMESTAMP : Date.now().toString();

// Store build ID in a way that forces code uniqueness
const _buildCacheBuster = `${BUILD_ID}-${BUILD_TIME}`;

// Check stored version vs current version
figma.clientStorage.getAsync('plugin_version').then(storedVersion => {
  if (storedVersion && storedVersion !== PLUGIN_VERSION) {
    // Version mismatch - notify user to reload
    figma.notify(`Plugin updated! Please close and reopen to get version ${PLUGIN_VERSION}`, { timeout: 5000 });
  }
  // Always update stored version
  figma.clientStorage.setAsync('plugin_version', PLUGIN_VERSION);
}).catch(() => {
  // First time - just store version
  figma.clientStorage.setAsync('plugin_version', PLUGIN_VERSION);
});

// Store build ID for cache invalidation
figma.clientStorage.setAsync('plugin_build_id', _buildCacheBuster).catch(() => {});

figma.showUI(__html__, { 
  width: 420, 
  height: 720,
  themeColors: true 
});

// Send ready signal immediately to ensure UI knows plugin is loaded
// This is critical for published plugins where initialization might be delayed
// Use setTimeout to ensure UI is fully ready to receive messages
setTimeout(() => {
  // Include user info for backend API calls (user-specific data)
  const currentUser = figma.currentUser;
  figma.ui.postMessage({ 
    type: 'PLUGIN_READY',
    user: currentUser ? {
      id: currentUser.id,
      name: currentUser.name,
      photoUrl: currentUser.photoUrl
    } : null
  });
}, 0);

// Helper to generate preview from a node
async function generatePreview(node: SceneNode): Promise<string | null> {
  try {
    const bytes = await node.exportAsync({
      format: 'PNG',
      constraint: { type: 'WIDTH', value: 800 }
    });
    return `data:image/png;base64,${figma.base64Encode(bytes)}`;
  } catch {
    return null;
  }
}

figma.ui.onmessage = async (msg) => {
  
  // ============ MIGRATE FROM CLIENT STORAGE ============
  if (msg.type === 'MIGRATE_FROM_CLIENT_STORAGE') {
    try {
      console.log('🔄 Reading data from clientStorage for migration...');
      
      // Read all data from clientStorage
      const templates = await figma.clientStorage.getAsync(STORAGE_KEY) || [];
      const savedItems = await figma.clientStorage.getAsync('starter-kit-saved') || [];
      const figmaLinks = await figma.clientStorage.getAsync('starter-kit-figma-links') || [];
      const cloudFigmaLinks = await figma.clientStorage.getAsync('starter-kit-cloud-figma-links') || {};
      const customClouds = await figma.clientStorage.getAsync('starter-kit-custom-clouds') || [];
      const editableClouds = await figma.clientStorage.getAsync('starter-kit-editable-clouds') || null;
      const cloudCategories = await figma.clientStorage.getAsync('starter-kit-cloud-categories') || {};
      const statusSymbols = await figma.clientStorage.getAsync('starter-kit-status-symbols') || [];
      const cloudPOCs = await figma.clientStorage.getAsync('starter-kit-cloud-pocs') || {};
      const defaultCloud = await figma.clientStorage.getAsync('starter-kit-default-cloud') || null;
      const onboardingState = await figma.clientStorage.getAsync('starter-kit-onboarding') || { hasCompleted: false, skipSplash: false };
      const hiddenClouds = await figma.clientStorage.getAsync('starter-kit-hidden-clouds') || [];
      
      // Send all data to UI for migration to backend
      figma.ui.postMessage({
        type: 'MIGRATION_DATA',
        templates,
        savedItems,
        figmaLinks,
        cloudFigmaLinks,
        customClouds,
        editableClouds,
        cloudCategories,
        statusSymbols,
        cloudPOCs,
        defaultCloud,
        onboardingState,
        hiddenClouds,
      });
      
      console.log(`✓ Migration data prepared: ${templates.length} templates, ${savedItems.length} saved items`);
    } catch (error) {
      console.error('❌ Migration error:', error);
      figma.ui.postMessage({ type: 'MIGRATION_DATA', error: String(error) });
    }
    return;
  }
  
  // ============ LOAD TEMPLATES ============
  if (msg.type === 'LOAD_TEMPLATES') {
    try {
      const templates = await figma.clientStorage.getAsync(STORAGE_KEY);
      figma.ui.postMessage({ type: 'TEMPLATES_LOADED', templates: templates || [] });
    } catch {
      figma.ui.postMessage({ type: 'TEMPLATES_LOADED', templates: [] });
    }
    return;
  }

  // ============ SAVE TEMPLATES ============
  if (msg.type === 'SAVE_TEMPLATES') {
    try {
      await figma.clientStorage.setAsync(STORAGE_KEY, msg.templates);
      figma.ui.postMessage({ type: 'TEMPLATES_SAVED' });
    } catch (error) {
      figma.notify('⚠️ Failed to save templates', { error: true });
    }
    return;
  }
  
  // ============ LOAD FIGMA LINKS ============
  const FIGMA_LINKS_KEY = 'starter-kit-figma-links';
  
  if (msg.type === 'LOAD_FIGMA_LINKS') {
    try {
      const links = await figma.clientStorage.getAsync(FIGMA_LINKS_KEY);
      figma.ui.postMessage({ type: 'FIGMA_LINKS_LOADED', links: links || [] });
    } catch (error) {
      figma.ui.postMessage({ type: 'FIGMA_LINKS_LOADED', links: [] });
    }
    return;
  }
  
  // ============ SAVE FIGMA LINKS ============
  if (msg.type === 'SAVE_FIGMA_LINKS') {
    try {
      await figma.clientStorage.setAsync(FIGMA_LINKS_KEY, msg.links);
    } catch (error) {
      figma.notify('⚠️ Failed to save links', { error: true });
    }
    return;
  }
  
  // ============ CLOUD-SPECIFIC FIGMA LINKS ============
  const CLOUD_FIGMA_LINKS_KEY = 'starter-kit-cloud-figma-links';
  
  if (msg.type === 'LOAD_CLOUD_FIGMA_LINKS') {
    try {
      const links = await figma.clientStorage.getAsync(CLOUD_FIGMA_LINKS_KEY);
      figma.ui.postMessage({ type: 'CLOUD_FIGMA_LINKS_LOADED', links: links || {} });
    } catch (error) {
      figma.ui.postMessage({ type: 'CLOUD_FIGMA_LINKS_LOADED', links: {} });
    }
    return;
  }
  
  if (msg.type === 'SAVE_CLOUD_FIGMA_LINKS') {
    try {
      await figma.clientStorage.setAsync(CLOUD_FIGMA_LINKS_KEY, msg.links);
    } catch (error) {
      figma.notify('⚠️ Failed to save links', { error: true });
    }
    return;
  }
  
  // ============ LOAD DEFAULT CLOUD ============
  const DEFAULT_CLOUD_KEY = 'starter-kit-default-cloud';
  
  if (msg.type === 'LOAD_DEFAULT_CLOUD') {
    try {
      const cloudId = await figma.clientStorage.getAsync(DEFAULT_CLOUD_KEY);
      figma.ui.postMessage({ type: 'DEFAULT_CLOUD_LOADED', cloudId: cloudId || null });
    } catch (error) {
      figma.ui.postMessage({ type: 'DEFAULT_CLOUD_LOADED', cloudId: null });
    }
    return;
  }
  
  // ============ SAVE DEFAULT CLOUD ============
  if (msg.type === 'SAVE_DEFAULT_CLOUD') {
    try {
      await figma.clientStorage.setAsync(DEFAULT_CLOUD_KEY, msg.cloudId);
    } catch (error) {
      figma.notify('⚠️ Failed to save default cloud', { error: true });
    }
    return;
  }
  
  // ============ LOAD ONBOARDING STATE ============
  const ONBOARDING_KEY = 'starter-kit-onboarding';
  
  if (msg.type === 'LOAD_ONBOARDING_STATE') {
    try {
      const state = await figma.clientStorage.getAsync(ONBOARDING_KEY);
      figma.ui.postMessage({ 
        type: 'ONBOARDING_STATE_LOADED', 
        hasCompleted: state?.hasCompleted || false,
        skipSplash: state?.skipSplash || false
      });
    } catch (error) {
      figma.ui.postMessage({ type: 'ONBOARDING_STATE_LOADED', hasCompleted: false, skipSplash: false });
    }
    return;
  }
  
  // ============ SAVE ONBOARDING STATE ============
  if (msg.type === 'SAVE_ONBOARDING_STATE') {
    try {
      const existingState: any = await figma.clientStorage.getAsync(ONBOARDING_KEY) || {};
      const newState: any = {
        hasCompleted: msg.hasCompleted
      };
      if (existingState.skipSplash !== undefined) {
        newState.skipSplash = existingState.skipSplash;
      }
      if (typeof msg.skipSplash !== 'undefined') {
        newState.skipSplash = msg.skipSplash;
      }
      await figma.clientStorage.setAsync(ONBOARDING_KEY, newState);
    } catch (error) {
      figma.notify('⚠️ Failed to save onboarding state', { error: true });
    }
    return;
  }

  // ============ CUSTOM CLOUDS ============
  const CUSTOM_CLOUDS_KEY = 'starter-kit-custom-clouds';
  
  if (msg.type === 'LOAD_CUSTOM_CLOUDS') {
    try {
      const clouds = await figma.clientStorage.getAsync(CUSTOM_CLOUDS_KEY);
      figma.ui.postMessage({ type: 'CUSTOM_CLOUDS_LOADED', clouds: clouds || [] });
    } catch (error) {
      figma.ui.postMessage({ type: 'CUSTOM_CLOUDS_LOADED', clouds: [] });
    }
    return;
  }
  
  if (msg.type === 'SAVE_CUSTOM_CLOUDS') {
    try {
      await figma.clientStorage.setAsync(CUSTOM_CLOUDS_KEY, msg.clouds);
    } catch (error) {
      figma.notify('⚠️ Failed to save custom clouds', { error: true });
    }
    return;
  }
  
  // ============ EDITABLE CLOUDS ============
  const EDITABLE_CLOUDS_KEY = 'starter-kit-editable-clouds';
  
  if (msg.type === 'LOAD_EDITABLE_CLOUDS') {
    try {
      const clouds = await figma.clientStorage.getAsync(EDITABLE_CLOUDS_KEY);
      figma.ui.postMessage({ type: 'EDITABLE_CLOUDS_LOADED', clouds: clouds || null });
    } catch (error) {
      figma.ui.postMessage({ type: 'EDITABLE_CLOUDS_LOADED', clouds: null });
    }
    return;
  }
  
  if (msg.type === 'SAVE_EDITABLE_CLOUDS') {
    try {
      await figma.clientStorage.setAsync(EDITABLE_CLOUDS_KEY, msg.clouds);
    } catch (error) {
      figma.notify('⚠️ Failed to save clouds', { error: true });
    }
    return;
  }
  
  // ============ HIDDEN CLOUDS ============
  const HIDDEN_CLOUDS_KEY = 'starter-kit-hidden-clouds';
  
  if (msg.type === 'LOAD_HIDDEN_CLOUDS') {
    try {
      const hiddenClouds = await figma.clientStorage.getAsync(HIDDEN_CLOUDS_KEY);
      figma.ui.postMessage({ type: 'HIDDEN_CLOUDS_LOADED', hiddenClouds: hiddenClouds || [] });
    } catch (error) {
      figma.ui.postMessage({ type: 'HIDDEN_CLOUDS_LOADED', hiddenClouds: [] });
    }
    return;
  }
  
  if (msg.type === 'SAVE_HIDDEN_CLOUDS') {
    try {
      await figma.clientStorage.setAsync(HIDDEN_CLOUDS_KEY, msg.hiddenClouds);
    } catch (error) {
      figma.notify('⚠️ Failed to save hidden clouds', { error: true });
    }
    return;
  }
  
  // ============ CLOUD CATEGORIES ============
  const CLOUD_CATEGORIES_KEY = 'starter-kit-cloud-categories';
  
  if (msg.type === 'LOAD_CLOUD_CATEGORIES') {
    try {
      const categories = await figma.clientStorage.getAsync(CLOUD_CATEGORIES_KEY);
      figma.ui.postMessage({ type: 'CLOUD_CATEGORIES_LOADED', categories: categories || {} });
    } catch (error) {
      figma.ui.postMessage({ type: 'CLOUD_CATEGORIES_LOADED', categories: {} });
    }
    return;
  }
  
  if (msg.type === 'SAVE_CLOUD_CATEGORIES') {
    try {
      await figma.clientStorage.setAsync(CLOUD_CATEGORIES_KEY, msg.categories);
    } catch (error) {
      figma.notify('⚠️ Failed to save cloud categories', { error: true });
    }
    return;
  }
  
  // ============ STATUS SYMBOLS ============
  const STATUS_SYMBOLS_KEY = 'starter-kit-status-symbols';
  
  if (msg.type === 'LOAD_STATUS_SYMBOLS') {
    try {
      const symbols = await figma.clientStorage.getAsync(STATUS_SYMBOLS_KEY);
      figma.ui.postMessage({ type: 'STATUS_SYMBOLS_LOADED', symbols: symbols || [] });
    } catch (error) {
      figma.ui.postMessage({ type: 'STATUS_SYMBOLS_LOADED', symbols: [] });
    }
    return;
  }
  
  if (msg.type === 'SAVE_STATUS_SYMBOLS') {
    try {
      await figma.clientStorage.setAsync(STATUS_SYMBOLS_KEY, msg.symbols);
    } catch (error) {
      figma.notify('⚠️ Failed to save status symbols', { error: true });
    }
    return;
  }
  
  // ============ SAVED TEMPLATES ============
  if (msg.type === 'LOAD_SAVED_TEMPLATES') {
    try {
      const savedItems = await figma.clientStorage.getAsync('starter-kit-saved') || [];
      figma.ui.postMessage({ type: 'SAVED_TEMPLATES_LOADED', savedItems });
    } catch (error) {
      figma.ui.postMessage({ type: 'SAVED_TEMPLATES_LOADED', savedItems: [] });
    }
    return;
  }
  
  if (msg.type === 'SAVE_SAVED_TEMPLATES') {
    try {
      await figma.clientStorage.setAsync('starter-kit-saved', msg.savedItems);
    } catch (error) {
      figma.notify('⚠️ Failed to save', { error: true });
    }
    return;
  }
  
  // ============ SHOW TOAST ============
  if (msg.type === 'SHOW_TOAST') {
    figma.notify(`✓ ${msg.message}`, { timeout: 2500 });
    return;
  }
  
  // ============ GET COMPONENT INFO ============
  if (msg.type === 'GET_COMPONENT_INFO') {
    const selection = figma.currentPage.selection;
    
    if (selection.length === 0) {
      figma.notify('⚠️ Select a component first', { error: true });
      figma.ui.postMessage({ type: 'COMPONENT_ERROR', error: 'Select a component first' });
      return;
    }
    
    const node = selection[0];
    
    // Handle COMPONENT_SET (component with variants)
    if (node.type === 'COMPONENT_SET') {
      const preview = await generatePreview(node);
      
      // Get the correct order from variant property definitions
      let variantOrder: string[] = [];
      if (node.componentPropertyDefinitions) {
        for (const [key, def] of Object.entries(node.componentPropertyDefinitions)) {
          if (def.type === 'VARIANT' && def.variantOptions) {
            variantOrder = def.variantOptions;
            break; // Use the first variant property's order
          }
        }
      }
      
      // Build variants array with individual previews
      const variants: Array<{
        name: string;
        displayName: string;
        key: string;
        preview: string | null;
        orderIndex: number;
      }> = [];
      
      figma.notify(`Capturing ${node.children.length} slides...`);
      
      // Generate preview for each variant
      for (const child of node.children) {
        if (child.type === 'COMPONENT') {
          // Extract display name (remove property prefix like "Slides=")
          let displayName = child.name;
          const eqIndex = child.name.indexOf('=');
          if (eqIndex > 0) {
            displayName = child.name.substring(eqIndex + 1).trim();
          }
          
          // Find order index from variant property definition
          const orderIndex = variantOrder.indexOf(displayName);
          
          // Generate individual preview (smaller for grid)
          let variantPreview: string | null = null;
          try {
            const bytes = await child.exportAsync({
              format: 'PNG',
              constraint: { type: 'WIDTH', value: 300 }
            });
            variantPreview = `data:image/png;base64,${figma.base64Encode(bytes)}`;
          } catch {
            // Skip preview if it fails
          }
          
          variants.push({
            name: child.name,
            displayName: displayName,
            key: child.key,
            preview: variantPreview,
            orderIndex: orderIndex >= 0 ? orderIndex : 999,
          });
        }
      }
      
      // Sort variants by the order defined in Figma's variant property
      variants.sort((a, b) => a.orderIndex - b.orderIndex);
      
      // Get default variant (first child)
      const defaultVariant = node.children[0] as ComponentNode;
      
      figma.notify(`✓ ${node.name}: ${variants.length} slides captured`);
      
      figma.ui.postMessage({
        type: 'COMPONENT_INFO',
        name: node.name,
        key: defaultVariant?.key || '',
        id: node.id,
        width: node.width,
        height: node.height,
        preview: preview,
        isComponentSet: true,
        variants: variants,
        variantCount: variants.length,
      });
      return;
    }

    // Handle COMPONENT
    if (node.type === 'COMPONENT') {
      const preview = await generatePreview(node);
      figma.notify(`✓ Found: ${node.name}`);
      figma.ui.postMessage({
        type: 'COMPONENT_INFO',
        name: node.name,
        key: node.key,
        id: node.id,
        width: node.width,
        height: node.height,
        preview: preview,
        isComponentSet: false,
      });
      return;
    }
    
    // Handle INSTANCE
    if (node.type === 'INSTANCE') {
      const mainComponent = await node.getMainComponentAsync();
      if (mainComponent) {
        const preview = await generatePreview(node);
        figma.notify(`✓ Found: ${mainComponent.name}`);
        figma.ui.postMessage({
          type: 'COMPONENT_INFO',
          name: mainComponent.name,
          key: mainComponent.key,
          id: mainComponent.id,
          width: node.width,
          height: node.height,
          preview: preview,
        });
      } else {
        figma.notify('⚠️ Could not find main component', { error: true });
        figma.ui.postMessage({ type: 'COMPONENT_ERROR', error: 'Could not find main component' });
      }
      return;
    }
    
    // Not a component
    figma.notify('⚠️ Convert to component first (⌘⌥K)', { error: true });
    figma.ui.postMessage({ type: 'COMPONENT_ERROR', error: 'Convert to component first (⌘⌥K)' });
    return;
  }

  // ============ IMPORT COMPONENT ============
  if (msg.type === 'IMPORT_COMPONENT') {
    const { templateName, componentKey, isComponentSet, variantSelection } = msg.payload;
    
    try {
      const component = await figma.importComponentByKeyAsync(componentKey);
      let instance: InstanceNode;
      
      if (isComponentSet && variantSelection && Object.keys(variantSelection).length > 0) {
        // For component sets, find the matching variant
        const parent = component.parent;
        if (parent && parent.type === 'COMPONENT_SET') {
          // Build variant name from selection
          const variantProps = Object.entries(variantSelection)
            .map(([key, value]) => `${key}=${value}`)
            .join(', ');
          
          // Find matching child component
          const matchingVariant = parent.children.find(child => {
            if (child.type !== 'COMPONENT') return false;
            return Object.entries(variantSelection).every(([key, value]) => {
              const propValue = (child as ComponentNode).variantProperties?.[key];
              return propValue === value;
            });
          }) as ComponentNode | undefined;
          
          if (matchingVariant) {
            instance = matchingVariant.createInstance();
            figma.notify(`✓ Inserted "${templateName}" (${variantProps})`);
          } else {
            instance = component.createInstance();
            figma.notify(`✓ Inserted "${templateName}" (default variant)`);
          }
        } else {
          instance = component.createInstance();
          figma.notify(`✓ Inserted "${templateName}"`);
        }
      } else {
        instance = component.createInstance();
        figma.notify(`✓ Inserted "${templateName}"`);
      }
      
      // Position at viewport center
      const center = figma.viewport.center;
      instance.x = center.x - instance.width / 2;
      instance.y = center.y - instance.height / 2;
      
      figma.currentPage.appendChild(instance);
      figma.currentPage.selection = [instance];
      figma.viewport.scrollAndZoomIntoView([instance]);
      
      figma.ui.postMessage({ type: 'INSERT_SUCCESS', templateName, nodeId: instance.id });
      
    } catch (error) {
      figma.notify('⚠️ Failed to import template', { error: true });
      figma.ui.postMessage({ type: 'INSERT_ERROR', error: 'Failed to import template' });
    }
    return;
  }

  // ============ IMPORT MULTIPLE COMPONENTS ============
  if (msg.type === 'IMPORT_MULTIPLE_COMPONENTS') {
    const { templateName, componentKeys, slideNames } = msg.payload;
    
    try {
      const instances: InstanceNode[] = [];
      const center = figma.viewport.center;
      let xOffset = 0;
      const errors: string[] = [];
      
      for (let i = 0; i < componentKeys.length; i++) {
        const key = componentKeys[i];
        const slideName = slideNames?.[i] || `Slide ${i + 1}`;
        try {
          const component = await figma.importComponentByKeyAsync(key);
          const instance = component.createInstance();
          
          // Position side by side with spacing
          instance.x = center.x - (componentKeys.length * instance.width / 2) + xOffset;
          instance.y = center.y - instance.height / 2;
          xOffset += instance.width + 201; // 201px gap between slides
          
          figma.currentPage.appendChild(instance);
          instances.push(instance);
        } catch (err) {
          console.error(`Failed to import "${slideName}" with key ${key}:`, err);
          errors.push(slideName);
        }
      }
      
      if (instances.length > 0) {
        figma.currentPage.selection = instances;
        figma.viewport.scrollAndZoomIntoView(instances);
        if (errors.length > 0) {
          figma.notify(`✓ Inserted ${instances.length} slide${instances.length !== 1 ? 's' : ''}, ${errors.length} failed`);
        } else {
          figma.notify(`✓ Inserted ${instances.length} slide${instances.length !== 1 ? 's' : ''} from "${templateName}"`);
        }
        figma.ui.postMessage({ type: 'INSERT_SUCCESS', templateName, count: instances.length });
      } else {
        figma.notify('⚠️ Component not published to Team Library. Please publish first.', { error: true, timeout: 5000 });
        figma.ui.postMessage({ type: 'INSERT_ERROR', error: 'Component not in Team Library' });
      }
      
    } catch (error) {
      figma.notify('⚠️ Failed to import - ensure component is published', { error: true });
      figma.ui.postMessage({ type: 'INSERT_ERROR', error: 'Failed to import templates' });
    }
    return;
  }

  // ============ CHECK SCAFFOLD EXISTS ============
  if (msg.type === 'CHECK_SCAFFOLD_EXISTS') {
    // With dynamic-page access, we need to load all pages first
    figma.loadAllPagesAsync()
      .then(() => {
        // Check if scaffold pages already exist by looking for "CURRENT DESIGNS" page
        const exists = figma.root.children.some(page => 
          page.name.includes('CURRENT DESIGNS') || page.name.includes('Read Me')
        );
        figma.ui.postMessage({ type: 'SCAFFOLD_EXISTS', exists });
      })
      .catch((error) => {
        console.error('Error checking scaffold:', error);
        // Default to false if check fails
        figma.ui.postMessage({ type: 'SCAFFOLD_EXISTS', exists: false });
      });
    return;
  }

  // ============ SCAFFOLD FILE STRUCTURE ============
  if (msg.type === 'SCAFFOLD_FILE_STRUCTURE') {
    // With dynamic-page access, we need to load all pages first
    figma.loadAllPagesAsync()
      .then(async () => {
        try {
          // Check if scaffold already exists
          const alreadyExists = figma.root.children.some(page => 
            page.name.includes('CURRENT DESIGNS') || page.name === 'Read Me'
          );
          
          if (alreadyExists) {
            figma.notify('⚠️ Scaffold already exists in this file', { error: true });
            figma.ui.postMessage({ type: 'SCAFFOLD_EXISTS', exists: true });
            return;
          }
          
          // Rename existing "Page 1" to "Cover Page" or use first page
          let coverPage: PageNode | null = null;
          const page1 = figma.root.children.find(p => p.name === 'Page 1') as PageNode | undefined;
      
      if (page1) {
        page1.name = 'Cover Page';
        coverPage = page1;
      } else {
        // Use the first page if no "Page 1" exists
        coverPage = figma.root.children[0] as PageNode;
        if (coverPage) {
          coverPage.name = 'Cover Page';
        }
      }
      
      console.log('Cover page after setup:', coverPage?.name);
      
      // Try to insert default cover from saved templates
      const coverComponentKey = msg.coverComponentKey;
      console.log('Cover component key received:', coverComponentKey);
      console.log('Cover page exists:', !!coverPage);
      
      if (coverComponentKey && coverPage) {
        try {
          console.log('Attempting to import component...');
          const component = await figma.importComponentByKeyAsync(coverComponentKey);
          console.log('Component imported:', component.name);
          const instance = component.createInstance();
          
          // Position at origin of page
          instance.x = 0;
          instance.y = 0;
          
          coverPage.appendChild(instance);
          console.log('Instance added to cover page');
          figma.notify('✓ Default cover inserted!', { timeout: 2000 });
        } catch (err) {
          console.error('Failed to insert cover:', err);
          figma.notify('Cover not in Team Library - insert manually', { timeout: 3000 });
        }
      } else {
        console.log('Skipping cover insert - no key or no cover page');
      }
      
      // Use custom pages from UI if provided, otherwise use default structure
      const customPages = msg.pages as Array<{ name: string; isRename: boolean }> | undefined;
      
      // Create pages
      let createdCount = 0;
      let firstNewPage: PageNode | null = null;
      
      if (customPages && customPages.length > 0) {
        // Use custom pages from UI
        for (const pageData of customPages) {
          if (pageData.isRename) {
            // Skip the rename page - it's already handled above as Cover Page
            continue;
          }
          const page = figma.createPage();
          page.name = pageData.name;
          if (!firstNewPage) firstNewPage = page;
          createdCount++;
        }
      } else {
        // Use default structure as fallback
        const structure = [
          'Read Me',
          '───────────────────',
          'CURRENT DESIGNS',
          '🟢 {Release} {Feature Name}',
          '🟡 {Release} {Feature Name} • Variation 2',
          '───────────────────',
          'MILESTONES + E2E FLOWS/DEMOS',
          '🟢 {YYYY.MM.DD}_Product Demo',
          '───────────────────',
          'ARCHIVED EXPLORATIONS',
          '{YYYY.MM.DD}_{Exploration Name}',
          '───────────────────',
          'BELOW THE LINE',
          '❌ {Deprecated Feature}',
        ];
        
        for (const name of structure) {
          const page = figma.createPage();
          page.name = name;
          if (!firstNewPage) firstNewPage = page;
          createdCount++;
        }
      }
      
      // Navigate to Cover Page (the renamed Page 1)
      try {
        if (coverPage) {
          figma.currentPage = coverPage;
        } else if (firstNewPage) {
          figma.currentPage = firstNewPage;
        }
      } catch {
        // Navigation failed, but pages were created
      }
      
          figma.notify(`✓ Created ${createdCount} pages!`, { timeout: 3000 });
          figma.ui.postMessage({ type: 'SCAFFOLD_SUCCESS', count: createdCount });
        } catch (error) {
          console.error('Error creating scaffold:', error);
          figma.notify('⚠️ Error creating scaffold', { error: true });
          figma.ui.postMessage({ type: 'SCAFFOLD_ERROR', error: String(error) });
        }
      })
      .catch((error) => {
        console.error('Error loading pages for scaffold:', error);
        figma.notify('⚠️ Error loading pages', { error: true });
        figma.ui.postMessage({ type: 'SCAFFOLD_ERROR', error: 'Failed to load pages' });
      });
    return;
  }

  // ============ CLOUD POCs ============
  const CLOUD_POCS_KEY = 'starter-kit-cloud-pocs';
  
  if (msg.type === 'LOAD_CLOUD_POCS') {
    try {
      const pocs = await figma.clientStorage.getAsync(CLOUD_POCS_KEY);
      figma.ui.postMessage({ type: 'CLOUD_POCS_LOADED', pocs: pocs || {} });
    } catch (error) {
      figma.ui.postMessage({ type: 'CLOUD_POCS_LOADED', pocs: {} });
    }
    return;
  }
  
  if (msg.type === 'SAVE_CLOUD_POCS') {
    try {
      await figma.clientStorage.setAsync(CLOUD_POCS_KEY, msg.pocs);
    } catch (error) {
      figma.notify('⚠️ Failed to save POCs', { error: true });
    }
    return;
  }

  // ============ GET PREVIEW ============
  if (msg.type === 'GET_PREVIEW') {
    const { componentKey } = msg.payload;
    
    try {
      const component = await figma.importComponentByKeyAsync(componentKey);
      const instance = component.createInstance();
      
      const bytes = await instance.exportAsync({
        format: 'PNG',
        constraint: { type: 'WIDTH', value: 400 }
      });
      
      instance.remove();
      
      const base64 = figma.base64Encode(bytes);
      figma.ui.postMessage({
        type: 'PREVIEW_RESULT',
        componentKey,
        imageData: `data:image/png;base64,${base64}`,
      });
    } catch {
      figma.ui.postMessage({ type: 'PREVIEW_NOT_AVAILABLE', componentKey });
    }
  }

  // ============ OPEN EXTERNAL URL ============
  if (msg.type === 'OPEN_EXTERNAL_URL') {
    try {
      await figma.openExternal(msg.url);
    } catch (error) {
      figma.notify('Failed to open link', { error: true });
    }
    return;
  }

  // ============ GET SELECTED FRAME BRANDING ============
  if (msg.type === 'GET_SELECTED_FRAME_BRANDING') {
    try {
      const selection = figma.currentPage.selection;
      if (selection.length > 0) {
        const node = selection[0];
        // Check if it's a frame or can be exported
        if (node.type === 'FRAME' || node.type === 'COMPONENT' || node.type === 'INSTANCE') {
          const bytes = await node.exportAsync({
            format: 'PNG',
            constraint: { type: 'WIDTH', value: 200 }
          });
          const imageData = `data:image/png;base64,${figma.base64Encode(bytes)}`;
          figma.ui.postMessage({ 
            type: 'SELECTED_FRAME_BRANDING_LOADED', 
            branding: imageData,
            frameName: node.name
          });
        } else {
          figma.ui.postMessage({ type: 'SELECTED_FRAME_BRANDING_LOADED', branding: null });
        }
      } else {
        figma.ui.postMessage({ type: 'SELECTED_FRAME_BRANDING_LOADED', branding: null });
      }
    } catch (error) {
      figma.ui.postMessage({ type: 'SELECTED_FRAME_BRANDING_LOADED', branding: null });
    }
    return;
  }

  // ============ GET FRAME DETAILS ============
  if (msg.type === 'GET_FRAME_DETAILS') {
    try {
      const selection = figma.currentPage.selection;
      
      if (selection.length === 0) {
        figma.ui.postMessage({ 
          type: 'FRAME_DETAILS_RESULT', 
          error: 'No frame selected. Please select a frame, component, or instance.' 
        });
        return;
      }
      
      const node = selection[0];
      
      // Check if it's a frame, component, or instance
      if (node.type !== 'FRAME' && node.type !== 'COMPONENT' && node.type !== 'INSTANCE') {
        figma.ui.postMessage({ 
          type: 'FRAME_DETAILS_RESULT', 
          error: 'Selected node is not a frame, component, or instance.' 
        });
        return;
      }
      
      // Calculate aspect ratio
      const aspectRatio = node.width / node.height;
      const is16x9 = Math.abs(aspectRatio - 16/9) < 0.01; // Allow small tolerance
      
      // Check if it has auto layout
      const hasAutoLayout = 'layoutMode' in node && 
                           (node.layoutMode === 'HORIZONTAL' || node.layoutMode === 'VERTICAL');
      
      // Check recommended resolutions
      const recommendedResolutions = [
        { width: 1600, height: 900 },
        { width: 1920, height: 1080 }
      ];
      
      const matchesRecommended = recommendedResolutions.some(res => 
        node.width === res.width && node.height === res.height
      );
      
      // Get layout properties if available
      const layoutProps = hasAutoLayout ? {
        layoutMode: node.layoutMode,
        primaryAxisSizingMode: node.primaryAxisSizingMode,
        counterAxisSizingMode: node.counterAxisSizingMode,
        paddingLeft: node.paddingLeft,
        paddingRight: node.paddingRight,
        paddingTop: node.paddingTop,
        paddingBottom: node.paddingBottom,
        itemSpacing: node.itemSpacing,
      } : null;
      
      figma.ui.postMessage({
        type: 'FRAME_DETAILS_RESULT',
        details: {
          name: node.name,
          type: node.type,
          width: Math.round(node.width),
          height: Math.round(node.height),
          aspectRatio: aspectRatio.toFixed(2),
          is16x9: is16x9,
          hasAutoLayout: hasAutoLayout,
          matchesRecommendedResolution: matchesRecommended,
          layoutProps: layoutProps,
        }
      });
      
    } catch (error) {
      figma.ui.postMessage({ 
        type: 'FRAME_DETAILS_RESULT', 
        error: `Error getting frame details: ${error}` 
      });
    }
    return;
  }
};

// Listen for selection changes to update branding
figma.on('selectionchange', async () => {
  const selection = figma.currentPage.selection;
  if (selection.length > 0) {
    const node = selection[0];
    if (node.type === 'FRAME' || node.type === 'COMPONENT' || node.type === 'INSTANCE') {
      try {
        const bytes = await node.exportAsync({
          format: 'PNG',
          constraint: { type: 'WIDTH', value: 200 }
        });
        const imageData = `data:image/png;base64,${figma.base64Encode(bytes)}`;
        figma.ui.postMessage({ 
          type: 'SELECTED_FRAME_BRANDING_LOADED', 
          branding: imageData,
          frameName: node.name
        });
      } catch {
        // Ignore errors
      }
    }
  }
});
