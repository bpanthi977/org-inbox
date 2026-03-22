import React, {useMemo} from 'react';
import {
  View,
  Text,
  Image,
  Linking,
  StyleSheet,
} from 'react-native';

// ── Types ─────────────────────────────────────────────────────────────────────

type Span =
  | {kind: 'text'; value: string}
  | {kind: 'url-link'; href: string; label: string};

type TableRow =
  | {kind: 'header'; cells: string[]}
  | {kind: 'data'; cells: string[]}
  | {kind: 'separator'};

type Block =
  | {kind: 'paragraph'; spans: Span[]}
  | {kind: 'unordered-list'; items: Span[][]}
  | {kind: 'ordered-list'; items: Span[][]}
  | {kind: 'table'; rows: TableRow[]}
  | {kind: 'image'; filename: string}
  | {kind: 'file-link'; filename: string; label?: string};

// ── Image path construction ───────────────────────────────────────────────────

function buildImageUri(basePath: string, filename: string): string {
  if (basePath.startsWith('content://')) {
    // basePath is a SAF tree URI: content://authority/tree/{treeDocId}
    // SAF-X resolves files using DocumentsContract.buildDocumentUriUsingTree which
    // produces: content://authority/tree/{treeDocId}/document/{docId}
    // For ExternalStorageProvider, docId = treeDocId/subpath
    const treeDocIdMatch = basePath.match(/\/tree\/(.+)$/);
    if (treeDocIdMatch) {
      const treeDocId = decodeURIComponent(treeDocIdMatch[1]); // e.g. "primary:OrgFolder"
      const docId = encodeURIComponent(`${treeDocId}/attachments/${filename}`);
      return `${basePath}/document/${docId}`;
    }
    return `${basePath}/attachments/${filename}`;
  }
  // iOS bare POSIX path (file:// prefix stripped by caller)
  return `file://${basePath}/attachments/${filename}`;
}

// ── Inline parsing ────────────────────────────────────────────────────────────

// Matches [[URL]] or [[URL][LABEL]] where LABEL may contain [...] pairs.
// Label pattern (?:[^\]]|\][^\]])* matches any char that's not ], or a ]
// followed by a non-] char — this allows e.g. "[id] Title" in the label
// without consuming the closing ]].
const LINK_RE = /\[\[([^\]]+)\](?:\[((?:[^\]]|\][^\]])*)\])?\]/g;

function parseSpans(text: string): Span[] {
  const spans: Span[] = [];
  let lastIndex = 0;
  LINK_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = LINK_RE.exec(text)) !== null) {
    if (match.index > lastIndex) {
      spans.push({kind: 'text', value: text.slice(lastIndex, match.index)});
    }
    const href = match[1];
    const label = match[2] ?? href;
    if (/^https?:\/\//.test(href)) {
      spans.push({kind: 'url-link', href, label});
    } else {
      // file: links inline, org id: links, etc. — show as plain text
      spans.push({kind: 'text', value: label});
    }
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    spans.push({kind: 'text', value: text.slice(lastIndex)});
  }
  return spans;
}

// ── Block-level parsing ───────────────────────────────────────────────────────

const IMAGE_EXT_RE = /\.(jpg|jpeg|png|gif|webp)$/i;
// Matches a whole line that is solely an org file link: [[file:attachments/name]]
// or [[file:attachments/name][label]]
const FILE_LINK_LINE_RE = /^\[\[file:attachments\/([^\]]+)\](?:\[([^\]]*)\])?\]$/;

type ListRun = {ordered: boolean; lines: string[]};

function flushParagraph(lines: string[]): Block | null {
  const text = lines.join('\n');
  if (!text.trim()) {return null;}
  return {kind: 'paragraph', spans: parseSpans(text)};
}

function flushList(run: ListRun): Block | null {
  if (run.lines.length === 0) {return null;}
  const prefix = run.ordered ? /^\d+[.)]\s+/ : /^[-+]\s+/;
  const items = run.lines.map(l => parseSpans(l.replace(prefix, '')));
  return {kind: run.ordered ? 'ordered-list' : 'unordered-list', items};
}

function isSeparatorLine(cells: string[]): boolean {
  // Org separator rows look like |---+---|: each cell (after splitting on |)
  // contains only hyphens and pluses, e.g. "-------" or "---+---" as a whole cell.
  return (
    cells.length > 0 &&
    cells.every(c => /^[-+]*$/.test(c)) &&
    cells.some(c => c.includes('-'))
  );
}

function flushTable(lines: string[]): Block | null {
  const tableRows: TableRow[] = [];
  // Cells accumulated since the last separator (or start), flushed on separator
  const pending: string[][] = [];
  let seenFirstSeparator = false;

  for (const line of lines) {
    const cells = line.split('|').slice(1, -1).map(c => c.trim());
    if (cells.length === 0) {continue;}

    if (isSeparatorLine(cells)) {
      if (!seenFirstSeparator) {
        // First separator: flush pending rows as header rows, omit the separator itself
        seenFirstSeparator = true;
        for (const c of pending) {tableRows.push({kind: 'header', cells: c});}
      } else {
        // Mid-table separator: flush pending as data, then add a separator marker
        for (const c of pending) {tableRows.push({kind: 'data', cells: c});}
        tableRows.push({kind: 'separator'});
      }
      pending.length = 0;
    } else {
      pending.push(cells);
    }
  }

  // Flush any remaining rows as data
  for (const c of pending) {tableRows.push({kind: 'data', cells: c});}

  if (tableRows.length === 0) {return null;}
  return {kind: 'table', rows: tableRows};
}

function parseBlocks(body: string): Block[] {
  const lines = body.split('\n');
  const blocks: Block[] = [];

  let paraLines: string[] = [];
  let listRun: ListRun | null = null;
  let tableLines: string[] = [];

  function flushAll() {
    if (tableLines.length > 0) {
      const b = flushTable(tableLines);
      if (b) {blocks.push(b);}
      tableLines = [];
    }
    if (listRun) {
      const b = flushList(listRun);
      if (b) {blocks.push(b);}
      listRun = null;
    }
    if (paraLines.length > 0) {
      const b = flushParagraph(paraLines);
      if (b) {blocks.push(b);}
      paraLines = [];
    }
  }

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    const trimmed = line.trim();

    // Blank line → flush paragraph accumulator (lists and tables continue)
    if (trimmed === '') {
      if (paraLines.length > 0) {
        const b = flushParagraph(paraLines);
        if (b) {blocks.push(b);}
        paraLines = [];
      }
      continue;
    }

    // Table line
    if (trimmed.startsWith('|')) {
      if (listRun) {const b = flushList(listRun); if (b) {blocks.push(b);} listRun = null;}
      if (paraLines.length > 0) {const b = flushParagraph(paraLines); if (b) {blocks.push(b);} paraLines = [];}
      tableLines.push(trimmed);
      continue;
    }

    // Not a table line — flush any pending table
    if (tableLines.length > 0) {
      const b = flushTable(tableLines);
      if (b) {blocks.push(b);}
      tableLines = [];
    }

    // Unordered list item
    if (/^[-+] /.test(trimmed)) {
      if (paraLines.length > 0) {const b = flushParagraph(paraLines); if (b) {blocks.push(b);} paraLines = [];}
      if (listRun && listRun.ordered) {const b = flushList(listRun); if (b) {blocks.push(b);} listRun = null;}
      if (!listRun) {listRun = {ordered: false, lines: []};}
      listRun.lines.push(trimmed);
      continue;
    }

    // Ordered list item
    if (/^\d+[.)]\s/.test(trimmed)) {
      if (paraLines.length > 0) {const b = flushParagraph(paraLines); if (b) {blocks.push(b);} paraLines = [];}
      if (listRun && !listRun.ordered) {const b = flushList(listRun); if (b) {blocks.push(b);} listRun = null;}
      if (!listRun) {listRun = {ordered: true, lines: []};}
      listRun.lines.push(trimmed);
      continue;
    }

    // Flush list if switching away
    if (listRun) {const b = flushList(listRun); if (b) {blocks.push(b);} listRun = null;}

    // Standalone file link line
    const fileMatch = trimmed.match(FILE_LINK_LINE_RE);
    if (fileMatch) {
      if (paraLines.length > 0) {const b = flushParagraph(paraLines); if (b) {blocks.push(b);} paraLines = [];}
      const filename = fileMatch[1];
      const label = fileMatch[2];
      if (IMAGE_EXT_RE.test(filename)) {
        blocks.push({kind: 'image', filename});
      } else {
        blocks.push({kind: 'file-link', filename, label});
      }
      continue;
    }

    // Plain paragraph line
    paraLines.push(line);
  }

  flushAll();
  return blocks;
}

// ── Rendering helpers ─────────────────────────────────────────────────────────

function renderSpans(spans: Span[]): React.ReactNode[] {
  return spans.map((span, i) => {
    if (span.kind === 'url-link') {
      return (
        <Text
          key={i}
          style={styles.link}
          onPress={() => Linking.openURL(span.href)}>
          {span.label}
        </Text>
      );
    }
    return <Text key={i}>{span.value}</Text>;
  });
}

function ImageBlock({
  filename,
  basePath,
}: {
  filename: string;
  basePath: string | undefined;
}): React.JSX.Element {
  if (!basePath) {
    return <Text style={styles.fileLinkText}>🏞 {filename}</Text>;
  }

  return (
    <Image
      source={{uri: buildImageUri(basePath, filename)}}
      style={styles.image}
      resizeMode="contain"
    />
  );
}

function TableBlock({rows}: {rows: TableRow[]}): React.JSX.Element {
  const dataRows = rows.filter(r => r.kind !== 'separator') as Array<{kind: 'header' | 'data'; cells: string[]}>;
  const colCount = dataRows.length > 0 ? Math.max(...dataRows.map(r => r.cells.length)) : 0;
  if (colCount === 0) {return <View />;}

  return (
    <View style={styles.table}>
      {rows.map((row, ri) => {
        if (row.kind === 'separator') {
          return <View key={ri} style={styles.tableSeparator} />;
        }
        const isHeader = row.kind === 'header';
        return (
          <View key={ri} style={[styles.tableRow, isHeader && styles.tableHeaderRow]}>
            {Array.from({length: colCount}).map((_, ci) => (
              <View key={ci} style={styles.tableCell}>
                <Text style={[styles.tableCellText, isHeader && styles.tableHeaderText]}>
                  {row.cells[ci] ?? ''}
                </Text>
              </View>
            ))}
          </View>
        );
      })}
    </View>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  body: string;
  attachmentsBasePath?: string;
}

export function OrgBodyRenderer({body, attachmentsBasePath}: Props): React.JSX.Element {
  const blocks = useMemo(() => {
    try {
      return parseBlocks(body.trim());
    } catch {
      return [{kind: 'paragraph' as const, spans: [{kind: 'text' as const, value: body}]}];
    }
  }, [body]);

  return (
    <View>
      {blocks.map((block, i) => {
        switch (block.kind) {
          case 'paragraph':
            return (
              <Text key={i} style={styles.paragraph}>
                {renderSpans(block.spans)}
              </Text>
            );

          case 'unordered-list':
            return (
              <View key={i} style={styles.list}>
                {block.items.map((spans, j) => (
                  <View key={j} style={styles.listItem}>
                    <Text style={styles.bullet}>•</Text>
                    <Text style={styles.listItemText}>{renderSpans(spans)}</Text>
                  </View>
                ))}
              </View>
            );

          case 'ordered-list':
            return (
              <View key={i} style={styles.list}>
                {block.items.map((spans, j) => (
                  <View key={j} style={styles.listItem}>
                    <Text style={styles.bullet}>{j + 1}.</Text>
                    <Text style={styles.listItemText}>{renderSpans(spans)}</Text>
                  </View>
                ))}
              </View>
            );

          case 'table':
            return <TableBlock key={i} rows={block.rows} />;

          case 'image':
            return (
              <ImageBlock key={i} filename={block.filename} basePath={attachmentsBasePath} />
            );

          case 'file-link':
            return (
              <Text key={i} style={styles.fileLinkText}>
                📎 {block.label ?? block.filename}
              </Text>
            );

          default:
            return null;
        }
      })}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  paragraph: {
    fontSize: 13,
    color: '#3C3C43',
    lineHeight: 18,
    marginBottom: 4,
  },
  link: {
    color: '#007AFF',
  },
  list: {
    marginBottom: 4,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 2,
  },
  bullet: {
    fontSize: 13,
    color: '#3C3C43',
    marginRight: 6,
    lineHeight: 18,
    minWidth: 16,
  },
  listItemText: {
    flex: 1,
    fontSize: 13,
    color: '#3C3C43',
    lineHeight: 18,
  },
  table: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#C6C6C8',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 4,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#C6C6C8',
  },
  tableHeaderRow: {
    backgroundColor: '#F2F2F7',
  },
  tableCell: {
    flex: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: '#C6C6C8',
  },
  tableCellText: {
    fontSize: 12,
    color: '#3C3C43',
    lineHeight: 16,
  },
  tableHeaderText: {
    fontWeight: '600',
  },
  tableSeparator: {
    height: 2,
    backgroundColor: '#3C3C43',
  },
  image: {
    width: '100%',
    height: 200,
    backgroundColor: '#F2F2F7',
    borderRadius: 6,
    marginBottom: 4,
  },
  fileLinkText: {
    fontSize: 13,
    color: '#3C3C43',
    lineHeight: 18,
    marginBottom: 4,
  },
});
