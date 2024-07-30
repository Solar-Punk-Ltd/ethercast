import { BatchId, Bee, Reference } from '@ethersphere/bee-js';
import { ethers, Signature } from 'ethers';
import * as crypto from 'crypto';

import { 
  calculateTimeout,
  decreaseInterval,
  generateGraffitiFeedMetadata,
  generateUserOwnedFeedId, 
  getLatestFeedIndex, 
  graffitiFeedReaderFromTopic, 
  graffitiFeedWriterFromTopic, 
  increaseInterval, 
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
  DECREASE_LIMIT, 
  EVENTS, 
  F_STEP, 
  FETCH_INTERVAL_DECREASE_LIMIT, 
  FETCH_INTERVAL_INCREASE_LIMIT, 
  HEX_RADIX, 
  IDLE_TIME, 
  INCREASE_LIMIT, 
  MAX_TIMEOUT, 
  MESSAGE_CHECK_INTERVAL, 
  MESSAGE_FETCH_MAX, 
  MESSAGE_FETCH_MIN, 
  REMOVE_INACTIVE_USERS_INTERVAL, 
  SECOND,
  USER_UPDATE_INTERVAL
} from './constants';

const bee = new Bee('http://195.88.57.155:1633');
const emitter = new EventEmitter();
const messages: MessageData[] = [];
const reqTimeAvg = new RunningAverage(1000);

let usersQueue: AsyncQueue;
let messagesQueue: AsyncQueue;
let users: UserWithIndex[] = [];
let inactiveUsers: UserWithIndex[] = [];                              // Currently not polling messages from these users
let usersLoading = false;
let usersFeedIndex: number = 0;                                       // Will be overwritten on user-side, by initUsers
let ownIndex: number;
let removeIdleUsersInterval: NodeJS.Timeout | null = null;            // Streamer-side interval, for idle user removing
let userFetchInterval: NodeJS.Timeout | null = null;                  // User-side interval, for user fetching
let messageFetchInterval: NodeJS.Timeout | null = null;               // User-side interval, for message fetching
let mInterval: number = MESSAGE_FETCH_MIN * 3;                        // We initialize message fetch interval to higher than min, we don't know network conditions yet
let messagesIndex = 0;
let removeIdleIsRunning = false;                                      // Avoid race conditions
let userActivityTable: UserActivity = {};                             // Used to remove inactive users
let previousActiveUsers: EthAddress[] = [];                           //TODO possibly obsolate

// Diagnostics
let reqCount = 0;

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

// Should be called from outside the library, for example React, will start the user fetch process
export function startUserFetchProcess(topic: string) {
  if (userFetchInterval) {
    clearInterval(userFetchInterval);
  }
  userFetchInterval = setInterval(startFetchingForNewUsers(topic), USER_UPDATE_INTERVAL);
}

// Should be called from outside the library, for example React, will stop the user fetch process
export function stopUserFetchProcess() {
  if (userFetchInterval) {
    clearInterval(userFetchInterval);
    userFetchInterval = null;
  }
}

// Should be called from outside the library, for example React, will start message fetch process
export function startMessageFetchProcess(topic: string) {
  if (messageFetchInterval) {
    clearInterval(messageFetchInterval);
  }
  messageFetchInterval = setInterval(startLoadingNewMessages(topic), mInterval);
}

// Should be called from outside the library, for example React, will stop the message fetch process
export function stopMessageFetchProcess() {
  if (messageFetchInterval) {
    clearInterval(messageFetchInterval);
    messageFetchInterval = null;
  }
}

// Every User is doing Activity Analysis, and one of them is selected to write the UsersFeed
async function startActivityAnalyzes(topic: string, ownAddress: EthAddress, stamp: BatchId) {
  try {
    console.info("Starting Activity Analysis...");
    //const { startFetchingForNewUsers, startLoadingNewMessages } = getChatActions();
    //const { on, off } = getChatActions();

    //streamerUserFetchInterval = setInterval(startFetchingForNewUsers(topic), STREAMER_USER_UPDATE_INTERVAL);              // startFetchingForNewUsers is returning a function
    //streamerMessageFetchInterval = setInterval(startLoadingNewMessages(topic), STREAMER_MESSAGE_CHECK_INTERVAL);          // startLoadingNewMessages is returning a function
    removeIdleUsersInterval = setInterval(() => removeIdleUsers(topic, ownAddress, stamp), REMOVE_INACTIVE_USERS_INTERVAL);
    // cleanup needs to happen somewhere, possibly in stop(). But that's not part of this library

    //on(EVENTS.LOAD_MESSAGE, notifyAboutNewMessage);
    //on(EVENTS.LOADING_INIT_USERS, notifyAboutUserRegistration);   // this might not be needed
    //off(EVENTS.LOADING_USERS, notifyAboutUserRegistration);       // Rejoin

  } catch (error) {
    console.error(error);
    throw new Error('Could not start activity analysis');
  }
}

// Used for Activity Analysis
async function notifyAboutUserRegistration() {
  try {
    
    if (previousActiveUsers.length >= users.length) {
      console.info("previousActiveUsers list is bigger or equal to current users list. Exiting function.");
      return;
    } else {
      const start = previousActiveUsers.length;
      for (let i = start; i < users.length; i++) {
        const address = users[i].address;
        console.info(`New users registered. Inserting ${users[i].timestamp} to ${address}`);
        userActivityTable[address].timestamp = users[i].timestamp;
      }
    }

    console.log("User Activity Table: ", userActivityTable);

  } catch (error) {
    console.error(error);
    throw new Error('There was an error while processing new user registration on streamer side');
  }
}

// Used for Activity Analysis
//TODO rename
async function notifyAboutNewMessage(messages: MessageData[]) {
  try {
    console.log("ENTERED INTO MESSAGE NOTIFY")
    console.log("Last message: ", messages[messagesIndex])

    // Initializing UserActivity table entry
    //TODO possibly one of these is not needed
    /*if (!userActivityTable[messages[messagesIndex].address]) {
      userActivityTable[messages[messagesIndex].address] = {
        timestamp: messages[messagesIndex].timestamp,
        readFails: 0
      }
    }*/

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

async function removeIdleUsers(topic: string, ownAddress: EthAddress, stamp: BatchId) {
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
            
      return idleMs[userAddr] < IDLE_TIME;
    });
    if (activeUsers.length === 0) {
      console.info("There are no active users, Activity Analysis will continue when a user registers.");
    }
    const minUsersToSelect = 1;
    const numUsersToselect = Math.max(Math.ceil(activeUsers.length * 0.3), minUsersToSelect);     // Select top 30% of activeUsers, but minimum 1
    const sortedActiveUsers = activeUsers.sort((a, b) => b.timestamp - a.timestamp);              // Sort activeUsers by timestamp
    const mostActiveUsers = sortedActiveUsers.slice(0, numUsersToselect);                         // Top 30% but minimum 1 

    // Lottery about UsersFeedCommit
    console.log("Most active users: ", mostActiveUsers);
    const sortedMostActiveAddresses = mostActiveUsers.map((user) => user.address).sort();
    const seedString = sortedMostActiveAddresses.join(',');
    const hash = crypto.createHash('sha256').update(seedString).digest('hex');
    const randomIndex = parseInt(hash, 16) % mostActiveUsers.length;
    const selectedUser = mostActiveUsers[randomIndex].address;

    if (selectedUser === ownAddress) {
      console.info("The user was selected for submitting the UsersFeedCommit!");
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
      
      previousActiveUsers = activeUsers.map((user) => user.address);
      users = activeUsers;
    }

    removeIdleIsRunning = false;

  } catch (error) {
    removeIdleIsRunning = false;
    console.error(error);
    throw new Error('There was an error while removing idle users from the Users feed');
  }
}

export async function initUsers(topic: string, ownAddress: EthAddress, stamp: BatchId): Promise<UserWithIndex[] | null> {
  try {
    emitStateEvent(EVENTS.LOADING_INIT_USERS, true);

    const feedReader = graffitiFeedReaderFromTopic(bee, topic);
    let aggregatedList: UserWithIndex[] = [];

    const feedEntry = await feedReader.download();
    usersFeedIndex = parseInt(feedEntry.feedIndexNext, HEX_RADIX);

    for (let i = usersFeedIndex; i > 0 ; i--) {
      const feedEntry = await feedReader.download();
      const data = await bee.downloadData(feedEntry.reference);
      const objectFromFeed = data.json() as unknown as UsersFeedCommit;
      const validUsers = objectFromFeed.users.filter((user) => validateUserObject(user));
      if (objectFromFeed.overwrite) {                             // They will have index that was already written to the object by Activity Analysis writer
        const usersBatch: UserWithIndex[] = validUsers as unknown as UserWithIndex[];
        aggregatedList = [...aggregatedList, ...usersBatch];
      } else {                                                    // These do not have index, but we can initialize them to 0
        const usersBatch = validUsers.map((user) => {
          return { 
            ...user, 
            index: 0
          };
        });
        aggregatedList = [...aggregatedList, ...usersBatch];
      }
    }

    await setUsers(aggregatedList);

    return aggregatedList;
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

    //const uploadableUsers = users.map((user) => ({ ...user, index: undefined }));
    //TODO above line should be deleted, here, we only upload a user object (this is registration), and getNewUsers will concatenate this with the other users.
    const uploadObject: UsersFeedCommit = {
      users: [newUser],
      overwrite: false
    }

    const userRef = await uploadObjectToBee(bee, uploadObject, stamp as any);
    if (!userRef) throw new Error('Could not upload user to bee');

    const feedWriter = graffitiFeedWriterFromTopic(bee, topic);

    try {
      await feedWriter.upload(stamp, userRef.reference);
      startActivityAnalyzes(topic, address, stamp as BatchId);                    // Every User is doing Activity Analysis, and one of them is selected to write the UsersFeed
    } catch (error) {
      if (isNotFoundError(error)) {
        await feedWriter.upload(stamp, userRef.reference, { index: 0 });
        startActivityAnalyzes(topic, address, stamp as BatchId);                  // Every User is doing Activity Analysis, and one of them is selected to write the UsersFeed
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
  
    const feedReader = graffitiFeedReaderFromTopic(bee, topic);
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
        const res = await getLatestFeedIndex(bee, bee.makeFeedTopic(userTopicString), user.address);
        newUsers.push({...user, index: res.nextIndex});
      }
    }
  
    await setUsers(newUsers);
    usersFeedIndex++;                                                                       // We assume that download was successful. Next time we are checking next index.
  
    // update userActivityTable
    notifyAboutUserRegistration();
    emitStateEvent(EVENTS.LOADING_USERS, false);
    
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes("timeout")) {
        console.info(`Timeout exceeded.`);
        reqTimeAvg.addValue(MAX_TIMEOUT);
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
    messagesQueue = new AsyncQueue({ indexed: false, waitable: true, max: 4 });
  }

  return async () => {
    const isWaiting = await messagesQueue.waitForProcessing();
    if (isWaiting) {
      return;
    }

    for (const user of users) {
      reqCount++;
      console.info(`Request enqueued. Total request count: ${reqCount}`);
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
      console.warn("WARNING! No index found!")
      const { latestIndex, nextIndex } = await getLatestFeedIndex(bee, topic, user.address);
      currIndex = latestIndex === -1 ? nextIndex : latestIndex;
    }

    // Update userActivityTable
    notifyAboutNewMessage(messages);
  
    // Adjust max parallel request count, based on avg request time, which indicates, how much the node is overloaded
    if (reqTimeAvg.getAverage() > DECREASE_LIMIT) messagesQueue.decreaseMax();
    if (reqTimeAvg.getAverage() < INCREASE_LIMIT) messagesQueue.increaseMax(users.length * 4);  // *4 is just for simulation purposes, it should be exactly users.length

    // Adjust message fetch interval
    if (reqTimeAvg.getAverage() > FETCH_INTERVAL_INCREASE_LIMIT) {
      if (mInterval + F_STEP <= MESSAGE_FETCH_MAX) {
        mInterval = mInterval + F_STEP;
        if (messageFetchInterval) clearInterval(messageFetchInterval);
        messageFetchInterval = setInterval(startLoadingNewMessages(rawTopic), mInterval);
        console.info(`Increased message fetch interval to ${mInterval} ms`);
      }
    }
    if (reqTimeAvg.getAverage() < FETCH_INTERVAL_DECREASE_LIMIT) {
      if (mInterval - F_STEP > MESSAGE_FETCH_MIN) {
        mInterval = mInterval - F_STEP;
        if (messageFetchInterval) clearInterval(messageFetchInterval);
        messageFetchInterval = setInterval(startLoadingNewMessages(rawTopic), mInterval);
        console.info(`Decreased message fetch interval to ${mInterval-F_STEP} ms`);
      }
    }

    // We measure the request time with the first Bee API request, with the second request, we do not do this, because it is very similar
    const feedReader = bee.makeFeedReader('sequence', topic, user.address, { timeout: MAX_TIMEOUT });
    const start = Date.now();
    const recordPointer = await feedReader.download({ index: currIndex });
    const end = Date.now();
    reqTimeAvg.addValue(end-start);
    

    // We download the actual message data
    const data = await bee.downloadData(recordPointer.reference);
    const messageData = JSON.parse(new TextDecoder().decode(data)) as MessageData;
  
    //const newUsers = users.map((u) => (u.address === user.address ? { ...u, index: currIndex + 1 } : u));
    const uIndex = users.findIndex((u) => (u.address === user.address));
    const newUsers = users;
    if (newUsers[uIndex]) newUsers[uIndex].index = currIndex + 1;         // If this User was dropped, we won't increment it's index, but Streamer will
    await setUsers(newUsers);
  
    messages.push(messageData);
  
    // TODO - discuss with the team
    if (messages.length > 300) {
      messages.shift();
    }
  
    emitter.emit(EVENTS.LOAD_MESSAGE, messages);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes("timeout")) {
        console.info(`Timeout of ${MAX_TIMEOUT} exceeded for readMessage.`);
        reqTimeAvg.addValue(MAX_TIMEOUT);
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