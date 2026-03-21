# Phase 7 — File Storage & Attachment Handling: Implementation Notes

## Status

**Not yet started.** Both `src/services/fileStorage.ts` and `src/services/attachmentHandler.ts`
currently contain stubs that throw `Error('not yet implemented')`.

---

## What needs to be implemented

### 1. `src/services/fileStorage.ts`

Appends an org-mode entry string to the configured `.org` file.

**Android** (SAF-X):
```typescript
import {writeFile} from 'react-native-saf-x';

// The SAF tree URI stored in Settings.getAndroidSafUri() points to a *folder*.
// We need to construct the URI of the actual .org file within it.
// SAF-X does NOT do path concatenation — use createFile if file doesn't exist,
// then writeFile with append: true.

// Append to file URI (content:// URI to the .org file):
await writeFile(fileUri, orgEntry, {encoding: 'utf8', append: true});
```

**iOS** (RNFS):
```typescript
import RNFS from '@dr.pogodin/react-native-fs';

// Settings.getIosFolderUri() returns a file:// URI to the chosen folder.
// Construct the .org file path: folderUri + '/inbox.org'
await RNFS.appendFile(filePath, orgEntry, 'utf8');
```

**Key question to resolve**: What is the `.org` filename? Two options:
1. Hardcode `inbox.org` — simple, always predictable.
2. Let user configure it in Settings — more flexible.
The plan doesn't specify. Recommend option 1 (hardcode `inbox.org`) for Phase 7
and add configurability in Phase 8 polish if needed.

**On Android: constructing the .org file URI from SAF tree URI**

The SAF tree URI from `openDocumentTree` looks like:
```
content://com.android.externalstorage.documents/tree/primary%3AOrgFiles
```

To get a document URI for `inbox.org` within that tree, you must use SAF-X:
```typescript
import {createFile, exists} from 'react-native-saf-x';

// Check/create inbox.org
const orgFileUri = treUri + '/inbox.org';  // SAF-X supports this path-joining convention
// Actually: SAF-X does NOT support slash-joining tree URIs.
// Instead, use the tree URI directly and let SAF-X writeFile create the file.
// Per SAF-X docs: writeFile "Tries to create the file if does not already exist"
// So just call writeFile directly on the expected document URI.
```

The correct approach for SAF-X document URIs:
```typescript
// SAF tree URI → document URI for a child file:
// tree URI:     content://.../tree/primary%3AOrgFiles
// document URI: content://.../document/primary%3AOrgFiles%3Ainbox.org
// SAF-X writeFile accepts document URIs for writing.
// Use SAF-X's own createFile to get the correct child document URI first.
```

**Simplest working approach for Android**:
1. Try `writeFile(treeUri + '/inbox.org', ...)` — may not work (tree vs document URI)
2. Alternatively: use `listFiles(treeUri)` to find existing `inbox.org`, get its URI.
   If not found, use `createFile(treeUri, {mimeType: 'text/plain'})` then rename to `inbox.org`.

Actually the cleanest approach: SAF-X `writeFile` accepts a **document URI**. The tree URI
needs to be converted. Check if there's a helper — there isn't in SAF-X. Instead:

**Recommended approach**: Store both the tree URI *and* the document URI for `inbox.org`
in Settings after initial creation. On first save:
1. Check if `androidOrgFileUri` is set in MMKV.
2. If not: `createFile(treeUri, {mimeType: 'text/plain'})` → rename to `inbox.org` → store URI.
3. Then `writeFile(orgFileUri, content, {append: true})`.

Or simpler: just use `createFile` every time if it doesn't exist, which returns the doc URI.
Then `writeFile` with `append: true`.

---

### 2. `src/services/attachmentHandler.ts`

Copies the shared file into an `attachments/` subdirectory next to the `.org` file.
Returns the relative path `attachments/<filename>` for use in the org entry body.

**Android** (SAF-X):
```typescript
import {copyFile, mkdir, exists} from 'react-native-saf-x';

// 1. Ensure attachments/ directory exists in the SAF tree
const attachmentsUri = treeUri + '/attachments';  // may not work, see above
// Better: use mkdir(treeUri) with SAF-X which auto-creates nested dirs
// Then copyFile(item.filePath, attachmentsUri + '/' + filename, {replaceIfDestinationExists: true})
```

**iOS** (RNFS):
```typescript
import RNFS from '@dr.pogodin/react-native-fs';

const folderPath = Settings.getIosFolderUri()!.replace('file://', '');
const attachmentsDir = folderPath + '/attachments';

// Ensure attachments/ exists
const dirExists = await RNFS.exists(attachmentsDir);
if (!dirExists) {
  await RNFS.mkdir(attachmentsDir);
}

// Copy the file
await RNFS.copyFile(item.filePath!, attachmentsDir + '/' + filename);
return 'attachments/' + filename;
```

---

## Exact API Signatures (verified from node_modules)

### SAF-X (`react-native-saf-x`)
```typescript
writeFile(uriString: string, data: string, options?: {
  encoding?: 'utf8' | 'base64' | 'ascii';
  append?: boolean;
  mimeType?: string;
}): Promise<string>  // resolves with uriString

copyFile(srcUri: string, destUri: string, options?: {
  replaceIfDestinationExists?: boolean;
}): Promise<DocumentFileDetail>

exists(uriString: string): Promise<boolean>

mkdir(uriString: string): Promise<DocumentFileDetail>

createFile(uriString: string, options?: {mimeType?: string}): Promise<DocumentFileDetail>
// ^ createFile rejects if file already exists — use exists() check first

listFiles(uriString: string): Promise<DocumentFileDetail[]>
// DocumentFileDetail has: uri, name, type, lastModified, length, etc.
```

### RNFS (`@dr.pogodin/react-native-fs`)
```typescript
appendFile(filepath: string, contents: string, encodingOrOptions?: 'utf8' | 'base64'): Promise<void>

copyFile(from: string, into: string, options?: {}): Promise<void>

exists(filepath: string): Promise<boolean>

mkdir(filepath: string, options?: {NSURLIsExcludedFromBackupKey?: boolean}): Promise<void>
```

---

## Settings keys to add

Add `androidOrgFileUri` key to `src/storage/settings.ts` for caching the SAF document URI
of the `.org` file (avoids needing to traverse the tree every time):

```typescript
getAndroidOrgFileUri: (): string | undefined => storage.getString('androidOrgFileUri'),
setAndroidOrgFileUri: (uri: string): void => storage.set('androidOrgFileUri', uri),
```

---

## Wire-up in SharePreviewScreen

Already done (Phase 6). `handleSave` in `SharePreviewScreen.tsx:39` calls:
1. `copyAttachment(item)` → returns `attachmentRelPath`
2. `formatOrgEntry(item, note, attachmentRelPath)` → returns org string
3. `appendToOrgFile(orgEntry)` → appends to file
4. `onSave()` → dismisses screen

---

## Commit plan for Phase 7

1. Commit: `feat: implement fileStorage (SAF-X append on Android, RNFS on iOS)`
2. Commit: `feat: implement attachmentHandler (SAF-X copy on Android, RNFS on iOS)`
3. Commit: `feat: add androidOrgFileUri settings key` (if needed)
