import { Utils } from '@ethersphere/bee-js'
import { BytesLike, Wallet, hexlify } from 'ethers'
import { Sha3Message } from '../types/types';


export function getConsensualPrivateKey(resource: Sha3Message) {
    if (Utils.isHexString(resource) && resource.length === 64) {
        return Utils.hexToBytes(resource)
    }

    return Utils.keccak256Hash(resource)
}

export function getGraffitiWallet(consensualPrivateKey: BytesLike) {
    const privateKeyBuffer = hexlify(consensualPrivateKey);
    return new Wallet(privateKeyBuffer)
}

export function serializeGraffitiRecord(record: Record<any, any>) { 
    return new TextEncoder().encode(JSON.stringify(record))
}

export function numberToFeedIndex(index: number) {
    const bytes = new Uint8Array(8)
    const dv = new DataView(bytes.buffer)
    dv.setUint32(4, index)

    return Utils.bytesToHex(bytes)
}

export function sleep(delay: number) {
    const start = new Date().getTime();
    while (new Date().getTime() < start + delay);
}