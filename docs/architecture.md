# org-inbox — Architecture

## Overview

```
Other app (browser, gallery, etc.)
         │ share intent / share sheet
         ▼
  ┌─────────────────────────────────┐
  │  OS share handler               │
  │  Android: MainActivity Intent   │
  │  iOS: ShareExtension process    │
  └──────────────┬──────────────────┘
                 │ SharedItem
                 ▼
  ┌─────────────────────────────────┐
  │  SharePreviewScreen             │
  │  • ContentPreview (per type)    │
  │  • NoteInput                    │
  │  • Save / Cancel                │
  └──────────────┬──────────────────┘
                 │
        ┌────────┴────────┐
        ▼                 ▼
  attachmentHandler   orgFormatter
  (copy file to       (pure fn →
  attachments/)       org string)
        │                 │
        └────────┬─────────┘
                 ▼
           fileStorage
           (append to .org file)
                 │
        ┌────────┴────────┐
        ▼                 ▼
  SAF-X (Android)    RNFS (iOS)
  content:// URI     file:// URI
```

---

## Library Choices and Rationale

### `react-native-receive-sharing-intent`
- Chosen over `react-native-share-menu` (Expensify): the latter hasn't had an npm release since May 2022 and requires a full RN-rendered share extension on iOS (large binary, complex setup).
- `receive-sharing-intent` uses the standard iOS pattern: lightweight native Swift extension → writes to shared App Group `UserDefaults` → opens main app via URL scheme → JS layer reads it.
- Supports all MIME types on both platforms.

### `react-native-saf-x`
- Android 10+ (API 29+) mandates the Storage Access Framework for accessing files outside the app sandbox. Direct path access via RNFS breaks silently on these versions.
- SAF-X provides `openDocumentTree` (with persistable permissions), `writeFile` (with append mode), `copyFile`, `mkdir`, and `exists` — exactly what we need.
- Permissions from `openDocumentTree(true)` survive app restarts and device reboots.

### `@react-native-documents/picker`
- Provides `pickDirectory({ requestLongTermAccess: true })` on iOS, which returns an opaque security-scoped bookmark string.
- The bookmark is the only reliable way to re-access a user-chosen directory across app launches and device restores on iOS. Raw `file://` URLs can become stale.
- Actively maintained (rewritten 2025, v12+).

### `@dr.pogodin/react-native-fs`
- The original `react-native-fs` is unmaintained and incompatible with React Native's New Architecture (Fabric/TurboModules).
- The `@dr.pogodin` fork is the actively maintained drop-in replacement.
- Used only on iOS; Android uses SAF-X.

### `react-native-mmkv`
- SAF URI and iOS bookmark must be available *synchronously* at the start of the save flow (before any async operation). AsyncStorage's Promise-based API introduces a race condition risk.
- MMKV is synchronous, 30× faster than AsyncStorage, and New Architecture compatible.

---

## iOS Share Extension Data Flow

```
User taps Share in Safari
        │
        ▼
iOS launches ShareExtension (separate process, no RN JS)
        │
ShareViewController.swift:
  1. Extracts NSItemProvider payloads (URL, text, file)
  2. Copies file payloads into App Group container:
     group.com.orginbox.shared/tmp/
  3. Writes JSON metadata to UserDefaults(suiteName: "group.com.orginbox.shared")
  4. Opens main app: UIApplication.shared.open(URL("orginbox://share"))
  5. extensionContext?.completeRequest(returningItems: nil)
        │
        ▼
Main app receives orginbox://share via AppDelegate
        │
AppDelegate.swift calls RCTLinkingManager.application(_:open:options:)
        │
ReceiveSharingIntent JS callback fires in App.tsx (same getReceivedFiles
call used on Android — no platform branch needed)
        │
Navigate to SharePreviewScreen with items: SharedItem[]
```

---

## Android Share Intent Flow

```
User taps Share in Firefox
        │
Android resolves intent-filters → matches org.inbox MainActivity
        │
launchMode="singleTask" ensures existing instance is reused
(or new instance created if app was not running)
        │
ReceiveSharingIntent.getReceivedFiles fires (or listener if already running)
        │
Navigate to SharePreviewScreen with items: SharedItem[]
```

---

## SharePreview Screen — Content Rendering

`ContentPreview.tsx` dispatches to a sub-component based on `SharedItem.contentType`:

| Type | Component | Behaviour |
|---|---|---|
| `url` | `UrlPreview` | Shows URL in a card; fetches page `<title>` async (3s timeout); shows spinner while loading |
| `text` | `TextPreview` | `ScrollView` with raw text, truncated at ~20 lines with "show more" |
| `image` | `ImagePreview` | `Image` component pointing at temp file path, constrained height |
| `video` | `VideoPreview` | Static first-frame thumbnail; does not play inline |
| `audio` | `FilePreview` | Music icon + filename + file size |
| `file` | `FilePreview` | Document icon + filename + file size |

---

## MMKV Settings Keys

| Key | Platform | Value |
|---|---|---|
| `androidSafUri` | Android | `content://` tree URI from `openDocumentTree(true)` |
| `iosFolderBookmark` | iOS | Opaque bookmark string from `pickDirectory({ requestLongTermAccess: true })` |
| `iosFolderUri` | iOS | Cached `file://` URL — **always re-resolve from bookmark on launch**, do not rely on cached value alone |

---

## Android Manifest Intent Filters

```xml
<!-- Text and URLs -->
<intent-filter>
  <action android:name="android.intent.action.SEND" />
  <category android:name="android.intent.category.DEFAULT" />
  <data android:mimeType="text/plain" />
</intent-filter>

<!-- Images -->
<intent-filter>
  <action android:name="android.intent.action.SEND" />
  <category android:name="android.intent.category.DEFAULT" />
  <data android:mimeType="image/*" />
</intent-filter>

<!-- Video -->
<intent-filter>
  <action android:name="android.intent.action.SEND" />
  <category android:name="android.intent.category.DEFAULT" />
  <data android:mimeType="video/*" />
</intent-filter>

<!-- Audio -->
<intent-filter>
  <action android:name="android.intent.action.SEND" />
  <category android:name="android.intent.category.DEFAULT" />
  <data android:mimeType="audio/*" />
</intent-filter>

<!-- PDFs, docs, etc. -->
<intent-filter>
  <action android:name="android.intent.action.SEND" />
  <category android:name="android.intent.category.DEFAULT" />
  <data android:mimeType="application/*" />
</intent-filter>

<!-- Multiple files -->
<intent-filter>
  <action android:name="android.intent.action.SEND_MULTIPLE" />
  <category android:name="android.intent.category.DEFAULT" />
  <data android:mimeType="*/*" />
</intent-filter>
```

---

## iOS NSExtensionActivationRule

```xml
<key>NSExtensionActivationRule</key>
<dict>
  <key>NSExtensionActivationSupportsAttachmentsWithMaxCount</key>
  <integer>10</integer>
  <key>NSExtensionActivationSupportsFileWithMaxCount</key>
  <integer>10</integer>
  <key>NSExtensionActivationSupportsImageWithMaxCount</key>
  <integer>10</integer>
  <key>NSExtensionActivationSupportsMovieWithMaxCount</key>
  <integer>10</integer>
  <key>NSExtensionActivationSupportsText</key>
  <true/>
  <key>NSExtensionActivationSupportsWebURLWithMaxCount</key>
  <integer>5</integer>
</dict>
```
