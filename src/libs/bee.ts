import { Bee, BeeDebug } from '@ethersphere/bee-js';

let bee: Bee;
let beeDebug: BeeDebug;

export function getBee(url: string = 'http://localhost:1633') {
  if (!bee) {
    bee = new Bee(url);
  }

  return bee;
}

export function getBeeDebug(url: string = 'http://localhost:1635') {
  if (!beeDebug) {
    beeDebug = new BeeDebug(url);
  }

  return beeDebug;
}
