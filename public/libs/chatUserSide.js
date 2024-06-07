import { orderMessages, removeDuplicate } from "../utils/chat";
import { readSingleMessage } from "./chat";
export var ChatActions;
(function (ChatActions) {
    ChatActions["UPDATE_OWN_FEED_INDEX"] = "UPDATE_OWN_FEED_INDEX";
    ChatActions["UPDATE_CHAT_INDEX"] = "UPDATE_CHAT_INDEX";
    ChatActions["ADD_MESSAGE"] = "ADD_MESSAGE";
    ChatActions["ARRANGE"] = "ARRANGE";
})(ChatActions || (ChatActions = {}));
export const initialStateForChatUserSide = {
    messages: [],
    ownFeedIndex: 0,
    chatIndex: 0
};
export function chatUserSideReducer(state, action) {
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
        case ChatActions.ARRANGE:
            let orderedMessages = removeDuplicate(state.messages);
            orderedMessages = orderMessages(orderedMessages);
            return {
                ...state,
                messages: orderedMessages
            };
        default:
            return state;
    }
}
export async function readNextMessage(state, streamTopic, streamerAddress, dispatch) {
    try {
        const result = await readSingleMessage(state.chatIndex, streamTopic, streamerAddress);
        if (!result)
            throw 'Error reading message!';
        dispatch({ type: ChatActions.ADD_MESSAGE, payload: { message: result } });
        dispatch({ type: ChatActions.ARRANGE });
        dispatch({ type: ChatActions.UPDATE_CHAT_INDEX, payload: { chatIndex: state.chatIndex + 1 } });
    }
    catch (error) {
        // Currently we can't distinguish "no new messages" from error
        console.info("No new messages this time.");
        return null;
    }
}
