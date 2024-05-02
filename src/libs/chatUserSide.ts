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

export type ChatAction = AddMessageAction | UpdateOwnFeedIndexAction | UpdateChatIndexAction;

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
                messages: [...state.messages, action.payload.message]
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
        console.info("No new messages this time."); //we can't distinguish this from error
        return null;
    }
}



// // Reads a single message, and will also save the messages to localStorage
// async function readNextMessage() {
//     console.log('read with index ', state.readIndex);
//     const roomId: RoomID = generateRoomId(feedDataForm.topic.value);
//     let message: MessageData | null = null;
    
//     do {
//       message = await readSingleMessage(state.readIndex, roomId, feedDataForm.address.value);
//       if (!message) {
//         console.error('Error reading message! Retrying...');
//         //sleep(1000);
//         //continue;
//         return;
//       }
      
//       if (message.message) {
//         //setReadIndex(readIndex+1); Last                                 // Read was successful, but we don't know yet if it's duplicate or not
//         const isDuplicate = state.messages.some((msg) => msg.timestamp === message!.timestamp);
//         if (isDuplicate) {
//           // We won't insert this message, but lastReadIndex was already incremented
//           console.log('Duplicate!');
//           dispatch({ type: 'incrementReadIndex' });
//           return;
//         }
        
//         dispatch({
//           type: 'insertMessage',
//           message: message,
//           index: state.readIndex,
//         });
//         dispatch({ type: 'incrementReadIndex' });
//         setTime(() => Date.now());
//         console.log('messages: ', state.messages);

//         // const uniqMessages = removeDuplicate([...messages, message]);       // Remove duplicate messages (by timestamp)
//         // const orderedMessages = orderMessages(uniqMessages);                // Order the messages, by timestamp
//         // setMessages(orderedMessages);                                       // Show the messages in the app
//         saveMessages(feedDataForm.topic.value, state.messages); // Save the messages to LocalStorage
//       }
//     } while (!message);
//   }