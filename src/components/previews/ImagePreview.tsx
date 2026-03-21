import React from 'react';
import {View, Image, Text, StyleSheet} from 'react-native';
import type {SharedItem} from '../../types';

interface Props {
  item: SharedItem;
}

export function ImagePreview({item}: Props): React.JSX.Element {
  const uri = item.filePath
    ? item.filePath.startsWith('file://') || item.filePath.startsWith('content://')
      ? item.filePath
      : `file://${item.filePath}`
    : undefined;

  return (
    <View style={styles.container}>
      {uri ? (
        <Image
          source={{uri}}
          style={styles.image}
          resizeMode="contain"
          accessibilityLabel={item.fileName ?? 'Shared image'}
        />
      ) : (
        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>🖼</Text>
        </View>
      )}
      {item.fileName && (
        <Text style={styles.filename} numberOfLines={1}>
          {item.fileName}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F2F2F7',
    borderRadius: 10,
    overflow: 'hidden',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: 240,
  },
  placeholder: {
    height: 160,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 48,
  },
  filename: {
    fontSize: 12,
    color: '#8E8E93',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
});
