import {Platform} from 'react-native';
import {
  copyFile as safCopyFile,
  exists as safExists,
  mkdir as safMkdir,
} from 'react-native-saf-x';
import {copyFile as rnfsCopyFile, exists as rnfsExists, mkdir as rnfsMkdir} from '@dr.pogodin/react-native-fs';
import {Settings} from '../storage/settings';
import type {SharedItem} from '../types';

/**
 * Sanitise a filename: keep alphanumerics, dots, hyphens, underscores.
 * Replaces everything else with underscores.
 */
function sanitiseName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}

/**
 * Find a filename that does not collide with an existing file.
 * photo.jpg → photo_1.jpg → photo_2.jpg …
 */
async function deduplicatedName(
  checkExists: (fullPath: string) => Promise<boolean>,
  dir: string,
  name: string,
): Promise<string> {
  const dot = name.lastIndexOf('.');
  const base = dot >= 0 ? name.slice(0, dot) : name;
  const ext = dot >= 0 ? name.slice(dot) : '';

  let candidate = name;
  let n = 1;
  while (await checkExists(`${dir}/${candidate}`)) {
    candidate = `${base}_${n}${ext}`;
    n++;
  }
  return candidate;
}

/**
 * SAF-X exists() wrapper that returns false instead of throwing when the
 * path does not exist (so deduplicatedName works correctly).
 */
async function safExistsSafe(uriString: string): Promise<boolean> {
  try {
    return await safExists(uriString);
  } catch {
    return false;
  }
}

/**
 * Copies the shared file into the attachments/ subfolder next to inbox.org.
 *
 * Returns the relative path used in the org [[file:...]] link,
 * e.g. "attachments/photo.jpg".
 *
 * Android: SAF-X copyFile — handles content:// and file:// source URIs.
 * iOS: RNFS copyFile — works with the security-scoped file:// folder.
 */
export async function copyAttachment(item: SharedItem): Promise<string> {
  const srcPath = item.filePath!;
  const rawName =
    item.fileName ?? srcPath.split('/').pop() ?? 'attachment';
  const safeName = sanitiseName(rawName);

  if (Platform.OS === 'android') {
    const treeUri = Settings.getAndroidSafUri();
    if (!treeUri) {
      throw new Error('No folder configured. Please choose a folder in Settings.');
    }
    const attachDir = `${treeUri}/attachments`;

    const dirExists = await safExistsSafe(attachDir);
    if (!dirExists) {
      await safMkdir(attachDir);
    }

    const filename = await deduplicatedName(safExistsSafe, attachDir, safeName);
    await safCopyFile(srcPath, `${attachDir}/${filename}`, {
      replaceIfDestinationExists: false,
    });
    return `attachments/${filename}`;
  } else {
    const folderUri = Settings.getIosFolderUri();
    if (!folderUri) {
      throw new Error('No folder configured. Please choose a folder in Settings.');
    }
    const folderPath = folderUri.replace(/^file:\/\//, '');
    const attachDir = `${folderPath}/attachments`;

    const dirExists = await rnfsExists(attachDir);
    if (!dirExists) {
      await rnfsMkdir(attachDir);
    }

    const filename = await deduplicatedName(
      path => rnfsExists(path),
      attachDir,
      safeName,
    );
    await rnfsCopyFile(srcPath, `${attachDir}/${filename}`);
    return `attachments/${filename}`;
  }
}
