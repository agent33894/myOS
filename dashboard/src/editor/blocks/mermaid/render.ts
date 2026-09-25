// Mermaid needs literal colors, so the diagram theme is computed from the live
// design tokens (both themes) plus the current accent each time it renders.

const channels = (hex: string) => {
  const value = Number.parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
};

/** `amount` of `a` over `b`, as hex. */
function mix(a: string, b: string, amount: number): string {
  const [ca, cb] = [channels(a), channels(b)];
  return `#${ca.map((channel, index) => Math.round(channel * amount + cb[index] * (1 - amount)).toString(16).padStart(2, '0')).join('')}`;
}

/**
 * A CSS color as `#rrggbb`. Tokens can be `color-mix(…)` expressions that
 * Mermaid cannot read, so the browser computes the color and one painted pixel
 * gives it back in sRGB.
 */
function resolveColor(css: string): string {
  const probe = document.createElement('span');
  probe.style.color = css;
  document.body.append(probe);
  const computed = getComputedStyle(probe).color;
  probe.remove();
  const context = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
  if (!context) return '#000000';
  context.fillStyle = computed;
  context.fillRect(0, 0, 1, 1);
  const [r, g, b] = context.getImageData(0, 0, 1, 1).data;
  return `#${[r, g, b].map((channel) => channel.toString(16).padStart(2, '0')).join('')}`;
}

function themeVariables(accentColor: string, dark: boolean) {
  const style = getComputedStyle(document.documentElement);
  const token = (name: string) => resolveColor(`var(--${name})`);
  const accent = resolveColor(accentColor);
  const [canvas, raised, sunken, text, secondary] = ['canvas', 'raised', 'sunken', 'text', 'text-secondary'].map(token);
  const node = mix(accent, raised, dark ? 0.22 : 0.1);
  const border = mix(accent, raised, 0.5);
  return {
    darkMode: dark,
    background: canvas,
    fontFamily: style.getPropertyValue('--font-sans').trim(),
    fontSize: '14px',
    primaryColor: node,
    primaryBorderColor: border,
    primaryTextColor: text,
    secondaryColor: sunken,
    secondaryBorderColor: mix(text, sunken, 0.2),
    secondaryTextColor: text,
    tertiaryColor: raised,
    tertiaryBorderColor: mix(text, raised, 0.15),
    tertiaryTextColor: text,
    mainBkg: node,
    nodeBorder: border,
    nodeTextColor: text,
    textColor: text,
    lineColor: secondary,
    clusterBkg: sunken,
    clusterBorder: mix(text, sunken, 0.15),
    edgeLabelBackground: canvas,
    titleColor: text,
    noteBkgColor: sunken,
    noteBorderColor: mix(text, sunken, 0.2),
    noteTextColor: text,
    actorBkg: node,
    actorBorder: border,
    actorTextColor: text,
    signalColor: secondary,
    signalTextColor: text,
  };
}

let sequence = 0;

/** Render Mermaid source to an SVG string; throws with Mermaid's message on a syntax error. */
export async function renderDiagram(source: string, accent: string, dark: boolean): Promise<string> {
  const { default: mermaid } = await import('mermaid');
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: 'strict',
    theme: 'base',
    themeVariables: themeVariables(accent, dark),
  });
  sequence += 1;
  const id = `diagram-${sequence}`;
  try {
    const { svg } = await mermaid.render(id, source);
    return svg;
  } finally {
    // Mermaid leaves its scratch element behind when parsing fails.
    document.getElementById(`d${id}`)?.remove();
  }
}
