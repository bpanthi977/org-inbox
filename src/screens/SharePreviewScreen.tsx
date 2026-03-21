import React, {useCallback, useRef, useState} from 'react';
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

interface Props {
  item: SharedItem;
  onSave: () => void;
  onCancel: () => void;
}

export function SharePreviewScreen({item, onSave, onCancel}: Props): React.JSX.Element {
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  // pageTitle is fetched async by UrlPreview; we hold it here so orgFormatter can use it
  const fetchedTitle = useRef<string | undefined>(item.pageTitle);

  const handleTitleFetched = useCallback((title: string) => {
    fetchedTitle.current = title;
    // Mutate the item reference so orgFormatter picks it up
    item.pageTitle = title;
  }, [item]);

  const handleSave = useCallback(async () => {
    if (saving) {return;}

    if (!Settings.hasConfiguredPath()) {
      Alert.alert(
        'No folder configured',
        'Please choose an org file folder in Settings before saving.',
        [{text: 'OK'}],
      );
      return;
    }

    setSaving(true);
    try {
      // 1. Copy attachment if the item has a file
      let attachmentRelPath: string | undefined;
      const needsAttachment =
        item.contentType === 'image' ||
        item.contentType === 'video' ||
        item.contentType === 'audio' ||
        item.contentType === 'file';

      if (needsAttachment && item.filePath) {
        attachmentRelPath = await copyAttachment(item);
      }

      // 2. Format the org entry
      const orgEntry = formatOrgEntry(item, note, attachmentRelPath);

      // 3. Append to the .org file
      await appendToOrgFile(orgEntry);

      onSave();
    } catch (err: any) {
      setSaving(false);
      Alert.alert(
        'Save failed',
        err?.message ?? 'Could not write to the org file. Please check your folder settings.',
        [{text: 'OK'}],
      );
    }
  }, [saving, item, note, onSave]);

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

        <ContentPreview item={item} onTitleFetched={handleTitleFetched} />

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
});
