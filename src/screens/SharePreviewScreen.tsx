import React, {useCallback, useRef, useState} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  FlatList,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  useColorScheme,
  useWindowDimensions,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {ContentPreview} from '../components/ContentPreview';
import {NoteInput} from '../components/NoteInput';
import {formatOrgEntry, formatOrgEntryMulti, deriveHeading} from '../services/orgFormatter';
import {appendToOrgFile} from '../services/fileStorage';
import {copyAttachment} from '../services/attachmentHandler';
import {Settings} from '../storage/settings';
import type {SharedItem} from '../types';

const LARGE_FILE_BYTES = 50 * 1024 * 1024; // 50 MB

const FILE_TYPES = new Set<SharedItem['contentType']>(['image', 'video', 'audio', 'file']);

interface Props {
  items: SharedItem[];
  onSave: () => void;
  onCancel: () => void;
}

export function SharePreviewScreen({items, onSave, onCancel}: Props): React.JSX.Element {
  const isDark = useColorScheme() === 'dark';
  const {width: screenWidth} = useWindowDimensions();
  const CARD_GAP = 8;
  const CARD_WIDTH = screenWidth - 32 - 20; // screen - outer padding(32) - peek(20)

  const primaryItem = items[0];

  const [title, setTitle] = useState(() => deriveHeading(primaryItem));
  const titleEditedByUser = useRef(false);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const viewabilityConfig = useRef({itemVisiblePercentThreshold: 50});
  const onViewableItemsChanged = useRef(({viewableItems}: any) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index ?? 0);
    }
  });

  // pageTitle fetched async by UrlPreview for the primary item
  const handleTitleFetched = useCallback((fetchedTitle: string) => {
    primaryItem.pageTitle = fetchedTitle;
    if (!titleEditedByUser.current) {
      setTitle(deriveHeading(primaryItem));
    }
  }, [primaryItem]);

  const doSave = useCallback(async () => {
    setSaving(true);
    try {
      let orgText: string;

      if (items.length > 1) {
        // Multiple items → single combined entry
        let paths: (string | undefined)[];
        try {
          paths = await Promise.all(
            items.map(item =>
              FILE_TYPES.has(item.contentType) && item.filePath
                ? copyAttachment(item)
                : Promise.resolve(undefined),
            ),
          );
        } catch (err: any) {
          setSaving(false);
          Alert.alert(
            'Copy failed',
            err?.message ?? 'Could not copy attachment to your org folder.',
            [{text: 'OK'}],
          );
          return;
        }
        orgText = formatOrgEntryMulti(items, paths, note, title);
      } else {
        // Single item → existing behaviour
        const item = items[0];
        let attachmentRelPath: string | undefined;
        if (FILE_TYPES.has(item.contentType) && item.filePath) {
          try {
            attachmentRelPath = await copyAttachment(item);
          } catch (err: any) {
            setSaving(false);
            Alert.alert(
              'Copy failed',
              err?.message ?? 'Could not copy attachment to your org folder.',
              [{text: 'OK'}],
            );
            return;
          }
        }
        orgText = formatOrgEntry(item, note, attachmentRelPath, title);
      }

      await appendToOrgFile(orgText);
      onSave();
    } catch (err: any) {
      setSaving(false);
      Alert.alert(
        'Save failed',
        err?.message ?? 'Could not write to the org file. Please check your folder settings.',
        [{text: 'OK'}],
      );
    }
  }, [items, note, title, onSave]);

  const handleSave = useCallback(() => {
    if (saving) {return;}

    if (!Settings.hasConfiguredPath()) {
      Alert.alert(
        'No folder configured',
        'Please choose an org file folder in Settings before saving.',
        [{text: 'OK'}],
      );
      return;
    }

    const largeFile = items.find(
      it => it.fileSize !== undefined && it.fileSize > LARGE_FILE_BYTES,
    );
    if (largeFile) {
      const mb = Math.round((largeFile.fileSize! / (1024 * 1024)));
      Alert.alert(
        'Large file',
        `"${largeFile.fileName ?? 'This file'}" is ${mb} MB. Copy it to your org folder?`,
        [
          {text: 'Cancel', style: 'cancel'},
          {text: 'Copy', onPress: doSave},
        ],
      );
      return;
    }

    doSave();
  }, [saving, items, doSave]);

  const bg = isDark ? '#1C1C1E' : '#F2F2F7';
  const headerTitleColor = isDark ? '#FFFFFF' : '#1C1C1E';
  const headerBorderColor = isDark ? '#38383A' : '#C6C6C8';

  return (
    <KeyboardAvoidingView
      style={[styles.flex, {backgroundColor: bg}]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={88}>

      {/* ── Header ── */}
      <View style={[styles.header, {backgroundColor: bg, borderBottomColor: headerBorderColor}]}>
        <TouchableOpacity
          onPress={onCancel}
          disabled={saving}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Cancel">
          <Text style={[styles.headerButton, styles.cancelButton]}>Cancel</Text>
        </TouchableOpacity>

        <Text style={[styles.headerTitle, {color: headerTitleColor}]}>Save to org</Text>

        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Save">
          {saving ? (
            <ActivityIndicator size="small" color="#007AFF" />
          ) : (
            <Text style={[styles.headerButton, styles.headerSaveText]}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* ── Scrollable content ── */}
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled">

        {items.length === 1 ? (
          <ContentPreview item={primaryItem} onTitleFetched={handleTitleFetched} />
        ) : (
          <>
            <FlatList
              horizontal
              data={items}
              keyExtractor={(_, i) => String(i)}
              showsHorizontalScrollIndicator={false}
              snapToInterval={CARD_WIDTH + CARD_GAP}
              decelerationRate="fast"
              contentContainerStyle={{paddingHorizontal: 16, gap: CARD_GAP}}
              style={[styles.carousel, {backgroundColor: bg}]}
              renderItem={({item, index}) => (
                <View style={{width: CARD_WIDTH}}>
                  <ContentPreview
                    item={item}
                    onTitleFetched={index === 0 ? handleTitleFetched : undefined}
                  />
                </View>
              )}
              onViewableItemsChanged={onViewableItemsChanged.current}
              viewabilityConfig={viewabilityConfig.current}
            />
            <View style={styles.dots}>
              {items.map((_, i) => (
                <View key={i} style={[styles.dot, i === currentIndex && styles.dotActive]} />
              ))}
            </View>
          </>
        )}

        <View style={styles.gap} />

        <View style={[styles.inputCard, {backgroundColor: isDark ? '#2C2C2E' : '#FFFFFF'}]}>
          <Text style={[styles.inputLabel, {color: isDark ? '#8E8E93' : '#6C6C70'}]}>TITLE</Text>
          <TextInput
            style={[styles.titleInput, {color: isDark ? '#FFFFFF' : '#1C1C1E'}]}
            value={title}
            onChangeText={text => {
              titleEditedByUser.current = true;
              setTitle(text);
            }}
            placeholder="Entry title"
            placeholderTextColor={isDark ? '#48484A' : '#C7C7CC'}
            returnKeyType="done"
            autoCapitalize="sentences"
            autoCorrect
          />
        </View>

        <View style={styles.gap} />

        <NoteInput value={note} onChangeText={setNote} />

      </ScrollView>

      {/* ── Save footer ── */}
      <SafeAreaView edges={['bottom']} style={[styles.footer, {backgroundColor: bg, borderTopColor: headerBorderColor}]}>
        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.85}
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          accessibilityRole="button"
          accessibilityLabel="Save">
          {saving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.saveButtonText}>Save to org</Text>
          )}
        </TouchableOpacity>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {flex: 1},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F2F2F7',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#C6C6C8',
    minHeight: 50,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  headerButton: {
    fontSize: 17,
    minWidth: 60,
  },
  cancelButton: {
    color: '#FF3B30',
  },
  headerSaveText: {
    color: '#007AFF',
    fontWeight: '600',
    textAlign: 'right',
  },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  saveButton: {
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  gap: {height: 16},
  inputCard: {
    borderRadius: 12,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 4,
  },
  titleInput: {
    fontSize: 15,
    lineHeight: 22,
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  carousel: {marginHorizontal: -16},
  dots: {flexDirection: 'row', justifyContent: 'center', marginTop: 8, gap: 6},
  dot: {width: 6, height: 6, borderRadius: 3, backgroundColor: '#C7C7CC'},
  dotActive: {backgroundColor: '#007AFF'},
});
