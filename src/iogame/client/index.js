// Learn more about this file at:
// https://victorzhou.com/blog/build-an-io-game-part-1/#3-client-entrypoints
import { connect, play } from './networking';
import { startRendering, stopRendering } from './render';
import { startCapturingInput, stopCapturingInput } from './input';
//import { downloadAssets } from './assets';
import { initState } from './state';
//import { setLeaderboardHidden } from './leaderboard';

// I'm using Bootstrap here for convenience, but I wouldn't recommend actually doing this for a real
// site. It's heavy and will slow down your site - either only use a subset of Bootstrap, or just
// write your own CSS.
//import 'bootstrap/dist/css/bootstrap.min.css';
import './css/main.css';
import  * as Menu from '../../menu.js'

const playMenu = document.getElementById('play-menu');
const playButton = document.getElementById('play-button');
const usernameInput = document.getElementById('username-input');
const notJoinedReason = document.getElementById('not-joined-reason');
const menu = new Menu.Menu( Menu.Definitions, Menu.defaultStore )

Promise.all([
    connect( onGameOver, onGameStarting, onGameNotStarting ),
    //  downloadAssets(),
]).then(() => {
    console.log('PROMISE FILED')
    playMenu.classList.remove('hidden');
    usernameInput.focus();
    playButton.onclick = () => {
        // Play!
        play(usernameInput.value);
        //onGameStarting()
        
        //    setLeaderboardHidden(false);
    };
}).catch(console.error);

function onGameStarting(){
    playMenu.classList.add('hidden');    
    menu.start()
    initState();
    startCapturingInput();
    startRendering();
    
}
function onGameNotStarting( cause ){
    console.log('not joined becasue', cause )
    notJoinedReason.textContent = cause
    playMenu.classList.remove('hidden');
}

function onGameOver() {
    menu.stop()
    stopCapturingInput();
    stopRendering();
    playMenu.classList.remove('hidden');
    //  setLeaderboardHidden(true);
}
