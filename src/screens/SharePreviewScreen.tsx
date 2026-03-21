import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import type {SharedItem} from '../types';

interface Props {
  item: SharedItem;
  onSave: () => void;
  onCancel: () => void;
}

/**
 * Stub — full implementation in Phase 6.
 * Shows the shared item type and raw data for verification during Phase 4/5.
 */
export function SharePreviewScreen({item, onCancel}: Props): React.JSX.Element {
  return (
    <View style={styles.container}>
      <Text style={styles.type}>{item.contentType.toUpperCase()}</Text>
      <Text style={styles.data} numberOfLines={10}>
        {JSON.stringify(item, null, 2)}
      </Text>
      <Text style={styles.cancel} onPress={onCancel}>
        Cancel
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, padding: 24, backgroundColor: '#fff', justifyContent: 'center'},
  type: {fontSize: 12, fontWeight: '700', color: '#8E8E93', marginBottom: 8},
  data: {fontSize: 13, fontFamily: 'monospace', color: '#1C1C1E', marginBottom: 24},
  cancel: {color: '#FF3B30', fontSize: 16, textAlign: 'center'},
});
