export const FIRST_SEGMENT_INDEX = '0000000000000000';

// Consensus ID is used for the Graffiti feed, that is handling user registration
export const CONSENSUS_ID = 'SwarmStream';

// Chat events, used together with getChatActions
export const EVENTS = {
    LOADING_INIT_USERS: 'loadingInitUsers',
    LOADING_USERS: 'loadingUsers',
    LOADING_REGISTRATION: 'loadingRegistration',
    LOAD_MESSAGE: 'loadMessage',
};

export const SECOND = 1000;
export const MINUTE = SECOND * 60;
export const HOUR = MINUTE * 60;

export const HEX_RADIX = 16;

export const ETH_ADDRESS_LENGTH = 42;

// These are used for removing the inactive users from the message fetch loop
export const STREAMER_MESSAGE_CHECK_INTERVAL = 3 * SECOND;
export const STREAMER_USER_UPDATE_INTERVAL = 8 * SECOND;
export const REMOVE_INACTIVE_USERS_INTERVAL = 3 * MINUTE;
export const IDLE_TIME = 5 * MINUTE;                                            // User will be removed from readMessage loop after this time, until rejoin

export const MESSAGE_CHECK_INTERVAL = 300;                               // User-side message check interval
export const USER_UPDATE_INTERVAL = 8 * SECOND;                                 // User-side user update interval

export const MAX_TIMEOUT = 1200;                                                // Max timeout in ms
export const INCREASE_LIMIT = 400;                                              // When to increase max parallel request count (avg request time in ms)
export const DECREASE_LIMIT = 800;                                              // When to decrease max parallel request count (avg request time in ms)