import { Data, FeedReader } from '@ethersphere/bee-js';

import { sleep } from '../utils/common';
import { CLUSTER_ID, CLUSTER_TIMESTAMP, FIRST_SEGMENT_INDEX } from '../utils/constants';
import { decrementHexString, incrementHexString } from '../utils/operations';
import { findHexInUint8Array, parseVint } from '../utils/webm';

import { AsyncQueue } from './asyncQueue';
import { getBee } from './bee';

// TODO import this type from @ethersphere/bee-js
interface FeedUpdateResonse {
  feedIndex: string;
  feedIndexNext: string;
  reference: string;
}

export interface VideoDuration {
  duration: number;
  index: number;
}

let mediaElement: HTMLVideoElement;
let mediaSource: MediaSource;
let sourceBuffer: SourceBuffer;
let streamTimer: NodeJS.Timeout | null;
let reader: FeedReader;
let currIndex = '';
let seekIndex = '';
const bee = getBee();
const TIMESLICE = 2000;
let BUFFER = 5;

export async function getApproxDuration(): Promise<VideoDuration> {
  const metaFeedUpdateRes = await reader.download();
  const decimalIndex = parseInt(metaFeedUpdateRes.feedIndex, 16);
  return { duration: decimalIndex * TIMESLICE, index: decimalIndex };
}

export function getMediaElement() {
  return mediaElement;
}

export function setFeedReader(rawTopic: string, owner: string) {
  const topic = bee.makeFeedTopic(rawTopic);
  reader = bee.makeFeedReader('sequence', topic, owner);
  return reader;
}

export function setVolumeControl(volumeControl: HTMLInputElement) {
  volumeControl.addEventListener('input', () => {
    mediaElement.volume = +volumeControl.value / 100;
  });
}

export async function play() {
  if (!sourceBuffer) {
    mediaElement.src = URL.createObjectURL(mediaSource);
  }
  while (mediaSource.readyState !== 'open') {
    await sleep(100);
  }
  startAppending();
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
  setSeekIndex(index);
  play();
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

async function startAppending() {
  const { appendToSourceBuffer } = initSourceBuffer();

  if (!currIndex) {
    await initStream(appendToSourceBuffer);
  }

  const append = await appendBuffer(appendToSourceBuffer);
  const queue = new AsyncQueue({ indexed: false });
  streamTimer = setInterval(() => queue.enqueue(append), TIMESLICE);

  await sleep(BUFFER * 1000);
  BUFFER = 0;
  mediaElement.play();
}

function stopAppending() {
  mediaElement.pause();
  if (streamTimer) {
    clearInterval(streamTimer);
    streamTimer = null;
  }
}

async function initStream(appendToSourceBuffer: (data: Uint8Array) => void) {
  const firstCluster = (await findFirstCluster())!;
  currIndex = firstCluster.feedIndex;
  const initSegment = await createInitSegment(firstCluster.clusterIdIndex, firstCluster.segment);
  setMediaCurrentTime(initSegment);
  appendToSourceBuffer(initSegment);
}

async function appendBuffer(appendToSourceBuffer: (data: Uint8Array) => void) {
  let feedUpdateRes: FeedUpdateResonse;
  let prevIndex = '';

  return async () => {
    handleBuffer();
    BUFFER -= 1;

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
}

async function createInitSegment(clusterStartIndex: number, segment: Data) {
  const metaFeedUpdateRes = await reader.download({ index: FIRST_SEGMENT_INDEX });
  const meta = await bee.downloadData(metaFeedUpdateRes.reference);
  const initSegment = addMetaToClusterStartSegment(clusterStartIndex, meta, segment);
  return initSegment;
}

async function findFirstCluster() {
  let isClusterFound = false;
  let tempIndex = '0000000000000000';
  do {
    const feedUpdateRes = await reader.download({ index: seekIndex || tempIndex });
    const segment = await bee.downloadData(feedUpdateRes.reference);
    const clusterIdIndex = findHexInUint8Array(segment, CLUSTER_ID);

    if (clusterIdIndex !== -1) {
      isClusterFound = true;
      seekIndex = '';
      return {
        feedIndex: feedUpdateRes.feedIndexNext || incrementHexString(feedUpdateRes.feedIndex),
        clusterIdIndex,
        segment,
      };
    }
    tempIndex = incrementHexString(tempIndex);

    if (seekIndex) {
      seekIndex = decrementHexString(seekIndex);
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

function setSeekIndex(index: number) {
  seekIndex = index.toString(16).padStart(16, '0');
}

let DYNAMIC_BUFFER_INCREMENT = 0;
const MIN_LIVE_TRHESHOLD = 1;
function handleBuffer() {
  const bufferTimeRanges = sourceBuffer.buffered;
  const bufferEnd = bufferTimeRanges.end(bufferTimeRanges.length - 1);
  const diff = bufferEnd - mediaElement.currentTime;

  if (BUFFER > 0) {
    return;
  }

  if (diff <= MIN_LIVE_TRHESHOLD) {
    mediaElement.pause();
    console.log('Buffering...');
    BUFFER = 5 + DYNAMIC_BUFFER_INCREMENT;
    DYNAMIC_BUFFER_INCREMENT = BUFFER / 2;
  } else if (mediaElement.paused && diff >= MIN_LIVE_TRHESHOLD) {
    mediaElement.play();
    console.log('Buffering complete');
  }
}
