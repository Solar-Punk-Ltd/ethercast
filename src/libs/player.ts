import { fetchWrapper } from './fetch';

export class Player {
  private _mediaElement: HTMLMediaElement;
  private _mediaSource: any;
  private _playlist: Record<string, any>;
  private _src: string;
  private _index = 0;

  play() {
    setInterval(() => {
      fetchWrapper(this._src, 'text').then((playlist) => {
        this._playlist = JSON.parse(playlist);
      });
    }, 1000);
    this._mediaElement.src = URL.createObjectURL(this._mediaSource);
    this._mediaElement.play();
  }

  async attach(src: string, mediaElement: HTMLMediaElement) {
    const mediaSource = new MediaSource();
    this._mediaSource = mediaSource;
    this._mediaElement = mediaElement;
    this._src = src;
    this._playlist = JSON.parse(await fetchWrapper(src, 'text'));

    mediaSource.addEventListener('sourceopen', () => {
      const sourceBuffer = mediaSource.addSourceBuffer('video/webm; codecs="vp9"');
      setInterval(async () => {
        const segment = await this.getSegment();
        console.log(sourceBuffer);
        sourceBuffer.appendBuffer(new Uint8Array(segment));
      }, 1000);
    });
  }

  private async getSegment() {
    const segmentURL = this._playlist.segments[this._index];
    this._index++;
    return await fetchWrapper(segmentURL, 'arrayBuffer');
  }
}
