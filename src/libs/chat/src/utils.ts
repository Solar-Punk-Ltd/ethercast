import { ethers, BytesLike, utils, Wallet } from 'ethers';
import { Utils } from '@ethersphere/bee-js';
import { EthAddress, MessageData, Sha3Message } from './types';
import { HEX_RADIX } from './constants';

// Generate an ID for the feed, that will be connected to the stream, as Users list
export function generateUsersFeedId(topic: string) {
  return `${topic}_EthercastChat_Users`;
}

// Generate a room ID, for aggregated ChatFeed, that will be connected to a stream
export function generateRoomId(topic: string) {
  return `${topic}_EthercastChat_AggregatedChat`;
}

// Generate an ID for the feed, that is owned by a single user, who is writing messages to the chat
export function generateUserOwnedFeedId(topic: string, userAddress: EthAddress) {
  return `${topic}_EthercastChat_${userAddress}`;
}

// UniqID will contain streamer address + topic
export function generateUniqId(topic: string, streamerAddress: EthAddress) {
  return `${streamerAddress}-${topic}`;
}

// Used for message obj serialization
export function objectToUint8Array(jsObject: object): Uint8Array {
  const json = JSON.stringify(jsObject);
  const encoder = new TextEncoder();
  return encoder.encode(json);
}

// Validates a User object, including incorrect type, and signature
export function validateUserObject(user: any): boolean {
  try {
    if (typeof user.username !== 'string') throw 'username should be a string';
    if (typeof user.address !== 'string') throw 'address should be a string';
    if (typeof user.timestamp !== 'number') throw 'timestamp should be number';
    if (typeof user.signature !== 'string') throw 'signature should be a string';

    // Check for absence of extra properties
    const allowedProperties = ['username', 'address', 'timestamp', 'signature'];
    const extraProperties = Object.keys(user).filter((key) => !allowedProperties.includes(key));
    if (extraProperties.length > 0) {
      throw `Unexpected properties found: ${extraProperties.join(', ')}`;
    }

    const message = {
      username: user.username,
      address: user.address,
      timestamp: user.timestamp,
    };

    const returnedAddress = ethers.utils.verifyMessage(JSON.stringify(message), user.signature);
    if (returnedAddress !== user.address) throw 'Signature verification failed!';

    return true;
  } catch (error) {
    console.error('This User object is not correct: ', error);
    return false;
  }
}

// Returns timesstamp ordered messages
export function orderMessages(messages: MessageData[]) {
  return messages.sort((a, b) => a.timestamp - b.timestamp);
}

// Removes duplicates, also pays attention to same-timestamp unique messages
export function removeDuplicate(messages: MessageData[]): MessageData[] {
  const uniqueMessages: { [key: string]: MessageData } = {};

  messages.forEach((message) => {
    const key = `${message.timestamp}_${message.message}`;
    uniqueMessages[key] = message;
  });

  const uniqueMessagesArray = Object.values(uniqueMessages);

  return uniqueMessagesArray;
}

export function getConsensualPrivateKey(resource: Sha3Message) {
  if (Utils.isHexString(resource) && resource.length === 64) {
    return Utils.hexToBytes(resource);
  }

  return Utils.keccak256Hash(resource);
}

export function getGraffitiWallet(consensualPrivateKey: BytesLike) {
  const privateKeyBuffer = utils.hexlify(consensualPrivateKey);
  return new Wallet(privateKeyBuffer);
}

export function serializeGraffitiRecord(record: Record<any, any>) {
  return new TextEncoder().encode(JSON.stringify(record));
}

export function numberToFeedIndex(index: number) {
  const bytes = new Uint8Array(8);
  const dv = new DataView(bytes.buffer);
  dv.setUint32(4, index);

  return Utils.bytesToHex(bytes);
}

export function sleep(delay: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, delay);
  });
}

export function incrementHexString(hexString: string, i = 1n) {
  const num = BigInt('0x' + hexString);
  return (num + i).toString(HEX_RADIX).padStart(HEX_RADIX, '0');
}

export async function retryAwaitableAsync<T>(
  fn: () => Promise<T>,
  retries: number = 3,
  delay: number = 250,
): Promise<T> {
  return new Promise((resolve, reject) => {
    fn()
      .then(resolve)
      .catch((error) => {
        if (retries > 0) {
          console.log(`Retrying... Attempts left: ${retries}. Error: ${error.message}`);
          setTimeout(() => {
            retryAwaitableAsync(fn, retries - 1, delay)
              .then(resolve)
              .catch(reject);
          }, delay);
        } else {
          console.error(`Failed after ${retries} initial attempts. Last error: ${error.message}`);
          reject(error);
        }
      });
  });
}