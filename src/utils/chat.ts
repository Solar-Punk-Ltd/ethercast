import { ethers } from "ethers";
import { EthAddress, MessageData } from "../libs/chat";


// Save messages to localStorage for the corresponding chat room
export function saveMessages(chatRoom: string, messages: MessageData[]) {
    localStorage.setItem(chatRoom, JSON.stringify(messages));
}

// Load messages from localStorage for the corresponding chat room
export function loadMessages(chatRoom: string): MessageData[] {
    const storedMessages = JSON.parse(localStorage.getItem(chatRoom) || '[]');
    return storedMessages;
}

// Generate an ID for the feed, that will be connected to the stream, as Users list
export function generateUsersFeedId(topic: string) {
    return `${topic}_EthercastChat_Users`;
}

// Generate a room ID, for aggregated ChatFeed, that will be connected to a stream
export function generateRoomId(topic: string) {
    return`${topic}_EthercastChat_AggregatedChat`;
}

// Generate an ID for the feed, that is owned by a single user, who is writing messages to the chat
export function generateUserOwnedFeedId(topic: string, userAddress: EthAddress) {
    return `${topic}_EthercastChat_${userAddress}`
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
        if (typeof user.username !== 'string') throw "username should be a string";
        if (typeof user.address !== 'string') throw "address should be a string";
        if (typeof user.timestamp !== 'number') throw "timestamp should be number";
        if (typeof user.signature !== 'string') throw "signature should be a string";
        
        // Check for absence of extra properties
        const allowedProperties = ['username', 'address', 'timestamp', 'signature'];
        const extraProperties = Object.keys(user).filter(key => !allowedProperties.includes(key));
        if (extraProperties.length > 0) {
            throw `Unexpected properties found: ${extraProperties.join(', ')}`;
        }

        const message = {
            username: user.username,
            address: user.address,
            timestamp: user.timestamp
        }

        const returnedAddress = ethers.utils.verifyMessage(JSON.stringify(message), user.signature);
        if (returnedAddress !== user.address) throw "Signature verification failed!";
        
        return true;
    } catch (error) {
        console.error("This User object is not correct: ", error);
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

    messages.forEach(message => {
        const key = `${message.timestamp}_${message.message}`;
        uniqueMessages[key] = message;
    });

    const uniqueMessagesArray = Object.values(uniqueMessages);
    
    return uniqueMessagesArray;
}
