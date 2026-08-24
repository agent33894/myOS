let mermaidPromise: Promise<typeof import('mermaid')> | null = null;
let lastTheme: string | null = null;

type MermaidTheme = 'dark' | 'corporate' | 'bold' | string;

async function loadMermaid() {
  mermaidPromise ||= import('mermaid');
  return mermaidPromise;
}

function getMermaidConfig(theme: MermaidTheme) {
  const baseTheme: 'default' | 'dark' = theme === 'corporate' ? 'default' : 'dark';
  const themeVariables: Record<string, string> = {
    fontFamily: 'var(--type-sans)',
    fontSize: '16px',
  };

  if (theme === 'bold') {
    themeVariables.primaryColor = '#ec4899';
    themeVariables.primaryBorderColor = '#f472b6';
    themeVariables.primaryTextColor = '#f9fafb';
    themeVariables.lineColor = '#f472b6';
    themeVariables.secondaryColor = '#111827';
  }

  return {
    startOnLoad: false,
    securityLevel: 'strict' as const,
    theme: baseTheme,
    themeVariables,
  };
}

export async function configureMermaid(theme: MermaidTheme) {
  const mod = await loadMermaid();
  const mermaid = mod.default ?? mod;
  if (lastTheme !== theme) {
    mermaid.initialize(getMermaidConfig(theme));
    lastTheme = theme;
  }
  return mermaid;
}
