import React, {useEffect, useState} from 'react';
import {View, Text, ActivityIndicator, StyleSheet, useColorScheme} from 'react-native';
import {fetchPageTitle} from '../../services/titleFetcher';
import type {SharedItem} from '../../types';

interface Props {
  item: SharedItem;
  /** Called when the title has been fetched so the parent can use it for the org heading */
  onTitleFetched?: (title: string) => void;
  /** Called when the title fetch completes (success or failure) */
  onTitleFetchComplete?: () => void;
}

export function UrlPreview({item, onTitleFetched, onTitleFetchComplete}: Props): React.JSX.Element {
  const isDark = useColorScheme() === 'dark';
  const [title, setTitle] = useState<string | undefined>(item.pageTitle);
  const [loading, setLoading] = useState(!item.pageTitle && !!item.weblink);

  useEffect(() => {
    if (!item.weblink || item.pageTitle) {return;}
    let cancelled = false;

    fetchPageTitle(item.weblink).then(fetched => {
      if (cancelled) {return;}
      if (fetched) {
        setTitle(fetched);
        onTitleFetched?.(fetched);
      }
    }).finally(() => {
      if (!cancelled) {
        setLoading(false);
        onTitleFetchComplete?.();
      }
    });

    return () => { cancelled = true; };
  }, [item.weblink, item.pageTitle, onTitleFetched]);

  const displayUrl = item.weblink ?? '';
  const hostname = (() => {
    try { return new URL(displayUrl).hostname; } catch { return displayUrl; }
  })();

  return (
    <View style={[styles.card, {backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7'}]}>
      <View style={styles.hostRow}>
        <View style={styles.favicon} />
        <Text style={styles.hostname} numberOfLines={1}>{hostname}</Text>
      </View>

      {loading ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color="#8E8E93" />
          <Text style={styles.loadingText}>Fetching title…</Text>
        </View>
      ) : (
        <Text style={[styles.title, {color: isDark ? '#FFFFFF' : '#1C1C1E'}]} numberOfLines={3}>
          {title ?? displayUrl}
        </Text>
      )}

      <Text style={styles.url} numberOfLines={2}>{displayUrl}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 10,
    padding: 14,
    gap: 6,
  },
  hostRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  favicon: {
    width: 14,
    height: 14,
    borderRadius: 3,
    backgroundColor: '#C7C7CC',
  },
  hostname: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '500',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 14,
    color: '#8E8E93',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 22,
  },
  url: {
    fontSize: 12,
    color: '#8E8E93',
    lineHeight: 16,
  },
});
