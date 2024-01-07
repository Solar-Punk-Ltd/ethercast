import { Bee } from '@ethersphere/bee-js';

import { getBee } from './bee';

export class Player {
  private _mediaElement: HTMLMediaElement;
  private _mediaSource: any;
  private _bee: Bee;
  private _owner = '99957411ceccd48dd57ced0524e9ad7e98bd0f01';
  // there are no conventions yet so I choose 10 for the storage
  private _topic = '000000000000000000000000000000000000000000000000000000000000000A';

  constructor() {
    this._bee = getBee();
  }

  play() {
    this._mediaElement.src = URL.createObjectURL(this._mediaSource);
    this._mediaElement.play();
  }

  async attach(src: any, mediaElement: HTMLMediaElement) {
    const mediaSource = new MediaSource();
    this._mediaSource = mediaSource;
    this._mediaElement = mediaElement;

    const reader = this._bee.makeFeedReader('sequence', this._topic, this._owner);

    mediaSource.addEventListener('sourceopen', () => {
      const sourceBuffer = mediaSource.addSourceBuffer('video/webm; codecs="vp9"');
      setInterval(async () => {
        const segment = await reader.download();
        const s = await this._bee.downloadData(segment.reference);
        sourceBuffer.appendBuffer(s);
      }, 2000);
    });
  }
}
