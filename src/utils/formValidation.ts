import { ethers } from 'ethers';

import { isHexString, isPrefixedHexString } from './beeJs/hex';
import { ADDRESS_HEX_LENGTH, BATCH_ID_HEX_LENGTH } from './beeJs/types';

/**
 * Verifies if the provided input is a HexString.
 *
 * TODO: Make Length mandatory: https://github.com/ethersphere/bee-js/issues/208
 *
 * @param s string input
 * @returns HexString or throws error
 */
function assertHexString(s: string, len?: number) {
  if (!isHexString(s, len)) {
    if (isPrefixedHexString(s)) {
      return 'Not valid non prefixed hex string (has 0x prefix)';
    }
    const lengthMsg = len ? ` of length ${len}` : '';
    return `Not valid hex string${lengthMsg}: ${s}`;
  }
  return true;
}

export function assertAddress(value: string) {
  return assertHexString(value, ADDRESS_HEX_LENGTH);
}

export function assertBatchId(value: string) {
  return assertHexString(value, BATCH_ID_HEX_LENGTH);
}

export function assertPositiveInteger(value: string) {
  const parsed = parseInt(value, 10);
  return (!isNaN(parsed) && parsed >= 0) || 'Value must be a non negative number';
}

export function assertAtLeastFourChars(value: string) {
  return value.length >= 4 || 'Topic must have at least four characters';
}

export function assertPublicAddress(value: string) {
  const address = value.startsWith('0x') ? value : `0x${value}`;
  try {
    // it throws an error if the address is invalid
    ethers.utils.getAddress(address);
    return true;
  } catch (error) {
    return 'This field must be a valid public address';
  }
}
