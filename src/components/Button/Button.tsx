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
  type?: 'button' | 'submit' | 'reset';
}

export const Button = ({ children, className, onClick, type, variant = ButtonVariant.primary }: ButtonProps) => {
  return (
    <button type={type} className={clsx('button', variant, className)} onClick={onClick}>
      {children}
    </button>
  );
};
