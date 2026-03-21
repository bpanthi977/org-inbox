# org-inbox — Implementation Plan

## Implementation Progress

| Phase | Status |
|---|---|
| Phase 1: Project scaffold | **DONE** |
| Phase 2: Types and org formatter | **DONE** |
| Phase 3: Settings screen and MMKV storage | **DONE** |
| Phase 4: Android share intent | **DONE** |
| Phase 5: iOS share extension | TODO |
| Phase 6: Preview screen and content components | TODO |
| Phase 7: File storage and attachment handling | TODO |
| Phase 8: Edge cases and polish | TODO |

---

## Phase 1 — Project Scaffold

1. `npx react-native@latest init OrgInbox --template react-native-template-typescript` in the project root
2. Install dependencies:
   ```
   npm install react-native-receive-sharing-intent react-native-saf-x @react-native-documents/picker @dr.pogodin/react-native-fs react-native-mmkv @react-navigation/native @react-navigation/native-stack react-native-screens react-native-safe-area-context
   ```
3. `cd ios && pod install`
4. Verify both platforms build and run a blank screen

---

## Phase 2 — Types and Org Formatter

**Files:** `src/types/index.ts`, `src/services/orgFormatter.ts`, `__tests__/orgFormatter.test.ts`

- `src/types/index.ts` — `SharedItem`, `ContentType` (see `docs/org-format.md` for shape)
- `src/services/orgFormatter.ts` — pure TypeScript, no native deps, fully unit-testable
- Unit-test with Jest: all content types, empty note, long title truncation, special characters

---

## Phase 3 — Settings Screen and MMKV Storage

**Files:** `src/storage/settings.ts`, `src/screens/SettingsScreen.tsx`, `src/navigation/RootNavigator.tsx`

- `settings.ts` — MMKV wrapper; keys: `androidSafUri`, `iosFolderBookmark`, `iosFolderUri`
- `SettingsScreen` — folder picker button:
  - Android: `openDocumentTree(true)` from `react-native-saf-x`
  - iOS: `pickDirectory({ requestLongTermAccess: true })` from `@react-native-documents/picker`
- `RootNavigator` — stack with gear icon header button → Settings

---

## Phase 4 — Android Share Intent

**Files:** `android/app/src/main/AndroidManifest.xml`, `src/App.tsx`, `src/screens/SharePreviewScreen.tsx` (stub)

- Add `launchMode="singleTask"` to `MainActivity`
- Add `intent-filter` blocks for: `text/plain`, `image/*`, `video/*`, `audio/*`, `application/*`, `SEND_MULTIPLE */*`
- Wire `ReceiveSharingIntent.getReceivedFiles` (initial) + listener (foreground) in `App.tsx`
- Stub `SharePreviewScreen` that logs the received item — verify full share flow before building UI

---

## Phase 5 — iOS Share Extension

**Files:** `ios/ShareExtension/Info.plist`, `ios/ShareExtension/ShareViewController.swift`, `ios/OrgInbox/Info.plist`, `ios/OrgInbox/AppDelegate.swift`

- In Xcode: File > New > Target > Share Extension, name `ShareExtension`
- Enable App Groups on both targets: `group.com.orginbox.shared`
- URL scheme `orginbox` in main app `Info.plist`
- `ShareViewController.swift` — from `react-native-receive-sharing-intent` template; configure App Group ID + URL scheme
- `NSExtensionActivationRule` in `ios/ShareExtension/Info.plist` — accept all content types (see `docs/architecture.md`)
- `AppDelegate.swift` — handle `orginbox://share` URL

---

## Phase 6 — Preview Screen and Content Components

**Files:** `src/services/titleFetcher.ts`, `src/components/previews/*.tsx`, `src/components/ContentPreview.tsx`, `src/components/NoteInput.tsx`, `src/screens/SharePreviewScreen.tsx`

- `titleFetcher.ts` — `fetch(url)` + `/<title>(.*?)<\/title>/i` regex, 3s AbortController timeout
- Per-type preview components — see `docs/architecture.md` for each component's behaviour
- `ContentPreview.tsx` — switches on `item.contentType`
- `SharePreviewScreen` layout:
  ```
  [Cancel]     org-inbox     [Save]
  ──────────────────────────────────
        ContentPreview
  ──────────────────────────────────
  Add a note... (multiline NoteInput)
  ```

---

## Phase 7 — File Storage and Attachment Handling

**Files:** `src/services/attachmentHandler.ts`, `src/services/fileStorage.ts`

- `attachmentHandler.ts` — platform-branched:
  - Android: SAF-X `copyFile(contentUri, safTreeUri/attachments/filename)`
  - iOS: RNFS `copyFile(tempPath, folderUri/attachments/filename)`
- `fileStorage.ts` — platform-branched append:
  - Android: SAF-X `writeFile(fileUri, content, 'utf8', undefined, true)` (append=true)
  - iOS: RNFS `appendFile(filePath, content, 'utf8')`
- Wire Save in `SharePreviewScreen`: `attachmentHandler` → `orgFormatter` → `fileStorage` → dismiss
- Error state: no path configured → show banner prompting Settings

---

## Phase 8 — Edge Cases and Polish

- `SEND_MULTIPLE`: map each item through the same flow, append all entries in one call
- Android: images shared from gallery arrive as `content://` URIs — use SAF-X `copyFile` directly
- iOS: received files sit in App Group container temp dir — copy before the extension cleans up
- First-launch guard: if no path configured and opened from a share, redirect to Settings with explanation
- Large file warning: if file size > 50 MB, show a confirmation dialog before copying

---

## Verification Checklist

- [ ] Share a URL from Firefox/Safari → app appears in share sheet → preview shows fetched page title → Save appends valid org entry to `.org` file
- [ ] Share an image → preview shows thumbnail → Save copies to `attachments/` and appends `[[file:attachments/name.jpg]]`
- [ ] Share plain text → body appears verbatim in org entry
- [ ] Open `.org` file in Emacs and confirm org-mode parses all entries correctly
- [ ] SAF URI persists across Android reboot (re-open app, share again, no re-authorization needed)
- [ ] iOS bookmark resolves correctly after device restart
