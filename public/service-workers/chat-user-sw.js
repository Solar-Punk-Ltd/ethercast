"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chat_1 = require("../libs/chat");
const chatUserSide_1 = require("../libs/chatUserSide");
const sw = self;
// State
let state = chatUserSide_1.initialStateForChatUserSide;
// Input parameters
let streamTopic = null;
let streamerAddress = null;
// Fetch interval in MS
const FETCH_INTERVAL = 1000;
// Flag to indicate if a fetch operation is in progress
let isFetching = false;
// Listen for the 'install' event
sw.addEventListener('install', _event => {
    sw.skipWaiting();
});
// Listen for the 'activate' event. This will reset the state.
sw.addEventListener('activate', event => {
    // Cast event to ExtendableEvent to use waitUntil
    const activateEvent = event;
    activateEvent.waitUntil(sw.clients.claim());
    state = chatUserSide_1.initialStateForChatUserSide;
});
// Listen for messages from the main thread. Setting parameters, and reading the state.
sw.addEventListener('message', event => {
    const data = event.data;
    // Handle different types of messages
    switch (data.type) {
        case 'SET_PARAMETERS':
            streamTopic = data.streamTopic;
            streamerAddress = data.streamerAddress;
            startFetchingMessages();
            break;
        case 'INCREMENT_OWN_FEED_INDEX':
            state = (0, chatUserSide_1.chatUserSideReducer)(state, { type: chatUserSide_1.ChatActions.UPDATE_OWN_FEED_INDEX, payload: { ownFeedIndex: state.ownFeedIndex + 1 } });
            break;
        case 'GET_STATE':
            sw.postMessage({ type: 'STATE_UPDATE', state });
            break;
        default:
            console.error('Unknown message type:', data.type);
    }
});
// Will start the loop for fetching messages
function startFetchingMessages() {
    if (!streamTopic || !streamerAddress) {
        console.error('Stream topic or streamer address not set');
        return;
    }
    setInterval(() => {
        if (!isFetching) {
            isFetching = true;
            swReadNextMessage(streamTopic, streamerAddress)
                .finally(() => {
                isFetching = false;
            });
        }
    }, FETCH_INTERVAL);
}
// swReadNextMessage will read a new message from the AggregatedFeed, and insert it into the state
async function swReadNextMessage(streamTopic, streamerAddress) {
    try {
        const result = await (0, chat_1.readSingleMessage)(state.chatIndex, streamTopic, streamerAddress);
        if (!result)
            throw 'Error reading message!';
        state = (0, chatUserSide_1.chatUserSideReducer)(state, { type: chatUserSide_1.ChatActions.ADD_MESSAGE, payload: { message: result } });
        state = (0, chatUserSide_1.chatUserSideReducer)(state, { type: chatUserSide_1.ChatActions.ARRANGE });
        state = (0, chatUserSide_1.chatUserSideReducer)(state, { type: chatUserSide_1.ChatActions.UPDATE_CHAT_INDEX, payload: { chatIndex: state.chatIndex + 1 } });
    }
    catch (error) {
        // Currently we can't distinguish "no new messages" from error
        console.info("No new messages this time.");
        return null;
    }
}
