import React from 'react';
import type {SharedItem} from '../types';
import {UrlPreview} from './previews/UrlPreview';
import {TextPreview} from './previews/TextPreview';
import {ImagePreview} from './previews/ImagePreview';
import {VideoPreview} from './previews/VideoPreview';
import {FilePreview} from './previews/FilePreview';

interface Props {
  item: SharedItem;
  onTitleFetched?: (title: string) => void;
  onTitleFetchComplete?: () => void;
}

export function ContentPreview({item, onTitleFetched, onTitleFetchComplete}: Props): React.JSX.Element {
  switch (item.contentType) {
    case 'url':
      return <UrlPreview item={item} onTitleFetched={onTitleFetched} onTitleFetchComplete={onTitleFetchComplete} />;
    case 'text':
      return <TextPreview item={item} />;
    case 'image':
      return <ImagePreview item={item} />;
    case 'video':
      return <VideoPreview item={item} />;
    case 'audio':
    case 'file':
    default:
      return <FilePreview item={item} />;
  }
}
