import { MessageData } from "../libs/chat";

  // Save messages to localStorage for the corresponding chat room
  export function saveMessages(chatRoom: string, messages: MessageData[]) {
    localStorage.setItem(chatRoom, JSON.stringify(messages));
  };

  // Load messages from localStorage for the corresponding chat room
  export function loadMessages(chatRoom: string): MessageData[] {
    const storedMessages = JSON.parse(localStorage.getItem(chatRoom) || '[]');
    return storedMessages;
  };