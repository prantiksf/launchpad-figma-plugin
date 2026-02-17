/**
 * Figma Plugin UI Entry Point
 * 
 * This file runs in the plugin UI (iframe with DOM access).
 * Import and use design system components here.
 */

import './process-shim';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
// CSS is inlined by build script into the HTML

// Mount the app with error handling (catches load failures that cause blank screen)
const container = document.getElementById('root');
if (container) {
  try {
    const root = createRoot(container);
    root.render(
      <React.StrictMode>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </React.StrictMode>
    );
  } catch (e) {
    const escapeHtml = (s: string) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    const msg = escapeHtml(e instanceof Error ? e.message : String(e));
    const stack = escapeHtml(e instanceof Error ? (e.stack || 'No stack') : 'No stack');
    container.innerHTML = `
      <div style="padding:24px;font-family:Inter,sans-serif;color:#333;">
        <p style="font-weight:600;margin:0 0 8px;">Starter Kit failed to load</p>
        <p style="font-size:12px;color:#666;margin:0 0 16px;">${msg}</p>
        <p style="font-size:11px;color:#999;white-space:pre-wrap;overflow:auto;max-height:120px;">${stack}</p>
        <p style="font-size:12px;margin-top:16px;">Close the plugin and open it again to retry.</p>
      </div>
    `;
    console.error('Starter Kit mount error:', e);
  }
}

