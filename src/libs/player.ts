import { Data } from '@ethersphere/bee-js';

import { CLUSTER_ID, CLUSTER_TIMESTAMP } from '../utils/constants';
import { decrementHexString, incrementHexString } from '../utils/operations';
import { findHexInUint8Array, parseVint } from '../utils/webm';

import { getBee } from './bee';

let mediaElement: HTMLVideoElement;
let mediaSource: MediaSource;
let streamTimer: NodeJS.Timeout | null;
let currIndex = '';
let sourceBuffer: SourceBuffer;
const bee = getBee();
const TIMESLICE = 1000;
const owner = '99957411ceccd48dd57ced0524e9ad7e98bd0f01';
const topic = '000000000000000000000000000000000000000000000000000000000000000A';
const reader = bee.makeFeedReader('sequence', topic, owner);

export async function getApproxDuration() {
  const metaFeedUpdateRes = await reader.download();
  const decimalIndex = parseInt(metaFeedUpdateRes.feedIndex, 16);
  return { duration: decimalIndex * TIMESLICE, index: decimalIndex };
}

export function getMediaElement() {
  return mediaElement;
}

export async function play(index?: string) {
  if (!sourceBuffer) {
    mediaElement.src = URL.createObjectURL(mediaSource);
  }
  while (mediaSource.readyState !== 'open') {
    await sleep(100);
  }
  startAppending(index || undefined);
}

export function pause() {
  stopAppending();
}

export function restart() {
  detach();
  attach(mediaElement);
  play();
}

export function seek(index: number) {
  detach();
  attach(mediaElement);
  play(index.toString(16).padStart(16, '0'));
}

export function setVolumeControl(volumeControl: HTMLInputElement) {
  volumeControl.addEventListener('input', () => {
    mediaElement.volume = +volumeControl.value / 100;
  });
}

export async function attach(video: HTMLVideoElement) {
  mediaSource = new MediaSource();
  mediaElement = video;
  video.addEventListener('error', (_e) => {
    console.error('Video error:', mediaElement?.error?.code, mediaElement?.error?.message);
  });
}

export function detach() {
  stopAppending();
  mediaSource = null!;
  sourceBuffer = null!;
  currIndex = '';
}

async function startAppending(index?: string) {
  const { appendToSourceBuffer } = initSourceBuffer();

  if (!currIndex) {
    await initStream(appendToSourceBuffer, index);
  }

  mediaElement.play();
  streamTimer = setInterval(await appendBuffer(appendToSourceBuffer), TIMESLICE);
}

function stopAppending() {
  mediaElement.pause();
  if (streamTimer) {
    clearInterval(streamTimer);
    streamTimer = null;
  }
}

async function initStream(appendToSourceBuffer: (data: Uint8Array) => void, index?: string) {
  const firstCluster = (await findFirstCluster(index))!;
  currIndex = firstCluster.feedIndex;
  const initSegment = await createInitSegment(firstCluster.clusterIdIndex, firstCluster.segment);
  setMediaCurrentTime(initSegment);
  appendToSourceBuffer(initSegment);
}

async function appendBuffer(appendToSourceBuffer: (data: Uint8Array) => void) {
  // TODO import this type from @ethersphere/bee-js
  let feedUpdateRes: {
    feedIndex: string;
    feedIndexNext: string;
    reference: string;
  };
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

  if (!sourceBuffer) {
    sourceBuffer = mediaSource.addSourceBuffer(mimeType);
    sourceBuffer.mode = 'segments';
  }

  sourceBuffer.addEventListener('updateend', () => {
    if (bufferQueue.length > 0) {
      const nextData = bufferQueue.shift()!;
      sourceBuffer.appendBuffer(nextData);
    }
  });

  const appendToSourceBuffer = (data: Uint8Array) => {
    if (sourceBuffer.updating || bufferQueue.length > 0) {
      bufferQueue.push(data);
    } else {
      sourceBuffer.appendBuffer(data);
    }
  };

  return { appendToSourceBuffer };
}

function setMediaCurrentTime(clusterSegment: Uint8Array) {
  const timestamp = getClusterTimestampInSeconds(clusterSegment);
  mediaElement.currentTime = timestamp;
  console.log(timestamp);
}

async function createInitSegment(clusterStartIndex: number, segment: Data) {
  const metaFeedUpdateRes = await reader.download({ index: '0000000000000000' });
  const meta = await bee.downloadData(metaFeedUpdateRes.reference);
  const initSegment = addMetaToClusterStartSegment(clusterStartIndex, meta, segment);
  return initSegment;
}

async function findFirstCluster(index?: string) {
  const isClusterFound = false;
  do {
    const feedUpdateRes = await reader.download(index ? { index } : {});
    const segment = await bee.downloadData(feedUpdateRes.reference);
    const clusterIdIndex = findHexInUint8Array(segment, CLUSTER_ID);
    if (clusterIdIndex !== -1) {
      return {
        feedIndex: feedUpdateRes.feedIndexNext || incrementHexString(feedUpdateRes.feedIndex),
        clusterIdIndex,
        segment,
      };
    }
    if (index) {
      index = decrementHexString(index);
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

function clearSourceBuffer() {
  if (sourceBuffer.buffered.length > 0) {
    const start = sourceBuffer.buffered.start(0);
    const end = sourceBuffer.buffered.end(sourceBuffer.buffered.length - 1);
    sourceBuffer.remove(start, end);
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
