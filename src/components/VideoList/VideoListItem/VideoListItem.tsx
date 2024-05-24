import playIcon from '../../../assets/icons/play-btn.svg';

import './VideoListItem.scss';
import SmartDisplayOutlinedIcon from '@mui/icons-material/SmartDisplayOutlined';
import SmartDisplayIcon from '@mui/icons-material/SmartDisplay';

interface VideoListItemProps {}

export function VideoListItem(_: VideoListItemProps) {
  return (
    <div className="video-list-item">
      <SmartDisplayOutlinedIcon className="icon-default" fontSize="large" sx={{ color: 'white' }} />
      <SmartDisplayIcon className="icon-hover" fontSize="large" sx={{ color: 'white' }} />

      {/* <img alt="play" src={playIcon}></img> */}
    </div>
  );
}
