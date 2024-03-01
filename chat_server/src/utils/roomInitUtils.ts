import { BatchId, Bee, FeedReader, FeedWriter, Signer, Utils } from "@ethersphere/bee-js";
import { getConsensualPrivateKey, getGraffitiWallet, numberToFeedIndex, serializeGraffitiRecord, sleep } from "./graffitiUtils";
import { Message, RoomID } from "../types/types";
import bee from "./beeInstance";
require('dotenv').config();

const ConsensusID = "SwarmStream";
const STAMP = process.env.POSTAGE_STAMP as BatchId;


export async function createChatRoomIfNotExist(roomId: RoomID) {
    const privateKey = getConsensualPrivateKey(roomId)
    const wallet = getGraffitiWallet(privateKey);
    getConsensualPrivateKey(roomId)

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
        return true
    }

    const manifestResult = await bee.createFeedManifest(STAMP, "sequence", consensusHash, graffitiSigner.address)
    console.log("createFeedManifest result", manifestResult.reference)
    sleep(2000)

    const data: Message = {
        message: 'Welcome to the chat!',
        name: "admin",
        timestamp: Date.now()
    }
    const feedWriter = bee.makeFeedWriter('sequence', consensusHash, graffitiSigner)
    try {
        const beeUploadRef = await bee.uploadData(STAMP, serializeGraffitiRecord(data))
        console.log("bee.uploadData result", beeUploadRef.reference)
        const feedUploadRef = await feedWriter.upload(STAMP, beeUploadRef.reference)
        console.log("feedWriter.upload result", feedUploadRef)

        return true
    } catch (e) {
        return false
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

export async function uploadMessageToBee(message: string, name: string) {
    const data = {
        message: message, 
        name: name,
        timestamp: Date.now()
    }
    const result = await bee.uploadData(STAMP as any, serializeGraffitiRecord(data));

    return result;
}

export async function uploadMessageToFeed(message: string, name: string, roomId: RoomID) {
    const reference = await uploadMessageToBee(message, name)
    console.log("uploaded message: " + message, "reference: " + reference.reference)

    const feedWriter: FeedWriter = await feedWriterFromRoomId(roomId);
    const feedReference = await feedWriter.upload(STAMP, reference.reference)
    return feedReference
}

export async function readMessageToIndex(index: number, roomId: RoomID) {
    let opts = undefined
    if (index > -1) {
        opts = {index: numberToFeedIndex(index)}
        console.log("read message with index: ", index, opts);
    }
    try {
        console.log("read message with index: " + index);
        const feedReader: FeedReader = await feedReaderFromRoomId(roomId);
        const recordPointer = await feedReader.download(opts);
        const data = await bee.downloadData(recordPointer.reference);
        return JSON.parse(new TextDecoder().decode(data));
    } catch (e) {
      
    }
}

export async function getUpdateIndex(roomId: RoomID) {
    const feedReader: FeedReader = await feedReaderFromRoomId(roomId);
    const feedUpdate = await feedReader.download();
    return parseInt(feedUpdate.feedIndex as string, 16);
}