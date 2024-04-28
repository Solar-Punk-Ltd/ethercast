import { createContext, useContext, useState } from 'react';

export interface ErrorContextType {
  error: Error | null;
  setError: (error: Error | null) => void;
}

export const ErrorContext = createContext<ErrorContextType>({ setError: () => {}, error: null });

interface ErrorProviderProps {
  children: React.ReactNode;
}

export function ErrorProvider({ children }: ErrorProviderProps) {
  const [error, setError] = useState<Error | null>(null);

  return <ErrorContext.Provider value={{ setError, error }}>{children}</ErrorContext.Provider>;
}

export function useError(): ErrorContextType {
  return useContext(ErrorContext);
}
