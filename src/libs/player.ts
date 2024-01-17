import { Data } from '@ethersphere/bee-js';

import { CLUSTER_ID, CLUSTER_TIMESTAMP } from '../utils/constants';
import { findHexInUint8Array, parseVint } from '../utils/webm';

import { getBee } from './bee';

let mediaElement: HTMLVideoElement;
let mediaSource: MediaSource;
const bee = getBee();
const TIMESLICE = 1000;
const owner = '99957411ceccd48dd57ced0524e9ad7e98bd0f01';
const topic = '000000000000000000000000000000000000000000000000000000000000000A';
const reader = bee.makeFeedReader('sequence', topic, owner);

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

  mediaSource.addEventListener('sourceopen', async () => {
    const { appendToSourceBuffer } = initSourceBuffer();

    const firstCluster = (await findFirstCluster())!;
    const initSegment = await createInitSegment(firstCluster.clusterIdIndex, firstCluster.segment);
    setMediaCurrentTime(initSegment);

    appendToSourceBuffer(initSegment);
    setInterval(await appendBuffer(firstCluster.feedIndex, appendToSourceBuffer), TIMESLICE);
  });
}

async function appendBuffer(clusterFeedIndex: string, appendToSourceBuffer: (data: Uint8Array) => void) {
  // I can't import this type from @ethersphere/bee-js
  let feedUpdateRes: {
    feedIndex: string;
    feedIndexNext: string;
    reference: string;
  };
  let currIndex = clusterFeedIndex;
  let prevIndex = '';

  return async () => {
    try {
      feedUpdateRes = await reader.download({ index: currIndex });
      currIndex = incrementHexString(currIndex);
    } catch (error) {
      currIndex = prevIndex;
      return;
    }

    if (prevIndex === currIndex) {
      return;
    }

    const segment = await bee.downloadData(feedUpdateRes.reference);
    appendToSourceBuffer(segment);
    prevIndex = currIndex;
  };
}

function initSourceBuffer() {
  const mimeType = 'video/webm; codecs="vp9,opus"';
  const bufferQueue: Uint8Array[] = [];
  const sourceBuffer = mediaSource.addSourceBuffer(mimeType);

  const appendToSourceBuffer = (data: Uint8Array) => {
    if (sourceBuffer.updating || bufferQueue.length > 0) {
      bufferQueue.push(data);
    } else {
      sourceBuffer.appendBuffer(data);
    }
  };

  sourceBuffer.mode = 'segments';

  sourceBuffer.addEventListener('updateend', () => {
    if (bufferQueue.length > 0) {
      const nextData = bufferQueue.shift()!;
      sourceBuffer.appendBuffer(nextData);
    }
  });

  return { appendToSourceBuffer };
}

function setMediaCurrentTime(clusterSegment: Uint8Array) {
  const timestamp = getClusterTimestampInSeconds(clusterSegment);
  mediaElement.currentTime = timestamp;
}

async function createInitSegment(clusterStartIndex: number, segment: Data) {
  const metaFeedUpdateRes = await reader.download({ index: '0000000000000000' });
  const meta = await bee.downloadData(metaFeedUpdateRes.reference);
  const initSegment = addMetaToClusterStartSegment(clusterStartIndex, meta, segment);
  return initSegment;
}

async function findFirstCluster() {
  const isClusterFound = false;
  do {
    const feedUpdateRes = await reader.download();
    const segment = await bee.downloadData(feedUpdateRes.reference);
    const clusterIdIndex = findHexInUint8Array(segment, CLUSTER_ID);
    if (clusterIdIndex !== -1) {
      return { feedIndex: feedUpdateRes.feedIndexNext, clusterIdIndex, segment };
    }
    await sleep(TIMESLICE);
  } while (!isClusterFound);
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

function incrementHexString(hexString: string) {
  const num = BigInt('0x' + hexString);
  return (num + 1n).toString(16).padStart(16, '0');
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
