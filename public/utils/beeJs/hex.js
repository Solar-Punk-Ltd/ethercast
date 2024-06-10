"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bytesToHex = exports.isPrefixedHexString = exports.isHexString = void 0;
/**
 * Type guard for HexStrings.
 * Requires no 0x prefix!
 *
 * TODO: Make Length mandatory: https://github.com/ethersphere/bee-js/issues/208
 *
 * @param s string input
 * @param len expected length of the HexString
 */
function isHexString(s, len) {
    return typeof s === 'string' && /^[0-9a-f]+$/i.test(s) && (!len || s.length === len);
}
exports.isHexString = isHexString;
/**
 * Type guard for PrefixedHexStrings.
 * Does enforce presence of 0x prefix!
 *
 * @param s string input
 */
function isPrefixedHexString(s) {
    return typeof s === 'string' && /^0x[0-9a-f]+$/i.test(s);
}
exports.isPrefixedHexString = isPrefixedHexString;
/**
 * Converts array of number or Uint8Array to HexString without prefix.
 *
 * @param bytes   The input array
 * @param len     The length of the non prefixed HexString
 */
function bytesToHex(bytes, len) {
    const hexByte = (n) => n.toString(16).padStart(2, '0');
    const hex = Array.from(bytes, hexByte).join('');
    // TODO: Make Length mandatory: https://github.com/ethersphere/bee-js/issues/208
    if (len && hex.length !== len) {
        throw new TypeError(`Resulting HexString does not have expected length ${len}: ${hex}`);
    }
    return hex;
}
exports.bytesToHex = bytesToHex;
