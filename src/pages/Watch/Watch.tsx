import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { Chat } from '../../components/Chat/Chat';
import { PlayerContainer } from '../../components/Containers/PlayerContainer';
import { JoinButton } from '../../components/JoinButton/JoinButton';
import { VideoList } from '../../components/VideoList/VideoList';
import { VideoPlayer } from '../../components/VideoPlayer/VideoPlayer';
import { ROUTES } from '../../routes';

import './Watch.scss';

const items = [{}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}];

export function Watch() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (!searchParams.has('a') && !searchParams.has('t')) {
      navigate(ROUTES.HOME);
    }
  }, [navigate, searchParams]);

  return (
    <div className="watch">
      <PlayerContainer>
        <VideoPlayer owner={searchParams.get('a')!} topic={searchParams.get('t')!} />
        <JoinButton onClick={() => ({})} />
        <VideoList items={items} />
      </PlayerContainer>
      <Chat owner={searchParams.get('a')!} topic={searchParams.get('t')!} />
    </div>
  );
}
