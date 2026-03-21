# org-inbox — Claude Context

## What this project is

**org-inbox** is a cross-platform (Android + iOS) React Native mobile app whose sole purpose is to act as a share target. The user shares content from any other app (browser links, selected text, images, files, etc.) and the app appends an org-mode capture entry to a user-configured `.org` file on the device's shared storage. That file is later synced to the user's laptop by a separate app (e.g. Syncthing).

**The app does exactly one thing:** receive shared content → format it as an org entry → append it to a `.org` file.

## Documentation

All detailed documentation lives in `docs/`:

| File | Contents |
|---|---|
| `docs/plan.md` | Full implementation plan: phases, steps, library choices, architecture decisions |
| `docs/architecture.md` | Architecture rationale, library justifications, data flow diagrams |
| `docs/org-format.md` | The exact org-mode entry format the app produces |
| `docs/gotchas.md` | Hard-won per-phase implementation details, API quirks, and non-obvious decisions |
| `docs/phase7-implementation.md` | Phase 7 implementation notes: SAF-X and RNFS API signatures, approach for fileStorage and attachmentHandler |
| `docs/ios-xcode-setup.md` | Manual Xcode steps for the iOS Share Extension (App Groups, entitlements, bundle IDs) |

## Documentation policy

**Always keep `docs/` up to date.** When implementing something non-obvious, add a note in the relevant doc file. When a decision changes, update the doc. Future Claude sessions should be able to pick up from `docs/` without needing to re-explore the codebase from scratch.

## Current status

See `docs/plan.md` → "Implementation Progress" section for what has been completed and what is next.

## Quick orientation

```
org-inbox/
├── CLAUDE.md               ← you are here
├── docs/                   ← implementation docs and decisions
├── src/
│   ├── types/              ← SharedItem, ContentType types
│   ├── services/           ← orgFormatter, fileStorage, attachmentHandler, titleFetcher
│   ├── storage/            ← MMKV settings persistence
│   ├── screens/            ← SharePreviewScreen, SettingsScreen
│   ├── components/         ← ContentPreview + per-type preview components, NoteInput
│   └── navigation/         ← RootNavigator
├── android/                ← Android native code (intent-filters in AndroidManifest.xml)
└── ios/                    ← iOS native code (ShareExtension target, App Groups)
```

## Key constraints to keep in mind

1. **React Native CLI (bare workflow)** — not Expo managed. Android SAF and iOS share extension require native code.
2. **Android file I/O uses SAF-X** (`react-native-saf-x`) — never use RNFS for Android external storage; breaks on Android 10+ scoped storage.
3. **iOS file I/O uses RNFS** (`@dr.pogodin/react-native-fs`) on security-scoped `file://` URLs from the document picker.
4. **MMKV for settings** — must be synchronous (needed before save operations); do not swap for AsyncStorage.
5. **Only `:CREATED:` goes in the org properties drawer** — all other content (URL, text, file link) goes in the entry body.
