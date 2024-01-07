import React from 'react';
import clsx from 'clsx';

import './Button.scss';

interface ButtonProps {
  children?: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export const Button = ({ children, className, onClick }: ButtonProps) => {
  return (
    <button className={clsx('button', className)} type="button" onClick={onClick}>
      {children}
    </button>
  );
};
