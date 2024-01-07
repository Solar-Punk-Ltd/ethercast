import { getBee } from './bee';

let mediaElement: HTMLMediaElement;
let mediaSource: any;
const bee = getBee();
const owner = '99957411ceccd48dd57ced0524e9ad7e98bd0f01';
const topic = '000000000000000000000000000000000000000000000000000000000000000A';

export function play() {
  mediaElement.src = URL.createObjectURL(mediaSource);
  mediaElement.play();
}

export async function attach() {
  const mediaSource = new MediaSource();

  const reader = bee.makeFeedReader('sequence', topic, owner);

  mediaSource.addEventListener('sourceopen', () => {
    const sourceBuffer = mediaSource.addSourceBuffer('video/webm; codecs="vp9"');
    setInterval(async () => {
      const segment = await reader.download();
      const s = await bee.downloadData(segment.reference);
      sourceBuffer.appendBuffer(s);
    }, 2000);
  });
}
