// Capture helpers shared by Quick Capture and `myos capture` so both file
// identical Unfiled notes.

export function buildSuggestedTitleFromContent(text: string): string {
  const firstLine =
    text
      .replace(/^(?:I need to|Remember to|Don't forget to|Make sure to)\s*/i, '')
      .replace(/^(?:We decided(?: to)?|We chose(?: to)?)\s*/i, '')
      .replace(/#\w+/g, '')
      .split('\n')
      .find((line) => line.trim().length > 0)
      ?.trim() || '';

  const clean = firstLine
    .replace(/[.!?]+$/, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);

  if (!clean) {
    return 'Untitled capture';
  }

  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

export function extractHashTags(text: string): string[] {
  return (text.match(/#(\w+)/g) ?? []).map((tag) => tag.slice(1).toLowerCase());
}
