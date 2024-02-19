import React from 'react';
import clsx from 'clsx';

import './Container.scss';

interface ContainerProps {
  children: React.ReactNode;
  className?: string;
}

export const Container = ({ children, className }: ContainerProps) => {
  return <div className={clsx('container', className)}>{children}</div>;
};
