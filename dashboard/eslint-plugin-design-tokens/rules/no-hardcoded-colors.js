/**
 * Rule: no-hardcoded-colors
 *
 * Colors come from tokens (src/styles/tokens.css via tailwind.config.mjs):
 * `bg-raised`, `text-text-secondary`, `border-border`, `bg-accent-soft`, …
 *
 * Reports:
 * - Tailwind palette utilities: `bg-gray-900`, `text-orange-600`, …
 * - Arbitrary color values: `text-[#fff]`, `bg-[hsl(var(--x))]`,
 *   `border-[rgb(var(--accent-color))]`, `bg-[color-mix(…)]`, `text-[var(--x)]`.
 *   Pass `{ arbitrary: false }` to skip these (legacy files only).
 */

const PREFIXES = 'bg|text|border(?:-[trblxyse])?|ring|ring-offset|outline|fill|stroke|from|via|to|shadow|decoration|caret|accent|divide|placeholder';

const PALETTE_PATTERN = new RegExp(
  `\\b(?:${PREFIXES})-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\\d{2,3}\\b`,
  'g',
);

// `text-[13px]` and `border-[1.5px]` are sizes, not colors, so only color syntax is matched.
const ARBITRARY_PATTERN = new RegExp(
  `(?:^|[\\s"'\`:])(?:${PREFIXES})-\\[(?:#|rgba?\\(|hsla?\\(|oklch\\(|color-mix\\(|var\\(--)[^\\]]*\\]`,
  'g',
);

module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Disallow palette and arbitrary color utilities; use semantic color tokens',
      recommended: true,
    },
    schema: [
      {
        type: 'object',
        properties: {
          arbitrary: { type: 'boolean', default: true },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      noHardcodedColor:
        'Avoid hardcoded color "{{value}}". Use a semantic token utility such as bg-raised, text-text-secondary, border-border, or bg-accent-soft.',
    },
  },

  create(context) {
    const checkArbitrary = context.options[0]?.arbitrary !== false;

    function report(node, pattern, value) {
      pattern.lastIndex = 0;
      let match;
      while ((match = pattern.exec(value)) !== null) {
        context.report({ node, messageId: 'noHardcodedColor', data: { value: match[0].trim() } });
      }
    }

    function check(node, value) {
      report(node, PALETTE_PATTERN, value);
      if (checkArbitrary) report(node, ARBITRARY_PATTERN, value);
    }

    return {
      Literal(node) {
        if (typeof node.value === 'string') check(node, node.value);
      },
      TemplateElement(node) {
        if (node.value?.raw) check(node, node.value.raw);
      },
    };
  },
};
