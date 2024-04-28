<<<<<<< HEAD
import { BatchId, Bee, FeedReader, FeedWriter, Reference, Signer, Utils } from '@solarpunk/bee-js';
=======
import { BatchId, Bee, FeedReader, FeedWriter, Reference, Signer, Topic, Utils } from '@solarpunk/bee-js';
>>>>>>> chat-reimplementation-aggregator-dirty
import {
  getConsensualPrivateKey,
  getGraffitiWallet,
  numberToFeedIndex,
  serializeGraffitiRecord,
  sleep,
} from '../utils/graffitiUtils';
<<<<<<< HEAD
import { generateRoomId } from '../utils/chat';
=======
import { generateRoomId, generateUniqId, generateUserOwnedFeedId, generateUsersFeedId, removeDuplicate, validateUserObject } from '../utils/chat';
import { Signature, Wallet, ethers } from 'ethers';
import { HexString } from 'node_modules/@solarpunk/bee-js/dist/types/utils/hex';
>>>>>>> chat-reimplementation-aggregator-dirty

export type RoomID = string;

export type Sha3Message = string | number[] | ArrayBuffer | Uint8Array;

// Initialize the bee instance
const bee = new Bee('http://localhost:1633');
<<<<<<< HEAD
=======
//const chatWallet = ethers.Wallet.createRandom();
let chatWriter: FeedWriter | null = null;                                       // global object, not sure to store it here or elsewhere

const ETH_ADDRESS_LENGTH = 42;                                                  // Be careful not to use EthAddress from bee-js,
export type EthAddress = HexString<typeof ETH_ADDRESS_LENGTH>;                  // because that is a byte array
>>>>>>> chat-reimplementation-aggregator-dirty

export interface MessageData {
  message: string;
  name: string;
  timestamp: number;
}

<<<<<<< HEAD
const ConsensusID = 'SwarmStream';

export async function initChatRoom(topic: string, stamp: BatchId): Promise<void> {
  try {
    const roomId = generateRoomId(topic); // For every video stream, we create a new chat room
    const privateKey = getConsensualPrivateKey(roomId); // This is private key that every chat participant should have access to
    const wallet = getGraffitiWallet(privateKey);

    const graffitiSigner: Signer = {
      address: Utils.hexToBytes(wallet.address.slice(2)), // convert hex string to Uint8Array
      sign: async (data: string | Uint8Array) => {
        return await wallet.signMessage(data);
      },
    };

    const consensusHash = Utils.keccak256Hash(ConsensusID);
    let isRetrievable = false;
    try {
      isRetrievable = await bee.isFeedRetrievable('sequence', graffitiSigner.address, consensusHash);
    } catch (Error) {
      console.log('feed does not exist');
    }

    console.log('chat room exist,no need to reinitialize', isRetrievable);
    if (isRetrievable) {
      //return true
    }

    const manifestResult = await bee.createFeedManifest(stamp, 'sequence', consensusHash, graffitiSigner.address);
    console.log('createFeedManifest result', manifestResult.reference);
    await sleep(2000);

    const data: MessageData = {
      message: `This is chat for topic '${topic}' Welcome!`,
      name: 'admin',
      timestamp: Date.now(),
    };
    const feedWriter = bee.makeFeedWriter('sequence', consensusHash, graffitiSigner);
    const beeUploadRef = await bee.uploadData(stamp, serializeGraffitiRecord(data));
    console.log('bee.uploadData result', beeUploadRef.reference);
    const feedUploadRef = await feedWriter.upload(stamp, beeUploadRef.reference);
    console.log('feedWriter.upload result', feedUploadRef);
  } catch (e) {
    console.error('There was an error while initalizing the feed: ', e);
=======
export interface UserWithMessages {
  user: UserWithIndex,
  messages: MessageData[]
}

export interface User {
  username: string,
  address: EthAddress,
  timestamp: number,
  signature: Signature
}

export interface UserWithIndex {
  address: EthAddress,
  index: number
}

const ConsensusID = 'SwarmStream';

// This function will create 2 feeds: a Users feed, and an AggregatedChat
// This will be called on the side of the Streamer (aggregator)
export async function initChatRoom(topic: string, stamp: BatchId): Promise<{usersRef: Reference, chatWriter: FeedWriter} | null> {
  try {
    const wallet = ethers.Wallet.createRandom();

    // Create the Users feed, that is used to register to the chat
    const usersFeedResult = await createUsersFeed(topic, stamp);
    if (!usersFeedResult) throw "Could not create Users feed!";

    // Create the AggregatedChat feed, that is the real chat feed
    chatWriter = await createAggregatedFeedWriter(topic, wallet);
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

async function createUsersFeed(topic: string, stamp: BatchId) {
  try {
    const usersFeedID = generateUsersFeedId(topic);                       // Graffiti feed for users to register
    const privateKey = getConsensualPrivateKey(usersFeedID);              // Can be generated by any participant (who knows the stream topic)
    const wallet = getGraffitiWallet(privateKey);

    const graffitiSigner: Signer = {
      address: Utils.hexToBytes(wallet.address.slice(2)),
      sign: async (data: string | Uint8Array) => {
        return await wallet.signMessage(data)
      }
    };

    const consensusHash = Utils.keccak256Hash(ConsensusID);               // Not sure if this should be secret or not
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

async function createAggregatedFeedWriter(streamTopic: string, wallet: Wallet): Promise<FeedWriter | null> {
  try {
    const humanReadableTopic = generateRoomId(streamTopic);
    const topic = bee.makeFeedTopic(humanReadableTopic) ;
    const feedWriter = bee.makeFeedWriter('sequence', topic, wallet.privateKey);
    
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
    const roomId: RoomID = generateUsersFeedId(topic);
    const wallet = ethers.Wallet.createRandom();

    const address = wallet.address as EthAddress;
    const timestamp = Date.now();
    const signature = await wallet.signMessage(JSON.stringify({ username, address, timestamp })) as unknown as Signature;
    localStorage.setItem(generateUniqId(topic, streamerAddress), address as string);
    localStorage.setItem(generateUserOwnedFeedId(topic, address), wallet.privateKey);                        // We save the private key for this chat (only this chat)
    
    
    const user: User = {
      username: username,
      address: address,
      timestamp: timestamp,
      signature: signature
    };
    
    const userRef = await uploadObjectToBee(user, stamp);
    if (!userRef) throw "Could not upload User object to Swarm (reference is null)";
    console.info("User object uploaded, reference: ", userRef.reference);
    
    const feedWriter: FeedWriter = await feedWriterFromRoomId(roomId);
    const feedReference = await feedWriter.upload(stamp, userRef.reference);
    
    return feedReference;

 
  } catch (error) {
    console.error("There was an error while trying to register user (chatroom): ", error);
    return null;
  }
}

// Write a new message to the feed of the user. Every user has a feed.
// Index is stored in React state (we are not fetching the feed index from Swarm)
// This is called client side
export async function writeToOwnFeed(topic: Topic, streamerAddress: EthAddress, index: number, messageObj: MessageData, stamp: BatchId) {
  try {
    const address: EthAddress | null = localStorage.getItem(generateUniqId(topic, streamerAddress)) as EthAddress;
    if (!address) throw "Could not get address from local storage!"                       // This suggests that the user haven't registered yet for this chat

    const feedID = generateUserOwnedFeedId(topic, address);
    const privateKey = localStorage.getItem(feedID);                                      // Private key for this single chat is stored in local storage
    const feedTopicHex = bee.makeFeedTopic(feedID);
    if (!privateKey) throw "Could not get private key from local storage!";

    const uploadRes = await uploadObjectToBee(messageObj, stamp);                         // We first upload the message object to Swarm
    if (!uploadRes) throw "Could not upload message object to Swarm!";

    const feedWriter = bee.makeFeedWriter('sequence', feedTopicHex, privateKey); 
    const ref = await feedWriter.upload(stamp, uploadRes.reference, { index });           // We write to specific index, index is stored in React state

    return ref;

  } catch (error) {
    console.error("There was an error while trying to write own feed (chat): ", error);
  }
}

// Reads all new messages from Swarm, each user has a feed, input userList will include the last read index
// Will return the new messages, for each user
// This is called on the side of the Streamer (aggregator)
export async function fetchAllMessages(userList: UserWithIndex[], streamTopic: string) {
  try {
    const promiseList: Promise<UserWithMessages>[] = userList.map(async (user) => {
      const messages: MessageData[] = [];
      const topic = generateUserOwnedFeedId(streamTopic, user.address);
      const feedReader = bee.makeFeedReader('sequence', topic, user.address);
      const max = user.index + 10;
      let i = 0;

      for (i = user.index; i < max; i++) {        // Looping through new messages for single user, but only read max
        try {
          const feedUpdate = await feedReader.download({ index: i });
          const data = await bee.downloadData(feedUpdate.reference);
          const json: MessageData = data.json() as unknown as MessageData;

          messages.push(json);

        } catch (error) {
          break;                                  // We quit the loop, if no new messages
        }
      }

      const messageAndUser: UserWithMessages = {
        user: {                                   // We give back a new UserWithIndex object, and the messages
          address: user.address,                  // A UserWithIndex object that looks like this, will be input for next run
          index: i
        },
        messages
      };

      return messageAndUser;
    });

    return Promise.all(promiseList);

  } catch (error) {
    console.error("There was an error reading user feeds (fetchAllMessages): ", error);
    return null;
  }
}

// Write the messages of all users to an aggregated feed, in chronological order.
// This is called on the side of the Streamer (aggregator)
export async function writeAggregatedFeed(state: UserWithMessages[], chatWriter: FeedWriter, chatIndex: number, stamp: BatchId) {
  try {
    let newMessages: MessageData[] = [];
    let index = chatIndex;

    for (let i = 0; i < state.length; i++) {                                        // Add messages to aggregated array, that are not duplicates
      const uniqMessages = removeDuplicate(state[i].messages)
      newMessages = [...newMessages, ...uniqMessages];
    }

    newMessages = newMessages.sort((a, b) => b.timestamp - a.timestamp);            // Order the messages by timestamp

    for (index = chatIndex; index < newMessages.length; index++) {
      const uploadRes = await uploadObjectToBee(newMessages[index], stamp);         // Indeed this data should already exist on Swarm, we just don't know the reference
      if (!uploadRes) throw "Error uploading message to Swarm!";                    // but it's probably good that we give it more time-to-live
      chatWriter.upload(stamp, uploadRes.reference, { index });
    }

    return index;                                                                   // The new chatIndex. All messages can be removed from user temporary arrays
    
  } catch (error) {
    console.error("There was an error while trying to write aggregated feed for the chat: ", error);
  }
}

// This is like createUserList, but will only do update
// This is called on the side of the Streamer (aggregator)
export async function updateUserList(roomId: RoomID, index: number = 0, users: User[] = []) {
  try {
    const lastIndex = await getGraffitiFeedIndex(roomId);
    const feedReader = await feedReaderFromRoomId(roomId);

    if (index < 0 || index >= lastIndex) throw `Invalid index: ${index}`;

    for (let i = index; i < lastIndex; i++) {
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
            users.push(json);              // We add the User object to the list, if it's not duplicate
          }
        }
      } catch (error) {
        console.error("Skipping element: ", error);
        continue;
      }
    }

    return { users, lastReadIndex: lastIndex };

  } catch (error) {
    console.error("There was an error while trying to insert new users to users state: ", error);
    return null;
>>>>>>> chat-reimplementation-aggregator-dirty
  }
}

export async function feedWriterFromRoomId(roomId: RoomID) {
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

<<<<<<< HEAD
=======
// Graffiti feed reader from RoomID (can't be used for normal, non-Graffiti reader)
>>>>>>> chat-reimplementation-aggregator-dirty
export async function feedReaderFromRoomId(roomId: RoomID) {
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

<<<<<<< HEAD
export async function uploadMessageToBee(message: string, name: string, timestamp: number, stamp: BatchId) {
  try {
    const data = {
      message: message,
      name: name,
      timestamp,
    };
    const result = await bee.uploadData(stamp as any, serializeGraffitiRecord(data));
=======
// Uploads any JavaScript object to Swarm, gives back reference if successful, null otherwise
export async function uploadObjectToBee(jsObject: object, stamp: BatchId) {
  try {
    const result = await bee.uploadData(stamp as any, serializeGraffitiRecord(jsObject));
>>>>>>> chat-reimplementation-aggregator-dirty

    return result;
  } catch (error) {
    return null;
  }
}

export async function sendMessage(message: string, name: string, roomId: RoomID, timestamp: number, stamp: BatchId) {
<<<<<<< HEAD
  try {
    const reference = await uploadMessageToBee(message, name, timestamp, stamp);
=======
  // TODO
  // REWRITE

  try {
    const messageObject: MessageData = {
      message: message,
      name: name,
      timestamp,
    };

    const reference = await uploadObjectToBee(messageObject, stamp);
>>>>>>> chat-reimplementation-aggregator-dirty
    if (reference === null) throw 'Reference is null!';
    console.log('uploaded message: ' + message, 'reference: ' + reference.reference);

    const feedWriter: FeedWriter = await feedWriterFromRoomId(roomId);
    const feedReference = await feedWriter.upload(stamp, reference.reference);
    return feedReference;
  } catch (error) {
    console.error('There was an error while trying to send message: ', error);
    return -1;
  }
}

export async function checkUploadResult(reference: Reference) {
  try {
    const result = await bee.downloadChunk(reference);
    return result.length > 0;
  } catch (error) {
    // Don't spam the console
    //console.error("There was an error while trying to check upload result: ", error);
    return false;
  }
}

<<<<<<< HEAD
export async function readSingleMessage(index: number, roomId: RoomID) {
  try {
    let opts = undefined;
    if (index > -1) {
      opts = { index: numberToFeedIndex(index) };
    }

    const feedReader: FeedReader = await feedReaderFromRoomId(roomId);
    const recordPointer = await feedReader.download(opts);
    const data = await bee.downloadData(recordPointer.reference);

    return JSON.parse(new TextDecoder().decode(data));
=======
// Reads a message from AggregatedChat, this should be the same as Graffiti feed version, but input roomId is different
export async function readSingleMessage(index: number, streamTopic: string, streamerAddress: EthAddress) {
  try {
    let opts = undefined;                                               // Index should be always provided in new version
    if (index > -1) {                                                   // this should be removed, most likely
      opts = { index: numberToFeedIndex(index) };
    }

    const aggregatedChatID = generateRoomId(streamTopic);               // Human readable topic name, for the aggregated chat
    const topic = bee.makeFeedTopic(aggregatedChatID)

    const feedReader: FeedReader = bee.makeFeedReader('sequence', topic, streamerAddress);
    const recordPointer = await feedReader.download(opts);              // Fetch reference to data
    const data = await bee.downloadData(recordPointer.reference);       // Fetch data

    return JSON.parse(new TextDecoder().decode(data));                  // Return message object
>>>>>>> chat-reimplementation-aggregator-dirty
  } catch (e: any) {
    // Don't spam the console
    if (e.status != 500) console.error('There was an error, while reading single Message: ', e);
    return false;
  }
}

<<<<<<< HEAD
export async function getUpdateIndex(roomId: RoomID) {
=======
// Current index for Graffiti feed, used by createUserList
export async function getGraffitiFeedIndex(roomId: RoomID) {
>>>>>>> chat-reimplementation-aggregator-dirty
  try {
    const feedReader: FeedReader = await feedReaderFromRoomId(roomId);
    const feedUpdate = await feedReader.download();
    return parseInt(feedUpdate.feedIndex as string, 16);
  } catch (error) {
    console.error('There was an error while trying to get feed index: ', error);
    return -1;
  }
}
