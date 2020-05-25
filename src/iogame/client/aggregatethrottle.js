// Throttling enforces a maximum number of times a function can be called over time. As in
// “execute this function at most once every 100 milliseconds.”

// Debouncing enforces that a function not be called again until a certain amount of time has passed without it being called. As in
// “execute this function only if 100 milliseconds have passed without it being called.”
// = send if no burst, after a delay after a burst

export function aggregateAsList( aggregated, input ){
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
export function aggregateAsMap( aggregated, input ){
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
export function aggregateThrottle( delay, aggregate, f ){
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
