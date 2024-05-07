import { EthAddress, MessageData, readSingleMessage } from "./chat";

export enum ChatActions {
  UPDATE_OWN_FEED_INDEX = 'UPDATE_OWN_FEED_INDEX',
  UPDATE_CHAT_INDEX = 'UPDATE_CHAT_INDEX',
  ADD_MESSAGE = 'ADD_MESSAGE'
}

interface AddMessageAction {
  type: ChatActions.ADD_MESSAGE;
  payload: {
    message: MessageData;
  };
}

interface UpdateOwnFeedIndexAction {
  type: ChatActions.UPDATE_OWN_FEED_INDEX;
  payload: {
    ownFeedIndex: number;
  };
}

interface UpdateChatIndexAction {
  type: ChatActions.UPDATE_CHAT_INDEX;
  payload: {
    chatIndex: number;
  };
}

export type ChatAction = 
  | AddMessageAction                                // Add a message to the array, that holds the aggregated chat. These messages will be displayed
  | UpdateOwnFeedIndexAction                        // Next index to write to
  | UpdateChatIndexAction;                          // Next index to read from (AggregatedChat)

export interface State {
  messages: MessageData[];
  ownFeedIndex: number;
  chatIndex: number;
}

export const initialStateForChatUserSide: State = {
  messages: [],
  ownFeedIndex: 0,
  chatIndex: 0
};

export function chatUserSideReducer(state: State, action: ChatAction): State {
  switch (action.type) {

    case ChatActions.ADD_MESSAGE:
      return {
        ...state,
        messages: [
          ...state.messages, 
          action.payload.message
        ]
      };

    case ChatActions.UPDATE_OWN_FEED_INDEX:
      return {
        ...state,
        ownFeedIndex: action.payload.ownFeedIndex
      };

    case ChatActions.UPDATE_CHAT_INDEX:
      return {
        ...state,
        chatIndex: action.payload.chatIndex
      };
        
    default:
      return state;
  }
}

export async function readNextMessage(state: State, streamTopic: string, streamerAddress: EthAddress, dispatch: React.Dispatch<ChatAction>) {
  try {
    const result = await readSingleMessage(state.chatIndex, streamTopic, streamerAddress);
    if (!result) throw 'Error reading message!';

    dispatch({ type: ChatActions.ADD_MESSAGE, payload: { message: result } });
    dispatch({ type: ChatActions.UPDATE_CHAT_INDEX, payload: { chatIndex: state.chatIndex + 1 } });

  } catch (error) {
    // Currently we can't distinguish "no new messages" from error
    console.info("No new messages this time.");
    return null;
  }
}