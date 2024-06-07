import { EthAddress, readSingleMessage } from "../libs/chat";
import { ChatActions, chatUserSideReducer, initialStateForChatUserSide } from "../libs/chatUserSide";
const sw = self as unknown as ServiceWorkerGlobalScope;

// State
let state = initialStateForChatUserSide;

// Input parameters
let streamTopic: string | null = null;
let streamerAddress: EthAddress | null = null;

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
  const activateEvent = event as ExtendableEvent;
  activateEvent.waitUntil(sw.clients.claim());

  state = initialStateForChatUserSide;
});

// Listen for messages from the main thread. Setting parameters, and reading the state.
sw.addEventListener('message', event => {
  const data = (event as MessageEvent).data;

  // Handle different types of messages
  switch(data.type) {
    case 'SET_PARAMETERS':
      streamTopic = data.streamTopic;
      streamerAddress = data.streamerAddress;
      startFetchingMessages();
      break;
    case 'GET_STATE':
      (sw as unknown as Worker).postMessage({ type: 'STATE_UPDATE', state });
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
      swReadNextMessage(streamTopic as string, streamerAddress as EthAddress)
        .finally(() => {
          isFetching = false;
        });
    }
  }, FETCH_INTERVAL);
}

// swReadNextMessage will read a new message from the AggregatedFeed, and insert it into the state
async function swReadNextMessage(streamTopic: string, streamerAddress: EthAddress) {
  try {
    const result = await readSingleMessage(state.chatIndex, streamTopic, streamerAddress);
    if (!result) throw 'Error reading message!';

    state = chatUserSideReducer(state, { type: ChatActions.ADD_MESSAGE, payload: { message: result } });
    state = chatUserSideReducer(state, { type: ChatActions.ARRANGE });
    state = chatUserSideReducer(state, { type: ChatActions.UPDATE_CHAT_INDEX, payload: { chatIndex: state.chatIndex + 1 } });

  } catch (error) {
    // Currently we can't distinguish "no new messages" from error
    console.info("No new messages this time.");
    return null;
  }
}