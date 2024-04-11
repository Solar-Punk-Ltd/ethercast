import { BatchId, Bee, FeedReader, FeedWriter, Signer, Utils } from "@ethersphere/bee-js";
import { getConsensualPrivateKey, getGraffitiWallet, numberToFeedIndex, serializeGraffitiRecord, sleep } from '../utils/graffitiUtils';

export type RoomID = string;

export type Sha3Message = string | number[] | ArrayBuffer | Uint8Array;


// Initialize the bee instance
const bee = new Bee("http://localhost:1633");

export interface MessageData {
    message: string;
    name: string;
    timestamp: number;
  }

const ConsensusID = "SwarmStream";

export async function initChatRoom(topic: string, stamp: BatchId): Promise<void> {
    const roomId = generateRoomId(topic);                                       // For every video stream, we create a new chat room
    const privateKey = getConsensualPrivateKey(roomId);                         // This is private key that every chat participant should have access to
    const wallet = getGraffitiWallet(privateKey);

    const graffitiSigner: Signer = {
        address: Utils.hexToBytes(wallet.address.slice(2)), // convert hex string to Uint8Array
        sign: async (data: string | Uint8Array) => {
            return await wallet.signMessage(data)
        },
    }

    const consensusHash = Utils.keccak256Hash(ConsensusID)
    let isRetrievable = false;
    try {
        isRetrievable = await bee.isFeedRetrievable("sequence", graffitiSigner.address, consensusHash)
    }catch (Error) {
        console.log("feed does not exist")
    }

    console.log("chat room exist,no need to reinitialize",isRetrievable)
    if (isRetrievable){
        //return true
    }

    const manifestResult = await bee.createFeedManifest(stamp, "sequence", consensusHash, graffitiSigner.address)
    console.log("createFeedManifest result", manifestResult.reference)
    sleep(2000)

    const data: MessageData = {
        message: `This is chat for topic '${topic}' Welcome!`,
        name: "admin",
        timestamp: Date.now()
    }
    const feedWriter = bee.makeFeedWriter('sequence', consensusHash, graffitiSigner)
    try {
        const beeUploadRef = await bee.uploadData(stamp, serializeGraffitiRecord(data))
        console.log("bee.uploadData result", beeUploadRef.reference)
        const feedUploadRef = await feedWriter.upload(stamp, beeUploadRef.reference)
        console.log("feedWriter.upload result", feedUploadRef)

        //return true
    } catch (e) {
        //return false
    }
}

export async function feedWriterFromRoomId(roomId: RoomID) {
    const privateKey = getConsensualPrivateKey(roomId);
    const wallet = getGraffitiWallet(privateKey);

    const graffitiSigner: Signer = {
        address: Utils.hexToBytes(wallet.address.slice(2)), // convert hex string to Uint8Array
        sign: async (data) => {
            return await wallet.signMessage(data)
        },
    };

    const consensusHash = Utils.keccak256Hash(ConsensusID);

    return bee.makeFeedWriter('sequence', consensusHash, graffitiSigner);
}

export async function feedReaderFromRoomId(roomId: RoomID) {
    const privateKey = getConsensualPrivateKey(roomId);
    const wallet = getGraffitiWallet(privateKey);

    const graffitiSigner: Signer = {
        address: Utils.hexToBytes(wallet.address.slice(2)), // convert hex string to Uint8Array
        sign: async (data) => {
            return await wallet.signMessage(data)
        },
    };
    
    const consensusHash = Utils.keccak256Hash(ConsensusID);

    return  bee.makeFeedReader('sequence', consensusHash, graffitiSigner.address);
}

export async function uploadMessageToBee(message: string, name: string, stamp: BatchId) {
    const data = {
        message: message, 
        name: name,
        timestamp: Date.now()
    }
    const result = await bee.uploadData(stamp as any, serializeGraffitiRecord(data));

    return result;
}

export async function sendMessage(message: string, name: string, roomId: RoomID, stamp: BatchId) {
    const reference = await uploadMessageToBee(message, name, stamp)
    console.log("uploaded message: " + message, "reference: " + reference.reference)

    const feedWriter: FeedWriter = await feedWriterFromRoomId(roomId);
    const feedReference = await feedWriter.upload(stamp, reference.reference)
    return feedReference
}

export async function readSingleMessage(index: number, roomId: RoomID) {
    let opts = undefined
    if (index > -1) {
        opts = {index: numberToFeedIndex(index)}
        console.log("read message with index: ", index, opts);
    }
    try {
        console.log("read message with index: " + index);
        const feedReader: FeedReader = await feedReaderFromRoomId(roomId);
        const recordPointer = await feedReader.download(opts);
        const data = await bee.downloadData(recordPointer.reference);console.log("DATA: ", data)
        return JSON.parse(new TextDecoder().decode(data));
    } catch (e) {
      console.error("There was an error, while reading single Message: ", e);
      return false;
    }
}

export function generateRoomId(topic: string) {
    return`${topic}_EthercastChat`;
}

export async function getUpdateIndex(roomId: RoomID) {
    const feedReader: FeedReader = await feedReaderFromRoomId(roomId);
    const feedUpdate = await feedReader.download();
    return parseInt(feedUpdate.feedIndex as string, 16);
}
