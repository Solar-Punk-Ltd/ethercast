import { Bee, BeeDebug } from '@ethersphere/bee-js';

let bee: Bee;
let beeDebug: BeeDebug;

export function getBee() {
  if (!bee) {
    bee = new Bee('http://localhost:1633');
  }

  return bee;
}

export function getBeeDebug() {
  if (!beeDebug) {
    beeDebug = new BeeDebug('http://localhost:1635');
  }

  return beeDebug;
}
