import { useState } from 'react';

import { Button } from '../../components/Button/Button';

import './ErrorModal.scss';

interface ErrorModalProps {
  error: Error;
  onClose: () => void;
}

export function ErrorModal({ error, onClose }: ErrorModalProps) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div role="alert" className="error-modal">
      <div className="error-container">
        <h2>Something went wrong!</h2>
        <div className="error-actions">
          <Button onClick={() => setShowDetails((d) => !d)}>{showDetails ? 'Close' : 'Show'} details</Button>
          <Button onClick={onClose}>Close</Button>
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
