import { BatchId, Bee, FeedManifestResult, FeedWriter, Reference as BeeReference } from '@ethersphere/bee-js';
import { Wallet } from 'ethers';
import { MantarayNode, Reference as MantarayReference, StorageSaver } from 'mantaray-js';

import { bytesToHexString, hexStringToBytes, stringToBytes } from '../utils/formatters';

import { getBee } from './bee';
import { PlayList } from './playlist';

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
  private _playlist: PlayList;

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
            ideal: 640,
          },
          height: {
            ideal: 480,
          },
          frameRate: { ideal: 30 },
        },
        audio: false,
      });

      this._mediaRecorder = new MediaRecorder(this._mediaStream, {
        mimeType: 'video/webm; codecs=vp9',
      });

      await this.initFeedWriter(stamp);
      this._playlist = new PlayList(`http://localhost:1633/bzz/${this._feedManifest.reference}`);

      this._mediaRecorder.ondataavailable = async (event) => {
        if (event.data.size > 0) {
          console.log(event);
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
    if (this._feedManifest) {
      return `http://localhost:1633/bzz/${this._feedManifest.reference}/playlist.txt`;
    }
    return null;
  }

  private async uploadChunk(stamp: BatchId, feedWriter: FeedWriter, chunk: Uint8Array) {
    const segmentName = this._playlist.append();

    const chunkResult = await this._bee.uploadData(stamp, chunk);
    this._mantaray.addFork(
      stringToBytes(`${segmentName}.webm`),
      hexStringToBytes(chunkResult.reference) as MantarayReference,
      {
        'Content-Type': 'video/webm',
        Filename: `${segmentName}.webm`,
      },
    );

    const playlistResult = await this._bee.uploadData(stamp, this._playlist.toString());
    this._mantaray.addFork(
      stringToBytes('playlist.txt'),
      hexStringToBytes(playlistResult.reference) as MantarayReference,
      {
        'Content-Type': 'text/plain',
        Filename: 'playlist.txt',
      },
    );

    const savedMantaray = await this._mantaray.save(this.createSaver(stamp));

    await feedWriter.upload(stamp, bytesToHexString(savedMantaray) as BeeReference);
  }

  private async initFeedWriter(stamp: string | BatchId) {
    this._feedManifest = await this._bee.createFeedManifest(stamp, 'sequence', this._topic, this._wallet.address);
    this._feedWriter = this._bee.makeFeedWriter('sequence', this._topic, this._privateKey);
  }

  private createSaver(stamp: string | BatchId): StorageSaver {
    return async (data: Uint8Array) => {
      const { reference } = await this._bee.uploadData(stamp, data);
      return hexStringToBytes(reference) as MantarayReference;
    };
  }
}
