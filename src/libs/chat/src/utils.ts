import { ethers, BytesLike, utils, Wallet } from 'ethers';
import { BatchId, Bee, BeeRequestOptions, Signer, UploadResult, Utils } from '@ethersphere/bee-js';
import { EthAddress, MessageData, Sha3Message } from './types';
import { CONSENSUS_ID, HEX_RADIX } from './constants';

// Generate an ID for the feed, that will be connected to the stream, as Users list
export function generateUsersFeedId(topic: string) {
  return `${topic}_EthercastChat_Users`;
}

// Generate an ID for the feed, that is owned by a single user, who is writing messages to the chat
export function generateUserOwnedFeedId(topic: string, userAddress: EthAddress) {
  return `${topic}_EthercastChat_${userAddress}`;
}
/*
// UniqID will contain streamer address + topic
export function generateUniqId(topic: string, streamerAddress: EthAddress) {
  return `${streamerAddress}-${topic}`;
}

// Used for message obj serialization
export function objectToUint8Array(jsObject: object): Uint8Array {
  const json = JSON.stringify(jsObject);
  const encoder = new TextEncoder();
  return encoder.encode(json);
}*/

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

    // Create the message that is signed, and validate the signature
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

// Returns timesstamp ordered messages (currently not used)
export function orderMessages(messages: MessageData[]) {
  return messages.sort((a, b) => a.timestamp - b.timestamp);
}

// Removes duplicates, also pays attention to same-timestamp unique messages (currently not used)
export function removeDuplicate(messages: MessageData[]): MessageData[] {
  const uniqueMessages: { [key: string]: MessageData } = {};

  messages.forEach((message) => {
    const key = `${message.timestamp}_${message.message}`;
    uniqueMessages[key] = message;
  });

  const uniqueMessagesArray = Object.values(uniqueMessages);

  return uniqueMessagesArray;
}

// getConsensualPrivateKey will generate a private key, that is used for the Graffiti-feed (which is a public feed, for user registration)
function getConsensualPrivateKey(resource: Sha3Message) {
  if (Utils.isHexString(resource) && resource.length === 64) {
    return Utils.hexToBytes(resource);
  }

  return Utils.keccak256Hash(resource);
}

// getGraffitiWallet generates a Graffiti wallet, from provided private key (see getConsensualPrivateKey)
function getGraffitiWallet(consensualPrivateKey: BytesLike) {
  const privateKeyBuffer = utils.hexlify(consensualPrivateKey);
  return new Wallet(privateKeyBuffer);
}

// Serializes a js object, into Uint8Array
function serializeGraffitiRecord(record: Record<any, any>) {
  return new TextEncoder().encode(JSON.stringify(record));
}

// Creates feed-index-format index, from a number
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

export async function uploadObjectToBee(bee: Bee, jsObject: object, stamp: BatchId): Promise<UploadResult | null> {
  try {
    const result = await bee.uploadData(stamp as any, serializeGraffitiRecord(jsObject), { redundancyLevel: 4 });
    return result;
  } catch (error) {
    console.error(`There was an error while trying to upload object to Swarm: ${error}`);
    return null;
  }
}

export function graffitiFeedWriterFromTopic(bee: Bee, topic: string, options?: BeeRequestOptions) {
  const { consensusHash, graffitiSigner } = generateGraffitiFeedMetadata(topic);
  return bee.makeFeedWriter('sequence', consensusHash, graffitiSigner, options);
}

export function graffitiFeedReaderFromTopic(bee: Bee, topic: string, options?: BeeRequestOptions) {
  const { consensusHash, graffitiSigner } = generateGraffitiFeedMetadata(topic);
  return bee.makeFeedReader('sequence', consensusHash, graffitiSigner.address, options);
}

export function generateGraffitiFeedMetadata(topic: string) {
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

export async function getLatestFeedIndex(bee: Bee, topic: string, address: EthAddress) {
  try {
    const feedReader = bee.makeFeedReader('sequence', topic, address);
    const feedEntry = await feedReader.download();

    const latestIndex = parseInt(feedEntry.feedIndex.toString(), HEX_RADIX);
    const nextIndex = parseInt(feedEntry.feedIndexNext, HEX_RADIX);

    return { latestIndex, nextIndex };
  } catch (error) {
    if (isNotFoundError(error)) {
      return { latestIndex: -1, nextIndex: 0 };
    }
    throw error;
  }
}

// TODO: why bee-js do this?
// status is undefined in the error object
export function isNotFoundError(error: any) {
  return error.stack.includes('404') || error.message.includes('Not Found') || error.message.includes('404');
}
