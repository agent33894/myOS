/**
 * ESLint Plugin: Design Tokens
 *
 * Custom rules for enforcing design system consistency:
 * - no-fractional-spacing: Disallow fractional Tailwind spacing (p-2.5, gap-1.5)
 * - no-hardcoded-colors: Disallow hardcoded colors, require semantic tokens
 * - no-legacy-utilities: Disallow dark variants, neutral palettes, and legacy shadows
 */

const noFractionalSpacing = require('./rules/no-fractional-spacing');
const noHardcodedColors = require('./rules/no-hardcoded-colors');
const noLegacyUtilities = require('./rules/no-legacy-utilities');

module.exports = {
  rules: {
    'no-fractional-spacing': noFractionalSpacing,
    'no-hardcoded-colors': noHardcodedColors,
    'no-legacy-utilities': noLegacyUtilities,
  },
  configs: {
    recommended: {
      plugins: ['design-tokens'],
      rules: {
        'design-tokens/no-fractional-spacing': 'warn',
        'design-tokens/no-hardcoded-colors': 'warn',
        'design-tokens/no-legacy-utilities': 'warn',
      },
    },
    strict: {
      plugins: ['design-tokens'],
      rules: {
        'design-tokens/no-fractional-spacing': 'error',
        'design-tokens/no-hardcoded-colors': 'error',
        'design-tokens/no-legacy-utilities': 'error',
      },
    },
  },
};
