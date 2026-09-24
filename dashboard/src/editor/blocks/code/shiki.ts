import type { HighlighterCore, ThemedToken } from 'shiki/core';

// Shiki loads on the first highlighted code block, and each grammar loads on
// first use, so documents without code never pay for it. Colors come from CSS
// variables (`--code-*`, defined in _prose.css) so both themes follow tokens.

const THEME = 'myos';

let highlighter: HighlighterCore | null = null;
let starting: Promise<HighlighterCore> | null = null;
const loading = new Map<string, Promise<boolean>>();
const unavailable = new Set<string>();

function start(): Promise<HighlighterCore> {
  starting ??= Promise.all([import('shiki/core'), import('shiki/engine/javascript')]).then(
    async ([{ createHighlighterCore, createCssVariablesTheme }, { createJavaScriptRegexEngine }]) => {
      highlighter = await createHighlighterCore({
        themes: [createCssVariablesTheme({ name: THEME, variablePrefix: '--code-' })],
        langs: [],
        engine: createJavaScriptRegexEngine({ forgiving: true }),
      });
      return highlighter;
    },
  );
  return starting;
}

/** Load the grammar for `language`; resolves false when Shiki has none. */
export function loadLanguage(language: string): Promise<boolean> {
  const id = language.toLowerCase();
  if (unavailable.has(id)) return Promise.resolve(false);
  let pending = loading.get(id);
  if (!pending) {
    pending = Promise.all([start(), import('shiki/langs')])
      .then(async ([core, { bundledLanguages }]) => {
        const grammar = bundledLanguages[id as keyof typeof bundledLanguages];
        if (!grammar) return false;
        await core.loadLanguage(grammar);
        return true;
      })
      .catch(() => false)
      .then((ok) => {
        if (!ok) unavailable.add(id);
        return ok;
      });
    loading.set(id, pending);
  }
  return pending;
}

/** Tokens for `code`, or null until the grammar is ready (call `loadLanguage` first). */
export function tokenize(code: string, language: string): ThemedToken[][] | null {
  const id = language.toLowerCase();
  if (!highlighter || !highlighter.getLoadedLanguages().includes(id)) return null;
  try {
    return highlighter.codeToTokensBase(code, { lang: id, theme: THEME });
  } catch {
    return null;
  }
}
