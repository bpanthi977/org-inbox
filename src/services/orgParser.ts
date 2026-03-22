import {Platform} from 'react-native';
import {readFile as safReadFile} from 'react-native-saf-x';
import {readFile as rnfsReadFile} from '@dr.pogodin/react-native-fs';
import {Settings} from '../storage/settings';
import type {ContentType} from '../types';

const ORG_FILENAME = 'inbox.org';

export interface ParsedEntry {
  heading: string;
  created: string | undefined; // raw org date string e.g. "[2026-03-21 Sat 14:30]"
  body: string;
  contentType: ContentType;
}

// ── File reading ─────────────────────────────────────────────────────────────

async function readOrgFile(): Promise<string | null> {
  try {
    if (Platform.OS === 'android') {
      const treeUri = Settings.getAndroidSafUri();
      if (!treeUri) {return null;}
      return await safReadFile(`${treeUri}/${ORG_FILENAME}`, {encoding: 'utf8'}) as string;
    } else {
      const folderUri = Settings.getIosFolderUri();
      if (!folderUri) {return null;}
      const folderPath = folderUri.replace(/^file:\/\//, '');
      return await rnfsReadFile(`${folderPath}/${ORG_FILENAME}`, 'utf8');
    }
  } catch (e: any) {
    // File not found or unreadable — treat as empty inbox
    const msg: string = e?.message ?? '';
    if (
      msg.includes('ENOENT') ||
      msg.includes('No such file') ||
      msg.includes('not found') ||
      msg.includes('exist')
    ) {
      return null;
    }
    throw e;
  }
}

// ── Parsing ───────────────────────────────────────────────────────────────────

function detectContentType(body: string): ContentType {
  if (/\[\[https?:/.test(body)) {return 'url';}
  const fileMatch = body.match(/\[\[file:attachments\/([^\]]+)\]/);
  if (fileMatch) {
    const name = fileMatch[1].toLowerCase();
    if (/\.(jpg|jpeg|png|gif|webp)(\][^]|$)/.test(name)) {return 'image';}
    if (/\.(mp4|mov|avi)(\][^]|$)/.test(name)) {return 'video';}
    if (/\.(mp3|m4a|wav|ogg)(\][^]|$)/.test(name)) {return 'audio';}
    return 'file';
  }
  return 'text';
}

/**
 * Extract `:CREATED: [...]` value from the lines of an entry section.
 * Returns the raw bracketed date string, or undefined if absent.
 */
function extractCreated(lines: string[]): string | undefined {
  for (const line of lines) {
    const m = line.match(/:CREATED:\s*(\[[^\]]+\])/);
    if (m) {return m[1];}
  }
  return undefined;
}

/**
 * Extract body text from entry lines (everything after :END:, or after the
 * heading line if there is no properties drawer).
 */
function extractBody(lines: string[]): string {
  // lines[0] is the heading line; skip it
  const rest = lines.slice(1);

  // Find :END: (case-insensitive to handle external edits)
  const endIdx = rest.findIndex(l => /^\s*:END:\s*$/.test(l));
  if (endIdx !== -1) {
    return rest.slice(endIdx + 1).join('\n').trim();
  }

  // No properties drawer — skip any lines that look like property-drawer lines
  const bodyLines = rest.filter(
    l => !/^\s*:(PROPERTIES|END|[A-Z_]+):/.test(l),
  );
  return bodyLines.join('\n').trim();
}

function parseOrgText(text: string): ParsedEntry[] {
  const lines = text.split('\n');
  const entries: ParsedEntry[] = [];

  // Collect indices of top-level headings (lines matching /^\* /)
  const headingIndices: number[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (/^\* /.test(lines[i])) {
      headingIndices.push(i);
    }
  }

  for (let h = 0; h < headingIndices.length; h++) {
    const start = headingIndices[h];
    const end = h + 1 < headingIndices.length ? headingIndices[h + 1] : lines.length;
    const section = lines.slice(start, end);

    const headingLine = section[0];
    const heading = headingLine.replace(/^\* /, '').trim();
    if (!heading) {continue;} // skip malformed entries gracefully

    const created = extractCreated(section);
    const body = extractBody(section);
    const contentType = detectContentType(body);

    entries.push({heading, created, body, contentType});
  }

  // Newest first (entries are appended chronologically)
  return entries.reverse();
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Reads and parses inbox.org, returning entries sorted newest-first.
 * Returns an empty array if the file does not exist yet.
 */
export async function loadInboxEntries(): Promise<ParsedEntry[]> {
  const text = await readOrgFile();
  if (!text) {return [];}
  return parseOrgText(text);
}

// ── Date formatting ───────────────────────────────────────────────────────────

const MONTH_ABBR = [
  'Jan','Feb','Mar','Apr','May','Jun',
  'Jul','Aug','Sep','Oct','Nov','Dec',
];

/**
 * Formats a raw org date string "[YYYY-MM-DD Day HH:MM]" into
 * a human-readable string like "21 Mar 2026  14:30".
 * Returns the original string on parse failure.
 */
export function formatOrgDateForDisplay(orgDate: string | undefined): string {
  if (!orgDate) {return '';}
  const m = orgDate.match(/\[(\d{4})-(\d{2})-(\d{2})\s+\w+\s+(\d{2}:\d{2})\]/);
  if (!m) {return orgDate;}
  const [, yyyy, mm, dd, time] = m;
  const month = MONTH_ABBR[parseInt(mm, 10) - 1] ?? mm;
  return `${parseInt(dd, 10)} ${month} ${yyyy}  ${time}`;
}
