/*
 * Items
 */ 
export function mkItems( World ){
    const Items = new Map()
    let _itemId = 0
    function newItemId(){ return _itemId++ }
    function create( modelProps, id = newItemId() ){
        Items.set( id, id )
        addProps( id, modelProps )
        return id
    }
    function addProps( id, modelProps ){
        Object.entries( modelProps ).forEach( ( [ cName, cProps ] ) => {
            World.Components[ cName ].add( id, cProps )
        })
        World.Systems.forEach( system => {
            if ( system.onAdded )
                system.onAdded( id )
        })    
    }
    function change( id, modelProps ){
        if ( !Items.has( id ) )
            return
        
        Object.entries( modelProps ).forEach( ( [ cName, cProps ] ) => {
            if ( !cProps ){
                World.Components[ cName ].remove( id )
            } else if ( cProps === true ){
                // World.Components[ cName ].add( id, cProps )
            } else {
                World.Components[ cName ].add( id, cProps )
            }
        })
        World.Systems.forEach( system => {
            if ( system.onComponentChange )
                system.onComponentChange( id )
        })    
    }
    function remove( id ){
        Items.delete( id )
        World.Systems.forEach( system => {
            if ( system.onRemoved )
                system.onRemoved( id )
        })
        World.forEachComponent( ([ componentName, componentProps ]) => {
            componentProps.remove( id )
        })
    }
    return {
        create,
        remove,
        change,
        forEach : Items.forEach.bind( Items )
    }
}
