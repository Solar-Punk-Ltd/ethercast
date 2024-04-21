import { useError } from '../app/Error/ErrorContext';

export function WithErrorBoundary<T, Args extends any[]>(fn: (...args: Args) => T) {
  const { setError } = useError();

  const callback = (...props: Args): T | void => {
    try {
      return fn(...props) as T;
    } catch (error) {
      return setError(error as Error) as T;
    }
  };

  return callback;
}

export function WithAsyncErrorBoundary<T, Args extends any[]>(fn: (...args: Args) => T) {
  const { setError } = useError();

  const callback = async (...props: Args): Promise<T | void> => {
    try {
      return (await fn(...props)) as T;
    } catch (error) {
      return setError(error as Error) as T;
    }
  };

  return callback;
}
