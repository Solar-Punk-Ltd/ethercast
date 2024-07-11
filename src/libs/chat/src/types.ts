import { HexString } from "@ethersphere/bee-js/dist/types/utils/hex";
import { Signature } from "ethers";
import { ETH_ADDRESS_LENGTH } from "./constants";

export type EthAddress = HexString<typeof ETH_ADDRESS_LENGTH>;

export interface ParticipantDetails {
    nickName: string;
    participant: string;
    key: string;
    stamp: string;
}

export interface MessageData {
    message: string;
    username: string;
    address: EthAddress;
    timestamp: number;
}
  
export interface User {
    username: string;
    address: EthAddress;
    timestamp: number;
    signature: Signature;
}
  
export interface UserWithIndex extends User {
    index: number;
}

export type Sha3Message = string | number[] | ArrayBuffer | Uint8Array;