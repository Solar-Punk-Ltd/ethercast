import { BatchId, FeedManifestResult, FeedWriter, Reference as BeeReference } from '@ethersphere/bee-js';
import { Wallet } from 'ethers';
import { types, stringify } from 'hls-parser';
import { MantarayNode, Reference as MantarayReference, StorageSaver } from 'mantaray-js';

import { getBee } from './bee';
import { bytesToHexString, hexStringToBytes, stringToBytes, stringToHex } from '../utils/formatters';
import { MasterPlaylist } from 'hls-parser/types';

// random key for testing
const privateKey = 'cb35ff5ec82b182ef2c5fcbcaeb92120b453a013b107e98a9b4d93c39ce3f1d7';
const wallet = new Wallet(privateKey);
const mantaray = new MantarayNode();
const bee = getBee();

const { MediaPlaylist, Segment, Variant } = types;

const playlist = new MediaPlaylist({
  targetDuration: 1,
  version: 4,
  segments: [],
});

const masterPlaylist = new MasterPlaylist({
  variants: [
    new Variant({
      bandwidth: 800000,
      uri: 'http://localhost:1633/bzz/3853d9987ea81b63f1873b1d50c0a7f2f2c374064e1a3c9ba08d0fe0fdab7982/playlist.m3u8',
    }),
  ],
});

console.log(stringify(masterPlaylist));

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

    const playlistBlob = new Blob([stringify(masterPlaylist)], { type: 'application/x-mpegURL' });
    const playlistResult = await bee.uploadData(stamp, new Uint8Array(await playlistBlob.arrayBuffer()));
    mantaray.addFork(stringToBytes(`master.m3u8`), hexStringToBytes(playlistResult.reference) as MantarayReference);

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

let index = 0;
async function uploadChunk(stamp: string | BatchId, feedWriter: FeedWriter, chunk: Uint8Array) {
  const chunkResult = await bee.uploadData(stamp, chunk);
  mantaray.addFork(stringToBytes(`chunk${index}.webm`), hexStringToBytes(chunkResult.reference) as MantarayReference);

  const segment = new Segment({
    uri: `chunk${index}.webm`,
    duration: 1,
  });
  playlist.segments.push(segment);
  index++;

  const playlistBlob = new Blob([stringify(playlist)], { type: 'application/x-mpegURL' });
  const playlistResult = await bee.uploadData(stamp, new Uint8Array(await playlistBlob.arrayBuffer()));
  mantaray.addFork(stringToBytes(`playlist.m3u8`), hexStringToBytes(playlistResult.reference) as MantarayReference);

  const savedMantaray = await mantaray.save(createSaver(stamp));

  await feedWriter.upload(stamp, bytesToHexString(savedMantaray) as BeeReference);

  console.log(stringify(playlist));

  /*   const playlistResult = await bee.uploadFile(stamp, stringify(playlist), 'playlist.m3u8', {
    contentType: 'application/x-mpegURL',
    deferred: true,
  }); */

  // await feedWriter.upload(stamp, playlistResult.reference);
}

async function getFeedWriter(stamp: string | BatchId) {
  // there are no conventions yet so I choose 10 for the storage
  const topic = '000000000000000000000000000000000000000000000000000000000000000A';

  feedManifest = await bee.createFeedManifest(stamp, 'sequence', topic, wallet.address);
  const feedWriter = bee.makeFeedWriter('sequence', topic, privateKey);

  return feedWriter;
}

export function getPlaylistUrl() {
  return `http://localhost:1633/bzz/${feedManifest.reference}/master.m3u8`;
}

function createSaver(stamp: string | BatchId): StorageSaver {
  return async (data: Uint8Array) => {
    const { reference } = await bee.uploadData(stamp, data);
    return hexStringToBytes(reference) as MantarayReference;
  };
}
