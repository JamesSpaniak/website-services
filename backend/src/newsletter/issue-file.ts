import { BadRequestException } from '@nestjs/common';
import { LEAD_INTERESTS, LeadInterest } from '../leads/types/lead.dto';

/**
 * Field Notes issue file (assets/newsletter/YYYY-MM.md), uploaded whole in
 * Admin → Newsletter:
 *
 *   ---
 *   slug: 2026-11
 *   subject: Field Notes · November 2026 · Who gets to build drones?
 *   preheader: One line shown after the subject in the inbox
 *   lists: newsletter
 *   correction: (only when re-uploading after send — shown on the web page)
 *   ---
 *   <!-- editorial notes: stripped, never sent -->
 *   ...markdown body...
 *   <!-- segment --> ...sales box, email only... <!-- /segment -->
 */
export interface ParsedIssue {
  slug: string;
  subject: string;
  preheader: string | null;
  lists: LeadInterest[];
  correction: string | null;
  /** Raw body: comments and segment markers kept, so a re-upload round-trips. */
  body: string;
}

const SLUG_RE = /^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$/;

export function parseIssueFile(source: string): ParsedIssue {
  const text = source.replace(/^﻿/, '').replace(/\r\n/g, '\n');
  const match = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(text);
  if (!match) {
    throw new BadRequestException(
      'The file must start with a --- front-matter block (slug, subject, …).',
    );
  }
  const meta: Record<string, string> = {};
  for (const line of match[1].split('\n')) {
    const i = line.indexOf(':');
    if (i > 0)
      meta[line.slice(0, i).trim().toLowerCase()] = line.slice(i + 1).trim();
  }

  const slug = (meta.slug ?? '').toLowerCase();
  if (!SLUG_RE.test(slug)) {
    throw new BadRequestException(
      'slug: lowercase letters, digits and hyphens, 3–64 characters (e.g. 2026-11).',
    );
  }
  const subject = meta.subject ?? '';
  if (subject.length < 3 || subject.length > 150) {
    throw new BadRequestException('subject: 3–150 characters.');
  }
  const lists = (meta.lists || 'newsletter')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const bad = lists.filter(
    (l) => !(LEAD_INTERESTS as readonly string[]).includes(l),
  );
  if (bad.length || !lists.length) {
    throw new BadRequestException(
      `lists: one or more of ${LEAD_INTERESTS.join(', ')}.`,
    );
  }
  const body = match[2].trim();
  if (emailBody(body).length < 20) {
    throw new BadRequestException('The issue body is empty.');
  }
  return {
    slug,
    subject,
    preheader: meta.preheader ? meta.preheader.slice(0, 200) : null,
    lists: [...new Set(lists)] as LeadInterest[],
    correction: meta.correction ? meta.correction.slice(0, 300) : null,
    body,
  };
}

const COMMENT_RE = /<!--(?!\s*\/?segment\s*-->)[\s\S]*?-->/g;
const SEGMENT_RE = /<!--\s*segment\s*-->([\s\S]*?)<!--\s*\/segment\s*-->/g;

const tidy = (s: string) => s.replace(/\n{3,}/g, '\n\n').trim();

/** What subscribers get: notes removed, segment block kept (markers removed). */
export function emailBody(body: string): string {
  return tidy(body.replace(COMMENT_RE, '').replace(SEGMENT_RE, '$1'));
}

/** Web archive: notes and the segment (sales) block removed — teachers share it with classes. */
export function webBody(body: string): string {
  return tidy(body.replace(COMMENT_RE, '').replace(SEGMENT_RE, ''));
}

/** Things worth a look before sending; never blocks an upload. */
export function issueWarnings(issue: ParsedIssue, siteUrl: string): string[] {
  const body = emailBody(issue.body);
  const warnings: string[] = [];
  const placeholders = body.match(/<[A-Za-z][^<>\n]{0,40}>/g);
  if (placeholders?.length) {
    warnings.push(
      `Unfilled template placeholders: ${[...new Set(placeholders)].slice(0, 5).join(', ')}`,
    );
  }
  if (/nl-YYYY-MM/.test(body)) {
    warnings.push('UTM campaign still says nl-YYYY-MM.');
  }
  if (/\{\{(?!\s*site_url\s*\}\})[^}]*\}\}/.test(body)) {
    warnings.push(
      'Only {{site_url}} is filled in; other {{…}} will show as typed.',
    );
  }
  const words = body.split(/\s+/).filter(Boolean).length;
  if (words < 300 || words > 1100) {
    warnings.push(`${words} words (plan: 600–900).`);
  }
  const links = body.match(/\]\(([^)]+)\)/g) ?? [];
  const untagged = links.filter(
    (l) =>
      (l.includes(siteUrl) || l.includes('{{site_url}}')) &&
      !l.includes('utm_source='),
  );
  if (untagged.length) {
    warnings.push(`${untagged.length} site link(s) without utm_source.`);
  }
  if (!/<!--\s*segment\s*-->/.test(issue.body)) {
    warnings.push(
      'No <!-- segment --> block: the web copy will include any sales box.',
    );
  }
  return warnings;
}
