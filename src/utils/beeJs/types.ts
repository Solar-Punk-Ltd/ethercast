import { HexString } from './hex';

export const BATCH_ID_HEX_LENGTH = 64;
export const ADDRESS_HEX_LENGTH = 64;
export const ETH_ADDRESS_LENGTH = 42;

export type EthAddress = HexString<typeof ETH_ADDRESS_LENGTH>;
