import { useError } from '../app/Error/ErrorContext';

export function WithErrorBoundary<T>(fn: any) {
  const { setError } = useError();

  const callback = (): T => {
    try {
      return fn() as T;
    } catch (error) {
      return setError(error as Error) as T;
    }
  };

  return callback;
}

export function WithAsyncErrorBoundary<T>(fn: any) {
  const { setError } = useError();

  const callback = async () => {
    try {
      return (await fn()) as T;
    } catch (error) {
      return setError(error as Error) as T;
    }
  };

  return callback;
}
