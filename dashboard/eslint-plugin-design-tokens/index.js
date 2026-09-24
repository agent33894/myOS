/**
 * ESLint Plugin: Design Tokens
 *
 * Keeps renderer code inside the design system (docs/design/design-system.md):
 * - no-fractional-spacing: off-grid 2.5 / 3.5 spacing utilities
 * - no-hardcoded-colors: palette and arbitrary color utilities
 * - no-legacy-utilities: dark: variants, neutral palettes, non-token shadows
 * - no-raw-controls: raw <button>/<input>/<textarea>/<select> outside src/ui
 */

module.exports = {
  rules: {
    'no-fractional-spacing': require('./rules/no-fractional-spacing'),
    'no-hardcoded-colors': require('./rules/no-hardcoded-colors'),
    'no-legacy-utilities': require('./rules/no-legacy-utilities'),
    'no-raw-controls': require('./rules/no-raw-controls'),
  },
};
