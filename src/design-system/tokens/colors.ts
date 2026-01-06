/**
 * SLDS 2 Design Tokens: Colors
 * 
 * Based on Salesforce Lightning Design System 2
 * https://www.lightningdesignsystem.com/
 */

export const colors = {
  // ===========================================
  // BRAND (Salesforce Blue)
  // ===========================================
  brand: {
    100: '#FFFFFF',
    95: '#EEF4FF',
    90: '#D8E6FE',
    80: '#AACBFF',
    70: '#78B0FD',
    65: '#57A3FD',
    60: '#1B96FF',        // Primary action color
    50: '#0176D3',        // Main brand blue
    40: '#0B5CAB',
    30: '#014486',
    20: '#032D60',
    15: '#03234D',
    10: '#001639',
  },

  // ===========================================
  // NEUTRAL (Gray Scale)
  // ===========================================
  neutral: {
    100: '#FFFFFF',
    95: '#F3F3F3',
    90: '#E5E5E5',
    80: '#C9C9C9',
    70: '#AEAEAE',
    65: '#A0A0A0',
    60: '#939393',
    50: '#747474',
    40: '#5C5C5C',
    30: '#444444',
    20: '#2E2E2E',
    15: '#242424',
    10: '#181818',
  },

  // ===========================================
  // ERROR (Red)
  // ===========================================
  error: {
    100: '#FFFFFF',
    90: '#FEDFD8',
    80: '#FEB8AB',
    70: '#FE8F7D',
    60: '#FE5C4C',
    50: '#EA001E',        // Primary error
    40: '#BA0517',
    30: '#8E030F',
    20: '#640103',
    10: '#300C01',
  },

  // ===========================================
  // WARNING (Orange/Amber)
  // ===========================================
  warning: {
    100: '#FFFFFF',
    90: '#FEDFD0',
    80: '#FFBA90',
    70: '#FE9339',
    60: '#DD7A01',        // Primary warning
    50: '#A96404',
    40: '#825101',
    30: '#5F3E02',
    20: '#3E2B02',
    10: '#201600',
  },

  // ===========================================
  // SUCCESS (Green)
  // ===========================================
  success: {
    100: '#FFFFFF',
    90: '#CDEFC4',
    80: '#91DB8B',
    70: '#45C65A',
    60: '#3BA755',        // Primary success
    50: '#2E844A',
    40: '#396547',
    30: '#194E31',
    20: '#1C3326',
    10: '#071B12',
  },

  // ===========================================
  // BORDER COLORS
  // ===========================================
  border: {
    light: '#C9C9C9',     // color-border-base-1
    medium: '#AEAEAE',    // color-border-base-2
    dark: '#939393',      // color-border-base-3
    darker: '#747474',    // color-border-base-4
    brand: '#78B0FD',     // color-border-brand-1
    brandStrong: '#1B96FF', // color-border-brand-2
  },

  // ===========================================
  // LINK COLORS
  // ===========================================
  link: {
    default: '#0B5CAB',
    hover: '#014486',
    focus: '#014486',
    active: '#032D60',
  },

  // ===========================================
  // BACKGROUND COLORS
  // ===========================================
  background: {
    default: '#FFFFFF',
    alt: '#F3F3F3',
    inverse: '#181818',
    brand: '#0176D3',
    brandDark: '#014486',
  },

  // ===========================================
  // TEXT COLORS
  // ===========================================
  text: {
    default: '#181818',
    secondary: '#444444',
    muted: '#747474',
    inverse: '#FFFFFF',
    link: '#0B5CAB',
    error: '#EA001E',
    success: '#2E844A',
    warning: '#A96404',
  },
} as const;

/**
 * Semantic color aliases for common use cases
 */
export const semanticColors = {
  // Interactive
  interactive: colors.brand[50],
  interactiveHover: colors.brand[40],
  interactiveActive: colors.brand[30],
  
  // Destructive
  destructive: colors.error[50],
  destructiveHover: colors.error[40],
  destructiveActive: colors.error[30],
  
  // Focus ring
  focusRing: `rgba(1, 118, 211, 0.5)`, // brand-50 with alpha
  
  // Disabled
  disabled: colors.neutral[80],
  disabledText: colors.neutral[60],
} as const;

/**
 * CSS Custom Properties for SLDS colors
 */
export const colorsCSSVariables = `
:root {
  /* Brand */
  --slds-c-brand-primary: ${colors.brand[50]};
  --slds-c-brand-primary-hover: ${colors.brand[40]};
  --slds-c-brand-primary-active: ${colors.brand[30]};
  --slds-c-brand-accent: ${colors.brand[60]};

  /* Neutral */
  --slds-c-neutral-100: ${colors.neutral[100]};
  --slds-c-neutral-95: ${colors.neutral[95]};
  --slds-c-neutral-90: ${colors.neutral[90]};
  --slds-c-neutral-80: ${colors.neutral[80]};
  --slds-c-neutral-70: ${colors.neutral[70]};
  --slds-c-neutral-60: ${colors.neutral[60]};
  --slds-c-neutral-50: ${colors.neutral[50]};
  --slds-c-neutral-40: ${colors.neutral[40]};
  --slds-c-neutral-30: ${colors.neutral[30]};
  --slds-c-neutral-20: ${colors.neutral[20]};
  --slds-c-neutral-10: ${colors.neutral[10]};

  /* Error */
  --slds-c-error: ${colors.error[50]};
  --slds-c-error-light: ${colors.error[90]};
  --slds-c-error-dark: ${colors.error[40]};

  /* Warning */
  --slds-c-warning: ${colors.warning[60]};
  --slds-c-warning-light: ${colors.warning[90]};
  --slds-c-warning-dark: ${colors.warning[50]};

  /* Success */
  --slds-c-success: ${colors.success[60]};
  --slds-c-success-light: ${colors.success[90]};
  --slds-c-success-dark: ${colors.success[50]};

  /* Text */
  --slds-c-text-default: ${colors.text.default};
  --slds-c-text-secondary: ${colors.text.secondary};
  --slds-c-text-muted: ${colors.text.muted};
  --slds-c-text-inverse: ${colors.text.inverse};
  --slds-c-text-link: ${colors.text.link};

  /* Background */
  --slds-c-bg-default: ${colors.background.default};
  --slds-c-bg-alt: ${colors.background.alt};
  --slds-c-bg-inverse: ${colors.background.inverse};

  /* Border */
  --slds-c-border-default: ${colors.border.light};
  --slds-c-border-strong: ${colors.border.medium};
  --slds-c-border-brand: ${colors.border.brandStrong};
}
`;

export type ColorToken = typeof colors;
