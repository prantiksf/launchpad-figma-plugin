/**
 * SLDS 2 Design Tokens: Effects (Shadows, Radius, Transitions)
 * 
 * Based on Salesforce Lightning Design System 2
 */

/**
 * SLDS Border Radius
 */
export const radii = {
  none: '0',
  '1': '0.125rem',    // 2px
  '2': '0.25rem',     // 4px - SLDS default
  '3': '0.5rem',      // 8px
  '4': '1rem',        // 16px
  circle: '100%',
  pill: '9999px',
} as const;

/**
 * SLDS Box Shadows
 */
export const shadows = {
  none: 'none',
  
  // Elevation shadows
  '1': '0 2px 4px rgba(0, 0, 0, 0.1)',
  '2': '0 4px 8px rgba(0, 0, 0, 0.1)',
  '3': '0 8px 16px rgba(0, 0, 0, 0.1)',
  '4': '0 16px 32px rgba(0, 0, 0, 0.15)',
  
  // Component-specific
  card: '0 2px 4px rgba(0, 0, 0, 0.1)',
  dropdown: '0 4px 14px rgba(0, 0, 0, 0.15)',
  modal: '0 8px 24px rgba(0, 0, 0, 0.2)',
  
  // Focus rings (SLDS style)
  focusBrand: '0 0 0 3px rgba(1, 118, 211, 0.5)',
  focusError: '0 0 0 3px rgba(234, 0, 30, 0.4)',
  focusSuccess: '0 0 0 3px rgba(46, 132, 74, 0.4)',
  
  // Inner shadow (for inputs)
  inner: 'inset 0 1px 2px rgba(0, 0, 0, 0.1)',
} as const;

/**
 * SLDS Transitions
 */
export const transitions = {
  // Durations
  duration: {
    instant: '0ms',
    fast: '100ms',
    normal: '200ms',
    slow: '300ms',
    slower: '400ms',
  },
  
  // Timing functions
  easing: {
    linear: 'linear',
    ease: 'ease',
    easeIn: 'ease-in',
    easeOut: 'ease-out',
    easeInOut: 'ease-in-out',
    // SLDS custom easing
    entrance: 'cubic-bezier(0, 0, 0.2, 1)',
    exit: 'cubic-bezier(0.4, 0, 1, 1)',
    standard: 'cubic-bezier(0.4, 0, 0.2, 1)',
  },

  // Pre-composed transitions
  default: '200ms ease',
  fast: '100ms ease',
  colors: 'background-color 200ms ease, border-color 200ms ease, color 200ms ease',
  transform: 'transform 200ms cubic-bezier(0.4, 0, 0.2, 1)',
  opacity: 'opacity 200ms ease',
  all: 'all 200ms ease',
} as const;

/**
 * CSS Custom Properties for SLDS effects
 */
export const effectsCSSVariables = `
:root {
  /* Border Radius */
  --slds-radius-1: ${radii['1']};
  --slds-radius-2: ${radii['2']};
  --slds-radius-3: ${radii['3']};
  --slds-radius-4: ${radii['4']};
  --slds-radius-pill: ${radii.pill};

  /* Shadows */
  --slds-shadow-1: ${shadows['1']};
  --slds-shadow-2: ${shadows['2']};
  --slds-shadow-3: ${shadows['3']};
  --slds-shadow-4: ${shadows['4']};
  --slds-shadow-card: ${shadows.card};
  --slds-shadow-dropdown: ${shadows.dropdown};
  --slds-shadow-modal: ${shadows.modal};
  --slds-shadow-focus: ${shadows.focusBrand};

  /* Transitions */
  --slds-transition-default: ${transitions.default};
  --slds-transition-fast: ${transitions.fast};
  --slds-duration-fast: ${transitions.duration.fast};
  --slds-duration-normal: ${transitions.duration.normal};
  --slds-duration-slow: ${transitions.duration.slow};
}
`;

export type RadiusToken = typeof radii;
export type ShadowToken = typeof shadows;
export type TransitionToken = typeof transitions;
