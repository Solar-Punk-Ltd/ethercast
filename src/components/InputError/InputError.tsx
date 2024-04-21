import clsx from 'clsx';

import './InputError.scss';

interface InputErrorProps {
  error?: string;
  className?: string;
}

export function InputError({ error, className }: InputErrorProps) {
  return (
    <div className={clsx('input-error-container', className)}>
      <p>{error}</p>
    </div>
  );
}
