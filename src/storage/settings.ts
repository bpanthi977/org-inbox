import {Platform} from 'react-native';
import {createMMKV} from 'react-native-mmkv';

const storage = createMMKV({id: 'org-inbox-settings'});

export const Settings = {
  // ── Android ──────────────────────────────────────────────────────────────
  getAndroidSafUri: (): string | undefined =>
    storage.getString('androidSafUri'),
  setAndroidSafUri: (uri: string): void =>
    storage.set('androidSafUri', uri),

  // ── iOS ──────────────────────────────────────────────────────────────────
  /** Opaque bookmark string from pickDirectory({ requestLongTermAccess: true }) */
  getIosBookmark: (): string | undefined =>
    storage.getString('iosFolderBookmark'),
  setIosBookmark: (bookmark: string): void =>
    storage.set('iosFolderBookmark', bookmark),

  /** Cached file:// URL — always re-resolve from bookmark on app launch */
  getIosFolderUri: (): string | undefined =>
    storage.getString('iosFolderUri'),
  setIosFolderUri: (uri: string): void =>
    storage.set('iosFolderUri', uri),

  // ── Cross-platform ───────────────────────────────────────────────────────
  hasConfiguredPath: (): boolean => {
    if (Platform.OS === 'android') {
      return !!storage.getString('androidSafUri');
    }
    return !!storage.getString('iosFolderBookmark');
  },

  /** Human-readable display string for the current configured path. */
  getDisplayPath: (): string | undefined => {
    if (Platform.OS === 'android') {
      const uri = storage.getString('androidSafUri');
      if (!uri) {return undefined;}
      // Decode content:// URI to a friendlier string, e.g.
      // content://com.android.externalstorage.../tree/primary:OrgFiles
      // → "OrgFiles (internal storage)"
      try {
        const match = uri.match(/tree\/(.+)$/);
        if (match) {
          return decodeURIComponent(match[1]).replace('primary:', '');
        }
      } catch {}
      return uri;
    }
    // iOS: show the folder URI
    return storage.getString('iosFolderUri');
  },

  clearAll: (): void => storage.clearAll(),
};
