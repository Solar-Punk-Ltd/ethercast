import { ColorRing } from 'react-loader-spinner';

import './LoadingOverlay.scss';

export function LoadingOverlay() {
  return (
    <div className="loading-overlay">
      <ColorRing
        visible
        height={150}
        width={150}
        ariaLabel="color-ring-loading"
        wrapperStyle={{}}
        wrapperClass="loader"
      />
    </div>
  );
}
