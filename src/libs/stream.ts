import { BatchId, Bee, FeedWriter, RedundancyLevel, Reference } from '@ethersphere/bee-js';
import { makeChunkedFile } from '@fairdatasociety/bmt-js';

import { bytesToHex } from '../utils/beeJs/hex';
import { retryAsync, retryAwaitableAsync } from '../utils/common';
import { CLUSTER_ID } from '../utils/constants';
import { timeStampBytes } from '../utils/date';
import { findHexInUint8Array } from '../utils/webm';

import { AsyncQueue } from './asyncQueue';

interface Signer {
  address: string;
  key: string;
}

interface Options {
  video: boolean;
  audio: boolean;
  timeslice: number;
  videoBitsPerSecond: number;
}

const bee = new Bee('http://45.137.70.219:1833'); // Test address
// const bee = new Bee('http://localhost:1633');
let feedWriter: FeedWriter;
let mediaRecorder: MediaRecorder;
let mediaStream: MediaStream;

export async function startStream(signer: Signer, topic: string, stamp: BatchId, options: Options): Promise<void> {
  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({
      video: options.video,
      audio: options.audio,
    });

    mediaRecorder = new MediaRecorder(mediaStream, {
      mimeType: 'video/webm; codecs=vp9,opus',
      videoBitsPerSecond: options.videoBitsPerSecond,
    });

    await initFeed(signer, topic, stamp);
    const queue = new AsyncQueue({ indexed: true, waitable: true });

    let isFirstSegment = true;
    mediaRecorder.ondataavailable = async (event) => {
      if (event.data.size > 0) {
        const segment = new Uint8Array(await event.data.arrayBuffer());

        if (isFirstSegment) {
          queue.enqueue((index?: string) => uploadSegment(stamp, createInitData(segment), index!));
          isFirstSegment = false;
        }

        queue.enqueue((index?: string) => uploadSegment(stamp, segment, index!));
      }
    };

    mediaRecorder.start(options.timeslice);
  } catch (error) {
    stopStream();
    throw error;
  }
}

export function stopStream() {
  mediaRecorder.stop();
  mediaStream.getTracks().forEach((track) => track.stop());
}

export function isStreamOngoing() {
  return mediaStream?.getTracks().some((track) => track.readyState === 'live');
}

async function uploadSegment(stamp: BatchId, segment: Uint8Array, index: string) {
  retryAsync(() => bee.uploadData(stamp, segment, { redundancyLevel: 1 }));
  // await bee.uploadData(stamp, segment);

  // precalculate the reference
  const chunkedFile = makeChunkedFile(segment);
  /*   const newChunkRef = bytesToHex(chunkedFile.address()) as Reference; */
  const rootChunk = chunkedFile.rootChunk();
  // await feedWriter.upload(stamp, { chunkPayload: rootChunk.payload, chunkSpan: rootChunk.span() }, { index });

  retryAsync(() =>
    feedWriter.upload(stamp, { chunkPayload: rootChunk.payload, chunkSpan: rootChunk.span() }, { index }),
  );
}

async function initFeed(signer: Signer, rawTopic: string, stamp: BatchId) {
  const topic = bee.makeFeedTopic(rawTopic);
  await retryAwaitableAsync(() => bee.createFeedManifest(stamp, 'sequence', topic, signer.address));
  feedWriter = bee.makeFeedWriter('sequence', topic, signer.key);
}

function createInitData(segment: Uint8Array) {
  const clusterStartIndex = findHexInUint8Array(segment, CLUSTER_ID);
  const meta = segment.slice(0, clusterStartIndex);
  const metaWithTime = appendInitialTime(meta);
  return metaWithTime;
}

function appendInitialTime(meta: Uint8Array) {
  const currentTimestamp = Math.floor(Date.now() / 1000);
  const timestampArray = timeStampBytes(currentTimestamp);
  return new Uint8Array([...meta, ...timestampArray]);
}
