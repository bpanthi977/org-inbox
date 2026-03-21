import {formatOrgDate, formatOrgEntry} from '../src/services/orgFormatter';
import type {SharedItem} from '../src/types';

const FIXED_DATE = new Date('2024-01-15T10:30:00');

describe('formatOrgDate', () => {
  it('formats a date as an org inactive timestamp', () => {
    expect(formatOrgDate(FIXED_DATE)).toBe('[2024-01-15 Mon 10:30]');
  });

  it('pads month, day, hour, minute with leading zeros', () => {
    const date = new Date('2024-03-05T09:05:00');
    expect(formatOrgDate(date)).toBe('[2024-03-05 Tue 09:05]');
  });

  it('uses correct day abbreviations for all days', () => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    // 2024-01-07 is a Sunday
    const base = new Date('2024-01-07T12:00:00');
    days.forEach((day, i) => {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      expect(formatOrgDate(d)).toContain(day);
    });
  });
});

describe('formatOrgEntry', () => {
  describe('URL shares', () => {
    it('uses page title as heading and formats org link', () => {
      const item: SharedItem = {
        contentType: 'url',
        weblink: 'https://example.com/article',
        pageTitle: 'Example Article',
      };
      const result = formatOrgEntry(item, '', undefined, FIXED_DATE);
      expect(result).toContain('* Example Article');
      expect(result).toContain('[[https://example.com/article][Example Article]]');
    });

    it('falls back to hostname when no page title', () => {
      const item: SharedItem = {
        contentType: 'url',
        weblink: 'https://example.com/some/long/path',
      };
      const result = formatOrgEntry(item, '', undefined, FIXED_DATE);
      expect(result).toContain('* example.com');
    });

    it('falls back to "Untitled Link" when no weblink', () => {
      const item: SharedItem = {contentType: 'url'};
      const result = formatOrgEntry(item, '', undefined, FIXED_DATE);
      expect(result).toContain('* Untitled Link');
    });

    it('includes CREATED in properties drawer', () => {
      const item: SharedItem = {
        contentType: 'url',
        weblink: 'https://example.com',
        pageTitle: 'Test',
      };
      const result = formatOrgEntry(item, '', undefined, FIXED_DATE);
      expect(result).toContain('  :PROPERTIES:');
      expect(result).toContain('  :CREATED: [2024-01-15 Mon 10:30]');
      expect(result).toContain('  :END:');
    });

    it('appends note after blank line when note is provided', () => {
      const item: SharedItem = {
        contentType: 'url',
        weblink: 'https://example.com',
        pageTitle: 'Test',
      };
      const result = formatOrgEntry(item, 'My note here', undefined, FIXED_DATE);
      expect(result).toContain('  My note here');
      // blank line before note
      expect(result).toMatch(/\n\n  My note here/);
    });

    it('does not add note section when note is empty', () => {
      const item: SharedItem = {
        contentType: 'url',
        weblink: 'https://example.com',
        pageTitle: 'Test',
      };
      const result = formatOrgEntry(item, '   ', undefined, FIXED_DATE);
      expect(result).not.toContain('My note');
    });
  });

  describe('Text shares', () => {
    it('uses first line as heading (truncated at 60 chars)', () => {
      const item: SharedItem = {
        contentType: 'text',
        text: 'The quick brown fox jumps over the lazy dog',
      };
      const result = formatOrgEntry(item, '', undefined, FIXED_DATE);
      expect(result).toContain('* The quick brown fox jumps over the lazy dog');
    });

    it('truncates heading to 60 chars with ellipsis', () => {
      const longLine = 'A'.repeat(70);
      const item: SharedItem = {contentType: 'text', text: longLine};
      const result = formatOrgEntry(item, '', undefined, FIXED_DATE);
      expect(result).toContain('* ' + 'A'.repeat(57) + '…');
    });

    it('uses "Note" as heading when text is empty', () => {
      const item: SharedItem = {contentType: 'text', text: ''};
      const result = formatOrgEntry(item, '', undefined, FIXED_DATE);
      expect(result).toContain('* Note');
    });

    it('puts full text in body', () => {
      const item: SharedItem = {
        contentType: 'text',
        text: 'line one\nline two',
      };
      const result = formatOrgEntry(item, '', undefined, FIXED_DATE);
      expect(result).toContain('  line one');
      expect(result).toContain('  line two');
    });
  });

  describe('File shares (image, video, audio, file)', () => {
    it('uses fileName as heading', () => {
      const item: SharedItem = {
        contentType: 'image',
        fileName: 'photo.jpg',
        filePath: '/tmp/photo.jpg',
      };
      const result = formatOrgEntry(item, '', 'attachments/photo.jpg', FIXED_DATE);
      expect(result).toContain('* photo.jpg');
    });

    it('uses attachment rel path in file link', () => {
      const item: SharedItem = {
        contentType: 'image',
        fileName: 'photo.jpg',
      };
      const result = formatOrgEntry(item, '', 'attachments/photo.jpg', FIXED_DATE);
      expect(result).toContain('  [[file:attachments/photo.jpg]]');
    });

    it('falls back to fileName when no attachment path', () => {
      const item: SharedItem = {
        contentType: 'file',
        fileName: 'report.pdf',
      };
      const result = formatOrgEntry(item, '', undefined, FIXED_DATE);
      expect(result).toContain('  [[file:report.pdf]]');
    });

    it('falls back to "Untitled" heading when no fileName', () => {
      const item: SharedItem = {contentType: 'audio'};
      const result = formatOrgEntry(item, '', undefined, FIXED_DATE);
      expect(result).toContain('* Untitled');
    });

    it('works for video type', () => {
      const item: SharedItem = {
        contentType: 'video',
        fileName: 'clip.mp4',
      };
      const result = formatOrgEntry(item, 'cool video', 'attachments/clip.mp4', FIXED_DATE);
      expect(result).toContain('* clip.mp4');
      expect(result).toContain('  [[file:attachments/clip.mp4]]');
      expect(result).toContain('  cool video');
    });
  });

  describe('entry structure', () => {
    it('starts with a single * heading', () => {
      const item: SharedItem = {contentType: 'text', text: 'Hello'};
      const result = formatOrgEntry(item, '', undefined, FIXED_DATE);
      expect(result).toMatch(/^\* /);
    });

    it('ends with two newlines (trailing blank line)', () => {
      const item: SharedItem = {contentType: 'text', text: 'Hello'};
      const result = formatOrgEntry(item, '', undefined, FIXED_DATE);
      expect(result).toMatch(/\n\n$/);
    });

    it('does not include extra properties beyond CREATED', () => {
      const item: SharedItem = {
        contentType: 'url',
        weblink: 'https://example.com',
        pageTitle: 'Test',
        mimeType: 'text/html',
        fileName: 'test.html',
      };
      const result = formatOrgEntry(item, '', undefined, FIXED_DATE);
      // Only CREATED in properties
      const propsBlock = result.match(/:PROPERTIES:([\s\S]*?):END:/)?.[1] ?? '';
      expect(propsBlock).not.toContain(':SOURCE:');
      expect(propsBlock).not.toContain(':TYPE:');
      expect(propsBlock).not.toContain(':FILENAME:');
      expect(propsBlock).toContain(':CREATED:');
    });
  });
});
