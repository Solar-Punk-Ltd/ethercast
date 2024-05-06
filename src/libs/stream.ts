import { BatchId, Bee, FeedWriter } from '@solarpunk/bee-js';

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
  videoDetails?: {
    width: number;
    height: number;
    frameRate: number;
  };
}

//const bee = new Bee('http://localhost:1633'); // Test address
const bee = new Bee("http://161.97.125.121:1933");

let feedWriter: FeedWriter;
let mediaRecorder: MediaRecorder;
let mediaStream: MediaStream;

export async function startStream(signer: Signer, topic: string, stamp: BatchId, options: Options): Promise<void> {
  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({
      video: options.video && {
        width: {
          ideal: options.videoDetails?.width,
        },
        height: {
          ideal: options.videoDetails?.height,
        },
        frameRate: { ideal: options.videoDetails?.frameRate },
      },
      audio: options.audio,
    });

    mediaRecorder = new MediaRecorder(mediaStream, {
      mimeType: 'video/webm; codecs=vp9,opus',
    });

    await initFeed(signer, topic, stamp);
    const queue = new AsyncQueue({ indexed: true });

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
  const chunkResult = await bee.uploadData(stamp, chunk);
  await feedWriter.upload(stamp, chunkResult.reference, { index });
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
