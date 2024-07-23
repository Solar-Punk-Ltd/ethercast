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
  RunningAverage, 
  uploadObjectToBee, 
  validateUserObject 
} from './utils';
import { EventEmitter } from './eventEmitter';
import { AsyncQueue } from './asyncQueue';

import { 
  EthAddress, 
  MessageData, 
  ParticipantDetails, 
  User, 
  UserActivity, 
  UserWithIndex
} from './types';

import { 
  CONSENSUS_ID, 
  EVENTS, 
  HEX_RADIX, 
  REMOVE_INACTIVE_USERS_INTERVAL, 
  STREAMER_MESSAGE_CHECK_INTERVAL 
} from './constants';

const bee = new Bee('http://195.88.57.155:1633');
const emitter = new EventEmitter();
const messages: MessageData[] = [];
const reqTimeAvg = new RunningAverage(100);

let usersQueue: AsyncQueue;
let messagesQueue: AsyncQueue;
let users: UserWithIndex[] = [];
let usersLoading = false;
let usersInitIndex: number;
let ownIndex: number;
let streamerMessageFetchInterval = null;
let streamerUserFetchInterval = null;
let removeIdleUsersInterval = null;
let messagesIndex = 0;
let userActivityTable: UserActivity = {};

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

    startActivityAnalyzes(topic);
  } catch (error) {
    console.error(error);
    throw new Error('Could not create Users feed');
  }
}

async function startActivityAnalyzes(topic: string) {
  try {
    const { startFetchingForNewUsers, startLoadingNewMessages } = getChatActions();
    const { on, off } = getChatActions();

    //streamerUserFetchInterval = setInterval(startFetchingForNewUsers(topic), USER_UPDATE_INTERVAL);
    streamerMessageFetchInterval = setInterval(() => startLoadingNewMessages(topic), STREAMER_MESSAGE_CHECK_INTERVAL);
    removeIdleUsersInterval = setInterval(() => removeIdleUsers(topic), REMOVE_INACTIVE_USERS_INTERVAL);
    // cleanup needs to happen somewhere, possibly in stop(). But that's not part of this library

    on(EVENTS.LOAD_MESSAGE, notifyStreamerAboutNewMessage);
    //on(EVENTS.LOADING_INIT_USERS, notifyStreamerAboutUserRegistration);

  } catch (error) {
    console.error(error);
    throw new Error('Could not start activity analysis');
  }
}

async function notifyStreamerAboutUserRegistration() {
  try {
    console.log("ENTERED INTO USER NOTIFY")
    // new user is added to the user activity table
    // clean up inactive users
    // re-publish active users list
    // THIS IS NOT NEEDED!
    // But maybe it is needed after all, so we are not deleting it just now yet

  } catch (error) {
    console.error(error);
    throw new Error('There was an error while processing new user registration on streamer side');
  }
}

async function notifyStreamerAboutNewMessage(messages: MessageData[]) {
  try {
    console.log("ENTERED INTO MESSAGE NOTIFY")
    console.log("Last message: ", messages[messagesIndex])


    userActivityTable[messages[messagesIndex].address] = messages[messagesIndex].timestamp;
    console.log("User Activity Table: ", userActivityTable);
    messagesIndex = messages.length;
    // message will change the user activity table
    // clean up inactive users
    // re-publish active users list

  } catch (error) {
    console.error(error);
    throw new Error('There wasn an error while processing new message on streamer side');
  }
}

async function removeIdleUsers(topic: string) {
  try {
    console.log("UserActivity table inside removeIdleUsers: ", userActivityTable);
  } catch (error) {
    console.error(error);
    throw new Error('There was an error while removing idle users from the Users feed');
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
    const usersPromises = validUsers.map(async (user) => {
      console.log("the user: ", user)
      const userTopicString = generateUserOwnedFeedId(topic, user.address);
      const res = await getLatestFeedIndex(bee, bee.makeFeedTopic(userTopicString), user.address);
      console.log("init user res: ", res)
      return { 
        ...user, 
        index: res.nextIndex
      };
    });
    const users = await Promise.all(usersPromises);
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

  const feedReader = graffitiFeedReaderFromTopic(bee, topic, { timeout: Math.floor(reqTimeAvg.getAverage() * 1.6) });
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
      const userTopicString = generateUserOwnedFeedId(topic, user.address);
      const res = await getLatestFeedIndex(bee, bee.makeFeedTopic(userTopicString), user.address);
      newUsers.push({ ...user, index: res.nextIndex });
    }
  }

  await setUsers(newUsers);

  emitStateEvent(EVENTS.LOADING_USERS, false);
}

export function startLoadingNewMessages(topic: string) {
  if (!messagesQueue) {
    messagesQueue = new AsyncQueue({ indexed: false, waitable: true, max: 8 });
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

  // We measure the request time with the first Bee API request, with the second request, we do not do this, because it is very similar
  const feedReader = bee.makeFeedReader('sequence', topic, user.address, { timeout: Math.floor(reqTimeAvg.getAverage() * 1.6) });
  const start = Date.now();
  const recordPointer = await feedReader.download({ index: currIndex });
  const end = Date.now();
  reqTimeAvg.addValue(end-start);

  // We download the actual message data
  const data = await bee.downloadData(recordPointer.reference);
  const messageData = JSON.parse(new TextDecoder().decode(data)) as MessageData;

  const newUsers = users.map((u) => (u.address === user.address ? { ...u, index: currIndex + 1 } : u));
  await setUsers(newUsers);

  messages.push(messageData);

  // TODO - discuss with the team
  if (messages.length > 300) {
    messages.shift();
  }

  console.log("EMIT is happening (LOAD_MESSAGE)");
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