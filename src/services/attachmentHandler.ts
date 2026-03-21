// Full implementation in Phase 7.
// Stubs are here so Phase 6 TypeScript compilation passes.

import type {SharedItem} from '../types';

/**
 * Copies the file from the shared item's temp path into the attachments/
 * subfolder next to the configured .org file.
 *
 * Returns the relative path to use in the org [[file:...]] link,
 * e.g. "attachments/photo.jpg".
 *
 * Platform-branched: SAF-X on Android, RNFS on iOS.
 */
export async function copyAttachment(_item: SharedItem): Promise<string> {
  throw new Error('attachmentHandler not yet implemented — coming in Phase 7');
}
