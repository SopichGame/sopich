//import io from 'socket.io-client';

import { throttle } from 'throttle-debounce';
import { aggregateAsList, aggregateAsMap, aggregateThrottle } from './aggregatethrottle.js'
//import { processGameUpdate } from './state';
import { stopRendering } from './render'


export function sendMappingsToServer( mapping ){
    // non socket
    fetch("/keyboardmapping", {
        method : 'POST',
        headers : { 'Content-Type': 'application/json' },
        body :  JSON.stringify( mapping )
    })
    console.log('new mapping',mapping )
}


import * as Messages from '../shared/messages.js'

const Constants = require('../shared/constants');

function deserializeMessage( data ){
    const [ type, body ] = JSON.parse( data.data )
    return [ type, body ]
}
function serializeMessage( type, body ){
    const data = JSON.stringify( [ type, body ] )
    return data
}
function sendSocketMessage( socket ){
    return function( type, body ){
        return socket.send( serializeMessage( type, body ) )
    }
}

// 4 keys per second is enough
const Options = {
    inputThrottleDelay : 1000 / 4 // 1000 * 4 // 1000 / 4
}

const Opened = new Set()
function createSocket( path ){
    const socketUrl = new URL( path, window.location )
    socketUrl.protocol = "ws:"
    console.log( 'create socket with',socketUrl.toString() )
    const socket = new WebSocket( socketUrl )
    return socket
}
export function createGameSocket( gameName ){
    const on = {}
    if ( Opened.has( gameName ) ){
        throw new Error(`socket ${ gameName } already exists`)
    }    
    const socket = createSocket( gameName )
    const sendMessage = sendSocketMessage( socket )
    // const connectedPromise = new Promise(resolve => {
    //     socket.onopen = ( () => {
    //         console.log('Connected to server!');
    //         resolve();
    //     });
    // });
    /*    function onPlayerNotAddedf( joinFailed ) {
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
    */
    
    //const connect = ( onGameOver, joinSuccess, joinFailed, yourInfo) => (
    
    socket.onopen = ( () => {
        on.opened()
        socket.onmessage = data => {
            
            const [ type, body ] = deserializeMessage( data )
            switch (type){
            // case Constants.MSG_TYPES.YOUR_INFO : {
            //     on.yourinfo( body )
            //     break
            // }
            case Constants.MSG_TYPES.JOINED_GAME_OK : {
                on.joined( body )
                break
            }
            case Constants.MSG_TYPES.JOINED_GAME_KO : {
                on.cannot_join( body )
                break
            }
            case Constants.MSG_TYPES.GAME_UPDATE : {
                on.game_update( body )//processGameUpdate(body )
                break
            }
            case Constants.MSG_TYPES.GAME_OVER : {
                on.game_over( body )
                break
            }
            }
        }
        socket.onclose = () => {
            on.closed()
            /*
            console.log('Disconnected from server.');
            stopRendering()
            document.getElementById('disconnect-modal').classList.remove('hidden');
            document.getElementById('reconnect-button').onclick = () => {
                window.location.reload();
            };*/
        };
    })
    //);

    const play = username => {
        sendMessage(Constants.MSG_TYPES.JOIN_GAME, username )
    };

    const sendInputToServer = aggregateThrottle(
        Options.inputThrottleDelay,
        
        // aggregateAsMap, dir => {
        //     sendMessage(Constants.MSG_TYPES.INPUT, Messages.compressInputsMap(dir) )
        // }
        aggregateAsList, dir => {
            sendMessage(Constants.MSG_TYPES.INPUT, Messages.compressInputsList1( dir ) )        
        }
    )
    /*const sendKeyboardMappingToServer = mapping => {
        sendMessage(Constants.MSG_TYPES.KEYBOARD_MAPPING, mapping );
    }*/
    const sendAddEntityToServer = model => {
        sendMessage(Constants.MSG_TYPES.ADD_ENTITY, model );
    }

    return {
        sendAddEntityToServer,
        //sendKeyboardMappingToServer,
        sendInputToServer,
        play,
        on
    }
}
