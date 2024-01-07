import { BatchId, Bee, FeedManifestResult, FeedWriter } from '@ethersphere/bee-js';
import { Wallet } from 'ethers';

import { getBee } from './bee';

export class Stream {
  // random key for testing
  private _privateKey = 'cb35ff5ec82b182ef2c5fcbcaeb92120b453a013b107e98a9b4d93c39ce3f1d7';
  // there are no conventions yet so I choose 10 for the storage
  private _topic = '000000000000000000000000000000000000000000000000000000000000000A';
  private _wallet: Wallet;
  private _bee: Bee;
  private _feedManifest: FeedManifestResult;
  private _feedWriter: FeedWriter;
  private _mediaRecorder: MediaRecorder;
  private _mediaStream: MediaStream;

  constructor() {
    this._wallet = new Wallet(this._privateKey);
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

      this._mediaRecorder.ondataavailable = async (event) => {
        if (event.data.size > 0) {
          await this.uploadChunk(stamp, this._feedWriter, new Uint8Array(await event.data.arrayBuffer()));
        }
      };

      this._mediaRecorder.start(2000);
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
      return this._feedManifest.reference;
    }
    return null;
  }

  private async uploadChunk(stamp: BatchId, feedWriter: FeedWriter, chunk: Uint8Array) {
    const chunkResult = await this._bee.uploadData(stamp, chunk);

    await feedWriter.upload(stamp, chunkResult.reference);
  }

  private async initFeedWriter(stamp: string | BatchId) {
    this._feedManifest = await this._bee.createFeedManifest(stamp, 'sequence', this._topic, this._wallet.address);
    this._feedWriter = this._bee.makeFeedWriter('sequence', this._topic, this._wallet.privateKey);
  }
}
