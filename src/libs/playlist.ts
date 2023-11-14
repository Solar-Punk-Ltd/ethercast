import { getTimeDiffInSeconds } from '../utils/date';

export class PlayList {
  private playlist: Record<string, any>;

  constructor(baseURL: string) {
    this.playlist = {
      baseURL,
      maxSegmentCount: 1000,
      suggestedDelay: 1,
      minUpdatePeriod: 4,
      availabilityStartTime: new Date(),
      segments: [],
    };
  }

  append() {
    const { segments, maxSegmentCount, baseURL } = this.playlist;

    if (segments.length >= maxSegmentCount) {
      this.playlist.segments.shift();
    }

    const newSegmentName = this.nextChunkNumber();
    this.playlist.segments.push(`${baseURL}/${newSegmentName}.webm`);

    return newSegmentName.toString();
  }

  parse(playlist: string) {
    this.playlist = JSON.parse(playlist);
  }

  toString() {
    return JSON.stringify(this.playlist);
  }

  private nextChunkNumber() {
    return getTimeDiffInSeconds(new Date(), this.playlist.availabilityStartTime);
  }
}
