import { useLocation } from 'react-router-dom';
import clsx from 'clsx';

import streamIcon from '../../../assets/icons/camera-reels.svg';
import activeStreamIcon from '../../../assets/icons/camera-reels-fill.svg';
import homeIcon from '../../../assets/icons/house-door.svg';
import activeHomeIcon from '../../../assets/icons/house-door-fill.svg';
import searchIcon from '../../../assets/icons/search.svg';
import { ROUTES } from '../../../routes';

import { MenuItem } from './MenuItem';

import './Sidebar.scss';

interface SidebarProps {
  open: boolean;
}

const items = [
  {
    activeIconSrc: activeHomeIcon,
    iconSrc: homeIcon,
    title: 'Home',
    href: ROUTES.HOME,
  },
  {
    activeIconSrc: searchIcon,
    iconSrc: searchIcon,
    title: 'Search',
    href: ROUTES.SEARCH,
  },
  {
    activeIconSrc: activeStreamIcon,
    iconSrc: streamIcon,
    title: 'Stream',
    href: ROUTES.STREAM,
  },
];

export function Sidebar({ open }: SidebarProps) {
  const location = useLocation();
  const { pathname } = location;

  const isPathActive = (href: string, title: string) => {
    if (title === 'Home') {
      return pathname === '/';
    }

    return pathname.includes(href);
  };

  return (
    <div className={clsx('sidebar', open ? 'open' : '')}>
      <div className="menu-list">
        {items.map((item) => (
          <MenuItem
            key={item.title}
            iconSrc={isPathActive(item.href, item.title) ? item.activeIconSrc : item.iconSrc}
            title={item.title}
            href={item.href}
          />
        ))}
      </div>
    </div>
  );
}
