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
      
      // Extract variant properties
      const variantProperties: Record<string, string[]> = {};
      if (node.componentPropertyDefinitions) {
        for (const [key, def] of Object.entries(node.componentPropertyDefinitions)) {
          if (def.type === 'VARIANT') {
            variantProperties[key] = def.variantOptions || [];
          }
        }
      }
      
      // Get default variant (first child)
      const defaultVariant = node.children[0] as ComponentNode;
      
      figma.notify(`✓ Found component set: ${node.name}`);
      figma.ui.postMessage({
        type: 'COMPONENT_INFO',
        name: node.name,
        key: defaultVariant?.key || '',
        id: node.id,
        width: node.width,
        height: node.height,
        preview: preview,
        isComponentSet: true,
        variantProperties: variantProperties,
        variantCount: node.children.length,
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
