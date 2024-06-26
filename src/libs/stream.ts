import { BatchId, Bee, FeedWriter, Reference } from '@ethersphere/bee-js';
import { makeChunkedFile } from '@fairdatasociety/bmt-js';

import { bytesToHex } from '../utils/beeJs/hex';
import { CLUSTER_ID } from '../utils/constants';
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

const bee = new Bee('http://localhost:1633'); // Test address
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

    let firstChunk = true;
    mediaRecorder.ondataavailable = async (event) => {
      if (event.data.size > 0) {
        const byteChunk = new Uint8Array(await event.data.arrayBuffer());

        if (firstChunk) {
          queue.enqueue((index?: string) => uploadChunk(stamp, createInitData(byteChunk), index!));
          firstChunk = false;
        }

        queue.enqueue((index?: string) => uploadChunk(stamp, byteChunk, index!));
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

async function uploadChunk(stamp: BatchId, chunk: Uint8Array, index: string) {
  bee.uploadData(stamp, chunk);

  // precalculate the reference
  const newChunk = makeChunkedFile(chunk);
  const newChunkRef = bytesToHex(newChunk.address()) as Reference;
  feedWriter.upload(stamp, newChunkRef, { index });
}

async function initFeed(signer: Signer, rawTopic: string, stamp: BatchId) {
  const topic = bee.makeFeedTopic(rawTopic);
  await bee.createFeedManifest(stamp, 'sequence', topic, signer.address);
  feedWriter = bee.makeFeedWriter('sequence', topic, signer.key);
}

function createInitData(segment: Uint8Array) {
  const clusterStartIndex = findHexInUint8Array(segment, CLUSTER_ID);
  const meta = segment.slice(0, clusterStartIndex);
  return meta;
}
