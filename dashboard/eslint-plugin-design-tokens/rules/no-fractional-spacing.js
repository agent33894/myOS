/**
 * Rule: no-fractional-spacing
 *
 * Disallows the off-rhythm 2.5 and 3.5 Tailwind spacing utilities. Chronicle
 * intentionally permits 0.5 and 1.5 for hairlines and compact instrument spacing.
 *
 * Standard spacing scale:
 * - p-3 (12px) - Compact
 * - p-4 (16px) - Default
 * - p-6 (24px) - Standard
 * - p-8 (32px) - Large
 */

// Patterns that indicate fractional spacing
const FRACTIONAL_SPACING_PATTERN = /\b(p|px|py|pt|pb|pl|pr|m|mx|my|mt|mb|ml|mr|gap|space-[xy]|inset|top|right|bottom|left|w|h|min-w|min-h|max-w|max-h)-((?:2|3)\.5)\b/g;

// Mapping fractional values to suggested whole values
const SUGGESTIONS = {
  '2.5': '3',
  '3.5': '4',
};

module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Disallow fractional Tailwind spacing utilities',
      category: 'Stylistic Issues',
      recommended: true,
    },
    fixable: null, // Manual fix required - not auto-fixable
    schema: [
      {
        type: 'object',
        properties: {
          allowedPatterns: {
            type: 'array',
            items: { type: 'string' },
            description: 'Patterns to allow (e.g., for specific files)',
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      noFractionalSpacing:
        'Avoid fractional spacing "{{value}}". Consider using "{{suggestion}}" instead for consistent visual rhythm.',
    },
  },

  create(context) {
    const options = context.options[0] || {};
    const allowedPatterns = (options.allowedPatterns || []).map(
      (p) => new RegExp(p)
    );

    // Check if file is whitelisted
    const filename = context.filename || context.getFilename();
    const isWhitelisted = allowedPatterns.some((pattern) =>
      pattern.test(filename)
    );

    if (isWhitelisted) {
      return {};
    }

    function checkStringLiteral(node, value) {
      // Reset regex lastIndex for each check
      FRACTIONAL_SPACING_PATTERN.lastIndex = 0;

      let match;
      while ((match = FRACTIONAL_SPACING_PATTERN.exec(value)) !== null) {
        const [fullMatch, prefix, fractional] = match;
        const suggestedValue = SUGGESTIONS[fractional] || Math.round(parseFloat(fractional)).toString();

        context.report({
          node,
          messageId: 'noFractionalSpacing',
          data: {
            value: fullMatch,
            suggestion: `${prefix}-${suggestedValue}`,
          },
        });
      }
    }

    return {
      Literal(node) {
        if (typeof node.value === 'string') {
          checkStringLiteral(node, node.value);
        }
      },
      TemplateElement(node) {
        if (node.value && node.value.raw) {
          checkStringLiteral(node, node.value.raw);
        }
      },
    };
  },
};
