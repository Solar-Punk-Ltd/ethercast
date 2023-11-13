import { BatchId, FeedManifestResult, FeedWriter, Reference as BeeReference, Bee } from '@ethersphere/bee-js';
import { Wallet } from 'ethers';
import { MantarayNode, Reference as MantarayReference, StorageSaver } from 'mantaray-js';
import builder from 'xmlbuilder';

import { getBee } from './bee';
import { bytesToHexString, hexStringToBytes, stringToBytes } from '../utils/formatters';

export class Stream {
  private INDEX_COUNTER = 1;
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
  private _mpdManifest: string;

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
      // this.creatMpdManifest();

      // const playlistResult = await this._bee.uploadData(stamp, this._mpdManifest);
      /*    this._mantaray.addFork(
        stringToBytes('Manifest.mpd'),
        hexStringToBytes(playlistResult.reference) as MantarayReference,
        {
          'Content-Type': 'application/dash+xml',
          Filename: 'Manifest.mpd',
        },
      ); */

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
    return `http://localhost:1633/bzz/${this._feedManifest.reference}/manifest.mpd`;
  }

  private async uploadChunk(stamp: BatchId, feedWriter: FeedWriter, chunk: Uint8Array) {
    const chunkResult = await this._bee.uploadData(stamp, chunk);
    const chunkNumber = this.getChunkNumber();

    this._mantaray.addFork(
      stringToBytes(`chunk_${chunkNumber}.webm`),
      hexStringToBytes(chunkResult.reference) as MantarayReference,
      {
        'Content-Type': 'video/webm',
        Filename: `chunk_${chunkNumber}.webm`,
      },
    );
    console.log(chunkNumber);

    const savedMantaray = await this._mantaray.save(this.createSaver(stamp));

    await feedWriter.upload(stamp, bytesToHexString(savedMantaray) as BeeReference);
  }

  private creatMpdManifest() {
    const isoNow = new Date().toISOString();

    const manifestObj = {
      // https://docs.unified-streaming.com/documentation/live/configure-dynamic-mpd.html#mpd-minimumupdateperiod
      MPD: {
        '@xmlns': 'urn:mpeg:dash:schema:mpd:2011',
        '@xmlns:xlink': 'http://www.w3.org/1999/xlink',
        '@xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
        '@xsi:schemaLocation':
          'urn:mpeg:DASH:schema:MPD:2011 http://standards.iso.org/ittf/PubliclyAvailableStandards/MPEG-DASH_schema_files/DASH-MPD.xsd',
        '@profiles': 'urn:mpeg:dash:profile:isoff-live:2011',
        '@type': 'dynamic',
        '@maxSegmentDuration': 'PT1S',
        '@minimumUpdatePeriod': 'PT5S',
        '@suggestedPresentationDelay': 'PT3S',
        '@timeShiftBufferDepth': 'PT15.8S',
        '@minBufferTime': 'PT3.9S',
        '@availabilityStartTime': isoNow,
        '@publishTime': isoNow,
        ProgramInformation: {
          Title: {
            '#text': 'Swarm live stream',
          },
        },
        Period: {
          '@id': 'P0',
          '@start': 'PT0S',
          AdaptationSet: {
            '@contentType': 'video',
            '@par': '16:9',
            '@maxWidth': '320',
            '@minWidth': '320',
            '@maxHeight': '240',
            '@minHeight': '240',
            '@maxFrameRate': '15',
            '@segmentAlignment': 'true',
            '@mimeType': 'video/webm',
            '@startWithSAP': '1',
            SegmentTemplate: {
              '@media': '$RepresentationID$/$Number$.webm',
              // '@initialization': '$RepresentationID$/init.webm',
              '@duration': '2',
              '@startNumber': '0',
              '@availabilityTimeOffset': '10',
            },
            Representation: {
              '@id': 'V300',
              '@bandwidth': '300000',
              '@width': '320',
              '@height': '240',
              '@sar': '1:1',
              '@frameRate': '15',
              '@codecs': 'vp9',
            },
          },
        },
      },
    };

    this._mpdManifest = builder.create(manifestObj).end({ pretty: true });
  }

  async initFeedWriter(stamp: string | BatchId) {
    this._feedManifest = await this._bee.createFeedManifest(stamp, 'sequence', this._topic, this._wallet.address);
    this._feedWriter = this._bee.makeFeedWriter('sequence', this._topic, this._privateKey);
  }

  createSaver(stamp: string | BatchId): StorageSaver {
    return async (data: Uint8Array) => {
      const { reference } = await this._bee.uploadData(stamp, data);
      return hexStringToBytes(reference) as MantarayReference;
    };
  }

  private getChunkNumber() {
    const specificTime = new Date('2023-11-13T00:00:00Z');
    const currentTime = new Date();
    const differenceInMilliseconds = currentTime.getTime() - specificTime.getTime();
    return Math.round(differenceInMilliseconds / 1000);
  }

  private incrementCounter() {
    this.INDEX_COUNTER++;
  }

  get mantaray() {
    return this._mantaray;
  }

  get feedWriter() {
    return this._feedWriter;
  }

  get feedManifest() {
    return this._feedManifest;
  }
}
