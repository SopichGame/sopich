import { waitAudioContext, instanciateModule } from './audioutils.js'
import { dist, clamp } from './utils.js'
import { NOISE_TYPES, NOISE_NUM_BY_NAME } from './game.js'
// buffers
function prepareBuffer( ctx, duration, f ){
    const bufferSize = ctx.sampleRate * duration
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
    let data = buffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i++) {
        data[i] = f(i)
    }
    return buffer
}
function whiteNoiseBuffer( ctx ){
    return prepareBuffer( ctx, 1, i => Math.random() * 2 - 1 )
}


const synthFmModel = { // missile
    nodes : {
        modulator : { node : 'oscillator', ap : { frequency : 10 }},
        carrier : { node : 'oscillator', ap : { frequency : 220 }},
        gain : { node : 'gain', ap : { gain : 6000 } },
        attenuation : { node : 'gain', ap : { gain : 0.5 } },
        fader : { node : 'gain', ap : { gain : 0.0 } },
    },
    connections : [
        [ 'modulator', 'gain' ],
        [ 'gain', 'carrier/frequency' ],
        [ 'carrier', 'attenuation' ],
        [ 'attenuation', 'fader' ]
    ],
    outputs : ['fader' ]
}
const synthModel1 = {  // missile
    nodes : {
        osc1 : { node : 'oscillator',  ap : { frequency : 440} },
        osc2 : { node : 'oscillator',  ap : { frequency : 219 } },
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
        osc2 : { node : 'oscillator',  ap : { frequency : 201 } },
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
        osc1 : { node : 'oscillator',  ap : { frequency : 263.74 * 2 } },
        osc2 : { node : 'oscillator',  ap : { frequency : 372.98 * 2 } },
        fader1 : { node : 'gain' , ap : { gain : 1/16 } },
        fader2 : { node : 'gain' , ap : { gain : 1/16 } },
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
    // freq = constant.offset + modulator([-1,1]) * modgain.gain
    nodes : {
        /*constant : { node : 'constantSource', ap : { offset : 0.5 }},
        modulator : { node : 'oscillator', ap : { frequency : 1 }},
        modgain : { node : 'gain', ap : { gain : 0.5 } },
        */
        noise : { node : 'bufferSource', buffer : 'whitenoise',
                  p : { loop : true },
                  ap: { playbackRate : 0.4 } },
        attenuator : { node : 'gain', ap : { gain :0.25 } },
        fader : { node : 'gain' , ap : { gain : 0.0 } },
    },
    connections : [
        //[ 'modulator', 'modgain' ],
        //[ 'modgain', 'noise/playbackRate' ],
        //[ 'constant', 'noise/playbackRate' ],
        [ 'noise', 'attenuator' ],
        [ 'attenuator', 'fader' ],
    ],
   /*
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
    */
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
    function playSources( byType ){

        if ( audioContext === undefined )
            return

        if ( synth === undefined )
            return
        byType.forEach( source => {
            if ( source === undefined )
                return
            
            //console.log( source )
            //sources.forEach( source => {
            // const source = o.
            const { discrete, x, y, distance, type, volume = 1} = source
            //console.log('play', type, volume, 'at', distance, synth )

            let attenuation
            // linear attenuation
            const distanceThreshold1 = 200
            const distanceThreshold2 = 800
            if ( distance > distanceThreshold1 ){
                const c = clamp( distance, distanceThreshold1, distanceThreshold2 ),
                      r = ( c - distanceThreshold1 ) / ( distanceThreshold2 - distanceThreshold1 )
                attenuation = 1 - r
            } else {
                attenuation = 1
            }
            const v = volume * attenuation
            
            if ( discrete ) {
                if( type === NOISE_NUM_BY_NAME['missile-fired'] ){
                    synth.audioParam('missile.fader/gain')
                        .cancelScheduledValues( audioContext.currentTime )
                        .setValueAtTime( v, audioContext.currentTime)
                        .linearRampToValueAtTime( 0, audioContext.currentTime + 0.1)
                } else if (type === NOISE_NUM_BY_NAME['bomb-fired'] ){
                    synth.audioParam('bomb.fader/gain')
                        .cancelScheduledValues( audioContext.currentTime )
                        .setValueAtTime( v, audioContext.currentTime)
                        .linearRampToValueAtTime( 0, audioContext.currentTime + 0.1)
                }
            } else {
                if ( type === NOISE_NUM_BY_NAME['death'] ){
                    //console.log({'here':type})
                    //console.log(synth.audioParam('death.fader/gain'))
                    synth.audioParam('death.fader/gain')
                        .cancelScheduledValues( audioContext.currentTime )
                        .setValueAtTime( v, audioContext.currentTime)
                        .linearRampToValueAtTime( 0, audioContext.currentTime + 0.2 )
                } else if ( type === NOISE_NUM_BY_NAME['damage'] ){
                    const current = synth.audioParam('damage.fader/gain').value
                    if ( current < v ){
                        //console.log( current,'->',v )

                    //console.log({'here':type})
                    // console.log(synth.audioParam('damage.fader/gain'))
                    synth.audioParam('damage.fader/gain')
                        .cancelScheduledValues( audioContext.currentTime )
                        .setValueAtTime( v, audioContext.currentTime)
                            .linearRampToValueAtTime( 0, audioContext.currentTime + 0.8 )
                    }
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

        // get nearest sound of each type
        const byType = NOISE_TYPES.map( source => undefined )
        noises.forEach( item => {
            const { discrete, x, y, type, volume } = item
            let distance
            if ( me !== undefined ){
                distance = dist( item, me )
            } else {
                distance = 0
            }
            const o = byType[ type ]
            if ( ( o === undefined )
                 || ( o.distance < o.minDist  ) ){
                const source = { x, y, distance, discrete, type, volume }
                byType[ type ] = source
            }
        })
        //console.log( byType )
        return byType
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
        const synth = instanciateModule( ctx, synthModel, {
            buffers : { 'whitenoise' : whiteNoiseBuffer( audioContext ) }
        })
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
