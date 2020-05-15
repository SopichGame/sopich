export function mkEvents( World ){
//    const { Items, Components, Systems } = World
    /* timeouts */
    const fsByTimeoutId = new Map()
    function getOrCreateTimeoutFs( id ){
        let fs = fsByTimeoutId.get( id )
        if ( ( fs === undefined ) && ( World.Components.timeout.has( id ) ) ){
            fs = new Set()
            fsByTimeoutId.set( id, fs )
        }
        return fs
    }
    function onTimeoutId( timeoutId, f ){
        const fs = getOrCreateTimeoutFs( timeoutId )
        if ( fs === undefined )
            return
        fs.add( f )
    }
    function wait( delay, f ){
        const timeoutId = World.Items.create( {
            timeout : { start : World.getVersion(), delay }
        } )
        onTimeoutId( timeoutId, f )
        return timeoutId
    }
    function repeat( delay, repeatCount, f ){
        const timeoutId = World.Items.create(
            { timeout : { start : World.getVersion(), delay, repeatCount } }
        )
        onTimeoutId( timeoutId, f )        
        return timeoutId
    }
    function pulse( delay, f ){
        const timeoutId = World.Items.create(
            { timeout : { start : World.getVersion(), delay, loop : true } }
        )
        onTimeoutId( timeoutId, f )
        return timeoutId
    }
    function stepTimeout(){
        fsByTimeoutId.forEach( ( fs, toId ) => {
            const isOn = World.Systems.timeout.isOn( toId ) 
            if ( isOn ){

                // execute callbacks
                fs.forEach( f => f(World, toId ) )

                const timeout = World.Components.timeout.get( toId )

                
                let over 
                if ( timeout.loop ){
                    over = false
                } else if ( timeout.repeatCount === undefined ) {
                    over = true
                } else if (timeout.repeatCount === isOn ) {
                    over = true
                }
                if ( over ){
                    // remove callback
                    fsByTimeoutId.delete( toId )
                    
                    // remove timer
                    World.Items.remove( toId )
                }
                
            }
        })
    }

    /* deaths */        
    const fsByDeadId = new Map()
    function getOrCreateDeathFs( id ){
        let fs = fsByDeadId.get( id )
        if ( ( fs === undefined ) && ( World.Components.health.has( id ) ) ){
            fs = new Set()
            fsByDeadId.set( id, fs )
        }
        return fs
    }
    function onDeath( id, f ){
        const fs = getOrCreateDeathFs( id )
        if ( fs === undefined )
            return
        fs.add( f )
    }
    function stepDeath(){
        World.Systems.health.getDeathList().forEach( id => {
            const fs = fsByDeadId.get( id )
            if ( fs === undefined )
                return
            // execute callbacks
            fs.forEach( f => f(World, id ) )
            // remove callback
            fsByDeadId.delete( id )
        })
    }
    
    /* collisions */
    const fsByCollideId = new Map()
    function getOrCreateCollideFs( id ){
        let fs = fsByCollideId.get( id )
        if ( ( fs === undefined ) && ( World.Components.collision.has( id ) ) ){
            fs = new Set()
            fsByCollideId.set( id, fs )
        }
        return fs
    }
    function onCollide( id, f ){
        const fs = getOrCreateCollideFs( id )
        if ( fs === undefined )
            return
        fs.add( f )
    }
    function hc12( id1, id2 ){
        const fs = fsByCollideId.get( id1 )
        if ( fs === undefined )
            return
        fs.forEach( f => f( World, id1, id2 ) )            
    }
    function stepCollide(){
        World.Systems.collision.getCollidingPairs().forEach( ({ id1, id2 }) => { 
            // execute callbacks
            hc12( id1, id2 )
            hc12( id2, id1 )
        })
        // TODO : remove unused
    }

    function step(){
        stepTimeout()
        stepCollide()
        stepDeath()
    }
    /* */
    return {
        onTimeoutId, wait, repeat, pulse,
        onDeath,
        onCollide,
        step,
        
    }
}
