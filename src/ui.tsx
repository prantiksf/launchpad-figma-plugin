/**
 * Figma Plugin UI Entry Point
 * 
 * This file runs in the plugin UI (iframe with DOM access).
 * Import and use design system components here.
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
// CSS is inlined by build script into the HTML

// Mount the app
const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

