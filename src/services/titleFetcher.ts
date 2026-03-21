const TIMEOUT_MS = 3000;
const TITLE_REGEX = /<title[^>]*>([^<]*)<\/title>/i;

/**
 * Fetches the HTML <title> from a URL.
 * Resolves to the title string, or undefined if unavailable within 3s.
 * Never throws.
 */
export async function fetchPageTitle(url: string): Promise<string | undefined> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: 'text/html',
        'User-Agent': 'org-inbox/1.0 (link preview)',
      },
    });

    const html = await response.text();
    const match = TITLE_REGEX.exec(html);
    if (!match) {return undefined;}
    return decodeHtmlEntities(match[1].trim());
  } catch {
    return undefined;
  } finally {
    clearTimeout(timer);
  }
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&[a-z]+;/gi, '');
}
