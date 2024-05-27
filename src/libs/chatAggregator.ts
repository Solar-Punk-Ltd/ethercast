import { BatchId, FeedWriter } from "@ethersphere/bee-js";
import { EthAddress, MessageData, RoomID, UserWithIndex, fetchAllMessages, updateUserList, writeOneMessageToAggregatedFeed } from "./chat";
import { orderMessages, removeDuplicate } from "../utils/chat";


export const AGGREGATION_CYCLE_INTERVAL = 1 * 1000;

enum ChatAggregatorAction {
  ADD_MESSAGES = 'ADD_MESSAGES',
  DELETE_MESSAGE = 'DELETE_MESSAGE',
  UPDATE_AGGREGATED_INDEX = 'UPDATE_AGGREGATED_INDEX',
  UPDATE_USER_FEED_INDEX = 'UPDATE_USER_FEED_INDEX',
  UPDATE_INDEX_FOR_USER = 'UPDATE_INDEX_FOR_USER',
  ADD_USER = 'ADD_USER',
  LOCK_MESSAGE_WRITE = 'LOCK_MESSAGE_WRITE',
}

interface AddMessagesAction {
  type: ChatAggregatorAction.ADD_MESSAGES;
  payload: {
    messages: MessageData[];
  };
}
  
interface DeleteMessageAction {
  type: ChatAggregatorAction.DELETE_MESSAGE;
  payload: {
    index: number;
  };
}

interface UpdateAggregatedIndexAction { 
  type: ChatAggregatorAction.UPDATE_AGGREGATED_INDEX;
  payload: {
    chatIndex: number;
  };
}

interface UpdateUserFeedIndexAction {
  type: ChatAggregatorAction.UPDATE_USER_FEED_INDEX;
  payload: {
    userFeedIndex: number;
  };
}

interface AddUserAction {
  type: ChatAggregatorAction.ADD_USER;
  payload: {
    user: UserWithIndex;
  };
}

interface UpdateIndexForUserAction {
  type: ChatAggregatorAction.UPDATE_INDEX_FOR_USER;
  payload: {
    userAddress: EthAddress;
    index: number;
  };
}

interface LockMessageWriteAction {
  type: ChatAggregatorAction.LOCK_MESSAGE_WRITE;
  payload: {
    lock: boolean;
  };
}

type AggregatorAction =
  | AddMessagesAction                  // Adds array of messages to temporary store, duplicates will be removed before add, and messages will be sorted by timestamp
  | DeleteMessageAction                // After a message was written to the aggregated feed, we delete it (one-by-one)
  | UpdateAggregatedIndexAction        // This is the feed index of the chat feed, that will be read at the viewers side
  | UpdateUserFeedIndexAction          // This is the feed index for the Graffiti feed, that is used for registering users
  | UpdateIndexForUserAction           // Every user has an own feed, this is the index for those feeds (one index for every registered user)
  | LockMessageWriteAction             // Try to avoid running more than one aggregation cycles in parallel
  | AddUserAction;                     // Adds a new user to the state

interface State {
  users: UserWithIndex[];
  chatIndex: number;
  userFeedIndex: number;
  messages: MessageData[];
  locked: boolean;
}

export const initialStateForChatAggregator: State = {
  users: [],
  chatIndex: 0,
  userFeedIndex: 0,
  messages: [],
  locked: false,
};

// Reducer that handles all the chat aggregation related actions
export const chatAggregatorReducer = (state: State = initialStateForChatAggregator, action: AggregatorAction): State => {
  switch (action.type) {

    case ChatAggregatorAction.ADD_MESSAGES:
      let newMessageArray = [...state.messages, ...action.payload.messages];
      newMessageArray = removeDuplicate(newMessageArray);
      newMessageArray = orderMessages(newMessageArray);
      return {
        ...state,
        messages: newMessageArray,
      };

    case ChatAggregatorAction.DELETE_MESSAGE:
      let newArray = state.messages;
      newArray.splice(action.payload.index, 1);
      return {
        ...state,
        messages: newArray,
      };

    case ChatAggregatorAction.UPDATE_AGGREGATED_INDEX:
      return {
          ...state,
          chatIndex: action.payload.chatIndex,
      };

    case ChatAggregatorAction.UPDATE_USER_FEED_INDEX:
      return {
          ...state,
          userFeedIndex: action.payload.userFeedIndex,
      };

    case ChatAggregatorAction.UPDATE_INDEX_FOR_USER:
      const i = state.users.findIndex((user) => user.address === action.payload.userAddress);
      if (i === -1) return state;
      let newUsersArray = state.users;
      newUsersArray[i].index = action.payload.index;
      return {
        ...state,
        users: newUsersArray,
      };

    case ChatAggregatorAction.ADD_USER:
      return {
        ...state,
        users: [
          ...state.users, 
          action.payload.user
        ],
      };

    case ChatAggregatorAction.LOCK_MESSAGE_WRITE:
      return {
        ...state,
        locked: action.payload.lock,
      }  

    default:
      return state;
  }
};

// Combines doMessageFetch and doMessageWriteOut
export async function doAggregationCycle(state: State, streamTopic: string, writer: FeedWriter, stamp: BatchId, dispatch: React.Dispatch<AggregatorAction>) {
  if (state.locked) return;

  dispatch({ type: ChatAggregatorAction.LOCK_MESSAGE_WRITE, payload: { lock: true } });               // Lock message write and fetch as well
  await doMessageFetch(state, streamTopic, dispatch);
  await doMessageWriteOut(state, writer, stamp, dispatch);
}

// Periodically called from Stream.tsx
// Fetches the messages, inserts them into state, and updates the read indexes for the users whose messages were read
export async function doMessageFetch(state: State, streamTopic: string, dispatch: React.Dispatch<AggregatorAction>) {
  try {
    // Result will be array of messages, and UserWithIndex list, which is used to update the index
    console.time("fetchAllMessages");
    const result = await fetchAllMessages(state.users, streamTopic);
    // what if we don't wait here, instead, we do this with some kind of callback
    console.timeEnd("fetchAllMessages");
    if (!result) throw "fetchAllMessages gave back null";

    let newMessages: MessageData[] = [];
    result.map(({ user, messages }) => {
      dispatch({ type: ChatAggregatorAction.UPDATE_INDEX_FOR_USER, payload: { index: user.index, userAddress: user.address } });
      newMessages = [...newMessages, ...messages];
    });

    dispatch({ type: ChatAggregatorAction.ADD_MESSAGES, payload: { messages: newMessages } });
  } catch (error) {
    console.error("Error fetching messages:", error);
  }
}

// Write temporary messages into aggregated feed, then clear the temporary messages
// Both write-out and deleting of messages happens one-by-one, not in batch actions
export async function doMessageWriteOut(state: State, writer: FeedWriter, stamp: BatchId, dispatch: React.Dispatch<AggregatorAction>) {
  try {
    let promises = [];
    // We write all messages from the temporary buffer to the aggregated feed
    for (let i = 0; i < state.messages.length; i++) {
      const promise = writeOneMessageToAggregatedFeed(state.messages[i], writer, (state.chatIndex + i), stamp);
      promises.push(promise);
    }
    
    // We wait for the promises here (write operations don't need to wait for each other, order does not matter)
    const results = await Promise.all(promises);

    // Those messages are deleted from state, which were successfully written to aggregated chat feed
    for (let i = results.length-1; i >= 0; i--) {
      if (results[i] === null) {
        console.warn("Could not write message with index ", i);
        continue;
      }
      console.log(`Dispatching DELETE_MESSAGE with index ${i}, state.messages.length: ${state.messages.length}`)
      dispatch({ type: ChatAggregatorAction.DELETE_MESSAGE, payload: { index: i } });
    }
    
    dispatch({ type: ChatAggregatorAction.UPDATE_AGGREGATED_INDEX, payload: { chatIndex: state.chatIndex + results.length } });
    dispatch({ type: ChatAggregatorAction.LOCK_MESSAGE_WRITE, payload: { lock: false } });              // Release message write lock
  } catch (error) {
    console.error("Error writing aggregated feed:", error);
    dispatch({ type: ChatAggregatorAction.LOCK_MESSAGE_WRITE, payload: { lock: false } });              // Release message write lock on error as well
  }
}

// Will save new users to state. Periodically called from Stream.tsx
// The function will remove duplicates before saving to state
export async function doUpdateUserList(topic: RoomID, state: State, dispatch: React.Dispatch<AggregatorAction>) {
  try {
    let result = await updateUserList(topic, state.userFeedIndex, state.users);
    if (!result) throw "updateUserList gave back null";

    const usersToAdd = result.users.filter((user) => {
      return !state.users.some((savedUser) => savedUser.address == user.address);
    });

    usersToAdd.map((user) => {
      dispatch({ type: ChatAggregatorAction.ADD_USER, payload: { user } });
    });

    dispatch({ type: ChatAggregatorAction.UPDATE_USER_FEED_INDEX, payload: { userFeedIndex: result.lastReadIndex } });
    
  } catch (error) {
    console.error("Error updating user list:", error);
  }
}