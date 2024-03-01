const SERVER_URL = "http://localhost:3000";
export type RoomID = string;

export interface MessageData {
  message: string;
  name: string;
  timestamp: number;
}


// Will create a new room, if does not exist
export async function createRoom(roomId: RoomID) {
  try {
    const result = await fetch(`${SERVER_URL}/room/create`, { 
      method: 'POST',
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }, 
      body: JSON.stringify({
        roomId: roomId
      })
    });

    return result;

  } catch (error) {
    console.error("Error while creating room: ", error);
  }
}

// Will need single message, for provided roomId and index
export async function readSingleMessage(roomId: RoomID, index: number) {
  try {
    const result = await fetch(`${SERVER_URL}/room/read?roomId=${roomId}&index=${index}`);
    const json = result.json();
    return json;
  } catch (error) {
    console.error("Error while reading message: ", error);
  }
}

// Get actual feed index for room
export async function getFeedActualUpdateIndex(roomId: RoomID) {
  try {
    const result = await fetch(`${SERVER_URL}/room/get-feed-index?roomId=${roomId}`);
    const json = await result.json();

    return json.index;
  } catch (error) {
    console.error("Error getting feed index: ", error);
  }
}

// Send message to a room
export async function sendMessage(roomId: RoomID, messageText: string, name: string) {
  try {
    const result = await fetch(`${SERVER_URL}/room/send`, {
      method: 'POST',
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }, 
        body: JSON.stringify({
          roomId: roomId,
          message: messageText,
          name: name
      })
    });

    return result;
  } catch (error) {
    console.error("There was an error while sending message: ", error);
  }
}