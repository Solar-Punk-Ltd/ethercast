import { Bee, BeeDebug } from '@ethersphere/bee-js';

let bee: Bee;
let beeDebug: BeeDebug;
const IP = '104.248.251.249';
// const IP = '104.248.241.12';

export function getBee() {
  if (!bee) {
    bee = new Bee(`http://${IP}:1633`);
  }

  return bee;
}

export function getBeeDebug() {
  if (!beeDebug) {
    beeDebug = new BeeDebug(`http://${IP}:1635`);
  }

  return beeDebug;
}
