import { BatchId, FeedManifestResult, FeedWriter, Signer } from '@ethersphere/bee-js';
import { ethers } from 'ethers';

import { CLUSTER_ID } from '../utils/constants';
import { findHexInUint8Array } from '../utils/webm';

import { getBee } from './bee';

// const PRIVATE_KEY = 'cb35ff5ec82b182ef2c5fcbcaeb92120b453a013b107e98a9b4d93c39ce3f1d7';
// const TOPIC = '  000000000000000000000000000000000000000000000000000000000000000A';
// const wallet = new Wallet(PRIVATE_KEY);
const bee = getBee();
const TIMESLICE = 1000;
// let feedManifest: FeedManifestResult;
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

    let firstChunk = true;
    mediaRecorder.ondataavailable = async (event) => {
      if (event.data.size > 0) {
        const byteChunk = new Uint8Array(await event.data.arrayBuffer());

        if (firstChunk) {
          await uploadChunk(stamp, feedWriter, createInitData(byteChunk));
          firstChunk = false;
        }
        await uploadChunk(stamp, feedWriter, byteChunk);
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

async function uploadChunk(stamp: BatchId, feedWriter: FeedWriter, chunk: Uint8Array) {
  const chunkResult = await bee.uploadData(stamp, chunk);
  await feedWriter.upload(stamp, chunkResult.reference);
}

async function initFeed(signer: string, rawTopic: string, stamp: string | BatchId) {
  // feedManifest = await bee.createFeedManifest(stamp, 'sequence', topic, signer.address);
  const topic = bee.makeFeedTopic(rawTopic);
  feedWriter = bee.makeFeedWriter('sequence', topic, signer);
}

function createInitData(segment: Uint8Array) {
  const clusterStartIndex = findHexInUint8Array(segment, CLUSTER_ID);
  const meta = segment.slice(0, clusterStartIndex);
  return meta;
}
