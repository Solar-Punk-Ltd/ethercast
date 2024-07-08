import { BatchId, Bee, Reference, Signer, UploadResult, Utils } from '@ethersphere/bee-js';
import { ethers, Signature } from 'ethers';

import { HexString } from '../utils/beeJs/hex';
import { generateUserOwnedFeedId, generateUsersFeedId, validateUserObject } from '../utils/chat';
import { retryAwaitableAsync } from '../utils/common';
import { HEX_RADIX } from '../utils/constants';
import { EventEmitter } from '../utils/eventEmitter';
import {
  getConsensualPrivateKey,
  getGraffitiWallet,
  numberToFeedIndex,
  serializeGraffitiRecord,
} from '../utils/graffitiUtils';

import { AsyncQueue } from './asyncQueue';

export type Sha3Message = string | number[] | ArrayBuffer | Uint8Array;

const ETH_ADDRESS_LENGTH = 42; // Be careful not to use EthAddress from bee-js,
export type EthAddress = HexString<typeof ETH_ADDRESS_LENGTH>; // because that is a byte array

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

const CONSENSUS_ID = 'SwarmStream'; // Used for Graffiti feed
const bee = new Bee('http://45.137.70.219:1833');
const emitter = new EventEmitter();
const messages: MessageData[] = [];

let usersQueue: AsyncQueue;
let messagesQueue: AsyncQueue;
let users: UserWithIndex[] = [];
let userInitIndex;

const eventStates: Record<string, boolean> = {
  loadingInitUsers: false,
  loadingUsers: false,
  loadingRegistration: false,
};

export const EVENTS = {
  LOADING_INIT_USERS: 'loadingInitUsers',
  LOADING_USERS: 'loadingUsers',
  LOADING_REGISTRATION: 'loadingRegistration',
  LOAD_MESSAGE: 'loadMessage',
};

export function getChatActions() {
  return {
    startFetchingForNewUsers,
    startLoadingNewMessages,
    on: emitter.on,
    off: emitter.off,
  };
}

export async function initChatRoom(topic: string, stamp: BatchId) {
  try {
    const { consensusHash, graffitiSigner } = generateGraffitiFeedMetadata(topic);
    await bee.createFeedManifest(stamp, 'sequence', consensusHash, graffitiSigner.address);
  } catch (error) {
    console.error(error);
    throw new Error('Could not create Users feed');
  }
}

export async function initUsers(topic: string): Promise<UserWithIndex[] | null> {
  try {
    const feedReader = graffitiFeedReaderFromTopic(topic);

    const feedEntry = await feedReader.download();
    userInitIndex = parseInt(feedEntry.feedIndexNext, HEX_RADIX);

    const data = await bee.downloadData(feedEntry.reference);

    const rawUsers = data.json() as unknown as User[];
    const validUsers = rawUsers.filter((user) => validateUserObject(user));
    const users = validUsers.map((user) => ({ ...user, index: 0 }));
    await setUsers(users);

    return users;
  } catch (error) {
    console.error('Init users error: ', error);
    throw error;
  }
}

export async function registerUser(topic: string, { participant, key, stamp, nickName: username }: ParticipantDetails) {
  try {
    emitEvent(EVENTS.LOADING_REGISTRATION, true);

    const alreadyRegistered = users.find((user) => user.address === participant);

    if (alreadyRegistered) {
      console.log('User already registered');
      return;
    }

    const wallet = new ethers.Wallet(key);
    if (wallet.address.toLowerCase() !== participant.toLowerCase()) {
      throw new Error('The provided address does not match the address derived from the private key');
    }

    const timestamp = Date.now();
    const signature = (await wallet.signMessage(
      JSON.stringify({ username, address: wallet.address, timestamp }),
    )) as unknown as Signature;

    const newUser: User = {
      address: wallet.address as EthAddress,
      username,
      timestamp,
      signature,
    };

    if (!validateUserObject(newUser)) {
      throw new Error('User object validation failed');
    }

    await setUsers([...users, { ...newUser, index: 0 }]);

    const uploadableUsers = users.map((user) => ({ ...user, index: undefined }));
    const userRef = await uploadObjectToBee(uploadableUsers, stamp as any);
    if (!userRef) throw new Error('Could not upload user to bee');

    const feedWriter = graffitiFeedWriterFromTopic(topic);
    await feedWriter.upload(stamp, userRef.reference);

    emitEvent(EVENTS.LOADING_REGISTRATION, false);
  } catch (error) {
    console.error(error);
    throw new Error(`There was an error while trying to register user (chatroom): ${error}`);
  }
}

export function startFetchingForNewUsers(topic: string) {
  if (!usersQueue) {
    usersQueue = new AsyncQueue({ indexed: true, index: numberToFeedIndex(userInitIndex!), waitable: true });
  }
  return () => usersQueue.enqueue((index) => getNewUsers(topic, parseInt(index as string, HEX_RADIX)));
}

async function getNewUsers(topic: string, index: number) {
  emitEvent(EVENTS.LOADING_USERS, true);

  const feedReader = graffitiFeedReaderFromTopic(topic);
  const feedEntry = await feedReader.download({ index });

  const data = await bee.downloadData(feedEntry.reference);
  const rawUsers = data.json() as unknown as User[];

  if (!Array.isArray(rawUsers)) {
    console.error('New users is not an array');
    return;
  }

  const validUsers = rawUsers.filter((user) => validateUserObject(user));
  const newUsers = [...users];

  for (const user of validUsers) {
    const alreadyRegistered = users.find((u) => u.address === user.address);
    if (!alreadyRegistered) {
      newUsers.push({ ...user, index: 0 });
    }
  }

  await setUsers(newUsers);

  emitEvent(EVENTS.LOADING_USERS, false);
}

export function startLoadingNewMessages(topic: string) {
  if (!messagesQueue) {
    messagesQueue = new AsyncQueue({ indexed: false, waitable: true });
  }

  return () => {
    for (const user of users) {
      messagesQueue.enqueue(() => readMessage(user, topic));
    }
  };
}

async function readMessage(user: UserWithIndex, rawTopic: string) {
  const chatID = generateUserOwnedFeedId(rawTopic, user.address);
  const topic = bee.makeFeedTopic(chatID);

  const feedReader = bee.makeFeedReader('sequence', topic, user.address);
  const recordPointer = await feedReader.download({ index: user.index });
  const data = await bee.downloadData(recordPointer.reference);

  const messageData = JSON.parse(new TextDecoder().decode(data)) as MessageData;

  const newUsers = users.map((u) => (u.address === user.address ? { ...u, index: user.index + 1 } : u));
  await setUsers(newUsers);

  messages.push(messageData);

  // TODO - discuss with the team
  if (messages.length > 300) {
    messages.shift();
  }

  emitter.emit(EVENTS.LOAD_MESSAGE, messages);
}

let ownIndex: number;
export async function sendMessage(
  address: EthAddress,
  topic: string,
  messageObj: MessageData,
  stamp: BatchId,
  privateKey: string,
): Promise<Reference | null> {
  try {
    if (!privateKey) throw 'Private key is missing';

    const feedID = generateUserOwnedFeedId(topic, address);
    const feedTopicHex = bee.makeFeedTopic(feedID);

    const msgData = await uploadObjectToBee(messageObj, stamp);
    if (!msgData) throw 'Could not upload message data to bee';

    if (!ownIndex) {
      const feedReader = bee.makeFeedReader('sequence', feedTopicHex, address);

      let feedEntry;
      try {
        feedEntry = await feedReader.download();
        ownIndex = parseInt(feedEntry.feedIndexNext, HEX_RADIX);
      } catch (error) {
        if (error.stack.includes('404')) {
          ownIndex = 0;
        }
      }
    }

    const feedWriter = bee.makeFeedWriter('sequence', feedTopicHex, privateKey);
    const ref = await feedWriter.upload(stamp, msgData.reference, { index: ownIndex });
    ownIndex++;

    return ref;
  } catch (error) {
    console.error(
      `There was an error while trying to write own feed (chat), index: ${ownIndex}, message: ${messageObj.message}: ${error}  `,
    );
    throw new Error('Could not send message');
  }
}

async function uploadObjectToBee(jsObject: object, stamp: BatchId): Promise<UploadResult | null> {
  try {
    const result = await bee.uploadData(stamp as any, serializeGraffitiRecord(jsObject), { redundancyLevel: 4 });
    return result;
  } catch (error) {
    console.error(`There was an error while trying to upload object to Swarm: ${error}`);
    return null;
  }
}

function graffitiFeedWriterFromTopic(topic: string) {
  const { consensusHash, graffitiSigner } = generateGraffitiFeedMetadata(topic);
  return bee.makeFeedWriter('sequence', consensusHash, graffitiSigner);
}

function graffitiFeedReaderFromTopic(topic: string) {
  const { consensusHash, graffitiSigner } = generateGraffitiFeedMetadata(topic);
  return bee.makeFeedReader('sequence', consensusHash, graffitiSigner.address);
}

function generateGraffitiFeedMetadata(topic: string) {
  const roomId = generateUsersFeedId(topic);
  const privateKey = getConsensualPrivateKey(roomId);
  const wallet = getGraffitiWallet(privateKey);

  const graffitiSigner: Signer = {
    address: Utils.hexToBytes(wallet.address.slice(2)),
    sign: async (data: any) => {
      return await wallet.signMessage(data);
    },
  };

  const consensusHash = Utils.keccak256Hash(CONSENSUS_ID);

  return {
    consensusHash,
    graffitiSigner,
  };
}

let usersLoading = false;
async function setUsers(newUsers: UserWithIndex[]) {
  return retryAwaitableAsync(async () => {
    if (usersLoading) {
      throw new Error('Users are still loading');
    }
    usersLoading = true;
    users = newUsers;
    usersLoading = false;
  });
}

function emitEvent(event: string, value: any) {
  if (eventStates[event] !== value) {
    eventStates[event] = value;
    emitter.emit(event, value);
  }
}
