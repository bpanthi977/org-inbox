export type ContentType = 'url' | 'text' | 'image' | 'video' | 'audio' | 'file';

export interface SharedItem {
  contentType: ContentType;
  // URL shares
  weblink?: string;
  pageTitle?: string; // fetched async after receiving
  // Text shares
  text?: string;
  // File shares (image / video / audio / any file)
  filePath?: string; // temp path in app sandbox
  mimeType?: string;
  fileName?: string;
  fileSize?: number; // bytes
}

export interface OrgEntry {
  heading: string;
  createdAt: Date;
  body: string;
  note?: string;
}
