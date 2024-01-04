import { useCallback, useEffect, useState } from 'react';
import { BatchId } from '@ethersphere/bee-js';

import { getStamp } from '../libs/stamp';

export const useStamp = () => {
  const [_stamp, setStamp] = useState<BatchId | null>(null);

  useEffect(() => {
    getStamp()
      .then((stmp) => setStamp(stmp))
      .catch((error) => console.error('Stamp error:', error));
  }, []);

  const stamp = useCallback(() => {
    if (_stamp) {
      return _stamp;
    }

    throw new Error('Stamp not available');
  }, [_stamp]);

  return { stamp };
};
