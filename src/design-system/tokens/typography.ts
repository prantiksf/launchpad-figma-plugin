/**
 * SLDS 2 Design Tokens: Typography
 * 
 * Based on Salesforce Lightning Design System 2
 */

export const typography = {
  // ===========================================
  // FONT FAMILIES (SLDS)
  // ===========================================
  fontFamily: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
    mono: "Consolas, Menlo, Monaco, Courier, monospace",
  },

  // ===========================================
  // FONT SIZES (SLDS Scale)
  // ===========================================
  fontSize: {
    'neg-4': '0.625rem',   // 10px
    'neg-3': '0.75rem',    // 12px
    'neg-2': '0.8125rem',  // 13px
    'neg-1': '0.875rem',   // 14px
    'base': '1rem',        // 16px
    '1': '1.125rem',       // 18px
    '2': '1.266rem',       // ~20px
    '3': '1.424rem',       // ~23px
    '4': '1.602rem',       // ~26px
    '5': '1.802rem',       // ~29px
    '6': '2.027rem',       // ~32px
  },

  // Pixel-based aliases for Figma plugin (smaller UI)
  fontSizePx: {
    xs: '10px',
    sm: '12px',
    base: '13px',
    md: '14px',
    lg: '16px',
    xl: '18px',
    '2xl': '20px',
    '3xl': '24px',
    '4xl': '32px',
  },

  // ===========================================
  // FONT WEIGHTS (SLDS)
  // ===========================================
  fontWeight: {
    light: '300',
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },

  // ===========================================
  // LINE HEIGHTS (SLDS)
  // ===========================================
  lineHeight: {
    '1': '1',
    '2': '1.25',
    '3': '1.375',
    '4': '1.5',      // Default
    '5': '1.75',
    '6': '2',
  },

  // ===========================================
  // LETTER SPACING
  // ===========================================
  letterSpacing: {
    tight: '-0.025em',
    normal: '0',
    wide: '0.025em',
  },
} as const;

/**
 * Pre-composed text styles for SLDS
 */
export const textStyles = {
  // Headings
  heading1: {
    fontFamily: typography.fontFamily.sans,
    fontSize: typography.fontSizePx['3xl'],
    fontWeight: typography.fontWeight.bold,
    lineHeight: typography.lineHeight['2'],
  },
  heading2: {
    fontFamily: typography.fontFamily.sans,
    fontSize: typography.fontSizePx['2xl'],
    fontWeight: typography.fontWeight.bold,
    lineHeight: typography.lineHeight['2'],
  },
  heading3: {
    fontFamily: typography.fontFamily.sans,
    fontSize: typography.fontSizePx.xl,
    fontWeight: typography.fontWeight.semibold,
    lineHeight: typography.lineHeight['3'],
  },
  heading4: {
    fontFamily: typography.fontFamily.sans,
    fontSize: typography.fontSizePx.lg,
    fontWeight: typography.fontWeight.semibold,
    lineHeight: typography.lineHeight['3'],
  },

  // Body text
  body: {
    fontFamily: typography.fontFamily.sans,
    fontSize: typography.fontSizePx.md,
    fontWeight: typography.fontWeight.normal,
    lineHeight: typography.lineHeight['4'],
  },
  bodySmall: {
    fontFamily: typography.fontFamily.sans,
    fontSize: typography.fontSizePx.base,
    fontWeight: typography.fontWeight.normal,
    lineHeight: typography.lineHeight['4'],
  },

  // UI Elements
  label: {
    fontFamily: typography.fontFamily.sans,
    fontSize: typography.fontSizePx.sm,
    fontWeight: typography.fontWeight.medium,
    lineHeight: typography.lineHeight['3'],
  },
  caption: {
    fontFamily: typography.fontFamily.sans,
    fontSize: typography.fontSizePx.xs,
    fontWeight: typography.fontWeight.normal,
    lineHeight: typography.lineHeight['4'],
  },
  button: {
    fontFamily: typography.fontFamily.sans,
    fontSize: typography.fontSizePx.base,
    fontWeight: typography.fontWeight.medium,
    lineHeight: typography.lineHeight['1'],
  },
} as const;

/**
 * CSS Custom Properties for SLDS typography
 */
export const typographyCSSVariables = `
:root {
  /* Font Families */
  --slds-font-sans: ${typography.fontFamily.sans};
  --slds-font-mono: ${typography.fontFamily.mono};

  /* Font Sizes */
  --slds-font-size-xs: ${typography.fontSizePx.xs};
  --slds-font-size-sm: ${typography.fontSizePx.sm};
  --slds-font-size-base: ${typography.fontSizePx.base};
  --slds-font-size-md: ${typography.fontSizePx.md};
  --slds-font-size-lg: ${typography.fontSizePx.lg};
  --slds-font-size-xl: ${typography.fontSizePx.xl};
  --slds-font-size-2xl: ${typography.fontSizePx['2xl']};
  --slds-font-size-3xl: ${typography.fontSizePx['3xl']};

  /* Font Weights */
  --slds-font-weight-normal: ${typography.fontWeight.normal};
  --slds-font-weight-medium: ${typography.fontWeight.medium};
  --slds-font-weight-semibold: ${typography.fontWeight.semibold};
  --slds-font-weight-bold: ${typography.fontWeight.bold};

  /* Line Heights */
  --slds-line-height-tight: ${typography.lineHeight['2']};
  --slds-line-height-normal: ${typography.lineHeight['4']};
  --slds-line-height-relaxed: ${typography.lineHeight['5']};
}
`;

export type TypographyToken = typeof typography;
