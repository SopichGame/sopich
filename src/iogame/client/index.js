import { connect, play, sendKeyboardMappingToServer, sendAddEntityToServer } from './networking';
import { startRendering, stopRendering } from './render';
//import { startCapturingInput, stopCapturingInput } from './input';
import { initState } from './state';
import './css/main.css';
import  * as Menu from '../../menu.js'

const usernameDiv = document.getElementById('username');
const playMenu = document.getElementById('play-menu');
const playButton = document.getElementById('play-button');
const usernameInput = document.getElementById('username-input');
const notJoinedReason = document.getElementById('not-joined-reason');
const menu = new Menu.Menu( Menu.Definitions, Menu.defaultStore )

import { remapControlsButton, remapControlsButtonClicked, keyboardMappingLoaded } from './remapcontrols.js'
// import { Lobby } from './lobby.js'
// console.log( {Lobby})
// document.body.appendChild( Lobby().$container )
/*
 * index
 */

import { sendInputToServer } from './networking';
import { Controller } from '../../../src/controller.js'

function onInput( input ){
    sendInputToServer( input )
}
const controller = new Controller( sendInputToServer )



Promise.all([
    connect( onGameOver, onGameStarting, onGameNotStarting, onYourInfo ),
    //  downloadAssets(),
]).then(() => {
    console.log('PROMISE FILED')
    playMenu.classList.remove('hidden');
    //usernameInput.focus();
    playButton.onclick = () => {
        // Play!
        play(/*usernameInput.value*/);
        //onGameStarting()
        
        //    setLeaderboardHidden(false);
    };
    {
        const model =   {
            sprite : { type : 8 },// SpriteTypeNum['missile'] },
            bb : {  },
            color : { cs : 0 },
            //r: { r: 0 },
            /*mass : { mass : 5 },
            collision : {
                category : COLLISION_CATEGORY.missile,
                mask : 0xffff
            },*/
            //health : { life : 1, maxlife : 1 },
            //attack : { collision : 10 },
            //direction : {a16:5}, // copy
            position : { x : 30, y : 30}, // copy
            //speed : {} // copy  pps : pps, max : 10, min : 0 },
        } 
        // sendAddEntityToServer( model )
    }
    remapControlsButton.onclick = () => {        
        remapControlsButtonClicked()
    }
    
}).catch(console.error);

function onGameStarting(){
    playMenu.classList.add('hidden');
    document.body.classList.add('no-overflow')
    menu.start()
    initState()
    controller.connect()
    startRendering();
    
}
function onGameNotStarting( cause ){
    console.log('not joined becasue', cause )
    notJoinedReason.textContent = cause
    playMenu.classList.remove('hidden');
}

function onGameOver() {
    menu.stop()
    controller.disconnect()
    stopRendering();
    playMenu.classList.remove('hidden');
    //  setLeaderboardHidden(true);
}
function onYourInfo( info ){
    console.log('youtinfoindex',info)
    usernameDiv.innerHTML = info.username
    const { keyboardMapping } = info
    keyboardMappingLoaded( keyboardMapping )
}
