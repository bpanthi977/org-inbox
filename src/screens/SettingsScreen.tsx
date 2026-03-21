import React, {useState, useCallback} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Alert,
  ScrollView,
} from 'react-native';
import {openDocumentTree} from 'react-native-saf-x';
import {pickDirectory} from '@react-native-documents/picker';
import {Settings} from '../storage/settings';

interface Props {
  onConfigured?: () => void;
  /** Show as onboarding banner (first launch, no path set yet) */
  showBanner?: boolean;
}

export function SettingsScreen({onConfigured, showBanner}: Props): React.JSX.Element {
  const [displayPath, setDisplayPath] = useState<string | undefined>(
    Settings.getDisplayPath(),
  );
  const [picking, setPicking] = useState(false);

  const pickFolder = useCallback(async () => {
    if (picking) {return;}
    setPicking(true);
    try {
      if (Platform.OS === 'android') {
        await pickFolderAndroid();
      } else {
        await pickFolderIOS();
      }
    } finally {
      setPicking(false);
    }
  }, [picking]);

  const pickFolderAndroid = async () => {
    try {
      const result = await openDocumentTree(true);
      if (result?.uri) {
        Settings.setAndroidSafUri(result.uri);
        setDisplayPath(Settings.getDisplayPath());
        onConfigured?.();
      }
    } catch (err: any) {
      if (err?.message?.includes('cancel') || err?.code === 'DOCUMENT_TREE_CANCELED') {
        return; // user cancelled — no error
      }
      Alert.alert('Error', 'Could not open folder picker. Please try again.');
    }
  };

  const pickFolderIOS = async () => {
    try {
      const result = await pickDirectory({
        requestLongTermAccess: true,
      });
      if (result) {
        const bookmark =
          result.bookmarkStatus === 'success' ? result.bookmark : '';
        Settings.setIosBookmark(bookmark);
        Settings.setIosFolderUri(result.uri);
        setDisplayPath(Settings.getDisplayPath());
        onConfigured?.();
      }
    } catch (err: any) {
      if (err?.code === 'DOCUMENT_PICKER_CANCELED') {
        return; // user cancelled
      }
      Alert.alert('Error', 'Could not open folder picker. Please try again.');
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled">

      {showBanner && (
        <View style={styles.banner}>
          <Text style={styles.bannerTitle}>Welcome to org-inbox</Text>
          <Text style={styles.bannerBody}>
            Choose a folder where your captures will be saved. The app will
            create an <Text style={styles.code}>inbox.org</Text> file there,
            which you can sync to your laptop with Syncthing or similar.
          </Text>
        </View>
      )}

      <Text style={styles.sectionLabel}>ORG FILE LOCATION</Text>

      <View style={styles.card}>
        {displayPath ? (
          <>
            <Text style={styles.pathLabel}>Current folder</Text>
            <Text style={styles.pathValue} numberOfLines={3}>
              {displayPath}
            </Text>
            <View style={styles.divider} />
          </>
        ) : (
          <Text style={styles.noPathText}>No folder selected yet.</Text>
        )}

        <TouchableOpacity
          style={[styles.button, picking && styles.buttonDisabled]}
          onPress={pickFolder}
          disabled={picking}
          accessibilityRole="button"
          accessibilityLabel="Choose org file folder">
          <Text style={styles.buttonText}>
            {picking
              ? 'Opening…'
              : displayPath
              ? 'Change Folder'
              : 'Choose Folder'}
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.hint}>
        Captures are saved as org entries in{' '}
        <Text style={styles.code}>inbox.org</Text> inside the chosen folder.
        Attachments go into an{' '}
        <Text style={styles.code}>attachments/</Text> subfolder.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  content: {
    padding: 20,
    paddingTop: 24,
  },
  banner: {
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 16,
    marginBottom: 28,
  },
  bannerTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 8,
  },
  bannerBody: {
    color: '#EBEBF5CC',
    fontSize: 14,
    lineHeight: 20,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6C6C70',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  pathLabel: {
    fontSize: 12,
    color: '#8E8E93',
    marginBottom: 4,
  },
  pathValue: {
    fontSize: 14,
    color: '#1C1C1E',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginBottom: 16,
  },
  noPathText: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 16,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#C6C6C8',
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  hint: {
    fontSize: 13,
    color: '#8E8E93',
    lineHeight: 18,
    marginLeft: 4,
  },
  code: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: '#636366',
  },
});
