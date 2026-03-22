import React, {useState, useCallback, useRef} from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  Platform,
  Animated,
  PanResponder,
  LayoutAnimation,
  UIManager,
  useColorScheme,
  type ListRenderItemInfo,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import {loadInboxEntries, formatOrgDateForDisplay, deleteInboxEntry, type ParsedEntry} from '../services/orgParser';
import {OrgBodyRenderer} from '../components/OrgBodyRenderer';
import {Settings} from '../storage/settings';
import type {ContentType} from '../types';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ── Colors ────────────────────────────────────────────────────────────────────

function makeColors(dark: boolean) {
  return {
    background: dark ? '#1C1C1E' : '#F2F2F7',
    card: dark ? '#2C2C2E' : '#FFFFFF',
    primaryText: dark ? '#FFFFFF' : '#000000',
    secondaryText: '#8E8E93',
    separator: dark ? '#38383A' : '#C6C6C8',
    chevron: dark ? '#636366' : '#C7C7CC',
    bodyText: dark ? '#EBEBF5' : '#3C3C43',
  };
}

// ── Relative time ─────────────────────────────────────────────────────────────

function formatRelativeTime(orgDate: string | undefined): string {
  if (!orgDate) {return '';}
  const m = orgDate.match(/\[(\d{4})-(\d{2})-(\d{2})\s+\w+(?:\s+(\d{2}):(\d{2}))?\]/);
  if (!m) {return formatOrgDateForDisplay(orgDate);}
  const [, yyyy, mo, dd, hh = '0', min = '0'] = m;
  const date = new Date(parseInt(yyyy, 10), parseInt(mo, 10) - 1, parseInt(dd, 10), parseInt(hh, 10), parseInt(min, 10));
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  const diffH = Math.floor(diffMs / 3_600_000);
  const diffD = Math.floor(diffMs / 86_400_000);
  if (diffMin < 1) {return 'Just now';}
  if (diffMin < 60) {return `${diffMin}m ago`;}
  if (diffH < 24) {return `${diffH}h ago`;}
  if (diffD === 1) {return 'Yesterday';}
  if (diffD < 7) {return `${diffD}d ago`;}
  return formatOrgDateForDisplay(orgDate);
}

// ── Icons ─────────────────────────────────────────────────────────────────────

const CONTENT_ICONS: Record<ContentType, string> = {
  url: '🌐',
  text: '📝',
  image: '🏞',
  video: '🎬',
  audio: '🎵',
  file: '📎',
};

const DELETE_WIDTH = 80;

function OrgEntry({
  item,
  isExpanded,
  onPress,
  onDelete,
  attachmentsBasePath,
  colors,
}: {
  item: ParsedEntry;
  isExpanded: boolean;
  onPress: () => void;
  onDelete: () => void;
  attachmentsBasePath: string | undefined;
  colors: ReturnType<typeof makeColors>;
}) {
  const icon = CONTENT_ICONS[item.contentType];
  const dateStr = formatRelativeTime(item.created);
  const translateX = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > 5 && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderMove: (_, g) => {
        translateX.setValue(Math.min(0, g.dx));
      },
      onPanResponderRelease: (_, g) => {
        if (g.dx < -60) {
          Animated.spring(translateX, {
            toValue: -DELETE_WIDTH,
            useNativeDriver: true,
          }).start();
        } else {
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    }),
  ).current;

  const handleDelete = () => {
    Animated.spring(translateX, {toValue: 0, useNativeDriver: true}).start();
    onDelete();
  };

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {toValue: 0.97, useNativeDriver: true, speed: 50, bounciness: 0}).start();
  };
  const handlePressOut = () => {
    Animated.spring(scaleAnim, {toValue: 1, useNativeDriver: true, speed: 20, bounciness: 4}).start();
  };

  return (
    <Animated.View style={[styles.cardShadow, {backgroundColor: colors.card, transform: [{scale: scaleAnim}]}]}>
      <View style={styles.rowContainer}>
        <View style={styles.deleteAction}>
          <TouchableOpacity onPress={handleDelete} style={styles.deleteButton}>
            <Text style={styles.deleteLabel}>Delete</Text>
          </TouchableOpacity>
        </View>
        <Animated.View
          style={[styles.row, {backgroundColor: colors.card, transform: [{translateX}]}]}
          {...panResponder.panHandlers}>
          <Pressable onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut}>
            <View style={styles.rowHeader}>
              <Text style={styles.icon}>{icon}</Text>
              <View style={styles.rowMeta}>
                <Text style={[styles.heading, {color: colors.primaryText}]} numberOfLines={1} ellipsizeMode="tail">
                  {item.heading}
                </Text>
                {dateStr ? <Text style={[styles.date, {color: colors.secondaryText}]}>{dateStr}</Text> : null}
              </View>
              <Text style={[styles.chevron, {color: colors.chevron}, isExpanded && styles.chevronExpanded]}>
                ›
              </Text>
            </View>
            {isExpanded && item.body ? (
              <View style={styles.body}>
                <OrgBodyRenderer body={item.body} attachmentsBasePath={attachmentsBasePath} />
              </View>
            ) : null}
          </Pressable>
        </Animated.View>
      </View>
    </Animated.View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export function InboxScreen(): React.JSX.Element {
  const isDark = useColorScheme() === 'dark';
  const colors = makeColors(isDark);

  const attachmentsBasePath =
    Platform.OS === 'android'
      ? Settings.getAndroidSafUri()
      : Settings.getIosFolderUri()?.replace(/^file:\/\//, '');

  const [entries, setEntries] = useState<ParsedEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const result = await loadInboxEntries();
      setEntries(result);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to read inbox.org');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleDelete = useCallback(async (entry: ParsedEntry, index: number) => {
    try {
      await deleteInboxEntry(entry);
      setEntries(prev => prev.filter((_, i) => i !== index));
    } catch (e: any) {
      setError(e?.message ?? 'Failed to delete entry');
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  // ── Render helpers ──────────────────────────────────────────────────────────
  function renderItem({item, index}: ListRenderItemInfo<ParsedEntry>) {
    const isExpanded = expandedIndex === index;
    return (
      <OrgEntry
        isExpanded={isExpanded}
        item={item}
        attachmentsBasePath={attachmentsBasePath}
        colors={colors}
        onPress={() => {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          setExpandedIndex(isExpanded ? null : index);
        }}
        onDelete={() => handleDelete(item, index)}
      />
    );
  }


  // ── States ──────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={[styles.centered, {backgroundColor: colors.background}]}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.centered, {backgroundColor: colors.background}]}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={load}>
          <Text style={styles.retryLabel}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (entries.length === 0) {
    return (
      <View style={[styles.centered, {backgroundColor: colors.background}]}>
        <Text style={styles.emptyText}>
          {'No notes yet.\nShare something to get started.'}
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={entries}
      keyExtractor={(_, i) => String(i)}
      renderItem={renderItem}
      style={{backgroundColor: colors.background}}
      contentContainerStyle={[styles.list, {backgroundColor: colors.background}]}
    />
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#F2F2F7',
  },
  list: {
    backgroundColor: '#F2F2F7',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  cardShadow: {
    borderRadius: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.07,
    shadowRadius: 8,
    shadowOffset: {width: 0, height: 2},
    elevation: 2,
  },
  row: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    fontSize: 18,
    marginRight: 10,
    width: 26,
    textAlign: 'center',
  },
  rowMeta: {
    flex: 1,
  },
  heading: {
    fontSize: 15,
    fontWeight: '500',
    color: '#000000',
  },
  date: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2,
  },
  chevron: {
    fontSize: 20,
    color: '#C7C7CC',
    marginLeft: 8,
    transform: [{rotate: '0deg'}],
  },
  chevronExpanded: {
    transform: [{rotate: '90deg'}],
  },
  body: {
    marginTop: 8,
    marginLeft: 36,
    fontSize: 13,
    color: '#3C3C43',
    lineHeight: 18,
  },
  rowContainer: {
    overflow: 'hidden',
    borderRadius: 12,
  },
  deleteAction: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: DELETE_WIDTH,
    backgroundColor: '#FF3B30',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButton: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteLabel: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  emptyText: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 24,
  },
  errorText: {
    fontSize: 15,
    color: '#FF3B30',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: '#007AFF',
    borderRadius: 8,
  },
  retryLabel: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 15,
  },
});
