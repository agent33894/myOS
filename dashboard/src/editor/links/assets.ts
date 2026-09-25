const ABSOLUTE_URL_PATTERN = /^(myos-next|file|https?):\/\//i;
const NON_FILE_SCHEME_PATTERN = /^(mailto|tel|data):/i;

/** Attachment paths (`assets/…`) load through the app's `myos-next://` protocol. */
export function resolveAssetUrl(
  value: string | undefined | null
): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  if (!value) {
    return value;
  }

  if (
    ABSOLUTE_URL_PATTERN.test(value) ||
    NON_FILE_SCHEME_PATTERN.test(value) ||
    value.startsWith('#')
  ) {
    return value;
  }

  const cleaned = value.trim().replace(/^\.\//, '').replace(/^\/+/, '');
  if (!cleaned.startsWith('assets/')) {
    return value;
  }

  return `myos-next://${encodeURI(cleaned)}`;
}
