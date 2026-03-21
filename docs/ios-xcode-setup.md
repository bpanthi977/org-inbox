# iOS Share Extension — Xcode Setup

The Swift source files and plists are already prepared. The steps below wire
them into Xcode (this cannot be done from the command line).

## Constants used everywhere

| Item | Value |
|---|---|
| Bundle ID (main app) | `org.reactjs.native.example.OrgInbox` |
| App Group ID | `group.org.reactjs.native.example.OrgInbox` |
| URL scheme | `orginbox` |
| Extension bundle ID | `org.reactjs.native.example.OrgInbox.ShareExtension` |

---

## Step 1 — Open the workspace

```
open ios/OrgInbox.xcworkspace
```

Always use the `.xcworkspace`, never the `.xcodeproj`.

---

## Step 2 — Create the Share Extension target

1. In Xcode: **File → New → Target…**
2. Choose **Share Extension**, click Next
3. Product Name: `ShareExtension`
4. Language: **Swift**
5. Bundle Identifier: `org.reactjs.native.example.OrgInbox.ShareExtension`
6. Click Finish — say **Cancel** when asked to activate the scheme

---

## Step 3 — Replace the generated files

Xcode generates a default `ShareViewController.swift` and `Info.plist`. Replace
them with the files already in the repo:

1. In Xcode's Project Navigator, expand the `ShareExtension` group
2. Delete the generated `ShareViewController.swift` → **Move to Trash**
3. Delete the generated `Info.plist` → **Move to Trash**
4. Right-click the `ShareExtension` group → **Add Files to "OrgInbox"…**
5. Navigate to `ios/ShareExtension/`, select:
   - `ShareViewController.swift`
   - `Info.plist`
   - `ShareExtension.entitlements`
6. Ensure **Target Membership** is set to `ShareExtension` only

---

## Step 4 — Set the entitlements file for ShareExtension

1. Select the `ShareExtension` target → **Build Settings**
2. Search for `CODE_SIGN_ENTITLEMENTS`
3. Set to: `ShareExtension/ShareExtension.entitlements`

---

## Step 5 — Enable App Groups on BOTH targets

### Main app target (OrgInbox):
1. Select `OrgInbox` target → **Signing & Capabilities**
2. Click **+ Capability** → Add **App Groups**
3. Click **+** and add: `group.org.reactjs.native.example.OrgInbox`
4. Set the entitlements file in Build Settings → `CODE_SIGN_ENTITLEMENTS`:
   `OrgInbox/OrgInbox.entitlements`

### ShareExtension target:
1. Select `ShareExtension` target → **Signing & Capabilities**
2. Click **+ Capability** → Add **App Groups**
3. Add the same group: `group.org.reactjs.native.example.OrgInbox`

Both targets must use the **same App Group ID** — this is how they share data.

---

## Step 6 — Set the ShareExtension bundle identifier

1. Select `ShareExtension` target → **General**
2. Set Bundle Identifier to:
   `org.reactjs.native.example.OrgInbox.ShareExtension`
3. Set Version and Build to match the main app (e.g. `1.0` / `1`)

---

## Step 7 — Set iOS Deployment Target

Both targets should target the same minimum iOS version (16.0 or higher).

`ShareExtension` target → **General** → Minimum Deployments → iOS 16.0

---

## Step 8 — Verify and build

1. Select the `OrgInbox` scheme (not `ShareExtension`)
2. Build with **Cmd+B**
3. If you see "The app group ... is not enabled" errors, go back to
   Signing & Capabilities and ensure both targets have the same group checked

---

## Testing the share extension

1. Run the app on a device or simulator
2. Open Safari and navigate to any page
3. Tap the Share button → scroll to find "Save to org-inbox"
4. The main app should open with the shared URL pre-populated

If the extension doesn't appear in the share sheet, check:
- `NSExtensionActivationRule` in `ios/ShareExtension/Info.plist`
- Both targets have the App Group capability enabled
- The extension's bundle ID is a sub-ID of the main app
