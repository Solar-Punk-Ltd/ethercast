import { useEffect } from 'react';

import './ViewContainer.scss';
import ThumbUpOutlinedIcon from '@mui/icons-material/ThumbUpOutlined';
import ShareOutlinedIcon from '@mui/icons-material/ShareOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import ProfilePic from '../../../components/ProfilePic/ProfilePic';

interface ViewContainerProps {
  children: React.ReactNode[];
}

export function ViewContainer({ children }: ViewContainerProps) {
  useEffect(() => {
    const outerDiv = document.getElementById('view-container')!;
    const innerDiv = document.getElementById('view-secondary-actions')!;

    const scrollHandler = () => {
      const bottomValue = `-${outerDiv.scrollTop}px`;
      innerDiv.style.bottom = bottomValue;
    };
    outerDiv.addEventListener('scroll', scrollHandler);

    return () => {
      outerDiv.removeEventListener('scroll', scrollHandler);
    };
  }, []);

  return (
    <div id="view-container">
      <div className="video-header">
        <ProfilePic hash="654332423234234234234" width={40} height={40} />
        <div className="video-info">
          <div className="video-title">Video Title</div>
          <div>Video Description</div>
        </div>
      </div>
      <div className="video-section">{children[0]}</div>
      <div className="video-actions">
        <div style={{ display: 'flex' }}>
          <div className="likes">
            <ThumbUpOutlinedIcon sx={{ marginRight: '5px' }} /> 1254
          </div>
          <div className="share">
            <ShareOutlinedIcon sx={{ marginRight: '5px' }} /> 87
          </div>
        </div>
        <div className="viewers">
          <VisibilityOutlinedIcon sx={{ marginRight: '5px' }} /> 243
        </div>
      </div>

      <div id="view-secondary-actions">{children[1]}</div>
      <div className="list-section">{children[2]}</div>
    </div>
  );
}
