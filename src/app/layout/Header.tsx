import MenuIcon from '../../assets/icons/list.svg';
import { Connect } from '../../components/Connect/Connect';

import './Header.scss';

interface HeaderProps {
  openSidebar: () => void;
}

export function Header({ openSidebar }: HeaderProps) {
  return (
    <header>
      <div className="menu-action-container">
        <button onClick={openSidebar}>
          <img src={MenuIcon}></img>
        </button>
      </div>
      <div>
        <Connect />
      </div>
    </header>
  );
}
