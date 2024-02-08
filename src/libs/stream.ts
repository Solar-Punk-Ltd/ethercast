import { BatchId, FeedManifestResult, FeedWriter } from '@ethersphere/bee-js';

import { CLUSTER_ID } from '../utils/constants';
import { findHexInUint8Array } from '../utils/webm';

import { AsyncQueue } from './asyncQueue';
import { getBee } from './bee';

const bee = getBee();
const TIMESLICE = 2000;
let feedManifest: FeedManifestResult;
let feedWriter: FeedWriter;
let mediaRecorder: MediaRecorder;
let mediaStream: MediaStream;

export async function startStream(signer: string, topic: string, stamp: BatchId): Promise<void> {
  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: {
          ideal: 640,
        },
        height: {
          ideal: 480,
        },
        frameRate: { ideal: 30 },
      },
      audio: true,
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

    mediaRecorder.start(TIMESLICE);
  } catch (error) {
    console.error('Error:', error);
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

async function initFeed(signer: string, rawTopic: string, stamp: string | BatchId) {
  const address = '05F2EA76E4aCA58E2745939C27762D25299cA1F9';
  const topic = bee.makeFeedTopic(rawTopic);
  feedManifest = await bee.createFeedManifest(stamp, 'sequence', topic, address);
  feedWriter = bee.makeFeedWriter('sequence', topic, signer);
}

function createInitData(segment: Uint8Array) {
  const clusterStartIndex = findHexInUint8Array(segment, CLUSTER_ID);
  const meta = segment.slice(0, clusterStartIndex);
  return meta;
}
