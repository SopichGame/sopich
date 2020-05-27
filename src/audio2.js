import { waitAudioContext, instanciateModule } from './audioutils.js'
import { dist } from './utils.js'
import { NOISE_NUM_BY_NAME } from './game.js'

const synthModel1 = { // missile
    nodes : {
        osc1 : { node : 'oscillator' },
        osc2 : { node : 'oscillator' },
        fader1 : { node : 'gain' , ap : { gain : 0.5 } },
        fader2 : { node : 'gain' , ap : { gain : 0.5 } },
        fader : { node : 'gain' , ap : { gain : 0.0 } },
    },
    connections : [
        [ 'osc1', 'fader1' ],
        [ 'osc2', 'fader2' ],
        [ 'fader1', 'fader' ],
        [ 'fader2', 'fader' ]
    ],
    outputs : ['fader' ]
}
const synthModel2 = {  // bomb
    nodes : {
        osc1 : { node : 'oscillator',  ap : { frequency : 100 } },
        osc2 : { node : 'oscillator',  ap : { frequency : 100 } },
        fader1 : { node : 'gain' , ap : { gain : 0.5 } },
        fader2 : { node : 'gain' , ap : { gain : 0.5 } },
        fader : { node : 'gain' , ap : { gain : 0.0 } },
    },
    connections : [
        [ 'osc1', 'fader1' ],
        [ 'osc2', 'fader2' ],
        [ 'fader1', 'fader' ],
        [ 'fader2', 'fader' ]
    ],
    outputs : ['fader' ]
}
const synthModel3 = {  // death
    nodes : {
        osc1 : { node : 'oscillator',  ap : { frequency : 300 } },
        osc2 : { node : 'oscillator',  ap : { frequency : 300 } },
        fader1 : { node : 'gain' , ap : { gain : 0.5 } },
        fader2 : { node : 'gain' , ap : { gain : 0.5 } },
        fader : { node : 'gain' , ap : { gain : 0.0 } },
    },
    connections : [
        [ 'osc1', 'fader1' ],
        [ 'osc2', 'fader2' ],
        [ 'fader1', 'fader' ],
        [ 'fader2', 'fader' ]
    ],
    outputs : ['fader' ]
}
const synthModel4 = { // damage
    nodes : {
        osc1 : { node : 'oscillator',  ap : { frequency : 800 } },
        osc2 : { node : 'oscillator',  ap : { frequency : 800 } },
        fader1 : { node : 'gain' , ap : { gain : 0.5 } },
        fader2 : { node : 'gain' , ap : { gain : 0.5 } },
        fader : { node : 'gain' , ap : { gain : 0.0 } },
    },
    connections : [
        [ 'osc1', 'fader1' ],
        [ 'osc2', 'fader2' ],
        [ 'fader1', 'fader' ],
        [ 'fader2', 'fader' ]
    ],
    outputs : ['fader' ]
}
const synthModel = {
    nodes : {
        missile : { module : synthModel1 },
        bomb : { module : synthModel2 },
        death : { module : synthModel3 },
        damage : { module : synthModel4 },
        fader : { node : 'gain' , ap : { gain : 0.5 } },
    },
    connections : [
        [ 'missile', 'fader' ],
        [ 'bomb', 'fader' ],
        [ 'death', 'fader' ],
        [ 'damage', 'fader' ],
    ],
    outputs : ['fader' ]
}
export function Audio(){

    let audioContext 
    let synth
    
    const state = {
        lastSeenVersion : undefined,
        started : false
    }
    function playSources( sources ){

        if ( audioContext === undefined )
            return

        if ( synth === undefined )
            return

        sources.forEach( source => {
            const { discrete, x, y, distance, type, volume } = source
            //console.log('play', type, volume, 'at', distance, synth )
            if ( discrete ) {
                if( type === NOISE_NUM_BY_NAME['missile-fired'] ){
                    synth.audioParam('missile.fader/gain')
                        .cancelScheduledValues( audioContext.currentTime )
                        .setValueAtTime( 1, audioContext.currentTime)
                        .linearRampToValueAtTime( 0, audioContext.currentTime + 0.1)
                } else if (type === NOISE_NUM_BY_NAME['bomb-fired'] ){
                    synth.audioParam('bomb.fader/gain')
                        .cancelScheduledValues( audioContext.currentTime )
                        .setValueAtTime( 1, audioContext.currentTime)
                        .linearRampToValueAtTime( 0, audioContext.currentTime + 0.1)
                }
            } else {
                if ( type === NOISE_NUM_BY_NAME['death'] ){
                    //console.log({'here':type})
                    //console.log(synth.audioParam('death.fader/gain'))
                    synth.audioParam('death.fader/gain')
                        .cancelScheduledValues( audioContext.currentTime )
                        .setValueAtTime( 1, audioContext.currentTime)
                        .linearRampToValueAtTime( 0, audioContext.currentTime + 0.2 )
                } else if ( type === NOISE_NUM_BY_NAME['damage'] ){
                    //console.log({'here':type})
                    // console.log(synth.audioParam('damage.fader/gain'))
                    synth.audioParam('damage.fader/gain')
                        .cancelScheduledValues( audioContext.currentTime )
                        .setValueAtTime( 1, audioContext.currentTime)
                        .linearRampToValueAtTime( 0, audioContext.currentTime + 0.2 )
                }
            } 
        })
        
    }
    function getSources( s ){
        // get noise and distance to player if exists
        const meId = (s.me)?(s.me.id):undefined
        const noises = []
        let me = undefined
        Object.keys( s ).forEach( k => {
            const items = s[ k ]
            if ( Array.isArray( items ) ){
                items.forEach( item => {
                    if ( ( meId !== undefined ) && ( item.id === meId ) ){
                        me = item
                    }
                    const { x, y, noise } = item
                    if ( noise !== undefined ){
                        noises.push( { discrete : true, x, y, ...noise } )
                    }
                    if ( item.lf !== undefined ){
                        const dead = ( item.lf <= 0 )
                        if ( dead ){
                            noises.push( {
                                discrete : false, x, y,
                                type : NOISE_NUM_BY_NAME['death'],
                                volume : 1
                            } )
                        }
                    }
                    if ( item.dmg !== undefined ){
                        noises.push( {
                            discrete : false, x, y,
                            type : NOISE_NUM_BY_NAME['damage'],
                            volume : 1
                        } )
                    }
                })
            }
        })
        const sources = noises.map( item => {
            const { discrete, x, y, type, volume } = item
            let distance
            if ( me !== undefined ){
                distance = dist( item, me )
            } else {
                distance = 0
            }
            return { x, y, distance, discrete, type, volume }
        })
        return sources
    }
    function setState( s ){
        const version = s.version
        if ( ( version !== undefined ) && ( state.lastSeenVersion !== version  ) ){
            // play only once
            const sources = getSources( s )
            playSources( sources )
            // console.log('sources', sources )
        }
        state.lastSeenVersion = version
    }
    function getSynth( ctx ){
        if ( audioContext == undefined ) return
        if ( synth !== undefined ) return synth
        const synth = instanciateModule( ctx, synthModel )
        synth.start()
        synth.connect( ctx.destination )
        return synth 
    }
    function start(){
        console.log('start audio')
        if ( state.started ) return
        state.started = true
        if ( audioContext === undefined ){
            waitAudioContext().then( ctx => {
                audioContext = ctx
                synth = getSynth( ctx )
            })
        } else {
            synth = getSynth( ctx )
        }
    }
    function stop(){
        console.log('stop audio')
        state.started = false
        if ( synth !== undefined ){
            synth.stop()
            synth = undefined
        }
    }
    return {
        start, setState, stop
    }
}
