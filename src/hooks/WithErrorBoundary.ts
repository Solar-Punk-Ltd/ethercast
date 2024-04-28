import { useError } from '../app/Error/ErrorContext';

export function WithErrorBoundary<T, Args extends any[]>(fn: (...args: Args) => T) {
  const { setError } = useError();

  const callback = (...props: Args): T => {
    try {
      return fn(...props) as T;
    } catch (error) {
      setError(error as Error);
      throw error;
    }
  };

  return callback;
}

type UnwrapPromise<T> = T extends Promise<infer U> ? U : T;

export function WithAsyncErrorBoundary<T, Args extends any[]>(fn: (...args: Args) => T) {
  const { setError } = useError();

  const callback = async (...props: Args): Promise<UnwrapPromise<T>> => {
    try {
      return (await fn(...props)) as UnwrapPromise<T>;
    } catch (error) {
      setError(error as Error);
      throw error;
    }
  };

  return callback;
}
