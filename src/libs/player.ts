import { Data } from '@ethersphere/bee-js';

import { CLUSTER_ID, CLUSTER_TIMESTAMP } from '../utils/constants';
import { findHexInUint8Array, parseVint } from '../utils/webm';

import { getBee } from './bee';

let mediaElement: HTMLVideoElement;
let mediaSource: MediaSource;
const bee = getBee();
const owner = '99957411ceccd48dd57ced0524e9ad7e98bd0f01';
const topic = '000000000000000000000000000000000000000000000000000000000000000A';

export function play() {
  mediaElement.src = URL.createObjectURL(mediaSource);

  mediaElement.play();
}

export async function attach(video: HTMLVideoElement) {
  mediaSource = new MediaSource();
  mediaElement = video;

  video.addEventListener('error', (_e) => {
    console.error('Video error:', mediaElement?.error?.code, mediaElement?.error?.message);
  });
  mediaSource.addEventListener('sourceopen', () => {
    setInterval(appenBuffer(), 1000);
  });
}

function appenBuffer() {
  let isStreamStart = true;
  const bufferQueue: Uint8Array[] = [];
  const mimeType = 'video/webm; codecs="vp9"';
  const sourceBuffer = mediaSource.addSourceBuffer(mimeType);
  const reader = bee.makeFeedReader('sequence', topic, owner);

  sourceBuffer.mode = 'segments';

  const appendToSourceBuffer = (data: Uint8Array) => {
    if (sourceBuffer.updating || bufferQueue.length > 0) {
      bufferQueue.push(data);
    } else {
      sourceBuffer.appendBuffer(data);
    }
  };

  sourceBuffer.addEventListener('updateend', () => {
    if (bufferQueue.length > 0) {
      const nextData = bufferQueue.shift()!;
      sourceBuffer.appendBuffer(nextData);
    }
  });

  let prevIndex = '';
  return async () => {
    const feedUpdateRes = await reader.download();
    if (feedUpdateRes.feedIndex === prevIndex) {
      console.log('mi van?');
      return;
    }
    prevIndex = feedUpdateRes.feedIndex;

    const segment = await bee.downloadData(feedUpdateRes.reference);
    const clusterStartIndex = findHexInUint8Array(segment, CLUSTER_ID);

    if (isStreamStart) {
      if (clusterStartIndex !== -1) {
        const metaFeedUpdateRes = await reader.download({ index: '0000000000000000' });
        const meta = await bee.downloadData(metaFeedUpdateRes.reference);

        const clusterStartSegment = addMetaToClusterStartSegment(clusterStartIndex, meta, segment);

        const timestamp = getClusterTimestampInSeconds(clusterStartSegment);
        mediaElement.currentTime = timestamp;

        appendToSourceBuffer(clusterStartSegment);
        isStreamStart = false;
      }
      return;
    }

    appendToSourceBuffer(segment);
  };
}

function addMetaToClusterStartSegment(clusterStartIndex: number, meta: Data, segment: Data): Uint8Array {
  const clusterData = segment.slice(clusterStartIndex);
  const metaAndClusterArray = new Uint8Array(meta.length + clusterData.length);
  metaAndClusterArray.set(meta);
  metaAndClusterArray.set(clusterData, meta.length);
  return metaAndClusterArray;
}

function getClusterTimestampInSeconds(segment: Uint8Array) {
  const index = findHexInUint8Array(segment, CLUSTER_TIMESTAMP);
  const vint = parseVint(segment, index + 1);
  return vint.value / 1000;
}

// const indexArray = Array.from({ length: 1000 }, (_, i) => i.toString(16).padStart(16, '0'));
