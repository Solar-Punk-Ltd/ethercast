"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.readNextMessage = exports.chatUserSideReducer = exports.initialStateForChatUserSide = exports.ChatActions = void 0;
const chat_1 = require("../utils/chat");
const chat_2 = require("./chat");
var ChatActions;
(function (ChatActions) {
    ChatActions["UPDATE_OWN_FEED_INDEX"] = "UPDATE_OWN_FEED_INDEX";
    ChatActions["UPDATE_CHAT_INDEX"] = "UPDATE_CHAT_INDEX";
    ChatActions["ADD_MESSAGE"] = "ADD_MESSAGE";
    ChatActions["ARRANGE"] = "ARRANGE";
})(ChatActions || (exports.ChatActions = ChatActions = {}));
exports.initialStateForChatUserSide = {
    messages: [],
    ownFeedIndex: 0,
    chatIndex: 0
};
function chatUserSideReducer(state, action) {
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
            let orderedMessages = (0, chat_1.removeDuplicate)(state.messages);
            orderedMessages = (0, chat_1.orderMessages)(orderedMessages);
            return {
                ...state,
                messages: orderedMessages
            };
        default:
            return state;
    }
}
exports.chatUserSideReducer = chatUserSideReducer;
async function readNextMessage(state, streamTopic, streamerAddress, dispatch) {
    try {
        const result = await (0, chat_2.readSingleMessage)(state.chatIndex, streamTopic, streamerAddress);
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
exports.readNextMessage = readNextMessage;
