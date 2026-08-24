/**
 * Rule: no-hardcoded-colors
 *
 * Disallows hardcoded Tailwind color utilities in favor of semantic tokens.
 *
 * Allowed semantic colors:
 * - bg-background, bg-card, bg-secondary
 * - text-foreground, text-muted-foreground
 * - border-border
 * - Semantic status colors generated from DS2 tokens
 *
 * Disallowed patterns:
 * - bg-gray-900, text-orange-600, border-blue-500, etc.
 */

// Pattern to match hardcoded Tailwind colors
// Matches: bg-{color}-{shade}, text-{color}-{shade}, border-{color}-{shade}, etc.
const HARDCODED_COLOR_PATTERN = /\b(bg|text|border|ring|outline|fill|stroke|from|via|to)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(\d{2,3})\b/g;

// Whitelisted patterns - these are allowed
const WHITELISTED_FILES = [
  /status-colors\.ts$/,
  /tailwind\.config/,
  /\.css$/,
];

// Semantic color mappings for suggestions
const COLOR_SUGGESTIONS = {
  // Grays
  'bg-gray-900': 'bg-background',
  'bg-gray-800': 'bg-card',
  'bg-gray-700': 'bg-secondary',
  'bg-gray-100': 'bg-background',
  'bg-gray-50': 'bg-background',
  'text-gray-900': 'text-foreground',
  'text-gray-700': 'text-foreground',
  'text-gray-600': 'text-muted-foreground',
  'text-gray-500': 'text-muted-foreground',
  'text-gray-400': 'text-muted-foreground',
  'border-gray-200': 'border-border',
  'border-gray-300': 'border-border',

  // Status colors
  'bg-red-100': 'bg-background',
  'text-red-600': 'text-foreground',
  'text-red-700': 'text-foreground',
  'bg-green-100': 'bg-background',
  'text-green-600': 'text-foreground',
  'text-green-700': 'text-foreground',
  'bg-yellow-100': 'bg-background',
  'text-yellow-600': 'text-foreground',
  'text-yellow-700': 'text-foreground',
  'bg-blue-100': 'bg-background',
  'text-blue-600': 'text-foreground',
  'text-blue-700': 'text-foreground',
};

module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Disallow hardcoded Tailwind colors, prefer semantic tokens',
      category: 'Stylistic Issues',
      recommended: true,
    },
    fixable: null, // Manual suggestion only
    schema: [
      {
        type: 'object',
        properties: {
          allowedPatterns: {
            type: 'array',
            items: { type: 'string' },
            description: 'File patterns to whitelist',
          },
          allowDarkModePairs: {
            type: 'boolean',
            description: 'Legacy compatibility only. Chronicle v3 sets this to false.',
            default: false,
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      noHardcodedColor:
        'Avoid hardcoded color "{{value}}". {{suggestion}}',
    },
  },

  create(context) {
    const options = context.options[0] || {};
    const allowedPatterns = (options.allowedPatterns || []).map(
      (p) => new RegExp(p)
    );
    const allowDarkModePairs = options.allowDarkModePairs === true;

    // Check if file is whitelisted
    const filename = context.filename || context.getFilename();
    const isWhitelisted =
      WHITELISTED_FILES.some((pattern) => pattern.test(filename)) ||
      allowedPatterns.some((pattern) => pattern.test(filename));

    if (isWhitelisted) {
      return {};
    }

    function checkStringLiteral(node, value) {
      // Reset regex lastIndex
      HARDCODED_COLOR_PATTERN.lastIndex = 0;

      // If allowDarkModePairs is true, check if this value has dark: pairs
      const hasDarkModePair = allowDarkModePairs && /\bdark:/.test(value);

      let match;
      while ((match = HARDCODED_COLOR_PATTERN.exec(value)) !== null) {
        const [fullMatch] = match;

        // Skip if this color has a dark mode pair
        if (hasDarkModePair) {
          // Check if this specific color has a dark: variant in the same string
          const darkVariantPattern = new RegExp(
            `dark:${fullMatch.replace('-', '-')}|dark:[a-z]+-${match[2]}-\\d+`
          );
          if (darkVariantPattern.test(value)) {
            continue;
          }
        }

        const suggestion = COLOR_SUGGESTIONS[fullMatch];
        const suggestionText = suggestion
          ? `Consider using "${suggestion}" instead.`
          : 'Use semantic tokens from status-colors.ts or ensure dark mode support.';

        context.report({
          node,
          messageId: 'noHardcodedColor',
          data: {
            value: fullMatch,
            suggestion: suggestionText,
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
