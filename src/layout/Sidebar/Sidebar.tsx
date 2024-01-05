import clsx from 'clsx';

import streamIcon from '../../assets/icons/camera-reels.svg';
import homeIcon from '../../assets/icons/house-door.svg';
import { ROUTES } from '../../routes';

import { MenuItem } from './MenuItem';

import './Sidebar.scss';

interface SidebarProps {
  open: boolean;
}

const items = [
  {
    iconSrc: homeIcon,
    title: 'Home',
    href: ROUTES.HOME,
  },
  {
    iconSrc: streamIcon,
    title: 'Stream',
    href: ROUTES.STREAM,
  },
];

export function Sidebar({ open }: SidebarProps) {
  return (
    <div className={clsx('sidebar', open ? 'open' : '')}>
      <div className="menu-list">
        {items.map((item) => (
          <MenuItem key={item.title} iconSrc={item.iconSrc} title={item.title} href={item.href} />
        ))}
      </div>
    </div>
  );
}
