import { BatchId, FeedManifestResult, FeedWriter } from '@ethersphere/bee-js';
import { Wallet } from 'ethers';

import { getBee } from './bee';

const PRIVATE_KEY = 'cb35ff5ec82b182ef2c5fcbcaeb92120b453a013b107e98a9b4d93c39ce3f1d7';
const TOPIC = '000000000000000000000000000000000000000000000000000000000000000A';
const wallet = new Wallet(PRIVATE_KEY);
const bee = getBee();
let feedManifest: FeedManifestResult;
let feedWriter: FeedWriter;
let mediaRecorder: MediaRecorder;
let mediaStream: MediaStream;

export async function startStream(stamp: BatchId): Promise<void> {
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
      audio: false,
    });

    mediaRecorder = new MediaRecorder(mediaStream, {
      mimeType: 'video/webm; codecs=vp9',
    });

    await initFeed(stamp);

    mediaRecorder.ondataavailable = async (event) => {
      if (event.data.size > 0) {
        await uploadChunk(stamp, feedWriter, new Uint8Array(await event.data.arrayBuffer()));
      }
    };

    mediaRecorder.start(2000);
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

export function getFeedReference() {
  if (feedManifest) {
    return feedManifest.reference;
  }
  return null;
}

async function uploadChunk(stamp: BatchId, feedWriter: FeedWriter, chunk: Uint8Array) {
  const chunkResult = await bee.uploadData(stamp, chunk);

  await feedWriter.upload(stamp, chunkResult.reference);
}

async function initFeed(stamp: string | BatchId) {
  feedManifest = await bee.createFeedManifest(stamp, 'sequence', TOPIC, wallet.address);
  feedWriter = bee.makeFeedWriter('sequence', TOPIC, wallet.privateKey);
}
