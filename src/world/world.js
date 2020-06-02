import { mkComponents } from './components.js'
import { mkItems } from './items.js'
import { mkSystems } from './systems.js'
import { mkEvents } from './events.js'

/*
 * World
 */ 
export function mkWorld( { seed = 'seed'} = {} ){

    let version = -1

    const World = {
        Components : undefined,
        Systems : undefined,
        Items : undefined,
        Events : undefined,
        getSeed : () => seed
    }
    World.Components = mkComponents( World )
    World.Items = mkItems( World )
    World.Systems = mkSystems( World )
    World.Events = mkEvents( World )
    
    function step(){
        version++
        World.Systems.forEach( (system,idx) => {
            if ( system.onStep )
                system.onStep( version )
        })
        World.Events.step( World )
    }
    const orderedComponents = Object.entries( World.Components )
    return Object.assign(
        World, {
            step,
            forEachComponent : orderedComponents.forEach.bind( orderedComponents ),
            forEachSystem : World.Systems.forEach,
            getVersion : () => version,
        }
    )
}


