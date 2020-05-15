module.exports = Object.freeze({
    MAP_SIZE: 3000,
    MSG_TYPES: {
        // client -> server
        JOIN_GAME: 'join_game',
        INPUT: 'input',
        KEYBOARD_MAPPING : 'keyboard_mapping',
        ADD_ENTITY : 'add_entity',
        // server -> client
        YOUR_INFO : 'your_info',
        JOINED_GAME_OK : 'joined_game_ok',
        JOINED_GAME_KO : 'joined_game_ko',
        GAME_UPDATE: 'update',
        GAME_OVER: 'dead',        
    },
});
