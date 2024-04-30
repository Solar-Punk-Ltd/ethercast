import { Bee, Data, FeedReader } from '@ethersphere/bee-js';

import { sleep } from '../utils/common';
import { CLUSTER_ID, CLUSTER_TIMESTAMP, FIRST_SEGMENT_INDEX } from '../utils/constants';
import { decrementHexString, incrementHexString } from '../utils/operations';
import { findHexInUint8Array, parseVint } from '../utils/webm';

import { AsyncQueue } from './asyncQueue';

// TODO fix bee-js related types in general
// TODO import this type from @ethersphere/bee-js
interface FeedUpdateResponse {
  feedIndex: string;
  feedIndexNext: string;
  reference: string;
}

interface AttachOptions {
  media: HTMLVideoElement;
  address: string;
  topic: string;
  onEnd?: () => void;
  onPlay?: () => void;
  onPause?: () => void;
}

export interface VideoDuration {
  duration: number;
  index: number;
}

export interface PlayerOptions {
  timeslice: number;
  minLiveThreshold: number;
  initBufferTime: number;
  buffer: number;
  dynamicBufferIncrement: number;
}

let mediaElement: HTMLVideoElement;
let mediaSource: MediaSource;
let sourceBuffer: SourceBuffer;
let streamTimer: NodeJS.Timeout | null;
let reader: FeedReader;
let queue: AsyncQueue;
let currIndex = '';
let seekIndex = '';

const bee = new Bee('http://localhost:1633'); // Test address

let TIMESLICE = 500;
let MIN_LIVE_TRHESHOLD = 1;
let INIT_BUFFER_TIME = 0;
let BUFFER = 5;
let DYNAMIC_BUFFER_INCREMENT = 0;

export async function getApproxDuration(): Promise<VideoDuration> {
  const metaFeedUpdateRes = await reader.download();
  const decimalIndex = parseInt(metaFeedUpdateRes.feedIndex as string, 16);
  return { duration: decimalIndex * TIMESLICE, index: decimalIndex };
}

export function getMediaElement() {
  return mediaElement;
}

export function setPlayerOptions(options: PlayerOptions) {
  TIMESLICE = options.timeslice;
  MIN_LIVE_TRHESHOLD = options.minLiveThreshold;
  INIT_BUFFER_TIME = options.initBufferTime;
  BUFFER = options.buffer;
  DYNAMIC_BUFFER_INCREMENT = options.dynamicBufferIncrement;
}

export function setFeedReader(rawTopic: string, owner: string) {
  const topic = bee.makeFeedTopic(rawTopic);
  reader = bee.makeFeedReader('sequence', topic, owner);
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
  await startAppending();
}

export function pause() {
  mediaElement.pause();
}

export function restart() {
  /*   detach();
  attach(mediaElement); */
  play();
}

export function seek(index: number) {
  /*   detach();
  attach(mediaElement); */
  setSeekIndex(index);
  play();
}

export function attach(options: AttachOptions) {
  mediaSource = new MediaSource();
  mediaElement = options.media;
  setFeedReader(options.topic, options.address);

  mediaElement.addEventListener('error', (_e) => {
    console.error('Video error:', mediaElement?.error?.code, mediaElement?.error?.message);
  });
  mediaElement.addEventListener('play', () => {
    if (options.onPlay) {
      options.onPlay();
    }
    console.log('Play');
  });
  // mediaElement.addEventListener('playing', () => {
  //   /*     if (options.onPlay) {
  //     options.onPlay();
  //   } */
  //   console.log('Playing');
  // });
  mediaElement.addEventListener('pause', () => {
    /*     if (options.onPause) {
      options.onPause();
    } */
    pauseAppending();
    console.log('Paused');
  });
  mediaElement.addEventListener('ended', () => {
    /*     if (options.onEnd) {
      options.onEnd();
    } */
    console.log('Ended');
  });
}

export function detach() {
  pauseAppending();
  mediaSource = null!;
  sourceBuffer = null!;
  queue = null!;
  mediaElement = null!;
  reader = null!;
  currIndex = '';
  seekIndex = '';
}

async function startAppending() {
  const { appendToSourceBuffer } = initSourceBuffer();

  if (!currIndex) {
    await initStream(appendToSourceBuffer);
  }

  const append = appendBuffer(appendToSourceBuffer);
  queue = new AsyncQueue({ indexed: false, waitable: true });
  streamTimer = setInterval(() => queue.enqueue(append), TIMESLICE);

  await sleep(INIT_BUFFER_TIME);
  mediaElement.play();
}

async function continueAppending() {
  const { appendToSourceBuffer } = initSourceBuffer();

  const append = appendBuffer(appendToSourceBuffer);
  streamTimer = setInterval(() => queue.enqueue(append), TIMESLICE);

  mediaElement.play();
}

function pauseAppending() {
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

function appendBuffer(appendToSourceBuffer: (data: Uint8Array) => void) {
  let feedUpdateRes: FeedUpdateResponse;
  let prevIndex = '';

  return async () => {
    // handleBuffering();

    try {
      feedUpdateRes = (await reader.download({ index: currIndex })) as any;
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

    sourceBuffer.addEventListener('updateend', () => {
      if (bufferQueue.length > 0) {
        const nextData = bufferQueue.shift()!;
        sourceBuffer.appendBuffer(nextData);
      }
    });
  }

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
  let UNTIL_CLUSTER_IS_FOUND = true;
  while (UNTIL_CLUSTER_IS_FOUND) {
    const feedUpdateRes = await reader.download(seekIndex ? { index: seekIndex } : undefined);
    const segment = await bee.downloadData(feedUpdateRes.reference);
    const clusterIdIndex = findHexInUint8Array(segment, CLUSTER_ID);

    if (clusterIdIndex !== -1) {
      UNTIL_CLUSTER_IS_FOUND = false;
      seekIndex = '';
      return {
        feedIndex: feedUpdateRes.feedIndexNext || incrementHexString(feedUpdateRes.feedIndex as string),
        clusterIdIndex,
        segment,
      };
    }

    if (seekIndex) {
      seekIndex = decrementHexString(seekIndex);
    }
    await sleep(TIMESLICE);
  }
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

function handleBuffering() {
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

  BUFFER -= 1;
}
