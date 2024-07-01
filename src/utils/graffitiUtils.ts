import { Utils } from '@solarpunk/bee-js';
import { BytesLike, utils, Wallet } from 'ethers';

import { Sha3Message } from '../libs/chat';

export function getConsensualPrivateKey(resource: Sha3Message) {
  if (Utils.isHexString(resource) && resource.length === 64) {
    return Utils.hexToBytes(resource);
  }

  return Utils.keccak256Hash(resource);
}

export function getGraffitiWallet(consensualPrivateKey: BytesLike) {
  const privateKeyBuffer = utils.hexlify(consensualPrivateKey);
  return new Wallet(privateKeyBuffer);
}

export function serializeGraffitiRecord(record: Record<any, any>) {
  return new TextEncoder().encode(JSON.stringify(record));
}

export function numberToFeedIndex(index: number) {
  const bytes = new Uint8Array(8);
  const dv = new DataView(bytes.buffer);
  dv.setUint32(4, index);

  return Utils.bytesToHex(bytes);
}

export function sleep(delay: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, delay);
  });
}
