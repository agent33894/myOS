/**
 * Rule: no-raw-controls
 *
 * Controls come from src/ui (Button, IconButton, Input, Textarea, Select,
 * Checkbox, Switch, …) so that focus, sizing, labels, and states stay
 * consistent. Reports JSX <button>, <input>, <textarea>, and <select> outside
 * src/ui/**.
 *
 * Allowed everywhere: `<input type="file">` and `<input type="color">`, which
 * are always visually hidden behind a ui control and have no styled equivalent.
 */

const CONTROLS = new Set(['button', 'input', 'textarea', 'select']);
const ALLOWED_INPUT_TYPES = new Set(['file', 'color']);

function isInsideUi(filename) {
  return /[\\/]src[\\/]ui[\\/]/.test(filename);
}

function inputType(node) {
  const attribute = node.attributes.find(
    (attr) => attr.type === 'JSXAttribute' && attr.name?.name === 'type',
  );
  return attribute?.value?.type === 'Literal' ? attribute.value.value : undefined;
}

module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Use src/ui controls instead of raw <button>, <input>, <textarea>, and <select>',
      recommended: true,
    },
    schema: [],
    messages: {
      rawControl: 'Use the src/ui primitive instead of a raw <{{name}}> ({{suggestion}}).',
    },
  },

  create(context) {
    if (isInsideUi(context.filename ?? context.getFilename())) return {};

    const suggestions = {
      button: 'Button, IconButton',
      input: 'Input, Checkbox, Switch',
      textarea: 'Textarea',
      select: 'Select',
    };

    return {
      JSXOpeningElement(node) {
        if (node.name.type !== 'JSXIdentifier' || !CONTROLS.has(node.name.name)) return;
        if (node.name.name === 'input' && ALLOWED_INPUT_TYPES.has(inputType(node))) return;
        context.report({
          node,
          messageId: 'rawControl',
          data: { name: node.name.name, suggestion: suggestions[node.name.name] },
        });
      },
    };
  },
};
