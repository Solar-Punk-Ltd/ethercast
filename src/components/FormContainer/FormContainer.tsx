import React from 'react';
import clsx from 'clsx';

import './FormContainer.scss';

interface FormContainerProps {
  children: React.ReactNode;
  className?: string;
}

export const FormContainer = ({ children, className }: FormContainerProps) => {
  return <div className={clsx('form-container', className)}>{children}</div>;
};
