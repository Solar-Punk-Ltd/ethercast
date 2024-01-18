import React from 'react';
import clsx from 'clsx';

import './Button.scss';

export enum ButtonVariant {
  primary = 'primary',
  secondary = 'secondary',
  icon = 'icon',
}

interface ButtonProps {
  onClick?: () => void;
  children?: React.ReactNode;
  className?: string;
  variant?: ButtonVariant;
}

export const Button = ({ children, className, onClick, variant = ButtonVariant.primary }: ButtonProps) => {
  return (
    <button className={clsx('button', variant, className)} type="button" onClick={onClick}>
      {children}
    </button>
  );
};
