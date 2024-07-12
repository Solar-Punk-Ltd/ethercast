import { BatchId, Bee, Reference } from '@ethersphere/bee-js';
import { ethers, Signature } from 'ethers';

import { 
  generateGraffitiFeedMetadata,
  generateUserOwnedFeedId, 
  getLatestFeedIndex, 
  graffitiFeedReaderFromTopic, 
  graffitiFeedWriterFromTopic, 
  isNotFoundError, 
  numberToFeedIndex, 
  retryAwaitableAsync, 
  uploadObjectToBee, 
  validateUserObject 
} from './utils';
import { EventEmitter } from './eventEmitter';
import { AsyncQueue } from './asyncQueueOld';
//import { AsyncQueue } from './asyncQueueChat';

import { 
  EthAddress, 
  MessageData, 
  ParticipantDetails, 
  User, 
  UserWithIndex
} from './types';

import { CONSENSUS_ID, EVENTS, HEX_RADIX } from './constants';

const bee = new Bee('http://195.88.57.155:1633');
const emitter = new EventEmitter();
const messages: MessageData[] = [];

let usersQueue: AsyncQueue;
let messagesQueue: AsyncQueue;
let users: UserWithIndex[] = [];
let usersLoading = false;
let usersInitIndex: number;
let ownIndex: number;

const eventStates: Record<string, boolean> = {
  loadingInitUsers: false,
  loadingUsers: false,
  loadingRegistration: false,
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
    emitStateEvent(EVENTS.LOADING_INIT_USERS, true);

    const feedReader = graffitiFeedReaderFromTopic(bee, topic);

    const feedEntry = await feedReader.download();
    usersInitIndex = parseInt(feedEntry.feedIndexNext, HEX_RADIX);

    const data = await bee.downloadData(feedEntry.reference);

    const rawUsers = data.json() as unknown as User[];
    const validUsers = rawUsers.filter((user) => validateUserObject(user));
    const users = validUsers.map((user) => ({ ...user, index: 0 }));
    await setUsers(users);

    return users;
  } catch (error) {
    console.error('Init users error: ', error);
    throw error;
  } finally {
    emitStateEvent(EVENTS.LOADING_INIT_USERS, false);
  }
}

export async function registerUser(topic: string, { participant, key, stamp, nickName: username }: ParticipantDetails) {
  try {
    emitStateEvent(EVENTS.LOADING_REGISTRATION, true);

    const alreadyRegistered = users.find((user) => user.address === participant);

    if (alreadyRegistered) {
      console.log('User already registered');
      return;
    }

    const wallet = new ethers.Wallet(key);
    const address = wallet.address as EthAddress;
    if (address.toLowerCase() !== participant.toLowerCase()) {
      throw new Error('The provided address does not match the address derived from the private key');
    }

    const timestamp = Date.now();
    const signature = (await wallet.signMessage(
      JSON.stringify({ username, address, timestamp }),
    )) as unknown as Signature;

    const newUser: User = {
      address,
      username,
      timestamp,
      signature,
    };

    if (!validateUserObject(newUser)) {
      throw new Error('User object validation failed');
    }

    await setUsers([...users, { ...newUser, index: -1 }]);

    const uploadableUsers = users.map((user) => ({ ...user, index: undefined }));
    const userRef = await uploadObjectToBee(bee, uploadableUsers, stamp as any);
    if (!userRef) throw new Error('Could not upload user to bee');

    const feedWriter = graffitiFeedWriterFromTopic(bee, topic);

    try {
      await feedWriter.upload(stamp, userRef.reference);
    } catch (error) {
      if (isNotFoundError(error)) {
        await feedWriter.upload(stamp, userRef.reference, { index: 0 });
      }
    }
  } catch (error) {
    console.error(error);
    throw new Error(`There was an error while trying to register user (chatroom): ${error}`);
  } finally {
    emitStateEvent(EVENTS.LOADING_REGISTRATION, false);
  }
}

export function startFetchingForNewUsers(topic: string) {
  if (!usersQueue) {
    usersQueue = new AsyncQueue({ indexed: true, index: numberToFeedIndex(usersInitIndex!), waitable: true });
  }
  return () => usersQueue.enqueue((index) => getNewUsers(topic, parseInt(index as string, HEX_RADIX)));
}

async function getNewUsers(topic: string, index: number) {
  emitStateEvent(EVENTS.LOADING_USERS, true);

  const feedReader = graffitiFeedReaderFromTopic(bee, topic, { timeout: 500 });
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
      newUsers.push({ ...user, index: -1 });
    }
  }

  await setUsers(newUsers);

  emitStateEvent(EVENTS.LOADING_USERS, false);
}

export function startLoadingNewMessages(topic: string) {
  if (!messagesQueue) {
    messagesQueue = new AsyncQueue({ indexed: false, waitable: true });
  }

  return async () => {
    const isWaiting = await messagesQueue.waitForProcessing();
    if (isWaiting) {
      return;
    }

    for (const user of users) {
      messagesQueue.enqueue(() => readMessage(user, topic));
    }
  };
}

async function readMessage(user: UserWithIndex, rawTopic: string) {
  const chatID = generateUserOwnedFeedId(rawTopic, user.address);
  const topic = bee.makeFeedTopic(chatID);

  let currIndex = user.index;
  if (user.index === -1) {
    const { latestIndex, nextIndex } = await getLatestFeedIndex(bee, topic, user.address);
    currIndex = latestIndex === -1 ? nextIndex : latestIndex;
  }

  const feedReader = bee.makeFeedReader('sequence', topic, user.address, { timeout: 500 });
  const recordPointer = await feedReader.download({ index: currIndex });
  const data = await bee.downloadData(recordPointer.reference);

  const messageData = JSON.parse(new TextDecoder().decode(data)) as MessageData;

  const newUsers = users.map((u) => (u.address === user.address ? { ...u, index: currIndex + 1 } : u));
  await setUsers(newUsers);

  messages.push(messageData);

  // TODO - discuss with the team
  if (messages.length > 300) {
    messages.shift();
  }

  emitter.emit(EVENTS.LOAD_MESSAGE, messages);
}

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

    console.log('feedTopicHex', feedTopicHex);
    if (!ownIndex) {
      console.log('ownIndex', ownIndex);
      const { nextIndex } = await getLatestFeedIndex(bee, feedTopicHex, address);
      console.log('nextIndex', nextIndex);
      ownIndex = nextIndex;
    }

    const msgData = await uploadObjectToBee(bee, messageObj, stamp);
    console.log('msgData', msgData);
    if (!msgData) throw 'Could not upload message data to bee';

    const feedWriter = bee.makeFeedWriter('sequence', feedTopicHex, privateKey);
    console.log('feedWriter', feedWriter);
    const ref = await feedWriter.upload(stamp, msgData.reference, { index: ownIndex });
    console.log('ref', ref);
    ownIndex++;

    return ref;
  } catch (error) {
    console.error(
      `There was an error while trying to write own feed (chat), index: ${ownIndex}, message: ${messageObj.message}: ${error}  `,
    );
    throw new Error('Could not send message');
  }
}

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

function emitStateEvent(event: string, value: any) {
  if (eventStates[event] !== value) {
    eventStates[event] = value;
    emitter.emit(event, value);
  }
}