import React from 'react';
import {View, Text, StyleSheet, useColorScheme} from 'react-native';
import type {SharedItem} from '../../types';

interface Props {
  item: SharedItem;
}

/** Generic preview for audio, PDFs, documents, and any other file type. */
export function FilePreview({item}: Props): React.JSX.Element {
  const isDark = useColorScheme() === 'dark';
  const icon = iconForType(item);
  const ext = extFromFilename(item.fileName);

  return (
    <View style={[styles.container, {backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7'}]}>
      <View style={[styles.iconBox, {backgroundColor: isDark ? '#3A3A3C' : '#E5E5EA'}]}>
        <Text style={styles.iconText}>{icon}</Text>
        {ext && <Text style={styles.ext}>{ext}</Text>}
      </View>
      <View style={styles.meta}>
        <Text style={[styles.name, {color: isDark ? '#FFFFFF' : '#1C1C1E'}]} numberOfLines={2}>
          {item.fileName ?? 'File'}
        </Text>
        {item.mimeType && (
          <Text style={styles.mime} numberOfLines={1}>
            {item.mimeType}
          </Text>
        )}
        {item.fileSize != null && (
          <Text style={styles.size}>{formatSize(item.fileSize)}</Text>
        )}
      </View>
    </View>
  );
}

function iconForType(item: SharedItem): string {
  if (item.contentType === 'audio') {return '🎵';}
  const mime = item.mimeType ?? '';
  if (mime === 'application/pdf') {return '📄';}
  if (mime.includes('word') || mime.includes('document')) {return '📝';}
  if (mime.includes('sheet') || mime.includes('excel')) {return '📊';}
  if (mime.includes('presentation') || mime.includes('powerpoint')) {return '📽';}
  if (mime.includes('zip') || mime.includes('archive')) {return '🗜';}
  return '📎';
}

function extFromFilename(name?: string): string | undefined {
  if (!name) {return undefined;}
  const parts = name.split('.');
  return parts.length > 1 ? parts.pop()?.toUpperCase() : undefined;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) {return `${bytes} B`;}
  if (bytes < 1024 * 1024) {return `${(bytes / 1024).toFixed(1)} KB`;}
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 14,
  },
  iconBox: {
    width: 56,
    height: 56,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconText: {
    fontSize: 26,
  },
  ext: {
    position: 'absolute',
    bottom: 4,
    fontSize: 8,
    fontWeight: '700',
    color: '#636366',
    letterSpacing: 0.2,
  },
  meta: {
    flex: 1,
    gap: 3,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
  },
  mime: {
    fontSize: 12,
    color: '#8E8E93',
  },
  size: {
    fontSize: 12,
    color: '#8E8E93',
  },
});
