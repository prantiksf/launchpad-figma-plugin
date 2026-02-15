/**
 * Polyfill for process.env in browser/Figma plugin context.
 * Must run before any other code that uses process.
 */
declare global {
  interface ProcessEnv {
    NODE_ENV?: string;
    STARTER_KIT_API_URL?: string;
  }
  interface Process {
    env: ProcessEnv;
  }
  var process: Process;
}

const g = typeof globalThis !== 'undefined' ? globalThis : (window as any);
if (typeof g.process === 'undefined') {
  g.process = {
    env: {
      NODE_ENV: 'production',
      STARTER_KIT_API_URL: '',
    },
  };
}

export {};
