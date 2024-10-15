import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { playerBee, VideoPlayer } from 'swarm-stream-react-js';

import { PlayerContainer } from '../../components/Containers/PlayerContainer';
import { VideoList } from '../../components/VideoList/VideoList';
import { ROUTES } from '../../routes';

import './Watch.scss';

const items = [{}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}];

playerBee.setBee('http://localhost:1633');

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
        <VideoList items={items} />
      </PlayerContainer>
    </div>
  );
}
