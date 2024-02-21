import { VideoListItem } from './VideoListItem/VideoListItem';

import './VideoList.scss';

interface VideoListProps {
  items: any[];
}

export function VideoList({ items }: VideoListProps) {
  return (
    <div className="video-list">
      {items.map((_item, i) => (
        <VideoListItem key={i} />
      ))}
    </div>
  );
}
