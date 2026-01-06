/**
 * Design System Tokens - Barrel Export
 * 
 * Import all tokens from this file:
 * import { colors, typography, spacing, shadows } from '@ds/tokens';
 */

export * from './colors';
export * from './typography';
export * from './spacing';
export * from './shadows';

// Combined CSS variables for easy injection
import { colorsCSSVariables } from './colors';
import { typographyCSSVariables } from './typography';
import { spacingCSSVariables } from './spacing';
import { effectsCSSVariables } from './shadows';

/**
 * All CSS custom properties combined
 * Inject this into your HTML or use in a <style> tag
 */
export const allCSSVariables = `
${colorsCSSVariables}
${typographyCSSVariables}
${spacingCSSVariables}
${effectsCSSVariables}
`;

