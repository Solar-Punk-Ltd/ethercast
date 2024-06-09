import { Bee, Data, FeedReader } from '@ethersphere/bee-js';

import { bytesToHex } from '../utils/beeJs/hex';
import { retryAwaitableAsync, sleep } from '../utils/common';
import { CLUSTER_ID, CLUSTER_TIMESTAMP, FIRST_SEGMENT_INDEX, HEX_RADIX, TIMESTAMP_SCALE } from '../utils/constants';
import { bytesToTimestamp } from '../utils/date';
import { EventEmitter } from '../utils/eventEmitter';
import { decrementHexString, incrementHexString } from '../utils/operations';
import { findHexInUint8Array, parseVint } from '../utils/webm';

import { AsyncQueue } from './asyncQueue';

interface AttachOptions {
  media: HTMLVideoElement;
  address: string;
  topic: string;
}

interface AttachOptions {
  media: HTMLVideoElement;
  address: string;
  topic: string;
}

export interface VideoDuration {
  duration: number;
  index: number;
}

export interface Controls {
  play: () => Promise<void>;
  seek: (index: number) => Promise<void>;
  restart: () => Promise<void>;
  setVolumeControl: (volumeControl: HTMLInputElement) => void;
  pause: () => void;
  continueStream: () => void;
  getDuration: () => Promise<VideoDuration>;
  on: EventEmitter['on'];
  off: EventEmitter['off'];
}

export interface PlayerOptions {
  timeslice: number;
  minLiveThreshold: number;
  initBufferTime: number;
  buffer: number;
  dynamicBufferIncrement: number;
  initialTime: number;
}

interface SegmentBuffer {
  [key: string]: any;
  loading?: boolean;
  segment?: Uint8Array | null;
  error?: any;
}

// External libs
const bee = new Bee('http://45.137.70.219:1933'); // Test address
// const bee = new Bee('http://localhost:1633');
const emitter = new EventEmitter();
const segmentBuffer: SegmentBuffer = {};

// Functional vars
let mediaElement: HTMLVideoElement;
let mediaSource: MediaSource;
let sourceBuffer: SourceBuffer;
let streamTimer: NodeJS.Timeout | null;
let reader: FeedReader;
let processQueue: AsyncQueue;
let currIndex = '';
let seekIndex = '';

const settings: PlayerOptions = {
  timeslice: 2000,
  minLiveThreshold: 1,
  initBufferTime: 0,
  buffer: 5,
  dynamicBufferIncrement: 0,
  initialTime: 0,
};

const eventStates: Record<string, boolean> = {
  loadingPlaying: false,
  loadingDuration: false,
  isPlaying: false,
};

export const EVENTS = {
  LOADING_PLAYING_CHANGE: 'loadingPlaying',
  LOADING_DURATION_CHANGE: 'loadingPlaying',
  IS_PLAYING_CHANGE: 'isPlaying',
};

export function getMediaElement() {
  return mediaElement;
}

async function getApproxDuration(): Promise<VideoDuration> {
  const metaFeedUpdateRes = await reader.download();
  const decimalIndex = parseInt(metaFeedUpdateRes.feedIndex as string, HEX_RADIX);
  return { duration: decimalIndex * settings.timeslice, index: decimalIndex };
}

function setPlayerOptions(s: Partial<Record<keyof PlayerOptions, number>>) {
  Object.keys(s).map((k) => {
    const typedK = k as keyof PlayerOptions;
    if (s[typedK] !== undefined && s[typedK] !== null) {
      settings[typedK] = s[typedK]!;
    }
  });
}

function setFeedReader(rawTopic: string, owner: string) {
  const topic = bee.makeFeedTopic(rawTopic);
  reader = bee.makeFeedReader('sequence', topic, owner);
}

function setVolumeControl(volumeControl: HTMLInputElement) {
  volumeControl.addEventListener('input', () => {
    mediaElement.volume = +volumeControl.value / 100;
  });
}

async function play(settings?: { shouldCleanSourceBuffer: boolean }) {
  if (eventStates.loadingPlaying) {
    return;
  }

  emitEvent(EVENTS.LOADING_PLAYING_CHANGE, true);

  if (settings?.shouldCleanSourceBuffer) {
    await cleanSourceBuffer();
  }

  if (!sourceBuffer) {
    mediaElement.src = URL.createObjectURL(mediaSource);
  }
  while (mediaSource.readyState !== 'open') {
    await sleep(100);
  }
  startAppending();
}

function continueStream() {
  continueAppending();
}

function pause() {
  pauseAppending();
  mediaElement.pause();
  emitEvent(EVENTS.IS_PLAYING_CHANGE, false);
}

async function restart() {
  play({ shouldCleanSourceBuffer: true });
}

async function seek(index: number) {
  setSeekIndex(index);
  play({ shouldCleanSourceBuffer: true });
}

export function attach(options: AttachOptions): Controls {
  mediaSource = new MediaSource();
  mediaElement = options.media;
  setFeedReader(options.topic, options.address);

  // TODO handle these errors
  mediaElement.addEventListener('error', (_e) => {
    console.error('Video error:', mediaElement?.error?.code, mediaElement?.error?.message);
  });

  return {
    play,
    seek,
    restart,
    setVolumeControl,
    pause,
    continueStream,
    getDuration: getApproxDuration,
    on: emitter.on,
    off: emitter.off,
  };
}

export function detach() {
  pauseAppending();
  setDefaultEventStates();
  emitter.cleanAll();
  mediaSource = null!;
  sourceBuffer = null!;
  processQueue = null!;
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

  processQueue = new AsyncQueue({ indexed: false, waitable: true });
  const append = () => appendBuffer(appendToSourceBuffer);
  streamTimer = setInterval(() => processQueue.enqueue(append), settings.timeslice);

  await sleep(settings.initBufferTime);
  mediaElement.play();

  emitEvent(EVENTS.IS_PLAYING_CHANGE, true);
  emitEvent(EVENTS.LOADING_PLAYING_CHANGE, false);
}

function continueAppending() {
  const { appendToSourceBuffer } = initSourceBuffer();

  const append = () => appendBuffer(appendToSourceBuffer);
  streamTimer = setInterval(() => processQueue.enqueue(append), settings.timeslice);

  mediaElement.play();

  emitEvent(EVENTS.IS_PLAYING_CHANGE, true);
}

function pauseAppending() {
  if (streamTimer) {
    clearInterval(streamTimer);
    streamTimer = null;
  }
}

async function initStream(appendToSourceBuffer: (data: Uint8Array) => void) {
  const metaFeedUpdateRes = (await reader.downloadWrapped({ index: FIRST_SEGMENT_INDEX })) as any;
  const { meta, timestamp } = splitMetaWithTime(metaFeedUpdateRes.data);
  // setPlayerOptions({ timeslice: getTimestampScaleInSeconds(meta), initialTime: bytesToTimestamp(timestamp) });
  setPlayerOptions({ initialTime: bytesToTimestamp(timestamp) });

  const firstCluster = (await findFirstCluster())!;
  currIndex = firstCluster.feedIndex;
  const initSegment = addMetaToClusterStartSegment(meta, firstCluster.clusterIdIndex, firstCluster.segment);
  setMediaCurrentTime(initSegment);
  appendToSourceBuffer(initSegment);
}

async function appendBuffer(appendToSourceBuffer: (data: Uint8Array) => void) {
  try {
    const response = (await reader.downloadWrapped({ index: currIndex, stream: true })) as any;
    for await (const chunk of response.body) {
      appendToSourceBuffer(chunk);
    }
    currIndex = incrementHexString(currIndex);
  } catch (error) {
    console.error('Error with reader:', error);
  }
}

/* function appendBuffer(appendToSourceBuffer: (data: Uint8Array) => void) {
  return async () => {
    await loadSegmentBuffer(currIndex);

    if (segmentBuffer[currIndex]?.loading || segmentBuffer[currIndex]?.error) {
      return;
    }

    appendToSourceBuffer(segmentBuffer[currIndex].segment!);
    delete segmentBuffer[currIndex];

    currIndex = incrementHexString(currIndex);
  };
} */

function loadSegmentBuffer(currIndex: string) {
  const requestNum = 1;
  let promiseIndex = currIndex;

  return new Promise<void>((resolve, reject) => {
    for (let i = 0; i < requestNum; i++) {
      const currentIndex = promiseIndex;

      if (segmentBuffer[currentIndex]?.loading) {
        promiseIndex = incrementHexString(promiseIndex);
        continue;
      }

      if (segmentBuffer[currentIndex]?.segment) {
        promiseIndex = incrementHexString(promiseIndex);
        i--;
        continue;
      }

      segmentBuffer[currentIndex] = {
        loading: true,
        segment: null,
        error: null,
      };

      // fetchActualSegment(currentIndex, reject);
      promiseIndex = incrementHexString(promiseIndex);
    }

    resolve();
  });
}

const fetchActualSegment = async (index: string, appendToSourceBuffer: (data: Uint8Array) => void) => {
  try {
    const response = (await reader.downloadWrapped({ index, stream: true })) as any;
    /*     const content = response.arrayBuffer();
    appendToSourceBuffer(content);
  } catch (error) {
    console.error('Error with reader:', error);
  } */
    const reader2 = response.body.getReader();

    while (true) {
      const { value, done } = await reader2.read();
      if (done) break;
      appendToSourceBuffer(value);
    }
    currIndex = incrementHexString(index);
  } catch (error) {
    console.error('Error with reader:', error);
  }

  /*   reader
    .downloadWrapped({ index })
    .then((res) => {
      segmentBuffer[index] = {
        loading: false,
        segment: res.data,
        error: null,
      };
    })
    .catch((error) => {
      if (error.status !== 404) {
        console.error('Error with reader:', error);
      }
      segmentBuffer[index] = {
        loading: false,
        segment: null,
        error,
      };
      reject();
    }); */
};

function initSourceBuffer() {
  const mimeType = 'video/webm; codecs="vp9,opus"';
  // internal queue for sourceBuffer
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

async function findFirstCluster() {
  let UNTIL_CLUSTER_IS_FOUND = true;
  // let initIndex = geCurrInitIndex();
  let initIndex = '';
  let feedUpdateRes: any;

  while (UNTIL_CLUSTER_IS_FOUND) {
    try {
      if (!initIndex) {
        feedUpdateRes = (await reader.download()) as any;
        initIndex = feedUpdateRes.feedIndex;
      } else {
        feedUpdateRes = (await reader.downloadWrapped({ index: initIndex })) as any;
      }
      const segment = feedUpdateRes.data;

      const clusterIdIndex = findHexInUint8Array(segment, CLUSTER_ID);

      if (clusterIdIndex !== -1) {
        UNTIL_CLUSTER_IS_FOUND = false;
        seekIndex = '';
        return {
          feedIndex: incrementHexString(initIndex),
          clusterIdIndex,
          segment,
        };
      }

      if (seekIndex) {
        seekIndex = decrementHexString(seekIndex);
      } else {
        initIndex = incrementHexString(initIndex);
      }
    } catch (error) {
      // nothing for now
      console.log(error);
    } finally {
      await sleep(settings.timeslice);
    }
  }
}

function addMetaToClusterStartSegment(meta: Uint8Array, clusterStartIndex: number, segment: Data): Uint8Array {
  const clusterData = segment.slice(clusterStartIndex);
  const metaAndClusterArray = new Uint8Array(meta.length + clusterData.length);
  metaAndClusterArray.set(meta);
  metaAndClusterArray.set(clusterData, meta.length);
  return metaAndClusterArray;
}

function getClusterTimestampInSeconds(segment: Uint8Array) {
  const index = findHexInUint8Array(segment, CLUSTER_TIMESTAMP);
  const vint = parseVint(segment, index + CLUSTER_TIMESTAMP.length / 2);
  return vint.value / 1000;
}

function getTimestampScaleInSeconds(segment: Uint8Array) {
  const index = findHexInUint8Array(segment, TIMESTAMP_SCALE);
  const vint = parseVint(segment, index + TIMESTAMP_SCALE.length / 2);
  return vint.value / 1000;
}

function setSeekIndex(index: number) {
  seekIndex = index.toString(HEX_RADIX).padStart(HEX_RADIX, '0');
}

async function cleanSourceBuffer() {
  pauseAppending();
  await processQueue.clearQueue();
  sourceBuffer = null!;
  currIndex = '';
}

function emitEvent(event: string, value: boolean) {
  if (eventStates[event] !== value) {
    eventStates[event] = value;
    emitter.emit(event, value);
  }
}

function setDefaultEventStates() {
  Object.keys(eventStates).map((k) => {
    eventStates[k] = false;
  });
}

function splitMetaWithTime(byteArray: Uint8Array) {
  const meta = byteArray.subarray(0, byteArray.length - 4);
  const timestamp = byteArray.subarray(byteArray.length - 4);
  return { meta, timestamp };
}

function geCurrInitIndex() {
  const initialTime = settings.initialTime;
  const currentTime = Math.floor(Date.now() / 1000);
  const timesliceNumSinceStart = Math.floor((currentTime - initialTime) / (settings.timeslice / 1000));
  return timesliceNumSinceStart.toString(HEX_RADIX).padStart(HEX_RADIX, '0');
}

/* function handleBuffering() {
  const bufferTimeRanges = sourceBuffer.buffered;
  const bufferEnd = bufferTimeRanges.end(bufferTimeRanges.length - 1);
  const diff = bufferEnd - mediaElement.currentTime;

  if (settings.buffer > 0) {
    return;
  }

  if (diff <= settings.minLiveThreshold) {
    mediaElement.pause();
    console.log('Buffering...');
    setPlayerOptions({ buffer: 5 + settings.dynamicBufferIncrement, dynamicBufferIncrement: settings.buffer / 2 });
  } else if (mediaElement.paused && diff >= settings.minLiveThreshold) {
    mediaElement.play();
    console.log('Buffering complete');
  }

  setPlayerOptions({ buffer: settings.buffer - 1 });
} */
