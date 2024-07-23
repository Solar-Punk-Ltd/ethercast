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
export const STREAMER_MESSAGE_CHECK_INTERVAL = 1 * SECOND;
export const STREAMER_USER_UPDATE_INTERVAL = 8 * SECOND;
export const REMOVE_INACTIVE_USERS_INTERVAL = 8*SECOND//3 * MINUTE;