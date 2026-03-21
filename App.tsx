import React, {useEffect, useRef, useState} from 'react';
import {Platform, StatusBar, useColorScheme} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import ReceiveSharingIntent from 'react-native-receive-sharing-intent';
import {RootNavigator, navigationRef} from './src/navigation/RootNavigator';
import type {SharedItem, ContentType} from './src/types';

// ── Helpers ───────────────────────────────────────────────────────────────────

function mimeToContentType(mimeType?: string): ContentType {
  if (!mimeType) {return 'file';}
  if (mimeType.startsWith('image/')) {return 'image';}
  if (mimeType.startsWith('video/')) {return 'video';}
  if (mimeType.startsWith('audio/')) {return 'audio';}
  if (mimeType === 'text/plain') {return 'text';}
  return 'file';
}

function looksLikeUrl(text: string): boolean {
  return /^https?:\/\//i.test(text.trim());
}

function toSharedItem(raw: any): SharedItem {
  if (raw.weblink) {
    return {contentType: 'url', weblink: raw.weblink};
  }
  if (raw.text && (!raw.filePath || raw.filePath === '')) {
    const text: string = raw.text;
    if (looksLikeUrl(text)) {
      return {contentType: 'url', weblink: text.trim()};
    }
    return {contentType: 'text', text};
  }
  const mimeType: string | undefined = raw.mimeType;
  return {
    contentType: mimeToContentType(mimeType),
    filePath: raw.filePath,
    mimeType,
    fileName: raw.fileName,
    fileSize: raw.fileSize ? Number(raw.fileSize) : undefined,
    text: raw.text || undefined,
  };
}

// ── App ───────────────────────────────────────────────────────────────────────

function App(): React.JSX.Element {
  const isDarkMode = useColorScheme() === 'dark';
  const [initialShareItem, setInitialShareItem] = useState<SharedItem | undefined>(
    undefined,
  );
  const initialShareConsumed = useRef(false);

  useEffect(() => {
    if (Platform.OS !== 'android') {return;}

    // getReceivedFiles sets up an AppState listener internally, so it handles
    // both the initial launch-from-share and subsequent shares while running.
    ReceiveSharingIntent.getReceivedFiles(
      (files: any[]) => {
        if (!files?.length) {return;}
        const item = toSharedItem(files[0]);

        if (!initialShareConsumed.current) {
          // First share — set as initial item so RootNavigator picks it up
          initialShareConsumed.current = true;
          setInitialShareItem(item);
        } else {
          // Subsequent share while app is already running — navigate directly
          navigationRef.navigate('SharePreview', {item});
        }
        ReceiveSharingIntent.clearReceivedFiles();
      },
      (_error: any) => {
        // No share data on this launch — normal startup, do nothing
      },
      'orginbox',
    );
  }, []);

  // iOS share intent is handled in Phase 5 (AppDelegate + URL scheme)

  return (
    <SafeAreaProvider>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <RootNavigator initialShareItem={initialShareItem} />
    </SafeAreaProvider>
  );
}

export default App;
