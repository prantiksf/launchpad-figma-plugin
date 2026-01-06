/**
 * Type-Safe Message Passing Utilities
 * 
 * This module provides type-safe communication between the UI and plugin sandbox.
 * Customize the message types to match your plugin's needs.
 */

// ============================================================================
// MESSAGE TYPE DEFINITIONS
// Define all possible messages between UI and Plugin here
// ============================================================================

/**
 * Messages sent from UI to Plugin
 */
export type UIToPluginMessage =
  | { type: 'CLOSE_PLUGIN' }
  | { type: 'RESIZE_UI'; width: number; height: number }
  | { type: 'CAPTURE_SCREENSHOT' }
  | { type: 'GET_SELECTION' }
  | { type: 'GET_USER_INFO' }
  | { type: 'INSERT_FRAME'; data: Record<string, unknown> }
  | { type: 'SHOW_NOTIFICATION'; message: string; options?: { error?: boolean } }
  | { type: 'GET_CACHED_DATA'; key: string }
  | { type: 'SET_CACHED_DATA'; key: string; data: unknown }
  | { type: 'CLEAR_CACHE' }
  // Add your custom message types here
  | { type: 'CUSTOM_ACTION'; payload: unknown };

/**
 * Messages sent from Plugin to UI
 */
export type PluginToUIMessage =
  | { type: 'PLUGIN_READY' }
  | { type: 'SCREENSHOT_RESULT'; base64?: string; error?: string }
  | { type: 'SELECTION_RESULT'; nodeId?: string; nodeName?: string; nodeType?: string; error?: string }
  | { type: 'USER_INFO'; name: string; id: string; email?: string }
  | { type: 'FRAME_INSERTED'; success: boolean; nodeId?: string; error?: string }
  | { type: 'CACHED_DATA'; key: string; data: unknown; exists: boolean }
  | { type: 'CACHE_UPDATED'; key: string; success: boolean }
  | { type: 'CACHE_CLEARED'; success: boolean }
  // Add your custom response types here
  | { type: 'CUSTOM_RESULT'; payload: unknown };

/**
 * All message types (union)
 */
export type PluginMessage = UIToPluginMessage | PluginToUIMessage;

// ============================================================================
// UI-SIDE UTILITIES
// Use these in your React components
// ============================================================================

/**
 * Send a message from UI to Plugin sandbox
 * 
 * @example
 * sendToPlugin({ type: 'CAPTURE_SCREENSHOT' });
 * sendToPlugin({ type: 'RESIZE_UI', width: 400, height: 600 });
 */
export function sendToPlugin(message: UIToPluginMessage): void {
  parent.postMessage({ pluginMessage: message }, '*');
}

/**
 * Subscribe to messages from Plugin
 * Returns an unsubscribe function
 * 
 * @example
 * useEffect(() => {
 *   return onPluginMessage((msg) => {
 *     if (msg.type === 'SCREENSHOT_RESULT') {
 *       console.log(msg.base64);
 *     }
 *   });
 * }, []);
 */
export function onPluginMessage(
  callback: (message: PluginToUIMessage) => void
): () => void {
  const handler = (event: MessageEvent) => {
    const msg = event.data?.pluginMessage;
    if (msg && typeof msg === 'object' && 'type' in msg) {
      callback(msg as PluginToUIMessage);
    }
  };
  
  window.addEventListener('message', handler);
  return () => window.removeEventListener('message', handler);
}

/**
 * Subscribe to a specific message type
 * 
 * @example
 * useEffect(() => {
 *   return onPluginMessageType('SCREENSHOT_RESULT', (msg) => {
 *     setScreenshot(msg.base64);
 *   });
 * }, []);
 */
export function onPluginMessageType<T extends PluginToUIMessage['type']>(
  type: T,
  callback: (message: Extract<PluginToUIMessage, { type: T }>) => void
): () => void {
  return onPluginMessage((msg) => {
    if (msg.type === type) {
      callback(msg as Extract<PluginToUIMessage, { type: T }>);
    }
  });
}

/**
 * Promise-based message sending with response
 * Useful for request/response patterns
 * 
 * @example
 * const result = await sendAndWait(
 *   { type: 'GET_USER_INFO' },
 *   'USER_INFO',
 *   5000
 * );
 * console.log(result.name);
 */
export function sendAndWait<
  TRequest extends UIToPluginMessage,
  TResponseType extends PluginToUIMessage['type']
>(
  request: TRequest,
  responseType: TResponseType,
  timeout = 10000
): Promise<Extract<PluginToUIMessage, { type: TResponseType }>> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      unsubscribe();
      reject(new Error(`Timeout waiting for ${responseType}`));
    }, timeout);

    const unsubscribe = onPluginMessageType(responseType, (msg) => {
      clearTimeout(timeoutId);
      unsubscribe();
      resolve(msg);
    });

    sendToPlugin(request);
  });
}

// ============================================================================
// PLUGIN-SIDE UTILITIES
// Use these in code.ts
// ============================================================================

/**
 * Send a message from Plugin to UI
 * (For use in code.ts)
 * 
 * @example
 * sendToUI({ type: 'SCREENSHOT_RESULT', base64: dataUrl });
 */
export function sendToUI(message: PluginToUIMessage): void {
  figma.ui.postMessage(message);
}

/**
 * Create a typed message handler for the plugin sandbox
 * (For use in code.ts)
 * 
 * @example
 * const handleMessage = createPluginMessageHandler({
 *   CAPTURE_SCREENSHOT: async () => {
 *     const bytes = await selection.exportAsync();
 *     sendToUI({ type: 'SCREENSHOT_RESULT', base64: encode(bytes) });
 *   },
 *   CLOSE_PLUGIN: () => {
 *     figma.closePlugin();
 *   },
 * });
 * 
 * figma.ui.onmessage = handleMessage;
 */
export function createPluginMessageHandler(
  handlers: Partial<{
    [K in UIToPluginMessage['type']]: (
      message: Extract<UIToPluginMessage, { type: K }>
    ) => void | Promise<void>;
  }>
): (message: unknown) => Promise<void> {
  return async (rawMessage: unknown) => {
    if (!rawMessage || typeof rawMessage !== 'object' || !('type' in rawMessage)) {
      return;
    }
    
    const message = rawMessage as UIToPluginMessage;
    const handler = handlers[message.type];
    
    if (handler) {
      try {
        await handler(message as any);
      } catch (error) {
        console.error(`Error handling ${message.type}:`, error);
      }
    }
  };
}

// ============================================================================
// REACT HOOKS
// Convenience hooks for React components
// ============================================================================

import { useEffect, useState, useCallback } from 'react';

/**
 * Hook to listen for plugin messages
 * 
 * @example
 * const lastMessage = usePluginMessage();
 * useEffect(() => {
 *   if (lastMessage?.type === 'USER_INFO') {
 *     setUser(lastMessage);
 *   }
 * }, [lastMessage]);
 */
export function usePluginMessage(): PluginToUIMessage | null {
  const [message, setMessage] = useState<PluginToUIMessage | null>(null);

  useEffect(() => {
    return onPluginMessage(setMessage);
  }, []);

  return message;
}

/**
 * Hook to listen for a specific message type
 * 
 * @example
 * const userInfo = usePluginMessageType('USER_INFO');
 */
export function usePluginMessageType<T extends PluginToUIMessage['type']>(
  type: T
): Extract<PluginToUIMessage, { type: T }> | null {
  const [message, setMessage] = useState<Extract<PluginToUIMessage, { type: T }> | null>(null);

  useEffect(() => {
    return onPluginMessageType(type, setMessage);
  }, [type]);

  return message;
}

/**
 * Hook for request/response pattern
 * 
 * @example
 * const { data, loading, error, execute } = usePluginRequest(
 *   { type: 'GET_USER_INFO' },
 *   'USER_INFO'
 * );
 * 
 * useEffect(() => { execute(); }, []);
 */
export function usePluginRequest<
  TRequest extends UIToPluginMessage,
  TResponseType extends PluginToUIMessage['type']
>(
  request: TRequest,
  responseType: TResponseType
) {
  const [data, setData] = useState<Extract<PluginToUIMessage, { type: TResponseType }> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const execute = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await sendAndWait(request, responseType);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, [request, responseType]);

  return { data, loading, error, execute };
}

