/**
 * Disallow styling escape hatches outside the token system: `dark:` variants
 * (themes switch through tokens), neutral palettes, and shadows other than the
 * three elevation tokens. `shadow-chronicle-*` remains allowed until the
 * legacy screens are rebuilt.
 */

const LEGACY_UTILITY_PATTERN =
  /(?:\b(?:dark:[^\s"'`<>}]+|(?:bg|text|border|ring|outline|divide|fill|stroke|from|via|to)-(?:slate|gray|zinc|neutral|stone)-\d{2,3}(?:\/\d+)?)\b|(?<![-\w])shadow-(?!(?:raised|overlay|dialog|none|chronicle-lifted|chronicle-overlay)\b)[^\s"'`<>}]+)/g;

const SUGGESTION = 'Use semantic token utilities, and shadow-raised, shadow-overlay, or shadow-dialog for elevation.';

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow dark: variants, neutral palettes, and non-token shadows',
      recommended: true,
    },
    schema: [],
    messages: {
      legacyUtility: 'Utility "{{value}}" is outside the design system. {{suggestion}}',
    },
  },

  create(context) {
    function checkString(node, value) {
      LEGACY_UTILITY_PATTERN.lastIndex = 0;
      let match;
      while ((match = LEGACY_UTILITY_PATTERN.exec(value)) !== null) {
        context.report({
          node,
          messageId: 'legacyUtility',
          data: { value: match[0], suggestion: SUGGESTION },
        });
      }
    }

    return {
      Literal(node) {
        if (typeof node.value === 'string') checkString(node, node.value);
      },
      TemplateElement(node) {
        if (node.value?.raw) checkString(node, node.value.raw);
      },
    };
  },
};
