import { Utils } from '@solarpunk/bee-js';
import { Wallet, utils } from 'ethers';
export function getConsensualPrivateKey(resource) {
    if (Utils.isHexString(resource) && resource.length === 64) {
        return Utils.hexToBytes(resource);
    }
    return Utils.keccak256Hash(resource);
}
export function getGraffitiWallet(consensualPrivateKey) {
    const privateKeyBuffer = utils.hexlify(consensualPrivateKey);
    return new Wallet(privateKeyBuffer);
}
export function serializeGraffitiRecord(record) {
    return new TextEncoder().encode(JSON.stringify(record));
}
export function numberToFeedIndex(index) {
    const bytes = new Uint8Array(8);
    const dv = new DataView(bytes.buffer);
    dv.setUint32(4, index);
    return Utils.bytesToHex(bytes);
}
export function sleep(delay) {
    return new Promise((resolve) => {
        setTimeout(resolve, delay);
    });
}
