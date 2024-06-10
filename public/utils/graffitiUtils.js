"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sleep = exports.numberToFeedIndex = exports.serializeGraffitiRecord = exports.getGraffitiWallet = exports.getConsensualPrivateKey = void 0;
const bee_js_1 = require("@solarpunk/bee-js");
const ethers_1 = require("ethers");
function getConsensualPrivateKey(resource) {
    if (bee_js_1.Utils.isHexString(resource) && resource.length === 64) {
        return bee_js_1.Utils.hexToBytes(resource);
    }
    return bee_js_1.Utils.keccak256Hash(resource);
}
exports.getConsensualPrivateKey = getConsensualPrivateKey;
function getGraffitiWallet(consensualPrivateKey) {
    const privateKeyBuffer = ethers_1.utils.hexlify(consensualPrivateKey);
    return new ethers_1.Wallet(privateKeyBuffer);
}
exports.getGraffitiWallet = getGraffitiWallet;
function serializeGraffitiRecord(record) {
    return new TextEncoder().encode(JSON.stringify(record));
}
exports.serializeGraffitiRecord = serializeGraffitiRecord;
function numberToFeedIndex(index) {
    const bytes = new Uint8Array(8);
    const dv = new DataView(bytes.buffer);
    dv.setUint32(4, index);
    return bee_js_1.Utils.bytesToHex(bytes);
}
exports.numberToFeedIndex = numberToFeedIndex;
function sleep(delay) {
    return new Promise((resolve) => {
        setTimeout(resolve, delay);
    });
}
exports.sleep = sleep;
