# org-inbox

A minimal Android and iOS app that works as a share target. Share a
URL, text snippet, image, or file from any app. org-inbox appends a
properly-formatted [org-mode](https://orgmode.org) capture entry to a
`.org` file on your device. You can then sync that file to your
desktop with Syncthing (or any other tool) and process it in Emacs as
per your workflow.

## Features

- Share URLs with auto-fetched page titles
- Share selected text or plain text
- Share images, videos, audio, and arbitrary files (copied to an `attachments/` folder)
- Add an optional note before saving
- Review pending captures in an inbox list and delete unwanted ones before they pile up
- Dark mode support

## Output format

Each captured item becomes a top-level org heading with a `:CREATED:` timestamp:

```org
* Example Domain
	:PROPERTIES:
	:CREATED: [2024-01-15 Mon 10:30]
	:END:
	[[https://example.com][Example Domain]]

	Optional note added by user.

```

See [`docs/org-format.md`](docs/org-format.md) for the full format specification including all content types.

## Requirements

- Android 10+ or iOS 14+
- Node 22+ and React Native CLI (bare workflow, not Expo)
- For iOS: Xcode 15+

## Building from source

### Android

```sh
npm install
npm run android
```

### iOS

```sh
npm install
cd ios && bundle install && bundle exec pod install && cd ..
npm run ios
```

Then follow the manual Xcode steps in [`docs/ios-xcode-setup.md`](docs/ios-xcode-setup.md) to configure the Share Extension, App Groups, and entitlements — these cannot be automated.

## Configuration

On first launch, tap the gear icon and select the `.org` file (Android) or folder (iOS) where entries should be saved. This grants the app persistent access to that location.

## Architecture

- **React Native CLI** bare workflow — no Expo
- **Android file I/O**: `react-native-saf-x` (SAF/scoped storage, required for Android 10+)
- **iOS file I/O**: `@dr.pogodin/react-native-fs` on security-scoped URLs from the document picker
- **Settings**: `react-native-mmkv` (synchronous, needed before save operations)
- **iOS share**: native Swift Share Extension posting to the main app via App Groups + URL scheme

See [`docs/architecture.md`](docs/architecture.md) for rationale and [`docs/gotchas.md`](docs/gotchas.md) for hard-won implementation notes.

## License

MIT — see [LICENSE](LICENSE).
