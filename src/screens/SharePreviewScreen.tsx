import React, {useCallback, useRef, useState} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  useColorScheme,
} from 'react-native';
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
  const primaryItem = items[0];
  const extraCount = items.length - 1;

  const [title, setTitle] = useState(() => deriveHeading(primaryItem));
  const titleEditedByUser = useRef(false);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

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
  const extraBadgeBg = isDark ? '#3A3A3C' : '#E5E5EA';
  const extraBadgeTextColor = isDark ? '#EBEBF5' : '#6C6C70';

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
            <Text style={[styles.headerButton, styles.saveButton]}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* ── Scrollable content ── */}
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled">

        <ContentPreview item={primaryItem} onTitleFetched={handleTitleFetched} />

        {extraCount > 0 && (
          <View style={[styles.extraBadge, {backgroundColor: extraBadgeBg}]}>
            <Text style={[styles.extraBadgeText, {color: extraBadgeTextColor}]}>
              +{extraCount} more {extraCount === 1 ? 'item' : 'items'}
            </Text>
          </View>
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
  saveButton: {
    color: '#007AFF',
    fontWeight: '600',
    textAlign: 'right',
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
  extraBadge: {
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#E5E5EA',
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  extraBadgeText: {
    fontSize: 13,
    color: '#6C6C70',
    fontWeight: '500',
  },
});
