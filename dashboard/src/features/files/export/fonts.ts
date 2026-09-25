// The bundled faces, embedded as data URLs so an exported file looks the same
// on any computer. Each loads only when an export needs it (Latin subsets).

const face = (family: string, url: string, weight: string, style = 'normal') =>
  `@font-face{font-family:'${family}';src:url(${url}) format('woff2');font-weight:${weight};font-style:${style};font-display:block}`;

async function sans(): Promise<string> {
  const [normal, italic] = await Promise.all([
    import('@fontsource-variable/inter/files/inter-latin-wght-normal.woff2?inline'),
    import('@fontsource-variable/inter/files/inter-latin-wght-italic.woff2?inline'),
  ]);
  return face('Inter Variable', normal.default, '100 900') + face('Inter Variable', italic.default, '100 900', 'italic');
}

async function serif(): Promise<string> {
  const [regular, italic, medium, semibold] = await Promise.all([
    import('@fontsource/literata/files/literata-latin-400-normal.woff2?inline'),
    import('@fontsource/literata/files/literata-latin-400-italic.woff2?inline'),
    import('@fontsource/literata/files/literata-latin-500-normal.woff2?inline'),
    import('@fontsource/literata/files/literata-latin-600-normal.woff2?inline'),
  ]);
  return [
    face('Literata', regular.default, '400'),
    face('Literata', italic.default, '400', 'italic'),
    face('Literata', medium.default, '500'),
    face('Literata', semibold.default, '600'),
  ].join('');
}

async function mono(): Promise<string> {
  const file = await import('../../../../node_modules/non.geist/fonts/mono/GeistMono[wght].woff2?inline');
  return face('GeistMono-Variable', file.default, '100 900');
}

/** @font-face rules for the faces a document uses. */
export async function fontFaces({ serifBody, code }: { serifBody: boolean; code: boolean }): Promise<string> {
  const parts = await Promise.all([sans(), serifBody ? serif() : '', code ? mono() : '']);
  return parts.join('');
}
