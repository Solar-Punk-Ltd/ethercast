import { useErrorBoundary } from 'react-error-boundary';

export function WithErrorBoundary<T>(fn: any) {
  const { showBoundary } = useErrorBoundary();

  const callback = (): T | void => {
    try {
      return fn();
    } catch (error) {
      return showBoundary(error);
    }
  };

  return callback;
}
