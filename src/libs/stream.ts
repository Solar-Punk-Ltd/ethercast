import { BatchId, FeedManifestResult, FeedWriter, Reference } from '@ethersphere/bee-js';
import { Wallet } from 'ethers';
import { types, stringify } from 'hls-parser';
import { fileOpen, directoryOpen, fileSave, supported } from 'browser-fs-access';

import { getBee } from './bee';
import { stringToHex } from '../utils/formatters';

// random key for testing
const privateKey = 'cb35ff5ec82b182ef2c5fcbcaeb92120b453a013b107e98a9b4d93c39ce3f1d7';
const wallet = new Wallet(privateKey);
const bee = getBee();

const { MediaPlaylist, Segment } = types;
const playlist = new MediaPlaylist({
  targetDuration: 1,
  playlistType: 'EVENT',
  version: 3,
  segments: [],
});

let feedManifest: FeedManifestResult;

export async function stream(stamp: string | BatchId): Promise<void> {
  try {
    const mediaStream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: {
          ideal: 320,
        },
        height: {
          ideal: 240,
        },
        frameRate: { ideal: 15 },
      },
      audio: false,
    });

    const mediaRecorder = new MediaRecorder(mediaStream, {
      mimeType: 'video/webm; codecs=vp9',
    });

    const feedWriter = await getFeedWriter(stamp);

    mediaRecorder.ondataavailable = async (event) => {
      if (event.data.size > 0) {
        await uploadChunk(stamp, feedWriter, new Uint8Array(await event.data.arrayBuffer()));
      }
    };

    mediaRecorder.start(1000);
  } catch (error) {
    console.error('Error:', error);
  }
}

async function uploadChunk(stamp: string | BatchId, feedWriter: FeedWriter, chunk: Uint8Array) {
  const chunkResult = await bee.uploadFile(stamp, chunk, 'chunk.webm', { contentType: 'video/webm' });

  const segment = new Segment({
    uri: `http://localhost:1633/bzz/${chunkResult.reference}`,
    duration: 1,
  });
  playlist.segments.push(segment);

  console.log(stringify(playlist));

  const playlistResult = await bee.uploadFile(stamp, stringify(playlist), 'playlist.m3u8', {
    contentType: 'application/x-mpegURL',
    deferred: true,
  });

  await feedWriter.upload(stamp, playlistResult.reference);
}

async function getFeedWriter(stamp: string | BatchId) {
  // there are no conventions yet so I choose 10 for the storage
  const topic = '000000000000000000000000000000000000000000000000000000000000000A';

  feedManifest = await bee.createFeedManifest(stamp, 'sequence', topic, wallet.address);
  const feedWriter = bee.makeFeedWriter('sequence', topic, privateKey);

  return feedWriter;
}

export function getPlaylistUrl() {
  return `http://localhost:1633/bzz/${feedManifest.reference}`;
}
