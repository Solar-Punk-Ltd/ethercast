"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.removeDuplicate = exports.orderMessages = exports.validateUserObject = exports.objectToUint8Array = exports.generateUniqId = exports.generateUserOwnedFeedId = exports.generateRoomId = exports.generateUsersFeedId = exports.loadMessages = exports.saveMessages = void 0;
const ethers_1 = require("ethers");
// Save messages to localStorage for the corresponding chat room
function saveMessages(chatRoom, messages) {
    localStorage.setItem(chatRoom, JSON.stringify(messages));
}
exports.saveMessages = saveMessages;
// Load messages from localStorage for the corresponding chat room
function loadMessages(chatRoom) {
    const storedMessages = JSON.parse(localStorage.getItem(chatRoom) || '[]');
    return storedMessages;
}
exports.loadMessages = loadMessages;
// Generate an ID for the feed, that will be connected to the stream, as Users list
function generateUsersFeedId(topic) {
    return `${topic}_EthercastChat_Users`;
}
exports.generateUsersFeedId = generateUsersFeedId;
// Generate a room ID, for aggregated ChatFeed, that will be connected to a stream
function generateRoomId(topic) {
    return `${topic}_EthercastChat_AggregatedChat`;
}
exports.generateRoomId = generateRoomId;
// Generate an ID for the feed, that is owned by a single user, who is writing messages to the chat
function generateUserOwnedFeedId(topic, userAddress) {
    return `${topic}_EthercastChat_${userAddress}`;
}
exports.generateUserOwnedFeedId = generateUserOwnedFeedId;
// UniqID will contain streamer address + topic
function generateUniqId(topic, streamerAddress) {
    return `${streamerAddress}-${topic}`;
}
exports.generateUniqId = generateUniqId;
// Used for message obj serialization
function objectToUint8Array(jsObject) {
    const json = JSON.stringify(jsObject);
    const encoder = new TextEncoder();
    return encoder.encode(json);
}
exports.objectToUint8Array = objectToUint8Array;
// Validates a User object, including incorrect type, and signature
function validateUserObject(user) {
    try {
        if (typeof user.username !== 'string')
            throw "username should be a string";
        if (typeof user.address !== 'string')
            throw "address should be a string";
        if (typeof user.timestamp !== 'number')
            throw "timestamp should be number";
        if (typeof user.signature !== 'string')
            throw "signature should be a string";
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
        };
        const returnedAddress = ethers_1.ethers.utils.verifyMessage(JSON.stringify(message), user.signature);
        if (returnedAddress !== user.address)
            throw "Signature verification failed!";
        return true;
    }
    catch (error) {
        console.error("This User object is not correct: ", error);
        return false;
    }
}
exports.validateUserObject = validateUserObject;
// Returns timesstamp ordered messages
function orderMessages(messages) {
    return messages.sort((a, b) => a.timestamp - b.timestamp);
}
exports.orderMessages = orderMessages;
// Removes duplicates, also pays attention to same-timestamp unique messages
function removeDuplicate(messages) {
    const uniqueMessages = {};
    messages.forEach(message => {
        const key = `${message.timestamp}_${message.message}`;
        uniqueMessages[key] = message;
    });
    const uniqueMessagesArray = Object.values(uniqueMessages);
    return uniqueMessagesArray;
}
exports.removeDuplicate = removeDuplicate;
