import {Platform} from 'react-native';
import {writeFile} from 'react-native-saf-x';
import {appendFile, writeFile as rnfsWriteFile} from '@dr.pogodin/react-native-fs';
import {Settings} from '../storage/settings';

const ORG_FILENAME = 'inbox.org';

/**
 * Appends an org-mode entry string to inbox.org in the configured folder.
 *
 * Android: SAF-X writeFile with append=true against the persisted tree URI.
 *   SAF-X supports path-appended tree URIs (treeUri + '/inbox.org'), so it
 *   traverses/creates the file within the tree automatically.
 *
 * iOS: RNFS appendFile against the security-scoped file:// folder URI.
 *   appendFile creates the file if it does not already exist.
 */
export async function writeOrgFile(content: string): Promise<void> {
  if (Platform.OS === 'android') {
    const treeUri = Settings.getAndroidSafUri();
    if (!treeUri) {
      throw new Error('No folder configured. Please choose a folder in Settings.');
    }
    await writeFile(`${treeUri}/${ORG_FILENAME}`, content, {
      encoding: 'utf8',
      append: false,
    });
  } else {
    const folderUri = Settings.getIosFolderUri();
    if (!folderUri) {
      throw new Error('No folder configured. Please choose a folder in Settings.');
    }
    const folderPath = folderUri.replace(/^file:\/\//, '');
    await rnfsWriteFile(`${folderPath}/${ORG_FILENAME}`, content, 'utf8');
  }
}

export async function appendToOrgFile(orgEntry: string): Promise<void> {
  if (Platform.OS === 'android') {
    const treeUri = Settings.getAndroidSafUri();
    if (!treeUri) {
      throw new Error('No folder configured. Please choose a folder in Settings.');
    }
    await writeFile(`${treeUri}/${ORG_FILENAME}`, orgEntry, {
      encoding: 'utf8',
      append: true,
    });
  } else {
    const folderUri = Settings.getIosFolderUri();
    if (!folderUri) {
      throw new Error('No folder configured. Please choose a folder in Settings.');
    }
    // RNFS expects a plain path, not a file:// URL
    const folderPath = folderUri.replace(/^file:\/\//, '');
    await appendFile(`${folderPath}/${ORG_FILENAME}`, orgEntry, 'utf8');
  }
}
