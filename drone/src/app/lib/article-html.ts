/**
 * Normalizes article HTML saved from the admin editor when users paste from JSON
 * exports or other tools. Fixes literal "\\n" on screen, stray JSON escapes, and
 * optional whole-JSON pastes that include a `body` / `body_html` field.
 */
export function prepareArticleBodyHtml(raw: string): string {
  if (!raw) return '';

  let s = raw.trim();
  s = extractHtmlFromAccidentalJsonPaste(s);

  // Entity-encoded HTML (e.g. &lt;p&gt;...) must decode before inject
  s = decodeHtmlEntitiesIfNeeded(s);

  // Literal backslash-n / backslash-r from JSON-ish pastes (visible as \n in the UI)
  s = s.replace(/\\n/g, '\n');
  s = s.replace(/\\r/g, '');
  s = s.replace(/\\t/g, '\t');
  s = s.replace(/\\"/g, '"');

  return s;
}

function extractHtmlFromAccidentalJsonPaste(s: string): string {
  if (!s.startsWith('{')) return s;
  try {
    const o = JSON.parse(s) as Record<string, unknown>;
    const html =
      (typeof o.body_html === 'string' && o.body_html) ||
      (typeof o.body === 'string' && o.body) ||
      (typeof o.html === 'string' && o.html);
    if (typeof html === 'string' && html.includes('<')) return html;
  } catch {
    /* not JSON */
  }
  return s;
}

function decodeHtmlEntitiesIfNeeded(s: string): string {
  const t = s.trimStart();
  if (!t.includes('&lt;')) return s;
  if (t.startsWith('<')) return s;
  if (typeof document === 'undefined') return s;
  const ta = document.createElement('textarea');
  ta.innerHTML = s;
  const decoded = ta.value;
  if (decoded.includes('<') && decoded.length > 0) return decoded;
  return s;
}
