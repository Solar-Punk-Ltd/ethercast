import { BatchId, Bee, FeedReader, FeedWriter, Reference, Signer, UploadResult, Utils } from '@ethersphere/bee-js';
import {
  getConsensualPrivateKey,
  getGraffitiWallet,
  serializeGraffitiRecord,
} from '../utils/graffitiUtils';
import { generateUniqId, generateUserOwnedFeedId, generateUsersFeedId, orderMessages, removeDuplicate, validateUserObject } from '../utils/chat';
import { Signature, ethers } from 'ethers';
import { HexString } from 'node_modules/@ethersphere/bee-js/dist/types/utils/hex';
import { sleep } from '../utils/common';

export type RoomID = string;

export type Sha3Message = string | number[] | ArrayBuffer | Uint8Array;

// Initialize the bee instance
//const bee = new Bee('http://localhost:1633');
const bee = new Bee("http://195.88.57.155:1633");

const ETH_ADDRESS_LENGTH = 42;                                                  // Be careful not to use EthAddress from bee-js,
export type EthAddress = HexString<typeof ETH_ADDRESS_LENGTH>;                  // because that is a byte array

export interface MessageData {                                                  // A single message object
  message: string;
  username: string;
  address: EthAddress;
  timestamp: number;
}

export interface User {                                                         // User object, that will be uploded to Users feed, at registration
  username: string,
  address: EthAddress,
  timestamp: number,
  signature: Signature
}

export interface UserWithIndex extends User {                                   // Same as User object, but contains an index for the user's feed
  index: number
}

const ConsensusID = 'SwarmStream';                                              // Used for Graffiti feed

let messages: MessageData[] = [];
let userListPointer = 0;

// This function will create 2 feeds: a Users feed, and an AggregatedChat
// This will be called on the side of the Streamer (aggregator)
export async function initChatRoom(
  topic: string,
  stamp: BatchId
): Promise<{usersRef: Reference} | null> {
  try {
    // Create the Users feed, that is used to register to the chat
    const usersFeedResult = await createUsersFeed(topic, stamp);
    if (!usersFeedResult) throw "Could not create Users feed!";

    return {
      usersRef: usersFeedResult,
    }

  } catch (error) {
    console.error('There was an error while initalizing the chat for the feed (initChatRoom): ', error);
    return null;
  }
}

// Create Users feed, where users will register (by inserting a User object to the feed)
// The Aggregator (Streamer) will poll those feeds, that belong to these users
async function createUsersFeed(topic: string, stamp: BatchId) {
  try {
    console.info("Initiating Users feed...");
    const usersFeedID = generateUsersFeedId(topic);                       // Graffiti feed for users to register
    const privateKey = getConsensualPrivateKey(usersFeedID);              // Can be generated by any participant (who knows the stream topic)
    const wallet = getGraffitiWallet(privateKey);

    const graffitiSigner: Signer = {
      address: Utils.hexToBytes(wallet.address.slice(2)),
      sign: async (data: string | Uint8Array) => {
        return await wallet.signMessage(data)
      }
    };

    const consensusHash = Utils.keccak256Hash(ConsensusID);
    let exist = await bee.isFeedRetrievable('sequence', graffitiSigner.address, consensusHash);
    if (exist) throw "This feed already exists!";

    console.info("Creating feed manifest...");
    const manifestResult = await bee.createFeedManifest(stamp, 'sequence', consensusHash, graffitiSigner.address);
    console.info("Feed manifest created with ref ", manifestResult.reference);

    return manifestResult.reference;

  } catch (error) {
    console.error("There was an error while creating Users feed: ", error);
    return null;
  }
}

// Will write a User object to the Users feed
// This will be called on client side (user adds self to feed)
export async function registerUser(topic: string, streamerAddress: EthAddress, username: string, stamp: BatchId) {
  try {
    console.info("Registering user...");
    const roomId: RoomID = generateUsersFeedId(topic);
    const wallet = ethers.Wallet.createRandom();

    const address = wallet.address as EthAddress;
    console.info(`Address for ${username}: ${address}`);
    const timestamp = Date.now();
    const signature = await wallet.signMessage(JSON.stringify({ username, address, timestamp })) as unknown as Signature;
    localStorage.setItem(generateUniqId(topic, streamerAddress), address as string);
    localStorage.setItem(generateUserOwnedFeedId(topic, address), wallet.privateKey);        // We save the private key for this chat (only this chat)
    
    const user: User = {
      username: username,
      address: address,
      timestamp: timestamp,
      signature: signature
    };
    
    const userRef = await uploadObjectToBee(user, stamp);
    if (!userRef) throw "Could not upload User object to Swarm (reference is null)";
    console.info("User object uploaded, reference: ", userRef.reference);
    
    const feedWriter: FeedWriter = feedWriterFromRoomId(roomId);
    let feedReference: Reference | null = null;
    let uploadSuccess = false;
    const MAX_TRY_ATTEMPT = 10;

    do {                                                                                     // Try to upload User object, if not successful, try again
      try {
        let index: string | number = "";
        try {
          const res = await feedWriter.download();
          console.log("REFERENCE: ", res.reference)
          index = res.feedIndexNext;
          console.log("res", res)
        } catch (error) {
          index = 0;
          console.log("DOWNLOADING INDEX FAILED")
        }
        console.debug("Uploading to feed...")
        feedReference = await feedWriter.upload(stamp, userRef.reference, { index });   

        for (let i = 0; i < MAX_TRY_ATTEMPT; i++) {
          try {
            console.debug("Read back...")
            const readBackRef = await feedWriter.download({ index });
            readBackRef.reference
            console.debug("Download actual data...")
            const readBack = await bee.downloadData(readBackRef.reference);
            const json = readBack.json() as unknown as User;
            console.warn("validateUserObject(json): ", validateUserObject(json));
            console.warn("json.username == user.username: ", json.username == user.username);
            uploadSuccess = validateUserObject(json) && json.username == user.username;
            console.warn("&&: ", uploadSuccess)
            if (uploadSuccess) break;
          } catch (error) {
            console.error(`Readback failed. Attempt count: ${i}`);
            await sleep(10 * 1000);
          }
        }
      } catch (error) {
        console.error(`Error registering User ${user.username}, retrying...`, error);
      }
    } while (!uploadSuccess);

    return feedReference;
 
  } catch (error) {
    console.error("There was an error while trying to register user (chatroom): ", error);
    return null;
  }
}

// This is createUserList as well. If no input user list and index, it will create the user list
// This is called on the side of the Streamer (aggregator)
export async function getNewUsers(
  topic: RoomID,
  index: number = 0,
  users: UserWithIndex[] = []
): Promise<{users: UserWithIndex[], lastReadIndex: number} | null> {
  try {
    const roomId: RoomID = generateUsersFeedId(topic);
    const lastIndex = await getGraffitiFeedIndex(roomId);
    console.info("Updating user list. Last index: ", lastIndex);
    const feedReader = feedReaderFromRoomId(roomId);

    if (index < 0 || index > lastIndex) throw `Invalid index: ${index}`;

    for (let i = index; i <= lastIndex; i++) {
      try {
        const feedEntry = await feedReader.download({ index: i });
        const data = await bee.downloadData(feedEntry.reference);
        const json = data.json() as unknown as User;
        const isValid = validateUserObject(json);

        if (!isValid) {
          throw("Validation failed");
        } else {
          const userExists = users.some((user) => user.address === json.address);
          if (userExists) {
            throw "Duplicate User entry";
          } else {
            users.push({ ...json, index: 0 });              // We add the User object to the list, if it's not duplicate
          }
        }
      } catch (error) {
        console.error("Skipping element: ", error);
        continue;
      }
    }
    console.log("Users: ", users);

    return { users, lastReadIndex: lastIndex };

  } catch (error) {
    console.error("There was an error while trying to insert new users to users state: ", error);
    return null;
  }
}

// Write a new message to the feed of the user. Every user has a feed.
// Index is stored in React state (we are not fetching the feed index from Swarm)
// This is called client side
export async function writeToOwnFeed(
  topic: string,
  streamerAddress: EthAddress,
  index: number,
  messageObj: MessageData,
  stamp: BatchId
): Promise<Reference|null> {
  try {
    const address: EthAddress | null = localStorage.getItem(generateUniqId(topic, streamerAddress)) as EthAddress;
    if (!address) throw "Could not get address from local storage!"                       // This suggests that the user haven't registered yet for this chat

    const feedID = generateUserOwnedFeedId(topic, address);
    const privateKey = localStorage.getItem(feedID);                                      // Private key for this single chat is stored in local storage
    const feedTopicHex = bee.makeFeedTopic(feedID);
    if (!privateKey) throw "Could not get private key from local storage!";    

    console.time("UploadingObjectToBee");
    const msgData = await uploadObjectToBee(messageObj, stamp);
    console.timeEnd("UploadingObjectToBee");
    if (!msgData) throw "Could not upload message data to bee"

    console.time("makeFeedWriter");
    const feedWriter = bee.makeFeedWriter('sequence', feedTopicHex, privateKey);
    console.timeEnd("makeFeedWriter");
    console.time("upload");
    console.log("Index to write: ", index);
    const ref = await feedWriter.upload(stamp, msgData.reference, { index });           // We write to specific index, index is stored in React state
    console.timeEnd("upload");
    console.info("Wrote message to own feed with ref ", ref)

    return ref;

  } catch (error) {
    console.error(`There was an error while trying to write own feed (chat), index: ${index}, message: ${messageObj.message}: `, error);
    return null;
  }
}

// Graffiti feed writer from RoomID (can't be used for normal, non-Graffiti reader)
export function feedWriterFromRoomId(roomId: RoomID) {
  const privateKey = getConsensualPrivateKey(roomId);
  const wallet = getGraffitiWallet(privateKey);

  const graffitiSigner: Signer = {
    address: Utils.hexToBytes(wallet.address.slice(2)), // convert hex string to Uint8Array
    sign: async (data) => {
      return await wallet.signMessage(data);
    },
  };

  const consensusHash = Utils.keccak256Hash(ConsensusID);

  return bee.makeFeedWriter('sequence', consensusHash, graffitiSigner);
}

// Graffiti feed reader from RoomID (can't be used for normal, non-Graffiti reader)
export function feedReaderFromRoomId(roomId: RoomID) {
  const privateKey = getConsensualPrivateKey(roomId);
  const wallet = getGraffitiWallet(privateKey);

  const graffitiSigner: Signer = {
    address: Utils.hexToBytes(wallet.address.slice(2)), // convert hex string to Uint8Array
    sign: async (data) => {
      return await wallet.signMessage(data);
    },
  };

  const consensusHash = Utils.keccak256Hash(ConsensusID);

  return bee.makeFeedReader('sequence', consensusHash, graffitiSigner.address);
}

// Uploads any JavaScript object to Swarm, gives back reference if successful, null otherwise
export async function uploadObjectToBee(
  jsObject: object,
  stamp: BatchId
): Promise<UploadResult | null> {
  try {
    const result = await bee.uploadData(stamp as any, serializeGraffitiRecord(jsObject), { redundancyLevel: 4 });
    
    return result;

  } catch (error) {
    return null;
  }
}

// Reads a message from UserOwnFeed, this should be the same as Graffiti feed version, but input roomId is different
export async function readSingleMessage(
  index: number,
  streamTopic: string,
  userAddress: EthAddress,
  callback: (error: Error | null, data: { message: MessageData | null, index: number }, topic: string, participantAddress: EthAddress ) => void
) {
  try {
    const chatID = generateUserOwnedFeedId(streamTopic, userAddress);   // Human readable topic name, for the aggregated chat
    const topic = bee.makeFeedTopic(chatID);

    const feedReader: FeedReader = bee.makeFeedReader('sequence', topic, userAddress, { timeout: 50000 });
    console.info(`address: ${feedReader.owner} topic: ${feedReader.topic}`);
    const recordPointer = await feedReader.download({ index });         // Fetch reference to data
    console.info("RecordPointer: ", recordPointer);
    const data = await bee.downloadData(recordPointer.reference);       // Fetch data

    const messageData = JSON.parse(new TextDecoder().decode(data)) as MessageData;
    callback(null, { message: messageData, index: index+1 }, streamTopic, userAddress);
  } catch (error) {
    callback(error as Error, { message: null, index }, streamTopic, userAddress);
  }
}

// Callback for readSingleMessage
export async function receiveMessage(
  error: Error | null,
  data: { message: MessageData | null, index: number },
  topic: string,
  participantAddress: EthAddress
) {
  if (!participantAddress) return;

  if (error) {
    console.error("Error reading message: ", error);
    console.log("Retrying...");
    await sleep(100);
    readSingleMessage(data.index, topic, participantAddress, receiveMessage);
  } else {
    readSingleMessage(data.index, topic, participantAddress, receiveMessage);
    if (!data.message) return;
    messages.push(data.message);
    messages = removeDuplicate(messages);
    messages = orderMessages(messages);
    console.log("Messages: ", messages);
  }
}

// Start message fetching for new participants
export async function startFetchingForNewUsers(topic: string) {
  try {
    const result = await getNewUsers(topic, userListPointer);
    if (!result) throw "Error fetching users";

    const { users, lastReadIndex } = result;

    // Start message fetching for each new user
    users.map((user) => {
      readSingleMessage(0, topic, user.address, receiveMessage);
    })

    userListPointer = lastReadIndex;
  } catch (error) {
    console.error("There was an error while starting message fetching for new users: ", error);
  }
}

// Will give back array of messages. Should be used in the UI
export function loadMessagesToUI(start: number = 0, end?: number) {
  let messagesToReturn = [];

  if (end) {
    messagesToReturn = messages.slice(start, end);
  } else {
    messagesToReturn = messages.slice(start);
  }

  return messagesToReturn;
}

// Current index for Graffiti feed, used by createUserList
export async function getGraffitiFeedIndex(roomId: RoomID) {
  try {
    const feedReader: FeedReader = await feedReaderFromRoomId(roomId);
    const feedUpdate = await feedReader.download();
    return parseInt(feedUpdate.feedIndex as string, 16);
  } catch (error) {
    console.error('There was an error while trying to get feed index: ', error);
    return -1;
  }
}