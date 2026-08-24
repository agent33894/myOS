/**
 * Disallow the styling escape hatches removed by Chronicle Mac v3.
 * Theme switching now happens through DS2 variables, neutrals are semantic,
 * and elevated surfaces use one of the two Chronicle shadow tokens.
 */

const LEGACY_UTILITY_PATTERN =
  /(?:\b(?:dark:[^\s"'`<>}]+|(?:bg|text|border|ring|outline|divide|fill|stroke|from|via|to)-(?:slate|gray|zinc|neutral|stone)-\d{2,3}(?:\/\d+)?)\b|(?<!-)\bshadow-(?!chronicle-(?:lifted|overlay)\b|none\b)[^\s"'`<>}]+)/g;

const SUGGESTION =
  'Use DS2 semantic colors and theme variables, plus shadow-chronicle-lifted or shadow-chronicle-overlay.';

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow Chronicle v2 dark variants, neutral utilities, and legacy shadows',
      category: 'Stylistic Issues',
      recommended: true,
    },
    schema: [],
    messages: {
      legacyUtility: 'Legacy utility "{{value}}" is not part of Chronicle v3. {{suggestion}}',
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
