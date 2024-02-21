import playIcon from '../../../assets/icons/play-btn.svg';

import './VideoListItem.scss';

interface VideoListItemProps {}

export function VideoListItem(_: VideoListItemProps) {
  return (
    <div className="video-list-item">
      <img alt="play" src={playIcon}></img>
    </div>
  );
}
