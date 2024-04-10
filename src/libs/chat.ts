import { BatchId, Bee, FeedReader, FeedWriter, Signer, Utils } from "@ethersphere/bee-js";
import { getConsensualPrivateKey, getGraffitiWallet, numberToFeedIndex, serializeGraffitiRecord, sleep } from '../utils/graffitiUtils';

export type RoomID = string;

export type Sha3Message = string | number[] | ArrayBuffer | Uint8Array;


// Initialize the bee instance
const bee = new Bee("http://localhost:1633");

//require('dotenv').config();

const ConsensusID = "SwarmStream";
//const STAMP = process.env.POSTAGE_STAMP as BatchId;

export async function initChatRoom(topic: string, stamp: BatchId): Promise<void> {
    const roomId = `${topic}_EthercastChat`;                                    // For every video stream, we create a new chat room
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

    const data: Message = {
        message: 'Welcome to the chat!',
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

export async function uploadMessageToBee(message: string, stamp: BatchId) {
    const data = {text: message, timestamp: Date.now()}
    const result = await bee.uploadData(stamp as any, serializeGraffitiRecord(data));

    return result;
}

export async function uploadMessageToFeed(message: string, roomId: RoomID, stamp: BatchId) {
    const reference = await uploadMessageToBee(message, stamp)
    console.log("uploaded message: " + message, "reference: " + reference.reference)

    const feedWriter: FeedWriter = await feedWriterFromRoomId(roomId);
    const feedReference = await feedWriter.upload(stamp, reference.reference)
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

// We need a player.ts-style setFeedReader function in chat.ts
// It's name should be setChatReader, or something like that

// It should create a new chat room, at that exact moment, when the video stream is created

// It should have topic name like, "[video_topic_name]_chat"

// Bee node should be similarly an option, as node is for video, or better yet, it should be the same

// Most of the interfaces, or variables, we don't need, or we don't need the equivalent of them
// We will probably need some of our own variables, but not much

// First, we will need to create a new chat room, if it doesn't exist
// We have createChatRoomIfNotExist function in chat_server/src/utils/roomInitUtils.ts, which we can use or modify

// We will need to send messages to the chat room
// We have uploadMessageToFeed function in chat_server/src/utils/roomInitUtils.ts, which we can use or modify

// We will need to read messages from the chat room
// We have readMessageToIndex function in chat_server/src/utils/roomInitUtils.ts, which we can use or modify

// Probably we will need a function, which will read messages, from a specific index, to the end of the chat
// We don't have this function, but we can easily create it
