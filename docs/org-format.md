# org-inbox — Org-Mode Entry Format

## Entry structure

```org
* <heading>
  :PROPERTIES:
  :CREATED: [YYYY-MM-DD Day HH:MM]
  :END:
  <body>

  <optional note>

```

**Rules:**
- Single `*` (top-level heading).
- Only `:CREATED:` goes in the properties drawer. Nothing else.
- All content (URL, text, file link) goes in the body, indented with 2 spaces.
- The note (if provided by user) is appended after a blank line, also indented with 2 spaces.
- A trailing blank line separates entries.

---

## Examples by content type

### URL share

```org
* Example Domain
  :PROPERTIES:
  :CREATED: [2024-01-15 Mon 10:30]
  :END:
  [[https://example.com][Example Domain]]

```

If page title cannot be fetched, fall back to the domain name:
```org
* example.com
  :PROPERTIES:
  :CREATED: [2024-01-15 Mon 10:30]
  :END:
  [[https://example.com/some/long/path]]

```

### URL share with note

```org
* Example Domain
  :PROPERTIES:
  :CREATED: [2024-01-15 Mon 10:30]
  :END:
  [[https://example.com][Example Domain]]

  Good reference for X. Follow up later.

```

### Text share

Heading = first line of text, truncated to 60 chars with `…` if longer.

```org
* The quick brown fox jumps over the lazy dog
  :PROPERTIES:
  :CREATED: [2024-01-15 Mon 10:30]
  :END:
  The quick brown fox jumps over the lazy dog

```

### Image share

```org
* photo_2024.jpg
  :PROPERTIES:
  :CREATED: [2024-01-15 Mon 10:30]
  :END:
  [[file:attachments/photo_2024.jpg]]

```

### Video share

```org
* video_clip.mp4
  :PROPERTIES:
  :CREATED: [2024-01-15 Mon 10:30]
  :END:
  [[file:attachments/video_clip.mp4]]

```

### Audio share

```org
* recording.m4a
  :PROPERTIES:
  :CREATED: [2024-01-15 Mon 10:30]
  :END:
  [[file:attachments/recording.m4a]]

```

### File share (PDF, doc, etc.)

```org
* report.pdf
  :PROPERTIES:
  :CREATED: [2024-01-15 Mon 10:30]
  :END:
  [[file:attachments/report.pdf]]

```

---

## Heading derivation logic

| Content type | Heading source |
|---|---|
| `url` | Fetched `<title>` → fallback: domain of URL → fallback: `"Untitled Link"` |
| `text` | First line of text, max 60 chars (truncated with `…`) |
| `image` / `video` / `audio` / `file` | Original filename → fallback: `"Untitled"` |

---

## Attachment file naming

Files are copied to `attachments/` next to the `.org` file. If a filename collision occurs, a numeric suffix is added: `photo.jpg` → `photo_1.jpg` → `photo_2.jpg`.

The `[[file:attachments/name.ext]]` path is *relative* to the `.org` file. Org-mode resolves relative file links correctly when the `.org` file is the base.

---

## Org date format

`[YYYY-MM-DD Day HH:MM]` — standard org inactive timestamp.

Example: `[2024-01-15 Mon 10:30]`

Day abbreviations: `Sun Mon Tue Wed Thu Fri Sat`
