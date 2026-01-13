// Launchpad - Figma Plugin
// Helps designers quickly insert pre-built templates from Team Library

const STORAGE_KEY = 'launchpad_templates';

figma.showUI(__html__, { 
  width: 420, 
  height: 640,
  themeColors: true 
});

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

  // ============ SCAFFOLD FILE STRUCTURE ============
  if (msg.type === 'SCAFFOLD_FILE_STRUCTURE') {
    try {
      // Get current date for placeholders
      const now = new Date();
      const dateStr = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}`;
      
      // Define the file structure based on the SCUX Starter Kit pattern
      const structure = [
        // Read Me
        { name: '📖 Read Me', isSection: false },
        
        // Divider
        { name: '───────────────────', isSection: true },
        
        // Current Designs Section
        { name: '📦 CURRENT DESIGNS', isSection: true },
        { name: '🟡 {Release} {Feature Name}', isSection: false },
        { name: '🟡 {Release} {Feature Name} • Variation 2', isSection: false },
        { name: '🟡 {Release} {Feature Name} • Variation 3', isSection: false },
        
        // Divider
        { name: '───────────────────', isSection: true },
        
        // Milestones & Demos Section
        { name: '🎯 MILESTONES + E2E FLOWS/DEMOS', isSection: true },
        { name: `🟢 ${dateStr}_Product Demo`, isSection: false },
        { name: `🟢 ${dateStr}_Walkthrough Recording`, isSection: false },
        { name: `🟢 ${dateStr}_Steelthread Proto`, isSection: false },
        
        // Divider
        { name: '───────────────────', isSection: true },
        
        // Archived Explorations Section
        { name: '📁 ARCHIVED EXPLORATIONS', isSection: true },
        { name: `${dateStr}_{Exploration Name}`, isSection: false },
        { name: `${dateStr}_{Exploration Name} 2`, isSection: false },
        { name: `${dateStr}_{Exploration Name} 3`, isSection: false },
        
        // Divider
        { name: '───────────────────', isSection: true },
        
        // Below the Line Section
        { name: '🗑️ BELOW THE LINE', isSection: true },
        { name: '❌ {Deprecated Feature}', isSection: false },
        { name: '❌ {Parked Exploration}', isSection: false },
        { name: '❌ {Old Version}', isSection: false },
      ];
      
      // Create pages
      let createdCount = 0;
      let firstNewPage: PageNode | null = null;
      
      for (const item of structure) {
        const page = figma.createPage();
        page.name = item.name;
        if (!firstNewPage) firstNewPage = page;
        createdCount++;
      }
      
      // Navigate to the first new page (Read Me)
      if (firstNewPage) {
        figma.currentPage = firstNewPage;
      }
      
      figma.notify(`✓ Created ${createdCount} pages! Rename placeholders as needed.`, { timeout: 4000 });
      figma.ui.postMessage({ type: 'SCAFFOLD_SUCCESS', count: createdCount });
      
    } catch (error) {
      figma.notify('⚠️ Failed to create file structure', { error: true });
      figma.ui.postMessage({ type: 'SCAFFOLD_ERROR', error: String(error) });
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
};
