import { BatchId, FeedWriter } from "@solarpunk/bee-js";
import { EthAddress, MessageData, RoomID, UserWithIndex, UserWithMessages, fetchAllMessages, updateUserList, writeAggregatedFeed } from "./chat";

export const FETCH_MESSAGES_INTERVAL = 10 * 1000;
export const UPDATE_USER_LIST_INTERVAL = 60 * 1000;

enum ChatAggregatorAction {
  ADD_MESSAGES = 'ADD_MESSAGES',
  CLEAR_MESSAGES = 'CLEAR_MESSAGES',
  UPDATE_AGGREGATED_INDEX = 'UPDATE_AGGREGATED_INDEX',
  UPDATE_USER_FEED_INDEX = 'UPDATE_USER_FEED_INDEX',
  ADD_USER = 'ADD_USER',
}

interface AddMessagesAction {
  type: ChatAggregatorAction.ADD_MESSAGES;
  payload: {
    userAddress: EthAddress;
    messages: MessageData[];
  }[];
}
  
interface ClearMessagesAction {
  type: ChatAggregatorAction.CLEAR_MESSAGES;
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
    user: UserWithMessages;
  };
}

type AggregatorAction =
  | AddMessagesAction
  | ClearMessagesAction
  | UpdateAggregatedIndexAction
  | UpdateUserFeedIndexAction
  | AddUserAction;

interface State {
  userChatUpdates: UserWithMessages[];
  chatIndex: number;
  userFeedIndex: number;
}

export const initialStateForChatAggregator: State = {
  userChatUpdates: [],
  chatIndex: 0,
  userFeedIndex: 0
};

// Reducer that handles all the chat aggregation related actions
export const chatAggregatorReducer = (state: State = initialStateForChatAggregator, action: AggregatorAction): State => {
  switch (action.type) {
    case ChatAggregatorAction.ADD_MESSAGES:
      console.log("Adding messages", action.payload);
      return {
        ...state,
        userChatUpdates: state.userChatUpdates.map((original, index) =>
          action.payload[index] && original.user.address === action.payload[index].userAddress
            ? {
                ...original,
                messages: [...original.messages, ...action.payload[index].messages],
              }
            : original
        ),
      };
    case ChatAggregatorAction.CLEAR_MESSAGES:
      return {
        ...state,
        userChatUpdates: state.userChatUpdates.map((chat) => ({
          ...chat,
          messages: [],
        })),
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
    case ChatAggregatorAction.ADD_USER:
      return {
        ...state,
        userChatUpdates: [...state.userChatUpdates, action.payload.user],
      };
    default:
      return state;
  }
};

// Combines doMessageFetch and doMessageWriteOut
export async function doAggregationCycle(state: State, streamTopic: string, writer: FeedWriter, stamp: BatchId, dispatch: React.Dispatch<AggregatorAction>) {
  await doMessageFetch(state, streamTopic, dispatch);
  await doMessageWriteOut(state, writer, stamp, dispatch);
}

// Periodically called from Stream.tsx
export async function doMessageFetch(state: State, streamTopic: string, dispatch: React.Dispatch<AggregatorAction>) {
  try {
    const userList = state.userChatUpdates.map((user) => {
      return {
        address: user.user.address,
        index: user.user.index,
      };
    });

    const result = await fetchAllMessages(userList, streamTopic);
    if (!result) throw "fetchAllMessages gave back null";
    const newMessages = result.map(({ user, messages }) => ({
      userAddress: user.address,
      messages,
    }));

    dispatch({ type: ChatAggregatorAction.ADD_MESSAGES, payload: newMessages });
  } catch (error) {
    console.error("Error fetching messages:", error);
  }
}

// Write temporary messages into aggregated feed, then clear the temporary messages
export async function doMessageWriteOut(state: State, writer: FeedWriter, stamp: BatchId, dispatch: React.Dispatch<AggregatorAction>) {
  try {
    const result = await writeAggregatedFeed(state.userChatUpdates, writer, state.chatIndex, stamp);
    if (!result) throw "writeAggregatedFeed gave back null";

    dispatch({ type: ChatAggregatorAction.CLEAR_MESSAGES });
    dispatch({ type: ChatAggregatorAction.UPDATE_AGGREGATED_INDEX, payload: { chatIndex: result } });

  } catch (error) {
    console.error("Error writing aggregated feed:", error);
  }
}

// Periodically called from Stream.tsx
export async function doUpdateUserList(topic: RoomID, state: State, dispatch: React.Dispatch<AggregatorAction>) {
  try {
    const users: UserWithIndex[] = state.userChatUpdates.map((user) => {
      return {
        address: user.user.address,
        index: user.messages.length,
      };
    });
    let result = await updateUserList(topic, state.userFeedIndex, users);
    if (!result) throw "updateUserList gave back null";

    const usersToAdd = result.users.filter((user) => {
      return !state.userChatUpdates.some((chat) => chat.user.address === user.address);
    });

    usersToAdd.map((user) => {
      const newUser: UserWithMessages = {
        user: {
          address: user.address,
          index: 0
        },
        messages: [],
      }; 
      dispatch({ type: ChatAggregatorAction.ADD_USER, payload: { user: newUser} });
    });

    dispatch({ type: ChatAggregatorAction.UPDATE_USER_FEED_INDEX, payload: { userFeedIndex: result.lastReadIndex } });
    
  } catch (error) {
    console.error("Error updating user list:", error);
  }
}