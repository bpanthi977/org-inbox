import React, {useCallback, useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import {ContentPreview} from '../components/ContentPreview';
import {NoteInput} from '../components/NoteInput';
import {formatOrgEntry} from '../services/orgFormatter';
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
  const primaryItem = items[0];
  const extraCount = items.length - 1;

  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  // pageTitle fetched async by UrlPreview for the primary item
  const handleTitleFetched = useCallback((title: string) => {
    primaryItem.pageTitle = title;
  }, [primaryItem]);

  const doSave = useCallback(async () => {
    setSaving(true);
    try {
      let combinedEntries = '';
      for (let i = 0; i < items.length; i++) {
        const sharedItem = items[i];
        // Note is attached to the first item only
        const itemNote = i === 0 ? note : '';

        let attachmentRelPath: string | undefined;
        if (FILE_TYPES.has(sharedItem.contentType) && sharedItem.filePath) {
          attachmentRelPath = await copyAttachment(sharedItem);
        }

        combinedEntries += formatOrgEntry(sharedItem, itemNote, attachmentRelPath);
      }

      await appendToOrgFile(combinedEntries);
      onSave();
    } catch (err: any) {
      setSaving(false);
      Alert.alert(
        'Save failed',
        err?.message ?? 'Could not write to the org file. Please check your folder settings.',
        [{text: 'OK'}],
      );
    }
  }, [items, note, onSave]);

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

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={88}>

      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={onCancel}
          disabled={saving}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Cancel">
          <Text style={[styles.headerButton, styles.cancelButton]}>Cancel</Text>
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Save to org</Text>

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
          <View style={styles.extraBadge}>
            <Text style={styles.extraBadgeText}>
              +{extraCount} more {extraCount === 1 ? 'item' : 'items'}
            </Text>
          </View>
        )}

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
