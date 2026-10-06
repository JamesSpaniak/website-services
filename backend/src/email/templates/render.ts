import { readFileSync } from 'fs';
import { join } from 'path';
// CommonJS `export =` module and no esModuleInterop in tsconfig.
import MarkdownIt = require('markdown-it');

/**
 * Marketing email templates (launch plan Z5): markdown files in this folder
 * with a small front-matter block (`subject`, `preheader`) and `{{var}}`
 * placeholders. Rendered to HTML + plain text at send time and wrapped in the
 * shared layout, which always carries the unsubscribe link and the postal
 * address (CAN-SPAM). No visual editor by design.
 *
 * Raw HTML in markdown is NOT rendered (`html: false`), so admin-authored
 * broadcast bodies cannot inject markup.
 */

const md = new MarkdownIt({ html: false, linkify: true, breaks: false });

export const TEMPLATE_NAMES = [
  'waitlist-confirmation',
  'launch-announcement',
] as const;
export type TemplateName = (typeof TEMPLATE_NAMES)[number];

export interface ParsedTemplate {
  subject: string;
  preheader: string;
  body: string;
}

const cache = new Map<string, ParsedTemplate>();

export function parseTemplate(source: string): ParsedTemplate {
  const match = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(
    source.replace(/\r\n/g, '\n'),
  );
  const meta: Record<string, string> = {};
  let body = source;
  if (match) {
    for (const line of match[1].split('\n')) {
      const i = line.indexOf(':');
      if (i > 0) meta[line.slice(0, i).trim()] = line.slice(i + 1).trim();
    }
    body = match[2];
  }
  return {
    subject: meta.subject ?? '',
    preheader: meta.preheader ?? '',
    body: body.trim(),
  };
}

export function loadTemplate(name: TemplateName): ParsedTemplate {
  let tpl = cache.get(name);
  if (!tpl) {
    // Copied next to the compiled file by nest-cli `assets`.
    tpl = parseTemplate(readFileSync(join(__dirname, `${name}.md`), 'utf8'));
    cache.set(name, tpl);
  }
  return tpl;
}

/** Replace `{{key}}`; a placeholder without a value is a bug, so it throws. */
export function fillPlaceholders(
  text: string,
  vars: Record<string, string>,
): string {
  return text.replace(/\{\{\s*([a-z0-9_]+)\s*\}\}/gi, (_, key: string) => {
    if (!(key in vars)) throw new Error(`Missing template variable: ${key}`);
    return vars[key];
  });
}

const escapeHtml = (s: string) =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

export interface LayoutInput {
  bodyMarkdown: string;
  preheader?: string;
  unsubscribeUrl: string;
  postalAddress: string;
  siteUrl: string;
  /** Newsletter: web copy of this issue, shown as a small "View in browser" line. */
  viewInBrowserUrl?: string;
}

/** Markdown → HTML fragment with the same safe settings as email (raw HTML not rendered). */
export function renderMarkdown(markdown: string): string {
  return md.render(markdown);
}

/** Markdown body → full HTML document + plain-text alternative. */
export function renderEmail(input: LayoutInput): {
  html: string;
  text: string;
} {
  const content = md.render(input.bodyMarkdown);
  const unsub = escapeHtml(input.unsubscribeUrl);
  const address = escapeHtml(input.postalAddress);
  const site = escapeHtml(input.siteUrl);
  const preheader = input.preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(input.preheader)}</div>`
    : '';
  const viewInBrowser = input.viewInBrowserUrl
    ? `<div style="padding:0 4px 8px;font-size:12px;color:#737373;text-align:right"><a href="${escapeHtml(input.viewInBrowserUrl)}" style="color:#737373">View in browser</a></div>`
    : '';

  const html = `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Drone Edge</title></head>
<body style="margin:0;padding:0;background:#f4f4f2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#171717">
${preheader}
<div style="max-width:560px;margin:0 auto;padding:24px 16px">
${viewInBrowser}
  <div style="padding:0 4px 16px;font-weight:700;font-size:18px;letter-spacing:.02em;color:#4a6b2f">DRONE EDGE</div>
  <div style="background:#ffffff;border:1px solid #e5e5e5;border-radius:6px;padding:24px;font-size:15px;line-height:1.6">
    ${content.replace(/<a /g, '<a style="color:#4a6b2f;font-weight:600" ')}
  </div>
  <div style="padding:16px 4px;font-size:12px;line-height:1.5;color:#737373">
    You're receiving this because you signed up at <a href="${site}" style="color:#737373">thedroneedge.com</a>.
    <a href="${unsub}" style="color:#737373">Unsubscribe or change preferences</a>.<br>
    Drone Edge · ${address}
  </div>
</div>
</body>
</html>`;

  const text = [
    ...(input.viewInBrowserUrl
      ? [`View in browser: ${input.viewInBrowserUrl}`, '']
      : []),
    input.bodyMarkdown,
    '',
    '---',
    `You're receiving this because you signed up at ${input.siteUrl}.`,
    `Unsubscribe or change preferences: ${input.unsubscribeUrl}`,
    `Drone Edge · ${input.postalAddress}`,
  ].join('\n');

  return { html, text };
}
