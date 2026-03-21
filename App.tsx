import React, {useEffect, useRef, useState} from 'react';
import {StatusBar, useColorScheme} from 'react-native';
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
  const [initialShareItems, setInitialShareItems] = useState<SharedItem[] | undefined>(
    undefined,
  );
  const initialShareConsumed = useRef(false);

  useEffect(() => {
    // Works on both Android and iOS.
    // Android: fires immediately for launch-from-share, then on subsequent shares.
    // iOS: AppDelegate passes orginbox:// URL to RCTLinkingManager → library reads
      //      shared data from App Group UserDefaults.
      console.log("Registering");
    ReceiveSharingIntent.getReceivedFiles(
	(files: any[]) => {
	    console.log('Received files', files)  
        if (!files?.length) {return;}
        const items = files.map(toSharedItem);

        if (!initialShareConsumed.current) {
          // First share — set as initial items so RootNavigator picks them up
          initialShareConsumed.current = true;
          setInitialShareItems(items);
        } else {
          // Subsequent share while app is already running — navigate directly
          navigationRef.navigate('SharePreview', {items});
        }
      },
      (_error: any) => {
          // No share data on this launch — normal startup, do nothing
	  console.log("error on register", _error); 
      },
      'orginbox',
    );
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <RootNavigator initialShareItems={initialShareItems} />
    </SafeAreaProvider>
  );
}

export default App;
