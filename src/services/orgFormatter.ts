import type {SharedItem} from '../types';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** Formats a Date as an org inactive timestamp: [2024-01-15 Mon 10:30] */
export function formatOrgDate(date: Date): string {
  const day = DAY_NAMES[date.getDay()];
  return `[${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${day} ${pad(date.getHours())}:${pad(date.getMinutes())}]`;
}

/** Derives the org heading from the shared item. */
function deriveHeading(item: SharedItem): string {
  switch (item.contentType) {
    case 'url': {
      if (item.pageTitle) {
        return item.pageTitle.trim();
      }
      if (item.weblink) {
        try {
          return new URL(item.weblink).hostname;
        } catch {
          return item.weblink;
        }
      }
      return 'Untitled Link';
    }
    case 'text': {
      const firstLine = (item.text ?? '').split('\n')[0].trim();
      if (firstLine.length === 0) {
        return 'Note';
      }
      return firstLine.length > 60
        ? firstLine.slice(0, 57) + '…'
        : firstLine;
    }
    default:
      return item.fileName ?? 'Untitled';
  }
}

/** Formats the body of the org entry (below the properties drawer). */
function formatBody(item: SharedItem, attachmentRelPath?: string): string {
  switch (item.contentType) {
    case 'url': {
      const url = item.weblink ?? '';
      const title = item.pageTitle ?? url;
			if (item.pageTitle) {
				return `[[${url}][${title}]]`;
			} else {
				return `[[${url}]]`;
			}
    }
    case 'text':
      return item.text ?? '';
    default: {
      // image, video, audio, file
      const path = attachmentRelPath ?? item.fileName ?? 'unknown';
      return `[[file:${path}]]`;
    }
  }
}

/**
 * Formats a SharedItem into an org-mode capture entry string.
 *
 * Output format:
 *   * Heading
 *   :PROPERTIES:
 *   :CREATED: [YYYY-MM-DD Day HH:MM]
 *   :END:
 *   <body>
 *		 
 *   <optional note>
 *
 */
export function formatOrgEntry(
  item: SharedItem,
  note: string,
  attachmentRelPath?: string,
  now: Date = new Date(),
): string {
  const heading = deriveHeading(item);
  const body = formatBody(item, attachmentRelPath);
  const created = formatOrgDate(now);

  // Indent body lines with 2 spaces
  const indentedBody = body
    .split('\n')
    .map(line => `  ${line}`)
    .join('\n');

  const lines: string[] = [
    `* ${heading}`,
    ':PROPERTIES:',
    `:CREATED: ${created}`,
    ':END:',
    indentedBody,
  ];

  const trimmedNote = note.trim();
	if (trimmedNote) {
		lines.push('');
		lines.push(trimmedNote);
	}

  // Trailing blank line to separate entries
  lines.push('');
  lines.push('');

  return lines.join('\n');
}
