import { MessageData } from "../libs/chat";

// Save messages to localStorage for the corresponding chat room
export function saveMessages(chatRoom: string, messages: MessageData[]) {
    localStorage.setItem(chatRoom, JSON.stringify(messages));
}

// Load messages from localStorage for the corresponding chat room
export function loadMessages(chatRoom: string): MessageData[] {
    const storedMessages = JSON.parse(localStorage.getItem(chatRoom) || '[]');
    return storedMessages;
}

// Generate a room ID, that will be connected to a stream
export function generateRoomId(topic: string) {
    return`${topic}_EthercastChat`;
}

// Returns timesstamp ordered messages
export function orderMessages(messages: MessageData[]) {
    return messages.sort((a, b) => a.timestamp -b.timestamp);
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