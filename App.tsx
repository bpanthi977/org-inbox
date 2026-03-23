import React, {useEffect, useState} from 'react';
import {StatusBar, useColorScheme} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import ReceiveSharingIntent from 'react-native-receive-sharing-intent';
import {RootNavigator} from './src/navigation/RootNavigator';
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
class ShareIntentListener {
	private initialized = false;
	private _pending: SharedItem[][] = [];

	public initialize() {
		if (this.initialized) return;
		ReceiveSharingIntent.getReceivedFiles(
			(files: any[]) => {
				if (!files?.length) {return;}
				const items = files.map(toSharedItem);
				this._pending.push(items);
				this.update();
			},
			(_error: any) => {
				// No share data on this launch — normal startup, do nothing
			},
			'orginbox',
		);
		this.initialized = true;
	}

	private _listeners: ((files: SharedItem[]) => void)[] = [];
	public addListener(fn: (files: SharedItem[]) => void) {
		this._listeners.push(fn);
		this.update();
		return () => {
			const index = this._listeners.indexOf(fn);
			this._listeners.splice(index, 1);
		}
	}

	private update() {
		if (this._pending.length == 0) return;
		for (const items of this._pending) {
			this._listeners.forEach(l => l(items));
		}
		this._pending.length = 0;
	}
}

const AppController = {
	share_intents: new ShareIntentListener()
}

function App(): React.JSX.Element {
	const isDarkMode = useColorScheme() === 'dark';
	const [sharedItems, setSharedItems] = useState<SharedItem[] | undefined>()
	useEffect(() => {
		AppController.share_intents.initialize();
		return AppController.share_intents.addListener((items: SharedItem[]) => {
			setSharedItems(items);
		});
	}, []);

	return (
		<SafeAreaProvider>
			<StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
			<RootNavigator initialShareItems={sharedItems} />
		</SafeAreaProvider>
	);
}

export default App;
