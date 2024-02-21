import { Link } from 'react-router-dom';

import './MenuItem.scss';

interface MenuItemProps {
  iconSrc: string;
  title: string;
  href: string;
}

export function MenuItem({ iconSrc, title, href }: MenuItemProps) {
  return (
    <div className="menu-item">
      <Link to={href}>
        <img className="icon" src={iconSrc} />
        <span>{title}</span>
      </Link>
    </div>
  );
}
