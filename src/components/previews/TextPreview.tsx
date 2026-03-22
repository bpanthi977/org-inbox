import React, {useState} from 'react';
import {View, Text, TouchableOpacity, ScrollView, StyleSheet, useColorScheme} from 'react-native';
import type {SharedItem} from '../../types';

const COLLAPSED_LINES = 12;

interface Props {
  item: SharedItem;
}

export function TextPreview({item}: Props): React.JSX.Element {
  const isDark = useColorScheme() === 'dark';
  const text = item.text ?? '';
  const lines = text.split('\n');
  const isLong = lines.length > COLLAPSED_LINES;
  const [expanded, setExpanded] = useState(false);

  const displayText =
    isLong && !expanded ? lines.slice(0, COLLAPSED_LINES).join('\n') + '…' : text;

  return (
    <View style={[styles.container, {backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7'}]}>
      <ScrollView
        style={styles.scroll}
        scrollEnabled={expanded}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled>
        <Text style={[styles.text, {color: isDark ? '#EBEBF5' : '#1C1C1E'}]} selectable>
          {displayText}
        </Text>
      </ScrollView>
      {isLong && (
        <TouchableOpacity
          style={styles.toggle}
          onPress={() => setExpanded(e => !e)}
          accessibilityRole="button">
          <Text style={styles.toggleText}>
            {expanded ? 'Show less' : 'Show more'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 10,
    overflow: 'hidden',
  },
  scroll: {
    maxHeight: 260,
    padding: 14,
  },
  text: {
    fontSize: 15,
    lineHeight: 22,
  },
  toggle: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#C6C6C8',
    paddingVertical: 10,
    alignItems: 'center',
  },
  toggleText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
});
