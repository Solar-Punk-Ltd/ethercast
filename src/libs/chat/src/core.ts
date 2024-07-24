import { BatchId, Bee, Reference } from '@ethersphere/bee-js';
import { ethers, Signature } from 'ethers';
import { isEqual } from 'lodash';

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
  IdleMs, 
  MessageData, 
  ParticipantDetails, 
  User, 
  UserActivity, 
  UsersFeedCommit, 
  UserWithIndex
} from './types';

import { 
  CONSENSUS_ID, 
  EVENTS, 
  HEX_RADIX, 
  IDLE_TIME, 
  REMOVE_INACTIVE_USERS_INTERVAL, 
  STREAMER_MESSAGE_CHECK_INTERVAL, 
  STREAMER_USER_UPDATE_INTERVAL
} from './constants';

const bee = new Bee('http://195.88.57.155:1633');
const emitter = new EventEmitter();
const messages: MessageData[] = [];
const reqTimeAvg = new RunningAverage(100);

let usersQueue: AsyncQueue;
let messagesQueue: AsyncQueue;
let users: UserWithIndex[] = [];
let inactiveUsers: UserWithIndex[] = [];                      // Currently not polling messages from these users
let usersLoading = false;
let usersFeedIndex: number = 0;                               // Will be overwritten on user-side, by initUsers
let ownIndex: number;
let streamerMessageFetchInterval = null;
let streamerUserFetchInterval = null;
let removeIdleUsersInterval = null;
let messagesIndex = 0;
let removeIdleIsRunning = false;                              // Avoid race conditions
let userActivityTable: UserActivity = {};
let previousActiveUsers: EthAddress[] = [];

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

    startActivityAnalyzes(topic, stamp);
  } catch (error) {
    console.error(error);
    throw new Error('Could not create Users feed');
  }
}

async function startActivityAnalyzes(topic: string, stamp: BatchId) {
  try {
    const { startFetchingForNewUsers, startLoadingNewMessages } = getChatActions();
    const { on, off } = getChatActions();

    streamerUserFetchInterval = setInterval(startFetchingForNewUsers(topic), STREAMER_USER_UPDATE_INTERVAL);              // startFetchingForNewUsers is returning a function
    streamerMessageFetchInterval = setInterval(startLoadingNewMessages(topic), STREAMER_MESSAGE_CHECK_INTERVAL);          // startLoadingNewMessages is returning a function
    removeIdleUsersInterval = setInterval(() => removeIdleUsers(topic, stamp), REMOVE_INACTIVE_USERS_INTERVAL);
    // cleanup needs to happen somewhere, possibly in stop(). But that's not part of this library

    on(EVENTS.LOAD_MESSAGE, notifyStreamerAboutNewMessage);
    on(EVENTS.LOADING_INIT_USERS, notifyStreamerAboutUserRegistration);   // this might not be needed
    off(EVENTS.LOADING_USERS, notifyStreamerAboutUserRegistration);       // Rejoin

  } catch (error) {
    console.error(error);
    throw new Error('Could not start activity analysis');
  }
}

async function notifyStreamerAboutUserRegistration() {
  try {
    
    if (previousActiveUsers.length >= users.length) {
      console.info("previousActiveUsers list is bigger or equal to current users list. Exiting function.");
      return;
    } else {
      const start = previousActiveUsers.length;
      //TODO this probably does not works
      console.log("USERREG previousActiveUsers.length", previousActiveUsers.length)
      console.log("USERREG users.length", users.length)
      for (let i = start; i < users.length; i++) {
        const address = users[i].address;
        console.info(`Inserting Date.now() to ${address}`);
        userActivityTable[address].timestamp = Date.now();
      }
    }

    console.log("User Activity Table: ", userActivityTable);

  } catch (error) {
    console.error(error);
    throw new Error('There was an error while processing new user registration on streamer side');
  }
}

async function notifyStreamerAboutNewMessage(messages: MessageData[]) {
  try {
    console.log("ENTERED INTO MESSAGE NOTIFY")
    console.log("Last message: ", messages[messagesIndex])

    // Initializing UserActivity table entry
    if (!userActivityTable[messages[messagesIndex].address]) {
      userActivityTable[messages[messagesIndex].address] = {
        timestamp: Date.now(),
        readFails: 0
      }
    }

    userActivityTable[messages[messagesIndex].address] = {
      timestamp: messages[messagesIndex].timestamp,
      readFails: 0
    }

    console.log("User Activity Table: ", userActivityTable);
    messagesIndex = messages.length;

  } catch (error) {
    console.error(error);
    throw new Error('There wasn an error while processing new message on streamer side');
  }
}

async function removeIdleUsers(topic: string, stamp: BatchId) {
  try {
    console.log("UserActivity table inside removeIdleUsers: ", userActivityTable);
    if (removeIdleIsRunning) return;
    removeIdleIsRunning = true;
    const idleMs: IdleMs = {};
    const now = Date.now();

    for (const rawKey in userActivityTable) {
      const key = rawKey as unknown as EthAddress;
      idleMs[key] = now - userActivityTable[key].timestamp;
    }

    console.log("Users inside removeIdle: ", users)
    const activeUsers = users.filter((user) => {
      const userAddr = user.address;
      if (!userActivityTable[userAddr]) {
        userActivityTable[userAddr] = { timestamp: Date.now(), readFails: 0 }
        return true;
      }
      const lastActivityTime = idleMs[userAddr];
      const effectiveIdleTime = IDLE_TIME - (userActivityTable[userAddr].readFails * STREAMER_MESSAGE_CHECK_INTERVAL);
      
      return idleMs[userAddr] < IDLE_TIME;
    });

    const activeUserAddresses = activeUsers.map((user) => user.address);

    console.log("idle times: ", idleMs)
    console.log("Active users: ", activeUsers);

    const activeListChanged = !isEqual(previousActiveUsers.sort((a,b) => a.localeCompare(b)), activeUserAddresses.sort((a,b) => a.localeCompare(b)));
    //TODO: This could be a function (uploadUserList)
    if (activeListChanged) {
      console.log("LIST CHANGED! Rewritting user list...");
      const uploadObject: UsersFeedCommit = {
        users: activeUsers,
        overwrite: true
      }
      const userRef = await uploadObjectToBee(bee, uploadObject, stamp as any);
      if (!userRef) throw new Error('Could not upload user list to bee');
  
      const feedWriter = graffitiFeedWriterFromTopic(bee, topic);
  
      try {
        await feedWriter.upload(stamp, userRef.reference);
        console.log("Upload was successful!")
      } catch (error) {
        console.log("UPLOAD ERROR (removeIdleUsers)");
      }
    }

    previousActiveUsers = activeUsers.map((user) => user.address);
    users = activeUsers;
    removeIdleIsRunning = false;

  } catch (error) {
    removeIdleIsRunning = false;
    console.error(error);
    throw new Error('There was an error while removing idle users from the Users feed');
  }
}

export async function initUsers(topic: string): Promise<UserWithIndex[] | null> {
  try {
    emitStateEvent(EVENTS.LOADING_INIT_USERS, true);

    const feedReader = graffitiFeedReaderFromTopic(bee, topic);

    const feedEntry = await feedReader.download();
    usersFeedIndex = parseInt(feedEntry.feedIndexNext, HEX_RADIX);

    const data = await bee.downloadData(feedEntry.reference);

    const objectFromFeed = data.json() as unknown as UsersFeedCommit;
    const validUsers = objectFromFeed.users.filter((user) => validateUserObject(user));
    const usersPromises = validUsers.map(async (user) => {
      const userTopicString = generateUserOwnedFeedId(topic, user.address);
      const res = await getLatestFeedIndex(bee, bee.makeFeedTopic(userTopicString), user.address);
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
    const uploadObject: UsersFeedCommit = {
      users: uploadableUsers,
      overwrite: false
    }
    const userRef = await uploadObjectToBee(bee, uploadObject, stamp as any);
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
    //TODO we have to think about how index is exactly working here, and if it is connected to the Graffiti feed's index itself.
    usersQueue = new AsyncQueue({ indexed: true, index: numberToFeedIndex(usersFeedIndex!), waitable: true, max: 1 });
  }
  return () => usersQueue.enqueue((index) => getNewUsers(topic));
}

async function getNewUsers(topic: string) {
  try {
    emitStateEvent(EVENTS.LOADING_USERS, true);
  
    const feedReader = graffitiFeedReaderFromTopic(bee, topic/*, { timeout: Math.floor(reqTimeAvg.getAverage() * 1.6) }*/);
    console.log("usersFeedIndex: ", usersFeedIndex)
    const feedEntry = await feedReader.download({ index: usersFeedIndex });
  
    const data = await bee.downloadData(feedEntry.reference);
    const objectFromFeed = data.json() as unknown as UsersFeedCommit;
    console.log("New UsersFeedCommit received! ", objectFromFeed)
  
    const validUsers = objectFromFeed.users.filter((user) => validateUserObject(user));
    const newUsersSet = new Set(validUsers.map((user) => user.address));
    inactiveUsers = [...inactiveUsers, ...users.filter((user) => !newUsersSet.has(user.address))];

    let newUsers: UserWithIndex[] = [];
    if (!objectFromFeed.overwrite) newUsers = [...users];                                        // In this case, we accumulate User objects, othetwise, we owerwrite it

    for (const user of validUsers) {
      const alreadyRegistered = users.find((u) => u.address === user.address);
      if (alreadyRegistered && objectFromFeed.overwrite) {                                       // If we are in overwrite mode, we need to add back these users to the feed
        newUsers.push(alreadyRegistered);
        continue;
      }
      const deactivatedUser = inactiveUsers.find((u) => u.address === user.address);             // This is a rejoin (user registers again, after being idle)
      
      if (deactivatedUser) {
        // Re-add user to active users
        newUsers.push(deactivatedUser);
        inactiveUsers = inactiveUsers.filter((user) => user !== deactivatedUser);                // We remove the User from the inactive list
        continue;
      } else {
        const userTopicString = generateUserOwnedFeedId(topic, user.address);                    // First registration, initalization
        const res = await getLatestFeedIndex(bee, bee.makeFeedTopic(userTopicString), user.address);    // probably { 0, 1 } would just work fine
        newUsers.push({ ...user, index: res.nextIndex });
      }
    }
  
    await setUsers(newUsers);
    usersFeedIndex++;                                                                       // We assume that download was successful. Next time we are checking next index.
  
    emitStateEvent(EVENTS.LOADING_USERS, false);
    
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes("timeout")) {
        console.info(`Timeout of ${Math.floor(reqTimeAvg.getAverage()*1.6)} exceeded.`);
      } else {
        if (!isNotFoundError(error)) {
          console.error(error);
          throw new Error('There was an error in the getNewUsers function');
        }
      }
    }
  }
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
  try {
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
  
    //const newUsers = users.map((u) => (u.address === user.address ? { ...u, index: currIndex + 1 } : u));
    const uIndex = users.findIndex((u) => (u.address === user.address));
    users[uIndex].index = currIndex + 1;
    //await setUsers(newUsers);     // this might give some safety, but we will turn it off for now
  
    messages.push(messageData);
  
    // TODO - discuss with the team
    if (messages.length > 300) {
      messages.shift();
    }
  
    emitter.emit(EVENTS.LOAD_MESSAGE, messages);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes("timeout")) {
        console.info(`Timeout of ${Math.floor(reqTimeAvg.getAverage()*1.6)} exceeded for readMessage.`);
      } else {
        if (!isNotFoundError(error)) {
          if (userActivityTable[user.address]) userActivityTable[user.address].readFails++;                  // We increment read fail count
          console.error(error);
          throw new Error('There was an error in the readMessage function');
        }
      }
    }
  }
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

    if (!ownIndex) {
      const { nextIndex } = await getLatestFeedIndex(bee, feedTopicHex, address);
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