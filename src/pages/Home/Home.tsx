import { ListContainer } from '../../components/Containers/ListContainer';
import { VideoList } from '../../components/VideoList/VideoList';

import './Home.scss';

const items = [{}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}];

export function Home() {
  return (
    <div className="home">
      <ListContainer>
        <VideoList items={items} />
      </ListContainer>
    </div>
  );
}
