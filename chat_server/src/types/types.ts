export type RoomID = string;

export type Sha3Message = string | number[] | ArrayBuffer | Uint8Array;

export interface Message {
    message: string;
    name: string;
    timestamp: number;
}