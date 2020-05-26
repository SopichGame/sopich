import { createGameSocket, sendMappingsToServer } from './networking';
import { startRendering, stopRendering } from './render';
//import { startCapturingInput, stopCapturingInput } from './input';
import { initState } from './state';
import './css/main.css';
import  * as Menu from '../../menu.js'
import { Controller } from '../../../src/controller.js'
import { remapControlsButton, remapControlsButtonClicked,
         keyboardMappingLoaded } from './remapcontrols.js'
import { Fsm } from '../../fsm.js'
import { Games } from './games.js'
import { processGameUpdate } from './state';
import { ADD_PLAYER_RETURNS } from '../../game'

const usernameDiv = document.getElementById('username');
const playMenu = document.getElementById('play-menu');
const playButton = document.getElementById('play-button');
const usernameInput = document.getElementById('username-input');
const notJoinedReason = document.getElementById('not-joined-reason');
const gamesList = document.getElementById('games-list');
const menu = new Menu.Menu( Menu.Definitions, Menu.defaultStore )


const fsm = Fsm([    
    { name : 'connect', from : 'init', to : 'try_connect' }, 
    { name : 'connection_ok', from : 'try_connect', to : 'connected' }, 
    { name : 'connection_ko', from : 'try_connect', to : 'init' }, 
    { name : 'play', from : 'connected', to : 'try_join' }, 
    { name : 'disconnected1', from : 'connected', to : 'hard_disconnected' }, 
    { name : 'join_ok', from : 'try_join', to : 'playing' }, 
    { name : 'join_ko', from : 'try_join', to : 'init' }, 
    { name : 'disconnected2', from : 'playing', to : 'hard_disconnected' }, 
    { name : 'ack_disconnected', from : 'hard_disconnected', to : 'init' }, 
    { name : 'game_over', from : 'playing', to : 'scores' }, 
    { name : 'rematch', from : 'scores', to : 'connected' },     
])

function notJoinedReasonText( reason ){
    switch ( reason ){
    case ADD_PLAYER_RETURNS.WRONG_USERNAME :
        return  'wrong username' 
        break ;
    case ADD_PLAYER_RETURNS.ALREADY_JOINED :
        return  'already joined' 
        break ;
    case ADD_PLAYER_RETURNS.USERNAME_TOO_LONG : 
        return  'username too long' 
        break ;
    case ADD_PLAYER_RETURNS.NO_MORE_AVAILABLE_ITEM : 
        return  'game is full' 
        break ;
    case ADD_PLAYER_RETURNS.USERNAME_ALREADY_IN_USE : 
        return  'already playing' 
        break ;
    }
}

remapControlsButton.onclick = () => {        
    remapControlsButtonClicked( sendMappingsToServer )
}

const stateData = {
    selectedGame : undefined,
    gameSocket : undefined,
    controller  : undefined

}
const games = Games( gamesList )
games.on.gameSelected = name => {
    stateData.selectedGame = name
    fsmi.send.connect()
}
fsm.on.enter.init = () => {
    playButton.classList.add('hidden')
    playMenu.classList.remove('hidden')
    fetch('me').then( x => x.json() ).then( yourinfo => {
        const { username, keyboardMapping, score } = yourinfo
        console.log({yourinfo})
        usernameDiv.textContent = username
        keyboardMappingLoaded( keyboardMapping )
    })
    games.$container.classList.remove('hidden')
    games.update()
}
fsm.on.leave.init = () => {
    games.$container.classList.add('hidden')
}
fsm.on.enter.try_connect = () => {
    console.log('go!', stateData.selectedGame )
    const gs = createGameSocket( stateData.selectedGame )
    //gs.on.closed = () => fsmi.send.disconnected1()
    gs.on.opened = () => fsmi.send.connection_ok()
    stateData.gameSocket = gs
    //gs.on.yourinfo = info => {}//usernameDiv.innerHTML = info.username
}
fsm.on.enter.connected = () => {
    const gs = stateData.gameSocket
    console.log('==connected')
    gs.on.closed = () => fsmi.send.disconnected1()
    playButton.classList.remove('hidden')
    playButton.onclick = () => {
        const gs = stateData.gameSocket
        console.log('ply!')
        fsmi.send.play()       
        gs.play()
    }
}
fsm.on.enter.try_join = () => {
    console.log('try join')
    const gs = stateData.gameSocket
    gs.on.cannot_join = reason => {
        stateData.notJoinedReason = notJoinedReasonText( reason )
        fsmi.send.join_ko()
        console.log('not joined', reason )
        notJoinedReason.textContent = stateData.notJoinedReason
    }
    gs.on.joined = () => { fsmi.send.join_ok() }

}
fsm.on.enter.playing = () => {
    playMenu.classList.add('hidden')
    console.log('~~playing')
    const gs = stateData.gameSocket
    gs.on.closed = () => fsmi.send.disconnected2()
    gs.on.game_update = processGameUpdate
    gs.on.game_over = () => fsmi.send.gameOver()
    const controller = new Controller( gs.sendInputToServer )
    stateData.controller = controller
    controller.connect()
    startRendering()
}
fsm.on.leave.playing = () => {
    console.log('*->->->leave playing')
    //playMenu.classList.remove('hidden')
    if ( stateData.controller )
        stateData.controller.disconnect()
    stopRendering()
}
fsm.on.enter.hard_disconnected = () => {
    console.log('hard_disconnected')    
    document.getElementById('disconnect-modal').classList.remove('hidden');
    document.getElementById('reconnect-button').onclick = () => fsmi.send.ack_disconnected()
}
fsm.on.leave.hard_disconnected = () => {
    document.getElementById('disconnect-modal').classList.add('hidden');
    document.getElementById('reconnect-button').onclick = () => {}
}
fsm.on.enter.scores = () => {
    console.log('scores')
}
//fsm.on.enter.
const fsmi =  fsm.run( 'init' )


/*
console.log( { state : getState() } )
send.connect()
console.log( { state : getState() } )
*/    

// import { Lobby } from './lobby.js'
// console.log( {Lobby})
// document.body.appendChild( Lobby().$container )
/*
 * index
 */


// function onInput( input ){
//     sendInputToServer( input )
// }
// const controller = new Controller( sendInputToServer )



// Promise.all([
//     connect( onGameOver, onGameStarting, onGameNotStarting, onYourInfo ),
//     //  downloadAssets(),
// ]).then(() => {
//     console.log('PROMISE FILED')
//     playMenu.classList.remove('hidden');
//     //usernameInput.focus();
//     playButton.onclick = () => {
//         // Play!
//         play(/*usernameInput.value*/);
//         //onGameStarting()
        
//         //    setLeaderboardHidden(false);
//     };
//     {
//         const model =   {
//             sprite : { type : 8 },// SpriteTypeNum['missile'] },
//             bb : {  },
//             color : { cs : 0 },
//             //r: { r: 0 },
//             /*mass : { mass : 5 },
//             collision : {
//                 category : COLLISION_CATEGORY.missile,
//                 mask : 0xffff
//             },*/
//             //health : { life : 1, maxlife : 1 },
//             //attack : { collision : 10 },
//             //direction : {a16:5}, // copy
//             position : { x : 30, y : 30}, // copy
//             //speed : {} // copy  pps : pps, max : 10, min : 0 },
//         } 
//         // sendAddEntityToServer( model )
//     }
//     remapControlsButton.onclick = () => {        
//         remapControlsButtonClicked()
//     }
    
// }).catch(console.error);

// function onGameStarting(){
//     playMenu.classList.add('hidden');
//     document.body.classList.add('no-overflow')
//     menu.start()
//     initState()
//     controller.connect()
//     startRendering();
    
// }
// function onGameNotStarting( cause ){
//     console.log('not joined becasue', cause )
//     notJoinedReason.textContent = cause
//     playMenu.classList.remove('hidden');
// }

// function onGameOver() {
//     menu.stop()
//     controller.disconnect()
//     stopRendering();
//     playMenu.classList.remove('hidden');
//     //  setLeaderboardHidden(true);
// }
// function onYourInfo( info ){
//     console.log('youtinfoindex',info)
//     usernameDiv.innerHTML = info.username
//     const { keyboardMapping } = info
//     keyboardMappingLoaded( keyboardMapping )
// }
