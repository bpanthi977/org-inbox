# org-inbox — Implementation Gotchas

Hard-won details per phase. Read before touching any of these areas.

---

## Phase 1 — Scaffold

**rbenv required.** macOS system Ruby is 2.6 — too old for CocoaPods. Must use rbenv.
```bash
eval "$(rbenv init -)"   # must be in every shell session that runs pod/bundle
bundle exec pod install  # always via bundler, not bare `pod install`
```
`.ruby-version` is set to `3.3.8` in the project root.

**`react-native init` is deprecated.** Use:
```bash
npx @react-native-community/cli@latest init OrgInbox
```

**`nitro-modules` is a required peer dep of MMKV v3.** Must install separately:
```bash
npm install react-native-nitro-modules
```

---

## Phase 2 — Types and Org Formatter

`formatOrgEntry(item, note, attachmentRelPath?, now?)` in `src/services/orgFormatter.ts`.
- `now` param exists for deterministic testing.
- URL heading fallback chain: `item.pageTitle` → URL hostname → `"Untitled Link"`.
- Text heading: first line, max 60 chars + `…` suffix if truncated.
- Body for URL with no title: `[[url]]` (no `][title]` part). With title: `[[url][title]]`.
- All body lines indented 2 spaces. Note after blank line, also 2-space indented.
- Entry ends with `\n\n` (blank line separator).

---

## Phase 3 — Settings & MMKV

**`createMMKV()` factory, not `new MMKV()`.** MMKV v3 changed the API:
```typescript
import {createMMKV} from 'react-native-mmkv';
const storage = createMMKV({id: 'org-inbox-settings'});
```

**`pickDirectory` returns a single object, not an array.** iOS picker:
```typescript
const result = await pickDirectory({requestLongTermAccess: true}); // NOT const [result] = ...
```

**`bookmarkStatus` discriminated union.** Must check before accessing `bookmark`:
```typescript
if (result.bookmarkStatus === 'success') {
  Settings.setIosBookmark(result.bookmark);
}
```
On Android, `pickDirectory` returns `{uri: string}` directly (no bookmark field).

---

## Phase 4 — Android Share Intent

**`getReceivedFiles` manages its own AppState listener internally.** Do NOT add a
separate `AppState` listener. The single call handles both initial launch and
foreground shares. Calling it sets up the listener for the app's lifetime.

**`initialShareConsumed` ref prevents double-navigation.** On mount, the callback
fires once with initial share data. Subsequent shares while running also fire the
same callback. The ref distinguishes them — see `App.tsx:52`.

**`toSharedItem` URL detection:** `raw.weblink` is set for explicit URL shares.
For `text/plain` that contains a URL, `raw.text` starts with `https?://` — detect
with `/^https?:\/\//i` and set `contentType: 'url'`.

**Third arg to `getReceivedFiles` must match URL scheme** (`'orginbox'`).

---

## Phase 5 — iOS Share Extension

Constants (must be consistent across all files):
- **App Group ID:** `group.org.reactjs.native.example.OrgInbox`
- **URL scheme:** `orginbox`
- **Main bundle ID:** `org.reactjs.native.example.OrgInbox`
- **Extension bundle ID:** `org.reactjs.native.example.OrgInbox.ShareExtension`

**All Xcode setup is manual — see `docs/ios-xcode-setup.md`.**
The Swift/plist/entitlements files are already in the repo at `ios/ShareExtension/`.

**iOS share intent is handled entirely in native Swift (no RN JS in extension process).**
`ShareViewController.swift` writes to `UserDefaults(suiteName: APP_GROUP)`, then
opens the main app via `UIApplication.shared.open(URL("orginbox://share")!)`. The
main app's `AppDelegate.swift` passes it to `RCTLinkingManager`, which fires the
`ReceiveSharingIntent` JS listener.

---

## Phase 6 — Preview Screen and Title Fetcher

**`Response.body` (streaming) is not available in React Native.** Use `response.text()`:
```typescript
const html = await response.text(); // NOT response.body.getReader()
```

**`titleFetcher.ts` never throws.** All errors caught, returns `undefined` on any failure.
3-second `AbortController` timeout.

**`UrlPreview` calls `onTitleFetched(title)` which mutates `item.pageTitle` directly**
so `orgFormatter` picks up the fetched title without extra state threading.
`item` is passed by reference so mutation is visible to `handleSave`.

**`ImagePreview` handles both `file://` and `content://` URIs** for Android gallery shares.
React Native's `Image` component handles both URI schemes natively.

**`VideoPreview` is a static placeholder** — no inline video playback.

---

## Navigation

**`navigationRef`** is a `createNavigationContainerRef<RootStackParamList>()` exported
from `RootNavigator.tsx`. Used by `App.tsx` to navigate imperatively from the
sharing intent callback (outside React tree).

**Initial route logic in `RootNavigator`:**
- No configured path → `Settings` screen with `showBanner={true}`
- Has path + has initial share item → `SharePreview`
- Has path + no share → `Settings` (app opened normally, not via share)

---

## Jest Config

`react-native-mmkv`, `react-native-nitro-modules`, `react-native-saf-x`, and
`@react-native-documents/picker` all ship ESM and must be in `transformIgnorePatterns`
allowlist. See `jest.config.js`.
