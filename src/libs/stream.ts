import { BatchId, FeedManifestResult, FeedWriter, Reference as BeeReference, Bee } from '@ethersphere/bee-js';
import { Wallet } from 'ethers';
import { stringify } from 'hls-parser';
import { MasterPlaylist, MediaPlaylist, Segment, Variant } from 'hls-parser/types';
import { MantarayNode, Reference as MantarayReference, StorageSaver } from 'mantaray-js';

import { getBee } from './bee';
import { bytesToHexString, hexStringToBytes, stringToBytes } from '../utils/formatters';

export class Stream {
  // random key for testing
  private _privateKey = 'cb35ff5ec82b182ef2c5fcbcaeb92120b453a013b107e98a9b4d93c39ce3f1d7';
  // there are no conventions yet so I choose 10 for the storage
  private _topic = '000000000000000000000000000000000000000000000000000000000000000A';
  private _wallet: Wallet;
  private _mantaray: MantarayNode;
  private _bee: Bee;
  private _feedManifest: FeedManifestResult;
  private _feedWriter: FeedWriter;
  private _mediaRecorder: MediaRecorder;
  private _mediaStream: MediaStream;
  private _masterPlaylist: MasterPlaylist;
  private _mediaPlaylist: MediaPlaylist;

  constructor() {
    this._wallet = new Wallet(this._privateKey);
    this._mantaray = new MantarayNode();
    this._bee = getBee();
  }

  async start(stamp: BatchId): Promise<void> {
    try {
      this._mediaStream = await navigator.mediaDevices.getUserMedia({
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

      this._mediaRecorder = new MediaRecorder(this._mediaStream, {
        mimeType: 'video/webm; codecs=H264',
      });

      await this.initFeedWriter(stamp);
      this.createMasterPlaylist();
      this.createMediaPlaylist();

      const playlistResult = await this._bee.uploadData(stamp, stringify(this._masterPlaylist));
      this._mantaray.addFork(
        stringToBytes('master.m3u8'),
        hexStringToBytes(playlistResult.reference) as MantarayReference,
        {
          'Content-Type': 'application/x-mpegURL',
          Filename: 'master.m3u8',
        },
      );

      this._mediaRecorder.ondataavailable = async (event) => {
        if (event.data.size > 0) {
          await this.uploadChunk(stamp, this._feedWriter, new Uint8Array(await event.data.arrayBuffer()));
        }
      };

      this._mediaRecorder.start(1000);
    } catch (error) {
      console.error('Error:', error);
    }
  }

  stop = () => {
    this._mediaRecorder.stop();
    this._mediaStream.getTracks().forEach((track) => track.stop());
  };

  get playlistUrl() {
    return `http://localhost:1633/bzz/${this._feedManifest.reference}/master.m3u8`;
  }

  private async uploadChunk(stamp: BatchId, feedWriter: FeedWriter, chunk: Uint8Array) {
    let index = 0;

    const chunkResult = await this._bee.uploadData(stamp, chunk);
    this._mantaray.addFork(
      stringToBytes(`chunk${index}.webm`),
      hexStringToBytes(chunkResult.reference) as MantarayReference,
      {
        'Content-Type': 'video/webm',
        Filename: `chunk${index}.webm`,
      },
    );

    const segment = new Segment({
      uri: `chunk${index}.webm`,
      duration: 1,
    });
    this._mediaPlaylist.segments.push(segment);
    index++;

    const playlistResult = await this._bee.uploadData(stamp, stringify(this._mediaPlaylist));
    this._mantaray.addFork(
      stringToBytes('playlist.m3u8'),
      hexStringToBytes(playlistResult.reference) as MantarayReference,
      {
        'Content-Type': 'application/x-mpegURL',
        Filename: 'playlist.m3u8',
      },
    );

    const savedMantaray = await this._mantaray.save(this.createSaver(stamp));

    await feedWriter.upload(stamp, bytesToHexString(savedMantaray) as BeeReference);
  }

  private async initFeedWriter(stamp: string | BatchId) {
    this._feedManifest = await this._bee.createFeedManifest(stamp, 'sequence', this._topic, this._wallet.address);
    this._feedWriter = this._bee.makeFeedWriter('sequence', this._topic, this._privateKey);
  }

  private createMasterPlaylist() {
    this._masterPlaylist = new MasterPlaylist({
      variants: [
        new Variant({
          bandwidth: 800000,
          uri: 'playlist.m3u8',
        }),
      ],
    });
  }

  private createMediaPlaylist() {
    this._mediaPlaylist = new MediaPlaylist({
      targetDuration: 1,
      version: 4,
      segments: [],
    });
  }

  private createSaver(stamp: string | BatchId): StorageSaver {
    return async (data: Uint8Array) => {
      const { reference } = await this._bee.uploadData(stamp, data);
      return hexStringToBytes(reference) as MantarayReference;
    };
  }
}
