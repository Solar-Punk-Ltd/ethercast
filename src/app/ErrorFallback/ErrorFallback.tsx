import { useState } from 'react';
import { useErrorBoundary } from 'react-error-boundary';

import { Button } from '../../components/Button/Button';

import './ErrorFallback.scss';

interface ErrorFallbackProps {
  error: Error;
}

export function ErrorFallback({ error }: ErrorFallbackProps) {
  const { resetBoundary } = useErrorBoundary();
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div role="alert" className="error-fallback">
      <div className="error-dialog">
        <p>Something went wrong!</p>
        <div className="error-actions">
          <Button onClick={resetBoundary}>Try again</Button>
          <Button onClick={() => setShowDetails((d) => !d)}>Show details</Button>
        </div>
        {showDetails && (
          <div className="error-details">
            <p>
              Name: {error.name} <br />
              Message: {error.message} <br />
              Stack: {error.stack}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
