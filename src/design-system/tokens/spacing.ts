/**
 * SLDS 2 Design Tokens: Spacing
 * 
 * Based on Salesforce Lightning Design System 2
 */

export const spacing = {
  // ===========================================
  // SLDS SPACING SCALE (rem-based)
  // ===========================================
  '0': '0',
  '1': '0.25rem',    // 4px
  '2': '0.5rem',     // 8px
  '3': '0.75rem',    // 12px
  '4': '1rem',       // 16px
  '5': '1.5rem',     // 24px
  '6': '2rem',       // 32px
  '7': '2.5rem',     // 40px
  '8': '3rem',       // 48px
  '9': '3.5rem',     // 56px
  '10': '4rem',      // 64px
  '11': '4.5rem',    // 72px
  '12': '5rem',      // 80px
} as const;

/**
 * Pixel-based spacing for Figma plugins (more precise control)
 */
export const spacingPx = {
  '0': '0px',
  '0.5': '2px',
  '1': '4px',
  '1.5': '6px',
  '2': '8px',
  '2.5': '10px',
  '3': '12px',
  '4': '16px',
  '5': '20px',
  '6': '24px',
  '8': '32px',
  '10': '40px',
  '12': '48px',
  '16': '64px',
} as const;

/**
 * Semantic spacing for specific use cases
 */
export const semanticSpacing = {
  // Component internal padding
  componentXxs: spacingPx['0.5'],   // 2px
  componentXs: spacingPx['1'],      // 4px
  componentSm: spacingPx['2'],      // 8px
  componentMd: spacingPx['3'],      // 12px
  componentLg: spacingPx['4'],      // 16px
  componentXl: spacingPx['6'],      // 24px

  // Gaps between elements
  gapXs: spacingPx['1'],            // 4px
  gapSm: spacingPx['2'],            // 8px
  gapMd: spacingPx['3'],            // 12px
  gapLg: spacingPx['4'],            // 16px
  gapXl: spacingPx['6'],            // 24px

  // Section spacing
  sectionSm: spacingPx['4'],        // 16px
  sectionMd: spacingPx['6'],        // 24px
  sectionLg: spacingPx['8'],        // 32px

  // Figma plugin specific
  pluginPadding: spacingPx['3'],    // 12px - standard plugin padding
  pluginGap: spacingPx['2'],        // 8px - standard gap
  inputHeight: '32px',              // SLDS input height
  buttonHeight: '32px',             // SLDS button height
  buttonHeightSmall: '24px',
  buttonHeightLarge: '40px',
} as const;

/**
 * CSS Custom Properties for SLDS spacing
 */
export const spacingCSSVariables = `
:root {
  /* SLDS Spacing Scale */
  --slds-spacing-0: ${spacing['0']};
  --slds-spacing-1: ${spacing['1']};
  --slds-spacing-2: ${spacing['2']};
  --slds-spacing-3: ${spacing['3']};
  --slds-spacing-4: ${spacing['4']};
  --slds-spacing-5: ${spacing['5']};
  --slds-spacing-6: ${spacing['6']};
  --slds-spacing-7: ${spacing['7']};
  --slds-spacing-8: ${spacing['8']};

  /* Pixel-based (for Figma plugins) */
  --space-1: ${spacingPx['1']};
  --space-2: ${spacingPx['2']};
  --space-3: ${spacingPx['3']};
  --space-4: ${spacingPx['4']};
  --space-5: ${spacingPx['5']};
  --space-6: ${spacingPx['6']};
  --space-8: ${spacingPx['8']};

  /* Component sizes */
  --slds-input-height: ${semanticSpacing.inputHeight};
  --slds-button-height: ${semanticSpacing.buttonHeight};
  --slds-button-height-sm: ${semanticSpacing.buttonHeightSmall};
  --slds-button-height-lg: ${semanticSpacing.buttonHeightLarge};
}
`;

export type SpacingToken = typeof spacing;
