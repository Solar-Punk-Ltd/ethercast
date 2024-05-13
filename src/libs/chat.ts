import { BatchId, Bee, FeedReader, FeedWriter, Reference, Signer, UploadResult, Utils } from '@ethersphere/bee-js';
import {
  getConsensualPrivateKey,
  getGraffitiWallet,
  serializeGraffitiRecord,
} from '../utils/graffitiUtils';
import { generateRoomId, generateUniqId, generateUserOwnedFeedId, generateUsersFeedId, validateUserObject } from '../utils/chat';
import { Signature, Wallet, ethers } from 'ethers';
import { HexString } from 'node_modules/@ethersphere/bee-js/dist/types/utils/hex';
import { sleep } from '../utils/common';
import { makeChunkedFile } from '@fairdatasociety/bmt-js';
import { bytesToHex } from '../utils/beeJs/hex';

export type RoomID = string;

export type Sha3Message = string | number[] | ArrayBuffer | Uint8Array;

// Initialize the bee instance
const bee = new Bee('http://localhost:1633');
//const bee = new Bee("http://161.97.125.121:1933");

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

// This function will create 2 feeds: a Users feed, and an AggregatedChat
// This will be called on the side of the Streamer (aggregator)
export async function initChatRoom(
  topic: string,
  privKey: string,
  stamp: BatchId
): Promise<{usersRef: Reference, chatWriter: FeedWriter} | null> {
  try {
    const wallet = new ethers.Wallet(privKey);                            // This is the same privKey, as used for the Stream

    // Create the Users feed, that is used to register to the chat
    const usersFeedResult = await createUsersFeed(topic, stamp);
    if (!usersFeedResult) throw "Could not create Users feed!";

    // Create the AggregatedChat feed, that is the real chat feed
    let chatWriter = await createAggregatedFeedWriter(topic, wallet);
    if (!chatWriter) throw "Could not create FeedWriter for the aggregated chat!";

    return {
      usersRef: usersFeedResult,
      chatWriter: chatWriter
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

// This is the feed that will contain the whole chat, all the messages are aggregated to this feed (by the Streamer)
async function createAggregatedFeedWriter(streamTopic: string, wallet: Wallet): Promise<FeedWriter | null> {
  try {
    console.info("Initiating aggregated feed...");
    const humanReadableTopic = generateRoomId(streamTopic);
    const topic = bee.makeFeedTopic(humanReadableTopic) ;
    const feedWriter = bee.makeFeedWriter('sequence', topic, wallet.privateKey);
    console.info("Aggregated feed created, address of owner: ", feedWriter.owner)
    
    return feedWriter;

  } catch (error) {
    console.error("There was an error while trying to create the AggregatedChat feed: ", error);
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

    /*const uploadRes = await*/ uploadObjectToBee(messageObj, stamp);                         // We first upload the message object to Swarm
    /*if (!uploadRes) throw "Could not upload message object to Swarm!";*/
    const uint8 = serializeGraffitiRecord(messageObj)
    const newChunk = makeChunkedFile(uint8)
    const newRef = bytesToHex(newChunk.address()) as Reference

    const feedWriter = bee.makeFeedWriter('sequence', feedTopicHex, privateKey);
    const ref = await feedWriter.upload(stamp, newRef, { index });           // We write to specific index, index is stored in React state
    console.info("Wrote message to own feed with ref ", ref)

    return ref;

  } catch (error) {
    console.error(`There was an error while trying to write own feed (chat), index: ${index}, message: ${messageObj.message}: `, error);
    return null;
  }
}

// Reads all new messages from Swarm, each user has a feed, input userList will include the last read index
// Will return the new messages, for each user
// This is called on the side of the Streamer (aggregator)
export async function fetchAllMessages(
  userList: UserWithIndex[],
  streamTopic: string
): Promise<{ user: UserWithIndex; messages: MessageData[]; }[] | null> {
  try {
    // List of promises, that will give back { user, messages }, if successful
    const promiseList: Promise<{user: UserWithIndex, messages: MessageData[]}>[] = userList.map(async (user) => {
      const messages: MessageData[] = [];
      const feedID = generateUserOwnedFeedId(streamTopic, user.address);
      const topic = bee.makeFeedTopic(feedID);
      const feedReader = bee.makeFeedReader('sequence', topic, user.address);
      const max = user.index + 10;
      let i = 0;

      for (i = user.index; i < max; i++) {        // Looping through new messages for single user, but only read max
        try {
          const feedUpdate = await feedReader.download({ index: i });
          const data = await bee.downloadData(feedUpdate.reference);
          const json: MessageData = data.json() as unknown as MessageData;

          messages.push(json);
          console.info(`Messages for user ${user.address} (i: ${i}): `, messages)

        } catch (error) {
          break;                                  // We quit the loop, if no new messages
        }
      }

      const userWithIndex: UserWithIndex = {
        ...user,
        index: i
      };

      return {
        user: userWithIndex,
        messages: messages
      };
    });

    return Promise.all(promiseList);

  } catch (error) {
    console.error("There was an error reading user feeds (fetchAllMessages): ", error);
    return null;
  }
}

// Write the messages of all users to an aggregated feed, in chronological order.
// This is called on the side of the Streamer (aggregator)
export async function writeOneMessageToAggregatedFeed(
  message: MessageData, 
  chatWriter: FeedWriter,
  chatIndex: number,
  stamp: BatchId
): Promise<number|null> {
  try {
    //const uploadRes = await uploadObjectToBee(message, stamp);                    // This data should already exist on Swarm, we just don't know the reference
    //if (!uploadRes) throw "Error uploading message to Swarm!";                    // but it's probably good that we give it more time-to-live
    
    const uint8 = serializeGraffitiRecord(message)                                // don't upload the chunk, just calculate ref
    const newChunk = makeChunkedFile(uint8)
    const newRef = bytesToHex(newChunk.address()) as Reference

    chatWriter.upload(stamp, newRef, { index: chatIndex });
    console.info(`Wrote message to index ${chatIndex}, address: ${chatWriter.owner}, topic: ${chatWriter.topic}`)

    return chatIndex+1;
    
  } catch (error) {
    console.error("There was an error while trying to write aggregated feed for the chat: ", error);
    return null;
  }
}

// This is createUserList as well. If no input user list and index, it will create the user list
// This is called on the side of the Streamer (aggregator)
export async function updateUserList(
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

// Reads a message from AggregatedChat, this should be the same as Graffiti feed version, but input roomId is different
export async function readSingleMessage(
  index: number,
  streamTopic: string,
  streamerAddress: EthAddress
): Promise<MessageData | false> {
  try {
    const aggregatedChatID = generateRoomId(streamTopic);               // Human readable topic name, for the aggregated chat
    const topic = bee.makeFeedTopic(aggregatedChatID);

    const feedReader: FeedReader = bee.makeFeedReader('sequence', topic, streamerAddress);
    console.info(`address: ${feedReader.owner} topic: ${feedReader.topic}`)
    const recordPointer = await feedReader.download({ index });         // Fetch reference to data
    console.info("RecordPointer: ", recordPointer)
    const data = await bee.downloadData(recordPointer.reference);       // Fetch data

    return JSON.parse(new TextDecoder().decode(data)) as MessageData;   // Return message object
  } catch (e: any) {
    // Don't spam the console
    if (e.status != 500) console.error('There was an error, while reading single Message: ', e);
    return false;
  }
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
