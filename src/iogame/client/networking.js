//import io from 'socket.io-client';

import { throttle } from 'throttle-debounce';
import { processGameUpdate } from './state';
import { stopRendering } from './render'
import { ADD_PLAYER_RETURNS } from '../../game'
import * as Messages from '../shared/messages.js'

const Constants = require('../shared/constants');

const gameName = 'monsocketserver1'

function createOrReuseSocket( gameName ){
    const socketUrl = new URL( gameName, window.location )
    socketUrl.protocol = "ws:"
    console.log( 'create socket with',socketUrl.toString() )
    const socket = new WebSocket( socketUrl )
    return socket
}

const socket = createOrReuseSocket( gameName )

const connectedPromise = new Promise(resolve => {
    socket.onopen = ( () => {
        console.log('Connected to server!');
        resolve();
    });
});
function onPlayerNotAddedf( joinFailed) {
    return function onPlayerNotAdded(o){
        console.log('could not play because', o)
        let r = ''
        switch ( o ){
        case ADD_PLAYER_RETURNS.WRONG_USERNAME : r = 'wrong username' 
            break ;
        case ADD_PLAYER_RETURNS.ALREADY_JOINED : r = 'already joined' 
            break ;
        case ADD_PLAYER_RETURNS.USERNAME_TOO_LONG : r = 'username too long' 
            break ;
        case ADD_PLAYER_RETURNS.NO_MORE_AVAILABLE_ITEM : r = 'game is full' 
            break ;
        case ADD_PLAYER_RETURNS.USERNAME_ALREADY_IN_USE : r = 'already playing' 
            break ;
        }
        joinFailed( r )
    }
}
function onPlayerAddedf( joinSuccess ){
    return function onPlayerAdded(){
        console.log('joined !')
        joinSuccess()
    }
}
function onYourInfof( yourInfo ){
    return function (...args){
        yourInfo( ...args )
        console.log('infos:',this,args)
    }
}
function deserializeMessage( data ){
    const [ type, body ] = JSON.parse( data.data )
    return [ type, body ]
}
function serializeMessage( type, body ){
    const data = JSON.stringify( [ type, body ] )
    return data
}
function sendMessage( type, body ){
    return socket.send( serializeMessage( type, body ) )
}
export const connect = (onGameOver,joinSuccess,joinFailed,yourInfo) => (
    connectedPromise.then(() => {

        socket.onmessage = data => {
            const [ type, body ] = deserializeMessage( data )
            switch (type){
            case Constants.MSG_TYPES.YOUR_INFO : {
                onYourInfof( yourInfo )(body)
                break
            }
            case Constants.MSG_TYPES.JOINED_GAME_OK : {
                onPlayerAddedf( joinSuccess )(body)
                break
            }
            case Constants.MSG_TYPES.JOINED_GAME_KO : {
                onPlayerNotAddedf( joinFailed )(body )
                break
            }
            case Constants.MSG_TYPES.GAME_UPDATE : {
                processGameUpdate(body )
                break
            }
            case Constants.MSG_TYPES.GAME_OVER : {
                onGameOver( ...body )
                break
            }
            }
        }
        socket.onclose = () => {
            console.log('Disconnected from server.');
            stopRendering()
            document.getElementById('disconnect-modal').classList.remove('hidden');
            document.getElementById('reconnect-button').onclick = () => {
                window.location.reload();
            };
        };
    })
);

export const play = username => {
    sendMessage(Constants.MSG_TYPES.JOIN_GAME, username )
};
// Throttling enforces a maximum number of times a function can be called over time. As in
// “execute this function at most once every 100 milliseconds.”

// Debouncing enforces that a function not be called again until a certain amount of time has passed without it being called. As in
// “execute this function only if 100 milliseconds have passed without it being called.”
// = send if no burst, after a delay after a burst

function aggregateAsList( aggregated, input ){
    if ( input ){
        if ( aggregated ){
            return [ ...aggregated, input ]
        } else {
            return [ input ]
        }
    } else {
        return aggregated
    }
}
function aggregateAsMap( aggregated, input ){
    // do not preserver input order
    if ( input ){
        if ( aggregated ){
            aggregated.set( input, 1 + ( aggregated.get( input ) || 0 ) )
            return aggregated
        } else {
            const map = new Map()
            map.set( input, 1 )
            return map
        }
    } else {
        return aggregated
    }
}
function aggregateThrottle( delay, aggregate, f ){
    // while throttled, each f call argument is passed
    // to an aggregate function which aggregated result
    // is passed to the f function
    let aggregated
    let to
    function treat(){
        if ( aggregated ){
            f( aggregated )
            clearTimeout( to )
            aggregated = undefined
            to = setTimeout( treat, delay )                  
        } else {
            to = undefined
        }
    }    
    return function oninput( input ){
        aggregated = aggregate( aggregated, input )
        if ( to === undefined ){
            treat()
        }
    }
}

// 4 keys per second is enough
const Options = {
    inputThrottleDelay : 1000 / 4 // 1000 * 4 // 1000 / 4
}
export const sendInputToServer = aggregateThrottle(
    Options.inputThrottleDelay,
    
    // aggregateAsMap, dir => {
    //     sendMessage(Constants.MSG_TYPES.INPUT, Messages.compressInputsMap(dir) )
    // }
    aggregateAsList, dir => {
        sendMessage(Constants.MSG_TYPES.INPUT, Messages.compressInputsList1( dir ) )        
    }
)

export const sendKeyboardMappingToServer = mapping => {
    sendMessage(Constants.MSG_TYPES.KEYBOARD_MAPPING, mapping );
}
export const sendAddEntityToServer = model => {
    sendMessage(Constants.MSG_TYPES.ADD_ENTITY, model );
}

