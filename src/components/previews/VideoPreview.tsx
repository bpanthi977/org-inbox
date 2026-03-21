import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import type {SharedItem} from '../../types';

interface Props {
  item: SharedItem;
}

/** Shows a static placeholder — video is not played inline to keep the UI fast. */
export function VideoPreview({item}: Props): React.JSX.Element {
  return (
    <View style={styles.container}>
      <View style={styles.thumb}>
        <Text style={styles.icon}>▶</Text>
      </View>
      <View style={styles.meta}>
        <Text style={styles.name} numberOfLines={2}>
          {item.fileName ?? 'Video'}
        </Text>
        {item.fileSize != null && (
          <Text style={styles.size}>{formatSize(item.fileSize)}</Text>
        )}
      </View>
    </View>
  );
}

function formatSize(bytes: number): string {
  if (bytes < 1024) {return `${bytes} B`;}
  if (bytes < 1024 * 1024) {return `${(bytes / 1024).toFixed(1)} KB`;}
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F2F2F7',
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 14,
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: '#1C1C1E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    fontSize: 22,
    color: '#FFFFFF',
  },
  meta: {
    flex: 1,
    gap: 4,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  size: {
    fontSize: 13,
    color: '#8E8E93',
  },
});
